# ZAAL Instagram reels

Reels and posts for [@zaalkids](https://www.instagram.com/zaalkids/), built as HTML
templates and rendered to video with headless Chrome + ffmpeg. They use the app's own
character art, logo and sounds straight from `../../assets/`, so nothing is duplicated.

| Folder | What it is |
|---|---|
| `mother-tongue/` | "زبان مادری، زبانِ دل است": four reasons to keep Farsi at home |
| `mehregan/` | Mehregan (16 Mehr / 8 Oct) for parents, with Lila and Farsi voiceover |
| `first-word/` | "اولین کلمه‌ی فارسی بچه‌تون چی بود؟": 9s question reel with Mila |
| `first-word-image/` | The same question as a 4:5 image post |
| `five-words/` | "۵ کلمه‌ی فارسی که معادل انگلیسی نداره": Neli, Zephyr voice |
| `shared/` | Art made for the reels (Mila cut-out repaired from the original, cropped colour logo) |
| `tools/` | Renderer and helpers |

Each reel folder has `index.html` (the template), `post.txt` (caption, hashtags, first
comment, settings), the cover, and `voices/` (the Gemini TTS clips plus the CSVs that made them).

Feature reels (`cooking`, `finglish`, `grandma-call`, `halloween`) also have an **App Store
Custom Product Page** section in `post.txt`: the screenshots to lead with and the promotional
text (170 characters max) for a page that matches the reel. The approved page's URL goes in the
bio link while that reel is the newest post.

## Setup

```bash
cd marketing/reels
npm install
```

Needs Google Chrome installed. On a non-standard path, set `CHROME_PATH`.

## Render

Run from `marketing/reels`:

```bash
# quick preview (30fps)
HTML=five-words/index.html NOMUSIC=1 OUT=five-words.mp4 node tools/render.js

# Instagram master: lossless frames, 60fps, BT.709-tagged H.264, 256k AAC
HQ=1 HTML=five-words/index.html NOMUSIC=1 OUT=five-words-HQ.mp4 node tools/render.js

# still frames at given seconds (H=1350 for the 4:5 image post)
HTML=five-words/index.html node tools/stills.js 2.5 9
HTML=first-word-image/index.html H=1350 node tools/stills.js 0
```

`NOMUSIC=1` leaves out the background music so a song can be added in Instagram.
Finished videos (`*.mp4`) are not committed. Re-render them from the templates.

## How a template works

- `window.seek(t)` draws the frame at time `t`; the renderer screenshots every frame.
- `window.AUDIO` lists the sounds: `[file, start, volume, kind?, keep?]`. A file under
  `voices/` is relative to the reel's folder; anything else is in the app's `assets/audio/`.
  `kind: 'voice'` clips are cut to `keep` seconds, which drops Gemini's silent or noisy tails.
- `five-words` times each page from its voice clip (`SPEECH`), so new recordings only need
  their measured start/end.

## Voices (Gemini TTS)

Generated with the app's `scripts/generate_gemini_voice_pack.py`. `tools/tts_expressive.py`
runs the same generator with a higher temperature (`TTS_TEMP`, default 0.8) for more natural
delivery; the app script hard-codes 0.2.

```bash
GEMINI_API_KEY=... TTS_TEMP=0.8 python tools/tts_expressive.py --input five-words/voices/zephyr.csv --out voices
```

The voice that works best for the reels is **Zephyr** with the "young Iranian mother, warm,
smiling" instruction in `five-words/voices/zephyr.csv`.

Lessons learned:
- One short line per clip. Lines with "..." or "،" in the middle often come back with
  only the first half spoken, then up to a minute of silence or noise.
- Check every clip's speech window before using it, as with the app's recordings.
- Requests sometimes time out (504) or hit the daily quota; the generator queues those
  rows in a `*.pending.csv` to retry.

## Art notes

- Some character images have see-through holes where background removal ate white areas
  (Aidin: thinking, sitting, reading, walking, jumping; most Mila poses). Clean ones are
  Aidin standing/waving/running/celebrating, all Lila and Neli poses, and
  `shared/mila_waving_fixed.png`.
- `tools/cutout.html` is how the Mila cut-out was repaired: it flood-fills the neutral
  background from the edges (Mila's fur is warm white), then smooths the outline.
