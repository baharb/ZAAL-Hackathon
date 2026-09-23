import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  PanResponder,
  PanResponderGestureState,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../../store/AppContext';
import { useNav } from '../../store/NavContext';
import { useLandscapeDimensions } from '../../hooks/useLandscapeDimensions';
import TopBar, { topBarHeight } from '../../components/TopBar';
import { dir, ff } from '../../theme/fonts';
import { neliWorldAssets } from '../../assets/neliWorldAssets';
import { FA_AUDIO_KEYS, playFaAudio, playFaAudioSequence, stopFaAudio } from '../../utils/faAudio';
import PopperCelebration from '../../components/PopperCelebration';
import GameEndOverlay from '../../components/GameEndOverlay';

type AnimalId = 'monkey' | 'rabbit' | 'cat' | 'panda' | 'bear' | 'giraffe';
type FoodId = 'carrot' | 'fish' | 'banana' | 'apple' | 'honey' | 'bamboo';
type Rect = { x: number; y: number; w: number; h: number };
type Point = { x: number; y: number };

type Animal = {
  id: AnimalId;
  fa: string;
  en: string;
  foodId: FoodId;
  foodFa: string;
  foodEn: string;
  color: string;
};

type Food = {
  id: FoodId;
  fa: string;
  en: string;
  source: any;
  color: string;
};

const ANIMALS: Animal[] = [
  { id: 'monkey', fa: 'میمون', en: 'Monkey', foodId: 'banana', foodFa: 'موز', foodEn: 'Banana', color: '#7C3AED' },
  { id: 'rabbit', fa: 'خرگوش', en: 'Rabbit', foodId: 'carrot', foodFa: 'هویج', foodEn: 'Carrot', color: '#FF8E3C' },
  { id: 'cat', fa: 'گربه', en: 'Cat', foodId: 'fish', foodFa: 'ماهی', foodEn: 'Fish', color: '#FDBA74' },
  { id: 'panda', fa: 'پاندا', en: 'Panda', foodId: 'bamboo', foodFa: 'بامبو', foodEn: 'Bamboo', color: '#111827' },
  { id: 'bear', fa: 'خرس', en: 'Bear', foodId: 'honey', foodFa: 'عسل', foodEn: 'Honey', color: '#8B5E3C' },
  { id: 'giraffe', fa: 'زرافه', en: 'Giraffe', foodId: 'apple', foodFa: 'برگ', foodEn: 'Leaves', color: '#84CC16' },
];

const FOODS: Food[] = [
  { id: 'carrot', fa: 'هویج', en: 'Carrot', source: neliWorldAssets.foods.carrot, color: '#F97316' },
  { id: 'fish', fa: 'ماهی', en: 'Fish', source: neliWorldAssets.foods.fish, color: '#38BDF8' },
  { id: 'banana', fa: 'موز', en: 'Banana', source: neliWorldAssets.foods.banana, color: '#FACC15' },
  { id: 'apple', fa: 'برگ', en: 'Leaves', source: neliWorldAssets.ingredients.leaves, color: '#EF4444' },
  { id: 'honey', fa: 'عسل', en: 'Honey', source: neliWorldAssets.foods.honey, color: '#EAB308' },
  { id: 'bamboo', fa: 'بامبو', en: 'Bamboo', source: neliWorldAssets.ingredients.bamboo, color: '#22C55E' },
];

const TRAY_ORDER: FoodId[] = ['banana', 'apple', 'carrot', 'honey', 'fish', 'bamboo'];

const FOOD_BY_ID = Object.fromEntries(FOODS.map(item => [item.id, item])) as Record<FoodId, Food>;
const ANIMAL_BY_FOOD_ID = Object.fromEntries(ANIMALS.map(animal => [animal.foodId, animal])) as Record<FoodId, Animal>;

function hit(rect: Rect, x: number, y: number) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

// Same per-animal formula AnimalSpot uses to size the animal image, shared
// so the fed-food anchors below can find where the image's real top edge is.
const ANIMAL_IMAGE_WIDTH_FRACTION: Record<AnimalId, { floor: number; ceil: number; factor: number }> = {
  monkey: { floor: 196, ceil: 280, factor: 0.29 },
  rabbit: { floor: 142, ceil: 192, factor: 0.186 },
  cat: { floor: 123, ceil: 169, factor: 0.165 },
  panda: { floor: 168, ceil: 224, factor: 0.221 },
  bear: { floor: 165, ceil: 230, factor: 0.223 },
  giraffe: { floor: 275, ceil: 389, factor: 0.377 },
};

const GROUNDED_ANIMAL_IDS: AnimalId[] = ['rabbit', 'cat', 'panda', 'bear', 'giraffe'];
// Where the row of grounded animals is allowed to span — leaves room on the
// left for the monkey's tree and a little breathing room on the right.
const GROUNDED_ROW_START_FRACTION = 0.22;
const GROUNDED_ROW_END_FRACTION = 0.98;

