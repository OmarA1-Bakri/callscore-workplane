"""
Integration and unit tests for autodev.py — the autoresearch loop runner.

Covers:
  - Pure-logic unit tests (is_better, load_results, append_result, etc.)
  - Integration tests with tmp dirs + git repos (cmd_init, run_bench)
  - Mock tests for LLM-driven iteration (keep / discard flows)

Run:
    cd agent_workflows/autoresearch
    python -m pytest tests/test_autodev.py -v
"""

import contextlib
import json
import os
import platform
import stat
import subprocess
import sys
import textwrap
from argparse import Namespace
from pathlib import Path
from unittest.mock import patch

import pytest

# ---------------------------------------------------------------------------
# Make autodev importable from tests/
# ---------------------------------------------------------------------------
sys.path.insert(0, str(Path(__file__).parent.parent))

from autodev import (
    RESULTS_HEADER,
    append_result,
    cmd_init,
    cmd_run,
    cmd_status,
    extract_description,
    get_best_metric,
    git_commit,
    git_reset_hard,
    git_short_hash,
    init_results,
    is_better,
    load_results,
    run_bench,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

IS_WINDOWS = platform.system() == "Windows"


@contextlib.contextmanager
def _patch_paths_for_bash():
    """On Windows, os.path.join produces backslash paths (e.g. auto\\bench.sh).
    Bash interprets \\b as a backspace escape, so 'auto\\bench.sh' becomes
    'autobench.sh'.  We patch the module-level path constants to use forward
    slashes so subprocess.run(['bash', ...]) works correctly on Windows."""
    if not IS_WINDOWS:
        yield
        return
    patches = {
        "autodev.BENCH_SCRIPT": "auto/bench.sh",
        "autodev.RUN_LOG": "auto/run.log",
        "autodev.CONFIG_FILE": "auto/config.json",
        "autodev.RESULTS_FILE": "auto/results.tsv",
        "autodev.PROGRAM_FILE": "auto/program.md",
    }
    with contextlib.ExitStack() as stack:
        for target, value in patches.items():
            stack.enter_context(patch(target, value))
        yield


def _init_git_repo(tmp: Path) -> None:
    """Initialise a fresh git repo in *tmp* with an initial commit."""
    subprocess.run(["git", "init"], cwd=str(tmp), capture_output=True, check=True)
    subprocess.run(
        ["git", "config", "user.email", "test@test.com"],
        cwd=str(tmp), capture_output=True, check=True,
    )
    subprocess.run(
        ["git", "config", "user.name", "Test"],
        cwd=str(tmp), capture_output=True, check=True,
    )
    # Need at least one commit so HEAD exists
    dummy = tmp / "README"
    dummy.write_text("init")
    subprocess.run(["git", "add", "."], cwd=str(tmp), capture_output=True, check=True)
    subprocess.run(
        ["git", "commit", "-m", "initial"],
        cwd=str(tmp), capture_output=True, check=True,
    )


def _write_bench_script(auto_dir: Path, body: str) -> None:
    """Write a bench.sh inside *auto_dir* with the given body.

    Uses binary write to guarantee Unix line endings (LF only).
    On Windows, write_text() converts \\n to \\r\\n which can cause
    bash to choke on a trailing \\r interpreted as a command."""
    auto_dir.mkdir(parents=True, exist_ok=True)
    script = auto_dir / "bench.sh"
    content = "#!/bin/bash\n" + body.rstrip("\n") + "\n"
    script.write_bytes(content.encode("utf-8"))
    # Make executable on Unix
    if not IS_WINDOWS:
        script.chmod(script.stat().st_mode | stat.S_IEXEC)


def _make_config(tmp: Path, **overrides) -> dict:
    """Create a minimal config.json inside auto/ and return it."""
    cfg = {
        "mode": "autodev",
        "target_file": "target.py",
        "metric_name": "score",
        "metric_direction": "higher",
        "bench_timeout_sec": 10,
        "max_iterations": 5,
        "loop_model": "sonnet",
        "created_at": "2026-01-01T00:00:00",
        "branch": "test-branch",
    }
    cfg.update(overrides)
    auto = tmp / "auto"
    auto.mkdir(parents=True, exist_ok=True)
    (auto / "config.json").write_text(json.dumps(cfg, indent=2), encoding="utf-8")
    return cfg


# ===================================================================
# UNIT TESTS — no external deps
# ===================================================================


class TestIsBetter:
    """Tests for the is_better comparison function."""

    def test_is_better_higher(self):
        """direction=higher, new > old --> True"""
        assert is_better(0.95, 0.90, "higher") is True

    def test_is_better_lower(self):
        """direction=lower, new < old --> True"""
        assert is_better(0.10, 0.20, "lower") is True

    def test_is_better_equal(self):
        """Equal values --> False regardless of direction."""
        assert is_better(0.5, 0.5, "higher") is False
        assert is_better(0.5, 0.5, "lower") is False

    def test_is_better_higher_when_worse(self):
        """direction=higher, new < old --> False"""
        assert is_better(0.80, 0.90, "higher") is False

    def test_is_better_lower_when_worse(self):
        """direction=lower, new > old --> False"""
        assert is_better(0.30, 0.20, "lower") is False


class TestLoadResults:
    """Tests for load_results TSV parsing."""

    def test_load_results_empty(self, tmp_path):
        """No results file at all --> empty list."""
        os.chdir(tmp_path)
        result = load_results()
        assert result == []

    def test_load_results_header_only(self, tmp_path):
        """Results file with only the header line --> empty list."""
        os.chdir(tmp_path)
        auto = tmp_path / "auto"
        auto.mkdir()
        (auto / "results.tsv").write_text(RESULTS_HEADER, encoding="utf-8")
        result = load_results()
        assert result == []

    def test_load_results_with_data(self, tmp_path):
        """Parse a valid TSV with two data rows."""
        os.chdir(tmp_path)
        auto = tmp_path / "auto"
        auto.mkdir()
        content = RESULTS_HEADER
        content += "0\tabc1234\t1.500000\tkeep\tbaseline\n"
        content += "1\tdef5678\t1.400000\tdiscard\t+3 lines, -1 lines\n"
        (auto / "results.tsv").write_text(content, encoding="utf-8")

        results = load_results()
        assert len(results) == 2
        assert results[0]["iteration"] == 0
        assert results[0]["commit"] == "abc1234"
        assert results[0]["metric"] == pytest.approx(1.5)
        assert results[0]["status"] == "keep"
        assert results[0]["description"] == "baseline"

        assert results[1]["iteration"] == 1
        assert results[1]["status"] == "discard"
        assert results[1]["metric"] == pytest.approx(1.4)


class TestAppendResult:
    """Tests for append_result TSV writing."""

    def test_append_result(self, tmp_path):
        """Append a row and verify the file content."""
        os.chdir(tmp_path)
        auto = tmp_path / "auto"
        auto.mkdir()
        init_results()

        append_result(1, "abc1234", 42.123456, "keep", "added dropout")

        results = load_results()
        assert len(results) == 1
        assert results[0]["iteration"] == 1
        assert results[0]["commit"] == "abc1234"
        assert results[0]["metric"] == pytest.approx(42.123456)
        assert results[0]["status"] == "keep"
        assert results[0]["description"] == "added dropout"

    def test_append_multiple_results(self, tmp_path):
        """Append several rows and verify ordering."""
        os.chdir(tmp_path)
        auto = tmp_path / "auto"
        auto.mkdir()
        init_results()

        append_result(0, "aaa1111", 10.0, "keep", "baseline")
        append_result(1, "bbb2222", 12.0, "keep", "tweak lr")
        append_result(2, "ccc3333", 9.0, "discard", "bad idea")

        results = load_results()
        assert len(results) == 3
        assert [r["iteration"] for r in results] == [0, 1, 2]
        assert [r["status"] for r in results] == ["keep", "keep", "discard"]


class TestGetBestMetric:
    """Tests for get_best_metric."""

    def test_get_best_metric_higher(self):
        """direction=higher --> returns max metric from kept results."""
        config = {"metric_direction": "higher"}
        results = [
            {"iteration": 0, "metric": 10.0, "status": "keep"},
            {"iteration": 1, "metric": 15.0, "status": "keep"},
            {"iteration": 2, "metric": 20.0, "status": "discard"},
            {"iteration": 3, "metric": 12.0, "status": "keep"},
        ]
        best = get_best_metric(config, results)
        # Only considers kept: 10, 15, 12 --> max = 15
        assert best == pytest.approx(15.0)

    def test_get_best_metric_lower(self):
        """direction=lower --> returns min metric from kept results."""
        config = {"metric_direction": "lower"}
        results = [
            {"iteration": 0, "metric": 5.0, "status": "keep"},
            {"iteration": 1, "metric": 3.0, "status": "keep"},
            {"iteration": 2, "metric": 1.0, "status": "discard"},
            {"iteration": 3, "metric": 4.0, "status": "keep"},
        ]
        best = get_best_metric(config, results)
        # Only considers kept: 5, 3, 4 --> min = 3
        assert best == pytest.approx(3.0)

    def test_get_best_metric_no_keeps(self):
        """No kept results --> returns None."""
        config = {"metric_direction": "higher"}
        results = [
            {"iteration": 1, "metric": 10.0, "status": "discard"},
            {"iteration": 2, "metric": 20.0, "status": "crash"},
        ]
        best = get_best_metric(config, results)
        assert best is None

    def test_get_best_metric_empty(self):
        """Empty results list --> returns None."""
        config = {"metric_direction": "higher"}
        assert get_best_metric(config, []) is None


class TestExtractDescription:
    """Tests for extract_description diff heuristic."""

    def test_extract_description_added_lines(self):
        """Detects added lines."""
        old = "line1\nline2\n"
        new = "line1\nline2\nline3\nline4\n"
        config = {"metric_direction": "higher"}
        desc = extract_description(old, new, config, [])
        assert "+2 lines" in desc

    def test_extract_description_removed_lines(self):
        """Detects removed lines."""
        old = "line1\nline2\nline3\n"
        new = "line1\n"
        config = {"metric_direction": "higher"}
        desc = extract_description(old, new, config, [])
        assert "-2 lines" in desc

    def test_extract_description_mixed(self):
        """Detects both added and removed lines."""
        old = "aaa\nbbb\n"
        new = "aaa\nccc\n"
        config = {"metric_direction": "higher"}
        desc = extract_description(old, new, config, [])
        assert "+1 lines" in desc
        assert "-1 lines" in desc

    def test_extract_description_no_change(self):
        """Identical content --> 'no visible change'."""
        old = "same\n"
        new = "same\n"
        config = {"metric_direction": "higher"}
        desc = extract_description(old, new, config, [])
        assert desc == "no visible change"


# ===================================================================
# INTEGRATION TESTS — use tmp dirs + git
# ===================================================================


class TestCmdInit:
    """Integration tests for cmd_init."""

    def test_cmd_init_creates_structure(self, tmp_path):
        """Verify auto/ dir, config.json, results.tsv, and branch are created."""
        os.chdir(tmp_path)
        _init_git_repo(tmp_path)

        args = Namespace(
            mode="autodev",
            target="model.py",
            metric="val_bpb",
            direction="lower",
        )
        cmd_init(args)

        # Verify auto/ directory exists
        assert (tmp_path / "auto").is_dir()

        # Verify config.json exists and has correct content
        config_path = tmp_path / "auto" / "config.json"
        assert config_path.exists()
        config = json.loads(config_path.read_text(encoding="utf-8"))
        assert config["mode"] == "autodev"
        assert config["target_file"] == "model.py"
        assert config["metric_name"] == "val_bpb"
        assert config["metric_direction"] == "lower"
        assert config["branch"].startswith("autoresearch/")

        # Verify results.tsv exists with header
        results_path = tmp_path / "auto" / "results.tsv"
        assert results_path.exists()
        content = results_path.read_text(encoding="utf-8")
        assert content.startswith("iteration\tcommit\tmetric")

        # Verify git branch was created
        result = subprocess.run(
            ["git", "branch", "--show-current"],
            cwd=str(tmp_path), capture_output=True, text=True,
        )
        assert result.stdout.strip().startswith("autoresearch/")

    def test_cmd_init_overwrites_existing(self, tmp_path):
        """Re-running init on an existing config prints a warning but succeeds."""
        os.chdir(tmp_path)
        _init_git_repo(tmp_path)

        args = Namespace(mode="autodev", target="a.py", metric="s", direction="higher")
        cmd_init(args)

        # Run again — should succeed without error
        args2 = Namespace(mode="autoprompt", target="b.py", metric="q", direction="lower")
        cmd_init(args2)

        config_path = tmp_path / "auto" / "config.json"
        config = json.loads(config_path.read_text(encoding="utf-8"))
        assert config["mode"] == "autoprompt"
        assert config["target_file"] == "b.py"


class TestRunBench:
    """Integration tests for run_bench (real subprocess calls)."""

    def test_run_bench_success(self, tmp_path):
        """bench.sh echoes METRIC: 42.0 --> returns (42.0, True)."""
        os.chdir(tmp_path)
        _write_bench_script(tmp_path / "auto", 'echo "METRIC: 42.0"')
        config = {"bench_timeout_sec": 10}

        with _patch_paths_for_bash():
            metric, success = run_bench(config)

        assert success is True
        assert metric == pytest.approx(42.0)

    def test_run_bench_crash(self, tmp_path):
        """bench.sh exits 1 --> returns (None, False)."""
        os.chdir(tmp_path)
        _write_bench_script(tmp_path / "auto", 'echo "before crash"\nexit 1')
        config = {"bench_timeout_sec": 10}

        with _patch_paths_for_bash():
            metric, success = run_bench(config)

        assert success is False
        assert metric is None

    def test_run_bench_timeout(self, tmp_path):
        """bench.sh sleeps forever --> returns (None, False) after timeout."""
        os.chdir(tmp_path)
        # Use a short timeout (2s) and a script that sleeps long
        _write_bench_script(tmp_path / "auto", "sleep 60")
        config = {"bench_timeout_sec": 2}

        with _patch_paths_for_bash():
            metric, success = run_bench(config)

        assert success is False
        assert metric is None

    def test_run_bench_no_metric_line(self, tmp_path):
        """bench.sh exits 0 but outputs no METRIC line --> (None, False)."""
        os.chdir(tmp_path)
        _write_bench_script(tmp_path / "auto", 'echo "all good but forgot metric"')
        config = {"bench_timeout_sec": 10}

        with _patch_paths_for_bash():
            metric, success = run_bench(config)

        assert success is False
        assert metric is None

    def test_run_bench_multiple_metric_lines(self, tmp_path):
        """bench.sh outputs several METRIC lines --> uses the LAST one."""
        os.chdir(tmp_path)
        body = textwrap.dedent("""\
            echo "METRIC: 10.0"
            echo "some noise"
            echo "METRIC: 25.5"
        """)
        _write_bench_script(tmp_path / "auto", body)
        config = {"bench_timeout_sec": 10}

        with _patch_paths_for_bash():
            metric, success = run_bench(config)

        assert success is True
        # run_bench iterates in reverse, so it finds the last METRIC line first
        assert metric == pytest.approx(25.5)

    def test_run_bench_scientific_notation(self, tmp_path):
        """METRIC line with scientific notation parses correctly."""
        os.chdir(tmp_path)
        _write_bench_script(tmp_path / "auto", 'echo "METRIC: 1.5e-3"')
        config = {"bench_timeout_sec": 10}

        with _patch_paths_for_bash():
            metric, success = run_bench(config)

        assert success is True
        assert metric == pytest.approx(0.0015)

    def test_run_bench_writes_run_log(self, tmp_path):
        """Verify that run.log is created with stdout content."""
        os.chdir(tmp_path)
        _write_bench_script(tmp_path / "auto", 'echo "hello world"\necho "METRIC: 1.0"')
        config = {"bench_timeout_sec": 10}

        with _patch_paths_for_bash():
            run_bench(config)

        log_path = tmp_path / "auto" / "run.log"
        assert log_path.exists()
        log_content = log_path.read_text(encoding="utf-8")
        assert "hello world" in log_content


class TestCmdStatus:
    """Integration tests for cmd_status."""

    def test_cmd_status_no_config(self, tmp_path, capsys):
        """When no config exists, prints a graceful message."""
        os.chdir(tmp_path)

        cmd_status(Namespace())

        captured = capsys.readouterr()
        assert "No autoresearch config found" in captured.out

    def test_cmd_status_with_data(self, tmp_path, capsys):
        """With config and results, prints a summary."""
        os.chdir(tmp_path)
        _make_config(tmp_path, metric_name="val_bpb", metric_direction="lower")
        init_results()
        append_result(0, "abc1234", 2.5, "keep", "baseline")
        append_result(1, "def5678", 2.3, "keep", "reduced lr")
        append_result(2, "ghi9012", 2.6, "discard", "bad idea")

        cmd_status(Namespace())

        captured = capsys.readouterr()
        assert "val_bpb" in captured.out
        assert "lower" in captured.out
        assert "Iterations: 3" in captured.out
        assert "kept: 2" in captured.out
        assert "discarded: 1" in captured.out


# ===================================================================
# MOCK TESTS — mock Claude Code CLI
# ===================================================================


class TestRunSingleIterationKeep:
    """
    Mock Claude Code CLI returns improved code, mock bench returns a better metric.
    Verify the iteration results in a 'keep' and the git commit is preserved.
    """

    def test_run_single_iteration_keep(self, tmp_path, capsys):
        os.chdir(tmp_path)
        _init_git_repo(tmp_path)

        # Set up target file
        target = tmp_path / "target.py"
        target.write_text("x = 1\n", encoding="utf-8")

        # Set up auto/ directory with config, results, program, bench
        _make_config(
            tmp_path,
            target_file="target.py",
            metric_name="score",
            metric_direction="higher",
            bench_timeout_sec=10,
            max_iterations=1,
        )
        init_results()
        # Seed a baseline result so the loop skips the baseline step
        append_result(0, "aaa1111", 10.0, "keep", "baseline")

        # Write program.md (required by cmd_run)
        (tmp_path / "auto" / "program.md").write_text(
            "Improve x to get higher score.", encoding="utf-8"
        )

        # Write a bench.sh that echoes a BETTER metric (20 > 10)
        _write_bench_script(tmp_path / "auto", 'echo "METRIC: 20.0"')

        # Commit the auto/ setup so git is clean
        subprocess.run(["git", "add", "-A"], cwd=str(tmp_path), capture_output=True)
        subprocess.run(
            ["git", "commit", "-m", "setup"],
            cwd=str(tmp_path), capture_output=True,
        )

        # Count commits before the run
        before = subprocess.run(
            ["git", "rev-list", "--count", "HEAD"],
            cwd=str(tmp_path), capture_output=True, text=True,
        )
        commits_before = int(before.stdout.strip())

        # Mock call_claude_code to return new code with an improvement
        mock_response = "x = 2\n"  # "improved" code

        with _patch_paths_for_bash():
            with patch("autodev.call_claude_code", return_value=mock_response):
                with patch("autodev.time.sleep"):  # skip the 1s pause
                    args = Namespace(max_iterations=1)
                    cmd_run(args)

        # Verify: the result was kept
        results = load_results()
        kept = [r for r in results if r["status"] == "keep" and r["iteration"] > 0]
        assert len(kept) == 1
        assert kept[0]["metric"] == pytest.approx(20.0)

        # Verify: target file now has the new content
        assert target.read_text(encoding="utf-8") == "x = 2\n"

        # Verify: a new git commit exists (commits increased)
        after = subprocess.run(
            ["git", "rev-list", "--count", "HEAD"],
            cwd=str(tmp_path), capture_output=True, text=True,
        )
        commits_after = int(after.stdout.strip())
        assert commits_after > commits_before


class TestRunSingleIterationDiscard:
    """
    Mock Claude Code CLI returns code, mock bench returns a WORSE metric.
    Verify git reset happens and the target file is restored.
    """

    def test_run_single_iteration_discard(self, tmp_path, capsys):
        os.chdir(tmp_path)
        _init_git_repo(tmp_path)

        # Set up target file
        target = tmp_path / "target.py"
        original_content = "x = 1\n"
        target.write_text(original_content, encoding="utf-8")

        # Set up auto/ directory
        _make_config(
            tmp_path,
            target_file="target.py",
            metric_name="score",
            metric_direction="higher",
            bench_timeout_sec=10,
            max_iterations=1,
        )
        init_results()
        # Seed baseline with metric=10
        append_result(0, "aaa1111", 10.0, "keep", "baseline")

        # Write program.md
        (tmp_path / "auto" / "program.md").write_text(
            "Improve x.", encoding="utf-8"
        )

        # bench.sh returns a WORSE metric (5 < 10, and direction=higher)
        _write_bench_script(tmp_path / "auto", 'echo "METRIC: 5.0"')

        # Commit setup so git is clean
        subprocess.run(["git", "add", "-A"], cwd=str(tmp_path), capture_output=True)
        subprocess.run(
            ["git", "commit", "-m", "setup"],
            cwd=str(tmp_path), capture_output=True,
        )

        # Record the commit hash BEFORE the run
        before_hash = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=str(tmp_path), capture_output=True, text=True,
        ).stdout.strip()

        # Mock call_claude_code to return changed code
        mock_response = "x = 999\n"

        with _patch_paths_for_bash():
            with patch("autodev.call_claude_code", return_value=mock_response):
                with patch("autodev.time.sleep"):
                    args = Namespace(max_iterations=1)
                    cmd_run(args)

        # Verify: the result was discarded
        results = load_results()
        discarded = [r for r in results if r["status"] == "discard" and r["iteration"] > 0]
        assert len(discarded) == 1
        assert discarded[0]["metric"] == pytest.approx(5.0)

        # Verify: target file is restored to original (git reset --hard undid the commit)
        restored = target.read_text(encoding="utf-8")
        assert restored == original_content

        # Verify: HEAD is back to where it was before (the experiment commit was undone)
        after_hash = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=str(tmp_path), capture_output=True, text=True,
        ).stdout.strip()
        assert after_hash == before_hash


