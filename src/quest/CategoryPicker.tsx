// Category picker (hackathon step 2). Big picture buttons; only categories
// with at least 4 ready words are shown.

import React, { useContext } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { topBarHeight } from '../components/TopBar';
import { AppContext } from '../store/AppContext';
import { dir, ff } from '../theme/fonts';
import { ChildCategory, readyGroups } from './questGroups';

export default function CategoryPicker({ onPick }: { onPick: (group: ChildCategory) => void }) {
  const { lang } = useContext(AppContext);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isFa = lang === 'fa' || lang === 'ar';
  const groups = readyGroups(4);

  const bodyH = height - topBarHeight(height, insets.top, {}) - insets.bottom;
  const gap = Math.max(8, width * 0.014);
  const columns = 3;
  const cardSize = Math.min((width * 0.9 - gap * (columns - 1)) / columns, bodyH * 0.36);

  return (
    <View style={styles.root}>
      <Text
        style={[styles.title, { fontFamily: ff(lang, 'black'), fontSize: Math.max(18, bodyH * 0.075) }, dir(lang)]}
      >
        {isFa ? 'امروز با چی بازی کنیم؟' : 'What do we play with today?'}
      </Text>
      <View style={[styles.grid, isFa && { flexDirection: 'row-reverse' }, { gap, maxWidth: cardSize * columns + gap * 2 }]}>
        {groups.map(g => (
          <TouchableOpacity
            key={g.id}
            onPress={() => onPick(g.id)}
            activeOpacity={0.85}
            accessibilityLabel={isFa ? g.fa : g.en}
            accessibilityRole="button"
            style={[styles.card, { width: cardSize, height: cardSize * 1.08, borderRadius: cardSize * 0.14 }]}
          >
            {g.previewArt ? (
              <Image
                source={g.previewArt}
                style={{ width: cardSize * 0.62, height: cardSize * 0.62 }}
                resizeMode="contain"
              />
            ) : (
              <Text style={[styles.digit, { fontFamily: ff(lang, 'black'), fontSize: cardSize * 0.4 }]}>
                ۱۲۳
              </Text>
            )}
            <Text
              style={[styles.name, { fontFamily: ff(lang, 'black'), fontSize: cardSize * 0.15 }, dir(lang)]}
              numberOfLines={1}
            >
              {isFa ? g.fa : g.en}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFFFFF', marginBottom: 14, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  card: {
    backgroundColor: '#FFFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#170736',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  name: { color: '#3A2A6B', marginTop: 4 },
  digit: { color: '#6C4EFF' },
});
