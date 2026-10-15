import React, { useContext, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useWindowDimensions } from '../../layout/PortraitFallback';
import { AppContext } from '../../store/AppContext';
import { useSpeech } from '../../hooks/useSpeech';
import TopBar from '../../components/TopBar';
import { C } from '../../theme/colors';
import { ff } from '../../theme/fonts';

const WORDS = [
  { fa: 'آب', en: 'WATER', color: '#38BDF8' },
  { fa: 'سیب', en: 'APPLE', color: '#EF4444' },
  { fa: 'گربه', en: 'CAT', color: '#A855F7' },
  { fa: 'ماه', en: 'MOON', color: '#6C4EFF' },
  { fa: 'گل', en: 'FLOWER', color: '#EC4899' },
];

// Below this height (landscape phones) the word card and the letter tiles sit
// side by side; stacked, the tiles started below the bottom of the screen.
const COMPACT_MAX_HEIGHT = 600;
// Art is drawn for this stage height (its fixed height on tablets).
const ART_REFERENCE_HEIGHT = 188;
// Tiles are drawn for a letters column at least this wide: room for a row of
// four keys (and six blanks, for FLOWER) at full size.
const LETTERS_REFERENCE_WIDTH = 360;
const KEY_SIZE = 54;
const KEY_GAP = 10;
const BLANK_WIDTH = 48;
const BLANK_HEIGHT = 58;
const BLANK_GAP = 8;

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function makeRound() {
  const item = WORDS[Math.floor(Math.random() * WORDS.length)];
  const letters = item.en.split('');
  const extras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(l => !letters.includes(l));
  const pool = shuffle([...letters, ...shuffle(extras).slice(0, Math.max(2, 7 - letters.length))]);
  return { item, letters, pool };
}

function WordArt({ color, compact }: { color: string; compact: boolean }) {
  const [artHeight, setArtHeight] = useState(0);
  const k = artHeight > 0 ? Math.min(1, artHeight / ART_REFERENCE_HEIGHT) : 1;
  return (
    <View style={[styles.art, compact && styles.artCompact]} onLayout={e => setArtHeight(e.nativeEvent.layout.height)}>
      <View style={[styles.bigCircle, { backgroundColor: color, width: 112 * k, height: 112 * k, borderRadius: 56 * k }]} />
      <View style={[styles.smallCircle, { backgroundColor: C.yellow, right: 98 * k, top: 42 * k, width: 38 * k, height: 38 * k, borderRadius: 19 * k }]} />
      <View style={[styles.whiteDash, { width: 72 * k, height: 10 * k, borderRadius: 5 * k }]} />
    </View>
  );
}

