// find_it step (hackathon step 2, level 1). The child hears the word and
// taps the right picture out of 2. No timers, no losing: a wrong tap gently
// fades, the word plays again, and after 2 tries the right card softly glows.

import React, { useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { AppContext } from '../store/AppContext';
import { dir, ff } from '../theme/fonts';
import { recordQuestAnswer } from '../store/wordLog';
import { questPlay } from './questSound';
import { DisplayWord } from './questGroups';
import WordArt from './WordArt';

export default function FindIt({
  target,
  choices,
  onResult,
}: {
  target: DisplayWord;
  choices: DisplayWord[];
  onResult: (firstTryRight: boolean) => void;
}) {
  const { lang } = useContext(AppContext);
  const { width, height } = useWindowDimensions();
  const isFa = lang === 'fa' || lang === 'ar';
  const [tries, setTries] = useState(0);
  const [done, setDone] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(1)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const doneRef = useRef(false);

  const cardSize = Math.min(width * 0.3, height * 0.44);

  useEffect(() => {
    void questPlay(target.audioKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = (word: DisplayWord) => {
    if (doneRef.current) return;
    if (word.id === target.id) {
      doneRef.current = true;
      const firstTry = tries === 0;
      recordQuestAnswer(target.id, firstTry);
      setDone(true);
      Animated.sequence([
        Animated.timing(pop, { toValue: 1.15, duration: 200, useNativeDriver: true }),
        Animated.timing(pop, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start(() => onResult(firstTry));
      return;
    }
    // Wrong: the card gently fades and the word plays again.
    const nextTries = tries + 1;
    setTries(nextTries);
    setWrongId(word.id);
    Animated.sequence([
      Animated.timing(fade, { toValue: 0.35, duration: 300, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start(() => setWrongId(null));
    void questPlay(target.audioKey);
  };

  return (
    <View style={styles.root}>
      <TouchableOpacity
        onPress={() => questPlay(target.audioKey)}
        activeOpacity={0.8}
        accessibilityLabel={isFa ? 'دوباره بشنو' : 'Hear it again'}
        accessibilityRole="button"
      >
        <Text style={[styles.ear, { fontSize: cardSize * 0.22 }]}>👂</Text>
      </TouchableOpacity>
      <View style={[styles.row, isFa && { flexDirection: 'row-reverse' }, { gap: cardSize * 0.12 }]}>
        {choices.map(word => {
          const isTarget = word.id === target.id;
          const showGlow = isTarget && tries >= 2 && !done;
          const dimmed = wrongId === word.id;
          return (
            <TouchableOpacity
              key={word.id}
              onPress={() => tap(word)}
              activeOpacity={0.85}
              accessibilityLabel={word.fa}
              accessibilityRole="button"
              style={[
                styles.card,
                {
                  width: cardSize,
                  height: cardSize * 1.1,
                  borderRadius: cardSize * 0.12,
                  borderWidth: showGlow || (done && isTarget) ? Math.max(4, cardSize * 0.04) : 0,
                },
              ]}
            >
              <Animated.View
                style={{
                  opacity: dimmed ? fade : 1,
                  transform: done && isTarget ? [{ scale: pop }] : [],
                }}
              >
                <WordArt word={word} size={cardSize * 0.66} />
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.hint, { fontFamily: ff(lang, 'bold') }, dir(lang)]}>
        {isFa ? 'کدومه؟ گوش کن و بزن روش' : 'Which one? Listen and tap it'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  ear: { marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: '#FFFDF5',
    borderColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#170736',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  hint: { color: '#3A2A6B', marginTop: 10, fontSize: 15 },
});
