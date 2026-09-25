import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { AppContext, Lang } from '../store/AppContext';
import { useSpeech } from '../hooks/useSpeech';
import CharacterAvatar from '../components/CharacterAvatar';
import { C } from '../theme/colors';
import { ff } from '../theme/fonts';
import { neliWorldAssets } from '../assets/neliWorldAssets';

// ─── Types ────────────────────────────────────────────────────────────────────

type Letter = { char: string; name: string; word: string; en: string; color: string; soft: string; icon: ImageSourcePropType };
type Point  = { x: number; y: number };
type Stroke = { d: string; sx: number; sy: number }; // SVG path + start-dot position in 200×200 viewBox

// ─── Letter data (original — unchanged) ──────────────────────────────────────

const LETTERS: Letter[] = [
  { char: 'ا', name: 'الف',  word: 'آب',       en: 'Water',     color: '#1FB6FF', soft: '#DFF5FF', icon: neliWorldAssets.foods.water },
  { char: 'ب', name: 'ب',    word: 'بابا',     en: 'Dad',       color: '#6C4EFF', soft: '#EEE9FF', icon: neliWorldAssets.ui.home },
  { char: 'پ', name: 'پ',    word: 'پلو',      en: 'Rice',      color: '#22C55E', soft: '#DCFCE7', icon: neliWorldAssets.foods.rice },
  { char: 'ت', name: 'ت',    word: 'توپ',      en: 'Ball',      color: '#FACC15', soft: '#FFF7C2', icon: neliWorldAssets.ui.star },
  { char: 'ث', name: 'ث',    word: 'ثمر',      en: 'Fruit',     color: '#FB923C', soft: '#FFEDD5', icon: neliWorldAssets.foods.apple },
  { char: 'ج', name: 'جیم',  word: 'جوراب',   en: 'Socks',     color: '#EC4899', soft: '#FCE7F3', icon: neliWorldAssets.ui.heart },
  { char: 'چ', name: 'چ',    word: 'چتر',      en: 'Umbrella',  color: '#A855F7', soft: '#F3E8FF', icon: neliWorldAssets.ui.trophy },
  { char: 'ح', name: 'ح',    word: 'حلوا',     en: 'Halva',     color: '#14B8A6', soft: '#CCFBF1', icon: neliWorldAssets.persianFoods.kukuSabzi },
  { char: 'خ', name: 'خ',    word: 'خرس',      en: 'Bear',      color: '#F97316', soft: '#FFEDD5', icon: neliWorldAssets.animals.bear },
  { char: 'د', name: 'دال',  word: 'درخت',    en: 'Tree',      color: '#38BDF8', soft: '#E0F2FE', icon: neliWorldAssets.ui.star },
  { char: 'ذ', name: 'ذال',  word: 'ذرت',     en: 'Corn',      color: '#EAB308', soft: '#FEF9C3', icon: neliWorldAssets.foods.corn },
  { char: 'ر', name: 'ر',    word: 'رنگ',      en: 'Color',     color: '#22C55E', soft: '#DCFCE7', icon: neliWorldAssets.ui.paintbrush },
  { char: 'ز', name: 'ز',    word: 'زنبور',   en: 'Bee',       color: '#FACC15', soft: '#FFF7C2', icon: neliWorldAssets.ui.star },
  { char: 'ژ', name: 'ژ',    word: 'ژاله',    en: 'Dew',       color: '#FB923C', soft: '#FFEDD5', icon: neliWorldAssets.foods.water },
  { char: 'س', name: 'سین',  word: 'سیب',     en: 'Apple',     color: '#EF4444', soft: '#FFE4E6', icon: neliWorldAssets.foods.apple },
  { char: 'ش', name: 'شین',  word: 'شیر',     en: 'Milk',      color: '#7C3AED', soft: '#F1E8FF', icon: neliWorldAssets.foods.yogurt },
  { char: 'ص', name: 'صاد',  word: 'صابون',   en: 'Soap',      color: '#06B6D4', soft: '#CFFAFE', icon: neliWorldAssets.ui.toothbrush },
  { char: 'ض', name: 'ضاد',  word: 'ضربان',   en: 'Beat',      color: '#EC4899', soft: '#FCE7F3', icon: neliWorldAssets.ui.heart },
  { char: 'ط', name: 'طا',   word: 'طبل',     en: 'Drum',      color: '#84CC16', soft: '#ECFCCB', icon: neliWorldAssets.ui.voice },
  { char: 'ظ', name: 'ظا',   word: 'ظرف',     en: 'Dish',      color: '#8B5CF6', soft: '#EDE9FE', icon: neliWorldAssets.foods.pasta },
  { char: 'ع', name: 'عین',  word: 'عروسک',   en: 'Doll',      color: '#F97316', soft: '#FFEDD5', icon: neliWorldAssets.characters.neli },
  { char: 'غ', name: 'غین',  word: 'غذا',     en: 'Food',      color: '#06B6D4', soft: '#CFFAFE', icon: neliWorldAssets.foods.pasta },
  { char: 'ف', name: 'فا',   word: 'فیل',     en: 'Elephant',  color: '#22C55E', soft: '#DCFCE7', icon: neliWorldAssets.animals.elephant },
  { char: 'ق', name: 'قاف',  word: 'قورباغه', en: 'Frog',      color: '#A855F7', soft: '#F3E8FF', icon: neliWorldAssets.animals.panda },
  { char: 'ک', name: 'کاف',  word: 'کفش',     en: 'Shoe',      color: '#FACC15', soft: '#FFF7C2', icon: neliWorldAssets.ui.trophy },
  { char: 'گ', name: 'گاف',  word: 'گل',      en: 'Flower',    color: '#EC4899', soft: '#FCE7F3', icon: neliWorldAssets.ui.heart },
  { char: 'ل', name: 'لام',  word: 'لیمو',    en: 'Lemon',     color: '#14B8A6', soft: '#CCFBF1', icon: neliWorldAssets.foods.lemonSlice },
  { char: 'م', name: 'میم',  word: 'ماه',     en: 'Moon',      color: '#3B82F6', soft: '#DBEAFE', icon: neliWorldAssets.ui.star },
  { char: 'ن', name: 'نون',  word: 'نان',     en: 'Bread',     color: '#F59E0B', soft: '#FEF3C7', icon: neliWorldAssets.foods.bread },
  { char: 'و', name: 'واو',  word: 'وان',     en: 'Tub',       color: '#EF4444', soft: '#FFE4E6', icon: neliWorldAssets.ui.toothbrush },
  { char: 'ه', name: 'ها',   word: 'هوا',     en: 'Air',       color: '#8B5CF6', soft: '#EDE9FE', icon: neliWorldAssets.ui.sparkle },
  { char: 'ی', name: 'یا',   word: 'یخ',      en: 'Ice',       color: '#0EA5E9', soft: '#E0F2FE', icon: neliWorldAssets.foods.water },
];

