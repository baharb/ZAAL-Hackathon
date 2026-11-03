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
import { Svg, Rect, Circle, Path } from 'react-native-svg';
import { useWindowDimensions } from '../../layout/PortraitFallback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNav } from '../../store/NavContext';
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
  SoftShadow,
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

/** Simple drawn picture icon (no gallery art exists in ui-icons). */
function PictureIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect x={4} y={8} width={40} height={32} rx={7} fill="#22D3EE" />
      <Circle cx={16} cy={18} r={5} fill="#FFFFFF" />
      <Path d="M6 36 L20 22 L30 32 L34 28 L42 36 Z" fill="#22C55E" />
    </Svg>
  );
}

/** Open sticker book with colored pages (the ui book asset reads as pause). */
function OpenBookIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M24 9 C18 5 10 5 5 7 L5 38 C10 36 18 36 24 40 C30 36 38 36 43 38 L43 7 C38 5 30 5 24 9 Z" fill="#7C3AED" />
      <Path d="M24 13 C19 10 12 10 8 11 L8 34 C12 33 19 33 24 36 Z" fill="#FFE066" />
      <Path d="M24 13 C29 10 36 10 40 11 L40 34 C36 33 29 33 24 36 Z" fill="#FDA4AF" />
      <Path d="M12 18 L20 19.5 M12 23 L20 24.5" stroke="#B45309" strokeWidth={2} strokeLinecap="round" />
      <Path d="M28 19.5 L36 18 M28 24.5 L36 23" stroke="#9F1239" strokeWidth={2} strokeLinecap="round" />
      <Path d="M24 13 L24 36" stroke="#7C3AED" strokeWidth={2} />
    </Svg>
  );
}

