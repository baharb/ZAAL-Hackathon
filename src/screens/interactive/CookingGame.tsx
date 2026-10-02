import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../../store/AppContext';
import { useNav } from '../../store/NavContext';
import { useSpeech } from '../../hooks/useSpeech';
import { useLandscapeDimensions } from '../../hooks/useLandscapeDimensions';
import TopBar, { topBarHeight } from '../../components/TopBar';
import { characterAssets } from '../../assets/characterAssets';
import { dir, ff } from '../../theme/fonts';
import { neliWorldAssets } from '../../assets/neliWorldAssets';
import BlinkingNeliImage from '../../components/BlinkingNeliImage';
import { FA_AUDIO_KEYS, getIngredientAudioKey, playFaAudio } from '../../utils/faAudio';
import PopperCelebration from '../../components/PopperCelebration';

type IngredientKind = 'rice' | 'herb' | 'egg' | 'tomato' | 'pasta' | 'cheese' | 'water' | 'salt' | 'cucumber' | 'yogurt' | 'driedMint' | 'lemon' | 'lentils' | 'beans' | 'fish' | 'oil' | 'onion' | 'filletChickenRaw' | 'groundBeefRaw' | 'cutRawBeefForStew' | 'grapeLeaves' | 'reshtehAshRaw' | 'zereshk' | 'pizzaBread' | 'pizzaCheese' | 'lappeh' | 'mushroom' | 'bellPepper' | 'olive' | 'kalam' | 'saffron' | 'chickpea';
type Rect = { x: number; y: number; w: number; h: number };
type Point = { x: number; y: number };
type Slot = { x: number; y: number; w: number; h: number };

type Ingredient = { id: IngredientKind; fa: string; en: string; source: any; color: string };
type Recipe = {
  id: string;
  fa: string;
  en: string;
  color: string;
  vessel: 'pot' | 'pan' | 'plate';
  steps: Ingredient[];
  menuSource: any;
  resultSource: any;
};

const ALL: Record<IngredientKind, Ingredient> = {
  rice: { id: 'rice', fa: 'برنج', en: 'Rice', source: neliWorldAssets.foods.rice, color: '#F8E39A' },
  herb: { id: 'herb', fa: 'سبزی', en: 'Herbs', source: neliWorldAssets.foods.herbs, color: '#22C55E' },
  egg: { id: 'egg', fa: 'تخم مرغ', en: 'Egg', source: neliWorldAssets.foods.eggWhole, color: '#FDE68A' },
  tomato: { id: 'tomato', fa: 'گوجه', en: 'Tomato', source: neliWorldAssets.foods.tomato, color: '#EF4444' },
  pasta: { id: 'pasta', fa: 'پاستا', en: 'Pasta', source: neliWorldAssets.foods.rawPasta, color: '#FBBF24' },
  cheese: { id: 'cheese', fa: 'پنیر', en: 'Cheese', source: neliWorldAssets.foods.cheese, color: '#F59E0B' },
  pizzaBread: { id: 'pizzaBread', fa: 'خمیر پیتزا', en: 'Pizza Bread', source: neliWorldAssets.foods.pizzaBread, color: '#FDBA74' },
  pizzaCheese: { id: 'pizzaCheese', fa: 'پنیر پیتزا', en: 'Pizza Cheese', source: neliWorldAssets.foods.pizzaCheese, color: '#FDE68A' },
  mushroom: { id: 'mushroom', fa: 'قارچ', en: 'Mushroom', source: neliWorldAssets.foods.mushroom, color: '#A78BFA' },
  bellPepper: { id: 'bellPepper', fa: 'فلفل دلمه', en: 'Bell Pepper', source: neliWorldAssets.foods.bellPepper, color: '#FB7185' },
  olive: { id: 'olive', fa: 'زیتون', en: 'Olive', source: neliWorldAssets.foods.olive, color: '#166534' },
  kalam: { id: 'kalam', fa: 'کلم', en: 'Cabbage', source: neliWorldAssets.foods.kalam, color: '#65A30D' },
  water: { id: 'water', fa: 'آب', en: 'Water', source: neliWorldAssets.foods.water, color: '#38BDF8' },
  salt: { id: 'salt', fa: 'نمک', en: 'Salt', source: neliWorldAssets.foods.salt, color: '#94A3B8' },
  cucumber: { id: 'cucumber', fa: 'خیار', en: 'Cucumber', source: neliWorldAssets.foods.cucumber, color: '#4ADE80' },
  yogurt: { id: 'yogurt', fa: 'ماست', en: 'Yogurt', source: neliWorldAssets.foods.yogurt, color: '#F8FAFC' },
  driedMint: { id: 'driedMint', fa: 'نعنا خشک', en: 'Dried Mint', source: neliWorldAssets.foods.driedMint, color: '#22C55E' },
  lemon: { id: 'lemon', fa: 'لیمو', en: 'Lemon', source: neliWorldAssets.foods.lemonSlice, color: '#FDE047' },
  lentils: { id: 'lentils', fa: 'عدس', en: 'Lentils', source: neliWorldAssets.foods.lentils, color: '#A16207' },
  chickpea: { id: 'chickpea', fa: 'نخود', en: 'Chickpea', source: neliWorldAssets.foods.chickpea, color: '#D4A657' },
  lappeh: { id: 'lappeh', fa: 'لپه', en: 'Split Peas', source: neliWorldAssets.foods.lappeh, color: '#C0842A' },
  beans: { id: 'beans', fa: 'لوبیا', en: 'Beans', source: neliWorldAssets.foods.beans, color: '#7C3AED' },
  fish: { id: 'fish', fa: 'ماهی', en: 'Fish', source: neliWorldAssets.foods.fish, color: '#38BDF8' },
  oil: { id: 'oil', fa: 'روغن', en: 'Oil', source: neliWorldAssets.kitchen.oil, color: '#F59E0B' },
  onion: { id: 'onion', fa: 'پیاز', en: 'Onion', source: neliWorldAssets.foods.onion, color: '#C084FC' },
  filletChickenRaw: { id: 'filletChickenRaw', fa: 'فیله', en: 'Chicken Fillet', source: neliWorldAssets.foods.filletChickenRaw, color: '#FBC4AB' },
  groundBeefRaw: { id: 'groundBeefRaw', fa: 'گوشت چرخ کرده', en: 'Ground Beef', source: neliWorldAssets.foods.groundBeefRaw, color: '#D97706' },
  cutRawBeefForStew: { id: 'cutRawBeefForStew', fa: 'گوشت خورشتی', en: 'Beef Chunks', source: neliWorldAssets.foods.cutRawBeefForStew, color: '#B45309' },
  grapeLeaves: { id: 'grapeLeaves', fa: 'برگ مو', en: 'Grape Leaves', source: neliWorldAssets.foods.grapeLeaves, color: '#65A30D' },
  reshtehAshRaw: { id: 'reshtehAshRaw', fa: 'رشته', en: 'Reshteh', source: neliWorldAssets.foods.reshtehAshRaw, color: '#B08968' },
  zereshk: { id: 'zereshk', fa: 'زرشک', en: 'Barberries', source: neliWorldAssets.foods.zereshk, color: '#B91C1C' },
  saffron: { id: 'saffron', fa: 'زعفران', en: 'Saffron', source: neliWorldAssets.foods.saffron, color: '#FACC15' },
};

