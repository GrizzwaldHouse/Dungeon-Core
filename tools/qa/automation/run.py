"""Repeatable local Dungeon Core checks with a small, secret-safe evidence manifest.

This runner executes existing checks. It never edits game code, pushes, or deploys.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone


ROOT = Path(__file__).resolve().parents[3]
DEFAULT_OUT = ROOT / "reports" / "qa" / "automation-local"
TARGETED = [
    "tests/layout-parity.test.js",
    "tests/layout-trap-render.test.js",
    "tests/progression-outcomes.test.js",
    "tests/weapon-range.test.js",
    "tests/owner-pickup-reconnect.test.js",
]
OPEN_GATES = [
    "four mock classes clear all floors in a recorded headed campaign",
    "two real clients fight the same full encounter on each floor",
    "natural all-player wipe, ally revive, and optional harder-cycle restart recorded",
    "boulder warning, dodge, hit, recovery, and exit recorded",
    "behind-wall cache exists and collection disappears on both clients",
    "exact tick and authority edge cases have fresh targeted evidence",
    "companion navigation around launchers and refuges has headed evidence",
    "phone portrait and landscape touch, occlusion, and text selection checked",
    "reduced-motion cues checked in a live browser",
    "physical iPhone and public deployment independently accepted",
]


def dependency_dir() -> Path | None:
    candidates = [
        ROOT / "node_modules",
        Path.home() / "Projects" / "HandshakeGame_MSI" / "ChatGPT_MSI" / "DungeonCoreCrawler" / "node_modules",
    ]
    return next((p for p in candidates if (p / "socket.io").is_dir()), None)


def git(*args: str) -> str:
    result = subprocess.run(["git", *args], cwd=ROOT, text=True, capture_output=True, check=True)
    return result.stdout.strip()


def counts(output: str) -> dict[str, int]:
    found: dict[str, int] = {}
    for name in ("tests", "pass", "fail", "cancelled", "skipped"):
        matches = re.findall(rf"(?:^|\n)\s*(?:ℹ\s*)?{name}\s+(\d+)\s*(?:\n|$)", output)
        if matches:
            found[name] = int(matches[-1])
    return found


def execute(name: str, command: list[str], env: dict[str, str], timeout: int) -> dict:
    start = time.monotonic()
    try:
        result = subprocess.run(command, cwd=ROOT, env=env, text=True, capture_output=True,
                                errors="replace", timeout=timeout, check=False)
        code = result.returncode
        output = result.stdout + "\n" + result.stderr
        test_counts = counts(output)
        outcome = "PASS" if code == 0 else "FAIL"
        failed_tests = re.findall(r"^✖\s+(.+)$", output, re.MULTILINE)[:12]
    except subprocess.TimeoutExpired:
        code, test_counts, outcome, failed_tests = None, {}, "TIMEOUT", []
    except OSError:
        code, test_counts, outcome, failed_tests = None, {}, "LAUNCH_FAILED", []
    return {"name": name, "outcome": outcome, "exit_code": code,
            "duration_seconds": round(time.monotonic() - start, 2), "counts": test_counts,
            "failed_test_names": failed_tests}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("quick", "regression", "headed"), default="quick")
    parser.add_argument("--output", type=Path, help="Evidence directory; defaults to a new timestamped run")
    args = parser.parse_args()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output = (args.output or DEFAULT_OUT / f"{stamp}-{args.mode}").resolve()
    output.mkdir(parents=True, exist_ok=True)
    if not (ROOT / "AGENTS.md").exists():
        parser.error("Run from the Dungeon Core checkout containing AGENTS.md")
    head = git("rev-parse", "HEAD")
    branch = git("branch", "--show-current")
    dirty = git("status", "--porcelain") != ""
    env = os.environ.copy()
    dep = dependency_dir()
    if dep:
        env["NODE_PATH"] = str(dep)
    elif not env.get("NODE_PATH"):
        parser.error("socket.io dependency unavailable in the checkout or known sibling")
    checks: list[dict] = []
    if args.mode == "quick":
        checks.append(execute("javascript_syntax", ["node", "scripts/check-js.js"], env, 90))
        checks.append(execute("targeted_regression", ["node", "--test", *TARGETED], env, 120))
    elif args.mode == "regression":
        checks.append(execute("javascript_syntax", ["node", "scripts/check-js.js"], env, 90))
        checks.append(execute("full_regression", [shutil.which("npm") or "npm", "test"], env, 240))
    else:
        env["QA_HEADED"] = "1"
        capture = output / "headed-two-real-clients"
        capture_started = time.time()
        checks.append(execute("two_real_headed_clients",
                              ["node", "scripts/qa-2026-10-31/two-real-browsers.js", str(capture)],
                              env, 180))
    videos = []
    browser_report = output / "headed-two-real-clients" / "report.json"
    browser_details: dict = {}
    if (args.mode == "headed" and browser_report.is_file() and
            browser_report.stat().st_mtime >= capture_started):
        data = json.loads(browser_report.read_text(encoding="utf-8"))
        screenshots = sorted(browser_report.parent.glob("*.png"))
        browser_details = {
            "candidate_head": data.get("candidateHead"),
            "configuration": data.get("configuration"),
            "observation_labels": [o.get("label") for o in data.get("observations", [])],
            "browser_errors": len(data.get("browserErrors", [])),
            "browser_warnings": len(data.get("browserWarnings", [])),
            "source_unchanged": data.get("sourceAtStart") == data.get("sourceAtEnd"),
            "gpu_renderer": "not captured; Chrome used normal GPU selection",
            "capture_resolutions": sorted({match.group(0) for p in screenshots
                                           if (match := re.search(r"\d+x\d+", p.name))}),
            "active_player_count": max((len(o.get("server", {}).get("players", []))
                                        for o in data.get("observations", [])), default=0),
            "roles": sorted({p.get("role") for o in data.get("observations", [])
                             for p in o.get("server", {}).get("players", []) if p.get("role")}),
        }
        videos = [{"path": str(p), "bytes": p.stat().st_size}
                  for p in sorted(browser_report.parent.glob("*-headed-client.webm"))]
        if (browser_details["candidate_head"] != head or len(videos) != 2 or
                browser_details["browser_errors"] != 0 or
                browser_details["roles"] != ["MAGE", "VANGUARD"]):
            checks[-1]["outcome"] = "FAIL"
            checks[-1]["reason"] = "Head, video count, browser errors, or role selection mismatch"
    manifest = {
        "schema_version": 1,
        "utc": datetime.now(timezone.utc).isoformat(),
        "repository": str(ROOT), "branch": branch, "head": head,
        "working_tree_dirty_at_start": dirty,
        "mode": args.mode, "checks": checks, "browser": browser_details,
        "videos": videos, "codex_video_review": "PENDING",
        "open_acceptance_gates": OPEN_GATES,
        "evidence_class": "local automated; headed desktop only when mode=headed",
    }
    target = output / "manifest.json"
    target.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"manifest": str(target), "head": head,
                      "results": [{"name": c["name"], "outcome": c["outcome"], "counts": c["counts"]}
                                  for c in checks]}))
    return 0 if all(c["outcome"] == "PASS" for c in checks) else 1


if __name__ == "__main__":
    sys.exit(main())
