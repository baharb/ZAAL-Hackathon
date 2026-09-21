import React, { useContext, useState } from 'react';
import { Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import TopBar from '../../components/TopBar';
import { neliWorldAssets, roomBackgroundPickers } from '../../assets/neliWorldAssets';
import { characterAssets } from '../../assets/characterAssets';
import { AppContext } from '../../store/AppContext';
import { useNav } from '../../store/NavContext';
import { getCountingNumberAudioKey, playFaAudio, speakWithGeneratedVoice } from '../../utils/faAudio';
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

  const tapItem = (index: number) => {
    if (countedItems.includes(index)) return;
    setCountedItems(prev => [...prev, index]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAnswer = (n: number) => {
    if (feedback !== null) return;
    const correct = n === round.count;
    setFeedback(correct);
    if (correct) {
      addStars(2);
      setScore(prev => prev + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const correctKey = getCountingNumberAudioKey(round.count);
      if (correctKey) { void playFaAudio(correctKey); }
      else { void speakWithGeneratedVoice(FA_NUMBERS[round.count - 1] ?? String(round.count), 'fa-IR', { interrupt: true, rate: 0.74, pitch: 1.14 }); }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Say correct answer: number audio + "\u0628\u0648\u062f" prefix via TTS if no clip
      const correctKey = getCountingNumberAudioKey(round.count);
      if (correctKey) { void playFaAudio(correctKey); }
      else { void speakWithGeneratedVoice(`\u0628\u0648\u062f ${FA_NUMBERS[round.count - 1] ?? round.count}`, 'fa-IR', { interrupt: true, rate: 0.72, pitch: 1.12 }); }
    }
    setTimeout(() => {
      setFeedback(null);
      setCountedItems([]);
      setRound(makeRound());
    }, 950);
  };

  return (
    <View style={styles.root}>
      <ImageBackground source={roomBackgroundPickers.garden(width, height)} style={styles.scene} imageStyle={styles.sceneImage}>
        <View style={styles.sceneWash} />
        <View style={styles.skyGlow} />
        <TopBar title="Counting" titleFa="بشمار" showClose dark onBack={() => resetNav({ name: 'Main', tab: 'Games' })} />

        <View style={styles.content}>
          <View style={[styles.questionPill, { marginBottom: Math.round(14 * heightScale) }]}>
            <Text style={[styles.kicker, { fontFamily: ff(lang, 'black') }, dir(lang)]}>
              {isFa ? 'چند تا می‌بینی؟' : 'How many do you see?'}
            </Text>
          </View>

          <Image
            source={characterAssets.aidin.poses.thinking}
            style={[styles.owl, { width: Math.round(340 * heightScale), height: Math.round(420 * heightScale) }]}
            resizeMode="contain"
          />

          <View
            style={[
              styles.objectGarden,
              { minWidth: Math.max(260, Math.round(390 * heightScale)), minHeight: Math.max(130, Math.round(220 * heightScale)), gap: Math.max(8, Math.round(18 * heightScale)) },
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

        <View style={styles.bottomTray}>
          <View style={styles.options}>
            {round.options.map(n => {
              const selectedWrong = feedback === false && n !== round.count;
              const selectedRight = feedback !== null && n === round.count;
              return (
                <TouchableOpacity
                  key={n}
                  style={[styles.numBtn, selectedRight && styles.numBtnRight, selectedWrong && styles.numBtnDim]}
                  onPress={() => handleAnswer(n)}
                  activeOpacity={0.86}
                >
                  <Text style={styles.numText}>{toFaDigits(n)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {feedback !== null ? (
          <View style={[styles.feedback, feedback ? styles.feedbackGood : styles.feedbackBad]}>
            <Text style={[styles.feedbackText, { fontFamily: ff(isFa ? 'fa' : lang, 'black') }]}>
              {feedback ? (isFa ? '\u062f\u0631\u0633\u062a \u0628\u0648\u062f!' : 'That is right!') : (isFa ? `\u0628\u0648\u062f ${toFaDigits(round.count)}` : `It was ${round.count}`)}
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
