import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  PixelRatio,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import TopBar, { topBarHeight } from '../components/TopBar';
import { ALPHABETS, EXAMPLE_IMAGE_BY_ID } from './VideoShowsScreen';
import { FARSI_LETTER_BY_ID } from '../data/farsiLetters';
import { ALPHABET_EXAMPLE_ASSETS } from '../assets/alphabetExampleAssets';
import { useNav } from '../store/NavContext';
import { useSpeech } from '../hooks/useSpeech';
import { ALPHABET_AUDIO_ID_OVERRIDE, FALLBACK_LETTER_NAME_FA as GLOBAL_FALLBACK_LETTER_NAME_FA, makeAlphabetAudioKey, playFaAudio, playFaAudioOrSpeak, stopFaAudio } from '../utils/faAudio';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { neliWorldAssets } from '../assets/neliWorldAssets';
import { characterAssets } from '../assets/characterAssets';
import { ff } from '../theme/fonts';

type AlphabetItem = (typeof ALPHABETS)[number];
const getCarWidth = (screenWidth: number) => Math.max(286, Math.min(392, screenWidth * 0.43));
const LETTER_COLORS = ['#FFFFFF', '#FFE66D', '#BFF7FF', '#E9DDFF', '#D8FFB8', '#FFF4D6'];
const LETTER_TOP_SPACE: Partial<Record<string, number>> = {
  ا: 18,
  ف: 18,
  ک: 18,
  گ: 18,
  ذ: 18,
  ش: 18,
  ط: 18,
  ظ: 18,
  غ: 18,
};

// ta/za/ye (audio ids taa/zaa/ye) now have recorded "name" clips (see
// BROKEN_ALPHABET_AUDIO in utils/faAudio.ts) — this is only a safety-net
// fallback if playback fails at runtime, spelling out the full letter name
// (not just the bare glyph) for TTS.
const FALLBACK_LETTER_NAME_FA: Partial<Record<string, string>> = {
  ta: 'طا',
  za: 'ظا',
  ye: 'یا',
};

// A bit brisker than the app-wide Farsi rate so the train keeps a lively
// pace — safe to speed up because the sequence below always waits for each
// clip to finish before revealing the next thing, so nothing gets cut off.
const TRAIN_SPEECH_RATE = 1.2;
// Speeds up recorded name/example clips themselves (expo-audio playback
// rate), on top of the TTS-only rate above — this is what makes the
// bulk of letters (which use recorded audio, not TTS) noticeably
// quicker, since that recording length is what drives how long the
// train waits before moving to the next wagon.
const TRAIN_AUDIO_PLAYBACK_RATE = 1.3;
const LETTER_REVEAL_DELAY = 110;
const IMAGE_REVEAL_GAP = 90;
const HOLD_AFTER_EXAMPLE = 160;
// Safety ceiling per clip: if a "finished" event never arrives (a dropped
// audio-session callback, a background/foreground hiccup, etc.) the train
// waits this long and then moves on anyway, instead of freezing forever.
const AUDIO_TIMEOUT_MS = 6000;
// The train's own "voice" — a cute, cartoonish whistle-toots sound effect
// (not narration), played only while the little train makes its one lap
// across the bottom of the screen and back across the top. It's stopped
// the instant that lap finishes, right as the big train fades in to start
// showing the alphabet, so the two never overlap.
const TRAIN_INTRO_VOICE = require('../../assets/audio/alphabet-train-toots.mp3');

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// Races a promise against a timeout so a missed completion callback can
// never stall the caller indefinitely.
function withTimeout<T>(promise: Promise<T>, ms: number, timeoutValue: T): Promise<T> {
  return new Promise<T>(resolve => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(timeoutValue);
      }
    }, ms);
    promise.then(value => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(value);
      }
    });
  });
}

const INTRO_WAGON_COUNT = 12;
const INTRO_RIDERS = [
  { wagonIndex: 2, source: characterAssets.aidin.poses.sitting, style: 'aidin' },
  { wagonIndex: 5, source: characterAssets.neli.poses.sitting, style: 'neli' },
  { wagonIndex: 8, source: characterAssets.roboBoombo.poses.sitting, style: 'robo' },
] as const;

function ExampleArt({ item }: { item: AlphabetItem }) {
  return (
    <View style={styles.exampleArtFrame}>
      <View style={styles.trainExampleArt}>
        <View style={[styles.trainExampleCar, styles.trainExampleEngineWrap]}>
          <Image source={neliWorldAssets.ui.trainHead} style={styles.trainExampleEngine} resizeMode="contain" />
        </View>
        <View style={styles.trainExampleWagons}>
          <View style={styles.trainExampleCar}>
            <Image source={neliWorldAssets.ui.toyWagon} style={styles.trainExampleWagon} resizeMode="stretch" />
            <Image source={characterAssets.aidin.poses.sitting} style={[styles.trainExampleRider, styles.trainExampleRiderAidin]} resizeMode="contain" />
          </View>
          <View style={styles.trainExampleCar}>
            <Image source={neliWorldAssets.ui.toyWagon} style={styles.trainExampleWagon} resizeMode="stretch" />
            <Image source={characterAssets.neli.poses.sitting} style={[styles.trainExampleRider, styles.trainExampleRiderNeli]} resizeMode="contain" />
          </View>
          <View style={styles.trainExampleCar}>
            <Image source={neliWorldAssets.ui.toyWagon} style={styles.trainExampleWagon} resizeMode="stretch" />
            <Image source={characterAssets.roboBoombo.poses.sitting} style={[styles.trainExampleRider, styles.trainExampleRiderRobo]} resizeMode="contain" />
          </View>
        </View>
      </View>
    </View>
  );
}

