import React, { useContext, useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import * as Haptics from 'expo-haptics';
import { AppContext } from '../store/AppContext';
import { useSpeech } from '../hooks/useSpeech';
import TopBar from '../components/TopBar';
import { C } from '../theme/colors';
import { dir, ff } from '../theme/fonts';

type Activity = {
  id: string;
  title: string;
  titleFa: string;
  color: string;
  accent: string;
  kind: 'dance' | 'stretch' | 'simon';
  moves: { en: string; fa: string; duration: number; pose: 'clap' | 'spin' | 'jump' | 'tree' | 'breathe' | 'touch' }[];
};

const ACTIVITIES: Activity[] = [
  {
    id: 'dance',
    title: 'Dance Party',
    titleFa: 'رقص و شادی',
    color: '#EC4899',
    accent: '#FACC15',
    kind: 'dance',
    moves: [
      { en: 'Clap your hands three times.', fa: 'سه بار دست بزن.', duration: 3, pose: 'clap' },
      { en: 'Spin around slowly.', fa: 'آرام یک دور بچرخ.', duration: 4, pose: 'spin' },
      { en: 'Jump up high.', fa: 'بلند بپر.', duration: 3, pose: 'jump' },
    ],
  },
  {
    id: 'stretch',
    title: 'Little Yoga',
    titleFa: 'یوگای کوچولو',
    color: '#22C55E',
    accent: '#38BDF8',
    kind: 'stretch',
    moves: [
      { en: 'Stand tall like a tree.', fa: 'مثل درخت بلند بایست.', duration: 5, pose: 'tree' },
      { en: 'Reach for your toes.', fa: 'دستت را به انگشت پا برسان.', duration: 5, pose: 'touch' },
      { en: 'Take three slow breaths.', fa: 'سه نفس آرام بکش.', duration: 6, pose: 'breathe' },
    ],
  },
  {
    id: 'simon',
    title: 'Neli Says',
    titleFa: 'نلی می‌گوید',
    color: '#6C4EFF',
    accent: '#FB923C',
    kind: 'simon',
    moves: [
      { en: 'Neli says: touch your nose.', fa: 'نلی می‌گوید: بینی‌ات را لمس کن.', duration: 3, pose: 'touch' },
      { en: 'Neli says: jump two times.', fa: 'نلی می‌گوید: دو بار بپر.', duration: 4, pose: 'jump' },
      { en: 'Neli says: breathe slowly.', fa: 'نلی می‌گوید: آرام نفس بکش.', duration: 5, pose: 'breathe' },
    ],
  },
];

function MoveArt({ activity, pose }: { activity: Activity; pose?: Activity['moves'][number]['pose'] }) {
  const p = pose ?? activity.moves[0].pose;
  return (
    <View style={styles.artStage}>
      <View style={[styles.floor, { backgroundColor: activity.accent + '55' }]} />
      <View style={[styles.head, { backgroundColor: activity.color }]}>
        <View style={styles.eyeLeft} />
        <View style={styles.eyeRight} />
        <View style={styles.smile} />
      </View>
      <View style={[styles.body, { backgroundColor: activity.color }]} />
      <View style={[
        styles.arm,
        styles.armLeft,
        { backgroundColor: activity.accent },
        p === 'clap' && { left: 103, transform: [{ rotate: '-20deg' }] },
        p === 'tree' && { top: 58, transform: [{ rotate: '-54deg' }] },
      ]} />
      <View style={[
        styles.arm,
        styles.armRight,
        { backgroundColor: activity.accent },
        p === 'clap' && { right: 103, transform: [{ rotate: '20deg' }] },
        p === 'tree' && { top: 58, transform: [{ rotate: '54deg' }] },
      ]} />
      <View style={[styles.leg, styles.legLeft, { backgroundColor: activity.color }, p === 'jump' && { bottom: 54 }]} />
      <View style={[styles.leg, styles.legRight, { backgroundColor: activity.color }, p === 'jump' && { bottom: 54 }]} />
      {p === 'breathe' ? <View style={[styles.breathCircle, { borderColor: activity.accent }]} /> : null}
    </View>
  );
}

export default function PhysicalActivityScreen() {
  const { lang, addStars } = useContext(AppContext);
  const { speakFarsiOnly, speakInLang, stop } = useSpeech();
  const [active, setActive] = useState<Activity | null>(null);
  const [step, setStep] = useState(0);
  const [count, setCount] = useState(0);
  const bounce = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { width, height } = useWindowDimensions();
  const ui = Math.min(width / 390, height / 844);
  const isFa = lang === 'fa' || lang === 'ar';

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); stop(); }, []);

  const startMove = (activity: Activity, moveIndex: number) => {
    const move = activity.moves[moveIndex];
    if (timer.current) clearInterval(timer.current);
    setCount(move.duration);
    stop();
    speakFarsiOnly(move.fa, () => {
      if (!isFa) setTimeout(() => speakInLang(move.en, lang), 220);
    });
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1.05, duration: 420, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 1, duration: 420, useNativeDriver: true }),
      ]),
      { iterations: move.duration },
    ).start();
    timer.current = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) {
          if (timer.current) clearInterval(timer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const openActivity = (activity: Activity) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActive(activity);
    setStep(0);
    setTimeout(() => startMove(activity, 0), 200);
  };

  const next = () => {
    if (!active) return;
    if (step < active.moves.length - 1) {
      const n = step + 1;
      setStep(n);
      startMove(active, n);
    } else {
      addStars(8);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      stop();
      setActive(null);
      setStep(0);
    }
  };

  if (active) {
    const move = active.moves[step];
    return (
      <View style={styles.root}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFF6D8' }]} />
        <TopBar title={active.title} titleFa={active.titleFa} showBack dark={false} onBack={() => { stop(); if (timer.current) clearInterval(timer.current); setActive(null); }} />
        <View style={[styles.progressRow, { gap: Math.max(6, Math.round(8 * ui)), marginVertical: Math.max(10, Math.round(12 * ui)) }]}>
          {active.moves.map((_, i) => <View key={i} style={[styles.stepDot, i <= step && { backgroundColor: active.color }]} />)}
        </View>
        <Animated.View style={[styles.activeArt, { transform: [{ scale: bounce }], marginTop: Math.max(2, Math.round(4 * ui)) }]}>
          <MoveArt activity={active} pose={move.pose} />
        </Animated.View>
        <View style={[styles.moveCard, { margin: Math.max(14, Math.round(16 * ui)), padding: Math.max(16, Math.round(20 * ui)), borderRadius: Math.max(24, Math.round(30 * ui)) }]}>
          <Text style={[styles.moveText, { fontFamily: ff(lang, 'black'), fontSize: Math.max(22, Math.round(27 * ui)), lineHeight: Math.max(30, Math.round(36 * ui)) }, dir(lang)]}>{isFa ? move.fa : move.en}</Text>
          <Text style={[styles.timerText, { fontSize: Math.max(36, Math.round(44 * ui)), marginTop: Math.max(8, Math.round(10 * ui)) }]}>{count > 0 ? count : '✓'}</Text>
        </View>
        <View style={[styles.actions, { gap: Math.max(10, Math.round(12 * ui)), padding: Math.max(14, Math.round(16 * ui)) }]}>
          <TouchableOpacity style={[styles.listenBtn, { height: Math.max(50, Math.round(56 * ui)), borderRadius: Math.max(24, Math.round(28 * ui)) }]} onPress={() => startMove(active, step)}>
            <Text style={styles.listenText}>{isFa ? 'دوباره بشنو' : 'Hear again'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.nextBtn, { backgroundColor: active.color, height: Math.max(50, Math.round(56 * ui)), borderRadius: Math.max(24, Math.round(28 * ui)) }]} onPress={next}>
            <Text style={styles.nextText}>{step < active.moves.length - 1 ? (isFa ? 'حرکت بعدی' : 'Next move') : (isFa ? 'تمام' : 'Finish')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFF6D8' }]} />
      <TopBar title="Move & Play" titleFa="حرکت و بازی" showBack dark={false} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { borderRadius: Math.max(26, Math.round(30 * ui)), padding: Math.max(16, Math.round(20 * ui)), marginBottom: Math.max(12, Math.round(14 * ui)) }]}>
          <Text style={[styles.kicker, { fontFamily: ff(lang, 'bold'), fontSize: Math.max(12, Math.round(13 * ui)), marginBottom: Math.max(5, Math.round(7 * ui)) }, dir(lang)]}>{isFa ? 'بدن فعال، ذهن آرام' : 'Active body, calm mind'}</Text>
          <Text style={[styles.title, { fontFamily: ff(lang, 'black'), fontSize: Math.max(26, Math.round(30 * ui)), lineHeight: Math.max(33, Math.round(38 * ui)) }, dir(lang)]}>{isFa ? 'یک حرکت انتخاب کن' : 'Pick an activity'}</Text>
        </View>
        {ACTIVITIES.map(activity => (
          <TouchableOpacity key={activity.id} style={styles.card} onPress={() => openActivity(activity)} activeOpacity={0.88}>
            <View style={[styles.cardArt, { backgroundColor: activity.color + '18', width: Math.max(92, Math.round(104 * ui)), height: Math.max(92, Math.round(104 * ui)), borderRadius: Math.max(20, Math.round(24 * ui)) }]}>
              <MoveArt activity={activity} />
            </View>
            <View style={styles.cardCopy}>
              <Text style={[styles.cardTitle, { fontFamily: ff(lang, 'black'), fontSize: Math.max(16, Math.round(18 * ui)) }, dir(lang)]}>{isFa ? activity.titleFa : activity.title}</Text>
              <Text style={[styles.cardSub, { fontSize: Math.max(11, Math.round(12 * ui)) }]}>{activity.moves.length} {isFa ? 'حرکت' : 'moves'}</Text>
            </View>
            <View style={[styles.playPill, { backgroundColor: activity.color }]}>
              <Text style={styles.playText}>{isFa ? 'شروع' : 'Start'}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF6D8' },
  scroll: { padding: 16, paddingBottom: 34 },
  hero: { backgroundColor: '#FFFFFF' },
  kicker: { color: C.purple, marginBottom: 7 },
  title: { color: C.textDark },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 28, backgroundColor: '#FFFFFF', padding: 12, marginBottom: 12 },
  cardArt: { overflow: 'hidden' },
  cardCopy: { flex: 1 },
  cardTitle: { color: C.textDark, fontSize: 18 },
  cardSub: { fontFamily: ff('fa', 'bold'), color: C.textMid, marginTop: 4 },
  playPill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  playText: { fontFamily: ff('fa', 'black'), color: '#FFFFFF', fontSize: 11 },
  progressRow: { flexDirection: 'row', justifyContent: 'center' },
  stepDot: { width: 48, height: 10, borderRadius: 6, backgroundColor: '#DED7F8' },
  activeArt: { alignItems: 'center', marginTop: 4 },
  moveCard: { backgroundColor: '#FFFFFF', alignItems: 'center' },
  moveText: { color: C.textDark, textAlign: 'center' },
  timerText: { fontFamily: ff('fa', 'black'), color: C.purple },
  actions: { flexDirection: 'row' },
  listenBtn: { flex: 1, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  listenText: { fontFamily: ff('fa', 'black'), color: C.purple, fontSize: 13 },
  nextBtn: { flex: 1.2, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  nextText: { fontFamily: ff('fa', 'black'), color: '#FFFFFF', fontSize: 14 },
  artStage: { width: '100%', height: '100%', minHeight: 104, borderRadius: 24, backgroundColor: '#E9F7FF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  floor: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '28%' },
  head: { position: 'absolute', top: 17, width: 44, height: 42, borderRadius: 21 },
  body: { position: 'absolute', top: 58, width: 48, height: 52, borderRadius: 20 },
  eyeLeft: { position: 'absolute', left: 13, top: 16, width: 5, height: 5, borderRadius: 3, backgroundColor: '#1B1238' },
  eyeRight: { position: 'absolute', right: 13, top: 16, width: 5, height: 5, borderRadius: 3, backgroundColor: '#1B1238' },
  smile: { position: 'absolute', bottom: 10, alignSelf: 'center', width: 18, height: 8, borderBottomWidth: 2.5, borderBottomColor: '#1B1238', borderRadius: 8 },
  arm: { position: 'absolute', top: 64, width: 15, height: 58, borderRadius: 9 },
  armLeft: { left: 78, transform: [{ rotate: '24deg' }] },
  armRight: { right: 78, transform: [{ rotate: '-24deg' }] },
  leg: { position: 'absolute', bottom: 25, width: 15, height: 48, borderRadius: 9 },
  legLeft: { left: 113 },
  legRight: { right: 113 },
  breathCircle: { position: 'absolute', width: 92, height: 92, borderRadius: 46, borderWidth: 5, opacity: 0.5 },
});
