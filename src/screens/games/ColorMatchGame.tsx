import React, { useContext, useState } from 'react';
import { Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AppContext } from '../../store/AppContext';
import { ff, dir } from '../../theme/fonts';
import { C } from '../../theme/colors';
import TopBar from '../../components/TopBar';
import CharacterAvatar from '../../components/CharacterAvatar';
import { neliWorldAssets } from '../../assets/neliWorldAssets';

const COLORS = [
  { id: 'red', fa: 'قرمز', en: 'Red', hex: '#EF4444', accent: '#FCA5A5' },
  { id: 'blue', fa: 'آبی', en: 'Blue', hex: '#3B82F6', accent: '#93C5FD' },
  { id: 'green', fa: 'سبز', en: 'Green', hex: '#22C55E', accent: '#86EFAC' },
  { id: 'yellow', fa: 'زرد', en: 'Yellow', hex: '#FACC15', accent: '#FDE68A' },
  { id: 'orange', fa: 'نارنجی', en: 'Orange', hex: '#FB923C', accent: '#FDBA74' },
  { id: 'purple', fa: 'بنفش', en: 'Purple', hex: '#A855F7', accent: '#D8B4FE' },
  { id: 'pink', fa: 'صورتی', en: 'Pink', hex: '#EC4899', accent: '#F9A8D4' },
  { id: 'turquoise', fa: 'فیروزه‌ای', en: 'Turquoise', hex: '#14B8A6', accent: '#5EEAD4' },
];

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function makeRound() {
  const correct = COLORS[Math.floor(Math.random() * COLORS.length)];
  const options = shuffle([correct, ...shuffle(COLORS.filter(c => c.id !== correct.id)).slice(0, 3)]);
  return { correct, options };
}

function PaintCharacter({ color, accent, characterId }: { color: string; accent: string; characterId: string }) {
  return (
    <ImageBackground source={neliWorldAssets.rooms.gardenWide} style={styles.characterStage} imageStyle={styles.characterBg}>
      <View style={styles.sceneWash} />
      <View style={[styles.paintHalo, { backgroundColor: accent }]} />
      <CharacterAvatar characterId={characterId} size={176} />
      <Image source={neliWorldAssets.ui.paintbrush} style={styles.colorBrush} resizeMode="contain" />
      <View style={styles.shadow} />
    </ImageBackground>
  );
}

function PaintPot({ color, selected }: { color: string; selected: boolean }) {
  return (
    <View style={[styles.paintPot, selected && styles.paintPotSelected]}>
      <View style={[styles.paintLid, { backgroundColor: color }]} />
      <View style={[styles.paintJar, { backgroundColor: color }]}>
        <View style={styles.jarShine} />
      </View>
    </View>
  );
}