function animalImageSizeRaw(animalId: AnimalId, width: number, height: number) {
  const f = ANIMAL_IMAGE_WIDTH_FRACTION[animalId];
  const heightScale = Math.min(1, height / 420);
  return Math.max(f.floor, Math.min(f.ceil, width * f.factor)) * heightScale;
}

// Standing side by side on one ground line (see GROUND_FRACTION below), the
// five grounded animals' natural sizes don't always fit the stage width
// without overlapping — on a phone especially, the row is narrower than the
// sum of their floors. Shrink them all together, proportionally, just enough
// to fit with a minimum gap between each; on a tablet there's room to spare
// and this returns 1 (no change from the floor/ceil sizing above).
function groundedRowScale(width: number, height: number) {
  const naturalTotal = GROUNDED_ANIMAL_IDS.reduce((sum, id) => sum + animalImageSizeRaw(id, width, height), 0);
  const minGap = Math.max(8, width * 0.012);
  const available = Math.max(160, width * (GROUNDED_ROW_END_FRACTION - GROUNDED_ROW_START_FRACTION) - minGap * (GROUNDED_ANIMAL_IDS.length - 1));
  return naturalTotal > available ? Math.max(0.55, available / naturalTotal) : 1;
}

function animalImageSize(animalId: AnimalId, width: number, height: number) {
  const raw = animalImageSizeRaw(animalId, width, height);
  return animalId === 'monkey' ? raw : raw * groundedRowScale(width, height);
}

// x/y are fractions of the animal's own body — 0/0 near its head, 1/1 near
// its feet. The monkey hangs top-down from its box (unchanged). Every other
// animal now stands with its feet flush with the box's bottom edge (see
// GROUND_FRACTION in animalSlots); boxHeight - imageSize is the image's real
// top edge in box-relative pixels, and y is measured down from there — NOT
// as a fraction of the fixed 150 reference box, which is what these numbers
// were first copied from and why they all landed near each animal's feet
// (worst for giraffe: 150*0.92 sits 36% down its own much-taller image, not
// 92% — its mouth is near the top of a tall neck, not the bottom).
function getFedPlacement(target: Rect, foodSize: number, animalId: AnimalId, width: number, height: number): Rect {
  const offsets: Record<AnimalId, { x: number; y: number; scale: number }> = {
    monkey: { x: 1.22, y: 1.65, scale: 1.152 },
    rabbit: { x: 0.54, y: 0.65, scale: 1.078 },
    cat: { x: 0.46, y: 0.58, scale: 1.553 },
    panda: { x: 0.52, y: 0.52, scale: 1.078 },
    bear: { x: 0.45, y: 0.60, scale: 1.00 },
    giraffe: { x: 0.35, y: 0.36, scale: 1.10 },
  };
  const offset = offsets[animalId];
  const size = Math.max(42, Math.round(foodSize * offset.scale));
  if (animalId === 'monkey') {
    return {
      x: target.x + target.w * offset.x - size * 0.5,
      y: target.y + target.h * offset.y - size * 0.5,
      w: size,
      h: size,
    };
  }
  const imageSize = animalImageSize(animalId, width, height);
  const imageTop = target.h - imageSize;
  return {
    x: target.x + target.w * offset.x - size * 0.5,
    y: target.y + imageTop + imageSize * offset.y - size * 0.5,
    w: size,
    h: size,
  };
}

function getFedAnchor(animalId: AnimalId, foodSize: number, width: number, height: number) {
  const anchors: Record<AnimalId, { x: number; y: number; scale: number }> = {
    monkey: { x: 1.20, y: 1.44, scale: 1.152 },
    rabbit: { x: 0.54, y: 0.65, scale: 1.078 },
    cat: { x: 0.46, y: 0.58, scale: 1.553 },
    panda: { x: 0.52, y: 0.52, scale: 1.078 },
    bear: { x: 0.45, y: 0.60, scale: 1.00 },
    giraffe: { x: 0.35, y: 0.36, scale: 1.10 },
  };
  const anchor = anchors[animalId];
  const size = Math.max(42, Math.round(foodSize * anchor.scale));
  if (animalId === 'monkey') {
    return {
      left: Math.round(110 * anchor.x - size * 0.5),
      top: Math.round(150 * anchor.y - size * 0.5),
      width: size,
      height: size,
    };
  }
  const imageSize = animalImageSize(animalId, width, height);
  const imageTop = 150 - imageSize;
  return {
    left: Math.round(110 * anchor.x - size * 0.5),
    top: Math.round(imageTop + imageSize * anchor.y - size * 0.5),
    width: size,
    height: size,
  };
}

function getFoodArtStyle(food: Food, size: number) {
  const width =
    (food.id === 'carrot'
      ? size * 1.2
      : food.id === 'banana'
        ? size * 1.2
        : food.id === 'fish'
          ? size * 1.56
          : food.id === 'apple'
            ? size * 1.2
            : food.id === 'bamboo'
              ? size * 1.584
              : size) + 8;
  const height =
    (food.id === 'carrot'
      ? size * 1.2
      : food.id === 'banana'
        ? size * 1.05
        : food.id === 'fish'
          ? size * 1.56
          : food.id === 'apple'
            ? size * 1.2
            : food.id === 'bamboo'
              ? size * 1.584
              : size) + 8;
  const transform = food.id === 'fish' ? [{ translateY: size * 0.4 }] : undefined;
  return { width, height, transform };
}