export default function PhotoFarsiGame() {
  const { width: W, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { navigate } = useNav();
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

  // Neli asks for a photo as the screen opens, and again when tapped.
  useEffect(() => {
    if ('photo/take-photo' in FA_TEST_AUDIO) void playFaAudio('photo/take-photo');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speakTakePhoto = () => {
    tap();
    if ('photo/take-photo' in FA_TEST_AUDIO) void playFaAudio('photo/take-photo');
  };

  const openBook = () => {
    tap();
    setBookOpen(true);
    if ('photo/my-words' in FA_TEST_AUDIO) void playFaAudio('photo/my-words');
  };

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
      setError('این عکس نشد، یه عکس دیگه بگیر');
      return;
    }
    if (base64.length > MAX_IMAGE_BASE64_CHARS) {
      setError('این عکس خیلی بزرگه، با دوربین بگیر');
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
        setError('دوربین خاموشه، کلمات رو بزن');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.5, base64: true, exif: false });
      if (!res.canceled) handlePicked(res.assets[0]?.uri, res.assets[0]?.base64);
    } catch {
      setError('دوربین باز نشد، کلمات رو بزن');
    }
  };

  const choosePhoto = async () => {
    tap();
    setError(null);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError('گالری خاموشه، کلمات رو بزن');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: false, quality: 0.5, base64: true, exif: false });
      if (!res.canceled) handlePicked(res.assets[0]?.uri, res.assets[0]?.base64);
    } catch {
      setError('گالری باز نشد، کلمات رو بزن');
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
        setError('نلی الان نمی‌تونه، دوباره امتحان کن');
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
  // Scene: buddy stands big on the floor (bottom-anchored, never mid-air),
  // bubble right over her head, the big yellow camera square bottom-center.
  // One line of text, never wrapped.
  const camS = Math.min(height * 0.3, 150 * k);
  const miniS = Math.max(56, 60 * k);
  const ctrlL = (W - (miniS * 2 + camS + 24 * k)) / 2;
  // Never reach into the camera row: on squarer screens the controls start
  // left of where a full-height buddy would end.
  const buddyS = Math.min(200 * k, height * 0.44, Math.max(120, ctrlL - 24));
  const closeS = Math.max(48, 52 * k);
  const bubbleFa = !photo ? 'از اتاقت عکس بگیر' : (!result ? 'بزن نلی بگه!' : null);
  const s = styles(k);
  return (
    <View style={s.root}>
      <GameBg pick={roomBackgroundPickers.bedroom} />
      {/* Floating navy close only — no title bar. */}
      <TouchableOpacity
        onPress={() => navigate({ name: 'MagicGames' })}
        activeOpacity={0.8}
        accessibilityRole="button"
        style={[s.closeBtn, { top: insets.top + 8, left: 12, width: closeS, height: closeS, borderRadius: closeS / 2 }]}
      >
        <Image source={neliWorldAssets.ui.close} style={{ width: closeS * 0.55, height: closeS * 0.55 }} resizeMode="contain" />
      </TouchableOpacity>
      <View style={s.body}>
        {/* Buddy stands on the pink floor, feet at the screen bottom, bubble
            up-right of her head (never under the close button). */}
        <View style={s.left}>
          {bubbleFa ? (
            <View style={s.bubble}>
              <Text style={[s.bubbleText, dir('fa'), { textAlign: 'center' }]} numberOfLines={1}>{bubbleFa}</Text>
              <View style={s.bubbleTail} />
            </View>
          ) : null}
          <TouchableOpacity onPress={speakTakePhoto} activeOpacity={0.85} accessibilityRole="button">
            <BuddyGuide mood={bookOpen ? 'idle' : mood} size={buddyS} />
          </TouchableOpacity>
          <SoftShadow width={buddyS} />
        </View>

        {/* Right: polaroid / thinking / answer (kept above the camera). */}
        <View style={[s.right, { paddingBottom: camS + 20 * k }]}>
          {!photo ? null : asking && !result ? (
            <GameCard radius={22 * k} style={s.thinkCard}>
              <ThinkingDots size={14 * k} />
            </GameCard>
          ) : result ? (
            <GameCard radius={22 * k} style={s.answerCard}>
              {result.word ? (
                <WordArt art={WORD_ART[result.word.id]} emoji={result.word.emoji} size={Math.min(110 * k, height * 0.26)} />
              ) : (
                <PictureIcon size={Math.min(110 * k, height * 0.26)} />
              )}
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
        </View>
      </View>
      {error ? (
        <View style={[s.errorWrap, { bottom: camS + 26 * k }]} pointerEvents="none">
          <Text style={[s.error, dir('fa'), { textAlign: 'center' }]}>{error}</Text>
        </View>
      ) : null}
      {/* Bottom-center controls: big yellow camera square, flanked by gallery and book. */}
      <View style={[s.controls, { bottom: 10 * k, columnGap: 12 * k }]} pointerEvents="box-none">
        <TouchableOpacity
          style={[s.smallBtn, { width: miniS, height: miniS, borderRadius: 18 * k }]}
          onPress={() => { tap(); photo ? (setPhoto(null), setResult(null)) : void choosePhoto(); }}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          {photo ? (
            <Image source={neliWorldAssets.ui.camera} style={{ width: 32 * k, height: 32 * k }} resizeMode="contain" />
          ) : (
            <PictureIcon size={32 * k} />
          )}
        </TouchableOpacity>
        {!photo ? (
          <TouchableOpacity
            style={[s.camBtn, { width: camS, height: camS, borderRadius: 22 * k }]}
            onPress={takePhoto}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Image source={neliWorldAssets.ui.camera} style={{ width: camS * 0.44, height: camS * 0.44 }} resizeMode="contain" />
            <Text style={[s.camText, dir('fa')]} numberOfLines={1}>عکس بگیر</Text>
          </TouchableOpacity>
        ) : (
          <CandyButton
            color={PLAY_ACCENTS.green.color}
            edge={PLAY_ACCENTS.green.edge}
            onPress={askNeli}
            disabled={asking}
            height={camS * 0.72}
          >
            <Text style={[s.bigBtnText, dir('fa')]} numberOfLines={1}>{asking ? '…' : 'نلی بگو'}</Text>
          </CandyButton>
        )}
        <TouchableOpacity
          style={[s.smallBtn, { width: miniS, height: miniS, borderRadius: 18 * k }]}
          onPress={openBook}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <OpenBookIcon size={40 * k} />
          <View style={s.heardBadge}>
            <Text style={s.heardText}>★ {heard.length}/{PHOTO_FARSI_WORDS.length}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Privacy: small cream pill pinned bottom-right, clear of her feet. */}
      <View style={[s.privacyPill, { bottom: 10 * k, right: 12 }]} pointerEvents="none">
        <Text style={[s.privacy, dir('fa'), { textAlign: 'center' }]} numberOfLines={1}>عکس‌ها از دستگاه بیرون نمی‌رود</Text>
      </View>

      {/* Sticker book overlay (in-screen, never a Modal — iOS crash rule). */}
      {bookOpen ? (
        <View style={s.bookOverlay}>
          <GameCard radius={22 * k} style={s.bookCard}>
            <View style={s.bookHead}>
              <Text style={[s.bookTitle, dir('fa')]}>کلمات من</Text>
              <Text style={s.bookCount}>★ {heard.length}/{PHOTO_FARSI_WORDS.length}</Text>
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
                    <View style={s.wordBox}>
                      <WordArt art={WORD_ART[w.id]} emoji={w.emoji} size={46 * k} />
                    </View>
                    <Text style={[s.wordFa, dir('fa'), { textAlign: 'center' }]} numberOfLines={1}>{w.fa}</Text>
                    {hasVoice ? (
                      <Image source={neliWorldAssets.ui.voice} style={s.voiceBadge} resizeMode="contain" />
                    ) : (
                      <Image source={neliWorldAssets.ui.microphone} style={s.voiceBadge} resizeMode="contain" />
                    )}
                    {done ? <Text style={s.doneStar}>★</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {missing.length > 0 ? (
              <Text style={[s.missing, dir('fa'), { textAlign: 'center' }]} numberOfLines={1}>
                🌱 مامان و بابا اینا رو ضبط کنن: {missing.join('، ')}
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
    closeBtn: {
      position: 'absolute',
      backgroundColor: 'rgba(20,16,60,0.85)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    body: { flex: 1, flexDirection: 'row', paddingHorizontal: 14 * k, columnGap: 12 * k },
    left: { width: '34%', alignItems: 'flex-start', justifyContent: 'flex-end', rowGap: 6 * k, paddingLeft: 12 },
    bubble: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16 * k,
      paddingHorizontal: 14 * k,
      paddingVertical: 8 * k,
      alignSelf: 'flex-end',
      width: '96%',
      shadowColor: 'rgba(45,27,105,0.30)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 6,
      elevation: 5,
    },
    bubbleText: { fontFamily: ff('fa', 'black'), color: PLAY_INK, fontSize: 15 * k },
    bubbleTail: {
      position: 'absolute',
      bottom: -7 * k,
      left: '28%',
      width: 14 * k,
      height: 14 * k,
      backgroundColor: '#FFFFFF',
      transform: [{ rotate: '45deg' }],
    },
    bigBtnText: { fontFamily: ff('fa', 'black'), color: '#FFFFFF', fontSize: 22 * k },
    controls: {
      position: 'absolute',
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    camBtn: {
      backgroundColor: '#FFB800',
      alignItems: 'center',
      justifyContent: 'center',
      rowGap: 2 * k,
      shadowColor: 'rgba(45,27,105,0.30)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 6,
      elevation: 5,
    },
    camText: { fontFamily: ff('fa', 'black'), color: PLAY_INK, fontSize: 18 * k },
    smallBtn: {
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
    privacyPill: {
      position: 'absolute',
      backgroundColor: 'rgba(255,253,245,0.95)',
      borderRadius: 999,
      paddingHorizontal: 12 * k,
      paddingVertical: 4 * k,
      maxWidth: '24%',
    },
    privacy: { fontFamily: ff('fa', 'regular'), color: PLAY_INK, fontSize: 11 * k },
    right: { flex: 1, rowGap: 8 * k, minHeight: 0, alignItems: 'center', justifyContent: 'center' },
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
    errorWrap: { position: 'absolute', alignSelf: 'center', maxWidth: '86%' },
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
    wordBox: { width: 56 * k, height: 56 * k, alignItems: 'center', justifyContent: 'center' },
    wordFa: { fontFamily: ff('fa', 'black'), color: PLAY_INK, fontSize: 15 * k },
    voiceBadge: { position: 'absolute', top: 3 * k, left: 6 * k, width: 14 * k, height: 14 * k },
    seedBadge: { position: 'absolute', top: 3 * k, left: 6 * k, fontSize: 10 * k },
    doneStar: { position: 'absolute', top: 3 * k, right: 6 * k, fontSize: 10 * k },
    missing: { color: PLAY_INK, fontSize: 11 * k, marginTop: 6 * k },
  });
