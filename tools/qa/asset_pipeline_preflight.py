# asset_pipeline_preflight.py
# Developer: Marcus Daley
# Date: 2026-11-06
# Why: Replaces repeated agent discovery and asset-integrity checks with one bounded local report.

import argparse
import hashlib
import json
import os
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BLENDER = Path(r"C:\Program Files\Blender Foundation\Blender 5.1\blender.exe")
BUDGET = ROOT / "docs" / "design" / "asset-pipeline-budget.json"
MANIFEST = ROOT / "docs" / "design" / "runtime-aqueduct-spiders" / "asset-manifest.json"


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def command(args):
    run = subprocess.run(args, cwd=ROOT, text=True, capture_output=True, check=False)
    return {"exitCode": run.returncode, "stdout": run.stdout[-4000:], "stderr": run.stderr[-4000:]}


def validate_manifest():
    if not MANIFEST.is_file():
        return {"state": "MISSING", "path": str(MANIFEST), "assets": {}}
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    results = {}
    for name, asset in data.get("assets", {}).items():
        glb = MANIFEST.parent / asset["file"]
        preview = MANIFEST.parent / asset["attackPreview"]
        header = glb.read_bytes()[:4] if glb.is_file() else b""
        actual_hash = sha256(glb) if glb.is_file() else None
        results[name] = {
            "glbExists": glb.is_file(),
            "glbHeaderValid": header == b"glTF",
            "hashMatches": actual_hash == asset.get("sha256"),
            "attackPreviewExists": preview.is_file(),
            "attackEmitter": asset.get("attackEmitter"),
            "animationFrames": asset.get("animationFrames")
        }
    passed = bool(results) and all(all((item["glbExists"], item["glbHeaderValid"],
        item["hashMatches"], item["attackPreviewExists"], item["attackEmitter"] == "AttackEmitter"))
        for item in results.values())
    return {"state": "PASS" if passed else "FAIL", "path": str(MANIFEST), "assets": results}


def main():
    parser = argparse.ArgumentParser(description="Audit the local game asset pipeline without exposing credentials.")
    parser.add_argument("--run-tests", action="store_true", help="Run bounded spider and character tests.")
    parser.add_argument("--output", type=Path, help="Optional JSON report path.")
    args = parser.parse_args()
    budget = json.loads(BUDGET.read_text(encoding="utf-8"))
    blender_version = command([str(BLENDER), "--background", "--python-expr",
        "import bpy; print('BLENDER_VERSION=' + bpy.app.version_string)"]) if BLENDER.is_file() else None
    version_match = re.search(r"BLENDER_VERSION=([^\r\n]+)",
        (blender_version["stdout"] + blender_version["stderr"]) if blender_version else "")
    report = {
        "schema": "dungeon-core.asset-preflight.v1",
        "repository": str(ROOT),
        "blender": {
            "path": str(BLENDER),
            "exists": BLENDER.is_file(),
            "version": version_match.group(1) if version_match else None,
            "launchExitCode": blender_version["exitCode"] if blender_version else None
        },
        "meshy": {
            "apiKeyConfigured": bool(os.environ.get("MESHY_API_KEY")),
            "hardCreditCeiling": budget["hardCreditCeiling"],
            "reservedCreditCeiling": budget["reservedCreditCeiling"],
            "consumedCredits": budget["consumedCredits"],
            "remainingCredits": budget["hardCreditCeiling"] - budget["consumedCredits"],
            "submissionState": budget["submissionState"]
        },
        "generatedAssets": validate_manifest(),
        "tests": None
    }
    if args.run_tests:
        report["tests"] = command(["node", "--test", "tests/character-render.test.js",
            "tests/barkwing-render.test.js", "tests/floor-two.test.js"])
    output = json.dumps(report, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("w", encoding="utf-8", newline="\n") as target:
            target.write(output + "\n")
    print(output)
    failed = not report["blender"]["exists"] or report["generatedAssets"]["state"] != "PASS"
    if report["tests"] and report["tests"]["exitCode"]:
        failed = True
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
