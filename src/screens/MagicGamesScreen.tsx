// Magic Games — the judges' box. Each tile is its own mini scene with its
// own buddy: Daily Quest = Neli in her red car on the road; Magic Story =
// Aidin with an open storybook; Photo Farsi = Mila with the camera;
// Listen & Find = Lila listening with objects; First Letter = Dara with
// toy blocks. Daily Quest goes FIRST and biggest; all 5 tiles fit without
// scrolling. No emoji, no English.

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNav } from '../store/NavContext';
import { neliWorldAssets } from '../assets/neliWorldAssets';
import { CloseButton, OpenBookIcon } from '../ui/playKit';
import { buddyPose } from '../quest/questTheme';
import { BuddyId } from '../quest/buddyStore';
import { dir, ff } from '../theme/fonts';

const REFERENCE_H = 400;

const CAR_NELI = require('../../assets/neli-world/quest/car-neli.png');

type Tile = {
  route: { name: 'MagicStory' } | { name: 'PhotoFarsi' } | { name: 'ListenFind' } | { name: 'FirstLetter' } | { name: 'DailyQuest' };
  color: string;
  edge: string;
  fa: string;
  buddy: BuddyId;
};

const SMALL_TILES: Tile[] = [
  { route: { name: 'MagicStory' }, color: '#A855F7', edge: '#7C3AED', fa: 'قصه جادویی', buddy: 'aidin' },
  { route: { name: 'PhotoFarsi' }, color: '#22D3EE', edge: '#0E9BB8', fa: 'فارسی با عکس', buddy: 'mila' },
  { route: { name: 'ListenFind' }, color: '#F472B6', edge: '#DB2777', fa: 'بشنو و پیدا کن', buddy: 'lila' },
  { route: { name: 'FirstLetter' }, color: '#06B6D4', edge: '#0E7490', fa: 'حرف اول', buddy: 'dara' },
];

const QUEST_TILE: Tile = {
  route: { name: 'DailyQuest' },
  color: '#FF5C8A',
  edge: '#D63A63',
  fa: 'بازی امروز من',
  buddy: 'neli',
};

function TileBuddy({ id, size }: { id: BuddyId; size: number }) {
  return (
    <Image source={buddyPose(id, 'waving')} style={{ width: size, height: size }} resizeMode="contain" />
  );
}

/** Mini scene per game. Same outer size for every small tile. */
function TileScene({ t, artS, k }: { t: Tile; artS: number; k: number }) {
  const buddyS = artS * 1.05;
  if (t.route.name === 'MagicStory') {
    // Aidin with an open storybook under sparkles.
    return (
      <View style={s.scene}>
        <TileBuddy id={t.buddy} size={buddyS} />
        <View>
          <OpenBookIcon size={artS * 1.05} />
          <Image
            source={neliWorldAssets.ui.sparkle}
            style={{ position: 'absolute', top: -artS * 0.18, right: -artS * 0.1, width: artS * 0.4, height: artS * 0.4 }}
            resizeMode="contain"
          />
        </View>
      </View>
    );
  }
  if (t.route.name === 'PhotoFarsi') {
    // Mila with the camera, bedroom colors behind.
    return (
      <View style={s.scene}>
        <TileBuddy id={t.buddy} size={buddyS} />
        <Image source={neliWorldAssets.ui.camera} style={{ width: artS, height: artS }} resizeMode="contain" />
      </View>
    );
  }
  if (t.route.name === 'ListenFind') {
    // Lila listening, objects at her feet.
    return (
      <View style={s.scene}>
        <View>
          <TileBuddy id={t.buddy} size={buddyS} />
          <Image
            source={neliWorldAssets.ui.voice}
            style={{ position: 'absolute', top: 0, right: 0, width: artS * 0.45, height: artS * 0.45 }}
            resizeMode="contain"
          />
        </View>
        <Image source={neliWorldAssets.foods.apple} style={{ width: artS * 0.55, height: artS * 0.55 }} resizeMode="contain" />
        <Image source={neliWorldAssets.clothes.book} style={{ width: artS * 0.55, height: artS * 0.55 }} resizeMode="contain" />
      </View>
    );
  }
  // First Letter: Dara with chunky toy blocks.
  return (
    <View style={s.scene}>
      <TileBuddy id={t.buddy} size={buddyS} />
      <View style={[s.miniBlock, { backgroundColor: '#E63B3B', borderBottomColor: '#B91C1C', width: artS * 0.62, height: artS * 0.62, borderRadius: 8 * k }]}>
        <Text style={[s.miniGlyph, dir('fa'), { fontSize: artS * 0.4 }]}>ب</Text>
      </View>
      <View style={[s.miniBlock, { backgroundColor: '#FFB800', borderBottomColor: '#D99A00', width: artS * 0.62, height: artS * 0.62, borderRadius: 8 * k }]}>
        <Text style={[s.miniGlyph, dir('fa'), { fontSize: artS * 0.4 }]}>ا</Text>
      </View>
    </View>
  );
}

