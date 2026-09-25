import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import TopBar from '../components/TopBar';
import { AppContext } from '../store/AppContext';
import { useNav } from '../store/NavContext';
import { ff } from '../theme/fonts';
import { neliWorldAssets } from '../assets/neliWorldAssets';
import { getPaintingColorAudioKey, playFaAudio, speakWithGeneratedVoice } from '../utils/faAudio';
type Point = { x: number; y: number };
type Stroke = { id: number; points: Point[]; color: string; size: number };

type PaintingScene = {
  id: string;
  title: string;
  titleFa: string;
  bg: string;
  thumb: any;
  image: any;
  outline: any;
};

type Crayon = {
  color: string;
  label: string;
  labelFa: string;
  sprite: any;
};

const CRAYONS_FULL: Crayon[] = [
  { color: '#F43F1D', label: 'Red', labelFa: 'قرمز', sprite: require('../../assets/neli-world/painting/crayons/crayon_red.webp') },
  { color: '#FF7A1A', label: 'Orange', labelFa: 'نارنجی', sprite: require('../../assets/neli-world/painting/crayons/crayon_orange.webp') },
  { color: '#FFB020', label: 'Amber', labelFa: 'کهربایی', sprite: require('../../assets/neli-world/painting/crayons/crayon_amber.webp') },
  { color: '#F7E31A', label: 'Yellow', labelFa: 'زرد', sprite: require('../../assets/neli-world/painting/crayons/crayon_yellow.webp') },
  { color: '#8CD62A', label: 'Lime', labelFa: 'لیمویی', sprite: require('../../assets/neli-world/painting/crayons/crayon_lime.webp') },
  { color: '#1FB34A', label: 'Green', labelFa: 'سبز', sprite: require('../../assets/neli-world/painting/crayons/crayon_green.webp') },
  { color: '#20B8C7', label: 'Teal', labelFa: 'سبزآبی', sprite: require('../../assets/neli-world/painting/crayons/crayon_teal.webp') },
  { color: '#4DD0E1', label: 'Aqua', labelFa: 'فیروزه‌ای', sprite: require('../../assets/neli-world/painting/crayons/crayon_aqua.webp') },
  { color: '#1E45D8', label: 'Blue', labelFa: 'آبی', sprite: require('../../assets/neli-world/painting/crayons/crayon_blue.webp') },
  { color: '#4B5CFF', label: 'Indigo', labelFa: 'نیلی', sprite: require('../../assets/neli-world/painting/crayons/crayon_indigo.webp') },
  { color: '#9B30FF', label: 'Purple', labelFa: 'بنفش', sprite: require('../../assets/neli-world/painting/crayons/crayon_purple.webp') },
  { color: '#FF5F7A', label: 'Rose', labelFa: 'رز', sprite: require('../../assets/neli-world/painting/crayons/crayon_rose.webp') },
  { color: '#E91E63', label: 'Pink', labelFa: 'صورتی', sprite: require('../../assets/neli-world/painting/crayons/crayon_pink.webp') },
  { color: '#8D6E63', label: 'Brown', labelFa: 'قهوه‌ای', sprite: require('../../assets/neli-world/painting/crayons/crayon_brown.webp') },
  { color: '#9E9E9E', label: 'Gray', labelFa: 'خاکستری', sprite: require('../../assets/neli-world/painting/crayons/crayon_gray.webp') },
  { color: '#263238', label: 'Black', labelFa: 'مشکی', sprite: require('../../assets/neli-world/painting/crayons/crayon_black.webp') },
];

// Phones in landscape have ~360-440pt of height (the short edge — see
// CLAUDE.md), and 16 crayons packed into that forced crayonColumnHeight's
// 360pt floor down to ~22.5pt of vertical space each, well under the ~44pt
// touch target they need — reported as crayons overlapping with no room to
// tap them individually. Cutting near-duplicate hues down to one
// representative each (Amber/Lime/Teal/Aqua/Indigo/Rose folded into their
// nearest sibling, Gray dropped outright) keeps the same left-to-right
// rainbow order while roughly halving the count, giving each remaining
// crayon comfortable spacing on a short screen. Tablets keep the full set.
const COMPACT_LABELS = new Set(['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Pink', 'Brown', 'Black']);
const CRAYONS_COMPACT: Crayon[] = CRAYONS_FULL.filter(c => COMPACT_LABELS.has(c.label));

const BRUSH_SIZES = [17, 26, 36] as const;
const BRUSH_ICONS = {
  17: require('../../assets/neli-world/painting/brushes/1.webp'),
  26: require('../../assets/neli-world/painting/brushes/2.webp'),
  36: require('../../assets/neli-world/painting/brushes/3.webp'),
} as const;

const PAINT_CARD_BORDERS = [
  '#FF3B86',
  '#FFD400',
  '#56D600',
  '#9B30FF',
  '#FF7A00',
  '#FF4FD8',
  '#FF6B00',
  '#8D6E63',
] as const;

