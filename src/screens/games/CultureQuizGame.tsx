import React, { useContext, useState } from 'react';
import { Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AppContext } from '../../store/AppContext';
import { ff, dir } from '../../theme/fonts';
import { C } from '../../theme/colors';
import TopBar from '../../components/TopBar';
import { neliWorldAssets } from '../../assets/neliWorldAssets';

type CultureItem = {
  id: string;
  fa: string;
  en: string;
  hintFa: string;
  hintEn: string;
  color: string;
  accent: string;
  kind: 'nowruz' | 'poet' | 'persepolis' | 'carpet' | 'food' | 'music';
};

const CULTURE_POOL: CultureItem[] = [
  {
    id: 'nowruz',
    fa: 'نوروز',
    en: 'Nowruz',
    hintFa: 'سال نو ایرانی',
    hintEn: 'Persian new year',
    color: '#22C55E',
    accent: '#FACC15',
    kind: 'nowruz',
  },
  {
    id: 'hafez',
    fa: 'حافظ',
    en: 'Hafez',
    hintFa: 'شاعر بزرگ ایرانی',
    hintEn: 'A great Persian poet',
    color: '#A855F7',
    accent: '#FDE68A',
    kind: 'poet',
  },
  {
    id: 'persepolis',
    fa: 'تخت جمشید',
    en: 'Persepolis',
    hintFa: 'بنای باستانی ایران',
    hintEn: 'Ancient Persian site',
    color: '#FB923C',
    accent: '#FDBA74',
    kind: 'persepolis',
  },
  {
    id: 'carpet',
    fa: 'فرش ایرانی',
    en: 'Persian Carpet',
    hintFa: 'هنر رنگارنگ خانه‌ها',
    hintEn: 'Colorful woven art',
    color: '#EF4444',
    accent: '#38BDF8',
    kind: 'carpet',
  },
  {
    id: 'sabzi',
    fa: 'سبزی پلو',
    en: 'Sabzi Polo',
    hintFa: 'غذای خوشمزه ایرانی',
    hintEn: 'A Persian rice dish',
    color: '#16A34A',
    accent: '#FFFFFF',
    kind: 'food',
  },
  {
    id: 'tar',
    fa: 'تار',
    en: 'Tar',
    hintFa: 'ساز ایرانی',
    hintEn: 'Persian instrument',
    color: '#92400E',
    accent: '#FDE68A',
    kind: 'music',
  },
];

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function makeQuestion() {
  const correct = CULTURE_POOL[Math.floor(Math.random() * CULTURE_POOL.length)];
  const options = shuffle([correct, ...shuffle(CULTURE_POOL.filter(item => item.id !== correct.id)).slice(0, 3)]);
  return { correct, options };
}

function CultureArt({ item }: { item: CultureItem }) {
  if (item.kind === 'food') {
    return (
      <ImageBackground source={neliWorldAssets.rooms.kitchenWide} style={styles.artStage} imageStyle={styles.artScene}>
        <Image source={neliWorldAssets.persianFoods.sabziPolo} style={styles.cultureImage} resizeMode="contain" />
      </ImageBackground>
    );
  }
  if (item.kind === 'nowruz') {
    return (
      <ImageBackground source={neliWorldAssets.rooms.gardenWide} style={styles.artStage} imageStyle={styles.artScene}>
        <Image source={neliWorldAssets.persianFoods.sabziPolo} style={[styles.cultureImage, { width: 160 }]} resizeMode="contain" />
        <Image source={neliWorldAssets.foods.apple} style={styles.cultureSmallA} resizeMode="contain" />
        <Image source={neliWorldAssets.ui.star} style={styles.cultureSmallB} resizeMode="contain" />
      </ImageBackground>
    );
  }
  if (item.kind === 'poet') {
    return (
      <View style={[styles.artStage, { backgroundColor: '#EADFFF' }]}>
        <Image source={neliWorldAssets.ui.book} style={styles.cultureImage} resizeMode="contain" />
        <Image source={neliWorldAssets.ui.paintbrush} style={styles.cultureSmallB} resizeMode="contain" />
      </View>
    );
  }
  if (item.kind === 'music') {
    return (
      <View style={[styles.artStage, { backgroundColor: '#FFE7B8' }]}>
        <Image source={neliWorldAssets.ui.voice} style={styles.cultureImage} resizeMode="contain" />
      </View>
    );
  }
  if (item.kind === 'persepolis') {
    return (
      <View style={styles.artStage}>
        <View style={[styles.column, { backgroundColor: item.color, left: 78 }]} />
        <View style={[styles.column, { backgroundColor: item.color, right: 78 }]} />
        <View style={[styles.roof, { backgroundColor: item.accent }]} />
        <View style={[styles.steps, { backgroundColor: '#7C2D12' }]} />
      </View>
    );
  }
  if (item.kind === 'carpet') {
    return (
      <View style={styles.artStage}>
        <View style={[styles.carpet, { backgroundColor: item.color }]}>
          <View style={[styles.carpetCenter, { borderColor: item.accent }]} />
          <View style={[styles.carpetLine, { backgroundColor: item.accent, top: 24 }]} />
          <View style={[styles.carpetLine, { backgroundColor: item.accent, bottom: 24 }]} />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.artStage}>
      <View style={[styles.instrumentBody, { backgroundColor: item.color }]} />
      <View style={[styles.instrumentNeck, { backgroundColor: item.accent }]} />
      <View style={styles.instrumentString} />
    </View>
  );
}