const RECIPES: Recipe[] = [
  { id: 'sabzi-polo', fa: 'سبزی پلو با ماهی', en: 'Herb Rice with Fish', color: '#24C878', vessel: 'pot', steps: [ALL.rice, ALL.water, ALL.salt, ALL.herb, ALL.fish, ALL.oil], menuSource: neliWorldAssets.persianFoods.sabziPolo, resultSource: neliWorldAssets.persianFoods.sabziPolo },
  { id: 'omelette', fa: 'املت', en: 'Omelette', color: '#FF7B24', vessel: 'pan', steps: [ALL.egg, ALL.oil, ALL.tomato, ALL.salt], menuSource: neliWorldAssets.persianFoods.omelette, resultSource: neliWorldAssets.persianFoods.omelette },
  { id: 'pasta', fa: 'پاستا', en: 'Pasta', color: '#FFD53E', vessel: 'plate', steps: [ALL.water, ALL.oil, ALL.pasta, ALL.cheese, ALL.tomato], menuSource: neliWorldAssets.persianFoods.pasta, resultSource: neliWorldAssets.persianFoods.pasta },
  { id: 'mast-khiar', fa: 'ماست و خیار', en: 'Yogurt Cucumber', color: '#8B5CF6', vessel: 'plate', steps: [ALL.yogurt, ALL.cucumber, ALL.driedMint, ALL.salt], menuSource: neliWorldAssets.persianFoods.mastKhiar, resultSource: neliWorldAssets.persianFoods.mastKhiar },
  { id: 'shirazi-salad', fa: 'سالاد شیرازی', en: 'Shirazi Salad', color: '#F43F5E', vessel: 'plate', steps: [ALL.tomato, ALL.cucumber, ALL.onion, ALL.driedMint, ALL.lemon, ALL.salt], menuSource: neliWorldAssets.persianFoods.shiraziSalad, resultSource: neliWorldAssets.persianFoods.shiraziSalad },
  { id: 'kuku-sabzi', fa: 'کوکو سبزی', en: 'Herb Frittata', color: '#16A34A', vessel: 'pan', steps: [ALL.egg, ALL.herb, ALL.oil, ALL.salt], menuSource: neliWorldAssets.persianFoods.kukuSabzi, resultSource: neliWorldAssets.persianFoods.kukuSabzi },
  { id: 'tahchin', fa: 'ته چین', en: 'Tahchin', color: '#EAB308', vessel: 'pot', steps: [ALL.rice, ALL.egg, ALL.yogurt, ALL.filletChickenRaw, ALL.saffron, ALL.oil, ALL.salt], menuSource: neliWorldAssets.persianFoods.tahchin, resultSource: neliWorldAssets.persianFoods.tahchin },
  { id: 'ash-reshteh', fa: 'آش رشته', en: 'Aash Reshteh', color: '#CA8A04', vessel: 'pot', steps: [ALL.lentils, ALL.chickpea, ALL.beans, ALL.reshtehAshRaw, ALL.herb, ALL.salt], menuSource: neliWorldAssets.persianFoods.ashReshteh, resultSource: neliWorldAssets.persianFoods.ashReshteh },
  { id: 'kebab', fa: 'چلو کباب', en: 'Chelo Kebab', color: '#B45309', vessel: 'plate', steps: [ALL.rice, ALL.groundBeefRaw, ALL.onion, ALL.salt, ALL.oil, ALL.lemon], menuSource: neliWorldAssets.persianFoods.kebab, resultSource: neliWorldAssets.persianFoods.kebab },
  { id: 'jooje-kebab', fa: 'جوجه کباب', en: 'Jooje Kebab', color: '#F97316', vessel: 'plate', steps: [ALL.rice, ALL.filletChickenRaw, ALL.onion, ALL.lemon, ALL.salt, ALL.oil], menuSource: neliWorldAssets.persianFoods.jooje, resultSource: neliWorldAssets.persianFoods.jooje },
  { id: 'dolmeh', fa: 'دلمه', en: 'Dolmeh', color: '#10B981', vessel: 'plate', steps: [ALL.rice, ALL.grapeLeaves, ALL.herb, ALL.onion, ALL.lemon, ALL.salt], menuSource: neliWorldAssets.persianFoods.dolme, resultSource: neliWorldAssets.persianFoods.dolme },
  { id: 'ghormeh-sabzi', fa: 'قورمه سبزی', en: 'Ghormeh Sabzi', color: '#16A34A', vessel: 'pot', steps: [ALL.cutRawBeefForStew, ALL.herb, ALL.beans, ALL.onion, ALL.lemon, ALL.salt, ALL.oil], menuSource: neliWorldAssets.persianFoods.ghormeSabzi, resultSource: neliWorldAssets.persianFoods.ghormeSabzi },
  { id: 'kalam-polo', fa: 'کلم پلو', en: 'Kalam Polo', color: '#14B8A6', vessel: 'pot', steps: [ALL.rice, ALL.groundBeefRaw, ALL.kalam, ALL.onion, ALL.herb, ALL.salt, ALL.oil], menuSource: neliWorldAssets.persianFoods.kalamPolo, resultSource: neliWorldAssets.persianFoods.kalamPolo },
  { id: 'gheimeh', fa: 'قیمه', en: 'Gheimeh', color: '#EF4444', vessel: 'pot', steps: [ALL.cutRawBeefForStew, ALL.lappeh, ALL.onion, ALL.tomato, ALL.lemon, ALL.salt], menuSource: neliWorldAssets.persianFoods.gheimeh, resultSource: neliWorldAssets.persianFoods.gheimeh },
  { id: 'pizza', fa: 'پیتزا', en: 'Pizza', color: '#FB923C', vessel: 'plate', steps: [ALL.pizzaBread, ALL.tomato, ALL.pizzaCheese, ALL.mushroom, ALL.bellPepper, ALL.olive], menuSource: neliWorldAssets.persianFoods.pizza, resultSource: neliWorldAssets.persianFoods.pizza },
  { id: 'zereshk-polo', fa: 'زرشک پلو', en: 'Zereshk Polo', color: '#C026D3', vessel: 'pot', steps: [ALL.rice, ALL.zereshk, ALL.saffron, ALL.oil, ALL.salt], menuSource: neliWorldAssets.persianFoods.zereshkPolo, resultSource: neliWorldAssets.persianFoods.zereshkPolo },
];

