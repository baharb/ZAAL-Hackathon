// Listen & Find — scene version. Each round opens in a random room (kitchen
// or bedroom) with three objects that belong there, scattered at new spots
// every time, the big buddy central behind them. Tapping the buddy replays
// the prompt (audio-only listening practice — no prompt text anywhere).
// A tap bounces the object; the right one pops and flies to the buddy.
// Stuck for 7 quiet seconds? A hand points at the right object. Five
// rounds, then a paper recap note with a camera button that saves to
// روزهای من.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useWindowDimensions } from '../../layout/PortraitFallback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dir, ff } from '../../theme/fonts';
import { FA_TEST_AUDIO, FaTestAudioKey } from '../../assets/faTestAudio.generated';
import { playFaAudio, stopFaAudio } from '../../utils/faAudio';
import { roomBackgroundPickers, neliWorldAssets } from '../../assets/neliWorldAssets';
import { bgCover, surfTop, surfX } from '../../utils/bgSurface';
import { PHOTO_FARSI_WORDS, PhotoFarsiWord } from '../../data/photoFarsiWords';
import { loadBuddy } from '../../quest/buddyStore';
import { saveMyDay } from '../../quest/myDaysStore';
import { IdleHand, useIdleHint } from '../../quest/IdleHand';
import PopperCelebration from '../../components/PopperCelebration';
import {
  BuddyGuide,
  BuddyMood,
  NavyClose,
  PLAY_INK,
  SoftShadow,
  SquareButton,
  WORD_ART,
  WordArt,
} from '../../ui/playKit';

// Everything scales from a 400pt-tall reference (a landscape phone is
// 360–440pt tall). k multiplies every size AND offset — see CLAUDE.md.
const REFERENCE_H = 400;
const ROUNDS = 5;

const VOICED_WORDS = PHOTO_FARSI_WORDS.filter(w => w.audioKey != null && w.audioKey in FA_TEST_AUDIO);

/** Where each round happens: the background and the words that live in
 * it, so every object always belongs to its scene. The kitchen serves
 * food and drink words only — never animals. A new scene (and new
 * spots) every round keeps the game fresh. */
const SCENES = [
  {
    bg: 'kitchenCheerful',
    words: [
      'apple', 'orange', 'bread', 'water',
      'watermelon', 'pomegranate', 'strawberry', 'cherries', 'grapes',
      'pear', 'peach', 'apricot', 'kiwi', 'fig', 'mango',
    ],
  },
  { bg: 'bedroom', words: ['book', 'backpack', 'hat', 'shoe'] },
] as const;
type SceneBg = (typeof SCENES)[number]['bg'];

const BY_ID: Record<string, PhotoFarsiWord> = Object.fromEntries(VOICED_WORDS.map(w => [w.id, w]));

// Named standing spots as fractions OF THE ARTWORK (fx from the left,
// fb above the bottom), bottom-anchored to a real drawn surface: bedroom
// bed + rug. Artwork fractions survive cover() cropping, so objects sit
// on furniture at EVERY aspect ratio. Three random slots per round,
// across the room from the buddy (left).
// Kitchen slots are generated, not fixed: only the FLAT counter top
// (never the sink/faucet, utensil cup, pot or stove) plus the floor.
// The background Image is picked with a fixed (800, 400), which always
// selects the phone crop (2796x1290) on every screen — so these lines are
// measured on the phone art: counter top fb 0.27, floor top fb 0.09.
const KITCHEN_FB = 0.27;
const KITCHEN_FLOOR_FB = 0.06;
const KITCHEN_COUNTER_FXS = [0.29, 0.315, 0.34, 0.46, 0.48, 0.575, 0.695];
const KITCHEN_FLOOR_FXS = [0.22, 0.45, 0.65];
const KITCHEN_DECOR = [
  { fx0: 0.355, fx1: 0.445, fb0: 0.27, fb1: 0.49 },
  { fx0: 0.498, fx1: 0.557, fb0: 0.27, fb1: 0.49 },
  { fx0: 0.596, fx1: 0.674, fb0: 0.27, fb1: 0.44 },
];
const SCENE_SLOTS: Record<SceneBg, { fx: number; fb: number }[]> = {
  kitchenCheerful: [],
  // Dress-up bedroom (the variant the picker actually serves): open
  // wardrobe 0.05-0.45, window 0.51-0.72, shelf 0.79-0.94, bed
  // 0.50-0.96 with the blanket top at fb 0.44, rug 0.49-0.84 top fb
  // 0.22. Objects only where furniture is, at every aspect.
  bedroom: [
    { fx: 0.55, fb: 0.44 },
    { fx: 0.66, fb: 0.44 },
    { fx: 0.77, fb: 0.44 },
    { fx: 0.58, fb: 0.22 },
    { fx: 0.72, fb: 0.22 },
  ],
};