function SmallTile({ t, w, h, k, onPress }: { t: Tile; w: number; h: number; k: number; onPress: () => void }) {
  const artS = h * 0.44;
  return (
    <TouchableOpacity
      style={[s.tile, { backgroundColor: t.color, width: w, height: h, borderRadius: 26 * k }]}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
    >
      <TileScene t={t} artS={artS} k={k} />
      {/* Same title format as the app's game boxes: white name centered
          on the navy shade band at the bottom. */}
      <View style={[s.shade, { height: Math.max(32, h * 0.3) }]}>
        <Text style={[s.cardTitle, dir('fa'), { fontSize: Math.max(15, 16 * k) }]} numberOfLines={1}>{t.fa}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function MagicGamesScreen() {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { navigate } = useNav();
  const k = H / REFERENCE_H;
  // Every tile is measured from what is left under the floating header
  // (close + title pill) — never scrolls, even on a 360pt-tall phone.
  const headerH = insets.top + 8 + 52 + 10 * k;
  const availH = Math.max(200, H - headerH - Math.max(12 * k, insets.bottom));
  const gap = 8 * k;
  const dqH = availH * 0.36;
  const smallH = (availH - dqH - gap) / 2;
  const smallW = (Math.min(W * 0.9, 640) - gap) / 2;
  // Soft dot pattern over a lilac-cream base (never flat purple).
  const dots = Array.from({ length: 42 }).map((_, i) => ({
    left: ((i * 173) % 97) / 100 * W,
    top: ((i * 89) % 93) / 100 * H,
    r: 3 + (i % 4) * 2,
    c: ['rgba(168,85,247,0.10)', 'rgba(244,114,182,0.10)', 'rgba(255,184,0,0.12)', 'rgba(34,211,238,0.10)'][i % 4]!,
  }));
  return (
    <View style={s.root}>
      {dots.map((d, i) => (
        <View key={i} pointerEvents="none" style={{ position: 'absolute', left: d.left, top: d.top, width: d.r * 2, height: d.r * 2, borderRadius: d.r, backgroundColor: d.c }} />
      ))}
      <CloseButton onPress={() => navigate({ name: 'Home' })} />
      <View pointerEvents="none" style={[s.titlePill, { top: insets.top + 8, borderRadius: 999 }]}>
        <Text style={[s.titleText, dir('fa'), { fontSize: 17 * k }]} numberOfLines={1}>بازی‌های جادویی</Text>
      </View>
      <View style={[s.col, { paddingTop: headerH, paddingBottom: Math.max(12 * k, insets.bottom), rowGap: gap }]}>
        {/* بازی امروز من — first and biggest: Neli in her red car. */}
        <TouchableOpacity
          style={[s.tile, s.quest, { backgroundColor: QUEST_TILE.color, width: smallW * 2 + gap, height: dqH, borderRadius: 26 * k }]}
          onPress={() => navigate(QUEST_TILE.route)}
          activeOpacity={0.88}
          accessibilityRole="button"
        >
          <Image source={CAR_NELI} style={{ width: dqH * 1.15, height: dqH * 0.66 }} resizeMode="contain" />
          {/* Road under the car, just above the title band. */}
          <View pointerEvents="none" style={[s.road, { height: dqH * 0.14, bottom: Math.max(32, dqH * 0.3) }]}>
            <View style={s.dashes}>
              {Array.from({ length: 8 }).map((_, i) => (
                <View key={i} style={[s.dash, { width: 14 * k, height: 4 * k, marginHorizontal: 6 * k }]} />
              ))}
            </View>
          </View>
          <View style={[s.shade, { height: Math.max(32, dqH * 0.3) }]}>
            <Text style={[s.cardTitle, dir('fa'), { fontSize: Math.max(16, 19 * k) }]} numberOfLines={1}>{QUEST_TILE.fa}</Text>
          </View>
        </TouchableOpacity>
        <View style={[s.grid, { width: smallW * 2 + gap, gap }]}>
          {SMALL_TILES.map(t => (
            <SmallTile key={t.fa} t={t} w={smallW} h={smallH} k={k} onPress={() => navigate(t.route)} />
          ))}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2EDFF' },
  titlePill: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#FFF9E8',
    paddingHorizontal: 20,
    paddingVertical: 9,
    zIndex: 30,
    elevation: 30,
  },
  titleText: { fontFamily: ff('fa', 'black'), color: '#1E1B4B', textAlign: 'center' },
  col: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  // Same card as the app's game boxes: bold flat color, big radius,
  // soft shadow, scene art bleeding under the title band.
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#170736',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  scene: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  shade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(37,16,92,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  cardTitle: { fontFamily: ff('fa', 'black'), color: '#FFFFFF', textAlign: 'center' },
  quest: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', columnGap: 10 },
  road: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#5B5B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashes: { flexDirection: 'row', alignItems: 'center' },
  dash: { backgroundColor: '#FFFFFF', borderRadius: 2, opacity: 0.9 },
  miniBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
  },
  miniGlyph: { fontFamily: ff('fa', 'black'), color: '#FFFFFF', textAlign: 'center' },
});