// Only these recipes show as tabs for now — the rest are saved for a future
// version. Every recipe is still fully in RECIPES and playable; add an id
// back here (or clear this set) to bring it back into the picker.
const VISIBLE_RECIPE_IDS = new Set(['sabzi-polo', 'omelette', 'shirazi-salad', 'kuku-sabzi', 'tahchin', 'kebab']);

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

// The counter surface sits at a fixed fraction of the ARTWORK's height above
// its bottom edge, and the artwork is bottom-anchored. It used to be a
// fraction of the SCREEN height, which drifts as the header and recipe row
// take a bigger share of a short screen: on an 800pt tablet that chrome is
// 15% of the height, on a 428pt phone it is 24%, so the bowl slid below the
// counter on phones. 0.594 reproduces the existing tablet layout exactly —
// but only for the tablet art (kitchen_landscape_2048x1536). The WIDE art
// phones fall back to (kitchen_landscape_1920x1080) is a different crop
// with a much shallower counter, so this fraction doesn't apply there — see
// COUNTER_EDGE_FROM_BOTTOM below. The ingredient row has no fraction of its
// own any more — see getCounterSlots, which anchors it to the bowl's own
// rendered rect instead, so the two can't drift apart.
const TARGET_FROM_BOTTOM = 0.594;
// On short/wide phones the chef needs enough of a push down to clear the
// header + recipe row (see extraDrop below), and that push is computed from
// the chef's fixed size alone — it has no idea where the counter actually
// is in the art. On the tablet art that's harmless: the counter is a deep
// band, so any reasonable push still lands on it. But the WIDE phone art
// (kitchen_landscape_1920x1080) is a different crop whose counter is a
// shallow strip — measured directly from the file, the cream counter meets
// the teal cabinet front at 32.3% of the image height from the bottom
// (68.7% is the analogous line in kitchen_landscape_2048x1536, at 6.1% from
// the bottom, for the tablet-style art). A push sized only for chef
// clearance can overshoot that shallow strip on the shortest phones. Rather
// than capping the drop outright — which used to leave the chef's own head
// tucked under the header/recipe row, trading one visible glitch for
// another — the chef shrinks a bit first (see chefShrink below) so the
// clearance it needs and the room the counter has are closer to begin with;
// EDGE_MARGIN is the small buffer kept between the counter's front edge and
// wherever that negotiation lands.
const COUNTER_EDGE_FROM_BOTTOM_WIDE = 0.323;
const COUNTER_EDGE_FROM_BOTTOM_STANDARD = 0.061;
const EDGE_MARGIN = 4;

type CounterLayout = { slots: Slot[]; tileSize: number };

function shuffledSlotOrder(count: number): number[] {
  const order = Array.from({ length: count }, (_unused, index) => index);
  if (count < 2) return order;
  do {
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  } while (order.every((slotIndex, index) => slotIndex === index));
  return order;
}

function getCounterSlots(width: number, height: number, target: Rect, count: number, vessel: Recipe['vessel'], ingredientSize: number, maxLineY = Infinity): CounterLayout {
  const isLandscape = width > height;
  const cardW = Math.min(isLandscape ? 104 : 88, Math.max(68, Math.floor(width * 0.11)));
  const cardH = Math.min(isLandscape ? 92 : 80, Math.max(64, Math.floor(height * 0.09)));
  const margin = 10;
  const leftCount = Math.ceil(count / 2);
  const rightCount = count - leftCount;

  // FoodTile renders each tile in a touch target that's the WIDER of
  // slot.w and (tileSize + 24), centred on the slot — so a fixed floor on
  // the tile size (as this used to have, pinned to the caller's
  // screen-derived ingredientSize) can demand more width than a 4-wide
  // side has on the narrowest phones (confirmed: iPhone SE, the 7-step
  // Tahchin recipe — 4 tiles at that floor need ~300px against ~240px
  // available), which put every overflowing tile back on the same clamped
  // edge. tileSize is resolved here — shrunk only as far as fitting both
  // sides actually requires — and handed back so the caller renders the
  // art at this SAME size instead of the original request; touchW then
  // always equals what will actually be drawn, so it can shrink past
  // cardW too when the grid, not just the gap, is what's too tight.
  let gap = Math.max(4, Math.round(cardW * 0.06));
  const bowlGap = gap;
  let tileSize = ingredientSize;
  let touchW = tileSize + 24;
  const leftAvailable = Math.max(0, target.x - bowlGap - margin);
  const rightAvailable = Math.max(0, width - (target.x + target.w) - bowlGap - margin);
  const fits = (n: number, available: number) => n * touchW + Math.max(0, n - 1) * gap <= available;
  const minTileSize = 30;
  while (gap > 2 && (!fits(leftCount, leftAvailable) || !fits(rightCount, rightAvailable))) {
    gap -= 1;
  }
  while (
    tileSize > minTileSize &&
    (!fits(leftCount, leftAvailable) || !fits(rightCount, rightAvailable))
  ) {
    tileSize -= 2;
    touchW = tileSize + 24;
  }

  // Anchored to the bowl's OWN rendered rect — bottom-aligned with the bowl
  // image (counterBowl is target.h * 1.044 tall) — rather than computed
  // independently via its own from-bottom fraction and extraDrop. The two
  // used to be computed in parallel and mostly agreed by coincidence: once
  // the chef started shrinking (see chefShrink) to keep clear of the
  // header, the amount of push each one got could diverge, and the
  // ingredients visibly sat lower than the bowl on short phones. Deriving
  // one from the other's actual position makes that impossible.
  // FoodTile top-aligns the ingredient art (boxH tall) within a touch target
  // (touchHeight tall) centred on this slot, offset by `slot.h * 0.02` below
  // — mirror that arithmetic in reverse to land the art's own bottom edge,
  // not just the slot's, on the bowl's. Uses the resolved tileSize so this
  // stays correct if the art ended up smaller than requested above.
  const touchHeight = Math.max(cardH, tileSize + 42);
  const boxH = tileSize + 14;
  const bowlBottom = target.y + target.h * 1.006;
  const lineY = clamp(bowlBottom - cardH * 0.02 + (touchHeight - cardH) / 2 - boxH, height * 0.08, Math.min(height - cardH - 8, maxLineY));

  const leftStart = target.x - bowlGap - leftCount * touchW - Math.max(0, leftCount - 1) * gap;
  const rightStart = target.x + target.w + bowlGap;

  const slots = Array.from({ length: count }, (_unused, index) => {
    const isLeft = index < leftCount;
    const sideIndex = isLeft ? index : index - leftCount;
    const x = isLeft
      ? leftStart + sideIndex * (touchW + gap)
      : rightStart + sideIndex * (touchW + gap);
    return {
      x: clamp(x, margin, width - touchW - margin),
      y: lineY + cardH * 0.02,
      w: touchW,
      h: cardH,
    };
  });

  return { slots, tileSize };
}

