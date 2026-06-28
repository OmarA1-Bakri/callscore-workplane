#!/usr/bin/env python3
"""
CallScore audit depth probe — supplements shell audit with structured deep checks.
Called from callscore-content-engagement-audit.sh with a mode argument.
Outputs labeled JSON sections for each probe.
"""
import json, os, subprocess, glob, sys
from datetime import datetime, timezone
from pathlib import Path

APP = "/opt/crypto-tuber-ranked"
SCRIPTS = "/srv/agents/hermes/scripts"
RECEIPTS = f"{APP}/.tmp/workflow-receipts"
OG_RECEIPTS = f"{RECEIPTS}/callscore_operating_graph"


def safe_bool(v, field_name=None):
    """Boolean-safe extraction: True→true, False→false, None→'missing', str→str"""
    if v is True:
        return True
    if v is False:
        return False
    if v is None or v == "":
        return "missing"
    return str(v)


# ── 1. CMO STATUS PROBE (supersedes stale cron error) ──

def probe_cmo_status():
    result = {"finalizer_script": {}, "latest_draft": {}, "live_quality_gate": {}, "summary": ""}

    fpath = f"{SCRIPTS}/callscore-cmo-finalizer.sh"
    result["finalizer_script"]["exists"] = os.path.isfile(fpath)
    result["finalizer_script"]["executable"] = os.access(fpath, os.X_OK)
    if result["finalizer_script"]["exists"]:
        r = subprocess.run(["bash", "-n", fpath], capture_output=True, text=True, timeout=10)
        result["finalizer_script"]["syntax_ok"] = (r.returncode == 0)

    base = f"{RECEIPTS}/artofwar_owned_public_execution"
    drafts = sorted(glob.glob(f"{base}/callscore-cmo-final-draft-*.json"), key=os.path.getmtime)
    if drafts:
        d = drafts[-1]
        s = os.stat(d)
        result["latest_draft"]["path"] = os.path.basename(d)
        result["latest_draft"]["mtime_utc"] = datetime.fromtimestamp(s.st_mtime, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        try:
            data = json.load(open(d))
            x = data.get("x", {}) or data.get("drafts", {}).get("x", {}) or {}
            li = data.get("linkedin", {}) or data.get("drafts", {}).get("linkedin", {}) or {}
            x_copy = x.get("exact_copy", "") or x.get("text", "")
            li_copy = li.get("exact_copy", "") or li.get("text", "")
            result["latest_draft"]["has_x_copy"] = bool(x_copy)
            result["latest_draft"]["has_li_copy"] = bool(li_copy)
            result["latest_draft"]["x_chars"] = len(x_copy)
            result["latest_draft"]["li_chars"] = len(li_copy)
            result["latest_draft"]["x_preview"] = x_copy[:120] if x_copy else ""
            result["latest_draft"]["li_preview"] = li_copy[:120] if li_copy else ""
        except Exception as e:
            result["latest_draft"]["parse_error"] = str(e)
    else:
        result["latest_draft"]["found"] = False

    # Live quality gate test against latest draft
    if drafts:
        try:
            draft_data = json.load(open(drafts[-1]))
            if "visual_asset" not in draft_data:
                draft_data["visual_asset"] = {"available": True, "required": True, "png_sha256": "", "hash": ""}
            if "x" in draft_data and isinstance(draft_data.get("x"), dict) and "drafts" not in draft_data:
                draft_data["drafts"] = {"x": draft_data["x"], "linkedin": draft_data.get("linkedin", {})}
            r = subprocess.run(
                ["python3", "-W", "ignore", f"{SCRIPTS}/callscore-content-quality-gate.py", "/dev/stdin"],
                input=json.dumps(draft_data), capture_output=True, text=True, timeout=15
            )
            try:
                qg = json.loads(r.stdout)
                result["live_quality_gate"]["ok"] = qg.get("ok")
                result["live_quality_gate"]["failures"] = qg.get("failures", [])
                result["live_quality_gate"]["x_chars"] = qg.get("x_chars", 0)
                result["live_quality_gate"]["li_chars"] = qg.get("linkedin_chars", 0)
            except json.JSONDecodeError:
                result["live_quality_gate"]["output_preview"] = r.stdout[:300]
        except Exception as e:
            result["live_quality_gate"]["error"] = str(e)

    # Build one-line summary
    parts = []
    if os.path.isfile(fpath):
        parts.append("script=present")
    if result["latest_draft"].get("has_x_copy"):
        parts.append(f"x={result['latest_draft']['x_chars']}ch")
    if result["latest_draft"].get("has_li_copy"):
        parts.append(f"li={result['latest_draft']['li_chars']}ch")
    qg = result.get("live_quality_gate", {})
    if qg.get("ok") is True:
        parts.append("gate=PASS")
    elif qg.get("ok") is False:
        parts.append(f"gate=FAIL({';'.join(qg.get('failures',[]))})")
    else:
        parts.append("gate=untested")
    result["summary"] = " | ".join(parts)

    return result


# ── 2+3. BOOLEAN-SAFE MUTATION FLAGS + ENGAGEMENT EXECUTION RECEIPTS ──

def probe_engagement_execution():
    """Probe engagement opportunity and execution directories"""
    result = {}
    for dname in ["engagement_opportunity", "engagement_execution"]:
        d = f"{RECEIPTS}/{dname}"
        items = []
        if os.path.isdir(d):
            for f in sorted(glob.glob(f"{d}/*.json"), key=os.path.getmtime, reverse=True)[:12]:
                try:
                    data = json.load(open(f))
                    items.append({
                        "file": os.path.basename(f),
                        "schema": data.get("schema", ""),
                        "channel": data.get("channel", ""),
                        "status": data.get("status", ""),
                        "blocker": data.get("provider_blocker") or data.get("blocker") or data.get("next_action", "") or "",
                    })
                except Exception:
                    items.append({"file": os.path.basename(f), "error": "parse_error"})
        result[dname] = {
            "exists": os.path.isdir(d),
            "count": len(items),
            "recent": items[:6],
        }
    return result


# ── 4. DEEP VIDEO CHILD RECEIPT PARSING ──

def parse_video_child_receipts():
    """Parse video operating graph receipts with child receipt resolution"""
    results = []
    if not os.path.isdir(OG_RECEIPTS):
        return results
    for f in sorted(glob.glob(f"{OG_RECEIPTS}/op-produce_video-collect_receipts-*.json"), key=os.path.getmtime, reverse=True)[:8]:
        try:
            data = json.load(open(f))
        except Exception as e:
            results.append({"file": os.path.basename(f), "error": str(e)})
            continue

        entry = {
            "file": os.path.basename(f),
            "goal": data.get("goal") or data.get("config", {}).get("goal", ""),
            "status": data.get("status"),
            "summary": data.get("summary"),
            "blockers": data.get("blockers"),
        }

        # Mutation flags with safe_bool
        mf = data.get("mutation_flags") or data.get("output", {}).get("mutation_flags") or {}
        entry["mutation_flags"] = {k: safe_bool(v) for k, v in mf.items()}

        # If this is a summary file, extract blockers_by_domain
        if ".summary." in entry["file"]:
            entry["blockers_by_domain"] = data.get("blockers_by_domain", {})
            # Synthesize top-level blockers
            all_bl = []
            for domain, bls in entry["blockers_by_domain"].items():
                for bl in bls:
                    all_bl.append(bl)
            if all_bl:
                entry["blockers"] = all_bl
        else:
            # Main receipt — read from node_results
            node_blockers = []
            for nr in data.get("node_results", []):
                nbl = nr.get("blockers") or []
                if nbl:
                    node_blockers.append(f"{nr.get('node_id','')}:{nbl}")
            if node_blockers:
                entry["node_blockers"] = node_blockers

        # Look for child receipt paths
        output = data.get("output", {}) or {}
        video_job = output.get("video_job") or data.get("video_job") or output.get("worker_result") or {}
        if video_job:
            entry["video_job"] = {
                "status": video_job.get("status"),
                "blocker": video_job.get("blocker") or video_job.get("blockers"),
                "job_id": video_job.get("job_id") or video_job.get("id"),
            }

        # Resolve child receipt paths
        child_paths = data.get("child_receipt_paths") or data.get("receipt_paths") or []
        if not child_paths:
            workers = data.get("worker_receipts") or data.get("workers") or []
            child_paths = [w.get("receipt_path", "") or w.get("receipt", "") for w in workers if w.get("receipt_path") or w.get("receipt")]

        child_details = []
        for cp in child_paths:
            if not cp:
                continue
            cp_full = cp if cp.startswith("/") else f"{APP}/{cp}"
            if os.path.isfile(cp_full):
                try:
                    cd = json.load(open(cp_full))
                    child_details.append({
                        "path": cp,
                        "status": cd.get("status"),
                        "blockers": cd.get("blockers") or cd.get("failures") or [],
                        "summary": cd.get("summary", "")[:100],
                    })
                except Exception:
                    child_details.append({"path": cp, "error": "parse_error"})
        if child_details:
            entry["child_receipts"] = child_details

        results.append(entry)
    return results


# ── 5. WORKPLANE/RUNTIME SCRIPT DURABILITY CHECK ──

def probe_script_durability():
    scripts_to_check = [
        f"{SCRIPTS}/callscore-cmo-finalizer.sh",
        f"{SCRIPTS}/callscore-engagement-executor.sh",
        f"{SCRIPTS}/callscore-engagement-discovery.sh",
        f"{SCRIPTS}/callscore-genuine-social-packet.sh",
        f"{SCRIPTS}/callscore-content-quality-gate.py",
        f"{SCRIPTS}/callscore-video-queue-consumer.sh",
    ]
    result = {"scripts": {}}
    for sp in scripts_to_check:
        name = os.path.basename(sp)
        entry = {"path": sp, "exists": os.path.isfile(sp)}
        if entry["exists"]:
            entry["executable"] = os.access(sp, os.X_OK)
            entry["size_kb"] = round(os.path.getsize(sp) / 1024, 1)
            if sp.endswith(".sh"):
                r = subprocess.run(["bash", "-n", sp], capture_output=True, text=True, timeout=10)
                entry["syntax_ok"] = (r.returncode == 0)
                if not entry["syntax_ok"]:
                    entry["syntax_error"] = r.stderr[:200]
        result["scripts"][name] = entry

    # Check npm entry points referenced by cron/graph
    pkg = json.load(open(f"{APP}/package.json"))
    required = ["operating:goal", "workplane:status", "operating:produce-video", "workplane:dispatch-goal", "operating:goal-dry"]
    result["npm_scripts"] = {}
    for script in required:
        exists = script in pkg.get("scripts", {})
        cmd = (pkg.get("scripts", {}).get(script, "") or "")[:100]
        result["npm_scripts"][script] = {"exists": exists, "command": cmd}

    # Check workplane binary
    wp_bin = f"{APP}/node_modules/.bin/workplane"
    result["workplane_binary"] = {
        "exists": os.path.isfile(wp_bin),
        "executable": os.access(wp_bin, os.X_OK) if os.path.isfile(wp_bin) else False,
    }

    # Workplane repo snapshot durability
    wp_repo = "/srv/agents/repos/callscore-workplane"
    if os.path.isdir(wp_repo):
        try:
            r = subprocess.run(["git", "-C", wp_repo, "rev-parse", "--short", "HEAD"],
                               capture_output=True, text=True, timeout=5)
            wp_commit = r.stdout.strip()
            r2 = subprocess.run(["git", "-C", wp_repo, "status", "--short"],
                                capture_output=True, text=True, timeout=5)
            wp_clean = len(r2.stdout.strip()) == 0
            manifest_path = f"{wp_repo}/infra/hermes-runtime-scripts/sha256sums.txt"
            manifest_exists = os.path.isfile(manifest_path)
            manifest_ok = False
            if manifest_exists:
                r3 = subprocess.run(["sha256sum", "-c", manifest_path],
                                    cwd=os.path.dirname(manifest_path),
                                    capture_output=True, text=True, timeout=10)
                manifest_ok = (r3.returncode == 0)
            result["workplane_snapshot"] = {
                "repo": wp_repo,
                "commit": wp_commit,
                "clean": wp_clean,
                "manifest_path": manifest_path,
                "manifest_exists": manifest_exists,
                "manifest_checksum_ok": manifest_ok,
            }
        except Exception as e:
            result["workplane_snapshot"] = {"repo": wp_repo, "error": str(e)}

    return result


# ── MAIN ──

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    output = {}
    if mode in ("all", "cmo"):
        output["=== CMO STATUS PROBE ==="] = probe_cmo_status()
    if mode in ("all", "engagement"):
        output["=== ENGAGEMENT EXECUTION RECEIPTS ==="] = probe_engagement_execution()
    if mode in ("all", "video"):
        output["=== DEEP VIDEO CHILD RECEIPTS ==="] = parse_video_child_receipts()
    if mode in ("all", "durability"):
        output["=== SCRIPT DURABILITY ==="] = probe_script_durability()
    print(json.dumps(output, indent=2, default=str))
