// Shared sunny backdrop for the Daily Quest picking phases (buddy + 3
// picks), Lingokids-style: bright sky, smiling sun, soft clouds and a
// grassy hill along the bottom. Pure decoration: it never takes touches
// and every size derives from the window, so it fits 360pt phones and
// tablets. The drive and the picnic finale keep their own scenery.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { QUEST_COLORS } from './questTheme';

export const QUEST_SKY = '#BEE3FA';
export const QUEST_SUN = '#FFD93D';
export const QUEST_GRASS = '#7ED491';
export const QUEST_GRASS_DARK = '#5CBF6E';

export default function QuestBackdrop() {
  const { width: W, height: H } = useWindowDimensions();
  const sun = Math.min(W, H) * 0.16;
  const hillH = H * 0.24;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <View style={[styles.sky, { backgroundColor: QUEST_SKY }]} />
      {/* Sun with a sleepy happy face, top-left. */}
      <View
        style={{
          position: 'absolute',
          left: W * 0.06,
          top: H * 0.04,
          width: sun,
          height: sun,
          borderRadius: sun / 2,
          backgroundColor: QUEST_SUN,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ flexDirection: 'row', gap: sun * 0.12, marginBottom: sun * 0.02 }}>
          <View style={{ width: sun * 0.09, height: sun * 0.13, borderRadius: sun * 0.05, backgroundColor: '#7A4A00' }} />
          <View style={{ width: sun * 0.09, height: sun * 0.13, borderRadius: sun * 0.05, backgroundColor: '#7A4A00' }} />
        </View>
        <Text style={{ fontSize: sun * 0.22, color: '#7A4A00', marginTop: -sun * 0.04 }}>‿</Text>
      </View>
      {/* Soft clouds. */}
      <View style={[styles.cloud, { left: W * 0.34, top: H * 0.03, width: W * 0.2, height: H * 0.09 }]} />
      <View style={[styles.cloud, { left: W * 0.62, top: H * 0.12, width: W * 0.15, height: H * 0.07 }]} />
      <View style={[styles.cloud, { left: W * 0.16, top: H * 0.2, width: W * 0.12, height: H * 0.06 }]} />
      {/* Grassy hill along the bottom. */}
      <View
        style={{
          position: 'absolute',
          left: -W * 0.1,
          right: -W * 0.1,
          bottom: -hillH * 0.55,
          height: hillH,
          backgroundColor: QUEST_GRASS,
          borderTopLeftRadius: W * 0.5,
          borderTopRightRadius: W * 0.5,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: W * 0.08,
          bottom: hillH * 0.18,
          width: W * 0.1,
          height: W * 0.02,
          borderRadius: W * 0.01,
          backgroundColor: QUEST_GRASS_DARK,
          transform: [{ rotate: '-8deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: W * 0.12,
          bottom: hillH * 0.3,
          width: W * 0.07,
          height: W * 0.02,
          borderRadius: W * 0.01,
          backgroundColor: QUEST_GRASS_DARK,
          transform: [{ rotate: '10deg' }],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sky: { ...StyleSheet.absoluteFillObject },
  cloud: {
    position: 'absolute',
    backgroundColor: QUEST_COLORS.card,
    borderRadius: 999,
    opacity: 0.9,
  },
});