function getTargetRect(width: number, height: number, sceneH: number, recipe: Recipe, targetFromBottom: number, extraDrop = 0): Rect {
  const isLandscape = width > height;
  const centerX = isLandscape ? width * 0.58 : width * 0.56;
  const w = isLandscape ? width * 0.20 : width * 0.26;
  const h = isLandscape ? height * 0.16 : height * 0.14;
  return {
    x: centerX - w / 2 - w / 4 - width * 0.05,
    y: clamp(height - sceneH * targetFromBottom + extraDrop, height * 0.06, height - h - 8),
    w,
    h,
  };
}

// Returns the art, its true aspect, AND the target-from-bottom fraction
// calibrated for THAT specific file — the caller has to crop the art itself
// (see the bottom-anchored background in the render below), and has to
// place the bowl using whichever fraction matches what's actually on screen
// (see the constants above).
function getCookingScene(width: number, height: number) {
  const WIDE = {
    source: neliWorldAssets.rooms.cookingTable,
    aspect: 1920 / 1080,
    targetFromBottom: TARGET_FROM_BOTTOM,
    edgeFromBottom: COUNTER_EDGE_FROM_BOTTOM_WIDE,
  };
  const STANDARD = {
    aspect: 2048 / 1536,
    targetFromBottom: TARGET_FROM_BOTTOM,
    edgeFromBottom: COUNTER_EDGE_FROM_BOTTOM_STANDARD,
  };
  const isLandscape = width > height;
  if (isLandscape) {
    return width / height > 1.45
      ? WIDE
      : { ...STANDARD, source: neliWorldAssets.rooms.cookingTableTabletLandscape };
  }
  return height / width > 1.4
    ? WIDE
    : { ...STANDARD, source: neliWorldAssets.rooms.cookingTableTabletPortrait };
}

function renderIngredientArt(ingredient: Ingredient, size: number) {
  const boxW = size + 12;
  const boxH = size + 14;

  if (ingredient.id === 'oil') {
    return <Image source={neliWorldAssets.foods.cookingOil} style={{ width: boxW, height: boxH, transform: [{ translateY: -4 }, { scale: 1.4 }] }} resizeMode="contain" />;
  }

  if (ingredient.id === 'pizzaBread') {
    return <Image source={neliWorldAssets.foods.pizzaBread} style={{ width: boxW, height: boxH, transform: [{ translateY: -6 }, { scale: 1.7 }] }} resizeMode="contain" />;
  }

  if (ingredient.id === 'egg') {
    return <Image source={neliWorldAssets.foods.eggWhole} style={{ width: boxW, height: boxH }} resizeMode="contain" />;
  }

  if (ingredient.id === 'cucumber') {
    return <Image source={neliWorldAssets.foods.cucumber} style={{ width: boxW, height: boxH }} resizeMode="contain" />;
  }

  if (ingredient.id === 'yogurt') {
    return <Image source={neliWorldAssets.foods.yogurt} style={{ width: boxW, height: boxH }} resizeMode="contain" />;
  }

  if (ingredient.id === 'lentils') {
    return <Image source={neliWorldAssets.foods.lentils} style={{ width: boxW, height: boxH }} resizeMode="contain" />;
  }

  if (ingredient.id === 'beans') {
    return <Image source={neliWorldAssets.foods.beans} style={{ width: boxW, height: boxH }} resizeMode="contain" />;
  }

  if (ingredient.id === 'reshtehAshRaw') {
    return <Image source={neliWorldAssets.foods.reshtehAshRaw} style={{ width: boxW, height: boxH, transform: [{ scale: 1.5 }] }} resizeMode="contain" />;
  }

  return <Image source={ingredient.source} style={{ width: boxW, height: boxH }} resizeMode="contain" />;
}

function renderReadyDish(recipe: Recipe, width: number, height: number) {
  return <Image source={recipe.resultSource} style={{ width: '100%', height: '100%' }} resizeMode="contain" />;
}

const READY_DISH_SCALE = 2.15622 * 1.61051;
const READY_DISH_TOP_RATIO = 0.78;

function getReadyDishFrame(target: Rect) {
  const width = target.w * READY_DISH_SCALE;
  const height = target.h * READY_DISH_SCALE;
  return {
    left: target.x + target.w * 0.5 - width * 0.5,
    top: target.y - target.h * READY_DISH_TOP_RATIO,
    width,
    height,
  };
}