function ExampleImage({ item }: { item: AlphabetItem }) {
  // Use the same example image the Alphabet Tracing pages use for this
  // letter (keyed by the recorded-audio id, same id space as farsiLetters.ts)
  // so the Train and Tracing always show the same picture for a letter.
  const audioId = ALPHABET_AUDIO_ID_OVERRIDE[item.id] ?? item.id;
  const source = ALPHABET_EXAMPLE_ASSETS[audioId] ?? EXAMPLE_IMAGE_BY_ID[item.id];
  if (!source) return <ExampleArt item={item} />;
  return <Image source={source} style={styles.exampleImage} resizeMode="contain" />;
}

function ExampleIcon({ item }: { item: AlphabetItem }) {
  const c = item.color;
  const a = item.accent;
  const dark = '#24304F';
  const cream = '#FFF7D6';
  const water = '#5ED7FF';

  switch (item.id) {
    case 'alef':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Path d="M60 10C44 32 30 49 30 72c0 22 14 36 30 36s30-14 30-36C90 49 76 32 60 10Z" fill={water} />
          <Path d="M49 34c-7 11-12 23-12 36" stroke="#FFFFFF" strokeWidth={8} strokeLinecap="round" />
        </Svg>
      );
    case 'be':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Polygon points="24,27 88,12 73,76" fill={c} />
          <Polygon points="24,27 73,76 38,86" fill={a} />
          <Line x1="73" y1="76" x2="92" y2="106" stroke={dark} strokeWidth={5} strokeLinecap="round" />
          <Path d="M92 106c8-7 12-1 6 5" stroke={c} strokeWidth={4} fill="none" strokeLinecap="round" />
        </Svg>
      );
    case 'pe':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Circle cx="60" cy="62" r="38" fill="#FF8A1E" />
          <Path d="M57 23c4-9 13-13 24-10" stroke="#37B24D" strokeWidth={7} strokeLinecap="round" />
          <Path d="M38 47c12-12 31-16 48-7" stroke="#FFD18A" strokeWidth={6} strokeLinecap="round" />
        </Svg>
      );
    case 'te':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Circle cx="60" cy="60" r="40" fill={a} />
          <Path d="M30 45c18 8 42 9 60 0M38 86c8-20 9-36 2-62M80 96c-13-25-13-49 1-72" stroke={c} strokeWidth={6} fill="none" strokeLinecap="round" />
        </Svg>
      );
    case 'se':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Circle cx="60" cy="60" r="42" fill="#FFE66D" />
          <Circle cx="60" cy="60" r="30" fill="#FFFFFF" />
          <Line x1="60" y1="60" x2="60" y2="34" stroke={dark} strokeWidth={6} strokeLinecap="round" />
          <Line x1="60" y1="60" x2="78" y2="70" stroke={dark} strokeWidth={6} strokeLinecap="round" />
        </Svg>
      );
    case 'jim':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Ellipse cx="60" cy="64" rx="34" ry="38" fill="#FFD84D" />
          <Circle cx="47" cy="55" r="5" fill={dark} /><Circle cx="73" cy="55" r="5" fill={dark} />
          <Path d="M48 75c8 7 17 7 25 0" stroke={dark} strokeWidth={5} fill="none" strokeLinecap="round" />
          <Path d="M38 34l-8-13M60 28V13M82 34l8-13" stroke="#F59E0B" strokeWidth={6} strokeLinecap="round" />
        </Svg>
      );
    case 'che':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Path d="M28 66a32 32 0 0 1 64 0" stroke={c} strokeWidth={16} fill="none" strokeLinecap="round" />
          <Path d="M28 66a32 32 0 0 1 64 0" stroke={a} strokeWidth={8} fill="none" strokeLinecap="round" />
          <Line x1="60" y1="66" x2="60" y2="99" stroke={dark} strokeWidth={6} strokeLinecap="round" />
          <Path d="M60 99c8 8 19 3 18-7" stroke={dark} strokeWidth={6} fill="none" strokeLinecap="round" />
        </Svg>
      );
    case 'he-jimi':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Rect x="31" y="22" width="58" height="76" rx="12" fill={c} />
          <Path d="M39 39h42M39 55h42M39 71h42" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" />
        </Svg>
      );
    case 'khe':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Path d="M22 58 60 24l38 34" fill={a} />
          <Rect x="34" y="55" width="52" height="42" rx="8" fill={c} />
          <Rect x="53" y="72" width="14" height="25" rx="4" fill={cream} />
        </Svg>
      );
    case 'dal':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Rect x="53" y="46" width="14" height="52" rx="6" fill="#8B5A2B" />
          <Circle cx="45" cy="48" r="24" fill="#30C96B" />
          <Circle cx="68" cy="39" r="28" fill="#22B85F" />
          <Circle cx="77" cy="62" r="24" fill="#4ADE80" />
        </Svg>
      );
    case 'zal':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Rect x="43" y="30" width="34" height="62" rx="10" fill="#FFD84D" />
          <Path d="M47 43h26M47 57h26M47 71h26" stroke="#FFF7B0" strokeWidth={7} strokeLinecap="round" />
          <Path d="M77 34c11 0 17 6 18 16" stroke="#37B24D" strokeWidth={8} fill="none" strokeLinecap="round" />
        </Svg>
      );
    case 're':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Path d="M22 72c18-26 36 23 58-4 9-11 11-28 18-39" stroke={water} strokeWidth={16} fill="none" strokeLinecap="round" />
          <Path d="M25 75c17-16 35 14 53-5" stroke="#FFFFFF" strokeWidth={5} fill="none" strokeLinecap="round" />
        </Svg>
      );
    case 'ze':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Ellipse cx="60" cy="62" rx="28" ry="22" fill="#FFD84D" />
          <Path d="M48 44 35 29M72 44 85 29M34 62H18M102 62H86" stroke={dark} strokeWidth={6} strokeLinecap="round" />
          <Path d="M49 62h22" stroke={dark} strokeWidth={7} strokeLinecap="round" />
          <Circle cx="49" cy="58" r="4" fill={dark} /><Circle cx="71" cy="58" r="4" fill={dark} />
        </Svg>
      );
    case 'zhe':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Path d="M34 43h52l-8 49H42Z" fill="#EC5D9B" />
          <Ellipse cx="60" cy="43" rx="26" ry="10" fill="#FF9AC8" />
          <Path d="M45 59c9 6 21 6 30 0" stroke="#FFFFFF" strokeWidth={5} fill="none" strokeLinecap="round" />
        </Svg>
      );
    case 'sin':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Circle cx="60" cy="65" r="34" fill="#EF4444" />
          <Path d="M60 32c3-13 14-17 25-12" stroke="#36B35B" strokeWidth={7} strokeLinecap="round" />
          <Circle cx="48" cy="54" r="7" fill="#FFFFFF" opacity={0.85} />
        </Svg>
      );
    case 'shin':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Rect x="36" y="35" width="48" height="58" rx="10" fill="#FFFFFF" />
          <Path d="M42 35h36l-5-12H47Z" fill={water} />
          <Path d="M46 55h28" stroke={water} strokeWidth={6} strokeLinecap="round" />
        </Svg>
      );
    case 'sad':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Rect x="29" y="47" width="62" height="37" rx="18" fill="#7DD3FC" />
          <Circle cx="43" cy="36" r="8" fill="#FFFFFF" /><Circle cx="59" cy="28" r="6" fill="#FFFFFF" /><Circle cx="75" cy="37" r="7" fill="#FFFFFF" />
          <Path d="M42 66h36" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" />
        </Svg>
      );
    case 'zad':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Circle cx="60" cy="60" r="36" fill="#FFFFFF" />
          <Line x1="42" y1="42" x2="78" y2="78" stroke="#F43F5E" strokeWidth={11} strokeLinecap="round" />
          <Line x1="78" y1="42" x2="42" y2="78" stroke="#F43F5E" strokeWidth={11} strokeLinecap="round" />
        </Svg>
      );
    case 'ta':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Ellipse cx="60" cy="66" rx="28" ry="34" fill="#22C55E" />
          <Path d="M38 67c18-11 36 11 53-10" stroke="#FACC15" strokeWidth={13} fill="none" strokeLinecap="round" />
          <Circle cx="48" cy="55" r="4" fill={dark} /><Path d="M72 38l13-12" stroke="#EF4444" strokeWidth={8} strokeLinecap="round" />
        </Svg>
      );
    case 'za':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Ellipse cx="60" cy="70" rx="38" ry="14" fill="#E0E7FF" />
          <Path d="M32 69c9-23 47-23 56 0" stroke={c} strokeWidth={9} fill="none" strokeLinecap="round" />
        </Svg>
      );
    case 'eyn':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Circle cx="45" cy="58" r="17" fill="none" stroke={dark} strokeWidth={7} />
          <Circle cx="75" cy="58" r="17" fill="none" stroke={dark} strokeWidth={7} />
          <Line x1="62" y1="58" x2="58" y2="58" stroke={dark} strokeWidth={7} strokeLinecap="round" />
          <Line x1="28" y1="52" x2="18" y2="46" stroke={dark} strokeWidth={6} strokeLinecap="round" />
          <Line x1="92" y1="52" x2="102" y2="46" stroke={dark} strokeWidth={6} strokeLinecap="round" />
        </Svg>
      );
    case 'gheyn':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Circle cx="60" cy="60" r="36" fill="#FFE0B2" />
          <Path d="M40 67c9 9 31 9 40 0" stroke="#F97316" strokeWidth={8} fill="none" strokeLinecap="round" />
          <Circle cx="47" cy="54" r="5" fill="#22C55E" /><Circle cx="62" cy="48" r="5" fill="#EF4444" /><Circle cx="75" cy="56" r="5" fill="#06B6D4" />
        </Svg>
      );
    case 'fe':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Ellipse cx="62" cy="65" rx="35" ry="28" fill="#94A3B8" />
          <Circle cx="37" cy="54" r="16" fill="#A8B5C7" />
          <Path d="M27 62c-13 6-8 23 6 22" stroke="#A8B5C7" strokeWidth={10} fill="none" strokeLinecap="round" />
          <Circle cx="41" cy="52" r="3" fill={dark} />
        </Svg>
      );
    case 'ghaf':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Path d="M28 75c18 13 47 13 64 0" stroke="#8B5A2B" strokeWidth={9} fill="none" strokeLinecap="round" />
          <Path d="M39 75 52 45h23l12 30" fill={a} />
          <Path d="M32 82c20 12 58 12 76-3" stroke={water} strokeWidth={7} fill="none" strokeLinecap="round" />
        </Svg>
      );
    case 'kaf':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Path d="M31 32h33c13 0 23 10 23 23v38H49c-10 0-18-8-18-18Z" fill={c} />
          <Path d="M40 42h26M40 56h36M40 70h30" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" />
        </Svg>
      );
    case 'gaf':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Circle cx="60" cy="48" r="18" fill="#EC4899" />
          <Circle cx="43" cy="66" r="16" fill="#F472B6" />
          <Circle cx="77" cy="66" r="16" fill="#DB2777" />
          <Line x1="60" y1="82" x2="60" y2="101" stroke="#22C55E" strokeWidth={7} strokeLinecap="round" />
        </Svg>
      );
    case 'lam':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Ellipse cx="60" cy="64" rx="34" ry="24" fill="#FDE047" />
          <Path d="M38 64h44" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" />
          <Path d="M75 37c8-8 18-8 24-1" stroke="#22C55E" strokeWidth={7} strokeLinecap="round" />
        </Svg>
      );
    case 'mim':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Path d="M22 62c17-20 49-27 76 0-22 27-57 23-76 0Z" fill="#38BDF8" />
          <Polygon points="92,62 108,48 108,76" fill="#A78BFA" />
          <Circle cx="45" cy="57" r="4" fill={dark} />
        </Svg>
      );
    case 'noon':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Path d="M28 73c4-25 22-39 45-34 18 4 25 19 20 38Z" fill="#F6C166" />
          <Path d="M43 60c9-8 22-11 35-5" stroke="#FFE6A3" strokeWidth={6} strokeLinecap="round" />
        </Svg>
      );
    case 'vav':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Circle cx="60" cy="60" r="34" fill="#DCFCE7" stroke="#16A34A" strokeWidth={7} />
          <Path d="M44 68c9-21 22-21 32 0" stroke="#38BDF8" strokeWidth={8} fill="none" strokeLinecap="round" />
          <Line x1="60" y1="35" x2="60" y2="85" stroke="#16A34A" strokeWidth={6} strokeLinecap="round" />
        </Svg>
      );
    case 'he':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Path d="M53 32c21 17 24 46 7 66-22-12-28-45-7-66Z" fill="#F97316" />
          <Path d="M55 31c-2-10 8-16 19-13" stroke="#22C55E" strokeWidth={7} strokeLinecap="round" />
        </Svg>
      );
    case 'ye':
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Polygon points="60,20 88,52 73,100 47,100 32,52" fill="#BFF7FF" />
          <Path d="M60 20 54 100M33 53h54" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" />
        </Svg>
      );
    default:
      return (
        <Svg viewBox="0 0 120 120" style={styles.roofArt}>
          <Circle cx="60" cy="60" r="36" fill={c} />
          <Circle cx="60" cy="60" r="18" fill={a} />
        </Svg>
      );
  }
}

