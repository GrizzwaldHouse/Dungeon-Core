"""Launch independent Godot processes for an authoritative LAN loopback review."""
import argparse
import json
from pathlib import Path
import socket
import subprocess
import tempfile
import time

parser = argparse.ArgumentParser()
parser.add_argument("godot", type=Path)
parser.add_argument("--headed", action="store_true")
args = parser.parse_args()
project = Path(__file__).resolve().parents[1]
artifacts = project / "build" / "lan-qa"
artifacts.mkdir(parents=True, exist_ok=True)
folder = Path(tempfile.mkdtemp(prefix="run-", dir=artifacts))
with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as udp:
    udp.bind(("127.0.0.1", 0))
    port = udp.getsockname()[1]

processes = {}
results = {}
try:
    for role in ("host", "guest"):
        if role == "guest":
            deadline = time.monotonic() + 15
            while not (folder / "host-listening").exists():
                if processes["host"].poll() is not None or time.monotonic() > deadline:
                    raise RuntimeError("Host did not initialize")
                time.sleep(0.05)
        cmd = [str(args.godot.resolve()), "--path", str(project), "--log-file", str(folder / (role+".engine.log"))]
        if args.headed:
            cmd += ["--resolution", "800x450", "--position", "5,50" if role == "host" else "820,50"]
        else:
            cmd += ["--headless"]
        cmd += ["-s", "res://tests/lan_peer.gd", "--", role, str(folder), str(port)]
        with (folder / (role+".log")).open("wb") as output:
            processes[role] = subprocess.Popen(cmd, stdout=output, stderr=subprocess.STDOUT)
    for role, proc in processes.items():
        code = proc.wait(timeout=120)
        lines = (folder / (role+".log")).read_text(encoding="utf8", errors="replace").splitlines()
        checks = [line for line in lines if line.startswith(("PASS ", "FAIL ", "LAN_RESULT", "ERROR:", "SCRIPT ERROR:"))]
        results[role] = dict(headed=args.headed, exit=code, checks=checks, passed=(code == 0 and "LAN_RESULT "+role+" PASS" in lines and not any("ERROR:" in line for line in lines)))
finally:
    for proc in processes.values():
        if proc.poll() is None:
            proc.terminate()
            proc.wait(timeout=10)
    print(folder)
    print(json.dumps(results, indent=2))
    (folder / "results.json").write_text(json.dumps(results, indent=2),encoding="utf8")
raise SystemExit(0 if len(results)==2 and all(x["passed"] for x in results.values()) else 1)