export default function CultureQuizGame() {
  const { lang, addStars } = useContext(AppContext);
  const [q, setQ] = useState(makeQuestion);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);

  const handleAnswer = (id: string) => {
    if (selected) return;
    setSelected(id);
    const correct = id === q.correct.id;
    if (correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addStars(3);
      setScore(prev => prev + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setTotal(prev => prev + 1);
    setTimeout(() => {
      setQ(makeQuestion());
      setSelected(null);
    }, 1200);
  };

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFF6D8' }]} />
      <TopBar
        title="Culture"
        titleFa="فرهنگ ایران"
        showClose
        dark={false}
        rightContent={<Text style={styles.score}>{score}/{total}</Text>}
      />

      <View style={styles.content}>
        <View style={styles.questionCard}>
          <Text style={[styles.kicker, { fontFamily: ff(lang, 'bold') }, dir(lang)]}>
            {lang === 'fa' ? q.correct.hintFa : q.correct.hintEn}
          </Text>
          <CultureArt item={q.correct} />
          <Text style={[styles.question, { fontFamily: ff(lang, 'black') }, dir(lang)]}>
            {lang === 'fa' ? 'این کدام است؟' : 'Which one is this?'}
          </Text>
        </View>

        <View style={styles.options}>
          {q.options.map(opt => {
            const correct = !!selected && opt.id === q.correct.id;
            const wrong = selected === opt.id && opt.id !== q.correct.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.option, correct && styles.optionCorrect, wrong && styles.optionWrong]}
                onPress={() => handleAnswer(opt.id)}
                activeOpacity={0.86}
              >
                <Text style={[styles.optFa, { fontFamily: ff('fa', 'black') }]}>{opt.fa}</Text>
                <Text style={styles.optEn}>{opt.en}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  score: {
    minWidth: 58,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.yellow,
    color: C.textDark,
    fontFamily: ff('fa', 'black'),
    fontSize: 15,
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingTop: 10,
  },
  content: { flex: 1, padding: 16, paddingTop: 8 },
  questionCard: {
    minHeight: 338,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    padding: 18,
    alignItems: 'center',
    shadowColor: '#20124D',
    shadowOpacity: 0.13,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 4,
  },
  kicker: { color: C.purple, fontSize: 15, marginBottom: 10, textAlign: 'center' },
  question: { color: C.textDark, fontSize: 26, marginTop: 12, textAlign: 'center' },
  artStage: {
    width: '100%',
    height: 218,
    borderRadius: 28,
    backgroundColor: '#F7F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artScene: { width: '100%', height: '100%' },
  cultureImage: { width: 138, height: 138 },
  cultureSmallA: { position: 'absolute', left: 54, bottom: 40, width: 58, height: 58 },
  cultureSmallB: { position: 'absolute', right: 52, top: 34, width: 62, height: 62 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 16 },
  option: {
    width: '48%',
    minHeight: 86,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 12,
    justifyContent: 'center',
    borderWidth: 4.5,
    borderColor: 'transparent',
    shadowColor: '#20124D',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  optionCorrect: { borderColor: '#22C55E', backgroundColor: '#F0FFF4' },
  optionWrong: { borderColor: '#FF6B6B', backgroundColor: '#FFF1F2' },
  optFa: { color: C.textDark, fontSize: 18, textAlign: 'center' },
  optEn: { fontFamily: ff('fa', 'bold'), color: C.textMid, fontSize: 12, marginTop: 2, textAlign: 'center' },
  table: { position: 'absolute', bottom: 43, width: 180, height: 22, borderRadius: 11 },
  grassCup: { width: 74, height: 68, borderTopLeftRadius: 34, borderTopRightRadius: 34, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  egg: { position: 'absolute', bottom: 66, width: 34, height: 44, borderRadius: 20 },
  bookCover: { width: 110, height: 134, borderRadius: 18, transform: [{ rotate: '-8deg' }] },
  bookPage: { position: 'absolute', width: 86, height: 106, borderRadius: 14, right: 86 },
  quill: { position: 'absolute', width: 18, height: 118, borderRadius: 10, right: 92, top: 42, transform: [{ rotate: '35deg' }] },
  column: { position: 'absolute', bottom: 55, width: 34, height: 112, borderRadius: 10 },
  roof: { position: 'absolute', top: 48, width: 190, height: 28, borderRadius: 14 },
  steps: { position: 'absolute', bottom: 38, width: 216, height: 22, borderRadius: 11 },
  carpet: { width: 176, height: 128, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  carpetCenter: { width: 82, height: 82, borderRadius: 22, borderWidth: 7, transform: [{ rotate: '45deg' }] },
  carpetLine: { position: 'absolute', left: 24, right: 24, height: 8, borderRadius: 4 },
  plate: { width: 174, height: 126, borderRadius: 63, backgroundColor: '#FFFFFF', borderWidth: 10, borderColor: '#E9D5FF', alignItems: 'center', justifyContent: 'center' },
  rice: { width: 114, height: 76, borderRadius: 38 },
  herb: { position: 'absolute', width: 20, height: 20, borderRadius: 10 },
  instrumentBody: { width: 96, height: 106, borderRadius: 48 },
  instrumentNeck: { position: 'absolute', top: 42, width: 24, height: 130, borderRadius: 12, transform: [{ rotate: '24deg' }] },
  instrumentString: { position: 'absolute', top: 70, width: 3, height: 110, backgroundColor: '#FFFFFF', transform: [{ rotate: '24deg' }] },
});
