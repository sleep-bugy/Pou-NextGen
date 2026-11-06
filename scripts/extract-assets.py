"""Extract visual/audio references from the operator-provided Pou APK.

Only named image/font assets and audio resources are copied. Android binaries,
advertising, credentials, and network configuration are not part of the web app.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import struct
import subprocess
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument("apk", type=Path)
parser.add_argument("--aapt", default="/home/mohammadadi/Android/Sdk/build-tools/36.0.0/aapt")
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
target = root / "public" / "assets"
target.mkdir(parents=True, exist_ok=True)
inventory = {"images": {}, "sounds": {}, "source": {"file": args.apk.name, "sha256": hashlib.sha256(args.apk.read_bytes()).hexdigest()}}

with zipfile.ZipFile(args.apk) as apk:
    for entry in apk.infolist():
        if not entry.filename.startswith(("assets/images/", "assets/fonts/")):
            continue
        relative = Path(entry.filename).relative_to("assets")
        if ".." in relative.parts or entry.is_dir():
            continue
        data = apk.read(entry)
        destination = target / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
        if data.startswith(b"\x89PNG"):
            width, height = struct.unpack(">II", data[16:24])
            inventory["images"][str(relative).removeprefix("images/")] = [width, height]

    resources = subprocess.check_output([args.aapt, "dump", "--values", "resources", str(args.apk)], text=True)
    for name, filename in re.findall(r'resource 0x[0-9a-f]+ me\.pou\.app:raw/(\w+):[^\n]+\n\s+\(string8\) "([^"]+)"', resources):
        extension = Path(filename).suffix
        if extension not in (".mp3", ".ogg", ".wav"):
            continue
        destination = target / "sounds" / (name + extension)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(apk.read(filename))
        inventory["sounds"][name] = f"sounds/{name}{extension}"

reference = root / "reference"
reference.mkdir(exist_ok=True)
(reference / "asset-inventory.json").write_text(json.dumps(inventory, indent=2))
manifest = {"images": inventory["images"], "sounds": inventory["sounds"]}
(target / "catalog.json").write_text(json.dumps(manifest, separators=(",", ":")))
print(f"Extracted {len(inventory['images'])} images, {len(inventory['sounds'])} sounds, and Pou.ttf")
