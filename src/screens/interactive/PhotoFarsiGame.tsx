// Photo Farsi — Meta hackathon game. A child photographs their room, Neli
// (Muse Spark through the Supabase Edge Function) names what it sees, and
// the app speaks the word ONLY when a recorded voice file already exists.
// Unknown words show text with a parent note; Farsi is never synthesized
// on-device (iPhones have no Persian voice — garbled audio is worse than
// silence). Photos are processed and discarded; nothing is stored.
//
// Two states: START (buddy + big camera button) and PHOTO (polaroid +
// answer). The 15-word grid lives in the sticker book overlay.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useWindowDimensions } from '../../layout/PortraitFallback';
import { dir, ff } from '../../theme/fonts';
import { FA_TEST_AUDIO, FaTestAudioKey } from '../../assets/faTestAudio.generated';
import { playFaAudio, stopFaAudio } from '../../utils/faAudio';
import { askMeta } from '../../services/metaAI';
import { neliWorldAssets, roomBackgroundPickers } from '../../assets/neliWorldAssets';
import { PHOTO_FARSI_WORDS, PHOTO_FARSI_IDS, PhotoFarsiWord, findPhotoFarsiWord } from '../../data/photoFarsiWords';
import {
  BuddyGuide,
  BuddyMood,
  CandyButton,
  GameBg,
  GameCard,
  GameTopBar,
  PLAY_ACCENTS,
  PLAY_INK,
  WORD_ART,
  WordArt,
} from '../../ui/playKit';

// Everything scales from a 400pt-tall reference (a landscape phone is
// 360–440pt tall). k multiplies every size AND offset — see CLAUDE.md.
const REFERENCE_H = 400;
const MAX_IMAGE_BASE64_CHARS = 5_000_000;

type Photo = { uri: string; base64: string };
type Result = { word: PhotoFarsiWord | null; fa: string; en: string; known: boolean };

const ASK_PROMPT =
  'Name the main object in this photo for a 4-year-old learning Farsi. ' +
  'Reply with ONLY this JSON and no other text: ' +
  '{"fa": "<farsi name in Persian script>", "en": "<english name>", "wordId": "<one id or null>"}';

function askSystem(): string {
  return (
    'The child is learning Farsi words for things in their room. ' +
    'If the main object is one of these, use its id exactly: ' +
    PHOTO_FARSI_IDS.join(', ') +
    '. Otherwise set wordId to null but still give short fa and en names. ' +
    'Output JSON only, never any other text.'
  );
}

function parseAnswer(text: string): { fa: string; en: string; wordId: string | null } {
  const clean = (text ?? '').replace(/```json|```/g, '');
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const obj = JSON.parse(match[0]);
      return {
        fa: typeof obj.fa === 'string' ? obj.fa.slice(0, 40) : '',
        en: typeof obj.en === 'string' ? obj.en.slice(0, 40) : '',
        wordId: typeof obj.wordId === 'string' ? obj.wordId : null,
      };
    } catch {
      // Fall through to salvage mode below.
    }
  }
  // Salvage mode: the model chatted instead of sending JSON. Pull the
  // first Farsi-looking line as the name and any known word id mentioned.
  const lines = clean
    .split('\n')
    .map(l => l.replace(/^[\s*#\-–—\d.)\]]+/, '').replace(/["*]/g, '').trim())
    .filter(l => l.length > 0 && l.length <= 60);
  const faRange = new RegExp('[\\u0600-\\u06FF]');
  const fa = lines.find(l => faRange.test(l)) ?? '';
  const en = lines.find(l => !faRange.test(l) && /[A-Za-z]/.test(l)) ?? '';
  const idHit = PHOTO_FARSI_IDS.find(id => new RegExp(`\\b${id}\\b`).test(clean));
  return { fa: fa.slice(0, 40), en: en.slice(0, 40), wordId: idHit ?? null };
}

function tap() {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // haptics are best-effort (web has none)
  }
}

/** Three pulsing dots while Neli thinks. */
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
        <Animated.View key={i} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: PLAY_ACCENTS.photo.color, opacity: pulse }} />
      ))}
    </View>
  );
}

