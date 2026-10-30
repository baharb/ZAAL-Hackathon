// Magic Story — scene version. The game IS the scene: the chosen place
// fills the screen (living room / yard / flat sea-blue), the hero stands
// in it next to the big buddy, choices live in the scene (heroes left,
// round place windows right), and the story arrives as a paper note. No
// title bar (only a floating navy close button), almost no text: the one
// spoken word is the recorded focus word. Neli (Muse Spark through the
// Supabase Edge Function) still writes the 4-line Farsi story for the
// parent to read aloud — iPhones have no Persian voice.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useWindowDimensions } from '../../layout/PortraitFallback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNav } from '../../store/NavContext';
import { dir, ff } from '../../theme/fonts';
import { FA_TEST_AUDIO, FaTestAudioKey } from '../../assets/faTestAudio.generated';
import { playFaAudio, stopFaAudio } from '../../utils/faAudio';
import { askMeta } from '../../services/metaAI';
import { roomBackgroundPickers, neliWorldAssets } from '../../assets/neliWorldAssets';
import { STORY_HEROES, STORY_PLACES, STORY_FOCUS_WORDS, StoryFocus } from '../../data/magicStory';
import {
  BuddyGuide,
  BuddyMood,
  CandyButton,
  PLAY_ACCENTS,
  PLAY_INK,
  HERO_ART,
  PLACE_ART,
  WORD_ART,
  WordArt,
} from '../../ui/playKit';
import PopperCelebration from '../../components/PopperCelebration';

// Everything scales from a 400pt-tall reference (a landscape phone is
// 360–440pt tall). k multiplies every size AND offset — see CLAUDE.md.
const REFERENCE_H = 400;

function tap() {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // haptics are best-effort (web has none)
  }
}

function parseLines(text: string): string[] | null {
  const clean = (text ?? '').replace(/```json|```/g, '');
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const obj = JSON.parse(match[0]);
      if (Array.isArray(obj.lines)) {
        const lines = obj.lines.filter((l: unknown) => typeof l === 'string').map((l: string) => l.slice(0, 80));
        if (lines.length >= 1 && lines.length <= 6) return lines;
      }
    } catch {
      // Fall through to salvage mode below.
    }
  }
  // Salvage mode: the model chatted instead of sending JSON. Keep the
  // Farsi-looking lines so the child still gets a story.
  const faRange = new RegExp('[\\u0600-\\u06FF]');
  const seen = new Set<string>();
  const lines = clean
    .split('\n')
    .map(l => l.replace(/^[\s*#\-–—\d.)\]]+/, '').replace(/["*]/g, '').trim())
    .filter(l => l.length > 0 && l.length <= 80 && faRange.test(l))
    .filter(l => (seen.has(l) ? false : (seen.add(l), true)));
  return lines.length >= 1 ? lines.slice(0, 6) : null;
}

/** Soft ground shadow under a standing figure. */
function GroundShadow({ width }: { width: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        width,
        height: Math.max(8, width * 0.12),
        borderRadius: 999,
        backgroundColor: 'rgba(30,20,60,0.18)',
        marginTop: -width * 0.04,
      }}
    />
  );
}

