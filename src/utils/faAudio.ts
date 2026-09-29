import { Platform } from 'react-native';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { FA_TEST_AUDIO, FaTestAudioKey } from '../assets/faTestAudio.generated';

// A fresh native AudioPlayer used to be created (and the old one torn down)
// on every single call — see git history. On a real device that meant a kid
// tapping crayons fast enough could ask the native audio engine to spin up a
// new player before the last one's teardown had finished.
//
// Reusing one AudioPlayer via .replace() (below) does NOT avoid that churn —
// checked expo-audio's own source (AudioModule.web.js): replace() calls
// remove() internally, which pauses and tears down the underlying media
// resource and builds a new one, every single call. So the actual fix is
// pacing: MIN_GAP_MS enforces a floor between real replace()/play() calls so
// one call's native teardown/create cycle is never still in flight when the
// next one starts. Confirmed via web console that firing them back-to-back
// throws "AbortError: play() request was interrupted by a call to pause()" —
// a rejected native promise on this exact tap sequence is a plausible crash
// vector for the reported iOS crash. Stale calls made while waiting out the
// gap are dropped via the loadingToken check, so a burst of taps collapses
// to just the last color, same as the pre-existing interrupt semantics — the
// pacing doesn't add perceptible delay to a single tap.
const MIN_GAP_MS = 220;
let nextAllowedAt = 0;
let sharedPlayer: AudioPlayer | null = null;
let loadingToken = 0;
let onSharedPlayerFinish: (() => void) | null = null;
// When the current clip's play() was issued — see STALE_FINISH_WINDOW_MS.
let sharedPlayStartedAt = 0;
// When a player last finished or was paused — see IOS_SESSION_SETTLE_MS.
let lastReleaseAt = 0;

// Android only. Android's expo-audio reports didJustFinish: true on EVERY
// status update sent while the player sits in STATE_ENDED (the isPlaying,
// playbackState and isLoading listeners each send one), not once. One of
// those computed before replace() but delivered to JS after the next clip
// registered its awaitFinish callback resolves that NEW clip instantly (seen
// at ~12ms — see FarsiTracingPage's comment before آفرین). Stale events
// arrive within a few ms; the shortest recorded clip is 1.0s (0.77s at the
// Train's 1.3x), so no real finish can land inside this window. iOS sends
// exactly one finish event per clip, so it is left untouched there.
const STALE_FINISH_WINDOW_MS = 250;

// iOS only. After any player finishes or is paused, expo-audio waits 100ms
// and then deactivates the audio session if no player is *playing* at that
// instant. A clip started inside that window is still loading, not playing,
// so the session is pulled out from under it and it plays silent — the
// Train's example word (90ms after the name) and Tracing's letter name after
// Next both started inside it. Waiting until the check has already run means
// play() re-activates the session cleanly afterwards.
//
// Do NOT "fix" this with createAudioPlayer's keepAudioSessionActive option
// instead: build 22 did, and on iPhone it made clips far more often silent
// (with the Train stalling on its timeouts), not less.
const IOS_SESSION_SETTLE_MS = 250;

// Upper bound on any awaitFinish wait. The longest clip in fa-test that the
// app plays is 5.0s (memory/info, ingredients/info-cook) at rate >= 1.0.
// Keep this above that if longer clips are ever added — and check new clips
// for long silent tails (several shipped with 20-135s of silence/noise).
const AWAIT_FINISH_MAX_MS = 12000;

/** Call after pausing/stopping any other expo-audio player (see IOS_SESSION_SETTLE_MS). */
export function noteAudioPlayerReleased() {
  lastReleaseAt = Date.now();
}

function getSharedPlayer(): AudioPlayer | null {
  if (sharedPlayer) return sharedPlayer;
  try {
    const player = createAudioPlayer(null);
    player.addListener('playbackStatusUpdate', status => {
      if (status.isLoaded && status.didJustFinish) {
        if (Platform.OS === 'android' && Date.now() - sharedPlayStartedAt < STALE_FINISH_WINDOW_MS) return;
        noteAudioPlayerReleased();
        const cb = onSharedPlayerFinish;
        onSharedPlayerFinish = null;
        cb?.();
      }
    });
    sharedPlayer = player;
  } catch {
    sharedPlayer = null;
  }
  return sharedPlayer;
}