export default function ColorMatchGame() {
  const { lang, addStars, selectedCharacterId } = useContext(AppContext);
  const [round, setRound] = useState(makeRound);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const handlePick = (id: string) => {
    if (feedback) return;
    setSelected(id);
    const correct = id === round.correct.id;
    setFeedback(correct ? 'correct' : 'wrong');
    if (correct) {
      addStars(2);
      setScore(prev => prev + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setTimeout(() => {
      setRound(makeRound());
      setSelected(null);
      setFeedback(null);
    }, 950);
  };

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#E9F7FF' }]} />
      <TopBar title="Color Match" titleFa="بازی رنگ‌ها" showClose dark={false} rightContent={<Text style={styles.score}>{score}</Text>} />

      <View style={styles.content}>
        <View style={styles.promptCard}>
          <Text style={[styles.promptTiny, { fontFamily: ff(lang, 'bold') }, dir(lang)]}>
            {lang === 'fa' ? 'رنگ دوست را پیدا کن' : 'Find the friend’s color'}
          </Text>
          <Text style={[styles.promptTitle, { fontFamily: ff(lang, 'black') }, dir(lang)]}>
            {lang === 'fa' ? round.correct.fa : round.correct.en}
          </Text>
          <PaintCharacter color={round.correct.hex} accent={round.correct.accent} characterId={selectedCharacterId} />
        </View>

        <View style={styles.options}>
          {round.options.map(opt => {
            const selectedThis = selected === opt.id;
            const showCorrect = feedback && opt.id === round.correct.id;
            const showWrong = feedback === 'wrong' && selectedThis;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => handlePick(opt.id)}
                activeOpacity={0.86}
                style={[
                  styles.option,
                  showCorrect && styles.optionCorrect,
                  showWrong && styles.optionWrong,
                ]}
              >
                <PaintPot color={opt.hex} selected={selectedThis || !!showCorrect} />
                <Text style={[styles.optionFa, { fontFamily: ff('fa', 'black') }]} numberOfLines={1}>{opt.fa}</Text>
                <Text style={styles.optionEn}>{opt.en}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {feedback ? (
          <View style={[styles.feedback, feedback === 'correct' ? styles.feedbackGood : styles.feedbackBad]}>
            <Text style={[styles.feedbackText, { fontFamily: ff(lang, 'black') }]}>
              {feedback === 'correct'
                ? (lang === 'fa' ? 'آفرین!' : 'Great!')
                : (lang === 'fa' ? 'دوباره امتحان کن' : 'Try again')}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  score: {
    minWidth: 48,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.yellow,
    color: C.textDark,
    fontFamily: ff('fa', 'black'),
    fontSize: 17,
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingTop: 9,
  },
  content: { flex: 1, padding: 16, paddingTop: 8 },
  promptCard: {
    flex: 1,
    minHeight: 320,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    shadowColor: '#20124D',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 4,
  },
  promptTiny: { color: C.purple, fontSize: 14, marginBottom: 4 },
  promptTitle: { color: C.textDark, fontSize: 34, lineHeight: 42 },
  characterStage: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 28, overflow: 'hidden' },
  characterBg: { width: '100%', height: '100%' },
  sceneWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.10)' },
  paintHalo: { position: 'absolute', width: 220, height: 220, borderRadius: 110, opacity: 0.35 },
  colorNeli: { width: 178, height: 220, opacity: 0.95 },
  colorBrush: { position: 'absolute', right: 48, bottom: 38, width: 74, height: 74 },
  characterHead: { width: 142, height: 132, borderRadius: 66, alignItems: 'center', justifyContent: 'center' },
  characterBody: { width: 114, height: 118, borderRadius: 36, marginTop: -16 },
  characterArm: { position: 'absolute', width: 42, height: 108, borderRadius: 22, top: '48%' },
  armLeft: { left: '22%', transform: [{ rotate: '18deg' }] },
  armRight: { right: '22%', transform: [{ rotate: '-18deg' }] },
  eyeLeft: { position: 'absolute', left: 42, top: 47, width: 16, height: 16, borderRadius: 8, backgroundColor: '#1B1238' },
  eyeRight: { position: 'absolute', right: 42, top: 47, width: 16, height: 16, borderRadius: 8, backgroundColor: '#1B1238' },
  smile: { position: 'absolute', bottom: 38, width: 42, height: 22, borderBottomWidth: 5, borderBottomColor: '#1B1238', borderRadius: 22 },
  shadow: { width: 132, height: 20, borderRadius: 10, backgroundColor: 'rgba(45,27,105,0.12)', marginTop: -6 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 16 },
  option: {
    width: '48%',
    minHeight: 132,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
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
  paintPot: { height: 62, width: 70, alignItems: 'center', justifyContent: 'flex-end', marginBottom: 6 },
  paintPotSelected: { transform: [{ scale: 1.08 }] },
  paintLid: { position: 'absolute', top: 2, width: 60, height: 16, borderRadius: 8 },
  paintJar: { width: 56, height: 44, borderRadius: 15, alignItems: 'flex-start', justifyContent: 'flex-start', overflow: 'hidden' },
  jarShine: { width: 16, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.36)', marginLeft: 10, marginTop: 7 },
  optionFa: { color: C.textDark, fontSize: 19 },
  optionEn: { fontFamily: ff('fa', 'bold'), color: C.textMid, fontSize: 12, marginTop: 2 },
  feedback: {
    position: 'absolute',
    left: 32,
    right: 32,
    bottom: 22,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  feedbackGood: { backgroundColor: '#22C55E' },
  feedbackBad: { backgroundColor: '#FF6B6B' },
  feedbackText: { color: '#FFFFFF', fontSize: 20 },
});