/** Choice figure that bounces when tapped. */
function ChoiceFigure({
  size,
  selected,
  disabled,
  onPress,
  children,
}: {
  size: number;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const bounce = useRef(new Animated.Value(1)).current;
  const press = () => {
    tap();
    Animated.sequence([
      Animated.timing(bounce, { toValue: 1.18, duration: 160, useNativeDriver: true }),
      Animated.timing(bounce, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <TouchableOpacity onPress={press} disabled={disabled} activeOpacity={0.9} accessibilityRole="button">
      <Animated.View style={{ transform: [{ scale: bounce }], alignItems: 'center' }}>
        {selected ? (
          <View style={{ width: size * 1.12, height: size * 1.12, borderRadius: (size * 1.12) / 2, backgroundColor: '#FFB800', alignItems: 'center', justifyContent: 'center' }}>
            {children}
          </View>
        ) : (
          children
        )}
        <GroundShadow width={size * 0.8} />
      </Animated.View>
    </TouchableOpacity>
  );
}

/** Pulsing dots while Neli writes. */
function ThinkingDots({ size }: { size: number }) {
  const pulse = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 450, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={{ flexDirection: 'row', gap: size * 0.4 }}>
      {[0, 1, 2].map(i => (
        <Animated.View key={i} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: PLAY_INK, opacity: pulse }} />
      ))}
    </View>
  );
}

export default function MagicStoryGame() {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { reset } = useNav();
  const k = H / REFERENCE_H;
  const [heroId, setHeroId] = useState(STORY_HEROES[0]!.id);
  const [placeId, setPlaceId] = useState(STORY_PLACES[0]!.id);
  const [focus, setFocus] = useState<StoryFocus | null>(null);
  const [lines, setLines] = useState<string[] | null>(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  // Recorded clips and TTS must never overlap — silence both on exit.
  useEffect(() => () => {
    void stopFaAudio();
  }, []);

  const pick = (setter: (id: string) => void) => (id: string) => {
    setter(id);
    // A new combination means a new story: clear the old note.
    setLines(null);
    setFocus(null);
    setCelebrate(false);
  };

  const speakFocus = async () => {
    if (!focus || !(focus.audioKey in FA_TEST_AUDIO)) return;
    tap();
    await playFaAudio(focus.audioKey as FaTestAudioKey, { awaitFinish: true });
    await playFaAudio('feedback/afarin');
  };

  const tellStory = async () => {
    if (asking) return;
    tap();
    setAsking(true);
    setError(null);
    setLines(null);
    setCelebrate(false);
    try {
      const hero = STORY_HEROES.find(h => h.id === heroId) ?? STORY_HEROES[0]!;
      const place = STORY_PLACES.find(p => p.id === placeId) ?? STORY_PLACES[0]!;
      // The focus word is drawn from recorded words only, so the one spoken
      // word always has the real voice no matter what the story says.
      const nextFocus = STORY_FOCUS_WORDS[Math.floor(Math.random() * STORY_FOCUS_WORDS.length)]!;
      const res = await askMeta({
        prompt:
          `Write a tiny bedtime story in Farsi for a 4-year-old. Hero: ${hero.fa} (${hero.en}). ` +
          `Place: ${place.fa} (${place.en}). The story MUST include the word "${nextFocus.fa}" (${nextFocus.en}). ` +
          'Reply with ONLY this JSON and no other text: {"lines": ["line1", "line2", "line3", "line4"]}',
        system:
          'Four lines only. Each line at most 8 very simple Farsi words in Persian script. ' +
          'Kind, calm and sleepy. JSON only, never any other text.',
        maxTokens: 400,
      });
      if ('error' in res || !res.text || !res.text.trim()) {
        setError('Neli is busy. Try again.');
        return;
      }
      const parsed = parseLines(res.text);
      if (!parsed) {
        setError('That story got tangled. Try again.');
        return;
      }
      setFocus(nextFocus);
      setLines(parsed);
      setCelebrate(true);
      if (nextFocus.audioKey in FA_TEST_AUDIO) {
        await playFaAudio(nextFocus.audioKey as FaTestAudioKey, { awaitFinish: true });
        await playFaAudio('feedback/afarin');
      }
    } finally {
      setAsking(false);
    }
  };

  const hero = STORY_HEROES.find(h => h.id === heroId) ?? STORY_HEROES[0]!;
  const place = STORY_PLACES.find(p => p.id === placeId) ?? STORY_PLACES[0]!;
  const mood: BuddyMood = asking ? 'thinking' : lines ? 'happy' : 'idle';
  const showingNote = asking || lines !== null;
  const buddyH = Math.min(H * 0.56, W * 0.24);
  const heroH = Math.min(H * 0.42, W * 0.18);
  const choiceH = H * 0.2;
  const windowD = H * 0.19;
  const wandH = Math.max(64, 72 * k);
  const closeS = Math.max(48, 52 * k);
  const s = styles(k);

  const sceneBg =
    placeId === 'home' ? (
      <Image
        source={roomBackgroundPickers.talkPlay(W, H)}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: W, height: H * 1.25 }}
        resizeMode="cover"
      />
    ) : placeId === 'garden' ? (
      <Image
        source={roomBackgroundPickers.garden(W, H)}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: W, height: H * 1.25 }}
        resizeMode="cover"
      />
    ) : (
      // No sea art in the repo: bold flat sea-blue with soft wave circles.
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: W, height: H, backgroundColor: '#0E7CC4' }}>
        <View style={{ position: 'absolute', width: W * 0.5, height: W * 0.5, borderRadius: W * 0.25, backgroundColor: '#2B9BDE', top: -W * 0.2, right: -W * 0.1 }} />
        <View style={{ position: 'absolute', width: W * 0.36, height: W * 0.36, borderRadius: W * 0.18, backgroundColor: '#2B9BDE', bottom: -W * 0.12, left: W * 0.08 }} />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: H * 0.2, backgroundColor: '#0A63A3' }} />
      </View>
    );

  return (
    <View style={s.root}>
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {sceneBg}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(46,26,107,0.10)' }]} />
      </View>

      {/* Floating navy close (top-left), safe-area spaced, no bar. */}
      <TouchableOpacity
        onPress={() => reset({ name: 'Main', tab: 'Games' })}
        activeOpacity={0.8}
        accessibilityRole="button"
        style={[s.closeBtn, { top: insets.top + 8, left: 12, width: closeS, height: closeS, borderRadius: closeS / 2 }]}
      >
        <Image source={neliWorldAssets.ui.close} style={{ width: closeS * 0.55, height: closeS * 0.55 }} resizeMode="contain" />
      </TouchableOpacity>

      {/* Left: 3 hero choices standing in the scene. */}
      <View style={[s.heroRail, { left: 12, top: H * 0.16, bottom: H * 0.06 }]}>
        {STORY_HEROES.map(h => (
          <ChoiceFigure key={h.id} size={choiceH} selected={h.id === heroId} disabled={asking} onPress={() => pick(setHeroId)(h.id)}>
            <WordArt art={HERO_ART[h.id]} emoji={h.emoji} size={choiceH} />
          </ChoiceFigure>
        ))}
      </View>

      {/* Center: big buddy + chosen hero beside them (hidden while the note shows). */}
      {!showingNote ? (
        <View style={[s.duo, { bottom: H * 0.04 }]} pointerEvents="box-none">
          <View style={s.duoFigure}>
            <BuddyGuide mood={mood} size={buddyH} />
            <GroundShadow width={buddyH * 0.55} />
          </View>
          <View style={s.duoFigure}>
            <WordArt art={HERO_ART[hero.id]} emoji={hero.emoji} size={heroH} />
            <GroundShadow width={heroH * 0.55} />
          </View>
        </View>
      ) : null}

      {/* Right: 3 round place windows. */}
      <View style={[s.placeRail, { right: 12, top: H * 0.16 }]}>
        {STORY_PLACES.map(p => (
          <ChoiceFigure key={p.id} size={windowD} selected={p.id === placeId} disabled={asking} onPress={() => pick(setPlaceId)(p.id)}>
            <View style={[s.window, { width: windowD, height: windowD, borderRadius: windowD / 2 }]}>
              <WordArt art={PLACE_ART[p.id]} emoji={p.emoji} size={windowD * 0.72} />
            </View>
          </ChoiceFigure>
        ))}
      </View>

      {/* Wand: the one big button, bottom-right above everything. */}
      <View style={[s.wandWrap, { right: 14, bottom: H * 0.05, zIndex: 30, elevation: 30 }]}>
        <CandyButton color={PLAY_ACCENTS.story.color} edge={PLAY_ACCENTS.story.edge} onPress={tellStory} disabled={asking} height={wandH}>
          <Image source={neliWorldAssets.ui.sparkle} style={{ width: wandH * 0.45, height: wandH * 0.45 }} resizeMode="contain" />
        </CandyButton>
      </View>

      {/* Story paper note (centered overlay). */}
      {showingNote ? (
        <View style={s.noteWrap} pointerEvents="box-none">
          <View style={[s.note, { width: Math.min(W * 0.58, 560), maxHeight: H * 0.88 }]}>
            <View style={s.tapeLeft} />
            <View style={s.tapeRight} />
            {asking || !lines ? (
              <View style={s.noteThinking}>
                <BuddyGuide mood="thinking" size={64 * k} />
                <ThinkingDots size={12 * k} />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.noteBody}>
                <View style={s.noteCast}>
                  <WordArt art={HERO_ART[hero.id]} emoji={hero.emoji} size={52 * k} />
                  <Text style={s.notePlus}>＋</Text>
                  <WordArt art={PLACE_ART[place.id]} emoji={place.emoji} size={52 * k} />
                </View>
                {lines.map((line, i) => (
                  <Text key={i} style={[s.line, dir('fa'), { textAlign: 'center' }]}>{line}</Text>
                ))}
                {focus ? (
                  <TouchableOpacity style={s.focusChip} onPress={speakFocus} activeOpacity={0.85}>
                    <WordArt art={WORD_ART[focus.id]} emoji={focus.emoji} size={30 * k} />
                    <Text style={[s.focusFa, dir('fa')]}>{focus.fa}</Text>
                    <Image source={neliWorldAssets.ui.voice} style={{ width: 30 * k, height: 30 * k }} resizeMode="contain" />
                  </TouchableOpacity>
                ) : null}
              </ScrollView>
            )}
          </View>
        </View>
      ) : null}

      {error ? (
        <View style={s.errorWrap} pointerEvents="none">
          <Text style={s.error}>{error}</Text>
        </View>
      ) : null}
      {celebrate && lines ? <PopperCelebration visible onComplete={() => {}} /> : null}
    </View>
  );
}