// Shared by stopFaAudio() and playFaAudio()'s own interrupt step. Pausing the
// shared player is only correct when nothing is about to reuse it right
// after — playFaAudio() is about to call replace()+play() on this exact
// player, and pause() while a play() on the SAME player is still resolving
// throws "AbortError: play() request was interrupted by a call to pause()"
// (confirmed via console on web; on iOS a rejected native promise on this
// player is a plausible crash vector, since this is the very tap sequence
// that reportedly crashes the app). replace() already supersedes whatever
// the player is doing, so playFaAudio() skips the pause entirely.
async function silenceOutputs(pausePlayer: boolean) {
  // Recorded clips and TTS are two independent output paths. Whichever one
  // starts has to silence the other, or a tap that fires a recorded word and
  // a spoken sentence plays both at once, on top of each other.
  try {
    Speech.stop();
  } catch {
    // ignore
  }
  loadingToken += 1;
  // A pending awaitFinish caller must be unblocked, not silently dropped —
  // clearing this without invoking it leaves that caller's promise orphaned
  // forever whenever a later playFaAudio() call interrupts it before its
  // clip naturally finishes (e.g. MemoryGame matching two pairs fast enough
  // that the second match's speakLetter() interrupts the first's still-
  // pending one — the first's await never resolves, so code after it, like
  // marking the level complete, never runs either).
  const pendingFinish = onSharedPlayerFinish;
  onSharedPlayerFinish = null;
  pendingFinish?.();
  if (pausePlayer && sharedPlayer) {
    noteAudioPlayerReleased();
    try {
      sharedPlayer.pause();
    } catch {
      // ignore
    }
  }
}

export async function stopFaAudio() {
  await silenceOutputs(true);
}

type PlayFaAudioOptions = {
  interrupt?: boolean;
  awaitFinish?: boolean;
  volume?: number;
  /** Playback rate (1.0 = normal speed). Pitch is auto-corrected by expo-audio unless disabled below. */
  playbackRate?: number;
  /** Set to false to let the pitch rise/fall with playbackRate instead of correcting it. Defaults to corrected. */
  shouldCorrectPitch?: boolean;
};

export async function playFaAudio(key: FaTestAudioKey, options?: PlayFaAudioOptions) {
  if (options?.interrupt !== false) {
    // Not stopFaAudio() — see silenceOutputs()'s comment. This player is
    // about to be reloaded via replace() below, not left paused.
    await silenceOutputs(false);
  }
  const token = ++loadingToken;
  const source = FA_TEST_AUDIO[key];
  if (!source) return false;

  // Wait out MIN_GAP_MS since the last real replace()/play() call — see the
  // comment above MIN_GAP_MS for why. A newer call bumps loadingToken while
  // this one waits, so if this call gets superseded before its turn, it just
  // drops out here instead of touching the player. On iOS, also wait out
  // IOS_SESSION_SETTLE_MS since the last finish/pause.
  const readyAt = Platform.OS === 'ios' ? Math.max(nextAllowedAt, lastReleaseAt + IOS_SESSION_SETTLE_MS) : nextAllowedAt;
  const wait = readyAt - Date.now();
  if (wait > 0) {
    await new Promise(resolve => setTimeout(resolve, wait));
    if (token !== loadingToken) return false;
  }
  nextAllowedAt = Date.now() + MIN_GAP_MS;

  const player = getSharedPlayer();
  if (!player) return false;

  try {
    player.replace(source);
    if (options?.volume != null) player.volume = options.volume;
    // The shared player is a module-level singleton reused by every screen,
    // and setPlaybackRate() is a property of the player, not the source —
    // replace() swaps the audio content but does not reset it. Without this
    // else branch, a screen that ever requests a non-default rate (e.g.
    // AlphabetTrainScreen's 1.3x) leaves every later playFaAudio() call on
    // any other screen sped up too, for the rest of the app's lifetime.
    if (options?.playbackRate != null) {
      player.setPlaybackRate(options.playbackRate, options.shouldCorrectPitch === false ? 'low' : 'high');
    } else {
      player.setPlaybackRate(1.0, 'high');
    }
  } catch {
    return false;
  }

  if (token !== loadingToken) return false;

  try {
    // play() is typed void, but expo-audio's web player wraps
    // HTMLMediaElement.play(), which returns a Promise that rejects
    // (AbortError) if something else touches the player before it settles.
    // Promise.resolve() is a no-op on a real void return and safely swallows
    // that rejection on web when it isn't.
    sharedPlayStartedAt = Date.now();
    Promise.resolve(player.play() as unknown).catch(() => {});
  } catch {
    return false;
  }

  if (options?.awaitFinish) {
    return await new Promise<boolean>(resolve => {
      // Safety net: if the native "finished" event never arrives (a dropped
      // callback, an iOS audio-session hiccup), resolve anyway so callers
      // that set state after the await — Tracing's celebration, Cooking's
      // steps, Conversation's next question, Memory's level-complete — can
      // never freeze. The longest clip played is 5s (see AWAIT_FINISH_MAX_MS).
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (onSharedPlayerFinish === finish) onSharedPlayerFinish = null;
        resolve(true);
      };
      const timer = setTimeout(finish, AWAIT_FINISH_MAX_MS);
      onSharedPlayerFinish = finish;
    });
  }
  onSharedPlayerFinish = null;
  return true;
}