function getTrainTarget(length: number, activeIndex: number, carWidth: number, width: number) {
  const step = carWidth * 0.9;
  const viewportCenter = width * 0.5;
  return viewportCenter - carWidth * 0.5 - (length - 1) * step + activeIndex * step;
}

function useTrainMotion(
  length: number,
  activeIndex: number,
  carWidth: number,
  width: number,
  enabled: boolean,
  initialOffset: number,
  onInitialArrival?: () => void,
) {
  const offset = useRef(new Animated.Value(0)).current;
  const hasEntered = useRef(false);

  useEffect(() => {
    const target = getTrainTarget(length, activeIndex, carWidth, width);
    if (!enabled) {
      hasEntered.current = false;
      offset.setValue(initialOffset);
      return;
    }
    const duration = hasEntered.current ? 80 : 450;
    Animated.timing(offset, { toValue: target, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (finished && !hasEntered.current) {
        hasEntered.current = true;
        onInitialArrival?.();
      }
    });
  }, [activeIndex, carWidth, enabled, initialOffset, length, offset, onInitialArrival, width]);

  return offset;
}

function IntroTrainStrip({
  items,
  width,
  overlap,
  direction,
  smoke1,
  smoke2,
}: {
  items: AlphabetItem[];
  width: number;
  overlap: number;
  direction: 'right' | 'left';
  smoke1: any;
  smoke2: any;
}) {
  const engineHeight = width * 9 / 16 * 1.5;
  const engineWidth = engineHeight * (1535 / 1024);
  const introItems = items.slice(0, INTRO_WAGON_COUNT);
  const wagons = direction === 'right' ? [...introItems].reverse() : introItems;
  const engine = (
    <View
      style={[
        styles.introEngineWrap,
        {
          width: engineWidth,
          height: engineHeight,
          marginHorizontal: -overlap * 0.92,
          transform: [{ translateY: engineHeight * 0.1 }],
        },
      ]}
    >
      <View style={styles.introSmoke}>
        <Animated.View style={[styles.introSmokeCloud, { transform: [{ scale: smoke1 }] }]} />
        <Animated.View style={[styles.introSmokeCloud, styles.introSmokeCloudTwo, { transform: [{ scale: smoke2 }] }]} />
      </View>
      <Image
        source={neliWorldAssets.ui.trainHead}
        style={[styles.trainHeadImage, direction === 'left' ? styles.trainHeadImageFlipped : null]}
        resizeMode="contain"
      />
    </View>
  );

  return (
    <View style={styles.introTrainStrip}>
      {direction === 'left' ? engine : null}
      {wagons.map(item => {
        const sourceIndex = introItems.findIndex(trainItem => trainItem.id === item.id);
        const rider = INTRO_RIDERS.find(candidate => candidate.wagonIndex === sourceIndex);
        return (
        <View key={`intro-${direction}-${item.id}`} style={[styles.introCarWrap, { width, marginRight: -overlap }]}>
          <Image source={neliWorldAssets.ui.toyWagon} style={styles.wagonImage} resizeMode="stretch" />
          {rider ? (
            <Image
              source={rider.source}
              style={[
                styles.introRider,
                rider.style === 'aidin' ? styles.introRiderAidin : null,
                rider.style === 'neli' ? styles.introRiderNeli : null,
                rider.style === 'robo' ? styles.introRiderRobo : null,
              ]}
              resizeMode="contain"
            />
          ) : null}
        </View>
      );
      })}
      {direction === 'right' ? engine : null}
    </View>
  );
}