// Every animal but the monkey stands on the jungle floor, so its feet should
// land on one consistent ground line regardless of screen size. The old
// scheme positioned each animal's box-TOP as a fraction of height, then
// top-aligned the image inside it (see AnimalSpot) — but the image's own
// height is capped independently of screen height (see imageSize below), so
// on a tall stage (a tablet, or even a merely-taller phone) the capped image
// stopped reaching anywhere near the box's bottom and the animal read as
// floating near the top. GROUND_FRACTION fixes the animal's box-BOTTOM to a
// screen-relative ground line instead, and AnimalSpot bottom-aligns the
// image inside it, so the image's actual rendered bottom — not an
// independently-tuned offset — is what sits on the ground, at any size.
const GROUND_FRACTION = 0.86;

// Lays the five grounded animals out left to right by their actual (already
// crowd-scaled) rendered width plus a minimum gap, so their images never
// overlap — replacing the old per-animal x fractions, which were tuned
// assuming each animal sat at a different height and could get away with
// overlapping bounding boxes because they weren't visually at the same spot.
// Any left-over room (the row didn't need to shrink) is spread evenly as
// extra gap rather than bunched on one side.
function groundedAnimalCenters(width: number, height: number): Record<AnimalId, number> {
  const scale = groundedRowScale(width, height);
  const sizes = GROUNDED_ANIMAL_IDS.map(id => animalImageSizeRaw(id, width, height) * scale);
  const minGap = Math.max(8, width * 0.012);
  const startX = width * GROUNDED_ROW_START_FRACTION;
  const totalSize = sizes.reduce((sum, s) => sum + s, 0);
  const naturalSpan = totalSize + minGap * (sizes.length - 1);
  const slack = Math.max(0, width * GROUNDED_ROW_END_FRACTION - startX - naturalSpan);
  const gap = minGap + slack / (sizes.length - 1);
  let cursor = startX;
  const centers = {} as Record<AnimalId, number>;
  GROUNDED_ANIMAL_IDS.forEach((id, i) => {
    centers[id] = cursor + sizes[i] * 0.5;
    cursor += sizes[i] + gap;
  });
  return centers;
}

function animalSlots(width: number, height: number) {
  const isLandscape = width > height;
  // w/h were a flat 110x150 regardless of screen size — tuned against a
  // tablet's spare height. On a short landscape phone that's over half the
  // available stage height for a single slot box, which (via the bear-rect
  // relative food slots below) pushed fish/bamboo well past the bottom of
  // the screen. Scale down when height is tight; unchanged above the
  // reference so tablets render exactly as before.
  const slotScale = Math.min(1, height / 420);
  const w = Math.round(110 * slotScale);
  const h = Math.round(150 * slotScale);
  const yShift = Math.round(height * 0.06);
  const monkeyRight = 0;
  const monkeyUp = Math.round(height * 0.05);
  const groundY = Math.max(h + 8, Math.min(height - 8, Math.round(height * GROUND_FRACTION)));
  const groundedY = groundY - h;
  const centers = groundedAnimalCenters(width, height);
  const groundedX = (id: AnimalId) => Math.round(centers[id] - w / 2);
  if (isLandscape) {
    return [
      { x: Math.max(6, Math.round(width * 0.03) + monkeyRight), y: Math.max(8, Math.round(height * 0.04)) + yShift - monkeyUp, w, h },
      { x: groundedX('rabbit'), y: groundedY, w, h },
      { x: groundedX('cat'), y: groundedY, w, h },
      { x: groundedX('panda'), y: groundedY, w, h },
      { x: groundedX('bear'), y: groundedY, w, h },
      { x: groundedX('giraffe'), y: groundedY, w, h },
    ];
  }
  return [
    { x: Math.max(8, Math.round(width * 0.04) + monkeyRight), y: Math.max(10, Math.round(height * 0.05)) + yShift - monkeyUp, w, h },
    { x: groundedX('rabbit'), y: groundedY, w, h },
    { x: groundedX('cat'), y: groundedY, w, h },
    { x: groundedX('panda'), y: groundedY, w, h },
    { x: groundedX('bear'), y: groundedY, w, h },
    { x: groundedX('giraffe'), y: groundedY, w, h },
  ];
}

