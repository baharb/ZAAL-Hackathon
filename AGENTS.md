# ZAAL — instructions for coding agents (Muse Code)

ZAAL is a play-based Persian (Farsi) learning app for children aged 3–8 in
diaspora families. Expo SDK 54, React Native 0.81, React 19, TypeScript.
Published on the App Store; Google Play in testing.

This repo is the version being upgraded for the **Meta Global AI Developer
Hackathon** (Oct 26 – Nov 4, 2026). New features should use Meta's models
(Muse Spark through the Meta Model API, Muse Image, Muse Voice, SAM 3.1).

**Read `CLAUDE.md` before changing any screen.** It holds the hard-won rules
for this codebase (orientation, layout scaling, audio races, iOS Modal crash).
Everything in it applies to you too. The most important ones are summarised
below.

## How to work with the developer (Bahar)

- Explain what you plan to change in plain, simple English before editing.
- Make small, focused changes — one feature at a time.
- When done, list every file you changed and give exact steps to test it.
- Don't reformat or rewrite files you don't need to touch.
- Don't delete files, assets or recordings unless asked.

## Meta Model API — how ZAAL calls it

- **Never put a Meta API key in the app**, in `.env` with an `EXPO_PUBLIC_`
  prefix, or anywhere in `src/`. `EXPO_PUBLIC_*` values are compiled into the
  app bundle and anyone can read them.
- The app calls `askMeta()` in `src/services/metaAI.ts`. It invokes the
  Supabase Edge Function `supabase/functions/meta-ai/index.ts`, which holds the
  key as the server secret `MODEL_API_KEY` and calls
  `https://api.meta.ai/v1/chat/completions`.
- Model: `muse-spark-1.3` (standard). **Never use `muse-spark-1.3-contributor`**
  — it lets Meta train on the data, and this is a children's app.
- Need a new kind of call (image generation, speech-to-text)? Add a new
  Edge Function next to `meta-ai` following the same pattern. Don't add API
  keys to the client.
- The Edge Function already prepends child-safety rules to every request.
  Keep them. Model output shown to a child must be short, kind and simple.

## Child privacy (non-negotiable)

- Don't store children's photos, voice recordings or model responses on any
  server. Process and discard.
- Don't log images, audio or prompts containing personal details.
- Features using the camera or microphone must be started by a tap, with a
  parent-friendly explanation, and work only while the screen is open.
- New permissions (camera, microphone) need a usage description in
  `app.json` (`ios.infoPlist`) written for parents.

## Codebase rules (from CLAUDE.md — the ones that break most often)

- **Landscape only.** Import `useWindowDimensions` from
  `src/layout/PortraitFallback`, never from `react-native`. Never use
  `Dimensions.get`.
- **Every `<Modal>` must have `supportedOrientations={['landscape']}`** or it
  crashes on real iPhones in release builds.
- **Scale from a reference size.** No fixed pixel sizes for art/layout:
  compute `k = actualSize / REFERENCE` and multiply every size and offset.
  Landscape phones are only 360–440pt tall.
- Use `topBarHeight()` from `TopBar`; never hard-code its height.
- No `KeyboardAvoidingView`. Every `TextInput` needs `disableFullscreenUI`.
  Avoid the system keyboard on screens a child can reach.
- **Audio:** recorded clips go through `utils/faAudio.ts`, TTS through
  `hooks/useSpeech.ts` — never play both at once. iOS has no Persian TTS
  voice, so don't rely on TTS for Farsi on iPhone. Prefer WAV.
- Farsi text uses the Vazirmatn fonts already loaded in `App.tsx`. The app
  forces LTR at the OS level; set RTL per text element.

## Running and testing

- Install: `npm install`
- Expo Go **cannot** run this project (SDK 54). Use a dev build:
  `eas build --profile development --platform android` (or `ios`), then
  `npm run dev-client`.
- Quick shape check in the browser: `npx expo start --web`, then open
  `http://localhost:8081/device-bench.html`.
- Edge Function: `supabase functions deploy meta-ai`, key via
  `supabase secrets set MODEL_API_KEY=...`.
