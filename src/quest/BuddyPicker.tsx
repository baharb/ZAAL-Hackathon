// Buddy picker (hackathon step 2). The child picks one hero for every
// quest from ZAAL's existing characters. Saved on the device.

import React, { useContext, useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SoftShadow } from '../ui/playKit';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../store/AppContext';
import { dir, ff } from '../theme/fonts';
import { BUDDIES, BuddyId } from './buddyStore';
import { buddyPose } from './questTheme';
import { questPlay } from './questSound';
import { FaTestAudioKey } from '../assets/faTestAudio.generated';

const ROBO_PICKER_ART = require('../../assets/neli-world/characters/Robo Boombo/base_happy_2x_1024x1024.png');

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
  const haloPulse = useRef(new Animated.Value(1)).current;
  // The picked buddy keeps a gentle halo bounce — no box.
  useEffect(() => {
    if (!selected) {
      haloPulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(haloPulse, { toValue: 1.07, duration: 550, useNativeDriver: true }),
        Animated.timing(haloPulse, { toValue: 1, duration: 550, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [selected, haloPulse]);
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
          borderWidth: 0,
        },
      ]}
    >
      {selected ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: size * 0.02,
            width: size * 1.1,
            height: size * 1.1,
            borderRadius: size * 0.55,
            backgroundColor: 'rgba(250,204,21,0.40)',
            transform: [{ scale: haloPulse }],
          }}
        />
      ) : null}
      <Animated.View style={{ transform: [{ scale: bounce }], alignItems: 'center' }}>
        {id === 'roboBoombo' ? (
          // Robo Boombo's picker portrait: the happy base art.
          <Image
            source={ROBO_PICKER_ART}
            style={{ width: size * 0.88, height: size * 0.88 }}
            resizeMode="contain"
          />
        ) : (
          <Image
            source={buddyPose(id, 'waving')}
            style={{ width: size * 0.88, height: size * 0.88 }}
            resizeMode="contain"
          />
        )}
      </Animated.View>
      {/* Every buddy stands on the lawn. */}
      <View style={{ marginTop: -size * 0.04 }}>
        <SoftShadow width={size * 0.88} />
      </View>
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

  // No bar on this scene — the buddies get the whole garden.
  const bodyH = height - insets.top - insets.bottom;
  const gap = Math.max(8, width * 0.012);
  // Every character 10% bigger than before, still fitting the row.
  const cardSize = Math.min((width * 0.98 - gap * (BUDDIES.length - 1)) / BUDDIES.length, bodyH * 0.73);

  // The instruction speaks as the screen opens: who will be today's hero?
  useEffect(() => {
    void questPlay('quest/pick-buddy' as FaTestAudioKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (id: BuddyId) => {
    setPicked(id);
    onPick(id);
  };

  return (
    <View style={styles.root}>
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
  titlePill: {
    backgroundColor: 'rgba(255,253,245,0.95)',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginBottom: 14,
  },
  title: {
    color: '#3A2A6B',
    textAlign: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: '#FFFFFF',
    marginTop: 4,
    textShadowColor: 'rgba(30,20,60,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
