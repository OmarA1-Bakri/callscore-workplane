"""
LLM-as-judge + real-data evaluator for autobench mode.
Queries state_manager.py for outreach reply/acceptance rates,
falls back to LLM-as-judge cold-start scoring if no real data exists.

Usage:
    python bench_outreach.py --template templates/connection_note.md
    python bench_outreach.py --template templates/connection_note.md --variant-tag "v3-curiosity-hook"

Prints: METRIC: <float 0.0-1.0>

Exit codes:
    0 = success (metric printed)
    1 = fatal error (no metric)

Requires:
    - scripts/state_manager.py accessible at REPO_ROOT/scripts/state_manager.py
    - ANTHROPIC_API_KEY in environment (for cold-start fallback only)
"""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
try:
    REPO_ROOT = Path(
        subprocess.check_output(
            ["git", "rev-parse", "--show-toplevel"],
            text=True, stderr=subprocess.DEVNULL,
        ).strip()
    )
except (subprocess.CalledProcessError, FileNotFoundError):
    # Fallback to directory traversal if not in a git repo
    REPO_ROOT = SCRIPT_DIR.parent.parent.parent
STATE_MANAGER = REPO_ROOT / "scripts" / "state_manager.py"

# Minimum sample size before we trust real data over LLM judge
MIN_SAMPLE_SIZE = 5


def load_template(path: str) -> str:
    """Read the outreach template file."""
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


# ---------------------------------------------------------------------------
# State manager queries
# ---------------------------------------------------------------------------
def call_state_manager(*args: str) -> dict | None:
    """Call state_manager.py with the given args, return parsed JSON or None."""
    cmd = [sys.executable, str(STATE_MANAGER)] + list(args)
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,
            cwd=str(REPO_ROOT),
        )
        if result.returncode != 0:
            print(f"WARNING: state_manager exited {result.returncode}: {result.stderr.strip()}", file=sys.stderr)
            return None
        return json.loads(result.stdout.strip())
    except subprocess.TimeoutExpired:
        print("WARNING: state_manager call timed out", file=sys.stderr)
        return None
    except json.JSONDecodeError as e:
        print(f"WARNING: state_manager returned invalid JSON: {e}", file=sys.stderr)
        return None
    except FileNotFoundError:
        print(f"WARNING: state_manager not found at {STATE_MANAGER}", file=sys.stderr)
        return None


def query_variant_metrics(variant_tag: str | None) -> dict | None:
    """Query state_manager for outreach metrics.

    Returns dict with keys:
        messages_sent: int
        replies_received: int
        acceptances: int    (for LinkedIn connection requests)
        reply_rate: float   (replies / sent, 0.0-1.0)
    Or None if no data available.
    """
    # Strategy 1: Check knowledge store for pre-computed variant stats
    if variant_tag:
        kw_result = call_state_manager(
            "query-knowledge",
            "--keyword", variant_tag,
            "--category", "outreach",
        )
        if kw_result and kw_result.get("knowledge"):
            for entry in kw_result["knowledge"]:
                content = entry.get("content", "")
                stats = _parse_stats_from_content(content)
                if stats:
                    return stats

    # Strategy 2: Check memories for template variant stats
    recall_args = ["recall", "--tags", "outreach_metrics,template_variant"]
    if variant_tag:
        recall_args.extend(["--keyword", variant_tag])
    recall_result = call_state_manager(*recall_args)
    if recall_result and recall_result.get("memories"):
        for mem in recall_result["memories"]:
            content = mem.get("content", "")
            stats = _parse_stats_from_content(content)
            if stats:
                return stats

    # Strategy 3: Query general outreach metrics from knowledge
    general_result = call_state_manager(
        "query-knowledge",
        "--keyword", "outreach_metrics",
    )
    if general_result and general_result.get("knowledge"):
        for entry in general_result["knowledge"]:
            stats = _parse_stats_from_content(entry.get("content", ""))
            if stats:
                return stats

    # Strategy 4: Compute from raw interaction data via recall
    overall = call_state_manager(
        "recall",
        "--tags", "outreach,linkedin",
        "--keyword", "connection_request",
        "--limit", "100",
    )
    if overall and overall.get("memories"):
        return _aggregate_from_memories(overall["memories"])

    return None


