// Photo Farsi — Meta hackathon game. A child photographs their room, Neli
// (Muse Spark through the Supabase Edge Function) names what it sees, and
// the app speaks the word ONLY when a recorded voice file already exists.
// Unknown words show text with a parent note; Farsi is never synthesized
// on-device (iPhones have no Persian voice — garbled audio is worse than
// silence). Photos are processed and discarded; nothing is stored.

import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useWindowDimensions } from '../../layout/PortraitFallback';
import TopBar from '../../components/TopBar';
import { dir, ff } from '../../theme/fonts';
import { FA_TEST_AUDIO, FaTestAudioKey } from '../../assets/faTestAudio.generated';
import { playFaAudio, stopFaAudio } from '../../utils/faAudio';
import { askMeta } from '../../services/metaAI';
import { PHOTO_FARSI_WORDS, PHOTO_FARSI_IDS, PhotoFarsiWord, findPhotoFarsiWord } from '../../data/photoFarsiWords';

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
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { fa: '', en: '', wordId: null };
  try {
    const obj = JSON.parse(match[0]);
    return {
      fa: typeof obj.fa === 'string' ? obj.fa.slice(0, 40) : '',
      en: typeof obj.en === 'string' ? obj.en.slice(0, 40) : '',
      wordId: typeof obj.wordId === 'string' ? obj.wordId : null,
    };
  } catch {
    return { fa: '', en: '', wordId: null };
  }
}

function tap() {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // haptics are best-effort (web has none)
  }
}