function FoodTile({
  ingredient,
  slot,
  size,
  disabled,
  onAttempt,
  resetToken,
}: {
  ingredient: Ingredient;
  slot: Slot;
  size: number;
  disabled: boolean;
  onAttempt: (ingredient: Ingredient, point: Point) => void;
  resetToken: number;
}) {
  const drag = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);
  const touchWidth = Math.max(slot.w, size + 24);
  const touchHeight = Math.max(slot.h, size + 42);
  // Stable ref so the PanResponder below isn't rebuilt (and an in-progress
  // drag lost) whenever the parent re-renders and hands down a new onAttempt
  // function identity.
  const onAttemptRef = useRef(onAttempt);
  onAttemptRef.current = onAttempt;
  // Same idea as onAttemptRef: keep the latest slot without forcing the
  // PanResponder (created once below via useMemo) to be rebuilt.
  const slotRef = useRef(slot);
  slotRef.current = slot;

  useEffect(() => {
    drag.setValue({ x: 0, y: 0 });
    scale.setValue(1);
    setPressed(false);
  }, [drag, resetToken, scale]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onStartShouldSetPanResponderCapture: () => !disabled,
        onMoveShouldSetPanResponder: (_evt, gestureState) => !disabled && (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3),
        onMoveShouldSetPanResponderCapture: (_evt, gestureState) => !disabled && (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2),
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          drag.stopAnimation();
          scale.stopAnimation();
          setPressed(true);
          Animated.spring(scale, { toValue: 1.08, useNativeDriver: true }).start();
        },
        onPanResponderMove: Animated.event([null, { dx: drag.x, dy: drag.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_evt, gestureState) => {
          setPressed(false);
          const s = slotRef.current;
          const releasePoint = {
            x: s.x + s.w / 2 + gestureState.dx,
            y: s.y + s.h / 2 + gestureState.dy,
          };
          onAttemptRef.current(ingredient, releasePoint);
          Animated.parallel([
            Animated.spring(drag, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
          ]).start();
        },
        onPanResponderTerminate: () => {
          setPressed(false);
          Animated.parallel([
            Animated.spring(drag, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
          ]).start();
        },
      }),
    [disabled, drag, ingredient, scale],
  );

  return (
    <Animated.View
      {...pan.panHandlers}
      style={[
        styles.ingredientTile,
        {
          left: slot.x + slot.w / 2 - touchWidth / 2,
          top: slot.y + slot.h / 2 - touchHeight / 2,
          width: touchWidth,
          height: touchHeight,
          opacity: disabled ? 0.28 : pressed ? 0.95 : 1,
          zIndex: pressed ? 36 : 20,
          elevation: pressed ? 36 : 20,
          transform: [{ translateX: drag.x }, { translateY: drag.y }, { scale }],
        },
      ]}
    >
      {renderIngredientArt(ingredient, size)}
      <Text style={[styles.ingredientLabel, { fontFamily: ff('fa', 'bold') }, dir('fa')]}>{ingredient.fa}</Text>
    </Animated.View>
  );
}

function FlyingIngredient({
  ingredient,
  from,
  to,
  size,
  onDone,
}: {
  ingredient: Ingredient;
  from: Point;
  to: Point;
  size: number;
  onDone: () => void;
}) {
  const x = useRef(new Animated.Value(from.x)).current;
  const y = useRef(new Animated.Value(from.y)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const lift = { x: to.x + 6, y: to.y - 14 };
    Animated.sequence([
      Animated.parallel([
        Animated.timing(x, { toValue: lift.x, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(y, { toValue: lift.y, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.92, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(x, { toValue: to.x, duration: 240, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(y, { toValue: to.y, duration: 240, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.58, duration: 240, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 240, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(rotate, { toValue: -1, duration: 240, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start(({ finished }) => {
      if (finished) onDone();
    });
  }, [onDone, opacity, rotate, scale, to.x, to.y, x, y]);

  const spin = rotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.flyItem,
        {
          transform: [{ translateX: x }, { translateY: y }, { scale }, { rotate: spin }],
          opacity,
        },
      ]}
    >
      {renderIngredientArt(ingredient, size)}
    </Animated.View>
  );
}

function BowlAddEffect({
  target,
  color,
  size,
  onDone,
}: {
  target: Rect;
  color: string;
  size: number;
  onDone: () => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const offsets = useMemo(
    () => [
      { x: -0.26, y: -0.36 },
      { x: -0.1, y: -0.46 },
      { x: 0.08, y: -0.4 },
      { x: 0.23, y: -0.3 },
      { x: 0.0, y: -0.56 },
    ],
    [],
  );

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDone();
    });
  }, [onDone, progress]);

  const ringScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1.28] });
  const ringOpacity = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.7, 0.45, 0] });
  const sparkleOpacity = progress.interpolate({ inputRange: [0, 0.68, 1], outputRange: [1, 0.85, 0] });
  const popScale = progress.interpolate({ inputRange: [0, 0.28, 1], outputRange: [0.7, 1.08, 0.9] });
  const center = {
    x: target.x + target.w * 0.5,
    y: target.y + target.h * 0.38,
  };
  const effectSize = Math.max(size * 1.05, Math.min(target.w, target.h) * 0.72);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bowlAddEffect,
        {
          left: center.x - effectSize / 2,
          top: center.y - effectSize / 2,
          width: effectSize,
          height: effectSize,
          opacity: sparkleOpacity,
          transform: [{ scale: popScale }],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.bowlAddRing,
          {
            borderColor: color,
            transform: [{ scale: ringScale }],
            opacity: ringOpacity,
          },
        ]}
      />
      {offsets.map((offset, index) => (
        <Animated.View
          key={`${offset.x}-${offset.y}-${index}`}
          style={[
            styles.bowlAddDot,
            {
              backgroundColor: index % 2 === 0 ? color : '#FFFFFF',
              transform: [
                { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, effectSize * offset.x] }) },
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, effectSize * offset.y] }) },
                { scale: progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.7, 1.18, 0.42] }) },
              ],
              opacity: sparkleOpacity,
            },
          ]}
        />
      ))}
    </Animated.View>
  );
}