export async function playFaAudioSequence(keys: FaTestAudioKey[], gapMs = 150) {
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i]!;
    await playFaAudio(key, { awaitFinish: true, interrupt: i === 0 });
    if (i < keys.length - 1) {
      await new Promise(resolve => setTimeout(resolve, gapMs));
    }
  }
  return true;
}

export function makeAlphabetAudioKey(kind: 'name' | 'example' | 'trace', letterId: string) {
  return `alphabet/${kind}/${letterId}` as FaTestAudioKey;
}

// Some screens (VideoShowsScreen's "Alphabet Show", AlphabetTrainScreen's
// "Alphabet Train") use letter ids that differ from the ids the recorded
// voice clips (and farsiLetters.ts / the Tracing screens) use — translate
// before building an audio key so every letter finds its recorded clip
// instead of silently falling back to bare-glyph TTS.
export const ALPHABET_AUDIO_ID_OVERRIDE: Partial<Record<string, string>> = {
  'he-jimi': 'haa', // ح
  ta: 'taa', // ط
  za: 'zaa', // ظ
  noon: 'nun', // ن
  he: 'heh', // ه
};

// Some recorded alphabet clips used to be broken (cut off mid-word, silent,
// byte-identical duplicates of a different letter's clip, or minutes of
// unrelated/garbled audio) and were listed here so playback would skip them
// and speak the word with on-device TTS instead.
//
// All 11 were re-recorded 2026-09-02/03 (via scripts/generate_gemini_voice_pack.py)
// and verified via waveform inspection (reasonable duration, healthy
// non-silent RMS, matching their siblings). The set is intentionally kept
// (rather than deleted) as the mechanism to quarantine any future bad
// recording the same way — just add its FaTestAudioKey back below.
const BROKEN_ALPHABET_AUDIO = new Set<FaTestAudioKey>([]);

// taa/zaa/ye/zad/jim/zhe all now have working recorded "name" clips (see
// BROKEN_ALPHABET_AUDIO above), so this text is only a safety net for the
// rare case the recorded clip fails to play at runtime — the bare glyph
// alone ('ط', 'ظ', 'ی', 'ض', 'ج', 'ژ') doesn't always voice reliably via
// on-device TTS, so each entry spells out the full letter name instead.
export const FALLBACK_LETTER_NAME_FA: Partial<Record<string, string>> = {
  taa: 'طا',
  zaa: 'ظا',
  ye: 'یا',
  zad: 'ضاد',
  jim: 'جیم',
  zhe: 'ژه',
};

