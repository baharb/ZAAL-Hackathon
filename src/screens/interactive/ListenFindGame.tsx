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
  { bg: 'kitchenCheerful', words: ['apple', 'orange', 'bread', 'water'] },
  { bg: 'bedroom', words: ['book', 'backpack', 'hat', 'shoe'] },
] as const;
type SceneBg = (typeof SCENES)[number]['bg'];

const BY_ID: Record<string, PhotoFarsiWord> = Object.fromEntries(VOICED_WORDS.map(w => [w.id, w]));

// Named standing spots, bottom-anchored to a real surface in the art
// (kitchen counter + island, bedroom bed + rug). The background is
// bottom-anchored at 125% height, so surfaces sit at fixed screen
// fractions on every size. Three random slots per round.
const SCENE_SLOTS: Record<SceneBg, { left: number; base: number }[]> = {
  kitchenCheerful: [
    { left: 0.08, base: 0.375 },
    { left: 0.3, base: 0.375 },
    { left: 0.6, base: 0.375 },
    { left: 0.15, base: 0.537 },
    { left: 0.45, base: 0.537 },
  ],
  bedroom: [
    { left: 0.45, base: 0.41 },
    { left: 0.62, base: 0.41 },
    { left: 0.78, base: 0.41 },
    { left: 0.28, base: 0.625 },
    { left: 0.7, base: 0.625 },
  ],
};

// The catalog art has different amounts of empty padding (the shoes are
// mostly padding, the orange fills its frame), so equal boxes look
// unequal. These zooms were matched by eye against the real files so all
// three choices read as the same visual size.
const ART_ZOOM: Record<string, number> = {
  apple: 1.1,
  orange: 1.0,
  bread: 1.3,
  water: 1.15,
  book: 1.0,
  backpack: 1.15,
  hat: 1.6,
  shoe: 1.7,
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

/** Soft ground shadow under a standing object. */
function GroundShadow({ width }: { width: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        width,
        height: Math.max(6, width * 0.09),
        borderRadius: 999,
        backgroundColor: 'rgba(30,20,60,0.14)',
      }}
    />
  );
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
    // Three random standing spots, bottom-anchored to their surface.
    const objS = H * 0.22;
    const spots = shuffle([...SCENE_SLOTS[scene.bg]])
      .slice(0, 3)
      .map(s => ({ left: W * s.left, top: H * s.base - objS }));
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

  // Speak the first prompt after mount (user already tapped into the game).
  useEffect(() => {
    void speakPrompt(cards.answer);
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
      await playFaAudio('feedback/afarin');
      if (!alive.current) return;
      setStars(s => s + 1);
      setFound(prev => [...prev, word]);
      setTimeout(() => alive.current && nextRound(round + 1), 550);
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
                  color: i < stars ? '#FFB800' : 'rgba(255,255,255,0.45)',
                  textShadowColor: 'rgba(30,20,60,0.6)',
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 3,
                }}
              >
                ★
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {/* Buddy, big and central. Tap to hear again. */}
      {!done ? (
        <View style={[s.buddyWrap, { bottom: H * 0.02 }]}>
          <BuddyReplay size={buddySize} mood={mood} onReplay={replay} playing={prompting} />
          <GroundShadow width={buddySize * 0.5} />
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
                    <GroundShadow width={objSize * 0.7} />
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
