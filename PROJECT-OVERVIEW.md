# ZAAL — project overview

A Farsi language-learning app for young children (~3–6). Landscape-locked,
character-led, built around recorded native audio rather than text.

Bundle IDs `com.zaal.app` on both stores. Version 1.0.0, iOS build 2,
Android versionCode 6.

---

## Stack

| | |
|---|---|
| Framework | Expo SDK 54, React Native 0.81.5, React 19.1 |
| Language | TypeScript 5.9 |
| Navigation | Hand-rolled — a `switch` over a route union in `App.tsx`, no React Navigation |
| State | React Context (`AppContext`, `NavContext`), persisted to `AsyncStorage` under `lz_state_v2` |
| Backend | Supabase (auth OTP only — no session is kept) |
| Payments | RevenueCat, currently gated off by `PREMIUM_ENABLED = false` |
| Fonts | Vazirmatn (Farsi), Nunito (Latin) |
| Build | EAS, `appVersionSource: local` |

There is an `app/` directory of Expo Router stubs, but it is **not** the live
navigation — those files are 80-byte re-exports. `App.tsx` is the real router.

---

## Structure

```
App.tsx                 route switch, orientation, fonts, screen-time gate
src/
  screens/              36 files, ~726 KB
    interactive/        10 drag-and-drop games
    games/              6 simpler games
  components/           TopBar, CharacterAvatar, PasswordGate, celebration, farsi/
  store/                AppContext (state + persistence), NavContext (routing)
  services/             supabaseClient, accountActivation, purchases
  hooks/                useSpeech, useLandscapeDimensions, usePremiumGate
  theme/                fonts, colors, responsive, styles
  utils/                faAudio, passwordHash, tracingUtils
  assets/               generated asset manifests
assets/
  audio/fa-test/        243 recorded Farsi clips
  neli-world/           16 art categories (characters, backgrounds, food, …)
  fonts/                Nunito TTFs
public/device-bench.html   multi-device preview harness
```

---

## Routes

34 routes, all through `App.tsx`:

**Entry** — Splash → AccountSetup (parent sign-in) → Home
**Gates** — SettingsUnlock, PremiumUnlock, Premium, TimeUp
**Hubs** — Home, Main (tabs), Games, InteractiveGames, AlphabetHub, LearningPath, Subjects, Sections
**Content** — VideoShows, AlphabetShow, AlphabetTrain, Audiobooks, Coloring, PhysicalActivity, SEL, BabyWorld, Characters
**Tracing** — LetterTracing, FarsiTracing, InteractiveFarsiTrace, FirstLettersTracing
**Interactive games** — Cooking, DressUp, FeedAnimals, ToothBrush, BuildScene, DailyRoutine, ConversationGame, SolarPuzzle
**Simple games** — Memory, Counting, Quiz, Spelling, ColorMatch, CultureQuiz

Largest screens (complexity proxy): VideoShows 48.5 KB, DressUp 47.9, AlphabetTrain 47.2, Cooking 43.1, LetterTracing 36.2.

---

## Cast

Neli (cat, the hero), Lila (lamb), Aidin (owl), Mila, Dara (giraffe),
Robo Boombo (robot). Each has multiple poses plus blink overlays, composited
at runtime by `CharacterAvatar`.

---

## Parent account

Email or phone → Supabase OTP → a 4-digit birth-year passcode that gates
parent settings. Credentials are stored **only on the device**; the passcode is
a salted hash (`utils/passwordHash.ts`, 12 000 rounds × 4 seeds).

**SMS to Iranian numbers does not work** — Twilio stopped delivering to +98 in
March 2025 (sanctions). The app detects this before sending and steers those
users to email.

---

## Screen time

`AppContext` tracks foreground time per device-day. When the daily limit is
hit, every route except a small exempt set redirects to `TimeUp`. Parents grant
bonus minutes from settings.

---

## Audio

Two independent paths that must stay mutually exclusive — recorded clips
(`utils/faAudio.ts`) and TTS (`hooks/useSpeech.ts`). 243 recorded clips are
indexed in `assets/faTestAudio.generated.ts`, looked up by **exact normalized
text match**; anything without a clip falls through to TTS.

**iOS ships no Persian voice**, so that fallback produced garbled sound. TTS
now bails out when no voice exists for the language — silence is the intended
failure. FeedAnimals was converted to recorded-audio-only.

---

## Known constraints

- **Landscape phones are the hard case.** 360–440pt of height versus 744–1024
  on tablets. Most historical layout bugs come from art authored against a
  tablet and never scaled. See `CLAUDE.md` for the three patterns that fix it.
- **Expo Go can't run this** — the App Store ships SDK 57, the project is
  SDK 54. Use a dev build.
- **The device bench is web**, so it catches shape bugs but not native layout,
  fonts, safe areas or native modules.
- **Eight screens still carry unscaled fixed-pixel art** (listed in
  `CLAUDE.md`).