async function speakFaRawAwait(text: string, options?: { interrupt?: boolean; rate?: number; pitch?: number }) {
  if (!text) return false;
  if (options?.interrupt !== false) Speech.stop();
  return new Promise<boolean>(resolve => {
    // Same safety net as playFaAudio's awaitFinish: a TTS engine that never
    // calls back (no voice installed, an interrupted utterance) must not
    // freeze the caller.
    const timer = setTimeout(() => resolve(false), AWAIT_FINISH_MAX_MS);
    const done = (ok: boolean) => { clearTimeout(timer); resolve(ok); };
    Speech.speak(text, {
      language: 'fa-IR',
      rate: options?.rate ?? 0.72,
      pitch: options?.pitch ?? 1.14,
      onDone: () => done(true),
      onError: () => done(false),
      onStopped: () => done(false),
    });
  });
}

/**
 * Like playFaAudio, but for a key known to be broken (BROKEN_ALPHABET_AUDIO
 * above) or with no recorded clip at all, falls back to speaking
 * `fallbackText` with on-device TTS instead of playing bad/no audio. Uses
 * raw TTS (not speakWithGeneratedVoice) so it can't resolve back to the
 * same broken recorded clip via the text-to-key dictionary.
 */
export async function playFaAudioOrSpeak(
  key: FaTestAudioKey,
  fallbackText: string,
  options?: PlayFaAudioOptions & { rate?: number; pitch?: number },
) {
  if (!BROKEN_ALPHABET_AUDIO.has(key)) {
    const played = await playFaAudio(key, options);
    if (played) return true;
  }
  return speakFaRawAwait(fallbackText, { interrupt: options?.interrupt, rate: options?.rate, pitch: options?.pitch });
}

function normalizeFaVoiceText(text: string) {
  return text
    .trim()
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u0640\s!?؟،,.:;\-\u200c]/g, '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک');
}

const FA_VOICE_TEXT_TO_KEY: Record<string, FaTestAudioKey> = {
  [normalizeFaVoiceText('آفرین')]: 'feedback/afarin',
  [normalizeFaVoiceText('افرین')]: 'feedback/afarin',
  [normalizeFaVoiceText('آفرین!')]: 'feedback/afarin',
  [normalizeFaVoiceText('پاک کن')]: 'feedback/clear',
  [normalizeFaVoiceText('\u06cc\u06a9')]: 'counting/number/1',
  [normalizeFaVoiceText('\u0633\u0647')]: 'counting/number/3',
  [normalizeFaVoiceText('\u0686\u0647\u0627\u0631')]: 'counting/number/4',
  [normalizeFaVoiceText('\u067e\u0646\u062c')]: 'counting/number/5',
  [normalizeFaVoiceText('\u0647\u0641\u062a')]: 'counting/number/7',
  [normalizeFaVoiceText('\u0647\u0634\u062a')]: 'counting/number/8',
  [normalizeFaVoiceText('\u0646\u0647')]: 'counting/number/9',
  [normalizeFaVoiceText('از نقطه سبز شروع کن')]: 'guidance/start-here',
  [normalizeFaVoiceText('شروع کن')]: 'guidance/start-here',
  [normalizeFaVoiceText('مسیر را دنبال کن')]: 'guidance/follow-path',
  [normalizeFaVoiceText('دنبال کن')]: 'guidance/follow-path',
  [normalizeFaVoiceText('الف')]: 'alphabet/name/alef',
  [normalizeFaVoiceText('آب')]: 'alphabet/example/alef',
  [normalizeFaVoiceText('ب')]: 'alphabet/name/be',
  [normalizeFaVoiceText('برگ')]: 'alphabet/example/be',
  [normalizeFaVoiceText('پ')]: 'alphabet/name/pe',
  [normalizeFaVoiceText('پرتقال')]: 'alphabet/example/pe',
  [normalizeFaVoiceText('ت')]: 'alphabet/name/te',
  [normalizeFaVoiceText('توت فرنگی')]: 'alphabet/example/te',
  [normalizeFaVoiceText('ث')]: 'alphabet/name/se',
  [normalizeFaVoiceText('ثانیه')]: 'alphabet/example/se',
  [normalizeFaVoiceText('ج')]: 'alphabet/name/jim',
  [normalizeFaVoiceText('جوجه')]: 'alphabet/example/jim',
  [normalizeFaVoiceText('چ')]: 'alphabet/name/che',
  [normalizeFaVoiceText('چتر')]: 'alphabet/example/che',
  [normalizeFaVoiceText('ح')]: 'alphabet/name/haa',
  [normalizeFaVoiceText('حلوا')]: 'alphabet/example/haa',
};

