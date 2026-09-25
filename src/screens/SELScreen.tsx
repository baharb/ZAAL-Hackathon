import React, { useContext, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import * as Haptics from 'expo-haptics';
import { AppContext } from '../store/AppContext';
import { useSpeech } from '../hooks/useSpeech';
import TopBar from '../components/TopBar';
import { C } from '../theme/colors';
import { dir, ff } from '../theme/fonts';

type Mood = {
  id: string;
  en: string;
  fa: string;
  body: string;
  bodyFa: string;
  color: string;
  face: 'happy' | 'sad' | 'angry' | 'scared' | 'excited' | 'calm';
};

const MOODS: Mood[] = [
  { id: 'happy', en: 'Happy', fa: 'شاد', body: 'Happy feels warm and bright.', bodyFa: 'شادی مثل نور گرم و روشن است.', color: '#FACC15', face: 'happy' },
  { id: 'sad', en: 'Sad', fa: 'غمگین', body: 'Sad is okay. A hug or a talk can help.', bodyFa: 'غمگین بودن اشکالی ندارد. بغل یا حرف زدن کمک می‌کند.', color: '#38BDF8', face: 'sad' },
  { id: 'angry', en: 'Angry', fa: 'عصبانی', body: 'When anger comes, take three slow breaths.', bodyFa: 'وقتی عصبانی هستی، سه نفس آرام بکش.', color: '#EF4444', face: 'angry' },
  { id: 'scared', en: 'Scared', fa: 'ترسیده', body: 'When you are scared, find a safe grown-up.', bodyFa: 'وقتی می‌ترسی، پیش یک بزرگ‌تر امن برو.', color: '#A855F7', face: 'scared' },
  { id: 'excited', en: 'Excited', fa: 'هیجان‌زده', body: 'Excited energy wants to move and smile.', bodyFa: 'هیجان یعنی بدنت می‌خواهد حرکت کند و لبخند بزند.', color: '#FB923C', face: 'excited' },
  { id: 'calm', en: 'Calm', fa: 'آرام', body: 'Calm feels soft. Breathe in, breathe out.', bodyFa: 'آرامش نرم است. نفس بکش، نفس را بیرون بده.', color: '#22C55E', face: 'calm' },
];

const SCENARIOS = [
  { q: 'A friend takes your toy.', qFa: 'دوستت اسباب‌بازی تو را برمی‌دارد.', answer: 'angry' },
  { q: 'You get a birthday cake.', qFa: 'یک کیک تولد می‌بینی.', answer: 'excited' },
  { q: 'You miss grandma.', qFa: 'دلت برای مامان‌بزرگ تنگ شده.', answer: 'sad' },
  { q: 'You sit quietly and breathe.', qFa: 'آرام می‌نشینی و نفس می‌کشی.', answer: 'calm' },
];

function MoodFace({ mood, large = false }: { mood: Mood; large?: boolean }) {
  const size = large ? 150 : 74;
  const mouthStyle = mood.face === 'sad'
    ? styles.mouthSad
    : mood.face === 'angry'
      ? styles.mouthFlat
      : styles.mouthSmile;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: mood.color, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.eye, { left: size * 0.28, top: size * 0.34 }]} />
      <View style={[styles.eye, { right: size * 0.28, top: size * 0.34 }]} />
      {mood.face === 'scared' ? <View style={[styles.scaredMouth, { bottom: size * 0.23 }]} /> : <View style={[mouthStyle, { bottom: size * 0.24 }]} />}
      {mood.face === 'angry' ? (
        <>
          <View style={[styles.brow, { left: size * 0.22, top: size * 0.25, transform: [{ rotate: '22deg' }] }]} />
          <View style={[styles.brow, { right: size * 0.22, top: size * 0.25, transform: [{ rotate: '-22deg' }] }]} />
        </>
      ) : null}
    </View>
  );
}