export default function SpellingGame() {
  const { lang, addStars } = useContext(AppContext);
  const { speakFarsiOnly, speakInLang, stop } = useSpeech();
  const [round, setRound] = useState(makeRound);
  const [typed, setTyped] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const isFa = lang === 'fa' || lang === 'ar';
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = height < COMPACT_MAX_HEIGHT;
  const sidePad = Math.max(16, insets.left, insets.right);
  const [lettersWidth, setLettersWidth] = useState(0);
  const k = compact && lettersWidth > 0 ? Math.min(1, lettersWidth / LETTERS_REFERENCE_WIDTH) : 1;
  const blankStyle = { width: BLANK_WIDTH * k, height: BLANK_HEIGHT * k, borderRadius: 16 * k };
  const keyStyle = { width: KEY_SIZE * k, height: KEY_SIZE * k, borderRadius: 18 * k };
  const tileText = { fontSize: 22 * k };

  const speak = () => {
    stop();
    speakFarsiOnly(round.item.fa, () => {
      if (!isFa) setTimeout(() => speakInLang(round.item.en.toLowerCase(), 'en'), 220);
    });
  };

  const addLetter = (letter: string) => {
    if (result || typed.length >= round.letters.length) return;
    const next = [...typed, letter];
    setTyped(next);
    if (next.length === round.letters.length) {
      const ok = next.join('') === round.item.en;
      setResult(ok ? 'correct' : 'wrong');
      if (ok) {
        addStars(3);
        setScore(prev => prev + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setTimeout(() => {
        setResult(null);
        setTyped([]);
        setRound(makeRound());
      }, 1100);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFF6D8' }]} />
      <TopBar title="Spelling" titleFa="هجی کردن" showClose dark={false} rightContent={<Text style={styles.score}>{score}</Text>} />
      <View style={[styles.content, compact && [styles.contentCompact, { paddingHorizontal: sidePad, paddingBottom: Math.max(16, insets.bottom) }]]}>
        <TouchableOpacity style={[styles.wordCard, compact && styles.wordCardCompact]} onPress={speak} activeOpacity={0.9}>
          <WordArt color={round.item.color} compact={compact} />
          <Text style={[styles.faWord, { fontFamily: ff('fa', 'black') }]}>{round.item.fa}</Text>
          <Text style={styles.hear}>{isFa ? 'بشنو و حروف را بچین' : 'Hear it, then build the word'}</Text>
        </TouchableOpacity>

        <View
          style={compact ? styles.lettersCompact : styles.letters}
          onLayout={e => setLettersWidth(e.nativeEvent.layout.width)}
        >
          <View style={[styles.blanks, compact && { marginTop: 0, gap: BLANK_GAP * k }]}>
            {round.letters.map((_, i) => (
              <View key={i} style={[styles.blank, blankStyle, typed[i] ? { borderColor: round.item.color } : null]}>
                <Text style={[styles.blankText, { fontSize: 24 * k }]}>{typed[i] ?? ''}</Text>
              </View>
            ))}
          </View>

          {result ? (
            <Text style={[styles.result, compact && styles.resultCompact, { color: result === 'correct' ? '#22C55E' : '#EF4444' }]}>
              {result === 'correct' ? (isFa ? 'آفرین!' : 'Great!') : round.item.en}
            </Text>
          ) : null}

          <View style={[styles.keyboard, compact && { marginTop: 14, gap: KEY_GAP * k }]}>
            {round.pool.map((letter, i) => (
              <TouchableOpacity key={`${letter}-${i}`} style={[styles.key, keyStyle]} onPress={() => addLetter(letter)}>
                <Text style={[styles.keyText, tileText]}>{letter}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.clearBtn, compact && { marginTop: 14 }]} onPress={() => setTyped([])}>
            <Text style={styles.clearText}>{isFa ? 'پاک کن' : 'Clear'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  score: { minWidth: 48, height: 42, borderRadius: 21, backgroundColor: C.yellow, color: C.textDark, fontFamily: ff('fa', 'black'), fontSize: 17, textAlign: 'center', textAlignVertical: 'center', paddingTop: 9 },
  content: { flex: 1, padding: 16, paddingTop: 8 },
  contentCompact: { flexDirection: 'row', gap: 12 },
  wordCard: { borderRadius: 32, backgroundColor: '#FFFFFF', padding: 18, alignItems: 'center' },
  wordCardCompact: { flex: 1, padding: 14, justifyContent: 'center' },
  artCompact: { flex: 1, height: undefined, maxHeight: ART_REFERENCE_HEIGHT },
  letters: {},
  lettersCompact: { flex: 1, justifyContent: 'center' },
  art: { width: '100%', height: 188, borderRadius: 28, backgroundColor: '#F7F4FF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bigCircle: { width: 112, height: 112, borderRadius: 56 },
  smallCircle: { position: 'absolute', right: 98, top: 42, width: 38, height: 38, borderRadius: 19 },
  whiteDash: { position: 'absolute', width: 72, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.8)' },
  faWord: { color: C.textDark, fontSize: 30, marginTop: 10 },
  hear: { fontFamily: ff('fa', 'bold'), color: C.textMid, fontSize: 12, marginTop: 3 },
  blanks: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  blank: { width: 48, height: 58, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 4.5, borderColor: '#E5DEFF', alignItems: 'center', justifyContent: 'center' },
  blankText: { fontFamily: ff('fa', 'black'), color: C.textDark, fontSize: 24 },
  result: { fontFamily: ff('fa', 'black'), fontSize: 22, textAlign: 'center', marginTop: 12 },
  resultCompact: { marginTop: 6 },
  keyboard: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 18 },
  key: { width: 54, height: 54, borderRadius: 18, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontFamily: ff('fa', 'black'), color: '#FFFFFF', fontSize: 22 },
  clearBtn: { alignSelf: 'center', marginTop: 18, height: 46, borderRadius: 23, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26 },
  clearText: { fontFamily: ff('fa', 'black'), color: C.purple, fontSize: 14 },
});
