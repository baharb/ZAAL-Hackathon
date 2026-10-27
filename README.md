# ZAAL — play-based Farsi for diaspora children

ZAAL is a Persian (Farsi) learning app for children aged 3–7 growing up in
Iranian families outside Iran. It is live on the App Store (Google Play in
testing). This repository is the version being extended for the
**Meta Global AI Developer Hackathon** (Oct 26 – Nov 4, 2026).

## Hackathon feature: «بازی امروز من» — My Daily Quest

A short daily game a child can play alone:

1. The child picks a buddy and a category (food, clothes, colors, letters,
   space, numbers), then chooses favourite words.
2. **Say it to pack it:** the child says each word out loud; the voice plays
   back with a fun echo. Recordings stay on the device for the parent and are
   never uploaded.
3. A calm, side-scrolling quest map: at each stop the child opens a surprise,
   plays one small game with the word, and collects it into a backpack.
4. Difficulty grows with the child (levels), not with age alone.

Full design: [`docs/hackathon/daily-quest-spec.md`](docs/hackathon/daily-quest-spec.md).

## How Meta's AI is used

| Meta tool | Role |
|---|---|
| **Muse Spark** (Meta Model API) | Designs each child's daily quest from the words they chose and the words they find hard, within strict level and safety rules checked in code. Writes a short daily note for parents. *(in progress)* |
| **Muse Image** | Created the quest world art: the garden background and the landmarks (apple tree, bridge, sunflowers, windmill, mushroom pond, picnic). |
| **Muse Code** | Used to build the feature in this repository. |

All model calls go through a Supabase Edge Function
([`supabase/functions/meta-ai`](supabase/functions/meta-ai/index.ts)) so no
API key ships in the app, and every request carries child-safety rules.

## About the artwork

ZAAL's illustrations, character art and most images are **not included in
this public repository**, to protect the app's original artwork (images are
excluded in `.gitignore`). Because of this the app cannot be built from this
repository alone. The **demo video** shows the feature running on a device.

Demo video: _link coming with the submission_

## Child safety and privacy

- No child data is stored on any server; the child's voice never leaves the
  device.
- AI output is limited to choosing word ids and game steps, and is validated
  in code before a child sees it; there is a built-in fallback game.
- Parent features sit behind a PIN gate.

## Tech

Expo SDK 54 · React Native 0.81 · TypeScript · Supabase · Meta Model API.
See [`PROJECT-OVERVIEW.md`](PROJECT-OVERVIEW.md) and [`CLAUDE.md`](CLAUDE.md)
for the codebase details.
