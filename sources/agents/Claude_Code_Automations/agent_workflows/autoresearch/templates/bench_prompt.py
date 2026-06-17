"""
LLM-as-judge evaluator for autoprompt mode.
Reads a prompt template, generates a sample output, scores it.

Usage:
    python auto/bench_prompt.py --template prompts/outreach.md --judge haiku

Prints: METRIC: <score 0-100>

Requires ANTHROPIC_API_KEY in environment.
"""

import argparse
import os
import sys

def load_template(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def judge_with_anthropic(template_content: str, model: str = "claude-haiku-4-5-20251001") -> float:
    """Score a prompt template using Anthropic API as judge."""
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

    # Step 1: Generate a sample output using the template
    sample_response = client.messages.create(
        model=model,
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": f"Using this template, generate one example output:\n\n{template_content}"
        }]
    )
    sample_output = sample_response.content[0].text

    # Step 2: Judge the quality of the template + output
    judge_response = client.messages.create(
        model=model,
        max_tokens=256,
        messages=[{
            "role": "user",
            "content": f"""Rate this prompt template and its output on a scale of 0-100.

TEMPLATE:
{template_content}

SAMPLE OUTPUT:
{sample_output}

Score based on:
- Clarity of instructions (0-25)
- Output quality and usefulness (0-25)
- Specificity and actionability (0-25)
- Conciseness and lack of fluff (0-25)

Reply with ONLY a single integer 0-100. Nothing else."""
        }]
    )

    score_text = judge_response.content[0].text.strip()
    try:
        score = int(score_text)
        return max(0, min(100, score))
    except ValueError:
        # Try to extract a number from the response
        import re
        match = re.search(r'\b(\d{1,3})\b', score_text)
        if match:
            return max(0, min(100, int(match.group(1))))
        print(f"WARNING: Could not parse judge score: {score_text}", file=sys.stderr)
        return 0


def main():
    parser = argparse.ArgumentParser(description="LLM-as-judge prompt evaluator")
    parser.add_argument("--template", required=True, help="Path to prompt template file")
    parser.add_argument("--judge", default="haiku", choices=["haiku", "sonnet"],
                        help="Judge model tier (default: haiku)")
    args = parser.parse_args()

    model_map = {
        "haiku": "claude-haiku-4-5-20251001",
        "sonnet": "claude-sonnet-4-6-20250514",
    }

    template = load_template(args.template)
    score = judge_with_anthropic(template, model=model_map[args.judge])
    print(f"METRIC: {score}")


if __name__ == "__main__":
    main()