def _parse_stats_from_content(content: str) -> dict | None:
    """Try to extract stats dict from a memory/knowledge content string.

    Looks for JSON embedded in the content, or key=value patterns like:
        sent=42 replies=7 acceptances=12
    """
    # Try JSON parse of entire content
    try:
        data = json.loads(content)
        if isinstance(data, dict) and "messages_sent" in data:
            sent = int(data["messages_sent"])
            replies = int(data.get("replies_received", 0))
            acceptances = int(data.get("acceptances", 0))
            if sent > 0:
                return {
                    "messages_sent": sent,
                    "replies_received": replies,
                    "acceptances": acceptances,
                    "reply_rate": replies / sent,
                }
    except (json.JSONDecodeError, ValueError, TypeError):
        pass

    # Try embedded JSON block
    json_match = re.search(r'\{[^{}]*"messages_sent"[^{}]*\}', content)
    if json_match:
        try:
            data = json.loads(json_match.group())
            sent = int(data["messages_sent"])
            replies = int(data.get("replies_received", 0))
            acceptances = int(data.get("acceptances", 0))
            if sent > 0:
                return {
                    "messages_sent": sent,
                    "replies_received": replies,
                    "acceptances": acceptances,
                    "reply_rate": replies / sent,
                }
        except (json.JSONDecodeError, ValueError, TypeError):
            pass

    # Try key=value pattern
    sent_match = re.search(r'(?:sent|messages_sent)\s*[=:]\s*(\d+)', content, re.IGNORECASE)
    replies_match = re.search(r'(?:replies|replies_received)\s*[=:]\s*(\d+)', content, re.IGNORECASE)
    if sent_match:
        sent = int(sent_match.group(1))
        replies = int(replies_match.group(1)) if replies_match else 0
        acceptances_match = re.search(r'(?:acceptances|accepted)\s*[=:]\s*(\d+)', content, re.IGNORECASE)
        acceptances = int(acceptances_match.group(1)) if acceptances_match else 0
        if sent > 0:
            return {
                "messages_sent": sent,
                "replies_received": replies,
                "acceptances": acceptances,
                "reply_rate": replies / sent,
            }

    return None


def _aggregate_from_memories(memories: list[dict]) -> dict | None:
    """Aggregate raw interaction memories into stats.

    Counts memories tagged as outbound connection_request (sent)
    vs inbound reply/acceptance (received).
    """
    sent = 0
    replies = 0
    acceptances = 0

    for mem in memories:
        content = (mem.get("content", "") + " " + mem.get("key", "")).lower()
        tags = (mem.get("tags", "") or "").lower()

        if "connection_request" in content or "connection_request" in tags:
            if "sent" in content or "outbound" in content:
                sent += 1
            if "accepted" in content or "connected" in content:
                acceptances += 1
            if "replied" in content or "response" in content:
                replies += 1

    if sent == 0:
        return None

    return {
        "messages_sent": sent,
        "replies_received": replies,
        "acceptances": acceptances,
        "reply_rate": (replies + acceptances) / sent,  # combined response signal
    }