const PAINTINGS: PaintingScene[] = [
  {
    id: '01',
    title: 'Puppy Cycling',
    titleFa: 'توله‌سگ دوچرخه‌سوار',
    bg: '#BFE6FF',
    thumb: require('../../assets/neli-world/painting/thumbs/01_puppy_cycling_in_the_park.webp'),
    image: require('../../assets/neli-world/painting/01_puppy_cycling_in_the_park.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/01_puppy_cycling_in_the_park_outline.webp'),
  },
  {
    id: '02',
    title: 'Playful Mouse',
    titleFa: 'موش بازیگوش',
    bg: '#FFE3F0',
    thumb: require('../../assets/neli-world/painting/thumbs/02_playful_mouse_in_a_park_playground.webp'),
    image: require('../../assets/neli-world/painting/02_playful_mouse_in_a_park_playground.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/02_playful_mouse_in_a_park_playground_outline.webp'),
  },
  {
    id: '03',
    title: 'Underwater Turtle',
    titleFa: 'لاک‌پشت زیر آب',
    bg: '#D8FBFF',
    thumb: require('../../assets/neli-world/painting/thumbs/03_cheerful_underwater_world_with_a_turtle.webp'),
    image: require('../../assets/neli-world/painting/03_cheerful_underwater_world_with_a_turtle.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/03_cheerful_underwater_world_with_a_turtle_outline.webp'),
  },
  {
    id: '04',
    title: 'Dolphin Waves',
    titleFa: 'دلفین و قایق',
    bg: '#D6F0FF',
    thumb: require('../../assets/neli-world/painting/thumbs/04_dolphin_and_sailboat_on_the_waves.webp'),
    image: require('../../assets/neli-world/painting/04_dolphin_and_sailboat_on_the_waves.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/04_dolphin_and_sailboat_on_the_waves_outline.webp'),
  },
  {
    id: '05',
    title: 'Jungle Friends',
    titleFa: 'دوستان جنگل',
    bg: '#DFF7D8',
    thumb: require('../../assets/neli-world/painting/thumbs/05_jungle_friends_in_the_sunshine.webp'),
    image: require('../../assets/neli-world/painting/05_jungle_friends_in_the_sunshine.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/05_jungle_friends_in_the_sunshine_outline.webp'),
  },
  {
    id: '07',
    title: 'Smiling Dinosaur',
    titleFa: 'دایناسور خندان',
    bg: '#E9F4FF',
    thumb: require('../../assets/neli-world/painting/thumbs/07_smiling_dinosaur_in_a_prehistoric_landscape.webp'),
    image: require('../../assets/neli-world/painting/07_smiling_dinosaur_in_a_prehistoric_landscape.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/07_smiling_dinosaur_in_a_prehistoric_landscape_outline.webp'),
  },
  {
    id: '08',
    title: 'Astronaut',
    titleFa: 'فضانورد',
    bg: '#E8E6FF',
    thumb: require('../../assets/neli-world/painting/thumbs/08_astronaut_waving_in_outer_space.webp'),
    image: require('../../assets/neli-world/painting/08_astronaut_waving_in_outer_space.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/08_astronaut_waving_in_outer_space_outline.webp'),
  },
  {
    id: '09',
    title: 'Princess',
    titleFa: 'شاهزاده',
    bg: '#FFE5F3',
    thumb: require('../../assets/neli-world/painting/thumbs/09_princess_waving_in_a_fairy_tale_landscape.webp'),
    image: require('../../assets/neli-world/painting/09_princess_waving_in_a_fairy_tale_landscape.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/09_princess_waving_in_a_fairy_tale_landscape_outline.webp'),
  },
  {
    id: '10',
    title: 'Playful Monkey',
    titleFa: 'میمون بازیگوش',
    bg: '#F2F0C6',
    thumb: require('../../assets/neli-world/painting/thumbs/10_playful_monkey_in_the_jungle.webp'),
    image: require('../../assets/neli-world/painting/10_playful_monkey_in_the_jungle.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/10_playful_monkey_in_the_jungle_outline.webp'),
  },
  {
    id: '11',
    title: 'Lamb Picnic',
    titleFa: 'بره و پیک‌نیک',
    bg: '#FFF1D9',
    thumb: require('../../assets/neli-world/painting/thumbs/11_lamb_s_sunny_day_picnic_reading.webp'),
    image: require('../../assets/neli-world/painting/11_lamb_s_sunny_day_picnic_reading.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/11_lamb_s_sunny_day_picnic_reading_outline.webp'),
  },
  {
    id: '12',
    title: 'Cute Kitten',
    titleFa: 'گربه‌کُرکی',
    bg: '#FFF0FB',
    thumb: require('../../assets/neli-world/painting/thumbs/12_cute_kitten_in_candy_playground.webp'),
    image: require('../../assets/neli-world/painting/12_cute_kitten_in_candy_playground.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/12_cute_kitten_in_candy_playground_outline.webp'),
  },
  {
    id: '13',
    title: 'Owl Teacher',
    titleFa: 'جغد معلم',
    bg: '#F2F4FF',
    thumb: require('../../assets/neli-world/painting/thumbs/13_owl_teacher_in_a_classroom_setting.webp'),
    image: require('../../assets/neli-world/painting/13_owl_teacher_in_a_classroom_setting.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/13_owl_teacher_in_a_classroom_setting_outline.webp'),
  },
  {
    id: '14',
    title: 'Joyful Giraffe',
    titleFa: 'زرافه شاد',
    bg: '#FFF2D2',
    thumb: require('../../assets/neli-world/painting/thumbs/14_joyful_giraffe_in_a_sunny_savanna.webp'),
    image: require('../../assets/neli-world/painting/14_joyful_giraffe_in_a_sunny_savanna.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/14_joyful_giraffe_in_a_sunny_savanna_outline.webp'),
  },
  {
    id: '15',
    title: 'Animal Friends',
    titleFa: 'دوستان حیوانات',
    bg: '#EAF9FF',
    thumb: require('../../assets/neli-world/painting/thumbs/15_animal_friends_in_the_park.webp'),
    image: require('../../assets/neli-world/painting/15_animal_friends_in_the_park.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/15_animal_friends_in_the_park_outline.webp'),
  },
  {
    id: '16',
    title: 'Octopus Friends',
    titleFa: 'اختاپوس و دوستان',
    bg: '#DDFBFF',
    thumb: require('../../assets/neli-world/painting/thumbs/16_happy_octopus_and_underwater_friends.webp'),
    image: require('../../assets/neli-world/painting/16_happy_octopus_and_underwater_friends.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/16_happy_octopus_and_underwater_friends_outline.webp'),
  },
  {
    id: '17',
    title: 'Jungle Swing',
    titleFa: 'تاب جنگلی',
    bg: '#E4F8D7',
    thumb: require('../../assets/neli-world/painting/thumbs/17_jungle_friends_in_a_playful_swing.webp'),
    image: require('../../assets/neli-world/painting/17_jungle_friends_in_a_playful_swing.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/17_jungle_friends_in_a_playful_swing_outline.webp'),
  },
  {
    id: '18',
    title: 'Farm Animals',
    titleFa: 'حیوانات مزرعه',
    bg: '#FFF6D8',
    thumb: require('../../assets/neli-world/painting/thumbs/18_cheerful_farm_animals_in_a_playful_scene.webp'),
    image: require('../../assets/neli-world/painting/18_cheerful_farm_animals_in_a_playful_scene.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/18_cheerful_farm_animals_in_a_playful_scene_outline.webp'),
  },
  {
    id: '19',
    title: 'Owl Astronaut',
    titleFa: 'جغد فضانورد',
    bg: '#EAE6FF',
    thumb: require('../../assets/neli-world/painting/thumbs/19_owl_astronaut_explores_outer_space.webp'),
    image: require('../../assets/neli-world/painting/19_owl_astronaut_explores_outer_space.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/19_owl_astronaut_explores_outer_space_outline.webp'),
  },
  {
    id: '20',
    title: 'Castle Garden',
    titleFa: 'باغ قلعه',
    bg: '#FFE8F2',
    thumb: require('../../assets/neli-world/painting/thumbs/20_princess_and_friends_in_the_castle_garden.webp'),
    image: require('../../assets/neli-world/painting/20_princess_and_friends_in_the_castle_garden.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/20_princess_and_friends_in_the_castle_garden_outline.webp'),
  },
  {
    id: '21',
    title: 'Lamb Meadow',
    titleFa: 'بره در چمنزار',
    bg: '#F4FCE8',
    thumb: require('../../assets/neli-world/painting/thumbs/01_lamb_reading_in_sunny_meadow.webp'),
    image: require('../../assets/neli-world/painting/01_lamb_reading_in_sunny_meadow.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/01_lamb_reading_in_sunny_meadow_outline.webp'),
  },
  {
    id: '22',
    title: 'Cute Kitty',
    titleFa: 'گربه ناز',
    bg: '#FFF0F8',
    thumb: require('../../assets/neli-world/painting/thumbs/02_cheerful_kitty_candy_playground.webp'),
    image: require('../../assets/neli-world/painting/02_cheerful_kitty_candy_playground.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/02_cheerful_kitty_candy_playground_outline.webp'),
  },
  {
    id: '23',
    title: 'Owl Classroom',
    titleFa: 'جغد کلاس',
    bg: '#EEF3FF',
    thumb: require('../../assets/neli-world/painting/thumbs/03_owl_teacher_classroom.webp'),
    image: require('../../assets/neli-world/painting/03_owl_teacher_classroom.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/03_owl_teacher_classroom_outline.webp'),
  },
  {
    id: '24',
    title: 'Savanna Giraffe',
    titleFa: 'زرافه ساوانا',
    bg: '#FFF4D8',
    thumb: require('../../assets/neli-world/painting/thumbs/04_cheerful_giraffe_savanna.webp'),
    image: require('../../assets/neli-world/painting/04_cheerful_giraffe_savanna.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/04_cheerful_giraffe_savanna_outline.webp'),
  },
  {
    id: '25',
    title: 'Teddy Bear',
    titleFa: 'خرس عروسکی',
    bg: '#FFF0E0',
    thumb: require('../../assets/neli-world/painting/thumbs/05_teddy_bear_in_park.webp'),
    image: require('../../assets/neli-world/painting/05_teddy_bear_in_park.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/05_teddy_bear_in_park_outline.webp'),
  },
  {
    id: '26',
    title: 'Smiling Fish',
    titleFa: 'ماهی خندان',
    bg: '#E3FBFF',
    thumb: require('../../assets/neli-world/painting/thumbs/06_smiling_fish_underwater.webp'),
    image: require('../../assets/neli-world/painting/06_smiling_fish_underwater.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/06_smiling_fish_underwater_outline.webp'),
  },
  {
    id: '27',
    title: 'Happy Bunny',
    titleFa: 'خرگوش شاد',
    bg: '#F5FFE8',
    thumb: require('../../assets/neli-world/painting/thumbs/07_happy_bunny_garden.webp'),
    image: require('../../assets/neli-world/painting/07_happy_bunny_garden.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/07_happy_bunny_garden_outline.webp'),
  },
  {
    id: '28',
    title: 'Dino Tropical',
    titleFa: 'دایناسور گرمسیری',
    bg: '#E8FFF5',
    thumb: require('../../assets/neli-world/painting/thumbs/08_cute_dinosaur_tropical.webp'),
    image: require('../../assets/neli-world/painting/08_cute_dinosaur_tropical.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/08_cute_dinosaur_tropical_outline.webp'),
  },
  {
    id: '29',
    title: 'Rocket Space',
    titleFa: 'راکت فضایی',
    bg: '#ECEBFF',
    thumb: require('../../assets/neli-world/painting/thumbs/09_rocket_in_space.webp'),
    image: require('../../assets/neli-world/painting/09_rocket_in_space.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/09_rocket_in_space_outline.webp'),
  },
  {
    id: '30',
    title: 'Animal Park',
    titleFa: 'حیوانات پارک',
    bg: '#E9FFF3',
    thumb: require('../../assets/neli-world/painting/thumbs/10_animal_friends_in_park.webp'),
    image: require('../../assets/neli-world/painting/10_animal_friends_in_park.webp'),
    outline: require('../../assets/neli-world/painting/line-overlays/10_animal_friends_in_park_outline.webp'),
  },
];