export default function CookingGame() {
  const { lang, addStars } = useContext(AppContext);
  const { reset: resetNav } = useNav();
  const { width, height } = useLandscapeDimensions();
  const insets = useSafeAreaInsets();
  const { speakFarsiOnly, speakInLang, stop } = useSpeech();
  const stageRef = useRef<View>(null);
  const [recipeIdx, setRecipeIdx] = useState(0);
  const [step, setStep] = useState(0);
  const [usedIds, setUsedIds] = useState<IngredientKind[]>([]);
  const [done, setDone] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect>({ x: 0, y: 0, w: 1, h: 1 });
  const [fly, setFly] = useState<{ ingredient: Ingredient; from: Point; to: Point } | null>(null);
  const [bowlAdd, setBowlAdd] = useState<{ id: number; color: string } | null>(null);
  const [stageOrigin, setStageOrigin] = useState({ x: 0, y: 0 });
  const [recipeRowBottom, setRecipeRowBottom] = useState(0);
  // Straight from TopBar rather than a hard-coded 90, which matched neither a
  // phone (70) nor a tablet (~98). onLayout on a wrapper reported 0 here, so
  // this takes the number from the source.
  const headerHeight = topBarHeight(height, insets.top, { topInset: 10 });

  const recipe = RECIPES[recipeIdx];
  const current = recipe.steps[step];
  const isFa = lang === 'fa' || lang === 'ar';
  const scene = getCookingScene(width, height);
  // Cover, but anchored to the BOTTOM instead of the centre. The counter and
  // table run along the bottom edge of this art, and a centred cover on a
  // 2.2:1 phone crops roughly a fifth of the height off each end — taking the
  // table with it, leaving ingredients to be dropped onto nothing. Overflow
  // now goes off the top, where there is only ceiling.
  const sceneW = Math.max(width, height * scene.aspect);
  const sceneH = sceneW / scene.aspect;
  const textFont = (weight: 'regular' | 'bold' | 'black') => (isFa ? ff('fa', weight) : ff(lang, weight));
  const menuFont = (weight: 'regular' | 'bold' | 'black' = 'bold') => ff('fa', weight);
  const showRecipeThumb = Math.min(width, height) >= 600;
  const recipeRowHeight = showRecipeThumb ? 60 : 38;
  const ingredientSize = Math.max(52, Math.min(108, Math.round(Math.min(width, height) * 0.102)));
  // The chef stays full-size in the common case — its size (and the
  // bowl-to-chef gap, a fixed 0.60 multiplier of this height) is exactly as
  // designed. TopBar is normal-flow (not absolute), so it and `stage`'s own
  // 8pt marginTop push `stage` down by `headerHeight + 8` before target.y=0
  // even starts — target.y is already stage-local, and the recipe row's
  // bottom edge in that same local space is `recipeRowHeight - stageMarginTop`.
  const stageMarginTop = 8;
  const isLandscapeScene = width > height;
  const chefWidthNatural = Math.min(width * 0.308, height * 0.462);
  const chefHeightNatural = chefWidthNatural * 1.22;
  const tabRowBottomLocal = recipeRowHeight - stageMarginTop;
  // Where the counter's front edge sits, in the same stage-local pseudo-space
  // as naturalTargetY below — see COUNTER_EDGE_FROM_BOTTOM_WIDE. Used only to
  // size chefShrink, never as a hard position cap: capping target.y directly
  // used to tuck the chef's own head under the header on the shortest
  // phones, trading a floating bowl for a decapitated chef.
  const edgeY = height - sceneH * scene.edgeFromBottom - (headerHeight + stageMarginTop);
  const targetHNatural = isLandscapeScene ? height * 0.16 : height * 0.14;
  const maxTargetYFromEdge = edgeY - targetHNatural * 1.006 - EDGE_MARGIN;
  const requiredTargetYNatural = tabRowBottomLocal + chefHeightNatural * 0.60;
  // Shrinks the chef just enough to close the gap between "clears the
  // header" and "leaves the bowl on the counter" when those two disagree —
  // floored so the chef never gets implausibly small on the most extreme
  // phones; past that floor the header wins, since a visible chef matters
  // more than an exact counter line.
  const chefShrink = requiredTargetYNatural > maxTargetYFromEdge
    ? clamp((maxTargetYFromEdge - tabRowBottomLocal) / (chefHeightNatural * 0.60), 0.78, 1)
    : 1;
  const chefWidth = chefWidthNatural * chefShrink;
  const chefHeight = chefHeightNatural * chefShrink;
  const chefFrameHeight = chefHeight * 0.74;
  // On a short landscape phone the counter (bowl + ingredients) sits close
  // enough to the top that the chef's hat would land behind the
  // header/recipe-tab row. Drop the whole counter group down by the same
  // amount — preserving every existing on-counter relationship — just far
  // enough that the chef clears the recipe row, not merely the header.
  const naturalTargetY = height - sceneH * scene.targetFromBottom;
  const requiredTargetY = tabRowBottomLocal + chefHeight * 0.60;
  const extraDrop = Math.max(0, requiredTargetY - naturalTargetY);
  const target = useMemo(() => getTargetRect(width, height, sceneH, recipe, scene.targetFromBottom, extraDrop), [height, recipe, sceneH, width, scene.targetFromBottom, extraDrop]);
  // The ingredient row is anchored to the bowl itself (see getCounterSlots),
  // so it only needs its own ceiling to keep off the bottom "next step" pill
  // (`styles.prompt`, positioned independently of the counter) on the
  // shortest phones.
  const ingredientCardH = Math.min(isLandscapeScene ? 92 : 80, Math.max(64, Math.floor(height * 0.09)));
  const nextPillTopLocal = (height - 18 - 44) - (headerHeight + stageMarginTop);
  const maxIngredientLineY = nextPillTopLocal - ingredientCardH * 1.02 - 8;
  // tileSize is ingredientSize as requested above, EXCEPT when a recipe has
  // more steps than the screen has room for at that size (see
  // getCounterSlots) — every ingredient-sized render below uses this
  // resolved value so a shrunk slot and its art never disagree.
  const { slots, tileSize } = useMemo(() => getCounterSlots(width, height, target, recipe.steps.length, recipe.vessel, ingredientSize, maxIngredientLineY), [height, recipe.steps.length, recipe.vessel, target, width, ingredientSize, maxIngredientLineY]);
  // Which slot each step's ingredient sits in. Shuffled per recipe (and per
  // replay, via resetToken) so the counter isn't laid out in the order the
  // voice asks for them — the child has to find each one. Never the identity
  // order, so a lucky shuffle can't give the answer away.
  const slotOrder = useMemo(() => shuffledSlotOrder(recipe.steps.length), [recipeIdx, resetToken, recipe.steps.length]);

  const say = (fa: string, en: string) => {
    stop();
    speakFarsiOnly(fa, () => {
      if (!isFa) setTimeout(() => speakInLang(en, lang), 220);
    });
  };

  // Kept current via a plain effect so the (non-reactive) idle-reminder timer
  // below can check it without retriggering the audio effect when `done`
  // flips true on the same step (the last ingredient of a recipe).
  const doneRef = useRef(done);
  useEffect(() => {
    doneRef.current = done;
  }, [done]);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearIdleReminder = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };
  const announceCurrentIngredient = () => {
    const key = getIngredientAudioKey(current.id);
    if (key) {
      void playFaAudio(key);
    } else {
      say(`بعدی: ${current.fa}`, `Next: ${current.en}`);
    }
  };
  // Repeats the current ingredient's name every 17s of inactivity so a child
  // who wandered off or forgot what's next gets reminded, until they move on
  // (step/resetToken change, handled by the effect below) or finish (done).
  const scheduleIdleReminder = () => {
    clearIdleReminder();
    idleTimerRef.current = setTimeout(() => {
      if (doneRef.current) return;
      announceCurrentIngredient();
      scheduleIdleReminder();
    }, 17000);
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      stop();
      if (step === 0) {
        const nameKey = `cooking/name/${recipe.id}` as Parameters<typeof playFaAudio>[0];
        const played = await playFaAudio(nameKey, { awaitFinish: true });
        if (cancelled) return;
        if (!played) {
          await new Promise<void>(resolve => speakFarsiOnly(recipe.fa, resolve));
          if (cancelled) return;
        }
        // A gap is required here: replace()-ing the shared player onto the
        // info clip immediately after the name clip's own didJustFinish can
        // fire a stray leftover status update that resolves THIS awaitFinish
        // instantly (observed: ~12ms, not the clip's real ~5s) — the same
        // race playFaAudioSequence's gapMs already guards against elsewhere.
        await new Promise(resolve => setTimeout(resolve, 150));
        if (cancelled) return;
        await playFaAudio('ingredients/info-cook', { awaitFinish: true });
        if (cancelled) return;
        // Same stale-event race as the gap above, between info-cook finishing
        // and the first ingredient's name starting — without it the first
        // ingredient's announceCurrentIngredient() call lands right on top of
        // info-cook's own didJustFinish and is silently swallowed.
        await new Promise(resolve => setTimeout(resolve, 150));
        if (cancelled) return;
      }
      if (cancelled) return;
      announceCurrentIngredient();
      scheduleIdleReminder();
    };
    void run();
    return () => {
      cancelled = true;
      clearIdleReminder();
    };
  }, [resetToken, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshStageOrigin = () => {
    stageRef.current?.measureInWindow((x, y) => {
      setStageOrigin({ x, y });
    });
  };

  const handleDrop = (ingredient: Ingredient, point: Point) => {
    if (done || usedIds.includes(ingredient.id)) return;
    // `point` is already stage-local (the tile's own slot position plus how far it was
    // dragged), so no window-offset correction is needed here.
    const localPoint = point;
    // Position no longer matters once a drag starts: releasing the correct next
    // ingredient anywhere sends it flying to the bowl. Only the wrong ingredient
    // is rejected.
    if (ingredient.id !== current.id) {
      setWrong(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => setWrong(false), 500);
      say(current.fa, current.en);
      scheduleIdleReminder();
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addStars(1);
    setUsedIds(prev => [...prev, ingredient.id]);
    setFly({
      ingredient,
      from: {
        x: Math.max(0, localPoint.x - tileSize / 2),
        y: Math.max(0, localPoint.y - tileSize / 2),
      },
      to: {
        x: target.x + target.w * 0.58 - tileSize / 2,
        y: target.y + target.h * 0.28 - tileSize / 2,
      },
    });

    if (step >= recipe.steps.length - 1) {
      setDone(true);
      setTimeout(async () => {
        const readyKey = `cooking/ready/${recipe.id}` as Parameters<typeof playFaAudio>[0];
        await playFaAudio(readyKey, { awaitFinish: true });
        setShowCelebration(true);
        void playFaAudio(FA_AUDIO_KEYS.feedback.afarin);
      }, 500);
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handleFlyDone = () => {
    if (fly) setBowlAdd({ id: Date.now(), color: fly.ingredient.color });
    setFly(null);
  };

  const resetRecipe = (index = recipeIdx) => {
    setRecipeIdx(index);
    setStep(0);
    setUsedIds([]);
    setDone(false);
    setShowCelebration(false);
    setWrong(false);
    setFly(null);
    setBowlAdd(null);
    setResetToken(prev => prev + 1);
  };

  return (
    <View style={styles.root}>
      <View style={styles.scene}>
        <Image
          source={scene.source}
          style={{ position: 'absolute', width: sceneW, height: sceneH, left: (width - sceneW) / 2, top: height - sceneH }}
          resizeMode="stretch"
        />
        <View style={[styles.sceneWash, done && styles.sceneWashDone]} />
        <TopBar title="Cooking" titleFa="آشپزی" showClose dark topInset={10} onBack={() => resetNav({ name: 'Home' })} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.recipeRow, { top: headerHeight, height: recipeRowHeight }]}
          contentContainerStyle={styles.recipeRowContent}
          onLayout={event => {
            const { y, height: rowHeight } = event.nativeEvent.layout;
            setRecipeRowBottom(y + rowHeight);
          }}
        >
          {RECIPES.map((item, index) => (VISIBLE_RECIPE_IDS.has(item.id) ? (
            <TouchableOpacity
              key={item.id}
              style={[styles.recipeTab, index === recipeIdx && { backgroundColor: item.color }]}
              onPress={() => {
                resetRecipe(index);
              }}
            >
              {showRecipeThumb ? (
                <View style={styles.recipeTabImageWrap}>
                  <Image source={item.menuSource} style={styles.recipeTabImage} resizeMode="contain" />
                </View>
              ) : null}
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.recipeTabText,
                  !showRecipeThumb && styles.recipeTabTextCompact,
                  isFa && styles.recipeTabTextFa,
                  index === recipeIdx && styles.recipeTabTextOn,
                  { fontFamily: menuFont('bold') },
                ]}
              >
                {isFa ? item.fa : item.en}
              </Text>
            </TouchableOpacity>
          ) : null))}
        </ScrollView>
        <View ref={stageRef} style={styles.stage} onLayout={refreshStageOrigin}>
          <View
            pointerEvents="none"
            style={[
              styles.chefNeliFrame,
              {
                left: target.x + target.w * 0.5 - chefWidth * 0.5,
                top: target.y - chefHeight * 0.60,
                width: chefWidth,
                height: chefFrameHeight,
              },
            ]}
          >
            <Image
              source={characterAssets.neli.poses.cooking}
              style={[styles.chefNeli, { width: chefWidth, height: chefHeight }]}
              resizeMode="contain"
            />
            <BlinkingNeliImage
              size={chefWidth * 0.96}
              height={chefHeight * 0.97}
              showBase={false}
              style={[
              styles.chefNeliBlink,
              {
                  left: chefWidth * 0.02048,
                  top: chefHeight * 0.014,
              },
            ]}
              introVisibleMs={800}
              repeatMs={3000}
              blinkClosedMs={250}
            />
          </View>

          <View
            pointerEvents="none"
            style={[
              styles.targetDropZone,
              wrong && styles.targetDropZoneWrong,
              { left: target.x, top: target.y, width: target.w, height: target.h },
            ]}
            onLayout={event => {
              const { x, y, width: w, height: h } = event.nativeEvent.layout;
              setTargetRect({ x, y, w, h });
            }}
          >
          </View>

          <View
            pointerEvents="none"
            style={[
              styles.counterBowl,
              {
                left: target.x - target.w * 0.022,
                top: target.y - target.h * 0.038,
                width: target.w * 1.044,
                height: target.h * 1.044,
              },
            ]}
          >
            <Image source={neliWorldAssets.kitchen.bowl} style={styles.counterBowlImage} resizeMode="contain" />
          </View>

          {recipe.steps.map((ingredient, index) => {
            const slot = slots[slotOrder[index] ?? index];
            const disabled = usedIds.includes(ingredient.id) || done;
            return (
              <FoodTile
                key={ingredient.id}
                ingredient={ingredient}
                slot={slot}
                size={tileSize}
                disabled={disabled}
                onAttempt={handleDrop}
                resetToken={resetToken}
              />
            );
          })}

          {fly ? (
            <FlyingIngredient
              ingredient={fly.ingredient}
              from={fly.from}
              to={fly.to}
              size={tileSize}
              onDone={handleFlyDone}
            />
          ) : null}

          {bowlAdd ? (
            <BowlAddEffect
              key={bowlAdd.id}
              target={target}
              color={bowlAdd.color}
              size={tileSize}
              onDone={() => setBowlAdd(null)}
            />
          ) : null}

          {done ? (
            (() => {
              const readyDishFrame = getReadyDishFrame(target);
              return (
            <View
              pointerEvents="none"
              style={[
                styles.readyDishWrap,
                readyDishFrame,
              ]}
            >
              {renderReadyDish(recipe, readyDishFrame.width, readyDishFrame.height)}
            </View>
              );
            })()
          ) : null}

        </View>

        <View style={[styles.prompt, done && styles.promptDone]}>
          {done ? (
            <Text style={[dir(isFa ? 'fa' : lang), styles.subtitle, styles.donePromptText, { fontFamily: textFont('bold') }]}>
              {isFa ? `${recipe.fa} آماده است!` : `${recipe.en} is ready!`}
            </Text>
          ) : (
            <View style={styles.nextRow}>
              <Text style={[styles.subtitle, { fontFamily: textFont('bold') }, dir(isFa ? 'fa' : lang)]}>
                {isFa ? `بعدی: ${current.fa}` : `Next: ${current.en}`}
              </Text>
              <TouchableOpacity activeOpacity={0.85} style={styles.topSpeakerBtn} onPress={() => say(current.fa, current.en)}>
                <Text style={styles.topSpeakerIcon}>{'\u{1F50A}'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {done ? (
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.restartTapLayer, { top: recipeRowBottom }]}
            onPress={() => resetRecipe()}
          />
        ) : null}

      </View>
      <PopperCelebration
        visible={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4E1B9' },
  scene: { flex: 1 },
  sceneWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(54, 31, 14, 0.06)' },
  sceneWashDone: { backgroundColor: 'rgba(255,255,255,0.40)' },
  recipeRow: {
    // `top` is set inline from the TopBar's measured height, so the tabs sit
    // flush under it at any screen size rather than at a fixed offset.
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 50,
    elevation: 50,
    alignSelf: 'stretch',
    marginHorizontal: 0,
    marginTop: 0,
    overflow: 'hidden',
    borderRadius: 0,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
  },
  recipeRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  recipeTab: {
    width: 108,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingVertical: 0,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  recipeTabImageWrap: {
    width: 87,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  recipeTabImage: {
    width: 84,
    height: 32,
  },
  recipeTabText: { color: '#5F2E19', fontSize: 9, lineHeight: 11, textAlign: 'center' },
  recipeTabTextCompact: { fontSize: 11, lineHeight: 13 },
  recipeTabTextFa: { writingDirection: 'rtl', textAlign: 'center' },
  recipeTabTextOn: { color: '#FFFFFF' },
  prompt: {
    position: 'absolute',
    left: '50%',
    bottom: 18,
    width: 360,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 560,
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 2,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    zIndex: 42,
    elevation: 42,
    transform: [{ translateX: -198 }],
  },
  promptDone: {
    bottom: 26,
  },
  restartTapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
    elevation: 60,
  },
  title: { color: '#5F2E19', fontSize: 25, lineHeight: 32, textAlign: 'center' },
  subtitle: { color: '#8A4D27', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  donePromptText: { width: '100%', textAlignVertical: 'center' },
  stage: { flex: 1, position: 'relative', paddingBottom: 12, marginTop: 8 },
  chefNeliFrame: {
    position: 'absolute',
    overflow: 'hidden',
    zIndex: 7,
    elevation: 7,
  },
  chefNeli: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  chefNeliBlink: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 2,
    elevation: 2,
  },
  targetDropZone: {
    position: 'absolute',
    borderRadius: 30,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
  },
  targetDropZoneWrong: {
    transform: [{ rotate: '-2deg' }],
  },
  ingredientTile: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 20,
    elevation: 20,
  },
  ingredientImage: {
    marginTop: 0,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  counterBowl: {
    position: 'absolute',
    zIndex: 12,
    elevation: 12,
  },
  counterBowlImage: {
    width: '100%',
    height: '100%',
  },
  readyDishWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 34,
    elevation: 34,
  },
  readyDish: {
    width: '100%',
    height: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  topSpeakerBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(95, 46, 25, 0.12)',
  },
  topSpeakerIcon: {
    fontSize: 13,
    lineHeight: 16,
  },
  ingredientLabel: {
    marginTop: 4,
    color: '#5B4530',
    fontSize: 11,
    textAlign: 'center',
  },
  flyItem: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    elevation: 30,
  },
  bowlAddEffect: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 32,
    elevation: 32,
  },
  bowlAddRing: {
    position: 'absolute',
    width: '70%',
    height: '42%',
    borderRadius: 999,
    borderWidth: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  bowlAddDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  doneRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#0EA5E9',
  },
  secondaryText: {
    color: '#0284C7',
    fontSize: 14,
    fontWeight: '900',
  },
  primaryBtn: {
    flex: 1,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});

