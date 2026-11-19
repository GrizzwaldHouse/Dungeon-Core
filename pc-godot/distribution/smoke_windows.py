"""Validate a portable playtest ZIP by extracting and launching its bundled game."""
import hashlib
import json
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

def main():
    archive = Path(sys.argv[1]).resolve(strict=True)
    # Retain the extracted build and its logs under the ignored build directory.
    target = Path(tempfile.mkdtemp(prefix="extracted-", dir=archive.parent))
    with zipfile.ZipFile(archive) as bundle:
        for name in bundle.namelist():
            (target / name).resolve().relative_to(target)
        bundle.extractall(target)
    manifest = json.loads((target / "BUILD.json").read_text())
    for name, expected in manifest["runtime_files_sha256"].items():
        if hashlib.sha256((target / name).read_bytes()).hexdigest() != expected:
            raise ValueError(f"Checksum mismatch for {name}")
    exe = next((target / "engine").glob("*.exe"))
    log = target / "launch.log"
    result = subprocess.run([str(exe), "--path", str(target / "game"), "--log-file",
                             str(log), "--quit-after", "90"], timeout=45)
    text = log.read_text(errors="replace")
    if result.returncode or "ERROR:" in text or "Godot Engine" not in text:
        raise RuntimeError(f"Launch check failed: {log}")
    print("PASS launch from extracted package", manifest["payload_id"], log)

if __name__ == "__main__":
    main()