# ===================================================================
# GIT HELPER TESTS
# ===================================================================


class TestGitHelpers:
    """Tests for git_commit, git_reset_hard, git_short_hash."""

    def test_git_commit_and_short_hash(self, tmp_path):
        """git_commit creates a commit, git_short_hash returns its 7-char hash."""
        os.chdir(tmp_path)
        _init_git_repo(tmp_path)

        # Create a file and commit it
        (tmp_path / "new_file.txt").write_text("content", encoding="utf-8")
        git_commit("test commit message")

        short = git_short_hash()
        assert len(short) == 7
        assert all(c in "0123456789abcdef" for c in short)

        # Verify the commit message
        result = subprocess.run(
            ["git", "log", "-1", "--format=%s"],
            cwd=str(tmp_path), capture_output=True, text=True,
        )
        assert result.stdout.strip() == "test commit message"

    def test_git_reset_hard(self, tmp_path):
        """git_reset_hard reverts the last commit."""
        os.chdir(tmp_path)
        _init_git_repo(tmp_path)

        # Record HEAD before adding a commit
        before = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=str(tmp_path), capture_output=True, text=True,
        ).stdout.strip()

        # Add a commit
        (tmp_path / "doomed.txt").write_text("will be reverted", encoding="utf-8")
        git_commit("doomed commit")

        # Reset
        git_reset_hard()

        after = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=str(tmp_path), capture_output=True, text=True,
        ).stdout.strip()

        assert after == before
        assert not (tmp_path / "doomed.txt").exists()