// The catalog art has different amounts of empty padding (the shoes are
// mostly padding, the orange fills its frame), so equal boxes look
// unequal. These zooms were matched by eye against the real files so all
// three choices read as the same visual size.
// Equalized by motif AREA (measured from the real files): flat art like
// the hat would otherwise read huge next to tall art like the book.
const ART_ZOOM: Record<string, number> = {
  apple: 0.88,
  orange: 0.9,
  bread: 1.0,
  water: 1.35,
  book: 1.0,
  backpack: 1.0,
  hat: 1.56,
  shoe: 1.56,
  watermelon: 0.9,
  pomegranate: 0.9,
  strawberry: 0.9,
  cherries: 0.9,
  grapes: 0.9,
  pear: 0.9,
  peach: 0.9,
  apricot: 0.9,
  kiwi: 0.9,
  fig: 0.9,
  mango: 0.9,
};

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function tap() {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // haptics are best-effort (web has none)
  }
}



/** Tap the buddy to hear again. The subtle pulse ring shows ONLY while
 * the word is playing — never a permanent stain behind her. */
function BuddyReplay({ size, mood, onReplay, playing }: { size: number; mood: BuddyMood; onReplay: () => void; playing: boolean }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!playing) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.07, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, playing]);
  return (
    <TouchableOpacity onPress={onReplay} activeOpacity={0.9} accessibilityRole="button">
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {playing ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: size * 1.02,
              height: size * 1.02,
              borderRadius: (size * 1.02) / 2,
              backgroundColor: 'rgba(255,184,0,0.35)',
              transform: [{ scale: pulse }],
            }}
          />
        ) : null}
        <BuddyGuide mood={mood} size={size} />
      </View>
    </TouchableOpacity>
  );
}

type CardAnims = { shake: Animated.Value; pop: Animated.Value; rise: Animated.Value; fade: Animated.Value };