export default function PhotoFarsiGame() {
  const { height } = useWindowDimensions();
  const k = height / REFERENCE_H;
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heard, setHeard] = useState<string[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [bookOpen, setBookOpen] = useState(false);

  // Recorded clips and TTS must never overlap — silence both on exit.
  useEffect(() => () => {
    void stopFaAudio();
  }, []);

  const markHeard = (id: string) => {
    setHeard(prev => (prev.includes(id) ? prev : [...prev, id]));
  };

  const speakEntry = async (entry: PhotoFarsiWord) => {
    tap();
    setError(null);
    setResult({ word: entry, fa: entry.fa, en: entry.en, known: entry.audioKey != null && entry.audioKey in FA_TEST_AUDIO });
    if (entry.audioKey && entry.audioKey in FA_TEST_AUDIO) {
      await playFaAudio(entry.audioKey as FaTestAudioKey, { awaitFinish: true });
      await playFaAudio('feedback/afarin');
      markHeard(entry.id);
    } else if (entry.fa) {
      setMissing(prev => (prev.includes(entry.fa) ? prev : [...prev, entry.fa]));
    }
  };

  const handlePicked = (uri: string | undefined, base64: string | undefined | null) => {
    if (!uri || !base64) {
      setError('That photo did not work. Try another one.');
      return;
    }
    if (base64.length > MAX_IMAGE_BASE64_CHARS) {
      setError('That photo is too big. Try the camera instead.');
      return;
    }
    setPhoto({ uri, base64 });
    setResult(null);
    setError(null);
  };

  const takePhoto = async () => {
    tap();
    setError(null);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setError('Camera is off. You can still tap the word cards.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.5, base64: true, exif: false });
      if (!res.canceled) handlePicked(res.assets[0]?.uri, res.assets[0]?.base64);
    } catch {
      setError('Camera did not open. You can still tap the word cards.');
    }
  };

  const choosePhoto = async () => {
    tap();
    setError(null);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError('Photo library is off. You can still tap the word cards.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: false, quality: 0.5, base64: true, exif: false });
      if (!res.canceled) handlePicked(res.assets[0]?.uri, res.assets[0]?.base64);
    } catch {
      setError('Library did not open. You can still tap the word cards.');
    }
  };

  const askNeli = async () => {
    if (!photo || asking) return;
    tap();
    setAsking(true);
    setError(null);
    try {
      const res = await askMeta({ prompt: ASK_PROMPT, imageBase64: photo.base64, system: askSystem(), maxTokens: 1000 });
      if ('error' in res || !res.text || !res.text.trim()) {
        setError('Neli is busy. Try again.');
        return;
      }
      const parsed = parseAnswer(res.text);
      const word = findPhotoFarsiWord(parsed.wordId);
      if (word && word.audioKey && word.audioKey in FA_TEST_AUDIO) {
        setResult({ word, fa: word.fa, en: word.en, known: true });
        await playFaAudio(word.audioKey as FaTestAudioKey, { awaitFinish: true });
        await playFaAudio('feedback/afarin');
        markHeard(word.id);
      } else {
        const fa = parsed.fa || word?.fa || '';
        const en = parsed.en || word?.en || '';
        setResult({ word, fa, en, known: false });
        if (fa) setMissing(prev => (prev.includes(fa) ? prev : [...prev, fa]));
      }
    } finally {
      setAsking(false);
    }
  };

  const mood: BuddyMood = asking ? 'thinking' : result && result.known ? 'happy' : 'idle';
  const bigBtnH = Math.max(64, 76 * k);
  const smallBtnH = Math.max(64, 68 * k);
  const s = styles(k);
  return (
    <View style={s.root}>
      <GameTopBar title="Photo Farsi" titleFa="فارسی با عکس" />
      <GameBg pick={roomBackgroundPickers.bedroom} />
      <View style={s.body}>
        {/* Left: buddy + actions */}
        <View style={s.left}>
          <BuddyGuide mood={bookOpen ? 'idle' : mood} size={Math.min(150 * k, height * 0.32)} />
          {!photo ? (
            <CandyButton color={PLAY_ACCENTS.photo.color} edge={PLAY_ACCENTS.photo.edge} onPress={takePhoto} height={bigBtnH}>
              <Image source={neliWorldAssets.ui.camera} style={{ width: bigBtnH * 0.55, height: bigBtnH * 0.55 }} resizeMode="contain" />
              <Text style={[s.bigBtnText, dir('fa')]}>عکس بگیر</Text>
            </CandyButton>
          ) : (
            <CandyButton color={PLAY_ACCENTS.green.color} edge={PLAY_ACCENTS.green.edge} onPress={askNeli} disabled={asking} height={bigBtnH}>
              <Text style={[s.bigBtnText, dir('fa')]}>{asking ? '…' : 'نلی بگو'}</Text>
            </CandyButton>
          )}
          <View style={s.smallRow}>
            <TouchableOpacity style={s.smallBtn} onPress={() => { tap(); void choosePhoto(); }} activeOpacity={0.85} accessibilityRole="button">
              <Text style={{ fontSize: 30 * k }}>🖼️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.smallBtn} onPress={() => { tap(); setBookOpen(true); }} activeOpacity={0.85} accessibilityRole="button">
              <Image source={neliWorldAssets.ui.book} style={{ width: 36 * k, height: 36 * k }} resizeMode="contain" />
              <View style={s.heardBadge}>
                <Text style={s.heardText}>⭐ {heard.length}/15</Text>
              </View>
            </TouchableOpacity>
          </View>
          <Text style={[s.privacy, dir('fa'), { textAlign: 'center' }]}>عکس‌ها از دستگاه بیرون نمی‌رود</Text>
        </View>

        {/* Right: polaroid / thinking / answer */}
        <View style={s.right}>
          {!photo ? (
            <GameCard radius={22 * k} style={s.emptyCard}>
              <Text style={[s.emptyHint, dir('fa'), { textAlign: 'center' }]}>از اتاقت عکس بگیر</Text>
            </GameCard>
          ) : asking && !result ? (
            <GameCard radius={22 * k} style={s.thinkCard}>
              <ThinkingDots size={14 * k} />
            </GameCard>
          ) : result ? (
            <GameCard radius={22 * k} style={s.answerCard}>
              <WordArt art={result.word ? WORD_ART[result.word.id] : null} emoji={result.word?.emoji ?? '📷'} size={Math.min(110 * k, height * 0.26)} />
              <Text style={[s.answerFa, dir('fa'), { textAlign: 'center' }]}>{result.fa || '؟'}</Text>
              {result.known ? (
                <TouchableOpacity
                  style={s.replayBtn}
                  onPress={() => result.word && void speakEntry(result.word)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <Image source={neliWorldAssets.ui.voice} style={{ width: 40 * k, height: 40 * k }} resizeMode="contain" />
                </TouchableOpacity>
              ) : (
                <Text style={[s.noVoice, dir('fa'), { textAlign: 'center' }]}>مامان یا بابا بگوید!</Text>
              )}
            </GameCard>
          ) : (
            <View style={s.polaroid}>
              <Image source={{ uri: photo.uri }} style={s.polaroidPhoto} resizeMode="cover" />
            </View>
          )}
          {error ? <Text style={s.error}>{error}</Text> : null}
          {photo ? (
            <TouchableOpacity style={s.newPhotoBtn} onPress={() => { tap(); setPhoto(null); setResult(null); }} activeOpacity={0.85}>
              <Image source={neliWorldAssets.ui.camera} style={{ width: 34 * k, height: 34 * k }} resizeMode="contain" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Sticker book overlay (in-screen, never a Modal — iOS crash rule). */}
      {bookOpen ? (
        <View style={s.bookOverlay}>
          <GameCard radius={22 * k} style={s.bookCard}>
            <View style={s.bookHead}>
              <Text style={[s.bookTitle, dir('fa')]}>کلمات من</Text>
              <Text style={s.bookCount}>⭐ {heard.length}/15</Text>
              <TouchableOpacity style={s.bookClose} onPress={() => { tap(); setBookOpen(false); }} activeOpacity={0.85}>
                <Image source={neliWorldAssets.ui.close} style={{ width: 30 * k, height: 30 * k }} resizeMode="contain" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.bookGrid} showsVerticalScrollIndicator={false}>
              {PHOTO_FARSI_WORDS.map(w => {
                const hasVoice = w.audioKey != null && w.audioKey in FA_TEST_AUDIO;
                const done = heard.includes(w.id);
                return (
                  <TouchableOpacity
                    key={w.id}
                    style={[s.wordCard, done && s.wordDone]}
                    onPress={() => { void speakEntry(w); setBookOpen(false); }}
                    activeOpacity={0.85}
                  >
                    <WordArt art={WORD_ART[w.id]} emoji={w.emoji} size={44 * k} />
                    <Text style={[s.wordFa, dir('fa'), { textAlign: 'center' }]} numberOfLines={1}>{w.fa}</Text>
                    {hasVoice ? (
                      <Image source={neliWorldAssets.ui.voice} style={s.voiceBadge} resizeMode="contain" />
                    ) : (
                      <Text style={s.seedBadge}>🌱</Text>
                    )}
                    {done ? <Text style={s.doneStar}>⭐</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {missing.length > 0 ? (
              <Text style={s.missing} numberOfLines={1}>
                For mom &amp; dad 🌱 to record: {missing.join('، ')}
              </Text>
            ) : null}
          </GameCard>
        </View>
      ) : null}
    </View>
  );
}

const styles = (k: number) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: PLAY_INK },
    body: { flex: 1, flexDirection: 'row', paddingHorizontal: 14 * k, paddingBottom: 12 * k, columnGap: 12 * k },
    left: { width: '36%', alignItems: 'center', justifyContent: 'center', rowGap: 10 * k },
    bigBtnText: { fontFamily: ff('fa', 'black'), color: '#FFFFFF', fontSize: 24 * k },
    smallRow: { flexDirection: 'row', gap: 10 * k },
    smallBtn: {
      width: Math.max(64, 68 * k),
      height: Math.max(64, 68 * k),
      borderRadius: 20 * k,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: 'rgba(45,27,105,0.30)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 6,
      elevation: 5,
    },
    heardBadge: { position: 'absolute', bottom: -8 * k, backgroundColor: '#FFB800', borderRadius: 10 * k, paddingHorizontal: 6 * k },
    heardText: { fontSize: 11 * k, fontFamily: ff('en', 'black'), color: PLAY_INK },
    privacy: { fontFamily: ff('fa', 'regular'), color: '#FFFFFF', fontSize: 12 * k, opacity: 0.9 },
    right: { flex: 1, rowGap: 8 * k, minHeight: 0, alignItems: 'center', justifyContent: 'center' },
    emptyCard: { width: '100%', paddingVertical: 30 * k, alignItems: 'center' },
    emptyHint: { fontFamily: ff('fa', 'black'), color: PLAY_INK, fontSize: 20 * k },
    thinkCard: { width: '100%', paddingVertical: 30 * k, alignItems: 'center' },
    answerCard: { width: '100%', alignItems: 'center', paddingVertical: 12 * k, rowGap: 6 * k },
    answerFa: { fontFamily: ff('fa', 'black'), color: PLAY_INK, fontSize: 34 * k },
    replayBtn: {
      width: Math.max(64, 64 * k),
      height: Math.max(64, 64 * k),
      borderRadius: 20 * k,
      backgroundColor: '#FFB800',
      alignItems: 'center',
      justifyContent: 'center',
    },
    noVoice: { fontFamily: ff('fa', 'black'), color: '#B45309', fontSize: 14 * k },
    polaroid: {
      backgroundColor: '#FFFFFF',
      borderRadius: 8 * k,
      padding: 10 * k,
      paddingBottom: 26 * k,
      width: '92%',
      flex: 1,
      minHeight: 0,
      shadowColor: 'rgba(45,27,105,0.35)',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 7,
    },
    polaroidPhoto: { width: '100%', flex: 1, minHeight: 0, borderRadius: 4 * k },
    error: { color: '#DC2626', backgroundColor: '#FFFFFF', borderRadius: 10 * k, paddingHorizontal: 10 * k, paddingVertical: 4 * k, fontSize: 12 * k, overflow: 'hidden' },
    newPhotoBtn: {
      width: Math.max(64, 64 * k),
      height: Math.max(64, 64 * k),
      borderRadius: 20 * k,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bookOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(46,26,107,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16 * k,
      zIndex: 50,
      elevation: 50,
    },
    bookCard: { width: '94%', height: '92%', padding: 12 * k },
    bookHead: { flexDirection: 'row', alignItems: 'center', columnGap: 10 * k, marginBottom: 8 * k },
    bookTitle: { fontFamily: ff('fa', 'black'), color: PLAY_INK, fontSize: 22 * k, flex: 1, textAlign: 'center' },
    bookCount: { fontSize: 14 * k, fontFamily: ff('en', 'black'), color: PLAY_INK },
    bookClose: { width: Math.max(48, 52 * k), height: Math.max(48, 52 * k), alignItems: 'center', justifyContent: 'center' },
    bookGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 * k, paddingBottom: 4 * k },
    wordCard: {
      width: '31.5%',
      borderRadius: 16 * k,
      backgroundColor: '#FFF6E5',
      alignItems: 'center',
      paddingVertical: 6 * k,
    },
    wordDone: { borderWidth: 2 * k, borderColor: '#22C55E' },
    wordFa: { fontFamily: ff('fa', 'black'), color: PLAY_INK, fontSize: 15 * k },
    voiceBadge: { position: 'absolute', top: 3 * k, left: 6 * k, width: 14 * k, height: 14 * k },
    seedBadge: { position: 'absolute', top: 3 * k, left: 6 * k, fontSize: 10 * k },
    doneStar: { position: 'absolute', top: 3 * k, right: 6 * k, fontSize: 10 * k },
    missing: { color: PLAY_INK, fontSize: 11 * k, marginTop: 6 * k },
  });