export function resolveFaVoiceKey(text: string): FaTestAudioKey | null {
  const key = FA_VOICE_TEXT_TO_KEY[normalizeFaVoiceText(text)];
  return key ?? null;
}

export async function tryPlayGeneratedFaVoice(text: string, options?: { interrupt?: boolean; awaitFinish?: boolean }) {
  const key = resolveFaVoiceKey(text);
  if (!key) return false;
  if (BROKEN_ALPHABET_AUDIO.has(key)) {
    // The text->key lookup above (FA_VOICE_TEXT_TO_KEY) doesn't know a clip
    // is broken — it would otherwise happily hand back e.g. "alphabet/name/zad"
    // and playFaAudio() would play the garbled/cut-off recording just because
    // the file exists. Speak a TTS-friendly fallback instead, same as
    // playFaAudioOrSpeak does for other call sites.
    const m = /^alphabet\/name\/(.+)$/.exec(key);
    const fallbackText = (m && FALLBACK_LETTER_NAME_FA[m[1]!]) || text;
    return await speakFaRawAwait(fallbackText, { interrupt: options?.interrupt });
  }
  return await playFaAudio(key, { interrupt: options?.interrupt, awaitFinish: options?.awaitFinish ?? true });
}

export async function speakWithGeneratedVoice(
  text: string,
  language: string,
  options?: { interrupt?: boolean; awaitFinish?: boolean; rate?: number; pitch?: number; onDone?: () => void; onError?: () => void; },
) {
  const lang = (language ?? '').toLowerCase();
  const canUseGenerated = lang.startsWith('fa') || lang.startsWith('ar');
  if (canUseGenerated) {
    const played = await tryPlayGeneratedFaVoice(text, { interrupt: options?.interrupt, awaitFinish: options?.awaitFinish ?? true });
    if (played) {
      options?.onDone?.();
      return true;
    }
  }

  if (options?.interrupt !== false) {
    // tryPlayGeneratedFaVoice() above only stops the recorded-clip path when
    // it actually has a clip to play (e.g. a resolvable fa/ar key). For text
    // with no recorded clip — most painting crayon colors — it returns early
    // and a clip started by a *previous* call (e.g. the last crayon tapped)
    // keeps playing underneath the TTS started below. stopFaAudio() silences
    // both paths, same as useSpeech.ts's stop(); Speech.stop() alone does not.
    await stopFaAudio();
  }
  Speech.speak(text, {
    language,
    rate: options?.rate ?? 0.8,
    pitch: options?.pitch ?? 1.18,
    onDone: options?.onDone,
    onError: options?.onError ?? options?.onDone,
  });
  return false;
}

