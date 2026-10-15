import React, { useContext, useEffect, useRef, useState } from 'react';
import { Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../../layout/PortraitFallback';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopBar, { topBarHeight } from '../../components/TopBar';
import { neliWorldAssets, roomBackgroundPickers } from '../../assets/neliWorldAssets';
import { characterAssets } from '../../assets/characterAssets';
import { AppContext } from '../../store/AppContext';
import { useNav } from '../../store/NavContext';
import { FA_AUDIO_KEYS, getCountingNumberAudioKey, getFeedbackAudioKey, playFaAudioSequence, speakWithGeneratedVoice, stopFaAudio } from '../../utils/faAudio';
import { C } from '../../theme/colors';
import { dir, ff } from '../../theme/fonts';

const OBJECT_SETS = [
  { name: 'apples', fa: 'سیب', en: 'apple', image: neliWorldAssets.foods.apple },
  { name: 'carrots', fa: 'هویج', en: 'carrot', image: neliWorldAssets.foods.carrot },
  { name: 'stars', fa: 'ستاره', en: 'star', image: neliWorldAssets.ui.star },
  { name: 'fish', fa: 'ماهی', en: 'fish', image: neliWorldAssets.foods.fish },
];

const objectTransforms: Array<any[]> = [
  [{ translateY: -20 }, { rotate: '-8deg' }],
  [{ translateY: 12 }, { rotate: '7deg' }],
  [{ translateY: -6 }, { rotate: '4deg' }],
  [{ translateY: 18 }, { rotate: '-5deg' }],
  [{ translateY: -14 }, { rotate: '9deg' }],
  [{ translateY: 8 }, { rotate: '-9deg' }],
  [{ translateY: -2 }, { rotate: '6deg' }],
  [{ translateY: 22 }, { rotate: '-3deg' }],
  [{ translateY: -18 }, { rotate: '3deg' }],
];

const FA_NUMBERS = ['\u06cc\u06a9', '\u062f\u0648', '\u0633\u0647', '\u0686\u0647\u0627\u0631', '\u067e\u0646\u062c', '\u0634\u0634', '\u0647\u0641\u062a', '\u0647\u0634\u062a', '\u0646\u0647', '\u062f\u0647'];
// Shortest time an answer stays on screen before the next question, even if
// the voice is missing or cut short.
const MIN_FEEDBACK_MS = 1800;

const FA_DIGITS = ['\u06f0', '\u06f1', '\u06f2', '\u06f3', '\u06f4', '\u06f5', '\u06f6', '\u06f7', '\u06f8', '\u06f9'];

function toFaDigits(value: number | string) {
  return String(value).replace(/\d/g, digit => FA_DIGITS[Number(digit)]);
}

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function makeRound() {
  const count = Math.floor(Math.random() * 9) + 1;
  const set = OBJECT_SETS[Math.floor(Math.random() * OBJECT_SETS.length)];
  const options = new Set([count]);
  while (options.size < 4) options.add(Math.floor(Math.random() * 10) + 1);
  return { count, set, options: shuffle([...options]) };
}

export default function CountingGame() {
  const { lang, addStars } = useContext(AppContext);
  const { reset: resetNav } = useNav();
  const [round, setRound] = useState(makeRound);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [countedItems, setCountedItems] = useState<number[]>([]);
  const { width, height } = useWindowDimensions();
  const isFa = lang === 'fa' || lang === 'ar';
  // Nothing here scaled off screen size at all — the question pill was an
  // absolute overlay at a fixed top while objectGarden (below it) centered
  // itself in the full content height independently, the same overlap
  // pattern fixed elsewhere in this pass. The owl's flat 340x420 also had
  // no ceiling, so on a short phone it rendered almost entirely above the
  // visible area (bottom:66 anchors its bottom, and a 420pt-tall image is
  // taller than the whole screen). Scale everything below the tablet
  // breakpoint; untouched above it.
  const heightScale = Math.min(1, height / 620);
  const insets = useSafeAreaInsets();
  const barH = topBarHeight(height, insets.top);
  // The answer tray was a fixed 78pt row under a fixed 120pt content
  // padding, which left the pill + garden ~180pt on a phone — less than
  // they need, so the centred column spilled up over the TopBar.
  const numBtnH = Math.max(54, Math.round(78 * heightScale));
  const numBtnW = Math.max(84, Math.round(112 * heightScale));
  const trayPadTop = Math.round(12 * heightScale);
  const trayPadBottom = Math.max(10, Math.round(18 * heightScale));
  const trayH = numBtnH + trayPadTop + trayPadBottom;
  const kickerSize = Math.max(18, Math.round(25 * heightScale));
  // The owl's bottom is anchored above the tray, so its height must also
  // stop at the bar — 420 × heightScale alone put its ears over the title.
  const owlBottom = Math.round(66 * heightScale);
  const owlH = Math.max(120, Math.min(Math.round(420 * heightScale), height - barH - owlBottom - 6));
  const owlW = Math.round(owlH * (340 / 420));

  useEffect(() => {
    void stopFaAudio();
    const id = setTimeout(() => {
      void playFaAudioSequence([FA_AUDIO_KEYS.counting.info], 110);
    }, 450);
    return () => clearTimeout(id);
  }, []);

  const tapItem = (index: number) => {
    if (countedItems.includes(index)) return;
    setCountedItems(prev => [...prev, index]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Leaving the screen mid-feedback must not advance a round on an unmounted
  // component, and must stop the voice.
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
    void stopFaAudio();
  }, []);

  const handleAnswer = async (n: number) => {
    if (feedback !== null) return;
    const correct = n === round.count;
    setFeedback(correct);
    if (correct) {
      addStars(2);
      setScore(prev => prev + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    // Right: \u00ab\u0622\u0641\u0631\u06cc\u0646\u00bb + number. Wrong: \u00ab\u0627\u0634\u062a\u0628\u0627\u0647\u0647\u00bb + right number + \u00ab\u062f\u0631\u0633\u062a\u0647\u00bb.
    // A clip with no recording is skipped rather than spoken by TTS (iOS has
    // no Persian voice).
    const numberKey = getCountingNumberAudioKey(round.count);
    const keys = correct
      ? [getFeedbackAudioKey('afarin'), numberKey]
      : [getFeedbackAudioKey('wrong'), numberKey, getFeedbackAudioKey('correct')];
    const startedAt = Date.now();
    if (numberKey) {
      await playFaAudioSequence(keys.filter((k): k is NonNullable<typeof k> => k !== null), 120);
    } else {
      await speakWithGeneratedVoice(FA_NUMBERS[round.count - 1] ?? String(round.count), 'fa-IR', { interrupt: true, rate: 0.74, pitch: 1.14 });
    }

    // Hold the highlighted answer on screen after the voice so the child
    // can see it: a little longer after a mistake, never under MIN_FEEDBACK_MS.
    const holdMs = correct ? 900 : 1400;
    const remaining = Math.max(holdMs, MIN_FEEDBACK_MS - (Date.now() - startedAt));
    await new Promise(resolve => setTimeout(resolve, remaining));
    if (!mountedRef.current) return;
    setFeedback(null);
    setCountedItems([]);
    setRound(makeRound());
  };

  return (
    <View style={styles.root}>
      <ImageBackground source={roomBackgroundPickers.garden(width, height)} style={styles.scene} imageStyle={styles.sceneImage}>
        <View style={styles.sceneWash} />
        <View style={styles.skyGlow} />
        <TopBar title="Counting" titleFa="بشمار" showClose dark onBack={() => resetNav({ name: 'Main', tab: 'Games' })} />

        <View style={[styles.content, { paddingBottom: trayH + 8 }]}>
          <View style={[styles.questionPill, { marginBottom: Math.round(14 * heightScale), paddingVertical: Math.max(6, Math.round(10 * heightScale)) }]}>
            <Text style={[styles.kicker, { fontFamily: ff(lang, 'black'), fontSize: kickerSize, lineHeight: Math.round(kickerSize * 1.36) }, dir(lang)]}>
              {isFa ? 'چند تا می‌بینی؟' : 'How many do you see?'}
            </Text>
          </View>

          <Image
            source={characterAssets.aidin.poses.thinking}
            style={[styles.owl, { width: owlW, height: owlH, bottom: owlBottom }]}
            resizeMode="contain"
          />

          <View
            style={[
              styles.objectGarden,
              { minWidth: Math.max(260, Math.round(390 * heightScale)), minHeight: Math.max(80, Math.round(220 * heightScale)), gap: Math.max(8, Math.round(18 * heightScale)) },
            ]}
          >
            {Array.from({ length: round.count }).map((_, i) => {
              const counted = countedItems.includes(i);
              const itemSize = Math.max(52, Math.round(82 * heightScale));
              const imageSize = Math.max(44, Math.round(70 * heightScale));
              return (
                <TouchableOpacity
                  key={`${round.set.name}-${i}`}
                  style={[styles.countItem, { width: itemSize, height: itemSize }]}
                  onPress={() => tapItem(i)}
                  activeOpacity={counted ? 1 : 0.82}
                >
                  <Image
                    source={round.set.image}
                    style={[
                      styles.countImage,
                      { width: imageSize, height: imageSize },
                      {
                        transform: [
                          ...objectTransforms[i % objectTransforms.length].map(t =>
                            'translateY' in t ? { translateY: t.translateY * heightScale } : t,
                          ),
                          ...(counted ? [{ scale: 1.15 }] : []),
                        ],
                      },
                    ]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.bottomTray, { paddingTop: trayPadTop, paddingBottom: trayPadBottom }]}>
          <View style={[styles.options, { gap: Math.max(10, Math.round(16 * heightScale)) }]}>
            {round.options.map(n => {
              const selectedWrong = feedback === false && n !== round.count;
              const selectedRight = feedback !== null && n === round.count;
              return (
                <TouchableOpacity
                  key={n}
                  style={[styles.numBtn, { width: numBtnW, height: numBtnH }, selectedRight && styles.numBtnRight, selectedWrong && styles.numBtnDim]}
                  onPress={() => handleAnswer(n)}
                  activeOpacity={0.86}
                >
                  <Text style={[styles.numText, { fontSize: Math.max(28, Math.round(38 * heightScale)) }]}>{toFaDigits(n)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {feedback !== null ? (
          <View style={[styles.feedback, { bottom: trayH + 6 }, feedback ? styles.feedbackGood : styles.feedbackBad]}>
            <Text style={[styles.feedbackText, { fontFamily: ff(isFa ? 'fa' : lang, 'black') }]}>
              {feedback
                ? (isFa ? `\u0622\u0641\u0631\u06cc\u0646! ${toFaDigits(round.count)}` : `Well done! ${round.count}`)
                : (isFa ? `\u0627\u0634\u062a\u0628\u0627\u0647\u0647! ${toFaDigits(round.count)} \u062f\u0631\u0633\u062a\u0647` : `Oops! ${round.count} is right`)}
            </Text>
          </View>
        ) : null}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7FFF4' },
  scene: { flex: 1 },
  sceneImage: { width: '100%', height: '100%', opacity: 0.42 },
  sceneWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.42)' },
  skyGlow: {
    position: 'absolute',
    right: -80,
    top: -86,
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: 'rgba(186,230,253,0.58)',
  },
  score: {
    minWidth: 52,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    color: C.textDark,
    fontFamily: ff('fa', 'black'),
    fontSize: 17,
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingTop: 9,
    borderWidth: 2,
    borderColor: '#B9F6CA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionPill: {
    alignSelf: 'center',
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#14532D',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  kicker: { color: C.textDark, fontSize: 25, lineHeight: 34, textAlign: 'center' },
  owl: {
    position: 'absolute',
    left: -10,
    bottom: 66,
    width: 340,
    height: 420,
  },
  objectGarden: {
    width: '60%',
    minWidth: 390,
    maxWidth: 620,
    minHeight: 220,
    borderRadius: 40,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
  },
  countItem: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countImage: { width: 70, height: 70 },
  bottomTray: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 34,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: 'transparent',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0,
  },
  options: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  numBtn: {
    width: 112,
    height: 78,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#14532D',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  numBtnRight: { backgroundColor: '#ECFDF3', borderColor: '#22C55E' },
  numBtnDim: { opacity: 0.5 },
  numText: { fontFamily: ff('fa', 'black'), color: C.purpleDeep, fontSize: 38 },
  feedback: { position: 'absolute', left: 230, right: 230, bottom: 110, borderRadius: 24, paddingVertical: 13, alignItems: 'center' },
  feedbackGood: { backgroundColor: '#22C55E' },
  feedbackBad: { backgroundColor: '#FF6B6B' },
  feedbackText: { color: '#FFFFFF', fontSize: 20 },
});
