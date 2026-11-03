// Quest v2 picks (section 2). One screen per pick: 3 options, no Next
// button. The instruction (which fruit/color/food) speaks on open;
// tapping one bounces it, says its name, and moves on.

import React, { useContext, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../store/AppContext';
import { ff } from '../theme/fonts';
import { questPlay } from './questSound';
import { FaTestAudioKey } from '../assets/faTestAudio.generated';
import { DisplayWord } from './questGroups';
import { PickKind } from './pickLists';
import ColorDot from './ColorDot';
import WordArt from './WordArt';

// Spoken the moment each pick screen opens, before any option is read.
const KIND_CLIP: Record<PickKind, FaTestAudioKey> = {
  fruit: 'quest/which-fruit',
  color: 'quest/which-color',
  dish: 'quest/which-food',
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
          <ColorDot id={word.id} size={size * 0.8} />
        ) : (
          <WordArt word={word} size={size * 0.96} />
        )}
      </Animated.View>
      <View style={styles.namePill}>
        <Text
          style={[styles.word, { fontFamily: ff('fa', 'black'), fontSize: Math.max(14, size * 0.13) }]}
          numberOfLines={1}
        >
          {word.fa}
        </Text>
      </View>
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

  // No bar on this scene: the options get the whole garden.
  const bodyH = height - insets.top - insets.bottom;
  const gap = Math.max(10, width * 0.02);
  const optionSize = Math.max(56, Math.min((width * 0.9 - gap * 2) / 3, bodyH * 0.36));

  // The instruction speaks as the screen opens; the tapped favorite
  // says its own name in tap.
  useEffect(() => {
    void questPlay(KIND_CLIP[kind]);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = (word: DisplayWord) => {
    if (locked.current) return;
    locked.current = true;
    // The picked name finishes before the next screen's instruction: the
    // next pick screen would otherwise cut its tail off.
    void (async () => {
      await questPlay(word.audioKey, { awaitFinish: true });
      timer.current = setTimeout(() => onPick(word), 250);
    })();
  };

  return (
    <View style={styles.root}>
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
                width: i === stepIndex ? bodyH * 0.07 : bodyH * 0.028,
                height: bodyH * 0.028,
                borderRadius: bodyH * 0.014,
                backgroundColor: i <= stepIndex ? '#FFB800' : '#FFFFFF',
                borderWidth: i <= stepIndex ? 0 : 2,
                borderColor: 'rgba(30,20,60,0.45)',
                opacity: i === stepIndex ? 1 : 0.85,
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  option: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  word: { color: '#3A2A6B', textAlign: 'center' },
  namePill: {
    marginTop: 6,
    backgroundColor: 'rgba(255,253,245,0.95)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 3,
    maxWidth: '100%',
  },
  dots: { flexDirection: 'row', marginTop: 14 },
  dot: { backgroundColor: '#FACC15' },
});