const styles = (k: number) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: PLAY_INK },
    closeBtn: {
      position: 'absolute',
      backgroundColor: '#1E2A5A',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 40,
      elevation: 40,
    },
    heroRail: { position: 'absolute', justifyContent: 'space-evenly', zIndex: 5 },
    duo: {
      position: 'absolute',
      left: '24%',
      right: '30%',
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'center',
      columnGap: 12 * k,
      zIndex: 4,
    },
    duoFigure: { alignItems: 'center' },
    placeRail: { position: 'absolute', rowGap: 10 * k, zIndex: 5 },
    window: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.92)',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    wandWrap: { position: 'absolute' },
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
    noteThinking: { alignItems: 'center', rowGap: 10 * k, paddingVertical: 20 * k },
    noteBody: { alignItems: 'center', rowGap: 4 * k, paddingTop: 6 * k },
    noteCast: { flexDirection: 'row', alignItems: 'center', gap: 8 * k, marginBottom: 4 * k },
    notePlus: { fontSize: 20 * k, color: PLAY_INK, fontFamily: ff('en', 'black') },
    line: { fontFamily: ff('fa', 'black'), color: PLAY_INK, fontSize: 20 * k, marginBottom: 6 * k },
    focusChip: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 8 * k,
      backgroundColor: '#FFB800',
      borderRadius: 16 * k,
      paddingHorizontal: 14 * k,
      paddingVertical: 6 * k,
      marginTop: 6 * k,
      minHeight: Math.max(56, 56 * k),
    },
    focusFa: { fontFamily: ff('fa', 'black'), color: PLAY_INK, fontSize: 18 * k },
    errorWrap: { position: 'absolute', bottom: 12, alignSelf: 'center', zIndex: 35, elevation: 35 },
    error: { color: '#DC2626', backgroundColor: '#FFFFFF', borderRadius: 10 * k, paddingHorizontal: 10 * k, paddingVertical: 4 * k, fontSize: 12 * k, overflow: 'hidden' },
  });
