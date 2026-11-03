// Magic Games — the judges' box. The two Meta-AI games live here and
// ONLY here (they were removed from the Games page): Magic Story turns a
// drawing or a photo into a real cartoon that stars in a 6-line
// picture book, and Photo Farsi names what the camera sees. Daily Quest
// goes FIRST and biggest (our main hackathon feature); all 5 tiles fit
// without scrolling. Illustrated mini-scenes with the buddy, no emoji.

import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNav } from '../store/NavContext';
import TopBar, { topBarHeight } from '../components/TopBar';
import { neliWorldAssets } from '../assets/neliWorldAssets';
import { BuddyGuide } from '../ui/playKit';
import { dir, ff } from '../theme/fonts';

const REFERENCE_H = 400;

type Tile = {
  route: { name: 'MagicStory' } | { name: 'PhotoFarsi' } | { name: 'ListenFind' } | { name: 'FirstLetter' } | { name: 'DailyQuest' };
  color: string;
  edge: string;
  fa: string;
  art: number;
};

const SMALL_TILES: Tile[] = [
  { route: { name: 'MagicStory' }, color: '#A855F7', edge: '#7C3AED', fa: 'قصه جادویی', art: neliWorldAssets.ui.book },
  { route: { name: 'PhotoFarsi' }, color: '#22D3EE', edge: '#0E9BB8', fa: 'فارسی با عکس', art: neliWorldAssets.ui.camera },
  { route: { name: 'ListenFind' }, color: '#F472B6', edge: '#DB2777', fa: 'بشنو و پیدا کن', art: neliWorldAssets.ui.voice },
  { route: { name: 'FirstLetter' }, color: '#06B6D4', edge: '#0E7490', fa: 'حرف اول', art: neliWorldAssets.ui.paintbrush },
];

const QUEST_TILE: Tile = {
  route: { name: 'DailyQuest' },
  color: '#FF5C8A',
  edge: '#D63A63',
  fa: 'بازی امروز من',
  art: neliWorldAssets.ui.toyWagon,
};

function SmallTile({ t, w, h, k, onPress }: { t: Tile; w: number; h: number; k: number; onPress: () => void }) {
  const artS = h * 0.46;
  return (
    <TouchableOpacity
      style={[s.tile, { backgroundColor: t.color, borderBottomColor: t.edge, width: w, height: h, borderRadius: 22 * k }]}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
    >
      <View style={s.scene}>
        <BuddyGuide mood="happy" size={artS * 1.1} />
        <Image source={t.art} style={{ width: artS, height: artS }} resizeMode="contain" />
      </View>
      <Text style={[s.name, dir('fa'), { fontSize: 16 * k }]} numberOfLines={1}>{t.fa}</Text>
    </TouchableOpacity>
  );
}

export default function MagicGamesScreen() {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { navigate } = useNav();
  const k = H / REFERENCE_H;
  // Every tile measured from what is left under the TopBar — never scrolls,
  // even on a 360pt-tall phone.
  const availH = Math.max(200, H - topBarHeight(H, insets.top) - 16 * k);
  const gap = 8 * k;
  const dqH = availH * 0.36;
  const smallH = (availH - dqH - gap) / 2;
  const smallW = (Math.min(W * 0.9, 640) - gap) / 2;
  return (
    <View style={s.root}>
      <TopBar title="بازی‌های جادویی" titleFa="بازی‌های جادویی" dark showClose onBack={() => navigate({ name: 'Home' })} />
      <View style={[s.col, { paddingVertical: 8 * k, rowGap: gap }]}>
        {/* بازی امروز من — first and biggest. */}
        <TouchableOpacity
          style={[s.tile, s.quest, { backgroundColor: QUEST_TILE.color, borderBottomColor: QUEST_TILE.edge, width: smallW * 2 + gap, height: dqH, borderRadius: 24 * k }]}
          onPress={() => navigate(QUEST_TILE.route)}
          activeOpacity={0.88}
          accessibilityRole="button"
        >
          <BuddyGuide mood="happy" size={dqH * 0.62} />
          <View style={s.questText}>
            <Text style={[s.questName, dir('fa'), { fontSize: 22 * k }]} numberOfLines={1}>{QUEST_TILE.fa}</Text>
            <Text style={[s.questDesc, dir('fa'), { fontSize: 14 * k }]} numberOfLines={1}>هر روز تازه</Text>
          </View>
          <Image source={QUEST_TILE.art} style={{ width: dqH * 0.55, height: dqH * 0.55 }} resizeMode="contain" />
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
  root: { flex: 1, backgroundColor: '#2D1B69' },
  col: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 6,
    overflow: 'hidden',
  },
  scene: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  name: { fontFamily: ff('fa', 'black'), color: '#FFFFFF', textAlign: 'center' },
  quest: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', columnGap: 10 },
  questText: { alignItems: 'center' },
  questName: { fontFamily: ff('fa', 'black'), color: '#FFFFFF', textAlign: 'center' },
  questDesc: { fontFamily: ff('fa', 'regular'), color: '#FFFFFF', textAlign: 'center', opacity: 0.92 },
});
