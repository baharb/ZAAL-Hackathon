// Magic Story — Meta hackathon game. The child picks a hero and a place,
// Neli (Muse Spark through the Supabase Edge Function) writes a 4-line
// Farsi story, and the app speaks ONLY the story's focus word — a word with
// a shipped recording. The story text itself is for the parent to read
// aloud (iPhones have no Persian voice; garbled TTS is worse than silence).

import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useWindowDimensions } from '../../layout/PortraitFallback';
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
  GameBg,
  GameCard,
  GameTopBar,
  HERO_ART,
  PLACE_ART,
  PLAY_ACCENTS,
  PLAY_INK,
  WORD_ART,
  WordArt,
} from '../../ui/playKit';

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

export default function MagicStoryGame() {
  const { height } = useWindowDimensions();
  const k = height / REFERENCE_H;
  const [heroId, setHeroId] = useState(STORY_HEROES[0]!.id);
  const [placeId, setPlaceId] = useState(STORY_PLACES[0]!.id);
  const [focus, setFocus] = useState<StoryFocus | null>(null);
  const [lines, setLines] = useState<string[] | null>(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stories, setStories] = useState(0);

  // Recorded clips and TTS must never overlap — silence both on exit.
  useEffect(() => () => {
    void stopFaAudio();
  }, []);

  const pick = (setter: (id: string) => void) => (id: string) => {
    tap();
    setter(id);
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
      setStories(s => s + 1);
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
  const wandH = Math.max(64, 68 * k);
  const s = styles(k);
  return (
    <View style={s.root}>
      <GameBg pick={roomBackgroundPickers.garden} />
      <GameTopBar title="Magic Story" titleFa="قصه جادویی" />
      <View style={s.body}>
        {/* Left: pick hero + place, then ask */}
        <View style={s.left}>
          <Text style={[s.label, dir('fa'), { textAlign: 'center' }]}>کی؟</Text>
          <View style={s.pickRow}>
            {STORY_HEROES.map(h => (
              <TouchableOpacity key={h.id} style={[s.pick, h.id === heroId && s.pickOn]} onPress={() => pick(setHeroId)(h.id)} activeOpacity={0.85}>
                <View style={s.artBox}>
                  <WordArt art={HERO_ART[h.id]} emoji={h.emoji} size={52 * k} />
                </View>
                <Text style={[s.pickFa, dir('fa'), { textAlign: 'center' }]} numberOfLines={1}>{h.fa}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[s.label, dir('fa'), { textAlign: 'center' }]}>کجا؟</Text>
          <View style={s.pickRow}>
            {STORY_PLACES.map(p => (
              <TouchableOpacity key={p.id} style={[s.pick, p.id === placeId && s.pickOn]} onPress={() => pick(setPlaceId)(p.id)} activeOpacity={0.85}>
                <View style={s.artBox}>
                  <WordArt art={PLACE_ART[p.id]} emoji={p.emoji} size={52 * k} />
                </View>
                <Text style={[s.pickFa, dir('fa'), { textAlign: 'center' }]} numberOfLines={1}>{p.fa}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <CandyButton color={PLAY_ACCENTS.story.color} edge={PLAY_ACCENTS.story.edge} onPress={tellStory} disabled={asking} height={wandH}>
            <Image source={neliWorldAssets.ui.sparkle} style={{ width: wandH * 0.45, height: wandH * 0.45 }} resizeMode="contain" />
            <Text style={s.tellText}>{asking ? '…' : 'قصه بگو'}</Text>
          </CandyButton>
          {error ? <Text style={s.error}>{error}</Text> : null}
          <Text style={s.parentNote}>📖 Parent reads the story aloud</Text>
        </View>

        {/* Right: the open storybook */}
        <View style={s.right}>
          <GameCard radius={22 * k} style={s.storyCard}>
            <View style={s.bookCorner}>
              <BuddyGuide mood={mood} size={64 * k} />
            </View>
            {lines ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.bookPages}>
                <View style={s.bookCast}>
                  <WordArt art={HERO_ART[hero.id]} emoji={hero.emoji} size={56 * k} />
                  <Text style={s.bookPlus}>＋</Text>
                  <WordArt art={PLACE_ART[place.id]} emoji={place.emoji} size={56 * k} />
                </View>
                {lines.map((line, i) => (
                  <Text key={i} style={[s.line, dir('fa'), { textAlign: 'center' }]}>{line}</Text>
                ))}
              </ScrollView>
            ) : (
              <View style={s.storyEmpty}>
                <View style={s.bookCast}>
                  <WordArt art={HERO_ART[hero.id]} emoji={hero.emoji} size={56 * k} />
                  <Text style={s.bookPlus}>＋</Text>
                  <WordArt art={PLACE_ART[place.id]} emoji={place.emoji} size={56 * k} />
                </View>
                <Text style={[s.hint, dir('fa'), { textAlign: 'center' }]}>دوستت را انتخاب کن و قصه بساز</Text>
              </View>
            )}
            <View style={s.starChip}>
              <Text style={s.starText}>⭐ {stories}</Text>
            </View>
          </GameCard>
          {focus ? (
            <TouchableOpacity style={s.focusChip} onPress={speakFocus} activeOpacity={0.85}>
              <WordArt art={WORD_ART[focus.id]} emoji={focus.emoji} size={30 * k} />
              <Text style={[s.focusFa, dir('fa')]}>{focus.fa}</Text>
              <Image source={neliWorldAssets.ui.voice} style={{ width: 30 * k, height: 30 * k }} resizeMode="contain" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = (k: number) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: PLAY_INK },
    body: { flex: 1, flexDirection: 'row', paddingHorizontal: 14 * k, paddingBottom: 12 * k, columnGap: 12 * k },
    left: { width: '38%', rowGap: 6 * k, justifyContent: 'center' },
    label: { fontFamily: ff('fa', 'black'), color: '#FFFFFF', fontSize: 14 * k, textShadowColor: 'rgba(46,26,107,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
    pickRow: { flexDirection: 'row', columnGap: 8 * k },
    pick: {
      flex: 1,
      borderRadius: 18 * k,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      paddingVertical: 6 * k,
      borderWidth: 3 * k,
      borderColor: 'transparent',
      shadowColor: 'rgba(45,27,105,0.30)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 6,
      elevation: 5,
    },
    pickOn: { borderColor: '#FFB800' },
    artBox: { width: 58 * k, height: 58 * k, alignItems: 'center', justifyContent: 'center' },
    pickFa: { fontFamily: ff('fa', 'black'), color: PLAY_INK, fontSize: 14 * k },
    tellText: { color: '#FFFFFF', fontSize: 20 * k, fontFamily: ff('fa', 'black') },
    error: { color: '#DC2626', backgroundColor: '#FFFFFF', borderRadius: 10 * k, paddingHorizontal: 10 * k, paddingVertical: 4 * k, fontSize: 12 * k, overflow: 'hidden' },
    parentNote: { color: '#FFFFFF', fontSize: 11 * k, opacity: 0.85 },
    right: { flex: 1, rowGap: 8 * k, minHeight: 0, justifyContent: 'center' },
    storyCard: {
      flex: 1,
      minHeight: 0,
      paddingVertical: 10 * k,
      paddingHorizontal: 14 * k,
      justifyContent: 'center',
    },
    bookCorner: { position: 'absolute', top: 6 * k, left: 8 * k, zIndex: 5 },
    bookPages: { alignItems: 'center', rowGap: 4 * k, paddingTop: 8 * k },
    bookCast: { flexDirection: 'row', alignItems: 'center', gap: 8 * k, marginBottom: 4 * k },
    bookPlus: { fontSize: 20 * k, color: PLAY_INK, fontFamily: ff('en', 'black') },
    line: { fontFamily: ff('fa', 'black'), color: PLAY_INK, fontSize: 21 * k, marginBottom: 6 * k },
    storyEmpty: { alignItems: 'center', rowGap: 6 * k },
    hint: { fontFamily: ff('fa', 'black'), color: '#6B5CA5', fontSize: 16 * k },
    starChip: { position: 'absolute', top: 6 * k, right: 8 * k, backgroundColor: '#FACC15', borderRadius: 10 * k, paddingHorizontal: 8 * k, paddingVertical: 2 * k },
    starText: { fontSize: 12 * k, fontFamily: ff('en', 'black'), color: PLAY_INK },
    focusChip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      columnGap: 8 * k,
      backgroundColor: '#FFB800',
      borderRadius: 18 * k,
      paddingHorizontal: 16 * k,
      paddingVertical: 6 * k,
      minHeight: Math.max(64, 60 * k),
      shadowColor: 'rgba(45,27,105,0.30)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 6,
      elevation: 5,
    },
    focusFa: { fontFamily: ff('fa', 'black'), color: PLAY_INK, fontSize: 18 * k },
  });