export default function PhotoFarsiGame() {
  const { width, height } = useWindowDimensions();
  const k = height / REFERENCE_H;
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heard, setHeard] = useState<string[]>([]);
  const [missing, setMissing] = useState<string[]>([]);

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
      const res = await askMeta({ prompt: ASK_PROMPT, imageBase64: photo.base64, system: askSystem(), maxTokens: 150 });
      if ('error' in res) {
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

  const s = styles(k);
  return (
    <View style={s.root}>
      <TopBar title="Photo Farsi" titleFa="فارسی با عکس" showBack />
      <View style={s.body}>
        {/* Left: the photo box */}
        <View style={s.left}>
          <View style={s.photoBox}>
            {photo ? (
              <Image source={{ uri: photo.uri }} style={s.photo} resizeMode="cover" />
            ) : (
              <View style={s.photoEmpty}>
                <Text style={s.photoEmoji}>📷</Text>
                <Text style={[s.hint, dir('fa'), { textAlign: 'center' }]}>از اتاقت عکس بگیر</Text>
                <Text style={s.hintEn}>Take a photo of your room</Text>
              </View>
            )}
          </View>
          <View style={s.btnRow}>
            <TouchableOpacity style={s.smallBtn} onPress={takePhoto} activeOpacity={0.85}>
              <Text style={s.smallBtnText}>📷</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.smallBtn} onPress={choosePhoto} activeOpacity={0.85}>
              <Text style={s.smallBtnText}>🖼️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.askBtn, (!photo || asking) && s.askBtnOff]}
              onPress={askNeli}
              disabled={!photo || asking}
              activeOpacity={0.85}
            >
              <Text style={s.askBtnText}>{asking ? '✨ …' : '✨ Ask Neli'}</Text>
            </TouchableOpacity>
          </View>
          {error ? <Text style={s.error}>{error}</Text> : null}
          <Text style={s.steps}>1. Photo   2. Ask   3. Listen ⭐</Text>
        </View>

        {/* Right: what Neli says + the 15 word cards */}
        <View style={s.right}>
          <View style={s.resultCard}>
            {result ? (
              <>
                <Text style={[s.resultFa, dir('fa'), { textAlign: 'center' }]}>{result.fa || '؟'}</Text>
                {result.en ? <Text style={s.resultEn}>{result.en}</Text> : null}
                {result.known ? (
                  <TouchableOpacity
                    style={s.replayBtn}
                    onPress={() => result.word && void speakEntry(result.word)}
                    activeOpacity={0.85}
                  >
                    <Text style={s.replayText}>🔊 Again</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={s.noVoice}>🌱 No voice yet — ask mom or dad to say it!</Text>
                )}
              </>
            ) : (
              <>
                <Text style={s.resultNeli}>✨ Neli is ready</Text>
                <Text style={[s.hint, dir('fa'), { textAlign: 'center' }]}>یک کارت را بزن یا عکس بگیر</Text>
              </>
            )}
            <View style={s.starChip}>
              <Text style={s.starText}>⭐ {heard.length}/15</Text>
            </View>
          </View>
          <ScrollView style={s.grid} contentContainerStyle={s.gridInner} showsVerticalScrollIndicator={false}>
            {PHOTO_FARSI_WORDS.map(w => {
              const hasVoice = w.audioKey != null && w.audioKey in FA_TEST_AUDIO;
              const done = heard.includes(w.id);
              return (
                <TouchableOpacity
                  key={w.id}
                  style={[s.card, done && s.cardDone]}
                  onPress={() => void speakEntry(w)}
                  activeOpacity={0.85}
                >
                  <Text style={s.cardEmoji}>{w.emoji}</Text>
                  <Text style={[s.cardFa, dir('fa'), { textAlign: 'center' }]} numberOfLines={1}>{w.fa}</Text>
                  <Text style={s.cardEn} numberOfLines={1}>{w.en}</Text>
                  <Text style={s.cardBadge}>{hasVoice ? '🔊' : '🌱'}</Text>
                  {done ? <Text style={s.cardStar}>⭐</Text> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {missing.length > 0 ? (
            <Text style={s.missing} numberOfLines={1}>
              For mom &amp; dad 🌱 to record: {missing.join('، ')}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = (k: number) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: '#35217E' },
    body: { flex: 1, flexDirection: 'row', paddingHorizontal: 16 * k, paddingBottom: 12 * k, columnGap: 12 * k },
    left: { width: '38%', rowGap: 8 * k },
    photoBox: {
      flex: 1,
      minHeight: 0,
      borderRadius: 24 * k,
      overflow: 'hidden',
      backgroundColor: '#FFF6E5',
      borderWidth: 3 * k,
      borderColor: '#FACC15',
      borderStyle: 'dashed',
    },
    photo: { width: '100%', height: '100%' },
    photoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', rowGap: 4 * k, padding: 10 * k },
    photoEmoji: { fontSize: 56 * k },
    hint: { fontFamily: ff('fa', 'black'), color: '#6C4EFF', fontSize: 17 * k },
    hintEn: { color: '#8A7BB8', fontSize: 13 * k },
    btnRow: { flexDirection: 'row', columnGap: 8 * k },
    smallBtn: {
      width: 52 * k,
      height: 52 * k,
      borderRadius: 16 * k,
      backgroundColor: '#FFF6E5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    smallBtnText: { fontSize: 24 * k },
    askBtn: {
      flex: 1,
      height: 52 * k,
      borderRadius: 16 * k,
      backgroundColor: '#22C55E',
      alignItems: 'center',
      justifyContent: 'center',
    },
    askBtnOff: { backgroundColor: '#8A7BB8' },
    askBtnText: { color: '#FFFFFF', fontSize: 18 * k, fontFamily: ff('en', 'black') },
    error: { color: '#FDA4AF', fontSize: 12 * k },
    steps: { color: '#C4B5FD', fontSize: 12 * k },
    right: { flex: 1, rowGap: 8 * k, minHeight: 0 },
    resultCard: {
      borderRadius: 20 * k,
      backgroundColor: '#FFF6E5',
      paddingVertical: 8 * k,
      paddingHorizontal: 12 * k,
      alignItems: 'center',
      minHeight: 96 * k,
      justifyContent: 'center',
    },
    resultFa: { fontFamily: ff('fa', 'black'), color: '#2D1B69', fontSize: 30 * k },
    resultEn: { color: '#8A7BB8', fontSize: 14 * k },
    resultNeli: { fontSize: 18 * k, fontFamily: ff('en', 'black'), color: '#6C4EFF' },
    replayBtn: { marginTop: 4 * k, backgroundColor: '#6C4EFF', borderRadius: 12 * k, paddingHorizontal: 14 * k, paddingVertical: 4 * k },
    replayText: { color: '#FFFFFF', fontSize: 14 * k },
    noVoice: { marginTop: 4 * k, color: '#B45309', fontSize: 12 * k, textAlign: 'center' },
    starChip: { position: 'absolute', top: 6 * k, right: 8 * k, backgroundColor: '#FACC15', borderRadius: 10 * k, paddingHorizontal: 8 * k, paddingVertical: 2 * k },
    starText: { fontSize: 12 * k, fontFamily: ff('en', 'black'), color: '#2D1B69' },
    grid: { flex: 1, minHeight: 0 },
    gridInner: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 * k, paddingBottom: 4 * k },
    card: {
      width: '31.5%',
      borderRadius: 16 * k,
      backgroundColor: '#FFF6E5',
      alignItems: 'center',
      paddingVertical: 6 * k,
    },
    cardDone: { borderWidth: 2 * k, borderColor: '#22C55E' },
    cardEmoji: { fontSize: 26 * k },
    cardFa: { fontFamily: ff('fa', 'black'), color: '#2D1B69', fontSize: 15 * k },
    cardEn: { color: '#8A7BB8', fontSize: 11 * k },
    cardBadge: { position: 'absolute', top: 3 * k, left: 6 * k, fontSize: 10 * k },
    cardStar: { position: 'absolute', top: 3 * k, right: 6 * k, fontSize: 10 * k },
    missing: { color: '#FDE68A', fontSize: 11 * k },
  });