function TrainCar({
  item,
  active,
  width,
  overlap,
  colorIndex,
  showLetter,
  showImage,
  showSmoke,
  smoke1,
  smoke2,
}: {
  item: AlphabetItem;
  active: boolean;
  width: number;
  overlap: number;
  colorIndex: number;
  showLetter: boolean;
  showImage: boolean;
  showSmoke: boolean;
  smoke1: any;
  smoke2: any;
}) {
  const letterColor = LETTER_COLORS[colorIndex % LETTER_COLORS.length];
  const letterPop = useRef(new Animated.Value(0)).current;
  const imagePop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!showLetter) {
      letterPop.setValue(0);
      return;
    }
    Animated.timing(letterPop, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [letterPop, showLetter]);

  useEffect(() => {
    if (!showImage) {
      imagePop.setValue(0);
      return;
    }
    Animated.sequence([
      Animated.timing(imagePop, { toValue: 0.62, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(imagePop, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [imagePop, showImage]);

  const letterScale = letterPop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const letterTopSpace = LETTER_TOP_SPACE[item.letter] ?? 0;
  const letterY = letterPop.interpolate({ inputRange: [0, 1], outputRange: [12 + letterTopSpace, letterTopSpace] });
  const letterOpacity = letterPop.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1] });
  const imageScale = imagePop.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] });
  const imageY = imagePop.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const imageOpacity = imagePop.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });

  return (
    <View style={[styles.carWrap, { width, marginRight: -overlap }]}>
      {showSmoke ? (
        <View style={styles.carSmoke}>
          <Animated.View style={[styles.smokeCloud, { transform: [{ scale: smoke1 }] }]} />
          <Animated.View style={[styles.smokeCloud, styles.smokeCloudTwo, { transform: [{ scale: smoke2 }] }]} />
        </View>
      ) : null}
      {showImage ? (
        <Animated.View
          style={[
            styles.roofArtStage,
            { opacity: imageOpacity, transform: [{ translateY: imageY }, { scale: imageScale }] },
          ]}
        >
          <ExampleImage item={item} />
        </Animated.View>
      ) : null}
      <View style={styles.carBody}>
        <Image source={neliWorldAssets.ui.toyWagon} style={styles.wagonImage} resizeMode="stretch" />
        <View style={styles.carWindow}>
          {showLetter ? (
            <Animated.Text
              style={[
                styles.carLetter,
                { color: letterColor, opacity: letterOpacity, transform: [{ translateY: letterY }, { scale: letterScale }] },
              ]}
            >
              {item.letter}
            </Animated.Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function AlphabetTrainScreen() {
  const { reset } = useNav();
  const { speakFarsiOnly, stop } = useSpeech();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  // Once the train has shown every letter one time through, stop looping —
  // show a brief closing countdown (matching the other games) and head back
  // instead of repeating forever.
  const [showEndOverlay, setShowEndOverlay] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [mainTrainEntered, setMainTrainEntered] = useState(false);
  const [revealedIndex, setRevealedIndex] = useState(-1);
  const [imageRevealedIndex, setImageRevealedIndex] = useState(-1);
  const speakRef = useRef(speakFarsiOnly);
  const stopRef = useRef(stop);
  const scenicPulse = useRef(new Animated.Value(0)).current;
  const trainBob = useRef(new Animated.Value(0)).current;
  const introBottomX = useRef(new Animated.Value(0)).current;
  const introTopX = useRef(new Animated.Value(0)).current;
  const introTurn = useRef(new Animated.Value(0)).current;
  const mainTrainOpacity = useRef(new Animated.Value(0)).current;

  // Same phone/tablet split as TABLET_MIN_EDGE in App.tsx (shortest edge —
  // height, in this landscape-locked screen). On phones (iPhones, Pixel 7,
  // etc.) the bottom prev/play/next bar competes with the train for the
  // same short strip of vertical space, so it's hidden there and kept only
  // on tablets, which have the room for it.
  const isPhone = Math.min(width, height) < 600;
  const insets = useSafeAreaInsets();
  const trainItems = useMemo(() => ALPHABETS, []);

  // The revealed example art (roofArtStage, below) floats a fixed 42px
  // above the wagon regardless of car size, and the engine's painted
  // bottom (its wheels) sits 34 + carHeight*1.33 below the row's top (see
  // the vertical-fit math further down, by the trainTop calculation) — so
  // on a short phone screen the full-size, width-driven car can be too
  // tall to fit the example art under the TopBar *and* the wheels above
  // the bottom edge at once. Shrink the car just enough to make both fit;
  // tablets have room to spare and are never affected.
  const EXAMPLE_ART_TOP_OFFSET = 42;
  const TOPBAR_GAP = 8;
  const TRAIN_BOTTOM_MARGIN = 16;
  const ENGINE_ALIGN_OFFSET = 34;
  const ENGINE_BOTTOM_DROP = 1.33;
  const topBarBottom = topBarHeight(height, insets.top, { topInset: 10 });
  const minTrainTop = topBarBottom + EXAMPLE_ART_TOP_OFFSET + TOPBAR_GAP;
  const rawCarWidth = getCarWidth(width);
  const maxCarHeight = Math.max(90, (height - TRAIN_BOTTOM_MARGIN - ENGINE_ALIGN_OFFSET - minTrainTop) / ENGINE_BOTTOM_DROP);
  const carWidth = Math.min(rawCarWidth, maxCarHeight * 16 / 9);

  const wagonOverlap = carWidth * 0.1;
  const introCarWidth = carWidth * 0.48;
  const introOverlap = introCarWidth * 0.1;
  const introStep = introCarWidth - introOverlap;
  const introEngineWidth = introCarWidth * 9 / 16 * 1.5 * (1535 / 1024);
  const introTrainWidth = INTRO_WAGON_COUNT * introStep + introEngineWidth;
  const mainTrainStartOffset = getTrainTarget(trainItems.length, 0, carWidth, width) - width - carWidth * 0.8;
  const markMainTrainEntered = useCallback(() => setMainTrainEntered(true), []);
  const offset = useTrainMotion(trainItems.length, index, carWidth, width, introDone, mainTrainStartOffset, markMainTrainEntered);
  useEffect(() => {
    speakRef.current = speakFarsiOnly;
    stopRef.current = stop;
  }, [speakFarsiOnly, stop]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scenicPulse, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scenicPulse, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scenicPulse]);

  useEffect(() => {
    const bob = Animated.loop(
      Animated.sequence([
        Animated.timing(trainBob, { toValue: -5, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(trainBob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    bob.start();
    return () => bob.stop();
  }, [trainBob]);

  useEffect(() => {
    setIntroDone(false);
    setMainTrainEntered(false);
    mainTrainOpacity.setValue(0);
    introTurn.setValue(0);
    introBottomX.setValue(-introTrainWidth - 80);
    introTopX.setValue(width + 80);

    // Play the train's cute whistle-toots voice for exactly this lap: start
    // it now (the little train is about to drive in) and stop it the
    // moment the Animated.sequence below finishes, which is also when the
    // big train fades in and starts revealing letters. Track the Sound
    // instance in a local (not state) so this can't retrigger the effect.
    let introPlayer: AudioPlayer | undefined;
    let introSoundStopped = false;
    const stopIntroSound = () => {
      if (introSoundStopped) return;
      introSoundStopped = true;
      const playerToStop = introPlayer;
      if (playerToStop) {
        try {
          playerToStop.pause();
        } catch {}
        try {
          playerToStop.remove();
        } catch {}
      }
    };
    try {
      const player = createAudioPlayer(TRAIN_INTRO_VOICE);
      if (introSoundStopped) {
        // The intro already finished (or this effect re-ran) before the
        // clip finished loading — don't let it start playing now.
        try { player.remove(); } catch {}
      } else {
        introPlayer = player;
        player.play();
        const subscription = player.addListener('playbackStatusUpdate', status => {
          if (status.isLoaded && status.didJustFinish) {
            subscription.remove();
            try { player.remove(); } catch {}
          }
        });
      }
    } catch {}

    Animated.sequence([
      Animated.timing(introBottomX, {
        toValue: width + 80,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(introTurn, {
          toValue: 1,
          duration: 400,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(introTopX, {
          toValue: width + 20,
          duration: 400,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(introTopX, {
        toValue: -introTrainWidth - 80,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(mainTrainOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      // The little train's lap is over (or was interrupted) — the big
      // train is about to (or already did) fade in, so the train's voice
      // turns off here no matter what.
      stopIntroSound();
      if (finished) setIntroDone(true);
    });

    return () => {
      stopIntroSound();
    };
  }, [introBottomX, introTopX, introTrainWidth, introTurn, mainTrainOpacity, width]);

  useEffect(() => {
    if (!introDone || !mainTrainEntered) return undefined;
    let cancelled = false;
    setRevealedIndex(current => Math.min(current, index - 1));
    setImageRevealedIndex(current => Math.min(current, index - 1));

    const item = trainItems[index];
    if (!item) return undefined;

    const audioId = ALPHABET_AUDIO_ID_OVERRIDE[item.id] ?? item.id;

    void (async () => {
      stopRef.current();
      await stopFaAudio();
      await wait(LETTER_REVEAL_DELAY);
      if (cancelled) return;
      setRevealedIndex(current => Math.max(current, index));

      // Say the full letter name — always let it finish before moving on
      // (bounded by AUDIO_TIMEOUT_MS so a missed "finished" event, or one of
      // the handful of known-broken recorded clips, can never stall the
      // train — playFaAudioOrSpeak already swaps those for TTS).
      await withTimeout(
        playFaAudioOrSpeak(
          makeAlphabetAudioKey('name', audioId),
          FALLBACK_LETTER_NAME_FA[item.id] ?? GLOBAL_FALLBACK_LETTER_NAME_FA[audioId] ?? item.letter,
          {
            interrupt: false,
            awaitFinish: true,
            rate: TRAIN_SPEECH_RATE,
            // Also speeds up the recorded clip itself (not just the TTS
            // fallback) — shouldCorrectPitch keeps the voice sounding
            // natural instead of sped-up/chipmunky.
            playbackRate: TRAIN_AUDIO_PLAYBACK_RATE,
            shouldCorrectPitch: true,
          },
        ),
        AUDIO_TIMEOUT_MS,
        true,
      );
      if (cancelled) return;

      await wait(IMAGE_REVEAL_GAP);
      if (cancelled) return;
      setImageRevealedIndex(current => Math.max(current, index));

      // Say the example word using the same recorded clip + example text
      // (and the same rate/pitch) that the Alphabet Tracing pages use for
      // this letter, so the Train's voice, image, and word all match
      // Tracing. playFaAudioOrSpeak already falls back to TTS for any
      // letter with no (or a known-broken) recorded example clip, exactly
      // like Tracing does, so audio and picture never drift apart.
      const tracingLetter = FARSI_LETTER_BY_ID[audioId];
      const exampleText = tracingLetter?.exampleFa ?? item.wordFa;
      await withTimeout(
        playFaAudioOrSpeak(
          makeAlphabetAudioKey('example', audioId),
          exampleText,
          {
            interrupt: false,
            awaitFinish: true,
            rate: 0.95,
            pitch: 1.14,
            playbackRate: TRAIN_AUDIO_PLAYBACK_RATE,
            shouldCorrectPitch: true,
          },
        ),
        AUDIO_TIMEOUT_MS,
        true,
      );
      if (cancelled) return;

      await wait(HOLD_AFTER_EXAMPLE);
      if (cancelled || !playing) return;
      if (index >= trainItems.length - 1) {
        setShowEndOverlay(true);
      } else {
        setIndex(current => current + 1);
      }
    })();

    return () => {
      cancelled = true;
      stopRef.current();
      void stopFaAudio();
    };
  }, [index, introDone, mainTrainEntered, playing, trainItems]);

  const moveTo = (next: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIndex((next + trainItems.length) % trainItems.length);
  };

  const close = () => {
    void stopFaAudio();
    stop();
    reset({ name: 'Main', tab: 'Games' });
  };

  const smoke1 = scenicPulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.2] });
  const smoke2 = scenicPulse.interpolate({ inputRange: [0, 1], outputRange: [1.2, 0.9] });
  const skyShift = scenicPulse.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  const leadSmokeId = trainItems[trainItems.length - 1]?.id;
  const introBottomY = height * 0.64;
  const introTopY = height * 0.22;

  // The engine (trainHeadBody) renders taller than its wagon and is pushed
  // further down again by a translateY (see engineWrap/trainHeadBody in
  // styles below), so its painted bottom edge — the wheels — sits well
  // below where `top: '38%'` alone would suggest, and the revealed example
  // art floats above the wagon by EXAMPLE_ART_TOP_OFFSET regardless of car
  // size. carWidth was already shrunk (above) so both extremes can fit —
  // this just picks the top offset within the range that fit was solved
  // for, favoring the original ~38%-of-screen position when there's slack.
  const engineBottomReach = ENGINE_ALIGN_OFFSET + (carWidth * 9 / 16) * ENGINE_BOTTOM_DROP;
  const maxTrainTop = height - TRAIN_BOTTOM_MARGIN - engineBottomReach;
  const trainTop = Math.max(minTrainTop, Math.min(height * 0.38, maxTrainTop));
  const introTurnOpacity = introTurn.interpolate({ inputRange: [0, 0.25, 0.85, 1], outputRange: [0, 1, 1, 0] });
  const introTopOpacity = introTurn.interpolate({ inputRange: [0, 0.75, 1], outputRange: [0, 0, 1] });
  const introBottomOpacity = introTurn.interpolate({ inputRange: [0, 0.95, 1], outputRange: [1, 1, 0] });

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#76D9FF', '#CFF5FF', '#FDF4FF']} style={StyleSheet.absoluteFill} />
      <View style={styles.sun} />
      <View style={styles.cloudOne} />
      <View style={styles.cloudTwo} />
      <View style={styles.hillOne} />
      <View style={styles.hillTwo} />

      <TopBar
        title="Alphabet Train"
        titleFa="قطار الفبا"
        showClose
        dark
        topInset={10}
        onBack={close}
      />

      {!introDone ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.introTrainStage,
              {
                opacity: introBottomOpacity,
                transform: [{ translateX: introBottomX }, { translateY: introBottomY }],
              },
            ]}
          >
            <IntroTrainStrip
              items={trainItems}
              width={introCarWidth}
              overlap={introOverlap}
              direction="right"
              smoke1={smoke1}
              smoke2={smoke2}
            />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.introTurnBubble,
              {
                opacity: introTurnOpacity,
                transform: [
                  { translateX: width - introCarWidth * 1.15 },
                  { translateY: height * 0.43 },
                  { scale: introTurn.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 1, 0.6] }) },
                ],
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.introTrainStage,
              {
                opacity: introTopOpacity,
                transform: [{ translateX: introTopX }, { translateY: introTopY }],
              },
            ]}
          >
            <IntroTrainStrip
              items={trainItems}
              width={introCarWidth}
              overlap={introOverlap}
              direction="left"
              smoke1={smoke1}
              smoke2={smoke2}
            />
          </Animated.View>
        </>
      ) : null}

      <Animated.View style={[styles.trainStage, { top: trainTop, opacity: mainTrainOpacity, transform: [{ translateX: offset }, { translateY: Animated.add(trainBob, skyShift) }] }]}>
        {[...trainItems].reverse().map((item) => {
          const sourceIndex = trainItems.findIndex(trainItem => trainItem.id === item.id);
          return (
          <TrainCar
            key={item.id}
            item={item}
            active={item.id === trainItems[index].id}
            width={carWidth}
            overlap={wagonOverlap}
            colorIndex={sourceIndex}
            showLetter={sourceIndex <= revealedIndex}
            showImage={sourceIndex <= imageRevealedIndex}
            showSmoke={item.id === leadSmokeId}
            smoke1={smoke1}
            smoke2={smoke2}
          />
          );
        })}

        <View style={[styles.engineWrap, { height: carWidth * 9 / 16, marginLeft: -wagonOverlap }]}>
          <View
            style={[
              styles.trainHeadBody,
              {
                width: (carWidth * 9 / 16) * 1.5048 * (1535 / 1024),
                height: carWidth * 9 / 16 * 1.5048,
                transform: [
                  { translateX: -carWidth * 0.14 },
                  { translateY: carWidth * 9 / 16 * 0.33 },
                ],
              },
            ]}
          >
            <Image source={neliWorldAssets.ui.trainHead} style={styles.trainHeadImage} resizeMode="contain" />
          </View>
        </View>
      </Animated.View>

      {!isPhone ? (
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlBtn} onPress={() => moveTo(index - 1)} activeOpacity={0.82}>
            <Image source={neliWorldAssets.ui.back} style={styles.controlIcon} resizeMode="contain" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.playBtn}
            onPress={() => setPlaying(current => !current)}
            activeOpacity={0.82}
          >
            <Image source={playing ? neliWorldAssets.ui.pause : neliWorldAssets.ui.play} style={styles.playIcon} resizeMode="contain" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={() => moveTo(index + 1)} activeOpacity={0.82}>
            <Image source={neliWorldAssets.ui.next} style={styles.controlIcon} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      ) : null}

      {showEndOverlay && <TrainEndOverlay onGo={close} />}
    </View>
  );
}

const AnimatedTrainRing = Animated.createAnimatedComponent(Circle);
const TRAIN_END_COUNTDOWN_S = 5;
const TRAIN_END_RING_R = 30;
const TRAIN_END_RING_C = 2 * Math.PI * TRAIN_END_RING_R;

// Shown once the train has played through every letter one time — mirrors
// the closing countdown used by the other games instead of looping forever.
function TrainEndOverlay({ onGo }: { onGo: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: TRAIN_END_COUNTDOWN_S * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) onGo();
    });
    return () => progress.stopAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dashoffset = progress.interpolate({ inputRange: [0, 1], outputRange: [0, TRAIN_END_RING_C] });

  return (
    <View style={endOverlayStyles.root}>
      <View style={endOverlayStyles.card}>
        <Svg width={80} height={80} style={{ marginBottom: 20 }}>
          <Circle cx={40} cy={40} r={TRAIN_END_RING_R} stroke="#E0D8FF" strokeWidth={7} fill="none" />
          <AnimatedTrainRing
            cx={40}
            cy={40}
            r={TRAIN_END_RING_R}
            stroke="#6C4EFF"
            strokeWidth={7}
            fill="none"
            strokeDasharray={TRAIN_END_RING_C}
            strokeDashoffset={dashoffset as any}
            strokeLinecap="round"
            rotation={-90}
            origin="40,40"
          />
        </Svg>
        <TouchableOpacity style={endOverlayStyles.btn} onPress={onGo} activeOpacity={0.82}>
          <Text style={endOverlayStyles.btnText}>بریم بازی دیگه! 🎮</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const endOverlayStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,10,40,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  btn: {
    backgroundColor: '#6C4EFF',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  btnText: {
    color: '#FFFFFF',
    fontFamily: ff('fa', 'black'),
    fontSize: 18,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  sun: {
    position: 'absolute',
    right: 26,
    top: 54,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFD95A',
    shadowColor: '#FFD95A',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  cloudOne: {
    position: 'absolute',
    top: 98,
    left: 28,
    width: 118,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  cloudTwo: {
    position: 'absolute',
    top: 124,
    right: 88,
    width: 132,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.84)',
  },
  hillOne: {
    position: 'absolute',
    left: -48,
    bottom: 108,
    width: 240,
    height: 150,
    borderTopLeftRadius: 160,
    borderTopRightRadius: 160,
    backgroundColor: '#69C65F',
    opacity: 0.82,
  },
  hillTwo: {
    position: 'absolute',
    right: -66,
    bottom: 112,
    width: 280,
    height: 178,
    borderTopLeftRadius: 180,
    borderTopRightRadius: 180,
    backgroundColor: '#4DBA52',
    opacity: 0.76,
  },
  introTrainStage: {
    position: 'absolute',
    left: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 3,
  },
  introTrainStrip: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  introCarWrap: {
    aspectRatio: 16 / 9,
    overflow: 'visible',
  },
  introRider: {
    position: 'absolute',
    bottom: '80%',
    left: '19%',
    width: '82%',
    height: '101%',
    zIndex: 6,
  },
  introRiderAidin: {
    bottom: '82%',
    left: '21%',
    width: '73%',
    height: '88%',
  },
  introRiderNeli: {
    bottom: '79%',
    left: '17%',
    width: '84%',
    height: '92%',
  },
  introRiderRobo: {
    bottom: '81%',
    left: '18%',
    width: '83%',
    height: '90%',
  },
  introEngineWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  introSmoke: {
    position: 'absolute',
    top: -10,
    left: '61%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    zIndex: 4,
  },
  introSmokeCloud: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  introSmokeCloudTwo: {
    width: 11,
    height: 11,
    marginTop: -5,
  },
  introTurnBubble: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 8,
    borderColor: 'rgba(255,255,255,0.72)',
    borderLeftColor: 'rgba(255,218,84,0.86)',
    borderBottomColor: 'rgba(255,218,84,0.86)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 2,
  },
  trainStage: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '38%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 16,
  },
  engineWrap: { alignItems: 'center', justifyContent: 'flex-end', paddingTop: 68 },
  smokeCloud: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.84)' },
  smokeCloudTwo: { width: 20, height: 20, marginTop: -8 },
  carSmoke: { position: 'absolute', top: -18, left: '61%', marginLeft: -10, flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 10 },
  trainHeadBody: { width: '100%', overflow: 'visible' },
  trainHeadImage: { width: '100%', height: '100%' },
  trainHeadImageFlipped: { transform: [{ scaleX: -1 }] },
  carWrap: {
    paddingTop: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roofArtStage: {
    position: 'absolute',
    top: -42,
    width: 156,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  exampleImage: {
    width: '100%',
    height: '100%',
  },
  exampleArtFrame: {
    width: 132,
    height: 118,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainExampleArt: {
    width: 124,
    height: 100,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  trainExampleCar: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  trainExampleEngineWrap: {
    width: 42,
    height: 40,
    marginRight: -2,
  },
  trainExampleEngine: {
    width: '100%',
    height: '100%',
  },
  trainExampleWagons: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginLeft: 2,
  },
  trainExampleWagon: {
    width: 32,
    height: 22,
  },
  trainExampleRider: {
    position: 'absolute',
    bottom: 11,
    width: 26,
    height: 31,
  },
  trainExampleRiderAidin: {
    left: 4,
  },
  trainExampleRiderNeli: {
    left: 3,
  },
  trainExampleRiderRobo: {
    left: 2,
  },
  roofArt: {
    width: '100%',
    height: '100%',
  },
  carBody: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
  },
  wagonImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  carWindow: {
    position: 'absolute',
    left: '14%',
    right: '14%',
    top: '20%',
    height: '54%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carLetter: {
    fontFamily: ff('fa', 'black'),
    fontSize: 66,
    lineHeight: 86,
    textAlign: 'center',
    includeFontPadding: true,
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  controlBtn: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlIcon: { width: 42, height: 42 },
  playBtn: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { width: 52, height: 52 },
});
