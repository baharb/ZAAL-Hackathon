// Magic Story — Meta hackathon game. The child picks a hero and a place,
// Neli (Muse Spark through the Supabase Edge Function) writes a 4-line
// Farsi story, and the app speaks ONLY the story's focus word — a word with
// a shipped recording. The story text itself is for the parent to read
// aloud (iPhones have no Persian voice; garbled TTS is worse than silence).

import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useWindowDimensions } from '../../layout/PortraitFallback';
import TopBar from '../../components/TopBar';
import { dir, ff } from '../../theme/fonts';
import { FA_TEST_AUDIO, FaTestAudioKey } from '../../assets/faTestAudio.generated';
import { playFaAudio, stopFaAudio } from '../../utils/faAudio';
import { askMeta } from '../../services/metaAI';
import { STORY_HEROES, STORY_PLACES, STORY_FOCUS_WORDS, StoryFocus } from '../../data/magicStory';

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
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    if (!Array.isArray(obj.lines)) return null;
    const lines = obj.lines.filter((l: unknown) => typeof l === 'string').map((l: string) => l.slice(0, 80));
    return lines.length >= 1 && lines.length <= 6 ? lines : null;
  } catch {
    return null;
  }
}

export default function MagicStoryGame() {
  const { height } = useWindowDimensions();
  const k = height / REFERENCE_H;
  const [heroId, setHeroId] = useState(STORY_HEROES[0].id);
  const [placeId, setPlaceId] = useState(STORY_PLACES[0].id);
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
      const hero = STORY_HEROES.find(h => h.id === heroId) ?? STORY_HEROES[0];
      const place = STORY_PLACES.find(p => p.id === placeId) ?? STORY_PLACES[0];
      // The focus word is drawn from recorded words only, so the one spoken
      // word always has the real voice no matter what the story says.
      const nextFocus = STORY_FOCUS_WORDS[Math.floor(Math.random() * STORY_FOCUS_WORDS.length)];
      const res = await askMeta({
        prompt:
          `Write a tiny bedtime story in Farsi for a 4-year-old. Hero: ${hero.fa} (${hero.en}). ` +
          `Place: ${place.fa} (${place.en}). The story MUST include the word "${nextFocus.fa}" (${nextFocus.en}). ` +
          'Reply with ONLY this JSON and no other text: {"lines": ["line1", "line2", "line3", "line4"]}',
        system:
          'Four lines only. Each line at most 8 very simple Farsi words in Persian script. ' +
          'Kind, calm and sleepy. JSON only, never any other text.',
        maxTokens: 200,
      });
      if ('error' in res) {
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

  const hero = STORY_HEROES.find(h => h.id === heroId) ?? STORY_HEROES[0];
  const place = STORY_PLACES.find(p => p.id === placeId) ?? STORY_PLACES[0];
  const s = styles(k);
  return (
    <View style={s.root}>
      <TopBar title="Magic Story" titleFa="قصه جادویی" showBack />
      <View style={s.body}>
        {/* Left: pick hero + place, then ask */}
        <View style={s.left}>
          <Text style={s.label}>Who?</Text>
          <View style={s.pickRow}>
            {STORY_HEROES.map(h => (
              <TouchableOpacity key={h.id} style={[s.pick, h.id === heroId && s.pickOn]} onPress={() => pick(setHeroId)(h.id)} activeOpacity={0.85}>
                <Text style={s.pickEmoji}>{h.emoji}</Text>
                <Text style={[s.pickFa, dir('fa'), { textAlign: 'center' }]} numberOfLines={1}>{h.fa}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.label}>Where?</Text>
          <View style={s.pickRow}>
            {STORY_PLACES.map(p => (
              <TouchableOpacity key={p.id} style={[s.pick, p.id === placeId && s.pickOn]} onPress={() => pick(setPlaceId)(p.id)} activeOpacity={0.85}>
                <Text style={s.pickEmoji}>{p.emoji}</Text>
                <Text style={[s.pickFa, dir('fa'), { textAlign: 'center' }]} numberOfLines={1}>{p.fa}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[s.tellBtn, asking && s.tellBtnOff]} onPress={tellStory} disabled={asking} activeOpacity={0.85}>
            <Text style={s.tellText}>{asking ? '✨ …' : '✨ Tell my story'}</Text>
          </TouchableOpacity>
          {error ? <Text style={s.error}>{error}</Text> : null}
          <Text style={s.parentNote}>📖 Parent reads the story aloud</Text>
        </View>

        {/* Right: the story */}
        <View style={s.right}>
          <View style={s.storyCard}>
            {lines ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {lines.map((line, i) => (
                  <Text key={i} style={[s.line, dir('fa'), { textAlign: 'center' }]}>{line}</Text>
                ))}
              </ScrollView>
            ) : (
              <View style={s.storyEmpty}>
                <Text style={s.storyEmoji}>{hero.emoji}{place.emoji}</Text>
                <Text style={[s.hint, dir('fa'), { textAlign: 'center' }]}>دوستت را انتخاب کن و قصه بساز</Text>
              </View>
            )}
            <View style={s.starChip}>
              <Text style={s.starText}>⭐ {stories}</Text>
            </View>
          </View>
          {focus ? (
            <TouchableOpacity style={s.focusChip} onPress={speakFocus} activeOpacity={0.85}>
              <Text style={s.focusEmoji}>{focus.emoji}</Text>
              <Text style={[s.focusFa, dir('fa')]}>{focus.fa}</Text>
              <Text style={s.focusReplay}>🔊</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = (k: number) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: '#2D1B69' },
    body: { flex: 1, flexDirection: 'row', paddingHorizontal: 16 * k, paddingBottom: 12 * k, columnGap: 12 * k },
    left: { width: '38%', rowGap: 6 * k },
    label: { color: '#C4B5FD', fontSize: 13 * k, fontFamily: ff('en', 'black') },
    pickRow: { flexDirection: 'row', columnGap: 8 * k },
    pick: {
      flex: 1,
      borderRadius: 16 * k,
      backgroundColor: '#FFF6E5',
      alignItems: 'center',
      paddingVertical: 6 * k,
      borderWidth: 3 * k,
      borderColor: 'transparent',
    },
    pickOn: { borderColor: '#FACC15' },
    pickEmoji: { fontSize: 30 * k },
    pickFa: { fontFamily: ff('fa', 'black'), color: '#2D1B69', fontSize: 14 * k },
    tellBtn: {
      marginTop: 4 * k,
      height: 52 * k,
      borderRadius: 16 * k,
      backgroundColor: '#22C55E',
      alignItems: 'center',
      justifyContent: 'center',
    },
    tellBtnOff: { backgroundColor: '#8A7BB8' },
    tellText: { color: '#FFFFFF', fontSize: 18 * k, fontFamily: ff('en', 'black') },
    error: { color: '#FDA4AF', fontSize: 12 * k },
    parentNote: { color: '#C4B5FD', fontSize: 12 * k },
    right: { flex: 1, rowGap: 8 * k, minHeight: 0 },
    storyCard: {
      flex: 1,
      minHeight: 0,
      borderRadius: 20 * k,
      backgroundColor: '#FFF6E5',
      paddingVertical: 10 * k,
      paddingHorizontal: 14 * k,
      justifyContent: 'center',
    },
    line: { fontFamily: ff('fa', 'black'), color: '#2D1B69', fontSize: 21 * k, marginBottom: 6 * k },
    storyEmpty: { alignItems: 'center', rowGap: 6 * k },
    storyEmoji: { fontSize: 52 * k },
    hint: { fontFamily: ff('fa', 'black'), color: '#6C4EFF', fontSize: 16 * k },
    starChip: { position: 'absolute', top: 6 * k, right: 8 * k, backgroundColor: '#FACC15', borderRadius: 10 * k, paddingHorizontal: 8 * k, paddingVertical: 2 * k },
    starText: { fontSize: 12 * k, fontFamily: ff('en', 'black'), color: '#2D1B69' },
    focusChip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      columnGap: 8 * k,
      backgroundColor: '#6C4EFF',
      borderRadius: 16 * k,
      paddingHorizontal: 16 * k,
      paddingVertical: 6 * k,
    },
    focusEmoji: { fontSize: 22 * k },
    focusFa: { fontFamily: ff('fa', 'black'), color: '#FFFFFF', fontSize: 18 * k },
    focusReplay: { fontSize: 16 * k },
  });
