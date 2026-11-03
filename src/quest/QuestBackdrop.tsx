// Shared sunny backdrop for the Daily Quest picking phases (buddy + 3
// picks), Lingokids-style: bright sky, smiling sun, soft clouds and a
// grassy hill along the bottom. Pure decoration: it never takes touches
// and every size derives from the window, so it fits 360pt phones and
// tablets. The drive and the picnic finale keep their own scenery.

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { QUEST_COLORS } from './questTheme';

export const QUEST_SKY = '#BEE3FA';
export const QUEST_SUN = '#FFD93D';
export const QUEST_GRASS = '#7ED491';
export const QUEST_GRASS_DARK = '#5CBF6E';

// The garden art carries pale clouds in its top ~24%. Plain cover
// slices them into a pale strip along the top edge of the screen, so
// quest scenes draw the image bottom-anchored and oversized: the whole
// cloud band ends up above the screen (never half-visible).
export function gardenDrawnSize(srcW: number, srcH: number, boxW: number, boxH: number): { w: number; h: number } {
  const scale = Math.max(boxW / srcW, boxH / 0.73 / srcH);
  return { w: Math.round(srcW * scale), h: Math.round(srcH * scale) };
}

export function gardenSourceSize(source: any): { w: number; h: number } {
  // resolveAssetSource exists on native only; react-native-web has no
  // such function, so fall back to the source's own dims, then to the
  // garden art's real size.
  if (typeof Image.resolveAssetSource === 'function') {
    const r = Image.resolveAssetSource(source);
    if (r?.width && r?.height) return { w: r.width, h: r.height };
  }
  if (typeof source?.width === 'number' && typeof source?.height === 'number') {
    return { w: source.width, h: source.height };
  }
  return { w: 2048, h: 1365 };
}

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
      {/* Soft clouds: puffy and fully on-screen (never top-edge strips). */}
      <Puff left={W * 0.36} top={H * 0.06} s={H / 400} />
      <Puff left={W * 0.66} top={H * 0.16} s={(H / 400) * 0.75} />
      <Puff left={W * 0.14} top={H * 0.24} s={(H / 400) * 0.6} />
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

/** One puffy cloud: three overlapping circles in a soft white. */
function Puff({ left, top, s }: { left: number; top: number; s: number }) {
  const c = { position: 'absolute' as const, backgroundColor: QUEST_COLORS.card, borderRadius: 999, opacity: 0.92 };
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left, top, width: 96 * s, height: 52 * s }}>
      <View style={[c, { left: 0, bottom: 0, width: 96 * s, height: 30 * s }]} />
      <View style={[c, { left: 18 * s, top: 0, width: 42 * s, height: 42 * s }]} />
      <View style={[c, { left: 52 * s, top: 10 * s, width: 32 * s, height: 32 * s }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  sky: { ...StyleSheet.absoluteFillObject },
});
