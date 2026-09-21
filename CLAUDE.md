# ZAAL — project context

Farsi learning app for young children. Expo SDK 54, React Native 0.81, React 19.

## Orientation

Landscape everywhere **except** `AccountSetup`, which is portrait on phones only.
`app.json` is `"orientation": "default"`; the real decision lives in
`OrientationGate` in `App.tsx`, driven by the active route:

```
PORTRAIT_ROUTES = { AccountSetup }      // portrait, phones only
TABLET_MIN_EDGE = 600                   // shortest edge >= 600dp is a tablet
```

In landscape the screen's **height is its shortest edge**, so `height >= 600`
is the tablet test throughout (HomeScreen uses it to show/hide the
دسترسی سریع row).

## The dominant bug class in this codebase

Art and layout authored in **fixed pixels against one reference device**, then
never scaled. Landscape phone viewports are 360–440pt tall; tablets are
744–1024. The same numbers that look right on a tablet are 2–3x oversized on a
phone, and `overflow: hidden` crops the difference.

Three fixes are already applied and set the pattern to follow:

**1. Scale from a reference size.** `HomeScreen` (`ART_REFERENCE_SIZE = 230`)
and `GamesScreen` (`TILE_REFERENCE_BOX = 373`) derive `k = actualSize / REFERENCE`
and multiply every dimension *and every offset* by it. Pass the real container
size in — `GamesScreen.TileArt` was being handed the **screen** size, not the
card's.

**2. Anchor art that has a horizon.** Room backgrounds are drawn with
`cover`, so a 16:9 image on a 2.2:1 phone loses ~20% of its height — which is
where floors, tables and counters live. `CookingGame` positions its background
bottom-anchored (`top: height - sceneH`) and overflows off the top.
`pickRoomBackground` in `neliWorldAssets.ts` now picks by **aspect ratio**
(`>= 1.95` → the 2796x1290 `phone` variant), not by orientation.

**3. Never hard-code another component's height.** `TopBar` exports
`topBarHeight(screenHeight, insetsTop, { large, topInset })`. `CookingGame`
had `insets.top + 90` pinned, which matched neither a phone (70) nor a tablet
(~98). If you change `TopBar`'s sizing, change `topBarHeight` in step.

Anything positioned as a fraction of **screen height** over art anchored
differently will drift as chrome takes a bigger share of a short screen. In
`CookingGame`, `COUNTER_LINE_FROM_BOTTOM` / `TARGET_FROM_BOTTOM` measure from
the artwork's bottom edge for exactly this reason.

## Audio

Two independent output paths that must stay mutually exclusive:
recorded clips (`utils/faAudio.ts`) and TTS (`hooks/useSpeech.ts`).
`stopFaAudio()` calls `Speech.stop()`, and `useSpeech.stop()` calls
`stopFaAudio()`. Without both, a recorded word and a spoken sentence play over
each other.

**iOS ships no Persian voice.** `speakSegment` bails out when no voice exists
for the language rather than letting the system read Arabic script with an
English voice (which produced a garbled syllable). Silence is the intended
failure. `FeedAnimalsGame` uses recorded audio only — prompts with no recording
were removed rather than left to TTS.

Recorded clips live in `assets/audio/fa-test/`, indexed by
`assets/faTestAudio.generated.ts` (auto-generated, do not hand-edit).
Text→clip lookup is **exact match** on normalized text.

## Known gaps

- Prompts with no recording, so currently silent: `به [animal] غذا بده`,
  `بیا دوباره غذا بدهیم` (FeedAnimals).
- Screens still carrying unscaled fixed-pixel art, worst first:
  `LearningPathScreen`, `AlphabetTrainScreen`, `games/QuizGame`,
  `InteractiveGamesHub`, `AudiobooksScreen`, `LetterTracingScreen`,
  `games/CountingGame`, `StickerRewardScreen`.
- `SplashScreen` advances via a timeout safety net because `goNext()` is
  otherwise reachable only from the celebration animation's completion
  callback, which reports `finished: false` if it is ever starved of frames.

## Testing across sizes

`public/device-bench.html` is served by the dev server at
`http://localhost:8081/device-bench.html`. It renders the live app in eleven
correctly-sized frames (6 phones, 5 tablets) with a safe-area overlay. It is a
viewer only — each frame is an iframe pointing at the dev server, so it
reflects hot reloads.

It runs `react-native-web`, so it catches **shape** bugs (overflow, clipping,
things that assume a tall screen) but **not** native layout: Yoga and the
browser disagree on image intrinsic sizing, and fonts, safe-area insets and
`expo-audio`/`expo-speech`/`expo-haptics` all differ. Verify layout changes on
a real device before trusting them.

Expo Go can't run this project (App Store ships SDK 57, project is SDK 54).
Use a dev build: `eas build --profile development --platform ios`, then
`npm run dev-client`.