// A tiny seeded PRNG (LCG) so the shuffle below is deterministic per `seed`
// (reproducible for a given round) but changes on every reset/replay.
function seededRandom(seed: number) {
  let s = seed + 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function sceneFoodSlots(width: number, height: number, seed: number) {
  const isLandscape = width > height;
  const cardW = Math.min(isLandscape ? 88 : 82, Math.max(62, Math.round(Math.min(width, height) * 0.13)));
  const cardH = Math.round(cardW * 1.08);
  // FoodTile's real rendered footprint is bigger than this nominal card —
  // the art box can render up to 1.6x the food's `size` (see artBoxSize in
  // FoodTile) and its label is stacked below that. Budget for both so
  // neighbouring tiles' art and labels don't clip each other.
  const trueW = Math.round(cardW * 1.65);
  const trueH = Math.round(cardH * 1.9 + 34);

  // Scatter anchors spread across the "sky" band above the ground line (see
  // GROUND_FRACTION) in a zig-zag so neighbours clear each other's real
  // footprint. Shuffled per round (seeded by `seed`) so the food isn't
  // sitting directly over the animal it belongs to — the child has to look
  // for the right one, not just drag straight down.
  const anchors = isLandscape
    ? [
        { x: 0.09, y: 0.20 }, { x: 0.27, y: 0.47 }, { x: 0.44, y: 0.15 },
        { x: 0.61, y: 0.45 }, { x: 0.78, y: 0.17 }, { x: 0.94, y: 0.47 },
      ]
    : [
        { x: 0.15, y: 0.14 }, { x: 0.50, y: 0.08 }, { x: 0.85, y: 0.14 },
        { x: 0.15, y: 0.36 }, { x: 0.50, y: 0.30 }, { x: 0.85, y: 0.36 },
      ];

  const order = [0, 1, 2, 3, 4, 5];
  const rand = seededRandom(seed);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const minY = 8;
  const maxY = Math.max(minY, height - cardH - 55);
  const minX = 8;
  const maxX = width - cardW - 8;
  const slots = TRAY_ORDER.map((_foodId, index) => {
    const anchor = anchors[order[index]];
    const jitterX = Math.round(((seed + index * 7) % 3 - 1) * (trueW * 0.08));
    const jitterY = Math.round(((seed + index * 13) % 3 - 1) * (trueH * 0.05));
    return {
      x: Math.max(minX, Math.min(maxX, Math.round(width * anchor.x - cardW * 0.5 + jitterX))),
      y: Math.max(minY, Math.min(maxY, Math.round(height * anchor.y - cardH * 0.5 + jitterY))),
      w: cardW,
      h: cardH,
    };
  });

  // The hand-tuned anchor spread above is generous on a tablet but can be
  // tighter than the tiles' real footprint on a small phone (a narrower
  // stage, same 6 items) — resolve any remaining overlap by nudging tiles
  // apart along whichever axis needs less movement, a few passes so a chain
  // of three-plus crowded tiles fully separates rather than just the first
  // pair. footprintOf mirrors FoodTile's actual layout: centered
  // horizontally on the slot, extra label height growing downward from it.
  const footprintOf = (slot: Rect) => ({
    x: slot.x - (trueW - cardW) / 2,
    y: slot.y,
    w: trueW,
    h: trueH,
  });
  for (let pass = 0; pass < 6; pass++) {
    let moved = false;
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = footprintOf(slots[i]);
        const b = footprintOf(slots[j]);
        const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (overlapX <= 0 || overlapY <= 0) continue;
        moved = true;
        const centerDX = (b.x + b.w / 2) - (a.x + a.w / 2);
        const centerDY = (b.y + b.h / 2) - (a.y + a.h / 2);
        if (overlapX < overlapY) {
          const push = overlapX / 2 + 1;
          const dir = centerDX >= 0 ? 1 : -1;
          slots[i].x = Math.max(minX, Math.min(maxX, slots[i].x - dir * push));
          slots[j].x = Math.max(minX, Math.min(maxX, slots[j].x + dir * push));
        } else {
          const push = overlapY / 2 + 1;
          const dir = centerDY >= 0 ? 1 : -1;
          slots[i].y = Math.max(minY, Math.min(maxY, slots[i].y - dir * push));
          slots[j].y = Math.max(minY, Math.min(maxY, slots[j].y + dir * push));
        }
      }
    }
    if (!moved) break;
  }

  return slots;
}

