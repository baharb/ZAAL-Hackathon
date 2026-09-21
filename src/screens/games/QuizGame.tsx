import React, { useContext, useState } from 'react';
import { Image, ImageBackground, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AppContext } from '../../store/AppContext';
import { useSpeech } from '../../hooks/useSpeech';
import TopBar from '../../components/TopBar';
import CharacterAvatar from '../../components/CharacterAvatar';
import { C } from '../../theme/colors';
import { dir, ff } from '../../theme/fonts';
import { neliWorldAssets } from '../../assets/neliWorldAssets';

type Item = {
  id: string;
  fa: string;
  en: string;
  source: ImageSourcePropType;
  color: string;
  soft: string;
  kind: 'cat' | 'apple' | 'water' | 'sun' | 'house' | 'flower';
};

const ITEMS: Item[] = [
  { id: 'cat', fa: 'گربه', en: 'Cat', kind: 'cat', source: neliWorldAssets.animals.cat, color: '#A855F7', soft: '#F1E8FF' },
  { id: 'apple', fa: 'سیب', en: 'Apple', kind: 'apple', source: neliWorldAssets.foods.apple, color: '#EF4444', soft: '#FFE4E6' },
  { id: 'water', fa: 'آب', en: 'Water', kind: 'water', source: neliWorldAssets.foods.water, color: '#0EA5E9', soft: '#E0F2FE' },
  { id: 'sun', fa: 'خورشید', en: 'Sun', kind: 'sun', source: neliWorldAssets.ui.star, color: '#F59E0B', soft: '#FEF3C7' },
  { id: 'house', fa: 'خانه', en: 'House', kind: 'house', source: neliWorldAssets.rooms.livingRoomWide, color: '#F97316', soft: '#FFEDD5' },
  { id: 'flower', fa: 'گل', en: 'Flower', kind: 'flower', source: neliWorldAssets.ui.paintbrush, color: '#EC4899', soft: '#FCE7F3' },
];

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function makeQuestion() {
  const correct = ITEMS[Math.floor(Math.random() * ITEMS.length)];
  const options = shuffle([correct, ...shuffle(ITEMS.filter(item => item.id !== correct.id)).slice(0, 3)]);
  return { correct, options };
}

function ItemArt({ item, characterId }: { item: Item; characterId: string }) {
  if (item.kind === 'house') {
    return (
      <ImageBackground source={item.source} style={[styles.art, { backgroundColor: item.soft }]} imageStyle={styles.artImage}>
        <View style={styles.houseOverlay} />
        <CharacterAvatar characterId={characterId} size={124} />
      </ImageBackground>
    );
  }

  return (
    <View style={[styles.art, { backgroundColor: item.soft }]}>
      <View style={[styles.artHalo, { backgroundColor: item.color }]} />
      <View style={[styles.artSpark, { backgroundColor: item.color }]} />
      <Image source={item.source} style={item.kind === 'cat' ? styles.artCharacter : styles.artAsset} resizeMode="contain" />
    </View>
  );
}

