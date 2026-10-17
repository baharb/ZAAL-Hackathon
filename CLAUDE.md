# ZAAL — project context

Farsi learning app for young children. Expo SDK 54, React Native 0.81, React 19.

## Orientation

Landscape everywhere, unconditionally, declared **statically** — `app.json`'s
top-level `"orientation": "landscape"` sets it natively for both platforms:
Expo prebuild writes it into iOS's `Info.plist` (no `ios/` directory is
committed, so this is the only iOS orientation config there is), and
`android/app/src/main/AndroidManifest.xml` sets
`android:screenOrientation="landscape"` on `MainActivity` directly (bare
workflow — app.json's `orientation` is ignored there once a native `android/`
dir exists, the same way `android.package` is).
**Android 16 ignores that attribute on large screens** (sw >= 600dp) at
targetSdk 36 (SDK 54's default), so the manifest also sets
`android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY` to opt back
in. That opt-out stops working at targetSdk 37.

There used to be a **runtime** lock too — `OrientationGate` in `App.tsx`
called `expo-screen-orientation`'s `lockAsync()` on mount, originally to give
`AccountSetup` a portrait exception on phones. That runtime call is gone now,
but it turned out to be a red herring for the crash below — removing it
entirely (a whole separate release, build 11) reproduced the identical crash
with the identical stack trace. It's still gone because it was dead weight
once orientation is static, not because it was ever the cause.

**The actual cause, confirmed via crash log:** every `<Modal>` in the app
crashed on iOS release builds on a real device — `-[UIViewController
__supportedInterfaceOrientations]` throws inside
`_prepareForMixedOrientationTransitionIfNecessaryInWindow` when
`RCTModalHostViewComponentView` presents itself, because a landscape-only
app's `Modal` has no orientation overlap with what it computes by default.
This is a known React Native bug (present since 0.79) that only reproduces
in release mode on a real device — never in dev mode, never on Android, and
not necessarily in the Simulator — which is exactly why it shipped and only
got caught by App Review. It's what actually got the iOS build rejected
(tapping the language dropdown on `AccountSetup` crashed the app — that's
just the first `Modal` a fresh install hits).

**Fix:** every `<Modal>` must pass `supportedOrientations={['landscape']}`.
There is no app-wide default for this prop — it's per-instance. If you add a
new `<Modal>` anywhere, it needs this prop or it *will* crash on a real iOS
device in a release build, silently passing local/dev testing.

The screen's **height is its shortest edge**, so `height >= 600` is the
tablet test throughout (HomeScreen uses it to show/hide the دسترسی سریع row).
**iPad does not honor the orientation lock by itself.** Since iPadOS 26,
iPad apps are resizable windows and `UISupportedInterfaceOrientations` is
ignored unless `UIRequiresFullScreen` is set — App Review ran build 18 in
**portrait** on an iPad Air (iPadOS 27). `app.json` now sets
`ios.requireFullScreen: true`, but Apple has deprecated that key, so
**portrait on iPad must still work**.

**Portrait fallback: `src/layout/PortraitFallback.tsx`** wraps the router in
`App.tsx`. In landscape it is a pure pass-through. In portrait it renders the
whole app in a centred landscape-shaped box — full width, as tall as the
device's own landscape aspect (820x1180 → 820x570), real size — with a
"rotate your device" hint in the band below. Rules that follow from it:

- **Import `useWindowDimensions` from `src/layout/PortraitFallback`, never
  from `react-native`.** Ours reports the box in portrait; react-native's
  reports the whole window and the screen will lay out for the wrong shape.
  Same for `Dimensions.get` — don't use it (nothing does today).
- **Never scale the box with a transform.** Drag/paint/brush code mixes
  `pageX`/`measureInWindow` (screen units) with layout units; they only agree
  when nothing is scaled.
- Inside the box, safe-area insets are zero, and the box itself lifts clear
  of the keyboard (screens' `KeyboardAvoidingView`s measure from their local
  frame and can't see it).
- The element tree is identical in both orientations, so rotating doesn't
  remount the current screen. Keep it that way.

(Before this existed, `AccountSetupScreen`'s portrait branch collapsed its
form to 0pt and App Review saw only the welcome banner — rejected as
"unresponsive after launch".)

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

**4. Android lies about the window, and scales text.** Found on a Xiaomi:
`useWindowDimensions` reported ~80dp less width than the app draws into (the
hidden nav bar/cutout strip), and the system text size was ~1.27x, which
React Native applies to every `<Text>`. So: `PortraitFallback` now serves
the root view's **measured** size in landscape too (it ignores height shrinks
at the same width — that's the keyboard under `adjustResize`), and
`MainApplication.kt`/`MainActivity.kt` pin `fontScale` to 1 via
`withFixedFontScale()`. iOS Dynamic Type is **not** pinned. That override
must contain **only** `fontScale` (a fresh `Configuration()`): copying the
whole current config also froze orientation/size at launch, and once R8 made
startup fast enough to beat the rotation, a tablet with a non-1 font scale
got portrait metrics forever and drew in the portrait fallback box.

**Release builds run R8** (`android.enableMinifyInReleaseBuilds=true` in
`android/gradle.properties`) — Play flags apps under 25% obfuscation.
Resource shrinking stays off: React Native looks up bundled images by name. `TopBar` now
renders at exactly `topBarHeight()` (its title stack used to measure taller).

**No system keyboard on kid-reachable or landscape-phone gates.** Android's
full-screen text-entry mode takes over a landscape phone when a `TextInput`
focuses. PIN entry (`PasswordGate`, `TimeUpScreen`) uses `NumericKeypad`
beside the copy. Every remaining `TextInput` has `disableFullscreenUI`.

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

**Prefer WAV for sound effects.** Every clip confirmed working on iPhone is
WAV. The splash "yay" was the only MP3 and the only sound reported silent on
iPhone; it's now `yay-kids.wav`, created when the splash mounts and only
`play()`ed when Neli lands. `alphabet-train-toots.mp3` is the one MP3 left.

Recorded clips live in `assets/audio/fa-test/`, indexed by
`assets/faTestAudio.generated.ts` (auto-generated, do not hand-edit).
Text→clip lookup is **exact match** on normalized text.

`App.tsx` calls `setAudioModeAsync({ playsInSilentMode: true })` once on
launch — added because nothing configured the iOS audio session before,
so it ran on `expo-audio`'s undocumented default, and there's no guarantee
playback survives the device's physical silent switch without this. If a
"the sound just doesn't play" report is otherwise unreproducible (no
crash, no error, everything looks right in the code), check whether it's
really this — the iOS silent switch is genuinely easy for the reporter not
to think to mention.

**`playFaAudio(key, { awaitFinish: true })` can hang forever if something
else plays audio before it naturally finishes.** The shared player is a
module-level singleton, and only one `awaitFinish` caller can be pending at
a time (`onSharedPlayerFinish`). `silenceOutputs()` — which every
`playFaAudio()` call runs first (default `interrupt: true`) — used to just
null that callback out instead of resolving it, so an earlier still-playing
`awaitFinish` call was silently orphaned rather than unblocked. Fixed by
resolving the pending callback before clearing it. This is what caused
MemoryGame's "match two pairs fast, the last voice goes silent and Next
never enables" bug: the second match's `speakLetter()` interrupted the
first's still-pending one, and the code that runs after
`await speakLetter(...)` — which sets `levelComplete`/`allComplete` — never
ran because the await never returned. Any `await playFaAudio(..., {
awaitFinish: true })` followed by state-setting logic is exposed to this if
something else can plausibly interrupt it first; don't reintroduce the
null-without-resolving version of `silenceOutputs()`.

**expo-audio has two native races that silence a clip at random.** Both hit
AlphabetTrain's example word (it starts 90ms after the letter name ends) and
Tracing's letter name after Next (`goToLetter` pauses, then the tracer plays
the new name at once).
(1) iOS: 100ms after any player finishes or pauses, expo-audio deactivates
the audio session if no player is playing at that instant — a clip still
loading is not "playing", so it plays silent. `playFaAudio()` on iOS waits
`IOS_SESSION_SETTLE_MS` after the last finish/pause (`noteAudioPlayerReleased()`
— call it when pausing any *other* player too, as the Train's whistle does)
so that check has already run. **Do not use `keepAudioSessionActive: true`
instead** — build 22 did, and on iPhone it made the Train and Tracing far
more often silent and stalled, not less (cause not understood).
(2) Android: every status update while the player is ended says
`didJustFinish: true`, so a stale one can resolve the *next* clip's
`awaitFinish` instantly. `getSharedPlayer()` ignores finish events inside
`STALE_FINISH_WINDOW_MS` of `play()`, on Android only.

## Account deletion (App Store 5.1.1(v))

Build 19 was rejected for having account creation without in-app deletion.
Settings -> **Delete account** (`src/components/DeleteAccountCard.tsx`)
deletes the Supabase auth user via the `delete_my_account()` RPC, then wipes
AsyncStorage (`deleteLocalAccount` in `AppContext`). The RPC needs a session,
so `verifyCode()` **no longer signs out** after verifying; older installs
without one re-verify with a fresh code (`shouldCreateUser: false`).
The SQL function in `supabase/delete_my_account.sql` must be installed in the
Supabase project or remote deletion fails.

## Known gaps

- Prompts with no recording, so currently silent: `به [animal] غذا بده`,
  `بیا دوباره غذا بدهیم` (FeedAnimals).
- `clothes/shorts.wav` contains no speech (peak amplitude ~244, i.e. room
  noise) — tapping shorts in DressUp says nothing. Needs re-recording.
- **Check every new recording for silent/noisy tails.** Nine shipped with
  5–135s of silence or junk after ~1s of speech (Cooking's dish names, which
  are awaited, stalled the game for up to two minutes; `pizza` played 49s of
  loud noise). They're trimmed now. `playFaAudio`'s `AWAIT_FINISH_MAX_MS`
  (12s) assumes no clip the app plays is longer than 5s.
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
