"""Create ZAAL's family characters with Meta's Muse Image, using Grandma as the style reference.

Usage (PowerShell, from the project folder):
    $env:MODEL_API_KEY = "<your key from dev.meta.ai -> API keys>"
    python scripts\\generate_family_images.py            # make all missing members
    python scripts\\generate_family_images.py amoo khaleh # make (or remake) only these

Pictures are saved to assets/neli-world/characters/Family/<id>.<ext> (white
background). The key is read from the environment and never written to disk.
"""
from __future__ import annotations

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

API_URL = "https://api.meta.ai/v1/images/edits"
MODEL = "muse-image-1.0"

ROOT = Path(__file__).resolve().parent.parent
REFERENCE = ROOT / "assets/neli-world/characters/Grandma/grandma_standing.webp"
OUT_DIR = ROOT / "assets/neli-world/characters/Family"

STYLE = (
    "Create a NEW character who belongs to the same family as the grandma in this image: "
    "exactly the same art style, the same cat species and face shape, the same soft 3D cartoon "
    "rendering, the same proportions, colors and line quality. {who} "
    "No headscarf, no hat, hair fully visible. Standing, full body, facing the viewer, "
    "friendly smile, waving one hand. Plain pure white background, nothing else in the image. "
    "Do not draw the grandma."
)

MEMBERS = {
    "bababozorg": "An older grandpa with soft white curly hair, a small white mustache, round glasses, "
                  "a cozy knitted vest over a shirt.",
    "amoo": "A cheerful young uncle with short dark hair, a neat dark mustache and a striped shirt.",
    "ammeh": "A kind young aunt with long dark hair in a ponytail and a colorful dress.",
    "daei": "A playful young uncle with dark curly hair, square glasses and a hoodie.",
    "khaleh": "A warm young aunt with long wavy dark hair, a flowered blouse and a big friendly smile.",
}


def ext_for(data: bytes) -> str:
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    if data[:3] == b"\xff\xd8\xff":
        return "jpg"
    return "png"


def call_api(key: str, prompt: str, ref_data_url: str) -> bytes:
    body = json.dumps({
        "model": MODEL,
        "prompt": prompt,
        "images": [{"image_url": ref_data_url}],
        "n": 1,
    }).encode("utf-8")
    req = urllib.request.Request(API_URL, data=body, method="POST", headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=300) as res:
        payload = json.loads(res.read().decode("utf-8"))
    item = (payload.get("data") or [{}])[0]
    if item.get("b64_json"):
        return base64.b64decode(item["b64_json"])
    if item.get("url"):
        with urllib.request.urlopen(item["url"], timeout=300) as img:
            return img.read()
    raise RuntimeError(f"No image in response: {json.dumps(payload)[:400]}")


def main() -> None:
    key = os.environ.get("MODEL_API_KEY", "").strip()
    if not key:
        sys.exit('Set your key first:  $env:MODEL_API_KEY = "<key from dev.meta.ai -> API keys>"')
    if not REFERENCE.exists():
        sys.exit(f"Reference picture not found: {REFERENCE}")

    wanted = sys.argv[1:] or list(MEMBERS)
    unknown = [w for w in wanted if w not in MEMBERS]
    if unknown:
        sys.exit(f"Unknown member(s): {', '.join(unknown)}. Choose from: {', '.join(MEMBERS)}")
    remake = bool(sys.argv[1:])

    ref_data_url = "data:image/webp;base64," + base64.b64encode(REFERENCE.read_bytes()).decode("ascii")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for member in wanted:
        existing = list(OUT_DIR.glob(f"{member}.*"))
        if existing and not remake:
            print(f"skip   {member} (already exists: {existing[0].name})")
            continue
        prompt = STYLE.format(who=MEMBERS[member])
        print(f"making {member} ...", flush=True)
        for attempt in range(1, 4):
            try:
                data = call_api(key, prompt, ref_data_url)
                for old in existing:
                    old.unlink(missing_ok=True)
                path = OUT_DIR / f"{member}.{ext_for(data)}"
                path.write_bytes(data)
                print(f"saved  {path.relative_to(ROOT)}")
                break
            except urllib.error.HTTPError as err:
                detail = err.read().decode("utf-8", "replace")[:300]
                print(f"  attempt {attempt}: HTTP {err.code} {detail}")
            except Exception as err:  # network hiccup, timeout
                print(f"  attempt {attempt}: {err}")
            time.sleep(3 * attempt)
        else:
            print(f"FAILED {member} — run again later: python scripts\\generate_family_images.py {member}")


if __name__ == "__main__":
    main()