// ─── SVG stroke paths (200×200 viewBox, correct Farsi handwriting direction) ─
// Start dot (green) = where the finger begins.
// Dots (دایره‌های کوچک) for letters like ب، پ etc. use a tiny circle path.

const DOT = (x: number, y: number) =>
  `M ${x} ${y - 3} a 3 3 0 1 1 0 6 a 3 3 0 1 1 0 -6`;

const BOWL = 'M 162 90 Q 100 72 54 90 Q 26 104 36 128 Q 46 152 100 147 Q 154 142 164 124 Q 174 106 162 90';

const STROKES: Record<string, Stroke[]> = {
  'ا': [{ d: 'M 100 28 L 100 174', sx: 100, sy: 28 }],

  'ب': [
    { d: BOWL, sx: 162, sy: 90 },
    { d: DOT(100, 162), sx: 100, sy: 162 },
  ],
  'پ': [
    { d: BOWL, sx: 162, sy: 90 },
    { d: DOT(82, 162), sx: 82, sy: 162 },
    { d: DOT(100, 166), sx: 100, sy: 166 },
    { d: DOT(118, 162), sx: 118, sy: 162 },
  ],
  'ت': [
    { d: BOWL, sx: 162, sy: 90 },
    { d: DOT(88, 66), sx: 88, sy: 66 },
    { d: DOT(112, 62), sx: 112, sy: 62 },
  ],
  'ث': [
    { d: BOWL, sx: 162, sy: 90 },
    { d: DOT(86, 62), sx: 86, sy: 62 },
    { d: DOT(110, 57), sx: 110, sy: 57 },
    { d: DOT(134, 62), sx: 134, sy: 62 },
  ],

  'ج': [
    { d: 'M 152 56 Q 166 56 166 80 Q 166 126 132 150 Q 100 170 66 153 Q 40 136 44 106', sx: 152, sy: 56 },
    { d: DOT(118, 100), sx: 118, sy: 100 },
  ],
  'چ': [
    { d: 'M 152 56 Q 166 56 166 80 Q 166 126 132 150 Q 100 170 66 153 Q 40 136 44 106', sx: 152, sy: 56 },
    { d: DOT(108, 96), sx: 108, sy: 96 },
    { d: DOT(124, 100), sx: 124, sy: 100 },
    { d: DOT(140, 96), sx: 140, sy: 96 },
  ],

  // ح: open-top shape — right side goes down, curves under, comes up on left
  'ح': [
    { d: 'M 158 52 Q 170 52 170 76 Q 170 130 134 154 Q 102 172 68 154 Q 42 138 46 108 Q 50 82 76 76 Q 108 68 120 80 Q 134 94 118 100 Q 102 106 88 100', sx: 158, sy: 52 },
  ],
  'خ': [
    { d: 'M 158 52 Q 170 52 170 76 Q 170 130 134 154 Q 102 172 68 154 Q 42 138 46 108 Q 50 82 76 76 Q 108 68 120 80 Q 134 94 118 100 Q 102 106 88 100', sx: 158, sy: 52 },
    { d: DOT(128, 44), sx: 128, sy: 44 },
  ],

  // د: curved shelf shape, right to left
  'د': [{ d: 'M 128 44 Q 150 44 152 70 Q 155 98 136 130 Q 116 160 80 160 L 44 160', sx: 128, sy: 44 }],
  'ذ': [
    { d: 'M 128 44 Q 150 44 152 70 Q 155 98 136 130 Q 116 160 80 160 L 44 160', sx: 128, sy: 44 },
    { d: DOT(138, 34), sx: 138, sy: 34 },
  ],

  // ر: simple hook down-right
  'ر': [{ d: 'M 114 42 Q 130 42 134 66 Q 137 92 120 160', sx: 114, sy: 42 }],
  'ز': [
    { d: 'M 114 42 Q 130 42 134 66 Q 137 92 120 160', sx: 114, sy: 42 },
    { d: DOT(130, 68), sx: 130, sy: 68 },
  ],
  'ژ': [
    { d: 'M 114 42 Q 130 42 134 66 Q 137 92 120 160', sx: 114, sy: 42 },
    { d: DOT(118, 58), sx: 118, sy: 58 },
    { d: DOT(132, 54), sx: 132, sy: 54 },
    { d: DOT(146, 58), sx: 146, sy: 58 },
  ],

  // س: three humps right-to-left then sweep
  'س': [{ d: 'M 174 96 Q 154 80 134 96 Q 118 108 118 96 Q 118 84 100 96 Q 82 108 82 96 Q 82 84 60 96 Q 38 110 36 134 Q 32 158 60 162 Q 92 167 124 155 Q 156 143 170 122 Q 180 107 174 96', sx: 174, sy: 96 }],
  'ش': [
    { d: 'M 174 96 Q 154 80 134 96 Q 118 108 118 96 Q 118 84 100 96 Q 82 108 82 96 Q 82 84 60 96 Q 38 110 36 134 Q 32 158 60 162 Q 92 167 124 155 Q 156 143 170 122 Q 180 107 174 96', sx: 174, sy: 96 },
    { d: DOT(108, 66), sx: 108, sy: 66 },
    { d: DOT(126, 60), sx: 126, sy: 60 },
    { d: DOT(144, 66), sx: 144, sy: 66 },
  ],

  // ص: loop on top-right then long tail left
  'ص': [{ d: 'M 166 88 Q 166 62 140 62 Q 114 62 114 88 Q 114 114 140 114 Q 163 114 166 98 Q 172 80 148 80 Q 108 76 78 96 Q 48 116 44 140 Q 40 162 70 166 Q 102 170 136 157 Q 164 146 172 122', sx: 166, sy: 88 }],
  'ض': [
    { d: 'M 166 88 Q 166 62 140 62 Q 114 62 114 88 Q 114 114 140 114 Q 163 114 166 98 Q 172 80 148 80 Q 108 76 78 96 Q 48 116 44 140 Q 40 162 70 166 Q 102 170 136 157 Q 164 146 172 122', sx: 166, sy: 88 },
    { d: DOT(150, 50), sx: 150, sy: 50 },
  ],

  // ط: vertical stroke + bowl
  'ط': [
    { d: 'M 158 44 L 158 160', sx: 158, sy: 44 },
    { d: 'M 158 98 Q 130 82 98 98 Q 70 114 68 146 Q 66 164 86 167', sx: 158, sy: 98 },
  ],
  'ظ': [
    { d: 'M 158 44 L 158 160', sx: 158, sy: 44 },
    { d: 'M 158 98 Q 130 82 98 98 Q 70 114 68 146 Q 66 164 86 167', sx: 158, sy: 98 },
    { d: DOT(148, 36), sx: 148, sy: 36 },
  ],

  // ع: eye shape
  'ع': [{ d: 'M 144 66 Q 160 50 160 76 Q 160 102 134 102 Q 108 102 108 76 Q 108 60 124 60 Q 140 60 144 76 Q 152 100 142 124 Q 126 154 88 158 Q 60 160 50 140', sx: 144, sy: 66 }],
  'غ': [
    { d: 'M 144 66 Q 160 50 160 76 Q 160 102 134 102 Q 108 102 108 76 Q 108 60 124 60 Q 140 60 144 76 Q 152 100 142 124 Q 126 154 88 158 Q 60 160 50 140', sx: 144, sy: 66 },
    { d: DOT(132, 48), sx: 132, sy: 48 },
  ],

  // ف: circle + tail
  'ف': [
    { d: 'M 160 86 Q 160 60 134 60 Q 108 60 108 86 Q 108 112 134 112 Q 156 112 160 98', sx: 160, sy: 86 },
    { d: 'M 160 98 Q 170 106 100 104 Q 58 104 42 132 Q 32 154 56 162 Q 84 170 136 158', sx: 160, sy: 98 },
    { d: DOT(134, 46), sx: 134, sy: 46 },
  ],
  'ق': [
    { d: 'M 160 86 Q 160 60 134 60 Q 108 60 108 86 Q 108 112 134 112 Q 156 112 160 98', sx: 160, sy: 86 },
    { d: 'M 160 98 Q 170 106 100 104 Q 58 104 42 132 Q 32 154 56 162 Q 84 170 136 158', sx: 160, sy: 98 },
    { d: DOT(120, 46), sx: 120, sy: 46 },
    { d: DOT(146, 46), sx: 146, sy: 46 },
  ],

  // ک/گ: vertical + diagonal arm
  'ک': [
    { d: 'M 160 44 L 160 160', sx: 160, sy: 44 },
    { d: 'M 160 90 Q 132 84 100 100 Q 72 114 70 146 Q 68 162 84 165', sx: 160, sy: 90 },
  ],
  'گ': [
    { d: 'M 160 44 L 160 160', sx: 160, sy: 44 },
    { d: 'M 160 90 Q 132 84 100 100 Q 72 114 70 146 Q 68 162 84 165', sx: 160, sy: 90 },
    { d: 'M 150 38 Q 138 28 138 38', sx: 150, sy: 38 },
  ],

  // ل: tall left-leaning arc
  'ل': [{ d: 'M 134 26 Q 150 26 150 52 Q 150 102 124 144 Q 104 170 68 164 Q 42 158 42 134', sx: 134, sy: 26 }],

  // م: pretzel/closed loop
  'م': [{ d: 'M 160 76 Q 160 54 138 54 Q 116 54 116 76 Q 116 98 138 98 Q 154 98 160 84 Q 166 70 144 70 Q 110 70 88 92 Q 62 118 62 148 Q 62 168 84 168', sx: 160, sy: 76 }],

  // ن: bowl + dot above
  'ن': [
    { d: 'M 164 88 Q 100 70 52 88 Q 24 102 30 128 Q 36 154 80 159 Q 124 164 156 148 Q 180 132 164 88', sx: 164, sy: 88 },
    { d: DOT(106, 66), sx: 106, sy: 66 },
  ],

  // و: open loop
  'و': [{ d: 'M 134 56 Q 164 56 164 88 Q 164 122 134 138 Q 102 152 72 138 Q 44 122 50 88', sx: 134, sy: 56 }],

  // ه: figure-eight / two loops
  'ه': [{ d: 'M 144 76 Q 144 54 122 54 Q 100 54 100 76 Q 100 98 122 98 Q 144 98 144 76 M 100 76 Q 78 76 62 98 Q 46 120 58 144 Q 70 164 102 164 Q 134 164 150 144 Q 165 124 153 98', sx: 144, sy: 76 }],

  // ی: curved bowl + two dots below
  'ی': [
    { d: 'M 165 76 Q 144 60 112 66 Q 78 72 62 96 Q 46 120 58 144 Q 70 166 104 169 Q 140 172 160 151 Q 177 132 169 104', sx: 165, sy: 76 },
    { d: DOT(96, 178), sx: 96, sy: 178 },
    { d: DOT(120, 182), sx: 120, sy: 182 },
  ],
};