const SIMPLE_PAINTING_IDS = new Set(['21', '25', '26', '27', '29', '24', '28', '22', '23', '30']);
const ORDERED_PAINTINGS = [...PAINTINGS].sort((a, b) => {
  const aSimple = SIMPLE_PAINTING_IDS.has(a.id);
  const bSimple = SIMPLE_PAINTING_IDS.has(b.id);
  if (aSimple !== bSimple) return aSimple ? -1 : 1;
  return Number(a.id) - Number(b.id);
});

// Only the first N paintings (in ORDERED_PAINTINGS order) show in the picker
// for now — the rest are saved for a future version. Raise this number (or
// remove the slice(0, VISIBLE_PAINTING_COUNT) below) to bring them back;
// nothing else needs to change, every painting is still fully in PAINTINGS.
const VISIBLE_PAINTING_COUNT = 8;

function pathFromPoints(points: Point[] | undefined) {
  // Confirmed via a captured device stack trace: this was the exact crash
  // site behind a reported white screen — a stroke in `strokes` whose
  // `.points` was undefined threw "Cannot read property 'length' of
  // undefined" here, unmounting the whole tree (this screen has no error
  // boundary of its own; App.tsx's root one now catches it, but this is the
  // actual fix). paintAt() builds every stroke so it always has `.points`,
  // but this guard is the direct fix for the confirmed crash line,
  // independent of how a stroke got here.
  if (!points || !points.length) return '';
  const [first, ...rest] = points;
  return `M ${first.x.toFixed(1)} ${first.y.toFixed(1)} ${rest.map(pt => `L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ')}`;
}

