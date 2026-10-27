// Favourites picker (hackathon step 2). Shows up to 8 items of the chosen
// category; the child taps 2 favourites. Every tap plays the word's own
// recording and the picture bounces.

import React, { useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { topBarHeight } from '../components/TopBar';
import { AppContext } from '../store/AppContext';
import { dir, ff } from '../theme/fonts';
import { questPlay } from './questSound';
import { ChildCategory, DisplayWord, wordsForGroup } from './questGroups';
import WordArt from './WordArt';
import { QUEST_COLORS } from './questTheme';

const PICK_COUNT = 2;

function FavButton({
  word,
  size,
  selected,
  order,
  onPress,
}: {
  word: DisplayWord;
  size: number;
  selected: boolean;
  order: number;
  onPress: () => void;
}) {
  const bounce = useRef(new Animated.Value(1)).current;
  const tap = () => {
    Animated.sequence([
      Animated.timing(bounce, { toValue: 1.12, duration: 150, useNativeDriver: true }),
      Animated.timing(bounce, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <TouchableOpacity
      onPress={tap}
      activeOpacity={0.85}
      accessibilityLabel={word.fa}
      accessibilityRole="button"
      style={[
        styles.card,
        {
          width: size,
          height: size * 1.18,
          borderRadius: size * 0.14,
          borderWidth: selected ? Math.max(3, size * 0.035) : 0,
        },
      ]}
    >
      <Animated.View style={{ transform: [{ scale: bounce }] }}>
        <WordArt word={word} size={size * 0.6} />
      </Animated.View>
      <Text style={[styles.word, { fontSize: size * 0.14 }, dir('fa')] } numberOfLines={1}>
        {word.fa}
      </Text>
      {selected && (
        <View style={[styles.badge, { width: size * 0.24, height: size * 0.24, borderRadius: size * 0.12 }]}>
          <Text style={{ fontSize: size * 0.14 }}>{order === 0 ? '⭐' : '🌟'}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function FavouritesPicker({
  group,
  onDone,
}: {
  group: ChildCategory;
  onDone: (picked: DisplayWord[]) => void;
}) {
  const { lang } = useContext(AppContext);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isFa = lang === 'fa' || lang === 'ar';
  const [pickedIds, setPickedIds] = useState<string[]>([]);

  const items = useMemo(() => wordsForGroup(group).slice(0, 8), [group]);
  const byId = useMemo(() => new Map(items.map(w => [w.id, w])), [items]);

  const bodyH = height - topBarHeight(height, insets.top, {}) - insets.bottom;
  const gap = Math.max(8, width * 0.012);
  const columns = 4;
  const cardSize = Math.min((width * 0.92 - gap * (columns - 1)) / columns, bodyH * 0.36);
  const ready = pickedIds.length === PICK_COUNT;

  const toggle = (word: DisplayWord) => {
    // Every tap says the word out loud.
    void questPlay(word.audioKey);
    setPickedIds(prev => {
      if (prev.includes(word.id)) return prev.filter(id => id !== word.id);
      if (prev.length >= PICK_COUNT) return [...prev.slice(1), word.id];
      return [...prev, word.id];
    });
  };

  return (
    <View style={styles.root}>
      <Text
        style={[styles.title, { fontFamily: ff(lang, 'black'), fontSize: Math.max(17, bodyH * 0.068) }, dir(lang)]}
      >
        {isFa ? 'کدوم‌ها را بیشتر دوست داری؟' : 'Which ones do you like most?'}
      </Text>
      <View style={[styles.grid, isFa && { flexDirection: 'row-reverse' }, { gap, maxWidth: cardSize * columns + gap * 3 }]}>
        {items.map(word => (
          <FavButton
            key={word.id}
            word={word}
            size={cardSize}
            selected={pickedIds.includes(word.id)}
            order={pickedIds.indexOf(word.id)}
            onPress={() => toggle(word)}
          />
        ))}
      </View>
      {ready && (
        <TouchableOpacity
          style={[styles.go, { borderRadius: bodyH * 0.05, paddingHorizontal: bodyH * 0.06, height: bodyH * 0.11 }]}
          onPress={() => onDone(pickedIds.map(id => byId.get(id)!).filter(Boolean))}
          activeOpacity={0.85}
          accessibilityLabel={isFa ? 'بزن بریم' : "Let's go"}
          accessibilityRole="button"
        >
          <Text style={[styles.goText, { fontFamily: ff(lang, 'black'), fontSize: bodyH * 0.05 }, dir(lang)]}>
            {isFa ? 'بزن بریم! 🎒' : "Let's go! 🎒"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFFFFF', marginBottom: 12, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  card: {
    backgroundColor: QUEST_COLORS.card,
    borderColor: QUEST_COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#170736',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  word: { color: '#3A2A6B', fontFamily: 'Vazirmatn_700Bold', marginTop: 4 },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FFF6B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  go: { backgroundColor: '#22C55E', justifyContent: 'center', marginTop: 14 },
  goText: { color: '#FFFFFF' },
});