// ─── Constants ────────────────────────────────────────────────────────────────

const VB         = 200;    // SVG viewBox
const DASH       = 14;
const GAP        = 8;
const GUIDE_W    = 10;
const TRAIL_W    = 13;
const START_R    = 9;
const TOLERANCE  = 28;     // viewBox units
const DONE_THRESH = 0.76;
const GUIDE_MS   = 1800;
const CELEB_MS   = 2800;
const AnimPath   = Animated.createAnimatedComponent(Path);

// ─── ProgressDots (original — unchanged) ─────────────────────────────────────

function ProgressDots({ total, current, color }: { total: number; current: number; color: string }) {
  return (
    <View style={styles.progressDots}>
      {Array.from({ length: total }).map((_, index) => (
        <View key={index} style={[styles.progressDot, index <= current && { backgroundColor: color, width: 22 }]} />
      ))}
    </View>
  );
}

// ─── Animated guide path ──────────────────────────────────────────────────────

function GuidePath({ stroke, color, anim }: { stroke: Stroke; color: string; anim: Animated.Value }) {
  const offset = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -(DASH + GAP)], extrapolate: 'clamp' });
  return (
    <G>
      <Path d={stroke.d} stroke={color} strokeWidth={GUIDE_W + 8} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.07} />
      <AnimPath
        d={stroke.d}
        stroke={color}
        strokeWidth={GUIDE_W}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={`${DASH} ${GAP}`}
        strokeDashoffset={offset as any}
        opacity={0.6}
      />
    </G>
  );
}