function AnimalSpot({
  animal,
  active,
  width,
  height,
}: {
  animal: Animal;
  active: boolean;
  width: number;
  height: number;
}) {
  const animalSource = {
    monkey: neliWorldAssets.animals.monkey,
    rabbit: neliWorldAssets.animals.rabbit,
    cat: neliWorldAssets.animals.cat,
    panda: neliWorldAssets.animals.panda,
    bear: neliWorldAssets.animals.bear,
    giraffe: neliWorldAssets.animals.giraffe,
  }[animal.id];
  // These floors (196–275px) were tuned purely off width, with no ceiling
  // tied to how tall the stage actually is — on a short landscape phone six
  // of them at "floor" size were each already most of the available stage
  // height, so neighbours overlapped. Scale the whole set down together
  // below the same reference animalSlots uses, so relative sizing between
  // animals is preserved; untouched on tablets/taller phones.
  const imageSize = animalImageSize(animal.id, width, height);

  // The monkey hangs from a vine at the top of its box — unchanged. Every
  // other animal stands on the jungle floor: bottom-align its image inside
  // the box so the image's own rendered bottom (its feet), not an
  // independently-tuned offset, is what lands on the ground line set by
  // GROUND_FRACTION in animalSlots.
  const grounded = animal.id !== 'monkey';

  return (
    <View style={[styles.animalSpot, grounded && styles.animalSpotGrounded]}>
      <Image
        source={animalSource}
        style={[
          styles.animalImage,
          grounded && styles.animalImageGrounded,
          active && styles.animalImageActive,
          animal.id === 'monkey' ? styles.monkeyImage : null,
          {
            width: imageSize,
            height: imageSize,
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

function FoodTile({
  food,
  slot,
  size,
  disabled,
  onAttempt,
  onSpeak,
  resetToken,
}: {
  food: Food;
  slot: Rect;
  size: number;
  disabled: boolean;
  onAttempt: (food: Food, point: Point, from: Point) => void;
  onSpeak: (food: Food) => void;
  resetToken: number;
}) {
  const drag = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);
  // Stable refs so the PanResponder below isn't rebuilt (and an in-progress
  // drag lost) whenever the parent re-renders and hands down new callback
  // function identities.
  const onAttemptRef = useRef(onAttempt);
  onAttemptRef.current = onAttempt;
  const onSpeakRef = useRef(onSpeak);
  onSpeakRef.current = onSpeak;

  useEffect(() => {
    drag.setValue({ x: 0, y: 0 });
    pressScale.setValue(1);
    setPressed(false);
  }, [resetToken, drag, pressScale]);

  // foodArtBox was a flat 120x120 regardless of `size` (already responsive
  // to screen height), so the tile's real visual footprint — art box plus
  // the label stacked below it — stayed ~140-150pt tall even when `size`
  // shrank on a short phone, well past the tile's own nominal slot.h. 1.6x
  // covers bamboo's 1.584x art multiplier (the largest), so nothing clips.
  const artBoxSize = Math.round(size * 1.6 + 10);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: () => {
          setPressed(true);
          onSpeakRef.current(food);
          Animated.spring(pressScale, { toValue: 1.2, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
        },
        onPanResponderMove: (_evt: any, gestureState: PanResponderGestureState) => {
          drag.setValue({ x: gestureState.dx, y: gestureState.dy });
        },
        onPanResponderRelease: (_evt: any, gestureState: PanResponderGestureState) => {
          setPressed(false);
          Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 2 }).start();
          onAttemptRef.current(
            food,
            { x: gestureState.moveX, y: gestureState.moveY },
            {
              x: slot.x + gestureState.dx + slot.w * 0.5 - size * 0.5,
              y: slot.y + gestureState.dy + slot.h * 0.5 - size * 0.5,
            },
          );
          Animated.spring(drag, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        },
        onPanResponderTerminate: () => {
          setPressed(false);
          Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 2 }).start();
          Animated.spring(drag, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        },
      }),
    [disabled, drag, food, size, slot.h, slot.w, slot.x, slot.y],
  );

  return (
    <Animated.View
      {...pan.panHandlers}
      style={[
        styles.foodTile,
        !disabled && styles.foodTileActive,
        {
          left: slot.x,
          top: slot.y,
          width: slot.w,
          height: slot.h,
          opacity: disabled ? 0.34 : pressed ? 0.96 : 1,
          transform: [
            { translateX: drag.x },
            { translateY: drag.y },
            { scale: pressScale },
          ],
        },
      ]}
    >
      {food.id === 'bamboo' ? (
        <View style={[styles.foodArtBox, { width: artBoxSize, height: artBoxSize }]}>
          <Image
            source={food.source}
            style={[styles.foodImage, getFoodArtStyle(food, size)]}
            resizeMode="contain"
          />
          <Text style={[styles.foodLabel, { fontFamily: ff('fa', 'bold') }]}>{food.fa}</Text>
        </View>
      ) : (
        <>
          <View style={[styles.foodArtBox, { width: artBoxSize, height: artBoxSize }]}>
            <Image
              source={food.source}
              style={[styles.foodImage, getFoodArtStyle(food, size)]}
              resizeMode="contain"
            />
          </View>
          <Text
            style={[
              styles.foodLabel,
              food.id === 'banana' ? styles.bananaLabel : null,
              food.id === 'apple' ? styles.leavesLabel : null,
              food.id === 'carrot' ? styles.carrotLabel : null,
              food.id === 'honey' ? styles.honeyLabel : null,
              food.id === 'fish' ? styles.fishLabel : null,
              { fontFamily: ff('fa', 'bold') },
            ]}
          >
            {food.fa}
          </Text>
        </>
      )}
    </Animated.View>
  );
}

function FlyingFood({
  food,
  from,
  to,
  size,
  onDone,
}: {
  food: Food;
  from: Point;
  to: Point;
  size: number;
  onDone: () => void;
}) {
  const x = useRef(new Animated.Value(from.x)).current;
  const y = useRef(new Animated.Value(from.y)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(x, { toValue: to.x, duration: 540, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(y, { toValue: to.y, duration: 540, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.62, duration: 540, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 540, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onDone();
    });
  }, [onDone, opacity, scale, to.x, to.y, x, y]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.flyingFood,
        {
          transform: [{ translateX: x }, { translateY: y }, { scale }],
          opacity,
        },
      ]}
    >
      <Image source={food.source} style={[{ width: size, height: size }, getFoodArtStyle(food, size)]} resizeMode="contain" />
    </Animated.View>
  );
}

