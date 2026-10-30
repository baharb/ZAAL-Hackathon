// Buddy picker (hackathon step 2). The child picks one hero for every
// quest from ZAAL's existing characters. Saved on the device.

import React, { useContext, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopBar, { topBarHeight } from '../components/TopBar';
import { AppContext } from '../store/AppContext';
import { dir, ff } from '../theme/fonts';
import { BUDDIES, BuddyId } from './buddyStore';
import { buddyPose } from './questTheme';

function BuddyButton({
  id,
  fa,
  en,
  size,
  selected,
  onPress,
}: {
  id: BuddyId;
  fa: string;
  en: string;
  size: number;
  selected: boolean;
  onPress: () => void;
}) {
  const { lang } = useContext(AppContext);
  const isFa = lang === 'fa' || lang === 'ar';
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
      accessibilityLabel={isFa ? fa : en}
      accessibilityRole="button"
      style={[
        styles.card,
        {
          width: size,
          height: size * 1.22,
          borderRadius: size * 0.16,
          borderWidth: selected ? Math.max(3, size * 0.035) : 0,
        },
      ]}
    >
      <Animated.View style={{ transform: [{ scale: bounce }], alignItems: 'center' }}>
        {id === 'roboBoombo' ? (
          // The waving art has a stray arm baked in at the left edge,
          // cropped out here (shared art untouched).
          <View style={{ width: size * 0.88, height: size * 0.88, overflow: 'hidden' }}>
            <Image
              source={buddyPose(id, 'waving')}
              style={{ width: size, height: size, marginLeft: -size * 0.14 }}
              resizeMode="contain"
            />
          </View>
        ) : (
          <Image
            source={buddyPose(id, 'waving')}
            style={{ width: size * 0.88, height: size * 0.88 }}
            resizeMode="contain"
          />
        )}
      </Animated.View>
      <Text
        style={[styles.name, { fontFamily: ff(lang, 'black'), fontSize: size * 0.14 }, dir(lang)]}
        numberOfLines={1}
      >
        {isFa ? fa : en}
      </Text>
    </TouchableOpacity>
  );
}

export default function BuddyPicker({
  initial,
  onPick,
}: {
  initial: BuddyId | null;
  onPick: (buddy: BuddyId) => void;
}) {
  const { lang } = useContext(AppContext);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isFa = lang === 'fa' || lang === 'ar';
  const [picked, setPicked] = useState<BuddyId | null>(initial);

  const bodyH = height - topBarHeight(height, insets.top, {}) - insets.bottom;
  const gap = Math.max(8, width * 0.012);
  const cardSize = Math.min((width * 0.92 - gap * (BUDDIES.length - 1)) / BUDDIES.length, bodyH * 0.66);

  const choose = (id: BuddyId) => {
    setPicked(id);
    onPick(id);
  };

  return (
    <View style={styles.root}>
      <Text
        style={[styles.title, { fontFamily: ff(lang, 'black'), fontSize: Math.max(11, bodyH * 0.038) }, dir(lang)]}
      >
        {isFa ? 'امروز می‌خوای کدوم دوست باشی؟' : 'Which character do you want to be today?'}
      </Text>
      <View style={[styles.row, isFa && { flexDirection: 'row-reverse' }, { gap }]}>
        {BUDDIES.map(b => (
          <BuddyButton
            key={b.id}
            id={b.id}
            fa={b.fa}
            en={b.en}
            size={cardSize}
            selected={picked === b.id}
            onPress={() => choose(b.id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#3A2A6B', backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 8, marginBottom: 14, textAlign: 'center', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgba(58,42,107,0.30)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 5,
    borderColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: '#3A2A6B',
    marginTop: 4,
    textShadowColor: 'transparent',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