// ─── TracePad — NEW SVG version ───────────────────────────────────────────────

function TracePad({ letter, lang, onComplete }: { letter: Letter; lang: Lang; onComplete: () => void }) {
  const { width, height } = useWindowDimensions();
  const size  = Math.max(330, Math.min(510, Math.min(width * 0.44, height * 0.76)));
  const scale = size / VB;

  const [trailPath, setTrailPath] = useState('');
  const [progress,  setProgress]  = useState(0);
  const [done,      setDone]      = useState(false);

  const pts      = useRef<Point[]>([]);
  const doneRef  = useRef(false);
  const guideAnim = useRef(new Animated.Value(0)).current;
  const loopRef   = useRef<Animated.CompositeAnimation | null>(null);

  const strokes    = STROKES[letter.char] ?? [{ d: 'M 100 40 L 100 160', sx: 100, sy: 40 }];
  const mainStroke = strokes[0]!;

  const startGuide = useCallback(() => {
    loopRef.current?.stop();
    guideAnim.setValue(0);
    loopRef.current = Animated.loop(
      Animated.timing(guideAnim, { toValue: 1, duration: GUIDE_MS, easing: Easing.linear, useNativeDriver: true }),
    );
    loopRef.current.start();
  }, [guideAnim]);

  useEffect(() => {
    doneRef.current = false;
    pts.current = [];
    setTrailPath('');
    setProgress(0);
    setDone(false);
    startGuide();
  }, [letter.char]);

  const reset = () => {
    doneRef.current = false;
    pts.current = [];
    setTrailPath('');
    setProgress(0);
    setDone(false);
    startGuide();
  };

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !doneRef.current,
    onMoveShouldSetPanResponder:  () => !doneRef.current,
    onPanResponderGrant: (e) => {
      if (doneRef.current) return;
      const vx = e.nativeEvent.locationX / scale;
      const vy = e.nativeEvent.locationY / scale;
      pts.current = [{ x: vx, y: vy }];
      setTrailPath(`M ${vx} ${vy}`);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onPanResponderMove: (e) => {
      if (doneRef.current) return;
      const vx = e.nativeEvent.locationX / scale;
      const vy = e.nativeEvent.locationY / scale;
      pts.current.push({ x: vx, y: vy });
      setTrailPath(smoothPath(pts.current));
      const p = calcProgress(pts.current, mainStroke.d);
      setProgress(p);
      if (p >= DONE_THRESH) {
        doneRef.current = true;
        loopRef.current?.stop();
        setDone(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onComplete();
      }
    },
    onPanResponderRelease: () => {},
  }), [letter.char, scale]);

  const isFa = lang === 'fa' || lang === 'ar';

  return (
    <View style={styles.padShell}>
      <View style={[styles.pad, { width: size, height: size, backgroundColor: letter.soft, borderColor: done ? '#22C55E' : '#FFFFFF' }]}>
        <View style={styles.letterAura} />

        {/* Ghost letter */}
        <Text style={[styles.traceLetter, { color: letter.color, fontFamily: ff(lang, 'black'), fontSize: size * 0.94, lineHeight: size * 0.98, transform: [{ translateY: -size * 0.015 }] }]}>
          {letter.char}
        </Text>

        {/* SVG — guide paths + trail + start dot */}
        <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`} style={StyleSheet.absoluteFill} {...pan.panHandlers}>
          <Defs>
            <LinearGradient id={`tg${letter.char}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={letter.color} stopOpacity="0.5" />
              <Stop offset="1" stopColor={letter.color} stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Animated guide paths */}
          {strokes.map((s, i) => <GuidePath key={i} stroke={s} color={letter.color} anim={guideAnim} />)}

          {/* User trail */}
          {trailPath ? (
            <Path d={trailPath} stroke={done ? '#22C55E' : letter.color}
              strokeWidth={TRAIL_W} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.92} />
          ) : null}

          {/* Start dot */}
          <Circle cx={mainStroke.sx} cy={mainStroke.sy} r={START_R + 4} fill={letter.color} opacity={0.22} />
          <Circle cx={mainStroke.sx} cy={mainStroke.sy} r={START_R} fill={letter.color} />
          <Circle cx={mainStroke.sx} cy={mainStroke.sy} r={START_R * 0.44} fill="white" />

          {/* Done check */}
          {done && (
            <G>
              <Circle cx={VB / 2} cy={VB / 2} r={28} fill="#22C55E" opacity={0.16} />
              <Path d="M 88 100 L 98 114 L 115 85" stroke="#22C55E" strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </G>
          )}
        </Svg>

        {/* Hint */}
        {!done && (
          <View style={styles.traceHint} pointerEvents="none">
            <Text style={[styles.traceHintText, { fontFamily: ff(lang, 'bold') }]}>
              {isFa ? 'با انگشتت خودِ حرف را دنبال کن' : 'Trace the big letter with your finger'}
            </Text>
          </View>
        )}

        {done ? <View style={styles.doneBadge}><Text style={styles.doneMark}>✓</Text></View> : null}
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: done ? '#22C55E' : letter.color }]} />
      </View>

      <View style={styles.padActions}>
        <TouchableOpacity style={styles.clearButton} onPress={reset} activeOpacity={0.86}>
          <Text style={[styles.clearText, { fontFamily: ff(lang, 'black') }]}>
            {isFa ? 'پاک کن' : 'Clear'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── WordCard (original — unchanged) ─────────────────────────────────────────

function WordCard({ letter, index, lang }: { letter: Letter; index: number; lang: Lang }) {
  const bg      = index === 0 ? letter.color : index === 1 ? '#FF7A45' : '#7C3AED';
  const label   = index === 0 ? letter.word  : index === 1 ? letter.name : letter.en;
  const caption = index === 0 ? 'کلمه'       : index === 1 ? 'نام حرف'  : 'English';
  return (
    <View style={[styles.wordCard, { backgroundColor: bg }]}>
      <View style={styles.wordImageBubble}>
        <Image source={letter.icon} style={styles.wordIcon} resizeMode="contain" />
      </View>
      <View style={styles.wordCopy}>
        <Text style={[styles.wordLabel, { fontFamily: ff(lang, 'black') }]} numberOfLines={1}>{label}</Text>
        <Text style={[styles.wordCaption, { fontFamily: ff(lang, 'bold') }]}>{caption}</Text>
      </View>
    </View>
  );
}

// ─── Celebration ──────────────────────────────────────────────────────────────

type Particle = { id: number; x: number; y: number; vx: number; vy: number; g: number; size: number; delay: number; color: string; spin: number };

function buildParticles(W: number, H: number): Particle[] {
  const cols = ['#FFE034','#FF6B9D','#4CC9F0','#80ED99','#FF9F1C','#C77DFF','#FF5757','#56CFE1'];
  const founts = [
    { x: W * 0.08, a1: -130, a2: -60 },
    { x: W * 0.92, a1: -120, a2: -50 },
    { x: W * 0.50, a1: -135, a2: -45 },
  ];
  const out: Particle[] = []; let id = 0;
  founts.forEach(f => {
    for (let i = 0; i < 55; i++) {
      const deg = f.a1 + Math.random() * (f.a2 - f.a1);
      const rad = deg * Math.PI / 180;
      const spd = H * (0.55 + Math.random() * 0.65);
      out.push({ id: id++, x: f.x + (Math.random() - 0.5) * W * 0.05, y: H, vx: Math.cos(rad) * spd, vy: Math.sin(rad) * spd, g: 480 + Math.random() * 280, size: 14 + Math.round(Math.random() * 16), delay: Math.random() * 350, color: cols[id % cols.length]!, spin: (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 2) });
    }
  });
  return out;
}

function CelebrationOverlay({ anim, color, W, H, particles }: { anim: Animated.Value; color: string; W: number; H: number; particles: Particle[] }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.wellDoneWrap, {
        opacity: anim.interpolate({ inputRange: [0, 0.1, 0.72, 1], outputRange: [0, 1, 1, 0], extrapolate: 'clamp' }),
        transform: [{ scale: anim.interpolate({ inputRange: [0, 0.14, 1], outputRange: [0.4, 1.06, 0.9], extrapolate: 'clamp' }) }],
      }]}>
        <View style={[styles.wellDoneCard, { borderColor: color, shadowColor: color }]}>
          <Text style={[styles.wellDoneText, { color, fontFamily: ff('fa', 'black') }]}>آفرین! 🌟</Text>
          <Text style={styles.wellDoneEn}>Well done!</Text>
        </View>
      </Animated.View>
      {particles.map(p => {
        const ps = p.delay / CELEB_MS; const pe = 1;
        const tSec = (pe - ps) * CELEB_MS / 1000;
        const fi = ps + (pe - ps) * 0.06; const fo = ps + (pe - ps) * 0.82;
        return (
          <Animated.Text key={p.id} style={{ position: 'absolute', left: p.x - p.size / 2, top: p.y - p.size / 2, fontSize: p.size,
            opacity: anim.interpolate({ inputRange: [ps, fi, fo, pe], outputRange: [0, 1, 1, 0], extrapolate: 'clamp' }),
            transform: [
              { translateX: anim.interpolate({ inputRange: [ps, pe], outputRange: [0, p.vx * tSec], extrapolate: 'clamp' }) },
              { translateY: anim.interpolate({ inputRange: [ps, pe], outputRange: [0, p.vy * tSec + 0.5 * p.g * tSec * tSec], extrapolate: 'clamp' }) },
              { rotate:     anim.interpolate({ inputRange: [ps, pe], outputRange: ['0deg', `${p.spin * 360}deg`], extrapolate: 'clamp' }) },
            ],
          }}>⭐</Animated.Text>
        );
      })}
    </View>
  );
}

