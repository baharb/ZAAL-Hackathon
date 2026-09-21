import React, { useContext } from 'react';
import { Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import TopBar from '../components/TopBar';
import { characterAssets } from '../assets/characterAssets';
import { neliWorldAssets } from '../assets/neliWorldAssets';
import CharacterAvatar from '../components/CharacterAvatar';
import { AppContext } from '../store/AppContext';
import { useNav } from '../store/NavContext';
import { dir, ff } from '../theme/fonts';
import { useResponsive } from '../theme/responsive';
import { FARSI_LETTERS } from '../data/farsiLetters';

type BigCard = {
  en: string;
  fa: string;
  route: any;
  art: 'gamesHub' | 'alphabetHub' | 'paint' | 'cook';
};

const BIG_CARDS: BigCard[] = [
  { en: 'Games', fa: 'بازی ها', route: { name: 'Main', tab: 'Games' }, art: 'gamesHub' },
  { en: 'Cooking', fa: 'آشپزی', route: { name: 'Cooking' }, art: 'cook' },
  { en: 'Painting', fa: 'نقاشی', route: { name: 'Coloring' }, art: 'paint' },
  { en: 'Alphabet', fa: 'حروف الفبا', route: { name: 'AlphabetHub' }, art: 'alphabetHub' },
];

type SmallTile = {
  en: string;
  fa: string;
  route: any;
  art: 'memory' | 'robo' | 'tooth' | 'talk' | 'animals' | 'count';
  bg: string;
};

const SMALL_TILES: SmallTile[] = [
  { en: 'Memory Match', fa: 'بازی حافظه', route: { name: 'Game', gameId: 'memory' }, art: 'memory', bg: '#5E46D4' },
  { en: 'Alphabet Train', fa: 'قطار الفبا', route: { name: 'AlphabetTrain' }, art: 'robo', bg: '#FF00F5' },
  { en: 'Brush Teeth', fa: 'مسواک زدن', route: { name: 'ToothBrush' }, art: 'tooth', bg: '#38BDF8' },
  { en: 'Talk with Neli', fa: 'گفت‌وگو با نلی', route: { name: 'ConversationGame' }, art: 'talk', bg: '#6C4EFF' },
  { en: 'Feed Animals', fa: 'غذا به حیوانات', route: { name: 'FeedAnimals' }, art: 'animals', bg: '#22C55E' },
  { en: 'Counting', fa: 'شمارش', route: { name: 'Game', gameId: 'counting' }, art: 'count', bg: '#F72585' },
];

type SmallItem =
  | (SmallTile & { kind: 'game' })
  | { kind: 'letter'; id: string; letter: string; nameFa: string; nameEn: string; bg: string };

// Vertical centering for a single Farsi glyph in a small box: Android adds
// asymmetric ascent/descent padding around custom fonts, so plain flex-centering
// alone renders it noticeably above center. `lineHeightFactor` sets the glyph's
// line box (as a multiple of font size) and `nudge` fine-tunes its position within
// that box (as a fraction of font size, positive = down). Letters whose dots hang
// below the stroke (ب ج ی پ) already sit lower, and پ's three dots need a taller
// box to avoid being clipped, so they each get their own tuned values.
const LETTER_VERTICAL_CONFIG: Record<string, { lineHeightFactor: number; nudge: number; fontScale?: number }> = {
  be: { lineHeightFactor: 1.45, nudge: -0.16, fontScale: 0.72 },
  jim: { lineHeightFactor: 1.45, nudge: -0.16, fontScale: 0.72 },
  ye: { lineHeightFactor: 1.45, nudge: -0.16, fontScale: 0.72 },
  // pe's 3 dots need real headroom, but growing the line box past the tile's own
  // size just gets clipped by the tile's overflow:hidden — so shrink the font
  // instead, which keeps the whole glyph safely inside a modest box.
  pe: { lineHeightFactor: 1.5, nudge: -0.05, fontScale: 0.72 },
};
const DEFAULT_LETTER_VERTICAL_CONFIG = { lineHeightFactor: 1.45, nudge: 0.06, fontScale: 0.72 };


// Builds the quick-access row: game tiles plus letter tiles spread evenly into the
// gaps between them, sized to exactly fill one row (leaving one slot for the
// trailing "more" tile) so the row never wraps to a second line.
function buildQuickAccessItems(rowSlots: number): SmallItem[] {
  const games: SmallItem[] = SMALL_TILES.map(t => ({ ...t, kind: 'game' as const }));
  const availableForContent = Math.max(1, rowSlots - 1); // reserve 1 slot for the trailing "more" tile
  const lettersNeeded = Math.max(0, availableForContent - games.length);

  let letterCursor = 0;
  const nextLetter = (): SmallItem => {
    const letter = FARSI_LETTERS[letterCursor % FARSI_LETTERS.length];
    letterCursor += 1;
    return { kind: 'letter', id: letter.id, letter: letter.letter, nameFa: letter.nameFa, nameEn: letter.nameEn, bg: letter.color ?? '#6C4EFF' };
  };

  // Spread the letters evenly across the gaps between games (including after the last one).
  const gapCount = games.length + 1;
  const items: SmallItem[] = [];
  for (let gap = 0; gap < gapCount; gap += 1) {
    const lettersUpToHere = Math.floor((lettersNeeded * (gap + 1)) / gapCount);
    const lettersBeforeHere = Math.floor((lettersNeeded * gap) / gapCount);
    for (let i = 0; i < lettersUpToHere - lettersBeforeHere; i += 1) items.push(nextLetter());
    if (gap < games.length) items.push(games[gap]);
  }

  return items;
}

// Every fixed dimension in the art below was tuned against a ~230pt card, and
// none of it shrank with the card. On a small phone the card falls to ~150pt
// and the art spilled past the edges, where overflow:'hidden' cropped it —
// lila alone is authored at 255x333, wider AND taller than the card. Scaling
// by the real card size keeps the same composition and keeps it inside.
const ART_REFERENCE_SIZE = 230;

type Bubble = { ch: string; bg: string; rot: string; left?: number; right?: number; top?: number; bottom?: number };
const ALPHA_BUBBLES: Bubble[] = [
  { ch: 'ا', bg: '#8E6BFF', rot: '-9deg', left: 12, top: 16 },
  { ch: 'ب', bg: '#16C2E8', rot: '7deg', right: 30, top: 50 },
  { ch: 'پ', bg: '#F97316', rot: '9deg', left: 74, top: 6 },
  { ch: 'ت', bg: '#FF2E93', rot: '-12deg', right: 10, bottom: 56 },
  { ch: 'ث', bg: '#FFD400', rot: '10deg', left: 28, bottom: 12 },
];

const COOK_INGREDIENTS = [
  { source: neliWorldAssets.foods.tomato, w: 46, rot: '-16deg', left: 16, top: 8 },
  { source: neliWorldAssets.foods.herbs, w: 58, rot: '13deg', right: 40, top: 16 },
  { source: neliWorldAssets.foods.eggplant, w: 34, rot: '11deg', left: 24, top: 94 },
  { source: neliWorldAssets.foods.blueberries, w: 34, rot: '-9deg', right: 10, top: 88 },
  { source: neliWorldAssets.foods.carrot, w: 42, rot: '15deg', right: 26, top: 177 },
  { source: neliWorldAssets.foods.bellPepper, w: 38, rot: '-12deg', left: 34, top: 161 },
] as { source: number; w: number; rot: string; left?: number; right?: number; top: number }[];

function BigCardArt({ art, size }: { art: BigCard['art']; size: number }) {
  const k = size / ART_REFERENCE_SIZE;
  if (art === 'gamesHub') {
    return (
      <View style={[styles.sceneFill, styles.gamesHubScene]}>
        <View style={styles.gamesHubRow}>
          {(() => {
            const sources = [
              characterAssets.aidin.poses.waving,
              characterAssets.lila.poses.standing,
              characterAssets.neli.poses.dancing,
              characterAssets.roboBoombo.poses.brushing,
            ];
            // owl stays base size; lamb, neli and the robot are 20% bigger
            const scales = [1, 1.2, 1.2, 1.2];
            const overlapFactor = 0.32;
            const sideMargin = 0.84; // leaves room on the left/right of the box
            const scaleSum = scales.reduce((a, b) => a + b, 0);
            const totalUnits = scaleSum - (sources.length - 1) * overlapFactor;
            const charW = (size * sideMargin) / totalUnits;
            const charH = Math.min(charW * 1.326, size * 0.9);
            const overlap = -charW * overlapFactor;
            // Explicit stacking order: owl renders above lila (everything else keeps
            // its original front-to-back order).
            const zIndices = [1.5, 1, 2, 3];
            // Per-character render-only boosts: each reserves its ORIGINAL box (so the
            // row's total width and every other character's position never move) and
            // renders the image itself larger inside that box, anchored so the growth
            // doesn't eat into shared space. robo (rightmost) anchors bottom-right so it
            // only grows up/left, staying clear of the card's right margin; lila anchors
            // bottom-center so it grows up/outward evenly without nudging its neighbors.
            // Shared growth applied equally to all 4 characters (accumulated from
            // successive "make them all bigger" requests: +4%, +5%, +5%, +10%), on top
            // of each character's own individual boost.
            const sharedGrowth = 1.04 * 1.05 * 1.05 * 1.1 * 1.05 * 1.05;
            const boosts: Record<number, { boost: number; anchor: 'bottom-right' | 'bottom-left' | 'bottom-center'; translateY?: number; translateX?: number }> = {
              0: { boost: 1 * sharedGrowth, anchor: 'bottom-left', translateX: -0.2 }, // aidin (owl)
              1: { boost: 1.05 * sharedGrowth, anchor: 'bottom-center', translateY: 0.06, translateX: 0.1 }, // lila
              2: { boost: 1 * sharedGrowth, anchor: 'bottom-center', translateY: -0.01, translateX: 0.12 }, // neli
              3: { boost: 1.32 * sharedGrowth, anchor: 'bottom-right', translateY: 0.19, translateX: 0.51 }, // robo
            };
            return sources.map((source, i) => {
              const scale = scales[i];
              const boxW = charW * scale;
              const boxH = charH * scale;
              const boostConfig = boosts[i];
              if (!boostConfig) {
                return (
                  <Image
                    key={i}
                    source={source}
                    style={{ width: boxW, height: boxH, marginLeft: i === 0 ? 0 : overlap, zIndex: zIndices[i] }}
                    resizeMode="contain"
                  />
                );
              }
              const { boost, anchor, translateY = 0, translateX = 0 } = boostConfig;
              const boostedW = boxW * boost;
              const boostedH = boxH * boost;
              const shift = [{ translateY: boxH * translateY }, { translateX: boxW * translateX }];
              const imageStyle =
                anchor === 'bottom-right'
                  ? { position: 'absolute' as const, right: 0, bottom: 0, width: boostedW, height: boostedH, transform: shift }
                  : anchor === 'bottom-left'
                  ? { position: 'absolute' as const, left: 0, bottom: 0, width: boostedW, height: boostedH, transform: shift }
                  : { position: 'absolute' as const, left: -((boostedW - boxW) / 2), bottom: 0, width: boostedW, height: boostedH, transform: shift };
              return (
                <View key={i} style={{ width: boxW, height: boxH, marginLeft: i === 0 ? 0 : overlap, zIndex: zIndices[i], overflow: 'visible' }}>
                  <Image source={source} style={imageStyle} resizeMode="contain" />
                </View>
              );
            });
          })()}
        </View>
      </View>
    );
  }
  if (art === 'alphabetHub') {
    return (
      <View style={[styles.sceneFill, styles.videoAlphabetScene]}>
        {ALPHA_BUBBLES.map(b => (
          <View
            key={b.ch}
            style={[
              styles.alphaBubble,
              {
                width: 72 * k, height: 72 * k, borderRadius: 24 * k,
                backgroundColor: b.bg,
                transform: [{ rotate: b.rot }],
                ...(b.left != null ? { left: b.left * k } : { right: b.right! * k }),
                ...(b.top != null ? { top: b.top * k } : { bottom: b.bottom! * k }),
              },
            ]}
          >
            <Text style={[styles.alphaBubbleText, { fontSize: 30 * k }]}>{b.ch}</Text>
          </View>
        ))}
        <Image
          source={characterAssets.lila.poses.thinkingAlt}
          style={{ width: 255 * k, height: 333 * k }}
          resizeMode="contain"
        />
      </View>
    );
  }
  if (art === 'paint') {
    return (
      <View style={[styles.sceneFill, styles.paintCardScene]}>
        <Image source={neliWorldAssets.painting.cardBunny} style={styles.paintCardImage} resizeMode="contain" />
      </View>
    );
  }
  return (
    <View style={[styles.sceneFill, styles.cookScene]}>
      {COOK_INGREDIENTS.map((item, i) => (
        <Image
          key={i}
          source={item.source}
          style={[
            styles.cookIngredient,
            {
              width: item.w * k, height: item.w * k,
              transform: [{ rotate: item.rot }],
              top: item.top * k,
              ...(item.left != null ? { left: item.left * k } : { right: item.right! * k }),
            },
          ]}
          resizeMode="contain"
        />
      ))}
      <Image source={characterAssets.neli.poses.cooking} style={{ width: 190 * k, height: 248 * k }} resizeMode="contain" />
    </View>
  );
}

function SmallTileArt({ art, size }: { art: SmallTile['art']; size: number }) {
  if (art === 'memory') {
    return (
      <View style={styles.smallArtFill}>
        <View style={[styles.memoryCardBack, styles.memoryCardBackOne]} />
        <View style={[styles.memoryCardBack, styles.memoryCardBackTwo]} />
        <Image source={characterAssets.lila.poses.thinkingAlt} style={styles.smallLila} resizeMode="contain" />
      </View>
    );
  }
  if (art === 'robo') {
    return (
      <View style={styles.smallArtFill}>
        <Image source={characterAssets.roboBoombo.poses.waving} style={styles.smallCharRobo} resizeMode="contain" />
      </View>
    );
  }
  if (art === 'tooth') {
    return (
      <ImageBackground source={neliWorldAssets.rooms.brushTeethBathroom} style={styles.smallArtFill} imageStyle={styles.smallArtImage}>
        <Image source={characterAssets.lila.poses.bigSmile} style={styles.smallTooth} resizeMode="contain" />
      </ImageBackground>
    );
  }
  if (art === 'talk') {
    return (
      <View style={styles.smallArtFill}>
        <CharacterAvatar characterId="neli" size={size * 0.74} floating={false} />
      </View>
    );
  }
  if (art === 'animals') {
    return (
      <View style={styles.smallArtFill}>
        <Image source={neliWorldAssets.animals.monkey} style={styles.smallChar} resizeMode="contain" />
      </View>
    );
  }
  return (
    <View style={styles.smallArtFill}>
      <Image source={characterAssets.aidin.poses.waving} style={styles.smallChar} resizeMode="contain" />
    </View>
  );
}

export default function HomeScreen() {
  const { lang } = useContext(AppContext);
  const { navigate } = useNav();
  const { height } = useWindowDimensions();
  const responsive = useResponsive();
  const ui = Math.min(responsive.contentWidth / 700, height / 400);
  const isFa = lang === 'fa' || lang === 'ar';

  const bigGap = Math.max(18, Math.round(22 * ui));
  const cardGap = Math.round(bigGap * 0.8 * 0.6);
  const bigCardRadius = Math.max(22, Math.round(26 * ui));
  const bigCardWRaw = (responsive.contentWidth - bigGap * 2 - cardGap * 3) / 4;
  const bigCardSize = Math.min(bigCardWRaw, Math.max(190, Math.round(230 * ui)));
  const smallGap = Math.max(9, Math.round(11 * ui));
  const smallTileW = bigCardSize * 0.3;
  const smallRowWidth = responsive.contentWidth - bigGap * 2;
  const smallColumns = Math.max(1, Math.floor((smallRowWidth + smallGap) / (smallTileW + smallGap)));
  const quickAccessItems = buildQuickAccessItems(smallColumns);

  // In landscape the screen's height IS its shortest edge, so this is the
  // standard 600dp tablet breakpoint (matching TABLET_MIN_EDGE in App.tsx):
  // iPad mini 744, iPad 10.2 810, Galaxy Tab S9 800 — every phone tops out at
  // 440. On a phone the four game cards already fill the screen, and the quick
  // access row below them is reachable only by scrolling, so drop it there and
  // let the cards be the whole page.
  const showQuickAccess = height >= 600;
  // The caption band was a flat 54pt — over a third of a small card.
  const bandHeight = Math.max(34, Math.round(54 * (bigCardSize / 230)));

  return (
    <View style={styles.root}>
      <TopBar title="ZAAL" titleFa="زال" dark showBack={false} large />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: bigGap }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.bigCards, !showQuickAccess && styles.bigCardsOnly, { gap: cardGap }]}>
          {BIG_CARDS.map(item => (
            <TouchableOpacity
              key={item.en}
              style={[styles.bigCard, { width: bigCardSize, height: bigCardSize, borderRadius: bigCardRadius }]}
              onPress={() => navigate(item.route)}
              activeOpacity={0.88}
            >
              <View style={[styles.bigCardArtWrap, { borderRadius: bigCardRadius }]}>
                <BigCardArt art={item.art} size={bigCardSize} />
                <View style={[styles.cardShade, { height: bandHeight }]} />
                <View style={[styles.cardTextBand, { height: bandHeight }]}>
                  <Text style={[styles.bigCardTitle, { fontFamily: ff(lang, 'black'), fontSize: Math.max(11, Math.round(12 * ui)) }, dir(lang), { textAlign: 'center' }]}>
                    {isFa ? item.fa : item.en}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {showQuickAccess && (
        <>
        <View style={[styles.smallHeaderRow, { justifyContent: 'flex-end', marginTop: Math.max(14, Math.round(20 * ui)) }]}>
          <Text style={[styles.sectionTitle, { fontFamily: ff(lang, 'black'), fontSize: Math.max(12, Math.round(13 * ui)) }, dir(lang)]}>
            {isFa ? 'دسترسی سریع' : 'Quick access'}
          </Text>
        </View>

        <View style={[styles.smallRow, { gap: smallGap, flexWrap: 'wrap', flexDirection: isFa ? 'row-reverse' : 'row' }]}>
          {quickAccessItems.map((item, idx) =>
            item.kind === 'letter' ? (
              <TouchableOpacity
                key={`letter-${item.id}-${idx}`}
                style={[styles.smallCard, { width: smallTileW, height: smallTileW, backgroundColor: item.bg }]}
                onPress={() => navigate({ name: 'InteractiveFarsiTrace', letterId: item.id })}
                activeOpacity={0.88}
              >
                <View style={styles.smallArtFill}>
                  <Text style={[styles.smallLetterGlyph, (() => { const baseGlyphSize = Math.max(26, Math.round(30 * ui)); const { lineHeightFactor, nudge, fontScale = 1 } = LETTER_VERTICAL_CONFIG[item.id] ?? DEFAULT_LETTER_VERTICAL_CONFIG; const glyphSize = Math.round(baseGlyphSize * fontScale); return { fontSize: glyphSize, lineHeight: Math.round(glyphSize * lineHeightFactor), transform: [{ translateY: Math.round(glyphSize * nudge) }] }; })()]}>{item.letter}</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                key={item.en}
                style={[styles.smallCard, { width: smallTileW, height: smallTileW, backgroundColor: item.bg }]}
                onPress={() => navigate(item.route)}
                activeOpacity={0.88}
              >
                <SmallTileArt art={item.art} size={smallTileW} />
              </TouchableOpacity>
            )
          )}
          <TouchableOpacity
            style={[styles.smallCard, styles.smallCardMore, { width: smallTileW, height: smallTileW }]}
            onPress={() => navigate({ name: 'Main', tab: 'Games' })}
            activeOpacity={0.7}
          >
            <Text style={styles.smallCardMoreText}>...</Text>
          </TouchableOpacity>
        </View>
        </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2B1268' },
  // flexGrow lets the container fill the viewport so justifyContent can
  // centre the content vertically when it's shorter than the screen — a
  // tall iPad (1024pt) otherwise leaves a block of dead purple below the
  // quick-access row. When content does exceed the height it simply
  // scrolls as before. Vertical padding is symmetric so 'centre' is true.
  scroll: { paddingHorizontal: 14, paddingVertical: 26, flexGrow: 1, justifyContent: 'center' },
  bigCards: { flexDirection: 'row', justifyContent: 'center', marginBottom: 34 },
  bigCardsOnly: { marginBottom: 0 },
  bigCard: { borderRadius: 26, overflow: 'hidden', backgroundColor: '#AEEBFF', shadowColor: '#170736', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 9 },
  bigCardArtWrap: { flex: 1, overflow: 'hidden' },
  cardShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 54, backgroundColor: 'rgba(37,16,92,0.62)' },
  cardTextBand: { position: 'absolute', left: 14, right: 14, bottom: 0, height: 54, justifyContent: 'center' },
  bigCardTitle: { color: '#FFFFFF', textAlign: 'center' },
  sceneFill: { flex: 1, width: '100%', height: '100%', overflow: 'hidden' },
  gamesHubScene: { backgroundColor: '#FF00F5', alignItems: 'center', justifyContent: 'center' },
  gamesHubRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  gamesHubChar: { width: 92, height: 122 },
  videoAlphabetScene: { backgroundColor: '#00D1FF', alignItems: 'center', justifyContent: 'center' },
  alphaBubble: { position: 'absolute', width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: '#170736', shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  alphaBubbleOne: { left: 12, top: 16, backgroundColor: '#8E6BFF', transform: [{ rotate: '-9deg' }] },
  alphaBubbleTwo: { right: 30, top: 50, backgroundColor: '#16C2E8', transform: [{ rotate: '7deg' }] },
  alphaBubbleThree: { left: 74, top: 6, backgroundColor: '#F97316', transform: [{ rotate: '9deg' }] },
  alphaBubbleFour: { right: 10, bottom: 56, backgroundColor: '#FF2E93', transform: [{ rotate: '-12deg' }] },
  alphaBubbleFive: { left: 28, bottom: 12, backgroundColor: '#FFD400', transform: [{ rotate: '10deg' }] },
  alphaBubbleText: { fontFamily: ff('fa', 'black'), color: '#FFFFFF', fontSize: 30 },
  bigCardLila: { width: 255, height: 333 },
  paintCardScene: { backgroundColor: '#18C977', alignItems: 'center', justifyContent: 'center' },
  paintCardImage: { width: '100%', height: '100%' },
  cookScene: { backgroundColor: '#F7D046', alignItems: 'center', justifyContent: 'center' },
  cookNeli: { width: 190, height: 248 },
  cookIngredient: { position: 'absolute', width: 46, height: 46 },
  cookIngredientOne: { left: 16, top: 8, transform: [{ rotate: '-16deg' }] },
  cookIngredientTwo: { right: 40, top: 16, width: 58, height: 58, transform: [{ rotate: '13deg' }] },
  cookIngredientThree: { left: 24, top: 94, width: 34, height: 34, transform: [{ rotate: '11deg' }] },
  cookIngredientFour: { right: 10, top: 88, width: 34, height: 34, transform: [{ rotate: '-9deg' }] },
  cookIngredientFive: { right: 26, top: 177, width: 42, height: 42, transform: [{ rotate: '15deg' }] },
  cookIngredientSix: { left: 34, top: 161, width: 38, height: 38, transform: [{ rotate: '-12deg' }] },
  smallHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: '#fff' },
  moreLink: { color: '#BFA8FF' },
  smallRow: { flexDirection: 'row' },
  smallCard: { aspectRatio: 1, borderRadius: 20, overflow: 'hidden', shadowColor: '#170736', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 },
  smallCardMore: { backgroundColor: '#3A2A80', alignItems: 'center', justifyContent: 'center' },
  smallCardMoreText: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  smallArtFill: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  smallArtImage: { width: '100%', height: '100%' },
  smallCardShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 30, backgroundColor: 'rgba(20,10,40,0.55)' },
  smallCardTitle: { position: 'absolute', left: 6, right: 6, bottom: 5, color: '#FFFFFF', fontSize: 10.5, textAlign: 'center' },
  memoryCardBack: { position: 'absolute', width: 46, height: 46, borderRadius: 12, backgroundColor: '#FFF6B8', borderWidth: 3, borderColor: '#FFFFFF' },
  memoryCardBackOne: { left: 8, top: 6, transform: [{ rotate: '-10deg' }] },
  memoryCardBackTwo: { right: 8, top: 12, transform: [{ rotate: '10deg' }] },
  smallLila: { width: 78, height: 100, position: 'absolute', bottom: -10 },
  smallTooth: { width: '68%', height: '68%' },
  smallChar: { width: '66%', height: '80%' },
  smallCharRobo: { width: '86%', height: '100%' },
  smallLetterGlyph: { fontFamily: ff('fa', 'black'), color: '#FFFFFF', textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false },
});