export const FA_AUDIO_KEYS = {
  feedback: {
    tryAgain: 'feedback/try-again' as const,
    afarin: 'feedback/afarin' as const,
    clear: 'feedback/clear' as const,
  },
  guidance: {
    startHere: 'guidance/start-here' as const,
    followPath: 'guidance/follow-path' as const,
  },
  toothbrush: {
    cleanNow: 'toothbrush/clean-now' as const,
    brushLilaTeeth: 'toothbrush/brush-lila-teeth' as const,
    brushTeeth: 'toothbrush/brush-teeth' as const,
  },
  feedAnimals: {
    info: 'feed-animals/food/info' as const,
  },
  counting: {
    info: 'counting/number/info' as const,
  },
  solarSystem: {
    mercury: 'solar-system/mercury' as const,
    venus: 'solar-system/venus' as const,
    earth: 'solar-system/earth' as const,
    moon: 'solar-system/moon' as const,
    mars: 'solar-system/mars' as const,
    saturn: 'solar-system/saturn' as const,
    uranus: 'solar-system/uranus' as const,
    neptune: 'solar-system/neptune' as const,
  },
  clothes: {
    backpack: 'clothes/backpack' as const,
    bag: 'clothes/bag' as const,
    boots: 'clothes/boots' as const,
    coat: 'clothes/coat' as const,
    glasses: 'clothes/glasses' as const,
    hat: 'clothes/hat' as const,
    scarf: 'clothes/scarf' as const,
    shirt: 'clothes/shirt' as const,
    shoes: 'clothes/shoes' as const,
    shorts: 'clothes/shorts' as const,
    tshirt: 'clothes/tshirt' as const,
  },
  painting: {
    red: 'painting/color/red' as const,
    amber: 'painting/color/amber' as const,
    yellow: 'painting/color/yellow' as const,
    lime: 'painting/color/lime' as const,
    teal: 'painting/color/teal' as const,
  },
} as const;

/** Maps a planet id (from solarSystemPuzzle.ts) to its audio key. Returns null if no audio exists. */
export function getSolarSystemAudioKey(planetId: string): FaTestAudioKey | null {
  const key = `solar-system/${planetId}` as FaTestAudioKey;
  return key in FA_TEST_AUDIO ? key : null;
}

/** Maps a clothing slot name to its audio key. Returns null if no audio exists. */
const SLOT_TO_CLOTHES_KEY: Record<string, FaTestAudioKey> = {
  // shirt+pants combo → tshirt voice
  shirt: 'clothes/tshirt',
  pants: 'clothes/tshirt',
  tshirt: 'clothes/tshirt',
  shorts: 'clothes/shorts',
  // all dress variants → dress voice
  dress: 'clothes/dress',
  dressPink: 'clothes/dress',
  dressBlue: 'clothes/dress',
  dressGreen: 'clothes/dress',
  dressOrange: 'clothes/dress',
  dressRed: 'clothes/dress',
  dressLong: 'clothes/dress',
  // hats
  hat: 'clothes/hat',
  hatPink: 'clothes/hat',
  hatBlue: 'clothes/hat',
  sunhatCream: 'clothes/hat',
  // sunglasses
  sunglasses: 'clothes/glasses',
  sunglassesBlack: 'clothes/glasses',
  sunglassesPink: 'clothes/glasses',
  sunglassesGold: 'clothes/glasses',
  // other
  scarf: 'clothes/scarf',
  coat: 'clothes/coat',
  boots: 'clothes/boots',
  shoes: 'clothes/shoes',
  shoesGold: 'clothes/shoes',
  shoesWhite: 'clothes/shoes',
  shoesPink: 'clothes/shoes',
  sneakers: 'clothes/shoes',
  bag: 'clothes/bag',
  backpack: 'clothes/backpack',
};
export function getClothesAudioKey(slot: string): FaTestAudioKey | null {
  return SLOT_TO_CLOTHES_KEY[slot] ?? null;
}

/** Maps a painting color label (lowercase) to its audio key. Returns null if no audio exists. */
export function getPaintingColorAudioKey(label: string): FaTestAudioKey | null {
  const key = `painting/color/${label.toLowerCase()}` as FaTestAudioKey;
  return key in FA_TEST_AUDIO ? key : null;
}

/** Maps an ingredient id (from CookingGame) to its audio key. Returns null if no audio exists. */
export function getIngredientAudioKey(ingredientId: string): FaTestAudioKey | null {
  const key = `ingredients/${ingredientId}` as FaTestAudioKey;
  return key in FA_TEST_AUDIO ? key : null;
}

/** Maps a counting number (1-10) to its audio key. Returns null if no audio exists. */
export function getCountingNumberAudioKey(n: number): FaTestAudioKey | null {
  const key = `counting/number/${n}` as FaTestAudioKey;
  return key in FA_TEST_AUDIO ? key : null;
}