// ─── Path helpers ─────────────────────────────────────────────────────────────

function smoothPath(pts: Point[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0]!.x} ${pts[0]!.y}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1]!; const c = pts[i]!;
    d += ` Q ${p.x} ${p.y} ${(p.x + c.x) / 2} ${(p.y + c.y) / 2}`;
  }
  return d;
}

function samplePath(d: string, n: number): Point[] {
  const pts: Point[] = [];
  const cmds = d.match(/[MLQCAHVZmlqcahvz][^MLQCAHVZmlqcahvz]*/g) ?? [];
  let cx = 0; let cy = 0; const raw: Point[] = [];
  for (const cmd of cmds) {
    const t = cmd[0]!.toUpperCase();
    const nums = (cmd.slice(1).match(/-?\d+\.?\d*/g) ?? []).map(Number);
    if (t === 'M' && nums.length >= 2) { cx = nums[0]!; cy = nums[1]!; raw.push({ x: cx, y: cy }); }
    else if (t === 'L' && nums.length >= 2) { cx = nums[0]!; cy = nums[1]!; raw.push({ x: cx, y: cy }); }
    else if (t === 'Q' && nums.length >= 4) {
      const [x1, y1, x2, y2] = nums as [number,number,number,number];
      for (let i = 0; i <= 10; i++) { const u = i / 10; raw.push({ x: (1-u)**2*cx+2*(1-u)*u*x1+u**2*x2, y: (1-u)**2*cy+2*(1-u)*u*y1+u**2*y2 }); }
      cx = x2; cy = y2;
    }
  }
  const step = Math.max(1, Math.floor(raw.length / n));
  for (let i = 0; i < raw.length && pts.length < n; i += step) pts.push(raw[i]!);
  return pts;
}