export default function QuizGame() {
  const { lang, addStars, selectedCharacterId } = useContext(AppContext);
  const { speakFarsiOnly, speakInLang, stop } = useSpeech();
  const { width, height } = useWindowDimensions();
  const [q, setQ] = useState(makeQuestion);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const isFa = lang === 'fa' || lang === 'ar';
  const compact = width < 760;
  // The question card's art box, paddings and text were all fixed pixels
  // (~364pt tall of intrinsic content) against a tablet-height reference. On
  // a landscape phone (height as low as 360) that overflowed root's
  // `overflow:'hidden'` and silently clipped the question text off the
  // bottom. Scale it down below the tablet breakpoint (see TABLET_MIN_EDGE
  // in App.tsx) the same way HomeScreen scales its art.
  const k = Math.min(1, height / 600);
  const s = (v: number, min: number) => Math.max(min, Math.round(v * k));

  const speakItem = () => {
    stop();
    speakFarsiOnly(q.correct.fa, () => {
      if (!isFa) setTimeout(() => speakInLang(q.correct.en, lang), 220);
    });
  };

  const answer = (item: Item) => {
    if (selected) return;
    setSelected(item.id);
    const ok = item.id === q.correct.id;
    if (ok) {
      addStars(2);
      setScore(prev => prev + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setTotal(prev => prev + 1);
    setTimeout(() => {
      setQ(makeQuestion());
      setSelected(null);
    }, 980);
  };

  return (
    <View style={styles.root}>
      <View style={styles.skyBubble} />
      <View style={styles.lemonBubble} />
      <View style={styles.peachBubble} />
      <View style={styles.tinyDotA} />
      <View style={styles.tinyDotB} />
      <TopBar
        title="Word Quiz"
        titleFa="مسابقه کلمه"
        showClose
        dark={false}
        rightContent={<Text style={styles.score}>{score}/{total}</Text>}
      />

      <View style={[styles.content, compact && styles.contentCompact]}>
        <View style={[styles.questionCard, compact && styles.questionCardCompact, { paddingVertical: s(16, 8), marginVertical: s(10, 2) }]}>
          <View style={[styles.questionHeader, { marginBottom: s(10, 4) }]}>
            <View style={[styles.topicPill, { backgroundColor: q.correct.soft, minHeight: s(42, 28) }]}>
              <Text style={[styles.topicText, { color: q.correct.color, fontFamily: ff(lang, 'black'), fontSize: s(15, 11) }]}>
                {isFa ? 'ببین و بگو' : 'Look and choose'}
              </Text>
            </View>
            <TouchableOpacity style={[styles.listenButton, { height: s(42, 28) }]} onPress={speakItem} activeOpacity={0.86}>
              <Text style={styles.listenIcon}>▶</Text>
              <Text style={[styles.listenText, { fontFamily: ff(lang, 'black'), fontSize: s(14, 11) }]}>{isFa ? 'صدا' : 'Hear'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.artButton, { minHeight: s(190, 80) }]} onPress={speakItem} activeOpacity={0.92}>
            <ItemArt item={q.correct} characterId={selectedCharacterId} />
          </TouchableOpacity>

          <Text style={[styles.question, { fontFamily: ff(lang, 'black'), fontSize: s(29, 17), lineHeight: s(37, 22), marginTop: s(12, 4) }, dir(lang)]}>
            {isFa ? 'این چیه؟' : 'What is this?'}
          </Text>
          <Text style={[styles.listenHint, { fontFamily: ff(lang, 'bold'), fontSize: s(13, 10), lineHeight: s(18, 13), marginTop: s(3, 1) }]}>
            {isFa ? 'برای شنیدن، تصویر را لمس کن' : 'Tap the picture to hear the word'}
          </Text>
        </View>

        <View style={[styles.optionsPanel, compact && styles.optionsPanelCompact]}>
          {q.options.map((opt, index) => {
            const correct = selected && opt.id === q.correct.id;
            const wrong = selected === opt.id && opt.id !== q.correct.id;
            const disabled = !!selected;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.option,
                  { backgroundColor: opt.soft, minHeight: s(118, 74) },
                  index % 2 === 0 ? styles.optionTiltLeft : styles.optionTiltRight,
                  !!correct && styles.correct,
                  wrong && styles.wrong,
                  disabled && !correct && !wrong && styles.optionDisabled,
                ]}
                onPress={() => answer(opt)}
                activeOpacity={0.88}
              >
                <View style={[styles.optionBadge, { backgroundColor: opt.color, width: s(56, 36), height: s(56, 36), marginBottom: s(8, 3) }]}>
                  <Image source={opt.source} style={{ width: s(44, 26), height: s(44, 26) }} resizeMode="contain" />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optFa, { fontFamily: ff('fa', 'black'), fontSize: s(20, 14), lineHeight: s(27, 18) }]} numberOfLines={1}>{opt.fa}</Text>
                  <Text style={[styles.optEn, { fontSize: s(12, 9), lineHeight: s(16, 11) }]} numberOfLines={1}>{opt.en}</Text>
                </View>
                {correct ? <Text style={styles.feedbackMark}>✓</Text> : null}
                {wrong ? <Text style={styles.feedbackMark}>×</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7FCFF', overflow: 'hidden' },
  skyBubble: {
    position: 'absolute',
    left: -90,
    top: 76,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#DDF4FF',
  },
  lemonBubble: {
    position: 'absolute',
    right: 64,
    top: 88,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#FFF0A8',
  },
  peachBubble: {
    position: 'absolute',
    right: -70,
    bottom: -78,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#FFE0D3',
  },
  tinyDotA: {
    position: 'absolute',
    left: '45%',
    top: 112,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#86EFAC',
  },
  tinyDotB: {
    position: 'absolute',
    left: '76%',
    bottom: 72,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FDA4AF',
  },
  score: {
    minWidth: 64,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    color: C.textDark,
    fontFamily: ff('fa', 'black'),
    fontSize: 15,
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingTop: 10,
    borderWidth: 2,
    borderColor: '#BDEBFF',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 28,
    paddingBottom: 18,
  },
  contentCompact: { gap: 12, paddingHorizontal: 18 },
  questionCard: {
    width: '48%',
    maxWidth: 520,
    minWidth: 360,
    alignSelf: 'stretch',
    marginVertical: 10,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#075985',
    shadowOpacity: 0.11,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  questionCardCompact: { minWidth: 320 },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  topicPill: {
    minHeight: 42,
    borderRadius: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicText: { fontSize: 15, lineHeight: 20 },
  listenButton: {
    height: 42,
    borderRadius: 21,
    backgroundColor: C.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    gap: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  listenIcon: { color: C.textDark, fontFamily: ff('fa', 'black'), fontSize: 13, marginTop: 1 },
  listenText: { color: C.textDark, fontSize: 14 },
  artButton: { flex: 1, minHeight: 190 },
  art: {
    flex: 1,
    minHeight: 190,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artImage: { width: '100%', height: '100%' },
  houseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  artHalo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.12,
  },
  artSpark: {
    position: 'absolute',
    right: 36,
    top: 30,
    width: 24,
    height: 24,
    borderRadius: 12,
    opacity: 0.35,
  },
  artAsset: { width: 160, height: 160 },
  artCharacter: { width: 180, height: 180 },
  question: { color: C.textDark, fontSize: 29, lineHeight: 37, marginTop: 12, textAlign: 'center' },
  listenHint: { color: C.textMid, fontSize: 13, lineHeight: 18, marginTop: 3, textAlign: 'center' },
  optionsPanel: {
    width: '43%',
    maxWidth: 470,
    minWidth: 320,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
    gap: 12,
  },
  optionsPanelCompact: { minWidth: 300 },
  option: {
    width: '47%',
    minHeight: 118,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#1E293B',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  optionTiltLeft: { transform: [{ rotate: '-1deg' }] },
  optionTiltRight: { transform: [{ rotate: '1deg' }] },
  optionDisabled: { opacity: 0.58 },
  optionBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.86)',
  },
  optionIcon: { width: 44, height: 44 },
  optionTextWrap: { maxWidth: '100%', alignItems: 'center' },
  correct: {
    borderColor: '#22C55E',
    backgroundColor: '#ECFDF5',
    transform: [{ scale: 1.03 }],
  },
  wrong: {
    borderColor: '#FB7185',
    backgroundColor: '#FFF1F2',
  },
  optFa: { color: C.textDark, fontSize: 20, lineHeight: 27, textAlign: 'center' },
  optEn: { fontFamily: ff('en', 'black'), color: C.textMid, fontSize: 12, lineHeight: 16, textAlign: 'center' },
  feedbackMark: {
    position: 'absolute',
    top: 8,
    right: 12,
    color: C.textDark,
    fontFamily: ff('fa', 'black'),
    fontSize: 22,
  },
});