export default function ListenFindGame() {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const k = H / REFERENCE_H;
  const [round, setRound] = useState(0);
  const lastWordId = useRef<string | null>(null);
  const lastSceneBg = useRef<SceneBg | null>(null);
  const freshCards = (): {
    answer: PhotoFarsiWord;
    choices: PhotoFarsiWord[];
    scene: SceneBg;
    spots: { left: number; top: number }[];
  } => {
    // A new scene every round (never the same twice in a row).
    let scenes = SCENES.filter(s => s.bg !== lastSceneBg.current);
    if (scenes.length === 0) scenes = [...SCENES];
    const scene = scenes[Math.floor(Math.random() * scenes.length)]!;
    lastSceneBg.current = scene.bg;
    // Answer + distractors all belong to this scene.
    const words = scene.words.map(id => BY_ID[id]!).filter(Boolean);
    let pool = words.filter(w => w.id !== lastWordId.current);
    if (pool.length === 0) pool = words;
    const answer = shuffle(pool)[0]!;
    lastWordId.current = answer.id;
    const choices = shuffle([...shuffle(words.filter(w => w.id !== answer.id)).slice(0, 2), answer]);
    // Three random standing spots, bottom-anchored to the drawn surface
    // through the artwork fractions (same furniture on phone + tablet).
    // Cover crops the artwork sides on narrow screens, so slots outside the
    // visible band are dropped for the round; positions clamp on-screen as
    // a safety net (wide counter/bed, so clamped spots stay on furniture).
    const objS = H * 0.22;
    // The background Image is picked with a fixed (800, 400) — always the
    // phone art — so the math must use the phone fractions too.
    const cover = bgCover(scene.bg, W, H, W, H * 1.25, 'phone');
    const sizes = choices.map(c => objS * (ART_ZOOM[c.id] ?? 1));
    const maxSize = Math.max(...sizes);
    // Kitchen candidates: flat counter segments plus floor spots. Counter
    // slots that fall outside the visible band at this aspect are dropped;
    // floor is always there. Bedroom uses its fixed furniture slots.
    type Slot = { fx: number; fb: number; counter?: boolean };
    const rawPool: Slot[] =
      scene.bg === 'kitchenCheerful'
        ? [
            ...KITCHEN_COUNTER_FXS.map(fx => ({ fx, fb: KITCHEN_FB, counter: true })),
            ...KITCHEN_FLOOR_FXS.map(fx => ({ fx, fb: KITCHEN_FLOOR_FB })),
          ]
        : SCENE_SLOTS[scene.bg];
    const inBand = rawPool.filter(slot => {
      const cx = surfX(slot.fx, cover.imgW, cover.s, cover.offX);
      return cx > maxSize * 0.5 + 8 && cx < W - maxSize * 0.5 - 8;
    });
    const slotPool = inBand.length >= 3 ? inBand : rawPool;
    // Kitchen decor exclusion, in artwork fractions (aspect-independent):
    // a counter object must not touch the sink, cup or pot rects.
    const artRect = (slot: { fx: number; fb: number }, size: number) => {
      const wF = size / (cover.imgW * cover.s);
      const hF = size / (cover.imgH * cover.s);
      return { fx0: slot.fx - wF / 2, fx1: slot.fx + wF / 2, fb0: slot.fb, fb1: slot.fb + hF };
    };
    const decorHit = (r: { fx0: number; fx1: number; fb0: number; fb1: number }) =>
      KITCHEN_DECOR.some(
        d =>
          r.fx0 < d.fx1 - 0.005 && r.fx1 > d.fx0 + 0.005 && r.fb0 < d.fb1 - 0.005 && r.fb1 > d.fb0 + 0.005,
      );
    const isKitchenCounter = (slot: Slot) => scene.bg === 'kitchenCheerful' && slot.counter === true;
    const rectOf = (slot: { fx: number; fb: number }, size: number) => {
      const left = surfX(slot.fx, cover.imgW, cover.s, cover.offX) - size / 2;
      const top = surfTop(slot.fb, cover.imgH, cover.s, H, cover.offYBelow) - size;
      return { left, top, right: left + size, bottom: top + size };
    };
    const overlaps = (a: { left: number; top: number; right: number; bottom: number }, b: { left: number; top: number; right: number; bottom: number }) =>
      a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    // Debug-checked deal: prefer a one-object-width gap between rects;
    // any true overlap always repicks. First pass wants the full gap,
    // second pass accepts strict non-overlap, then the first shuffle wins.
    const clearBy = (rects: { left: number; top: number; right: number; bottom: number }[], pad: number) =>
      !rects.some((r, i) =>
        rects
          .slice(i + 1)
          .some(o => r.left - pad < o.right && o.left - pad < r.right && r.top - pad < o.bottom && o.top - pad < r.bottom),
      );
    // The buddy stands bottom-left: no object may sit on her either.
    const buddyH = H * 0.52;
    const buddyRect = { left: W * 0.03, top: H - buddyH, right: W * 0.03 + buddyH, bottom: H };
    const TOL = 4;
    const buddyHit = (r: { left: number; top: number; right: number; bottom: number }) =>
      r.left < buddyRect.right - TOL && r.right > buddyRect.left + TOL &&
      r.top < buddyRect.bottom - TOL && r.bottom > buddyRect.top + TOL;
    // Counter-first kitchen: trios purely on the flat counter win; floor
    // spots only fill in when the decor leaves no room for big objects.
    const counterOnly = slotPool.filter(isKitchenCounter);
    const tiers: { fx: number; fb: number }[][] =
      scene.bg === 'kitchenCheerful' && counterOnly.length >= 3 ? [counterOnly, slotPool] : [slotPool];
    let slots = shuffle([...tiers[tiers.length - 1]!]).slice(0, 3);
    let settled = false;
    for (const tier of tiers) {
      for (const wantGap of [true, false]) {
        for (let t = 0; t < 12 && !settled; t++) {
          const cand = shuffle([...tier]).slice(0, 3);
          const rects = cand.map((s, i) => rectOf(s, sizes[i]!));
          const pad = wantGap ? Math.min(...sizes) : 0;
          const decorClear = !cand.some((s, i) => isKitchenCounter(s) && decorHit(artRect(s, sizes[i]!)));
          if (t === 0 && tier === tiers[0]! && wantGap) slots = cand;
          if (decorClear && clearBy(rects, pad) && !rects.some(buddyHit)) {
            slots = cand;
            settled = true;
          }
        }
        if (settled) break;
      }
      if (settled) break;
    }
    if (__DEV__) {
      const rects = slots.map((s, i) => rectOf(s, sizes[i]!));
      slots.forEach((s, i) => {
        if (isKitchenCounter(s) && decorHit(artRect(s, sizes[i]!)))
          console.warn(`[ListenFind] slot on kitchen decor: #${i}`);
      });
      rects.forEach((r, i) => {
        rects.slice(i + 1).forEach((o, j) => {
          if (overlaps(r, o)) console.warn(`[ListenFind] overlapping slots: ${scene.bg} #${i} vs #${i + j + 1}`);
        });
        if (buddyHit(r)) console.warn(`[ListenFind] slot on buddy: ${scene.bg} #${i}`);
      });
    }
    const spots = choices.map((c, i) => {
      const slot = slots[i]!;
      const size = sizes[i]!;
      return {
        left: Math.min(Math.max(surfX(slot.fx, cover.imgW, cover.s, cover.offX) - size / 2, 8), W - size - 8),
        top: surfTop(slot.fb, cover.imgH, cover.s, H, cover.offYBelow) - size,
      };
    });
    return { answer, choices, scene: scene.bg, spots };
  };
  const [cards, setCards] = useState(freshCards);
  const [prompting, setPrompting] = useState(true);
  const [stars, setStars] = useState(0);
  const [done, setDone] = useState(false);
  const [found, setFound] = useState<PhotoFarsiWord[]>([]);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [mood, setMood] = useState<BuddyMood>('idle');
  const [saved, setSaved] = useState(false);
  // Every tap restarts the idle wait: the hand only appears when she is
  // truly stuck, then points at the right object.
  const [taps, setTaps] = useState(0);
  const showHand = useIdleHint(!done && !prompting, 7000, round * 1000 + taps);
  const alive = useRef(true);
  const anims = useRef<CardAnims[]>(
    [0, 1, 2].map(() => ({
      shake: new Animated.Value(0),
      pop: new Animated.Value(1),
      rise: new Animated.Value(0),
      fade: new Animated.Value(1),
    })),
  ).current;

  // Recorded clips and TTS must never overlap — silence both on exit.
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      void stopFaAudio();
    };
  }, []);

  const resetAnims = () => {
    anims.forEach(a => {
      a.shake.setValue(0);
      a.pop.setValue(1);
      a.rise.setValue(0);
      a.fade.setValue(1);
    });
  };

  const speakPrompt = async (word: PhotoFarsiWord) => {
    setPrompting(true);
    await playFaAudio(word.audioKey as FaTestAudioKey, { awaitFinish: true });
    if (alive.current) setPrompting(false);
  };

  // Speak the first prompt after mount (user already tapped into the
  // game): the instruction first when its recording ships, then the word.
  useEffect(() => {
    void (async () => {
      if ('listen/listen-find' in FA_TEST_AUDIO) {
        await playFaAudio('listen/listen-find' as FaTestAudioKey, { awaitFinish: true });
      }
      if (alive.current) void speakPrompt(cards.answer);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextRound = (next: number) => {
    if (next >= ROUNDS) {
      setDone(true);
      return;
    }
    const deal = freshCards();
    setCards(deal);
    setWrongIdx(null);
    setRound(next);
    setMood('idle');
    setTaps(0);
    resetAnims();
    void speakPrompt(deal.answer);
  };

  const choose = async (index: number) => {
    const word = cards.choices[index]!;
    if (prompting || done) return;
    tap();
    setTaps(t => t + 1);
    if (word.id === cards.answer.id) {
      setPrompting(true);
      setMood('happy');
      const a = anims[index]!;
      // Pop, then fly up to the buddy and fade.
      Animated.sequence([
        Animated.timing(a.pop, { toValue: 1.35, duration: 160, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(a.rise, { toValue: -H * 0.16, duration: 380, useNativeDriver: true }),
          Animated.timing(a.fade, { toValue: 0, duration: 380, useNativeDriver: true }),
        ]),
      ]).start();
      // afarin finishes before the next word: the prompt would otherwise
      // cut its tail off.
      await playFaAudio('feedback/afarin', { awaitFinish: true });
      if (!alive.current) return;
      setStars(s => s + 1);
      setFound(prev => [...prev, word]);
      setTimeout(() => alive.current && nextRound(round + 1), 250);
    } else {
      setWrongIdx(index);
      setMood('thinking');
      const a = anims[index]!;
      // Gentle shake + fade, then settle back.
      Animated.sequence([
        Animated.parallel([
          Animated.sequence([
            Animated.timing(a.shake, { toValue: 9, duration: 60, useNativeDriver: true }),
            Animated.timing(a.shake, { toValue: -9, duration: 90, useNativeDriver: true }),
            Animated.timing(a.shake, { toValue: 0, duration: 90, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(a.fade, { toValue: 0.55, duration: 120, useNativeDriver: true }),
            Animated.timing(a.fade, { toValue: 1, duration: 160, useNativeDriver: true }),
          ]),
        ]),
      ]).start();
      await playFaAudio('feedback/try-again');
      if (!alive.current) return;
      setWrongIdx(null);
      setMood('idle');
    }
  };

  const replay = () => {
    if (prompting || done) return;
    tap();
    void speakPrompt(cards.answer);
  };

  const restart = () => {
    tap();
    const deal = freshCards();
    setRound(0);
    setStars(0);
    setDone(false);
    setFound([]);
    setSaved(false);
    setTaps(0);
    setCards(deal);
    setWrongIdx(null);
    setMood('idle');
    resetAnims();
    void speakPrompt(deal.answer);
  };

  const saveRecap = async () => {
    if (saved || found.length === 0) return;
    tap();
    const buddy = (await loadBuddy()) ?? 'neli';
    await saveMyDay({
      id: `listenfind-${Date.now()}`,
      dateISO: new Date().toISOString().slice(0, 10),
      buddy,
      storyId: 'game_listenfind',
      picks: [],
      colorHex: '#FFFFFF',
      game: {
        fa: 'بشنو و پیدا کن',
        en: 'Listen & Find',
        words: found.map(w => ({ id: w.id, fa: w.fa, emoji: w.emoji })),
      },
    });
    setSaved(true);
  };

  const objSize = H * 0.22;
  const buddySize = Math.min(H * 0.52, 400 * k);
  const closeS = Math.max(48, 52 * k);
  const s = styles(k);
  return (
    <View style={s.root}>
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <Image
          source={roomBackgroundPickers[cards.scene](800, 400)}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: '125%' }}
          resizeMode="cover"
        />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(46,26,107,0.10)' }]} />
      </View>
      <NavyClose top={insets.top + 8} left={12} size={closeS} />

      {/* Progress stars, top-center: big, bold, gold when filled. No round text. */}
      {!done ? (
        <View style={[s.starsWrap, { top: insets.top + 12 }]} pointerEvents="none">
          <View style={{ flexDirection: 'row', gap: 6 * k }}>
            {Array.from({ length: ROUNDS }).map((_, i) => (
              <Text
                key={i}
                style={{
                  fontSize: Math.max(22, 26 * k),
                  color: i < stars ? '#FFB800' : 'rgba(255,255,255,0.92)',
                  textShadowColor: 'rgba(30,20,60,0.65)',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 5,
                }}
              >
                ★
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {/* Buddy, big on the left. Tap to hear again. */}
      {!done ? (
        <View style={[s.buddyWrap, { left: W * 0.03, bottom: H * 0.02 }]}>
          <BuddyReplay size={buddySize} mood={mood} onReplay={replay} playing={prompting} />
          <SoftShadow width={buddySize} />
        </View>
      ) : null}

      {/* Three real objects scattered over the scene, new spots each round.
          Stuck (7 quiet seconds)? The hand points at the right one. */}
      {!done
        ? cards.choices.map((c, i) => {
            const a = anims[i]!;
            const spot = cards.spots[i]!;
            return (
              <View key={c.id} style={[s.objSlot, { left: spot.left, top: spot.top }]}>
                {showHand && c.id === cards.answer.id ? (
                  <View
                    pointerEvents="none"
                    style={{ position: 'absolute', alignSelf: 'center', top: -objSize * 0.12, zIndex: 15, elevation: 15 }}
                  >
                    <IdleHand size={objSize * 0.85} />
                  </View>
                ) : null}
                <TouchableOpacity onPress={() => void choose(i)} disabled={prompting} activeOpacity={0.9} accessibilityRole="button">
                  <Animated.View
                    style={{
                      alignItems: 'center',
                      opacity: a.fade,
                      transform: [{ translateX: a.shake }, { translateY: a.rise }, { scale: a.pop }],
                    }}
                  >
                    <WordArt art={WORD_ART[c.id] ?? null} emoji={c.emoji} size={objSize * (ART_ZOOM[c.id] ?? 1)} />
                    <SoftShadow width={objSize * (ART_ZOOM[c.id] ?? 1)} />
                  </Animated.View>
                </TouchableOpacity>
              </View>
            );
          })
        : null}

      {/* Recap note + camera save. */}
      {done ? (
        <View style={s.noteWrap}>
          <PopperCelebration visible onComplete={() => {}} />
          <View style={[s.note, { width: Math.min(520, 560 * k), maxHeight: H * 0.8 }]}>
            <View style={s.tapeLeft} />
            <View style={s.tapeRight} />
            <View style={s.foundRow}>
              {found.map(w => (
                <View key={w.id} style={s.foundItem}>
                  <WordArt art={WORD_ART[w.id] ?? null} emoji={w.emoji} size={52 * k * (ART_ZOOM[w.id] ?? 1)} />
                  <View style={s.wordTag}>
                    <Text style={[s.wordTagText, dir('fa')]} numberOfLines={1}>{w.fa}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={s.recapBtns}>
              <SquareButton
                color={saved ? '#22C55E' : '#FFB800'}
                edge={saved ? '#15803D' : '#D99A00'}
                onPress={saveRecap}
                disabled={saved}
                size={Math.max(72, 84 * k)}
              >
                {saved ? (
                  <Text style={{ color: '#FFFFFF', fontSize: 34 * k, fontFamily: ff('en', 'black') }}>✓</Text>
                ) : (
                  <Image source={neliWorldAssets.ui.camera} style={{ width: 44 * k, height: 44 * k }} resizeMode="contain" />
                )}
              </SquareButton>
              <SquareButton color="#FFFFFF" edge="#E0D6F5" onPress={restart} size={Math.max(72, 84 * k)}>
                <Image source={neliWorldAssets.ui.restart} style={{ width: 40 * k, height: 40 * k }} resizeMode="contain" />
              </SquareButton>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = (k: number) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: PLAY_INK },
    starsWrap: { position: 'absolute', alignSelf: 'center', zIndex: 30, elevation: 30 },
    buddyWrap: { position: 'absolute', alignSelf: 'center', alignItems: 'center', zIndex: 5 },
    objSlot: { position: 'absolute', zIndex: 10, elevation: 10 },
    noteWrap: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20,
      elevation: 20,
    },
    note: {
      backgroundColor: '#FFF6E5',
      borderRadius: 18 * k,
      padding: 16 * k,
      transform: [{ rotate: '-2deg' }],
      shadowColor: 'rgba(30,20,60,0.35)',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 10,
      elevation: 8,
    },
    tapeLeft: {
      position: 'absolute',
      top: -10 * k,
      left: 24 * k,
      width: 64 * k,
      height: 20 * k,
      backgroundColor: 'rgba(255,255,255,0.65)',
      transform: [{ rotate: '-8deg' }],
    },
    tapeRight: {
      position: 'absolute',
      top: -10 * k,
      right: 24 * k,
      width: 64 * k,
      height: 20 * k,
      backgroundColor: 'rgba(255,255,255,0.65)',
      transform: [{ rotate: '8deg' }],
    },
    foundRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 * k, marginBottom: 12 * k },
    foundItem: { alignItems: 'center', rowGap: 4 * k },
    wordTag: { backgroundColor: '#FFB800', borderRadius: 10 * k, paddingHorizontal: 8 * k, paddingVertical: 2 * k },
    wordTagText: { fontFamily: ff('fa', 'black'), color: PLAY_INK, fontSize: 13 * k },
    recapBtns: { flexDirection: 'row', justifyContent: 'center', gap: 12 * k },
  });