export default function FeedAnimalsGame() {
  const { lang, addStars } = useContext(AppContext);
  const { reset } = useNav();
  const { width, height } = useLandscapeDimensions();
  const insets = useSafeAreaInsets();
  const stageRef = useRef<View>(null);
  const isFa = lang === 'fa' || lang === 'ar';
  // TopBar is normal-flow (not absolute) so it really pushes `stage` down by
  // its own rendered height. animalSlots/sceneFoodSlots used to be handed
  // the full window `height`, clamping animal/food positions as if the
  // whole screen were free real estate below y=0 — on a short landscape
  // phone the header eats a much bigger share of that budget than on a
  // tablet, so several foods ended up clamped to a y that was still well
  // past the bottom of the actually-visible stage. Pass the real leftover
  // height instead.
  const headerHeight = topBarHeight(height, insets.top, { topInset: 10 });
  const stageHeight = Math.max(120, height - headerHeight);
  const sceneSource = useMemo(() => {
    if (width > height) {
      return width / height > 1.45 ? neliWorldAssets.rooms.feedAnimalsJungle : neliWorldAssets.rooms.feedAnimalsJungleTabletLandscape;
    }
    return height / width > 1.4 ? neliWorldAssets.rooms.feedAnimalsJunglePortrait : neliWorldAssets.rooms.feedAnimalsJungleTabletPortrait;
  }, [height, width]);

  const [fedIds, setFedIds] = useState<FoodId[]>([]);
  const [done, setDone] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showEndOverlay, setShowEndOverlay] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [inspectedAnimalId, setInspectedAnimalId] = useState<AnimalId | null>(null);
  const [stageOrigin, setStageOrigin] = useState({ x: 0, y: 0 });
  const [animalRects, setAnimalRects] = useState<Record<AnimalId, Rect>>({
    monkey: { x: 0, y: 0, w: 1, h: 1 },
    rabbit: { x: 0, y: 0, w: 1, h: 1 },
    cat: { x: 0, y: 0, w: 1, h: 1 },
    panda: { x: 0, y: 0, w: 1, h: 1 },
    bear: { x: 0, y: 0, w: 1, h: 1 },
    giraffe: { x: 0, y: 0, w: 1, h: 1 },
  });
  const [fly, setFly] = useState<{ food: Food; from: Point; to: Point } | null>(null);
  const inspectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fedFoodByAnimal, setFedFoodByAnimal] = useState<Record<AnimalId, FoodId | null>>({
    monkey: null,
    rabbit: null,
    cat: null,
    panda: null,
    bear: null,
    giraffe: null,
  });

  const currentAnimal = useMemo(() => ANIMALS.find(animal => !fedIds.includes(animal.foodId)) ?? ANIMALS[ANIMALS.length - 1], [fedIds]);
  const currentFood = FOOD_BY_ID[currentAnimal.foodId];
  const animalLayout = useMemo(() => animalSlots(width, stageHeight), [stageHeight, width]);
  const foodLayout = useMemo(() => sceneFoodSlots(width, stageHeight, resetToken), [resetToken, stageHeight, width]);
  const foodSize = Math.max(48, Math.min(78, Math.round(Math.min(width, stageHeight) * 0.085)));

  // This screen has recorded Farsi for the six food names and for "afarin",
  // and nothing else. Every other line here used to fall through to TTS, and
  // with no Persian voice installed (iOS ships none) the device read Arabic
  // script with an English voice — a garbled syllable over the top of the
  // recorded word. Recorded audio only, and silence where there is none.

  // Every food is a PanResponder, and onPanResponderGrant fires on each
  // touch-start — a finger that lands, slips and re-grabs retriggers the clip
  // with nothing to stop it, so the same word stutters. One clip per food per
  // 600ms is well under how long any of them take to say.
  const lastSpokenRef = useRef<{ id: string; at: number }>({ id: '', at: 0 });
  const speakFood = (food: Food) => {
    const now = Date.now();
    const last = lastSpokenRef.current;
    if (last.id === food.id && now - last.at < 600) return;
    lastSpokenRef.current = { id: food.id, at: now };
    void playFaAudio(`feed-animals/food/${food.id}` as Parameters<typeof playFaAudio>[0]);
  };

  useEffect(() => {
    return () => {
      if (inspectTimer.current) clearTimeout(inspectTimer.current);
    };
  }, []);

  useEffect(() => {
    void stopFaAudio();
    const id = setTimeout(() => {
      void playFaAudioSequence([FA_AUDIO_KEYS.feedAnimals.info], 110);
    }, 450);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!done && fedIds.length === ANIMALS.length) {
      setDone(true);
      setShowCelebration(true);
      setTimeout(async () => {
        await playFaAudio(FA_AUDIO_KEYS.feedback.afarin, { awaitFinish: true });
      }, 400);
    }
  }, [done, fedIds.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshStageOrigin = () => {
    stageRef.current?.measureInWindow((x, y) => {
      setStageOrigin({ x, y });
    });
  };

  const handleAttempt = (food: Food, point: Point, from: Point) => {
    if (done) return;
    const matchedAnimal = ANIMAL_BY_FOOD_ID[food.id];
    const target = animalRects[matchedAnimal.id];
    const localPoint = {
      x: point.x - stageOrigin.x,
      y: point.y - stageOrigin.y,
    };

    let nearTarget: boolean;
    if (matchedAnimal.id === 'monkey') {
      // Unchanged — the monkey's box is still top-anchored to its hanging pose.
      const hitRect = {
        x: target.x - target.w * 0.28,
        y: target.y - target.h * 0.18,
        w: target.w * 1.72,
        h: target.h * 1.95,
      };
      nearTarget = hit(hitRect, localPoint.x, localPoint.y);
    } else {
      // Every other animal now stands with its feet flush with the box's
      // bottom edge (GROUND_FRACTION in animalSlots) and can render taller
      // than the nominal box (giraffe especially) — so the drop target is
      // an invisible circle around the animal's real visible body, generous
      // enough that a food dropped anywhere near it (not just precisely on
      // top of it) still registers as a hit.
      const imageSize = animalImageSize(matchedAnimal.id, width, stageHeight);
      const bodyCenterX = target.x + target.w * 0.5;
      const bodyCenterY = target.y + target.h - imageSize * 0.5;
      const radius = imageSize * 0.5 + Math.max(46, imageSize * 0.55);
      const dx = localPoint.x - bodyCenterX;
      const dy = localPoint.y - bodyCenterY;
      nearTarget = dx * dx + dy * dy <= radius * radius;
    }

    if (!nearTarget) {
      setWrong(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => setWrong(false), 480);
      void playFaAudio(FA_AUDIO_KEYS.feedback.tryAgain);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addStars(1);
    setFedIds(prev => (prev.includes(food.id) ? prev : [...prev, food.id]));
    const fedPlacement = getFedPlacement(target, foodSize, matchedAnimal.id, width, stageHeight);
    setFedFoodByAnimal(prev => ({
      ...prev,
      [matchedAnimal.id]: food.id,
    }));
    setFly({
      food,
      from,
      to: { x: fedPlacement.x, y: fedPlacement.y },
    });
    speakFood(food);
  };


  const handleFlyDone = () => {
    setFly(null);
  };

  const inspectFedAnimal = (animalId: AnimalId) => {
    const foodId = fedFoodByAnimal[animalId];
    if (!foodId) return;

    const food = FOOD_BY_ID[foodId];
    setInspectedAnimalId(animalId);
    if (inspectTimer.current) clearTimeout(inspectTimer.current);
    inspectTimer.current = setTimeout(() => {
      setInspectedAnimalId(prev => (prev === animalId ? null : prev));
    }, 1200);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    speakFood(food);
  };

  const resetGame = () => {
    setFedIds([]);
    setDone(false);
    setWrong(false);
    setFly(null);
    setFedFoodByAnimal({
      monkey: null,
      rabbit: null,
      cat: null,
      panda: null,
      bear: null,
      giraffe: null,
    });
    setResetToken(prev => prev + 1);
  };

  return (
    <View style={styles.root}>
      <ImageBackground source={sceneSource} style={styles.scene} imageStyle={styles.sceneImage} resizeMode="cover">
        <View style={styles.sceneWash} />
        <TopBar title="Feed Animals" titleFa="غذا بده" showClose dark topInset={10} onBack={() => reset({ name: 'Main', tab: 'Games' })} />

        <View ref={stageRef} style={styles.stage} onLayout={refreshStageOrigin}>
          {animalLayout.map((slot, index) => {
            const animal = ANIMALS[index];
            const active = animal.id === currentAnimal.id;
            const fedFoodId = fedFoodByAnimal[animal.id];
            return (
              <TouchableOpacity
                key={animal.id}
                activeOpacity={fedFoodId ? 0.92 : 1}
                disabled={!fedFoodId}
                style={[styles.animalWrap, { left: slot.x, top: slot.y, width: slot.w, height: slot.h }]}
                onPress={() => inspectFedAnimal(animal.id)}
                onLayout={event => {
                  const { x, y, width: w, height: h } = event.nativeEvent.layout;
                  setAnimalRects(prev => ({ ...prev, [animal.id]: { x, y, w, h } }));
                }}
              >
                <AnimalSpot animal={animal} active={active} width={width} height={stageHeight} />
                {fedFoodId ? (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.animalFoodOverlay,
                      inspectedAnimalId === animal.id ? styles.animalFoodOverlayActive : null,
                      getFedAnchor(animal.id, foodSize, width, stageHeight),
                    ]}
                  >
                    {inspectedAnimalId === animal.id ? (
                      <View style={styles.animalFoodBubble}>
                      <Text style={styles.animalFoodBubbleText}>
                          {FOOD_BY_ID[fedFoodId].fa}
                        </Text>
                      </View>
                    ) : null}
                    <Image source={FOOD_BY_ID[fedFoodId].source} style={styles.animalFoodImage} resizeMode="contain" />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}

          {animalLayout.map((slot, index) => {
            const animal = ANIMALS[index];
            if (!fedFoodByAnimal[animal.id]) return null;
            const anchor = getFedAnchor(animal.id, foodSize, width, stageHeight);
            return (
              <TouchableOpacity
                key={`${animal.id}-food-touch`}
                style={[
                  styles.attachedFoodTouch,
                  {
                    left: slot.x + anchor.left,
                    top: slot.y + anchor.top,
                    width: anchor.width,
                    height: anchor.height,
                  },
                ]}
                activeOpacity={1}
                onPress={() => inspectFedAnimal(animal.id)}
              />
            );
          })}

          {foodLayout.map((slot, index) => {
            const food = FOOD_BY_ID[TRAY_ORDER[index]];
            const fed = fedIds.includes(food.id);
            if (fed) return null;
            const disabled = done;
            return (
              <FoodTile
                key={food.id}
                food={food}
                slot={slot}
                size={foodSize}
                disabled={disabled}
                onAttempt={handleAttempt}
                onSpeak={speakFood}
                resetToken={resetToken}
              />
            );
          })}

          {fly ? (
            <FlyingFood
              food={fly.food}
              from={fly.from}
              to={fly.to}
              size={foodSize}
              onDone={handleFlyDone}
            />
          ) : null}

        </View>

      </ImageBackground>
      <PopperCelebration
        visible={showCelebration}
        onComplete={() => { setShowCelebration(false); setShowEndOverlay(true); }}
      />
      {showEndOverlay && (
        <GameEndOverlay onGo={() => { setShowEndOverlay(false); reset({ name: 'Main', tab: 'Games' }); }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#DFF7FF' },
  scene: { flex: 1 },
  // Without an explicit imageStyle, react-native-web can leave the background
  // <img> unsized in some nested-flex layouts, so it falls back to its own
  // huge natural pixel size and only a random cropped sliver shows.
  sceneImage: { width: '100%', height: '100%' },
  sceneWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(40, 24, 12, 0.06)' },
  header: {
    alignSelf: 'center',
    width: '56%',
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.50)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { color: '#0F766E', fontSize: 13, textAlign: 'center' },
  title: { color: '#334155', fontSize: 24, lineHeight: 30, textAlign: 'center' },
  subtitle: { color: '#64748B', fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 4 },
  stage: { flex: 1, position: 'relative', paddingTop: 10, paddingBottom: 10 },
  animalWrap: {
    position: 'absolute',
    width: 110,
    height: 150,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  animalSpot: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  animalSpotGrounded: {
    justifyContent: 'flex-end',
  },
  animalImage: {
    marginTop: -8,
  },
  animalImageGrounded: {
    marginTop: 0,
  },
  animalImageActive: {
    transform: [{ scale: 1.05 }],
  },
  monkeyImage: {
    marginTop: -14,
    marginLeft: 10,
  },
  animalCard: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animalCardActive: {
    transform: [{ scale: 1.06 }],
  },
  animalCardDone: {
    opacity: 1,
  },
  foodTile: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  foodImage: {
    marginTop: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  foodArtBox: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodLabel: {
    marginTop: 12,
    color: '#2F2F2F',
    fontSize: 13,
    textAlign: 'center',
  },
  bananaLabel: {
    marginTop: -8,
  },
  leavesLabel: {
    marginTop: -8,
  },
  carrotLabel: {
    marginTop: 2,
  },
  honeyLabel: {
    marginTop: -12,
  },
  fishLabel: {
    marginTop: 7,
  },
  fedOverlay: {
    position: 'absolute',
  },
  animalFoodOverlay: {
    position: 'absolute',
    zIndex: 40,
    elevation: 40,
  },
  animalFoodOverlayActive: {
    zIndex: 44,
    elevation: 44,
    transform: [{ scale: 1.18 }],
  },
  animalFoodImage: {
    width: '100%',
    height: '100%',
  },
  animalFoodBubble: {
    position: 'absolute',
    top: -30,
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.98)',
  },
  animalFoodBubbleText: {
    fontFamily: ff('fa', 'bold'),
    color: '#0F172A',
    fontSize: 12,
    textAlign: 'center',
  },
  attachedFoodTouch: {
    position: 'absolute',
    zIndex: 50,
    elevation: 50,
  },
  fedFoodImage: {
    width: '100%',
    height: '100%',
  },
  foodTileActive: {
    zIndex: 20,
    elevation: 20,
  },
  foodTileSelected: {
    zIndex: 24,
    elevation: 24,
  },
  foodTitleBubble: {
    position: 'absolute',
    top: -28,
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    opacity: 0,
    transform: [{ scale: 0.92 }],
  },
  foodTitleBubbleVisible: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  foodTitleBubbleText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  flyingFood: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    elevation: 30,
  },
  progressPill: {
    position: 'absolute',
    top: 12,
    right: 16,
    minWidth: 72,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  progressPillWrong: {
    transform: [{ rotate: '-3deg' }],
  },
  progressText: {
    color: '#0F766E',
    fontSize: 14,
    textAlign: 'center',
  },
  doneRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
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
    backgroundColor: '#0EA5E9',
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
