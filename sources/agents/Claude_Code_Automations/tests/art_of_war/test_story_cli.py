from __future__ import annotations

import json
import subprocess


def run_json(args: list[str]) -> dict:
    result = subprocess.run(args, text=True, capture_output=True, check=True)
    return json.loads(result.stdout)


def test_story_cli_generates_dry_run_candidates():
    data = run_json([
        "python3",
        "scripts/art_of_war.py",
        "story",
        "--fixture",
        "art-of-war/fixtures/story-candidates.fixture.json",
        "--dry-run",
    ])
    assert data["dry_run"] is True
    assert data["external_mutation_performed"] is False
    assert data["candidate_count"] == 10
    assert data["decision_counts"]["auto"] >= 7
    assert data["decision_counts"]["blocked"] == 1
    assert data["decision_counts"]["gate_required"] == 1
    assert data["decision_counts"]["draft_only"] == 1


def test_story_cli_requires_dry_run():
    result = subprocess.run([
        "python3",
        "scripts/art_of_war.py",
        "story",
        "--fixture",
        "art-of-war/fixtures/story-candidates.fixture.json",
    ], text=True, capture_output=True)
    assert result.returncode == 2
    assert "story requires --dry-run" in result.stderr


def test_report_includes_phase2_story_harness_slate():
    subprocess.run([
        "python3",
        "scripts/art_of_war.py",
        "report",
        "--date",
        "2026-05-27",
        "--dry-run",
    ], text=True, capture_output=True, check=True)
    text = open("art-of-war/reports/daily-war-room/2026-05-27.md", encoding="utf-8").read()
    assert "### Phase 2 Story Harness Slate" in text
    assert "story_e3_sol_001" in text
    assert "external_mutation_performed: false" in text
