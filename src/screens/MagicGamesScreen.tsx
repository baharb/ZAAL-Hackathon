// Magic Games — the judges' box, styled exactly like the first Home
// page's big cards: one row of square cards on the deep-purple page,
// each card a bold color with its own mini scene, and the game's name in
// white on the navy shade band at the bottom. Four games live here —
// Daily Quest first; Listen & Find moved to the main Games page.

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNav } from '../store/NavContext';
import TopBar, { topBarHeight } from '../components/TopBar';
import { neliWorldAssets } from '../assets/neliWorldAssets';
import { OpenBookIcon } from '../ui/playKit';
import { buddyPose } from '../quest/questTheme';
import { BuddyId } from '../quest/buddyStore';
import { dir, ff } from '../theme/fonts';

const REFERENCE_H = 400;

const CAR_NELI = require('../../assets/neli-world/quest/car-neli.png');

type Tile = {
  route: { name: 'MagicStory' } | { name: 'PhotoFarsi' } | { name: 'FirstLetter' } | { name: 'DailyQuest' };
  color: string;
  fa: string;
  buddy: BuddyId;
};

// Same order as the Home big cards: the main game first, then the rest.
// Exact Home big-card colors: pink, blue, yellow, green.
const TILES: Tile[] = [
  { route: { name: 'DailyQuest' }, color: '#FF00F5', fa: 'پیک‌نیک با مامان‌بزرگ', buddy: 'neli' },
  { route: { name: 'MagicStory' }, color: '#00D1FF', fa: 'قصه جادویی', buddy: 'aidin' },
  { route: { name: 'PhotoFarsi' }, color: '#F7D046', fa: 'فارسی با عکس', buddy: 'roboBoombo' },
  { route: { name: 'FirstLetter' }, color: '#18C977', fa: 'حرف اول', buddy: 'dara' },
];

function TileBuddy({ id, size }: { id: BuddyId; size: number }) {
  return (
    <Image source={buddyPose(id, 'waving')} style={{ width: size, height: size }} resizeMode="contain" />
  );
}

/** Mini scene per game, filling the square card above its title band. */
function TileScene({ t, size, k }: { t: Tile; size: number; k: number }) {
  const artS = size * 0.42;
  const buddyS = artS * 1.05;
  if (t.route.name === 'DailyQuest') {
    // Neli in her red car on the gray road.
    return (
      <View style={s.scene}>
        <Image source={CAR_NELI} style={{ width: size * 0.72, height: size * 0.44, marginBottom: size * 0.1 }} resizeMode="contain" />
        <View pointerEvents="none" style={[s.road, { height: size * 0.09, bottom: size * 0.24 }]}>
          <View style={s.dashes}>
            {Array.from({ length: 7 }).map((_, i) => (
              <View key={i} style={[s.dash, { width: 12 * k, height: 3.5 * k, marginHorizontal: 5 * k }]} />
            ))}
          </View>
        </View>
      </View>
    );
  }
  if (t.route.name === 'MagicStory') {
    // Aidin with an open storybook under sparkles.
    return (
      <View style={s.sceneRow}>
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
    // Robo Boombo with the camera.
    return (
      <View style={s.sceneRow}>
        <TileBuddy id={t.buddy} size={buddyS} />
        <Image source={neliWorldAssets.ui.camera} style={{ width: artS, height: artS }} resizeMode="contain" />
      </View>
    );
  }
  // First Letter: Dara with chunky toy blocks.
  return (
    <View style={s.sceneRow}>
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

export default function MagicGamesScreen() {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { navigate } = useNav();
  const k = H / REFERENCE_H;
  // Home big-card geometry: one centered row of square cards, sized by
  // width AND by the height left under the TopBar, so it never scrolls.
  const gap = Math.max(10, 12 * k);
  const availH = Math.max(180, H - topBarHeight(H, insets.top) - 24 * k - Math.max(12 * k, insets.bottom));
  const cardSize = Math.floor(Math.min((W * 0.94 - gap * (TILES.length - 1)) / TILES.length, availH, 300 * k));
  const bandH = Math.max(34, Math.round(54 * (cardSize / 230)));
  const radius = Math.max(22, Math.round(26 * k));
  return (
    <View style={s.root}>
      <TopBar title="بازی‌های جادویی" titleFa="بازی‌های جادویی" dark showClose onBack={() => navigate({ name: 'Home' })} />
      <View style={[s.row, { gap, paddingBottom: Math.max(12 * k, insets.bottom) }]}>
        {TILES.map(t => (
          <TouchableOpacity
            key={t.fa}
            style={[s.card, { backgroundColor: t.color, width: cardSize, height: cardSize, borderRadius: radius }]}
            onPress={() => navigate(t.route)}
            activeOpacity={0.88}
            accessibilityRole="button"
          >
            <View style={[s.artWrap, { borderRadius: radius }]}>
              <TileScene t={t} size={cardSize} k={k} />
              {/* Home format: white name centered on the navy shade band. */}
              <View style={[s.shade, { height: bandH }]} />
              <View style={[s.textBand, { height: bandH }]}>
                <Text style={[s.cardTitle, dir('fa'), { fontSize: Math.max(14, Math.round(cardSize * 0.075)) }]} numberOfLines={1}>{t.fa}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // Same deep-purple page as Home.
  root: { flex: 1, backgroundColor: '#2B1268' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  // Same card as Home's big cards: square, big radius, soft deep shadow.
  card: {
    overflow: 'hidden',
    shadowColor: '#170736',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 9,
  },
  artWrap: { flex: 1, overflow: 'hidden' },
  scene: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sceneRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  shade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(37,16,92,0.62)',
  },
  textBand: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 0,
    justifyContent: 'center',
  },
  cardTitle: { fontFamily: ff('fa', 'black'), color: '#FFFFFF', textAlign: 'center' },
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