function calcProgress(user: Point[], targetD: string): number {
  const samples = samplePath(targetD, 40);
  if (!samples.length) return 0;
  let hit = 0;
  for (const s of samples) {
    for (const u of user) {
      const dx = s.x - u.x; const dy = s.y - u.y;
      if (dx*dx + dy*dy < TOLERANCE*TOLERANCE) { hit++; break; }
    }
  }
  return hit / samples.length;
}

// ─── Main screen (original structure — unchanged) ────────────────────────────

export default function LetterTracingScreen() {
  const { lang } = useContext(AppContext);
  const { speakFarsiOnly, speakInLang, stop } = useSpeech();
  const [idx, setIdx] = useState(0);
  const { width, height } = useWindowDimensions();
  const letter      = LETTERS[idx]!;
  const isFa        = lang === 'fa' || lang === 'ar';
  const mascotSize  = Math.max(210, Math.min(320, height * 0.43));
  const railHeight  = Math.max(78, Math.min(96, height * 0.14));

  const celebAnim      = useRef(new Animated.Value(0)).current;
  const [showCeleb, setShowCeleb] = useState(false);
  const celebParticles = useRef<Particle[]>([]);

  const wordCards = useMemo(() => [0, 1, 2], [letter.char]);

  const speak = () => {
    stop();
    speakFarsiOnly(`${letter.name}. ${letter.word}`, () => {
      if (!isFa) setTimeout(() => speakInLang(`${letter.name}. ${letter.en}`, lang), 220);
    });
  };

  const nextLetter = useCallback(() => {
    celebParticles.current = buildParticles(width, height);
    celebAnim.setValue(0);
    setShowCeleb(true);
    Animated.timing(celebAnim, { toValue: 1, duration: CELEB_MS, easing: Easing.linear, useNativeDriver: true })
      .start(() => setShowCeleb(false));
    setTimeout(() => setIdx(prev => Math.min(prev + 1, LETTERS.length - 1)), 1400);
  }, [width, height, celebAnim]);

  return (
    <View style={styles.root}>
      <View style={styles.skyGlow} />
      <View style={styles.lemonGlow} />
      <View style={styles.pinkGlow} />

      <View style={[styles.stage, { paddingHorizontal: Math.max(16, width * 0.025), paddingTop: 14, paddingBottom: railHeight + 8 }]}>
        <View style={styles.leftPanel}>
          <View style={styles.mascotCard}>
            <CharacterAvatar characterId="dara" size={mascotSize} floating={false} />
          </View>
        </View>

        <View style={styles.centerPanel}>
          <View style={styles.headerRow}>
            <View style={[styles.bigLetterChip, { backgroundColor: letter.color }]}>
              <Text style={[styles.bigLetterText, { fontFamily: ff(lang, 'black') }]}>{letter.char}</Text>
            </View>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { fontFamily: ff(lang, 'black') }]}>
                {isFa ? 'حرف را دنبال کن' : 'Trace the Persian letter'}
              </Text>
              <Text style={[styles.subtitle, { fontFamily: ff(lang, 'bold') }]}>
                {letter.name} • {letter.word}
              </Text>
              <ProgressDots total={LETTERS.length} current={idx} color={letter.color} />
            </View>
          </View>

          <TracePad letter={letter} lang={lang} onComplete={nextLetter} />
        </View>

        <View style={styles.rightPanel}>
          <TouchableOpacity style={[styles.soundButton, styles.soundDock, { borderColor: letter.color }]} onPress={speak} activeOpacity={0.88}>
            <Image source={neliWorldAssets.ui.voice} style={styles.soundIcon} resizeMode="contain" />
          </TouchableOpacity>
          {wordCards.map(index => (
            <WordCard key={`${letter.char}-${index}`} letter={letter} index={index} lang={lang} />
          ))}
          <TouchableOpacity style={[styles.nextButton, { backgroundColor: letter.color }]} onPress={() => setIdx(p => Math.min(p + 1, LETTERS.length - 1))} activeOpacity={0.88}>
            <Text style={[styles.nextText, { fontFamily: ff(lang, 'black') }]}>
              {isFa ? 'حرف بعدی' : 'Next letter'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.letterRailWrap, { height: railHeight }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.letterRail}>
          {LETTERS.map((item, index) => (
            <TouchableOpacity
              key={`${item.char}-${index}`}
              style={[styles.letterTile, index === idx && { backgroundColor: item.color, transform: [{ translateY: -7 }] }]}
              onPress={() => setIdx(index)}
              activeOpacity={0.86}
            >
              <Text style={[styles.letterTileText, { color: index === idx ? '#FFFFFF' : '#24305E', fontFamily: ff(lang, 'black') }]}>
                {item.char}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {showCeleb && (
        <CelebrationOverlay anim={celebAnim} color={letter.color} W={width} H={height} particles={celebParticles.current} />
      )}
    </View>
  );
}

// ─── Styles (original — unchanged, plus new additions) ───────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#A7ECFF', overflow: 'hidden' },
  skyGlow: { position: 'absolute', left: -130, top: 54, width: 380, height: 380, borderRadius: 190, backgroundColor: 'rgba(42, 201, 255, 0.42)' },
  lemonGlow: { position: 'absolute', right: 38, top: 70, width: 230, height: 230, borderRadius: 115, backgroundColor: 'rgba(255, 244, 157, 0.84)' },
  pinkGlow: { position: 'absolute', right: -110, bottom: 54, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(255, 143, 190, 0.56)' },
  stage: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 18, paddingTop: 18 },
  leftPanel: { width: '22%', minWidth: 190, alignItems: 'center', justifyContent: 'center' },
  centerPanel: { flex: 1, alignItems: 'stretch', justifyContent: 'center' },
  rightPanel: { width: '27%', minWidth: 280, gap: 14, justifyContent: 'center' },
  mascotCard: { width: '100%', minHeight: 334, borderRadius: 38, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  bigLetterChip: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  bigLetterText: { color: '#24305E', fontSize: 54, lineHeight: 64, textAlign: 'center', textAlignVertical: 'center' },
  headerCopy: { flex: 1 },
  title: { color: '#1F2450', fontSize: 27, lineHeight: 34 },
  subtitle: { color: '#626A8F', fontSize: 16, lineHeight: 22, marginTop: 2 },
  progressDots: { flexDirection: 'row', gap: 6, marginTop: 10, alignItems: 'center' },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D8E4F2' },
  soundButton: { width: 68, height: 68, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  soundDock: { alignSelf: 'flex-end', marginBottom: 8 },
  soundIcon: { width: 36, height: 36 },
  padShell: { alignItems: 'center' },
  pad: { borderRadius: 48, borderWidth: 7, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: '#1D2B68', shadowOpacity: 0.22, shadowRadius: 28, shadowOffset: { width: 0, height: 16 }, elevation: 10 },
  letterAura: { position: 'absolute', width: '82%', height: '82%', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.8)' },
  traceLetter: { opacity: 0.13, includeFontPadding: false, textAlign: 'center', textShadowColor: 'rgba(255,255,255,0.95)', textShadowOffset: { width: 0, height: 8 }, textShadowRadius: 14 },
  traceHint: { position: 'absolute', bottom: 18, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.88)', paddingHorizontal: 18, paddingVertical: 8 },
  traceHintText: { color: '#5D668A', fontSize: 13 },
  doneBadge: { position: 'absolute', right: 20, top: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF' },
  doneMark: { color: '#FFFFFF', fontFamily: ff('fa', 'black'), fontSize: 30 },
  padActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  clearButton: { minWidth: 146, height: 50, borderRadius: 25, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#EEF4FF' },
  clearText: { color: C.purple, fontSize: 15 },
  progressBarTrack: { width: '88%', height: 7, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  progressBarFill: { height: 7, borderRadius: 4, minWidth: 0 },
  wordCard: { minHeight: 112, borderRadius: 32, flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 3, borderColor: 'rgba(255,255,255,0.8)', shadowColor: '#1D2B68', shadowOpacity: 0.15, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  wordImageBubble: { width: 78, height: 78, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.88)', alignItems: 'center', justifyContent: 'center' },
  wordIcon: { width: '76%', height: '76%' },
  wordCopy: { flex: 1, marginLeft: 14 },
  wordLabel: { color: '#FFFFFF', fontSize: 23, lineHeight: 31 },
  wordCaption: { color: 'rgba(255,255,255,0.86)', fontSize: 13 },
  nextButton: { height: 62, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF' },
  nextText: { color: '#FFFFFF', fontSize: 17 },
  letterRailWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.9)', borderTopWidth: 2, borderTopColor: 'rgba(255,255,255,0.95)', justifyContent: 'center' },
  letterRail: { alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 11, paddingBottom: 10 },
  letterTile: { width: 58, height: 58, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#234A77', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  letterTileText: { fontSize: 28, lineHeight: 38 },
  wellDoneWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  wellDoneCard: { backgroundColor: '#fff', borderRadius: 28, borderWidth: 4, paddingHorizontal: 44, paddingVertical: 22, alignItems: 'center', shadowOpacity: 0.2, shadowRadius: 20, elevation: 12 },
  wellDoneText: { fontSize: 38 },
  wellDoneEn: { fontSize: 16, color: '#626A8F', marginTop: 4 },
});