# ---------------------------------------------------------------------------
# Cold-start LLM judge (fallback)
# ---------------------------------------------------------------------------
def judge_cold_start(template_content: str, model: str = "claude-haiku-4-5-20251001") -> float:
    """Score a connection note template using LLM-as-judge when no real data exists.

    Returns a float 0.0-1.0 (normalized from 0-100 judge score).
    """
    try:
        import anthropic
    except ImportError:
        print("ERROR: anthropic package not installed. Run: pip install anthropic", file=sys.stderr)
        sys.exit(1)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY not set", file=sys.stderr)
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    # Step 1: Generate a sample connection note using the template
    sample_response = client.messages.create(
        model=model,
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": (
                "Using this LinkedIn connection note template, generate ONE example "
                "connection note for a fictional Head of Payments at a Singapore bank. "
                "The note must be under 300 characters.\n\n"
                f"TEMPLATE:\n{template_content}"
            )
        }]
    )
    sample_output = sample_response.content[0].text

    # Step 2: Judge the template + sample on outreach-specific criteria
    judge_response = client.messages.create(
        model=model,
        max_tokens=256,
        messages=[{
            "role": "user",
            "content": f"""Rate this LinkedIn connection note template and sample output on a scale of 0-100.

TEMPLATE:
{template_content}

SAMPLE NOTE:
{sample_output}

Score based on these criteria (each 0-12.5 points, total 0-100):
1. Personalization hooks — does it reference something specific about the prospect?
2. Value proposition clarity — is it clear what Omar/RTGS does and why it matters?
3. Curiosity trigger — does it make the reader want to learn more?
4. Brevity — is it under 300 chars with no wasted words?
5. Tone authenticity — does it sound like a real person (not AI, not corporate)?
6. No compliance violations — no pricing, no commitments, no confidential info?
7. CTA appropriateness — connection notes should NOT have a CTA (just connect)?
8. Would YOU accept this connection request? Overall impression.

Reply with ONLY a single integer 0-100. Nothing else."""
        }]
    )

    score_text = judge_response.content[0].text.strip()
    try:
        score = int(score_text)
        return max(0.0, min(1.0, score / 100.0))
    except ValueError:
        match = re.search(r'\b(\d{1,3})\b', score_text)
        if match:
            return max(0.0, min(1.0, int(match.group(1)) / 100.0))
        print(f"WARNING: Could not parse judge score: {score_text}", file=sys.stderr)
        return 0.0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Outreach template evaluator for autobench mode. "
                    "Uses real reply/acceptance data when available, "
                    "falls back to LLM-as-judge for cold start."
    )
    parser.add_argument(
        "--template", required=True,
        help="Path to the outreach template file to evaluate"
    )
    parser.add_argument(
        "--variant-tag",
        dest="variant_tag",
        default=None,
        help="Tag identifying a specific template variant (for filtering metrics)"
    )
    parser.add_argument(
        "--min-sample",
        dest="min_sample",
        type=int,
        default=MIN_SAMPLE_SIZE,
        help=f"Minimum sample size to trust real data (default: {MIN_SAMPLE_SIZE})"
    )
    parser.add_argument(
        "--judge",
        default="haiku",
        choices=["haiku", "sonnet"],
        help="Judge model tier for cold-start fallback (default: haiku)"
    )
    args = parser.parse_args()

    model_map = {
        "haiku": "claude-haiku-4-5-20251001",
        "sonnet": "claude-sonnet-4-6-20250514",
    }

    # Load the template
    template = load_template(args.template)

    # Try to get real metrics from state_manager
    metrics = query_variant_metrics(args.variant_tag)

    if metrics and metrics["messages_sent"] >= args.min_sample:
        # Real data path — use actual reply/acceptance rate
        rate = metrics["reply_rate"]
        metric = max(0.0, min(1.0, rate))
        print(
            f"DATA_SOURCE: real (sent={metrics['messages_sent']}, "
            f"replies={metrics['replies_received']}, "
            f"acceptances={metrics['acceptances']})",
            file=sys.stderr,
        )
        print(f"METRIC: {metric:.4f}")
    else:
        # Cold start — use LLM-as-judge
        if metrics:
            print(
                f"DATA_SOURCE: cold_start (real data exists but n={metrics['messages_sent']} "
                f"< min_sample={args.min_sample})",
                file=sys.stderr,
            )
        else:
            print("DATA_SOURCE: cold_start (no real data found)", file=sys.stderr)

        metric = judge_cold_start(template, model=model_map[args.judge])
        print(f"METRIC: {metric:.4f}")


if __name__ == "__main__":
    main()