function CrayonButton({
  color,
  selected,
  onPress,
  index,
  total,
  top,
  height,
  sprite,
}: {
  color: string;
  selected: boolean;
  onPress: () => void;
  index: number;
  total: number;
  top: number;
  height: number;
  sprite: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      // The crayon rail's own visible/touchable area is clipped (by
      // paintStage's overflow:hidden) to roughly x:0–106. This hitSlop
      // extends the tappable area to x=138 to cover the crayon's visible
      // tip, right at that boundary — isControlArea/paintBounds's leftGap
      // (140) is set just past this reach on purpose, so the canvas never
      // becomes paintable inside a crayon's hitSlop. If this right value
      // ever changes, bump leftGap in both those places to match.
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 32 }}
      style={[
        styles.crayonTap,
        { top, zIndex: selected ? 999 : total - index, height },
        selected && styles.crayonTapSelected,
      ]}
    >
      <Image
        source={sprite}
        resizeMode="contain"
        style={styles.crayonImage}
      />
    </TouchableOpacity>
  );
}

function BrushSizeButton({
  size,
  selected,
  onPress,
  iconSource,
}: {
  size: number;
  selected: boolean;
  onPress: () => void;
  iconSource: any;
}) {
  const iconScale = size === 17 ? 1.0 : size === 26 ? 1.24 : 1.16;
  const iconRightMargin = size === 36 ? 12 : 0;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[styles.brushSizeBtn, selected && styles.brushSizeBtnSelected]}
    >
      {selected ? <View style={styles.brushSelectedHalo} /> : null}
      <Image
        source={iconSource}
        style={[
          styles.brushIcon,
          {
            marginRight: iconRightMargin,
            transform: [{ rotate: '180deg' }, { scale: iconScale }],
          },
        ]}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
}

function CuteActionButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.92} style={styles.cuteActionBtn}>
      <Text style={styles.cuteActionText}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ColoringScreen() {
  const { lang } = useContext(AppContext);
  const { reset } = useNav();
  const { width, height } = useWindowDimensions();
  const isFa = lang === 'fa' || lang === 'ar';
  // Landscape-locked screen, so height is the short edge (see CLAUDE.md's
  // TABLET_MIN_EDGE convention) — a phone gets the trimmed crayon list so
  // each one has room to be tapped; a tablet has the height for all 16.
  const isPhone = height < 600;
  const CRAYONS = isPhone ? CRAYONS_COMPACT : CRAYONS_FULL;

  const [mode, setMode] = useState<'pick' | 'paint'>('pick');
  const [sceneIdx, setSceneIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState(CRAYONS[0].color);
  const [brushSize, setBrushSize] = useState<typeof BRUSH_SIZES[number]>(BRUSH_SIZES[1]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [pointer, setPointer] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 });
  const [stageSize, setStageSize] = useState({
    w: Math.max(width - 12, 320),
    h: Math.max(height - 120, 360),
  });
  // evt.nativeEvent.locationX/Y are relative to whichever view is CURRENTLY
  // handling the touch — and that can change mid-gesture near a boundary
  // between sibling views (the crayon rail vs. the canvas), causing the
  // reported x/y to suddenly jump by the offset between those views'
  // coordinate spaces. Reported as a stray line appearing near the canvas
  // edge, and as the drawn point not tracking the finger. pageX/pageY are
  // screen-absolute and never jump, so onPanResponderMove (below) uses
  // those instead — converted to a paintStage-local coordinate via
  // stageOrigin. gestureState.x0/y0/moveX/moveY are DOCUMENTED as
  // screen-absolute too, and behave that way on iOS, but on Android they
  // can come back relative to whichever nested view first claimed the
  // touch instead of the window (a long-standing RN/Android PanResponder
  // inconsistency) — reported as the pointer tracking correctly on iPhone
  // but drifting on Android. pageX/pageY don't have that platform split.
  //
  // stageOrigin itself is NOT measured via measureInWindow. Confirmed live
  // on an edge-to-edge Android device (this app has edgeToEdgeEnabled):
  // measureInWindow's y for paintStage and pageY's own origin disagree by
  // exactly the status bar's height (45px measured, 44-45px is what
  // `adb shell dumpsys window displays` reports for statusBars on that
  // device) — a fixed, deterministic mismatch between the two APIs'
  // coordinate spaces under edge-to-edge, not a timing/staleness issue (it
  // reproduced identically however soon after mount it was measured).
  // Instead, stageOrigin is CALIBRATED from a real touch: at gesture start,
  // locationX/Y (reliable at touch-DOWN, before any jump can happen) and
  // pageX/Y are read from the very same event, so their difference is each
  // API's own origin relative to the other — correct regardless of what
  // either one measures from independently.
  const stageOrigin = useRef({ x: 0, y: 0 });
  // Only ever holds an id (or null) — never a stroke object. Earlier
  // versions of this code kept the in-progress stroke as a mutable object on
  // this ref, shared/aliased with the copy living in `strokes` state; that
  // caused strokes to intermittently lose their data (fields coming back
  // undefined) or vanish entirely on touch release, confirmed via a live
  // device log showing a stroke's own properties wiped without the array
  // shrinking. Keeping only an id here means the ref can never alias
  // anything React re-renders from — all stroke data lives exclusively in
  // `strokes` state, read and written only through functional setState
  // updates.
  const activeStrokeId = useRef<number | null>(null);
  const nextStrokeId = useRef(0);
  const selectedColorRef = useRef(selectedColor);
  const brushSizeRef = useRef(brushSize);

  const scene = ORDERED_PAINTINGS[sceneIdx];
  const canvasWidth = stageSize.w;
  const canvasHeight = stageSize.h;
  // On native, require() gives a numeric asset id that needs resolving to
  // {uri, width, height}. On web, Metro's asset transform already returns
  // that resolved object directly — and react-native-web's Image doesn't
  // implement resolveAssetSource at all, so calling it unconditionally
  // crashed this screen on every web render (blank/black screen).
  const sceneSource = typeof scene.image === 'number' ? Image.resolveAssetSource(scene.image) : scene.image;
  const paintBounds = useMemo(() => {
    // Must stay >= the crayon rail's effective touch reach (visible rail
    // extends to x=106, plus CrayonButton's own right hitSlop of 32 = 138)
    // — see isControlArea's leftGap below, which needs the same value. Set
    // lower than that and the canvas becomes paintable inside the crayons'
    // hitSlop, so a tap near a crayon's tip races between selecting the
    // crayon and starting a paint stroke instead — reported as crayon taps
    // intermittently not registering.
    const leftGap = 140;
    const rightGap = 124;
    const sourceW = sceneSource.width || 1;
    const sourceH = sceneSource.height || 1;
    const availableW = Math.max(canvasWidth - leftGap - rightGap, 1);
    const availableH = canvasHeight;
    const scale = Math.min(availableW / sourceW, availableH / sourceH);
    const imageW = sourceW * scale;
    const imageH = sourceH * scale;
    const left = leftGap + (availableW - imageW) / 2;
    const top = (canvasHeight - imageH) / 2;
    return {
      left,
      top,
      right: left + imageW,
      bottom: top + imageH,
    };
  }, [canvasHeight, canvasWidth, sceneSource.height, sceneSource.width]);
  const railTop = Math.max(8, Math.round(canvasHeight * 0.02));
  const actionRailTop = Math.max(8, Math.round(canvasHeight * 0.5 - 52));
  const crayonColumnHeight = Math.max(canvasHeight - railTop * 2, 360);
  const crayonRowStep = crayonColumnHeight / CRAYONS.length;
  const crayonTapHeight = Math.max(Math.round(crayonRowStep), 32);

  useEffect(() => {
    selectedColorRef.current = selectedColor;
  }, [selectedColor]);

  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);

  useEffect(() => {
    setSelectedColor(CRAYONS[0].color);
    setBrushSize(BRUSH_SIZES[1]);
  }, [scene.id]);

  const clearPainting = useCallback(() => {
    setStrokes([]);
    activeStrokeId.current = null;
    setPointer(prev => ({ ...prev, visible: false }));
  }, []);
  const speakCrayon = useCallback((crayon: Crayon) => {
    if (isFa) {
      const audioKey = getPaintingColorAudioKey(crayon.label);
      if (audioKey) { void playFaAudio(audioKey); return; }
    }
    const text = isFa ? crayon.labelFa : crayon.label;
    void speakWithGeneratedVoice(text, isFa ? 'fa-IR' : 'en-US', {
      interrupt: true,
      rate: 0.9,
      pitch: isFa ? 1.15 : 1.05,
    });
  }, [isFa]);

  const selectCrayon = useCallback((crayon: Crayon) => {
    setSelectedColor(crayon.color);
    selectedColorRef.current = crayon.color;
    activeStrokeId.current = null;
    setPointer(prev => ({ ...prev, visible: false }));
    speakCrayon(crayon);
  }, [speakCrayon]);

  const openScene = useCallback(
    (index: number) => {
      setSceneIdx(index);
      setMode('paint');
      clearPainting();
    },
    [clearPainting],
  );

  const closeGallery = useCallback(() => {
    reset({ name: 'Home' });
  }, [reset]);

  const closePainting = useCallback(() => {
    activeStrokeId.current = null;
    setPointer(prev => ({ ...prev, visible: false }));
    setMode('pick');
  }, []);

  const isControlArea = useCallback(
    (x: number, y: number) => {
      // Keep in sync with paintBounds's leftGap above — both must agree on
      // where the crayon rail's touch reach ends and the canvas begins.
      const leftGap = 140;
      const rightGap = 124;
      if (x < leftGap) return true;
      if (x > canvasWidth - rightGap) return true;
      return false;
    },
    [canvasWidth],
  );

  const isPaintablePoint = useCallback(
    (x: number, y: number) =>
      x >= paintBounds.left &&
      x <= paintBounds.right &&
      y >= paintBounds.top &&
      y <= paintBounds.bottom,
    [paintBounds.bottom, paintBounds.left, paintBounds.right, paintBounds.top],
  );

  const paintAt = useCallback(
    (px: number, py: number) => {
      const localX = px;
      const localY = py;
      if (localX < 0 || localY < 0 || localX > canvasWidth || localY > canvasHeight) return;
      if (!isPaintablePoint(localX, localY)) return;

      setPointer({ visible: true, x: localX, y: localY });

      if (activeStrokeId.current == null) {
        const id = nextStrokeId.current++;
        activeStrokeId.current = id;
        const stroke: Stroke = {
          id,
          points: [{ x: localX, y: localY }],
          color: selectedColorRef.current,
          size: brushSizeRef.current,
        };
        setStrokes(prev => [...prev, stroke]);
        // Reported to crash the app on both iOS and Android as soon as the
        // user starts dragging to paint — this is the only native-module
        // call in that immediate touch-start path, and unlike every other
        // Haptics call in this codebase (which fire from a plain onPress),
        // this one fires synchronously from inside PanResponder's gesture
        // callback. setTimeout moves it off that callback onto a normal task,
        // and try/catch means a failed buzz never takes the screen down.
        setTimeout(() => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {
            // ignore
          }
        }, 0);
        return;
      }

      // Reads and writes strokes only through this functional update — never
      // through an external ref — so there is nothing here that can go stale
      // or get aliased between renders. See the comment on activeStrokeId.
      setStrokes(prev => {
        const idx = prev.findIndex(s => s.id === activeStrokeId.current);
        if (idx === -1) return prev;
        const stroke = prev[idx]!;
        const last = stroke.points.length ? stroke.points[stroke.points.length - 1]! : undefined;
        if (last && Math.hypot(localX - last.x, localY - last.y) < 1.5) return prev;
        const next = [...prev];
        next[idx] = { ...stroke, points: [...stroke.points, { x: localX, y: localY }] };
        return next;
      });
    },
    [canvasHeight, canvasWidth, isPaintablePoint],
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        // No *Capture handlers here on purpose. The crayon buttons and the
        // Clear/Pages buttons are children of this same View (the crayon
        // rail sits inside paintStage), and Capture-phase handlers run
        // before any descendant gets a chance to claim the touch itself —
        // they "cut in line" ahead of the crayons' own TouchableOpacity
        // responder negotiation. Reported as crayon taps intermittently not
        // registering; the non-Capture variants below only claim the
        // responder for a touch a child didn't already want, which is the
        // standard-recommended shape for a PanResponder that wraps touchable
        // children instead of covering the whole screen.
        onStartShouldSetPanResponder: evt => {
          // locationX/Y at touch-DOWN is reliable (the view-jump bug this
          // screen works around only happens mid-gesture, crossing between
          // sibling views during a MOVE) and needs no calibration, unlike
          // pageX/Y which needs stageOrigin — see the field's own comment.
          const { locationX: x, locationY: y } = evt.nativeEvent;
          return mode === 'paint' && isPaintablePoint(x, y) && !isControlArea(x, y);
        },
        onMoveShouldSetPanResponder: evt => {
          const x = evt.nativeEvent.pageX - stageOrigin.current.x;
          const y = evt.nativeEvent.pageY - stageOrigin.current.y;
          return mode === 'paint' && isPaintablePoint(x, y) && !isControlArea(x, y);
        },
        onPanResponderGrant: evt => {
          const { locationX: x, locationY: y, pageX, pageY } = evt.nativeEvent;
          // Calibrate stageOrigin from this same touch: locationX/Y and
          // pageX/Y both describe the same physical point, so their
          // difference is pageX/Y's origin relative to paintStage —
          // correct by construction, whatever either API measures from
          // internally. Used by onPanResponderMove for the rest of this
          // gesture, where locationX/Y itself can no longer be trusted.
          stageOrigin.current = { x: pageX - x, y: pageY - y };
          if (isControlArea(x, y) || !isPaintablePoint(x, y)) {
            return;
          }
          activeStrokeId.current = null;
          paintAt(x, y);
        },
        onPanResponderMove: evt => {
          const x = evt.nativeEvent.pageX - stageOrigin.current.x;
          const y = evt.nativeEvent.pageY - stageOrigin.current.y;
          if (isControlArea(x, y) || !isPaintablePoint(x, y)) {
            return;
          }
          paintAt(x, y);
        },
        onPanResponderRelease: () => {
          activeStrokeId.current = null;
          setPointer(prev => ({ ...prev, visible: false }));
        },
        onPanResponderTerminate: () => {
          activeStrokeId.current = null;
          setPointer(prev => ({ ...prev, visible: false }));
        },
      }),
    [isControlArea, isPaintablePoint, mode, paintAt],
  );

  if (mode === 'pick') {
    return (
      <View style={[styles.root, { backgroundColor: '#18D8CE' }]}>
        <TopBar title="Painting" titleFa="نقاشی" showClose dark onBack={closeGallery} />
        <ScrollView contentContainerStyle={styles.gallery} showsVerticalScrollIndicator={false}>
          {ORDERED_PAINTINGS.slice(0, VISIBLE_PAINTING_COUNT).map((item, index) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.9}
              onPress={() => openScene(index)}
              style={[styles.paintCard, { borderColor: PAINT_CARD_BORDERS[index % PAINT_CARD_BORDERS.length] }]}
            >
              <View style={styles.paintCardImageWrap}>
                <Image
                  source={item.thumb}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: '#18D8CE' }]}>
      <TopBar title="Painting" titleFa="نقاشی" showClose dark onBack={closePainting} />

      <View style={styles.paintStageOuter}>
        <View
          style={styles.paintStage}
          {...pan.panHandlers}
          onLayout={event => {
            const { width: w, height: h } = event.nativeEvent.layout;
            if (w > 0 && h > 0) {
              setStageSize({ w, h });
            }
          }}
        >
          <View
            pointerEvents="none"
            style={[
              styles.paintPaperWrap,
              {
                left: paintBounds.left,
                top: paintBounds.top,
                width: paintBounds.right - paintBounds.left,
                height: paintBounds.bottom - paintBounds.top,
              },
            ]}
          >
            <View style={styles.paintPaper} />
          </View>

          <View
            style={[styles.crayonRail, { top: railTop, height: crayonColumnHeight, left: -84 }]}
            pointerEvents="box-none"
          >
            <View style={[styles.crayonPack, { height: crayonColumnHeight }]}>
              {CRAYONS.map((crayon, index) => (
                <CrayonButton
                  key={crayon.color}
                  color={crayon.color}
                  selected={selectedColor === crayon.color}
                  index={index}
                  total={CRAYONS.length}
                  top={index * crayonRowStep}
                  height={crayonTapHeight}
                  sprite={crayon.sprite}
                  onPress={() => selectCrayon(crayon)}
                />
              ))}
            </View>
          </View>

          <View style={[styles.rightActionRail, { top: actionRailTop }]} pointerEvents="box-none">
            <CuteActionButton label={isFa ? 'پاک کن' : 'Clear'} onPress={clearPainting} />
            <CuteActionButton label={isFa ? 'صفحه‌ها' : 'Pages'} onPress={() => setMode('pick')} />
          </View>

          <Svg width={canvasWidth} height={canvasHeight} style={StyleSheet.absoluteFill} pointerEvents="none">
            {strokes.map(stroke => {
              const d = pathFromPoints(stroke.points);
              if (!d) return null;
              return (
                <Path
                  key={stroke.id}
                  d={d}
                  stroke={stroke.color}
                  strokeWidth={Math.max(stroke.size * 0.72, 5)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={0.95}
                />
              );
            })}
          </Svg>

          <View
            pointerEvents="none"
            style={[
              styles.paintOutlineWrap,
              {
                left: paintBounds.left,
                top: paintBounds.top,
                width: paintBounds.right - paintBounds.left,
                height: paintBounds.bottom - paintBounds.top,
              },
            ]}
          >
            <Image source={scene.outline} style={styles.paintOutlineImage} resizeMode="contain" />
          </View>

          {pointer.visible ? (
            <View
              pointerEvents="none"
              style={[
                styles.pointerBrush,
                {
                  left: pointer.x - brushSize * 0.42,
                  top: pointer.y - brushSize * 0.9,
                  width: brushSize * 1.74,
                  height: brushSize * 1.74,
                },
              ]}
            >
              <Image source={neliWorldAssets.ui.paintbrush} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            </View>
          ) : null}

        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gallery: {
    paddingHorizontal: 10,
    paddingBottom: 22,
    paddingTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  paintCard: {
    width: '23.5%',
    height: 226,
    borderRadius: 26,
    marginBottom: 10,
    padding: 0,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#170736',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    borderWidth: 6,
    borderColor: '#FFFFFF',
  },
  paintCardImageWrap: {
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  paintCardImage: {
    width: '100%',
    height: '100%',
  },
  paintStageOuter: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  paintStage: {
    flex: 1,
    width: '100%',
    position: 'relative',
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowOpacity: 0,
    elevation: 0,
  },
  paintPaperWrap: {
    position: 'absolute',
    zIndex: 0,
  },
  paintPaper: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  paintOutlineWrap: {
    position: 'absolute',
    zIndex: 3,
  },
  paintOutlineImage: {
    width: '100%',
    height: '100%',
  },
  brushSizeRail: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 0,
    width: 72,
  },
  brushSizeBtn: {
    width: 72,
    height: 52,
    borderRadius: 0,
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    borderWidth: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  brushSizeBtnSelected: {
    transform: [{ translateY: 1 }, { scale: 1.01 }],
  },
  brushSelectedHalo: {
    position: 'absolute',
    width: 118,
    height: 88,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.68)',
    zIndex: 0,
  },
  brushIcon: {
    width: '160%',
    height: '160%',
    zIndex: 1,
  },
  crayonRail: {
    position: 'absolute',
    zIndex: 9,
  },
  crayonPack: {
    width: 190,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    backgroundColor: 'transparent',
  },
  crayonTap: {
    position: 'absolute',
    width: 190,
    left: 0,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  crayonTapSelected: {
    transform: [{ translateX: 12 }],
    shadowColor: '#173A6E',
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  crayonImage: {
    width: '100%',
    height: '100%',
  },
  rightToolRail: {
    position: 'absolute',
    right: 18,
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
    width: 72,
  },
  rightActionRail: {
    position: 'absolute',
    right: 18,
    width: 124,
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  pointerBrush: {
    position: 'absolute',
    zIndex: 10,
    transform: [{ rotate: '-10deg' }],
  },
  cuteActionBtn: {
    width: 122,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: '#2D1B69',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cuteActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: ff('fa', 'bold'),
  },
});
