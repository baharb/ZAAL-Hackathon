"""Create a family (6 relatives) for each ZAAL buddy with Meta's Muse Image, using the buddy as the style reference.

Usage (PowerShell, from the project folder):
    $env:MODEL_API_KEY = "<your key from dev.meta.ai -> API keys>"
    python scripts\\generate_family_images.py            # make all missing members
    python scripts\\generate_family_images.py aidin        # only Aidin's family (remakes)
    python scripts\\generate_family_images.py aidin amoo   # only Aidin's amoo (remakes)

Pictures are saved to assets/neli-world/characters/Family/<buddy>/<member>.<ext> (white
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
CHARS = ROOT / "assets/neli-world/characters"
OUT_DIR = CHARS / "Family"

# Each buddy gets its own family, drawn in that buddy's style and species.
# reference = the picture sent to Muse Image as the style guide.
BUDDIES = {
    "neli": {"species": "cat", "reference": CHARS / "Grandma/grandma_standing.webp"},
    "aidin": {"species": "owl", "reference": CHARS / "Aidin/01_owl_base_standing.webp"},
    "mila": {"species": "bunny", "reference": CHARS / "Mila/cheerful_kawaii_bunny_character.webp"},
    "lila": {"species": "lamb", "reference": CHARS / "Lila/happy_lamb_in_yellow_overalls.webp"},
    "dara": {"species": "giraffe", "reference": CHARS / "Dara/cheerful_cartoon_giraffe_character.webp"},
    "roboBoombo": {"species": "friendly robot", "reference": CHARS / "Robo Boombo/base_happy_1x_512x512.webp"},
}

STYLE = (
    "Create a NEW character who belongs to the same family as the character in this image: "
    "a {species}, in exactly the same art style, the same species and face shape, the same "
    "cartoon rendering, the same proportions, colors and line quality. {who} "
    "No headscarf, no hat, hair or head fully visible. Standing, full body, facing the viewer, "
    "friendly smile, waving one hand. Plain pure white background, nothing else in the image. "
    "Do not draw the character from the reference image."
)

MEMBERS = {
    "mamanbozorg": "A sweet grandma: older, soft white curly hair, round glasses, a pearl necklace "
                   "and a simple dress.",
    "bababozorg": "A sweet grandpa: older, soft white hair, a small white mustache, round glasses, "
                  "a cozy knitted vest over a shirt.",
    "amoo": "A cheerful young uncle with short dark hair, a neat dark mustache and a striped shirt.",
    "ammeh": "A kind young aunt with long dark hair in a ponytail and a colorful dress.",
    "daei": "A playful young uncle with dark curly hair, square glasses and a hoodie.",
    "khaleh": "A warm young aunt with long wavy dark hair, a flowered blouse and a big friendly smile.",
}
# Neli's grandma already exists in the app (characters/Grandma/grandma_standing.webp).
SKIP = {("neli", "mamanbozorg")}


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

    # Optional filters: buddy ids and/or member ids, e.g.  aidin amoo
    args = sys.argv[1:]
    bad = [a for a in args if a not in BUDDIES and a not in MEMBERS]
    if bad:
        sys.exit(f"Unknown: {', '.join(bad)}. Buddies: {', '.join(BUDDIES)}. Members: {', '.join(MEMBERS)}")
    buddies = [a for a in args if a in BUDDIES] or list(BUDDIES)
    members = [a for a in args if a in MEMBERS] or list(MEMBERS)
    remake = bool(args)

    for buddy in buddies:
        info = BUDDIES[buddy]
        ref = info["reference"]
        if not ref.exists():
            print(f"skip   {buddy}: reference picture not found ({ref})")
            continue
        mime = "image/webp" if ref.suffix == ".webp" else "image/png"
        ref_data_url = f"data:{mime};base64," + base64.b64encode(ref.read_bytes()).decode("ascii")
        out = OUT_DIR / buddy
        out.mkdir(parents=True, exist_ok=True)
        for member in members:
            if (buddy, member) in SKIP:
                continue
            existing = list(out.glob(f"{member}.*"))
            if existing and not remake:
                print(f"skip   {buddy}/{member} (already exists)")
                continue
            prompt = STYLE.format(species=info["species"], who=MEMBERS[member])
            print(f"making {buddy}/{member} ...", flush=True)
            for attempt in range(1, 4):
                try:
                    data = call_api(key, prompt, ref_data_url)
                    for old in existing:
                        old.unlink(missing_ok=True)
                    path = out / f"{member}.{ext_for(data)}"
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
                print(f"FAILED {buddy}/{member} — run again later: python scripts\\generate_family_images.py {buddy} {member}")


if __name__ == "__main__":
    main()