export default function SELScreen() {
  const { lang, addStars } = useContext(AppContext);
  const { speakFarsiOnly, speakInLang, stop } = useSpeech();
  const { width, height } = useWindowDimensions();
  const ui = Math.min(width / 390, height / 844);
  const [tab, setTab] = useState<'moods' | 'quiz'>('moods');
  const [selected, setSelected] = useState<Mood | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const isFa = lang === 'fa' || lang === 'ar';

  const speakMood = (mood: Mood) => {
    stop();
    speakFarsiOnly(`${mood.fa}. ${mood.bodyFa}`, () => {
      if (!isFa) setTimeout(() => speakInLang(`${mood.en}. ${mood.body}`, lang), 240);
    });
  };

  const chooseMood = (mood: Mood) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelected(mood);
    speakMood(mood);
  };

  const answer = (id: string) => {
    if (picked) return;
    setPicked(id);
    const ok = id === SCENARIOS[qIdx].answer;
    Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    if (ok) addStars(2);
    const right = MOODS.find(m => m.id === SCENARIOS[qIdx].answer)!;
    speakMood(right);
  };

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFF6D8' }]} />
      <TopBar title="Feelings" titleFa="احساسات" showBack dark={false} />

      <View style={[styles.tabs, { padding: Math.max(12, Math.round(16 * ui)), gap: Math.max(8, Math.round(10 * ui)) }]}>
        <TouchableOpacity style={[styles.tab, { height: Math.max(44, Math.round(48 * ui)), borderRadius: Math.max(22, Math.round(24 * ui)) }, tab === 'moods' && styles.tabOn]} onPress={() => { setTab('moods'); setSelected(null); }}>
          <Text style={[styles.tabText, tab === 'moods' && styles.tabTextOn]}>{isFa ? 'احساسات' : 'Feelings'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, { height: Math.max(44, Math.round(48 * ui)), borderRadius: Math.max(22, Math.round(24 * ui)) }, tab === 'quiz' && styles.tabOn]} onPress={() => { setTab('quiz'); setPicked(null); }}>
          <Text style={[styles.tabText, tab === 'quiz' && styles.tabTextOn]}>{isFa ? 'تمرین' : 'Practice'}</Text>
        </TouchableOpacity>
      </View>

      {tab === 'moods' ? (
        selected ? (
          <View style={styles.detail}>
            <MoodFace mood={selected} large />
            <Text style={[styles.detailTitle, { fontFamily: ff(lang, 'black') }, dir(lang)]}>{isFa ? selected.fa : selected.en}</Text>
            <Text style={[styles.detailBody, { fontFamily: ff(lang, 'regular') }, dir(lang)]}>{isFa ? selected.bodyFa : selected.body}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => speakMood(selected)}>
              <Text style={[styles.primaryText, { fontFamily: ff(lang, 'black') }]}>{isFa ? 'دوباره بشنو' : 'Hear again'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setSelected(null)}>
              <Text style={styles.secondaryText}>{isFa ? 'همه احساسات' : 'All feelings'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.grid, { padding: Math.max(12, Math.round(16 * ui)), paddingTop: Math.max(2, Math.round(4 * ui)) }]} showsVerticalScrollIndicator={false}>
            {MOODS.map(mood => (
              <TouchableOpacity key={mood.id} style={styles.moodCard} onPress={() => chooseMood(mood)} activeOpacity={0.88}>
                <MoodFace mood={mood} />
                <Text style={[styles.moodName, { fontFamily: ff(lang, 'black') }]}>{isFa ? mood.fa : mood.en}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )
      ) : (
        <View style={[styles.quiz, { padding: Math.max(12, Math.round(16 * ui)) }]}>
          <Text style={[styles.quizQ, { fontFamily: ff(lang, 'black'), fontSize: Math.max(22, Math.round(25 * ui)), lineHeight: Math.max(30, Math.round(34 * ui)) }, dir(lang)]}>{isFa ? SCENARIOS[qIdx].qFa : SCENARIOS[qIdx].q}</Text>
          <Text style={[styles.quizSub, { fontFamily: ff(lang, 'regular'), fontSize: Math.max(13, Math.round(15 * ui)), marginTop: Math.max(5, Math.round(6 * ui)) }, dir(lang)]}>{isFa ? 'چه احساسی داری؟' : 'How would you feel?'}</Text>
          <View style={[styles.gridSmall, { marginTop: Math.max(14, Math.round(18 * ui)), gap: Math.max(8, Math.round(10 * ui)) }]}>
            {MOODS.map(mood => {
              const correct = !!picked && mood.id === SCENARIOS[qIdx].answer;
              const wrong = picked === mood.id && mood.id !== SCENARIOS[qIdx].answer;
              return (
                <TouchableOpacity key={mood.id} style={[styles.smallMood, correct && styles.correct, wrong && styles.wrong]} onPress={() => answer(mood.id)}>
                  <MoodFace mood={mood} />
                  <Text style={styles.smallMoodText}>{isFa ? mood.fa : mood.en}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {picked ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => { setQIdx(i => (i + 1) % SCENARIOS.length); setPicked(null); }}>
              <Text style={[styles.primaryText, { fontFamily: ff(lang, 'black') }]}>{isFa ? 'بعدی' : 'Next'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF6D8' },
  tabs: { flexDirection: 'row' },
  tab: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: C.purple },
  tabText: { fontFamily: ff('fa', 'black'), color: C.textDark, fontSize: 14 },
  tabTextOn: { color: '#FFFFFF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  moodCard: { width: '48%', minHeight: 150, borderRadius: 28, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 14 },
  moodName: { color: C.textDark, fontSize: 18, marginTop: 10, textAlign: 'center' },
  eye: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#1B1238' },
  mouthSmile: { position: 'absolute', width: 30, height: 15, borderBottomWidth: 4, borderBottomColor: '#1B1238', borderRadius: 15 },
  mouthSad: { position: 'absolute', width: 30, height: 15, borderTopWidth: 4, borderTopColor: '#1B1238', borderRadius: 15 },
  mouthFlat: { position: 'absolute', width: 28, height: 4, borderRadius: 2, backgroundColor: '#1B1238' },
  scaredMouth: { position: 'absolute', width: 18, height: 24, borderRadius: 10, backgroundColor: '#1B1238' },
  brow: { position: 'absolute', width: 23, height: 4, borderRadius: 2, backgroundColor: '#1B1238' },
  detail: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  detailTitle: { color: C.textDark, fontSize: 30, lineHeight: 38, marginTop: 18, textAlign: 'center' },
  detailBody: { color: C.textMid, fontSize: 17, lineHeight: 27, marginTop: 10, textAlign: 'center' },
  primaryBtn: { minWidth: 170, height: 56, borderRadius: 28, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center', marginTop: 22, paddingHorizontal: 26 },
  primaryText: { color: C.textDark, fontSize: 16 },
  secondaryBtn: { marginTop: 10, padding: 12 },
  secondaryText: { fontFamily: ff('fa', 'black'), color: C.purple, fontSize: 14 },
  quiz: { flex: 1, padding: 16, alignItems: 'center' },
  quizQ: { color: C.textDark, fontSize: 25, lineHeight: 34, textAlign: 'center', marginTop: 8 },
  quizSub: { color: C.textMid, fontSize: 15, marginTop: 6, textAlign: 'center' },
  gridSmall: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 18 },
  smallMood: { width: '31%', minHeight: 126, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 8, borderWidth: 4.5, borderColor: 'transparent' },
  correct: { borderColor: '#22C55E', backgroundColor: '#F0FFF4' },
  wrong: { borderColor: '#FF6B6B', backgroundColor: '#FFF1F2' },
  smallMoodText: { fontFamily: ff('fa', 'black'), color: C.textDark, fontSize: 11, textAlign: 'center', marginTop: 6 },
});
