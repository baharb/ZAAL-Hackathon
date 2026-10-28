// Quest v2 picks (section 2). One screen per pick: 3 random options, no
// Next button. The app says the 3 options once (right to left) when the
// screen opens; tapping one bounces it, says its name, and moves on.

import React, { useContext, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { topBarHeight } from '../components/TopBar';
import { AppContext } from '../store/AppContext';
import { dir, ff } from '../theme/fonts';
import { playFaAudio, stopFaAudio } from '../utils/faAudio';
import { isQuestMuted, questPlay } from './questSound';
import { DisplayWord } from './questGroups';
import { COLOR_HEX, PickKind } from './pickLists';
import WordArt from './WordArt';

const PROMPTS: Record<PickKind, { fa: string; en: string; emoji: string }> = {
  fruit: { fa: 'کدوم میوه رو دوست داری؟', en: 'Which fruit do you like?', emoji: '🍎' },
  ingredient: { fa: 'کدوم رو دوست داری؟', en: 'Which one do you like?', emoji: '🥚' },
  color: { fa: 'کدوم رنگ رو دوست داری؟', en: 'Which color do you like?', emoji: '🎨' },
  dish: { fa: 'کدوم غذا رو دوست داری؟', en: 'Which food do you like?', emoji: '🍲' },
};

function OptionButton({
  word,
  kind,
  size,
  onPress,
}: {
  word: DisplayWord;
  kind: PickKind;
  size: number;
  onPress: () => void;
}) {
  const bounce = useRef(new Animated.Value(1)).current;
  const tap = () => {
    Animated.sequence([
      Animated.timing(bounce, { toValue: 1.12, duration: 160, useNativeDriver: true }),
      Animated.timing(bounce, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <TouchableOpacity
      onPress={tap}
      activeOpacity={0.85}
      accessibilityLabel={word.fa}
      accessibilityRole="button"
      style={[styles.option, { width: size, height: size * 1.25 }]}
    >
      <Animated.View style={{ transform: [{ scale: bounce }], alignItems: 'center' }}>
        {kind === 'color' ? (
          <View
            style={{
              width: size * 0.8,
              height: size * 0.8,
              borderRadius: size * 0.4,
              backgroundColor: COLOR_HEX[word.id] ?? '#CCCCCC',
            }}
            accessibilityLabel={word.fa}
          />
        ) : (
          <WordArt word={word} size={size * 0.8} />
        )}
      </Animated.View>
      <Text
        style={[styles.word, { fontFamily: ff('fa', 'black'), fontSize: Math.max(14, size * 0.13) }]}
        numberOfLines={1}
      >
        {word.fa}
      </Text>
    </TouchableOpacity>
  );
}

export default function PicksScreen({
  stepIndex,
  stepCount,
  kind,
  options,
  onPick,
}: {
  stepIndex: number;
  stepCount: number;
  kind: PickKind;
  options: DisplayWord[];
  onPick: (word: DisplayWord) => void;
}) {
  const { lang } = useContext(AppContext);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isFa = lang === 'fa' || lang === 'ar';
  const locked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bodyH = height - topBarHeight(height, insets.top, {}) - insets.bottom;
  const gap = Math.max(10, width * 0.02);
  const optionSize = Math.max(64, Math.min((width * 0.9 - gap * 2) / 3, bodyH * 0.52));
  const prompt = PROMPTS[kind];

  // Say the 3 options once, right to left, one after another (no overlap).
  useEffect(() => {
    let alive = true;
    const speakOrder = isFa ? options : [...options].reverse();
    void (async () => {
      if (isQuestMuted()) return;
      await stopFaAudio();
      for (let i = 0; i < speakOrder.length; i += 1) {
        if (!alive || isQuestMuted()) return;
        await playFaAudio(speakOrder[i]!.audioKey, { awaitFinish: true, interrupt: i === 0 });
      }
    })();
    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
    };
    // Remounted per step (key={stepIndex}), so options are fixed for this run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = (word: DisplayWord) => {
    if (locked.current) return;
    locked.current = true;
    void questPlay(word.audioKey);
    timer.current = setTimeout(() => onPick(word), 600);
  };

  return (
    <View style={styles.root}>
      <Text style={[styles.prompt, { fontFamily: ff(lang, 'black'), fontSize: Math.max(17, bodyH * 0.065) }, dir(lang)]}>
        {prompt.emoji} {isFa ? prompt.fa : prompt.en}
      </Text>
      <View style={[styles.row, isFa && { flexDirection: 'row-reverse' }, { gap }]}>
        {options.map(word => (
          <OptionButton key={word.id} word={word} kind={kind} size={optionSize} onPress={() => tap(word)} />
        ))}
      </View>
      <View style={[styles.dots, { gap: 8 }]}>
        {Array.from({ length: stepCount }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: bodyH * 0.028,
                height: bodyH * 0.028,
                borderRadius: bodyH * 0.014,
                opacity: i === stepIndex ? 1 : 0.35,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  prompt: { color: '#FFFFFF', marginBottom: 14, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  option: { alignItems: 'center', justifyContent: 'center' },
  word: { color: '#FFFFFF', marginTop: 6, textAlign: 'center' },
  dots: { flexDirection: 'row', marginTop: 14 },
  dot: { backgroundColor: '#FACC15' },
});
