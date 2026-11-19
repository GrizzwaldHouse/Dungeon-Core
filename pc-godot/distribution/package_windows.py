"""Build a local Windows playtest ZIP from reviewed, explicitly named runtime files."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import subprocess
import zipfile

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent
ARCHIVE_HASH = "731980f9608d61333e5baf54a2ef17210acc7a538446c0cb9969f002aca1e953"
ENGINE = "Godot_v4.7.2-stable_win64.exe"
BASE_FILES = ["project.godot", "scenes/main.tscn", "scripts/main.gd",
              "scripts/outpost_state.gd", "scripts/stone_watch.gd", "scripts/lan_party.gd"]

def digest(data):
    return hashlib.sha256(data).hexdigest()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("engine_archive", type=Path)
    parser.add_argument("--include", action="append", default=[], help="Additional reviewed game resource relative to pc-godot")
    args = parser.parse_args()
    archive = args.engine_archive.read_bytes()
    if digest(archive) != ARCHIVE_HASH:
        parser.error("The archive does not match the official Godot Windows 4.7.2 release.")
    files = {}
    for name in sorted(set(BASE_FILES + args.include)):
        path = (PROJECT / name).resolve()
        relative = path.relative_to(PROJECT)
        if path.suffix not in {".godot", ".gd", ".tscn", ".tres", ".glb", ".png", ".jpg"} or any(
            part.startswith(".") or part in {"build", "review", "tests", "distribution"} for part in relative.parts
        ):
            parser.error(f"Unsupported resource: {name}")
        files["game/" + relative.as_posix()] = path.read_bytes()
    file_hashes = {k: digest(v) for k, v in files.items()}
    payload_id = digest(json.dumps(file_hashes, sort_keys=True).encode())[:16]
    base = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=PROJECT, text=True).strip()
    manifest = {"payload_id": payload_id, "source_head_at_packaging": base,
                "godot_version": "4.7.2-stable", "engine_archive_sha256": ARCHIVE_HASH,
                "runtime_files_sha256": file_hashes}
    files["BUILD.json"] = (json.dumps(manifest, indent=2) + "\n").encode()
    for name in ["Play Dungeon Core.cmd", "READ ME FIRST.txt", "GODOT-COPYRIGHT.txt", "GODOT-LICENSE.txt"]:
        files[name] = (HERE / name).read_bytes()
    with zipfile.ZipFile(io.BytesIO(archive)) as source:
        files["engine/" + ENGINE] = source.read(ENGINE)
    output = PROJECT / "build" / "windows-playtest"
    output.mkdir(exist_ok=True, parents=True)
    filename = output / f"DungeonCore-Windows-{base[:8]}-{payload_id}.zip"
    with zipfile.ZipFile(filename, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=3) as bundle:
        for name, data in files.items():
            entry = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            bundle.writestr(entry, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=3)
    print(filename)
    print("Package SHA-256", digest(filename.read_bytes()))

if __name__ == "__main__":
    main()
