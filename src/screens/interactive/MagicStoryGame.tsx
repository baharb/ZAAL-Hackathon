// Magic Story — the room becomes the storybook. The child photographs
// their room, Neli (Muse Spark, multimodal, through the Supabase Edge
// Function) recognizes the objects in it, and every recognized thing
// becomes a cartoon sticker from the app's own art library. Or the child
// draws on the tablet instead: the drawing is repainted as a real cartoon
// by Meta's image model (Edge Function `cartoon` — same model also
// repaints photos) and stars as the hero. Those stickers star in a REAL
// 6-line storybook — who/where, one small happy problem solved together,
// happy ending — plus a recap page with the lesson learned. A non-reader
// follows the pictures;
// a guiding hand appears if she sits on a page. The only spoken word is a
// recorded one (iPhones have no Persian voice). Room photos live in
// session state only — processed and discarded, like Photo Farsi. A
// drawing sent for cartooning is processed and discarded too, never stored.

import React, { useEffect, useId, useRef, useState } from 'react';
import { Animated, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Defs, ClipPath, Circle, Image as SvgImage, Path, Pattern, Rect, Svg } from 'react-native-svg';
import { useWindowDimensions } from '../../layout/PortraitFallback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNav } from '../../store/NavContext';
import { dir, ff } from '../../theme/fonts';
import { FA_TEST_AUDIO, FaTestAudioKey } from '../../assets/faTestAudio.generated';
import { playFaAudio, stopFaAudio } from '../../utils/faAudio';
import { askCartoon, askIllustration, askMeta } from '../../services/metaAI';
import { DrawStroke, drawingToPngBase64 } from '../../utils/drawingPng';
import { roomBackgroundPickers, neliWorldAssets } from '../../assets/neliWorldAssets';
import { STORY_FOCUS_WORDS, STORY_PLACES, StoryFocus, fallbackStory, validStoryLines } from '../../data/magicStory';
import { ROOM_ITEMS, RecognizedWord, RoomItem, matchRoomItem } from '../../data/roomItems';
import { BUDDIES, BuddyId, loadBuddy } from '../../quest/buddyStore';
import { saveMyDay } from '../../quest/myDaysStore';
import { buddyPose } from '../../quest/questTheme';
import {
  BuddyGuide,
  BuddyMood,
  CandyButton,
  CloseButton,
  GameBg,
  PLAY_ACCENTS,
  PLAY_INK,
  SoftShadow,
  WORD_ART,
  WordArt,
} from '../../ui/playKit';
import PopperCelebration from '../../components/PopperCelebration';
import TopBar, { topBarHeight } from '../../components/TopBar';

// Everything scales from a 400pt-tall reference (a landscape phone is
// 360–440pt tall). k multiplies every size AND offset — see CLAUDE.md.
const REFERENCE_H = 400;
const MAX_PHOTO_BASE64_CHARS = 5_000_000;

function tap() {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // haptics are best-effort (web has none)
  }
}

export type StoryCastMember = { item: RoomItem; fa: string; en: string; heroUri?: string };

/** The child's own drawing as a cast member: catalog-shaped (so the story
 * pipeline accepts it) but painted with the AI cartoon, not catalog art. */
const DRAW_ITEM: RoomItem = { id: 'mydrawing', fa: ['نقاشی'], en: ['drawing', 'painting'], art: null };

/** Fat finger-friendly crayons for the drawing paper. */
const DRAW_CRAYONS = ['#E63B3B', '#FF8A00', '#FFD93B', '#2FBF6B', '#2B7FFF', '#9B4DFF', '#5B3A29', '#222222'];
const DRAW_WIDTHS = [0.016, 0.03];

/** Catalog ids that are animals — only these can be the tale's friend. */
const ANIMAL_IDS = new Set([
  'fish', 'chick', 'bee', 'parrot', 'frog', 'elephant', 'jellyfish',
  'cat', 'monkey', 'bear', 'panda', 'rabbit',
]);

/** Fallback friends (all have art) when the room shows no animal. */
const DEFAULT_FRIEND_IDS = ['bear', 'rabbit', 'cat'];

function roomItemById(id: string): RoomItem | undefined {
  return ROOM_ITEMS.find(r => r.id === id);
}

function parseItems(text: string): RecognizedWord[] | null {
  const clean = (text ?? '').replace(/```json|```/g, '');
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const obj = JSON.parse(match[0]);
      if (Array.isArray(obj.items)) {
        const items = obj.items
          .filter((w: unknown) => typeof w === 'object' && w !== null)
          .map((w: any) => ({
            fa: typeof w.fa === 'string' ? w.fa.trim().slice(0, 24) : '',
            en: typeof w.en === 'string' ? w.en.trim().slice(0, 24) : '',
          }))
          .filter((w: RecognizedWord) => w.fa.length > 0 && w.en.length > 0)
          .slice(0, 8);
        if (items.length > 0) return items;
      }
    } catch { /* fall through to salvage below */ }
  }
  // Salvage: the model chatted instead of sending JSON. Any catalog word
  // it mentioned becomes a cast member under its catalog name.
  const lower = clean.toLowerCase();
  const found: RecognizedWord[] = [];
  for (const item of ROOM_ITEMS) {
    if (found.length >= 8) break;
    if (item.en.some(k => new RegExp(`\\b${k}\\b`).test(lower))) {
      found.push({ fa: item.fa[0]!, en: item.id });
    }
  }
  return found.length > 0 ? found : null;
}

export type StoryText = { title: string; lines: string[]; recap: string; lesson: string; scenes?: string[] };

function parseStory(text: string): StoryText | null {
  const clean = (text ?? '').replace(/```json|```/g, '');
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const obj = JSON.parse(match[0]);
      const ls = Array.isArray(obj.lines)
        ? obj.lines.filter((l: unknown) => typeof l === 'string').map((l: string) => l.slice(0, 80))
        : [];
      const title = typeof obj.title === 'string' ? obj.title.slice(0, 50).trim() : '';
      const recap = typeof obj.recap === 'string' ? obj.recap.slice(0, 140).trim() : '';
      const lesson = typeof obj.lesson === 'string' ? obj.lesson.slice(0, 90).trim() : '';
      const scenes = Array.isArray(obj.scenes)
        ? obj.scenes.filter((s: unknown) => typeof s === 'string').map((s: string) => s.trim().slice(0, 160))
        : [];
      // The gate: exactly 8 clean lines plus a real title, recap
      // and lesson — anything else goes back for one retry, then fallback.
      if (validStoryLines(ls) && title && recap && lesson) {
        return { title, lines: ls, recap, lesson, scenes: scenes.length === ls.length ? scenes : undefined };
      }
      return null;
    } catch { /* fall through to salvage below */ }
  }
  // Salvage: Farsi-looking lines, still through the same gate.
  const faRange = new RegExp('[\\u0600-\\u06FF]');
  const seen = new Set<string>();
  const ls = clean
    .split('\n')
    .map(l => l.replace(/^[\s*#\-–—\d.)\]]+/, '').replace(/["*]/g, '').trim())
    .filter(l => l.length > 0 && l.length <= 80 && faRange.test(l))
    .filter(l => (seen.has(l) ? false : (seen.add(l), true)))
    .slice(0, 8);
  if (!validStoryLines(ls)) return null;
  return { title: '', lines: ls, recap: '', lesson: '' };
}

/** The room photo as a comic-print cartoon: circular die-cut plus a
 * halftone dot overlay — the printed-comic look, built only from shapes
 * and clipping that render identically on every phone (SVG filters are
 * not implemented on native, so they are deliberately not used here). */
function ToonPhoto({ uri, size }: { uri: string; size: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const clipId = `clip${uid}`;
  const dotsId = `dots${uid}`;
  const r = size / 2;
  const du = size / 48;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <ClipPath id={clipId}>
          <Circle cx={r} cy={r} r={r} />
        </ClipPath>
        <Pattern id={dotsId} width={4 * du} height={4 * du} patternUnits="userSpaceOnUse">
          <Circle cx={2 * du} cy={2 * du} r={0.7 * du} fill="#1E1B4B" opacity={0.22} />
        </Pattern>
      </Defs>
      <SvgImage
        href={{ uri }}
        x={0}
        y={0}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${clipId})`}
      />
      <Rect x={0} y={0} width={size} height={size} fill={`url(#${dotsId})`} clipPath={`url(#${clipId})`} />
    </Svg>
  );
}

/** White die-cut frame + glossy shine + playful tilt: whatever sits
 * inside reads as a sticker, photo or catalog art alike. */
function StickerFrame({ size, tilt = -6, children }: { size: number; tilt?: number; children: React.ReactNode }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        transform: [{ rotate: `${tilt}deg` }],
        shadowColor: 'rgba(30,20,60,0.45)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 6,
        elevation: 6,
      }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#F3EDFF',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Comic-print mat: a dotted ring behind the picture, no filters. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: size * 0.06,
            top: size * 0.06,
            width: size * 0.88,
            height: size * 0.88,
            borderRadius: (size * 0.88) / 2,
            borderWidth: Math.max(2, size * 0.02),
            borderStyle: 'dotted',
            borderColor: '#C4B5FD',
          }}
        />
        {children}
        {/* Glossy shine — the sticker look. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: size * 0.09,
            left: size * 0.16,
            width: size * 0.3,
            height: size * 0.11,
            borderRadius: size * 0.06,
            backgroundColor: 'rgba(255,255,255,0.55)',
            transform: [{ rotate: '-20deg' }],
          }}
        />
      </View>
    </View>
  );
}

/** One cast sticker for a cast member: the AI cartoon when the member
 * carries one (the child's own drawing), catalog art otherwise. */
function CastSticker({ m, size, tilt = -6 }: { m: StoryCastMember; size: number; tilt?: number }) {
  return m.heroUri ? (
    <CartoonSticker uri={m.heroUri} size={size} tilt={tilt} />
  ) : (
    <CartoonSticker art={m.item.art} size={size} tilt={tilt} />
  );
}

/** Little drawn eraser (no art file ships one): pink block, grey band. */
function EraserIcon({ size }: { size: number }) {
  return (
    <View
      pointerEvents="none"
      style={{ width: size, height: size * 0.72, transform: [{ rotate: '-18deg' }] }}
    >
      <View
        style={{
          flex: 1.6,
          backgroundColor: '#F48FB1',
          borderRadius: size * 0.14,
          borderWidth: 2,
          borderColor: '#1E1B4B',
        }}
      />
      <View
        style={{
          flex: 1,
          backgroundColor: '#B0BEC5',
          borderRadius: size * 0.14,
          borderWidth: 2,
          borderColor: '#1E1B4B',
          marginTop: -2,
        }}
      />
    </View>
  );
}

/** SVG path for one finger stroke on the 0..100 paper grid. */
function drawPath(points: { x: number; y: number }[]): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0]!;
    return `M ${(p.x * 100).toFixed(1)} ${(p.y * 100).toFixed(1)} L ${(p.x * 100).toFixed(1)} ${(p.y * 100).toFixed(1)}`;
  }
  const [first, ...rest] = points;
  return `M ${(first!.x * 100).toFixed(1)} ${(first!.y * 100).toFixed(1)} ${rest.map(p => `L ${(p.x * 100).toFixed(1)} ${(p.y * 100).toFixed(1)}`).join(' ')}`;
}

/** One cast sticker: catalog cartoon art in the die-cut frame, or a
 * cartoonized photo when the art is a uri. */
function CartoonSticker({ art, uri, emoji, size, tilt = -6 }: { art?: any; uri?: string; emoji?: string; size: number; tilt?: number }) {
  return (
    <StickerFrame size={size} tilt={tilt}>
      {uri ? (
        <ToonPhoto uri={uri} size={size * 0.78} />
      ) : (
        <WordArt art={art ?? null} emoji={emoji ?? '⭐'} size={size * 0.72} />
      )}
    </StickerFrame>
  );
}

/** Pulsing dots while Neli works. */
function ThinkingDots({ size }: { size: number }) {
  const pulse = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 450, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={{ flexDirection: 'row', gap: size * 0.4 }}>
      {[0, 1, 2].map(i => (
        <Animated.View key={i} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: PLAY_INK, opacity: pulse }} />
      ))}
    </View>
  );
}

/** Choice figure that bounces when tapped. */
function ChoiceFigure({
  size,
  selected,
  dimmed,
  disabled,
  onPress,
  children,
}: {
  size: number;
  selected: boolean;
  dimmed?: boolean;
  disabled: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const bounce = useRef(new Animated.Value(1)).current;
  const press = () => {
    tap();
    Animated.sequence([
      Animated.timing(bounce, { toValue: 1.18, duration: 160, useNativeDriver: true }),
      Animated.timing(bounce, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <TouchableOpacity onPress={press} disabled={disabled} activeOpacity={0.9} accessibilityRole="button">
      <Animated.View style={{ transform: [{ scale: bounce }], alignItems: 'center', opacity: dimmed ? 0.45 : 1 }}>
        {selected ? (
          <View style={{ width: size * 1.12, height: size * 1.12, borderRadius: (size * 1.12) / 2, backgroundColor: '#FFB800', alignItems: 'center', justifyContent: 'center' }}>
            {children}
          </View>
        ) : (
          children
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

/** The guiding hand: bounces beside «بعدی» when she sits on a page. */
function IdleHand({ size }: { size: number }) {
  const nudge = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(nudge, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(nudge, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [nudge]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{ transform: [{ translateX: nudge.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.3] }) }] }}
    >
      <Image source={neliWorldAssets.ui.point} style={{ width: size, height: size }} resizeMode="contain" />
    </Animated.View>
  );
}

/** The only error a child ever sees — Farsi, short, with a retry. */
const ERR_FA = 'نلی الان نمی‌تونه، دوباره امتحان کن';

/** A real little sea for the «دریا» place: sky, layered waves and the
 * app's own boat art sailing on top — not a lone squiggle. */
function SeaScene({ width, height }: { width: number; height: number }) {
  const boat = ROOM_ITEMS.find(i => i.id === 'boat');
  const boatS = Math.min(width, height) * 0.24;
  return (
    <View style={{ position: 'absolute', width, height }} pointerEvents="none">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Rect x={0} y={0} width={width} height={height} fill="#BDEBFF" />
        <Circle cx={width * 0.85} cy={height * 0.16} r={height * 0.07} fill="#FFD93D" />
        <Path d={`M0 ${height * 0.62} Q ${width * 0.25} ${height * 0.56} ${width * 0.5} ${height * 0.62} T ${width} ${height * 0.62} L ${width} ${height} L 0 ${height} Z`} fill="#38BDF8" />
        <Path d={`M0 ${height * 0.72} Q ${width * 0.25} ${height * 0.66} ${width * 0.5} ${height * 0.72} T ${width} ${height * 0.72} L ${width} ${height} L 0 ${height} Z`} fill="#0284C7" />
        <Path d={`M0 ${height * 0.84} Q ${width * 0.25} ${height * 0.79} ${width * 0.5} ${height * 0.84} T ${width} ${height * 0.84} L ${width} ${height} L 0 ${height} Z`} fill="#0369A1" />
      </Svg>
      {boat ? (
        <Image source={boat.art} style={{ position: 'absolute', width: boatS, height: boatS, left: width * 0.58, top: height * 0.47 }} resizeMode="contain" />
      ) : null}
    </View>
  );
}

export default function MagicStoryGame() {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { navigate } = useNav();
  const k = H / REFERENCE_H;
  const [photo, setPhoto] = useState<{ uri: string; base64: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [cast, setCast] = useState<StoryCastMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // The book's people: the child's buddy plus ONE friend. Room finds that
  // are not the friend become silent objects (at most 2), never talkers.
  const [buddyId, setBuddyId] = useState<BuddyId>('neli');
  const [storyObjects, setStoryObjects] = useState<StoryCastMember[]>([]);
  useEffect(() => {
    let live = true;
    loadBuddy().then(b => {
      if (live && b) setBuddyId(b);
    });
    return () => {
      live = false;
    };
  }, []);
  const [focus, setFocus] = useState<StoryFocus | null>(null);
  // Where the tale happens — chosen by the child («کجا؟» chips). The
  // storybook stage behind the cast follows this place.
  const [placeId, setPlaceId] = useState('garden');
  const place = STORY_PLACES.find(p => p.id === placeId) ?? STORY_PLACES[1]!;
  const [lines, setLines] = useState<string[] | null>(null);
  // Picture-book pages: one generated illustration per line, produced in
  // the background after the story lands. Until a page's picture arrives
  // (or if generation fails) the page keeps its buddy+friend art.
  const [scenes, setScenes] = useState<string[] | null>(null);
  const [pageArt, setPageArt] = useState<(string | null)[]>([]);
  const pageArtRef = useRef<(string | null)[]>([]);
  const [storyTitle, setStoryTitle] = useState('');
  const [storySaved, setStorySaved] = useState(false);
  // The page picture gently pops in when it (or the page) arrives.
  const pagePop = useRef(new Animated.Value(1)).current;
    tap();
    try {
      const b = (await loadBuddy()) ?? 'neli';
      await saveMyDay({
        id: `magicstory-${Date.now()}`,
        dateISO: new Date().toISOString().slice(0, 10),
        buddy: b,
        storyId: 'game_magicstory',
        picks: [],
        colorHex: '#FFFFFF',
        game: {
          fa: 'قصه جادویی',
          en: 'Magic Story',
          words: selected.map(m => ({ id: m.item.id, fa: (Array.isArray(m.item.fa) ? m.item.fa[0] : m.item.fa) ?? '', emoji: '' })),
        },
      });
    } catch {
      // Saving must never break the book.
    }
    setStorySaved(true);
  };
  const [recap, setRecap] = useState('');
  const [lesson, setLesson] = useState('');
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [pageIdx, setPageIdx] = useState(0);
  useEffect(() => {
    pagePop.setValue(0.85);
    Animated.spring(pagePop, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start();
  }, [pageIdx, pageArt, pagePop]);
  useEffect(() => {
    pagePop.setValue(0.85);
    Animated.spring(pagePop, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start();
  }, [pageIdx, pageArt, pagePop]);
  const [idleHint, setIdleHint] = useState(false);
  // Drawing mode: finger painting on the tablet, repainted as a cartoon.
  const [drawing, setDrawing] = useState(false);
  const [dstrokes, setDstrokes] = useState<(DrawStroke & { id: number })[]>([]);
  const [drawColor, setDrawColor] = useState(DRAW_CRAYONS[0]!);
  const [drawWidthIdx, setDrawWidthIdx] = useState(0);
  const [conjuring, setConjuring] = useState(false);
  const [cartoonUri, setCartoonUri] = useState<string | null>(null);
  // The room photo repainted as a real cartoon (kind "photo") — the same
  // sticker treatment as drawings. Requested in the background once the
  // cast is known; the photo stays until it arrives (or forever on error).
  const [roomCartoon, setRoomCartoon] = useState<string | null>(null);
  const cartoonSeqRef = useRef(0);
  const drawColorRef = useRef(drawColor);
  const drawWidthRef = useRef(DRAW_WIDTHS[drawWidthIdx]!);
  const activeDrawId = useRef<number | null>(null);
  const nextDrawId = useRef(0);
  const paperRef = useRef({ w: 0, h: 0 });
  useEffect(() => {
    drawColorRef.current = drawColor;
  }, [drawColor]);
  useEffect(() => {
    drawWidthRef.current = DRAW_WIDTHS[drawWidthIdx]!;
  }, [drawWidthIdx]);

  // Recorded clips and TTS must never overlap — silence both on exit.
  useEffect(() => () => {
    void stopFaAudio();
  }, []);

  // The entry instruction speaks on open. The small delay matters: the
  // previous screen's unmount stopFaAudio bumps playFaAudio's token and
  // would silently drop a play started in the same instant. Tapping the
  // bubble below replays it for a child who missed it.
  useEffect(() => {
    const t = setTimeout(() => { void playFaAudio('story/draw-or-photo'); }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The cast question speaks once the friends are on screen.
  useEffect(() => {
    if (cast.length > 0 && !lines) {
      void playFaAudio('story/which-friend');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cast, lines]);

  // The guiding hand: appear after 6 quiet seconds on a story page.
  useEffect(() => {
    setIdleHint(false);
    if (!lines || asking) return;
    const t = setTimeout(() => setIdleHint(true), 6000);
    return () => clearTimeout(t);
  }, [pageIdx, lines, asking]);

  const selected = cast.filter(m => selectedIds.includes(m.item.id));

  const takeRoomPhoto = async () => {
    if (analyzing || asking) return;
    tap();
    setError(null);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setError(ERR_FA);
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.5, base64: true, exif: false });
      const asset = res.canceled ? undefined : res.assets?.[0];
      if (!asset?.uri || !asset.base64) return;
      if (asset.base64.length > MAX_PHOTO_BASE64_CHARS) {
        setError(ERR_FA);
        return;
      }
      // A new photo means a new story: clear everything downstream.
      setLines(null);
      setStoryTitle('');
      setRecap('');
      setLesson('');
      setFocus(null);
      setCelebrate(false);
      setPageIdx(0);
      setUnmatched([]);
      setPhoto({ uri: asset.uri, base64: asset.base64 });
      setRoomCartoon(null);
      setStoryObjects([]);
      cartoonSeqRef.current++;
      setAnalyzing(true);
      const named = await askMeta({
        prompt:
          'Look at this bedroom photo. List up to 6 objects a young child would know ' +
          '(toys, furniture, clothes, food, animals). Reply with ONLY this JSON and no other text: ' +
          '{"items": [{"fa": "<short Farsi name>", "en": "<short English name>"}]}',
        imageBase64: asset.base64,
        system: 'JSON only, never any other text. Short simple names a 4-year-old knows.',
        maxTokens: 300,
      });
      if ('error' in named || !named.text.trim()) {
        setError(ERR_FA);
        setPhoto(null);
        return;
      }
      const found = parseItems(named.text);
      if (!found) {
        setError(ERR_FA);
        setPhoto(null);
        return;
      }
      const matched: StoryCastMember[] = [];
      const used = new Set<string>();
      for (const w of found) {
        const item = matchRoomItem(w.fa, w.en);
        if (item && !matched.some(m => m.item.id === item.id)) {
          matched.push({ item, fa: item.fa[0]!, en: item.id });
          used.add(w.fa);
        }
      }
      setUnmatched(found.map(w => w.fa).filter(fa => !used.has(fa)).slice(0, 2));
      if (matched.length === 0) {
        setError(ERR_FA);
        setPhoto(null);
        return;
      }
      // ONE friend: matched animals first; friendly defaults when the room
      // shows none. Everything else found becomes a silent object (max 2).
      const animals = matched.filter(m => ANIMAL_IDS.has(m.item.id));
      const options: StoryCastMember[] =
        animals.length > 0
          ? animals
          : DEFAULT_FRIEND_IDS.map(id => {
              const item = roomItemById(id)!;
              return { item, fa: item.fa[0]!, en: item.en[0]! };
            });
      setCast(options);
      setSelectedIds([options[0]!.item.id]);
      setStoryObjects(matched.filter(m => m.item.id !== options[0]!.item.id).slice(0, 2));
      // Same sticker magic as drawings, for the room photo too — in the
      // background, so picking the cast never waits for it. A stale reply
      // (photo retaken mid-flight) is dropped by the sequence guard.
      const myPhoto = asset.base64;
      const seq = ++cartoonSeqRef.current;
      void askCartoon({ imageBase64: myPhoto, kind: 'photo' }).then(res => {
        if (cartoonSeqRef.current !== seq) return;
        if ('base64' in res) setRoomCartoon(`data:image/png;base64,${res.base64}`);
      });
    } catch {
      setError(ERR_FA);
    } finally {
      setAnalyzing(false);
    }
  };

  // One friend only: tapping picks THE friend, never a crowd.
  const toggleItem = (id: string) => {
    setSelectedIds([id]);
  };

  // Background picture-book illustrations, one per line, in order. A
  // failed page simply keeps its buddy+friend art — never an error.
  useEffect(() => {
    if (!lines || !scenes) return;
    let cancelled = false;
    void (async () => {
      for (let i = 0; i < lines.length; i++) {
        if (cancelled) return;
        if (pageArtRef.current[i]) continue;
        const res = await askIllustration(scenes[i]!);
        if (cancelled) return;
        if ('base64' in res) {
          pageArtRef.current[i] = `data:image/png;base64,${res.base64}`;
          setPageArt([...pageArtRef.current]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, scenes]);

  // A new story source means: clear everything downstream.
  const clearStory = () => {
    setLines(null);
    setScenes(null);
    pageArtRef.current = [];
    setPageArt([]);
    setStoryTitle('');
    setRecap('');
    setLesson('');
    setFocus(null);
    setCelebrate(false);
    setPageIdx(0);
    setUnmatched([]);
    setError(null);
    setRoomCartoon(null);
  };

  const openDrawing = () => {
    if (analyzing || asking || conjuring) return;
    tap();
    cartoonSeqRef.current++;
    clearStory();
    setPhoto(null);
    setCast([]);
    setSelectedIds([]);
    setStoryObjects([]);
    setCartoonUri(null);
    setDrawing(true);
  };

  const closeDrawing = () => {
    tap();
    setDrawing(false);
    setConjuring(false);
  };

  // The paper is one isolated view with all controls outside it, so the
  // touch coordinates never cross sibling views mid-gesture: locationX/Y
  // stay in the paper's own space (the jump ColoringScreen guards against
  // cannot happen here). Normalized 0..1 so the PNG export is exact.
  const paperResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: e => {
        const paper = paperRef.current;
        const { locationX, locationY } = e.nativeEvent;
        if (!paper.w || !paper.h || conjuring) return;
        // Way off the paper paints nothing; near the edge the point is
        // clamped onto the paper so a fat finger still draws there.
        if (locationX < -24 || locationY < -24 || locationX > paper.w + 24 || locationY > paper.h + 24) return;
        setError(null);
        const id = ++nextDrawId.current;
        activeDrawId.current = id;
        const pt = {
          x: Math.min(1, Math.max(0, locationX / paper.w)),
          y: Math.min(1, Math.max(0, locationY / paper.h)),
        };
        setDstrokes(prev => [...prev, { id, points: [pt], color: drawColorRef.current, width: drawWidthRef.current }]);
      },
      onPanResponderMove: e => {
        const paper = paperRef.current;
        const id = activeDrawId.current;
        if (!paper.w || !paper.h || id == null) return;
        const { locationX, locationY } = e.nativeEvent;
        // Sliding to (or past) the edge keeps drawing, clamped to the
        // paper's edge — the stroke only ends when the finger lifts.
        const pt = {
          x: Math.min(1, Math.max(0, locationX / paper.w)),
          y: Math.min(1, Math.max(0, locationY / paper.h)),
        };
        setDstrokes(prev => prev.map(s => (s.id === id ? { ...s, points: [...s.points, pt] } : s)));
      },
      onPanResponderRelease: () => {
        activeDrawId.current = null;
      },
      onPanResponderTerminate: () => {
        activeDrawId.current = null;
      },
    }),
  ).current;

  const conjureCartoon = async () => {
    if (conjuring) return;
    tap();
    if (dstrokes.length === 0) {
      // The button never stays silent: empty paper gets a gentle hint.
      setError(ERR_FA);
      return;
    }
    setConjuring(true);
    setError(null);
    setCartoonUri(null);
    void playFaAudio('story/make-magic');
    let b64 = '';
    try {
      b64 = drawingToPngBase64(dstrokes, 384);
      const res = await askCartoon({ imageBase64: b64, kind: 'drawing' });
      if ('error' in res) {
        // Never stuck: the child's own drawing becomes the hero sticker
        // (same die-cut frame) and the story goes on without the cartoon.
        if (__DEV__) console.warn('[cartoon] cartoon failed, keeping the drawing as the sticker:', res.error);
        setCartoonUri(`data:image/png;base64,${b64}`);
        setCelebrate(true);
        return;
      }
      setCartoonUri(`data:image/png;base64,${res.base64}`);
      setCelebrate(true);
    } catch (e) {
      if (__DEV__) console.warn('[cartoon] cartoon threw, keeping the drawing as the sticker:', e);
      if (b64) {
        setCartoonUri(`data:image/png;base64,${b64}`);
        setCelebrate(true);
      } else {
        setError(ERR_FA);
      }
    } finally {
      setConjuring(false);
    }
  };

  const drawingToStory = () => {
    if (!cartoonUri) return;
    tap();
    clearStory();
    setPhoto(null);
    const m: StoryCastMember = { item: DRAW_ITEM, fa: 'نقاشی', en: 'drawing', heroUri: cartoonUri };
    setCast([m]);
    setSelectedIds([DRAW_ITEM.id]);
    setStoryObjects([]);
    setCartoonUri(null);
    setDstrokes([]);
    setDrawing(false);
  };

  const speakFocus = async () => {
    if (!focus || !(focus.audioKey in FA_TEST_AUDIO)) return;
    tap();
    await playFaAudio(focus.audioKey as FaTestAudioKey, { awaitFinish: true });
    await playFaAudio('feedback/afarin');
  };

  const tellStory = async () => {
    if (asking || selected.length === 0) return;
    tap();
    setAsking(true);
    setError(null);
    setLines(null);
    setStoryTitle('');
    setRecap('');
    setLesson('');
    setCelebrate(false);
    setPageIdx(0);
    try {
      // The book's people: the child's buddy plus ONE friend. Room finds
      // that are not the friend are silent objects (at most 2) — mentioned
      // like things, never talking characters.
      const buddy = BUDDIES.find(b => b.id === buddyId) ?? BUDDIES[0]!;
      const friend = selected[0]!;
      const objs = storyObjects.slice(0, 2);
      // The one spoken word must have a real recording: prefer the friend
      // when it has one, otherwise draw any recorded word.
      const honk = friend.item.audioKey && friend.item.audioKey in FA_TEST_AUDIO ? friend : null;
      const nextFocus: StoryFocus = honk
        ? { id: honk.item.id, fa: honk.fa, en: honk.en, emoji: '⭐', audioKey: honk.item.audioKey! }
        : STORY_FOCUS_WORDS[Math.floor(Math.random() * STORY_FOCUS_WORDS.length)]!;
      const objLine =
        objs.length > 0
          ? `Things in the story — never talking, just things the friends use and play with: ${objs
              .map(o => `${o.fa} (${o.en})`)
              .join(' and ')}. Mention each at most once, in passing. `
          : '';
      const buildPrompt = () =>
        `Write a picture-book story in Farsi for a 4-to-6-year-old: EXACTLY 8 lines, ` +
        `plus a title, a one-line recap and a one-line sweet lesson. ` +
        `Hero: ${buddy.fa} (${buddy.en}) — the child's best friend. ` +
        `Friend: ${friend.fa} (${friend.en}). ` +
        objLine +
        `Setting: ${place.fa} (${place.en}) — the whole story happens there. ` +
        `Everyday spoken Farsi, the way a mom tells a story to her 5-year-old. ` +
        `Each line is ONE natural full sentence of 6 to 12 words — real storytelling, not baby talk. ` +
        `Give the characters ONE short line of spoken dialogue inside «» (like گفت: «...»). ` +
        `Show one feeling with one of these words: خوشحال، تعجب کرد، ذوق کرد. ` +
        `No poetry, no rhyme, no refrain. ` +
        `Plot: who and where → a clear small problem → the two friends think of a clever, kind fix TOGETHER → they do it → happy ending. ` +
        `Each line must follow from the one before; cause and effect, like a real little story. ` +
        `Slip in 1–2 slightly new words a child can guess from the sentence around them. ` +
        `The story MUST include the word "${nextFocus.fa}" (${nextFocus.en}) once, as part of the tale, never announced. ` +
        `NEVER write about fear, the dark, monsters, nightmares, falling asleep or crying. ` +
        `Do NOT list names like a roll call. ` +
        `Example to follow (same shape and level, a NEW story, not this one): ` +
        `{"title":"نلی و بادبادک آبی","lines":["نلی و آیدین توی باغ قشنگ خونه‌ی مادربزرگ بازی می‌کردن.","بادبادک آبی آیدین یهو پرواز کرد و رفت روی شاخه‌ی بلند درخت نشست.","باد هرچی زور زد، بادبادک از رو شاخه تکون نخورد و همونجا موند.","آیدین گفت: «بادبادکم اون بالا گیر کرده، چیکار کنیم حالا؟»","نلی یه نگاه به جاروی بلند کنار درخت کرد و لبخند زد.","نلی گفت: «جارو رو بده به من، تو هم صداش کن!»","آیدین جارو رو نگه داشت و نلی آروم نوک شاخه رو تکون داد.","بادبادک افتاد پایین و هر دو ذوق کردن و دور باغ دویدن."],"recap":"نلی با یه فکر خوب بادبادک آیدین رو نجات داد.","lesson":"با فکر کردن و کمک هم، مشکل حل می‌شه."} ` +
        `Also write "scenes": for EACH line, one short ENGLISH sentence describing the picture for that page ` +
        `(who is where, doing what — simple, concrete, drawable). ` +
        `Reply with ONLY this JSON and no other text: ` +
        `{"title": "...", "lines": ["...", ...8 total...], "recap": "...", "lesson": "...", "scenes": ["...", ...8 total...]}`;
      const system =
        'Title plus exactly eight lines plus recap plus lesson plus 8 English scene descriptions (one per line). Natural mom-telling Farsi for a 4-to-6-year-old, one full sentence (6–12 words) per line, one «» dialogue, one feeling word, no poetry, no fear, no roll call. ' +
        'One event per line, each line follows the last: problem, clever kind fix together, happy ending. JSON only, never any other text.';
      // Ask at most twice; a hand-written fallback guarantees the child
      // always gets a real story, never an error screen.
      let filled = null as null | StoryText;
      for (let attempt = 0; attempt < 2 && !filled; attempt++) {
        const res = await askMeta({ prompt: buildPrompt(), system, maxTokens: 1200, temperature: 0.7 });
        if ('error' in res || !res.text || !res.text.trim()) {
          if (__DEV__) console.warn('[story] story request failed:', 'error' in res ? res.error : 'empty reply');
          continue;
        }
        const parsed = parseStory(res.text);
        if (parsed && parsed.title && parsed.recap && parsed.lesson) filled = parsed;
        else if (__DEV__) console.warn('[story] reply failed the story gate, attempt', attempt + 1);
      }
      if (!filled) {
        filled = fallbackStory(
          { buddy: buddy.fa, friend: friend.fa, obj: objs[0]?.fa ?? 'توپ' },
          Math.floor(Math.random() * 5),
        );
      }
      setFocus(nextFocus);
      setStorySaved(false);
      setStoryTitle(filled.title || `قصه‌ی ${friend.fa}`);
      pageArtRef.current = filled.lines.map(() => null);
      setPageArt([...pageArtRef.current]);
      setScenes(filled.scenes ?? null);
      setLines(filled.lines);
      setRecap(filled.recap);
      setLesson(filled.lesson);
      setCelebrate(true);
      // "This is your story" first when its recording ships, then the one
      // spoken word only — no afarin after it. The story ends soft, and
      // the recap page says what was learned.
      await playFaAudio('story/your-story', { awaitFinish: true });
      if (nextFocus.audioKey in FA_TEST_AUDIO) {
        await playFaAudio(nextFocus.audioKey as FaTestAudioKey, { awaitFinish: true });
      }
    } finally {
      setAsking(false);
    }
  };

  const mood: BuddyMood = analyzing || asking ? 'thinking' : lines ? 'happy' : 'idle';
  const showingNote = asking || lines !== null;
  // Slides: title page (0), one page per story line, recap page last.
  const totalSlides = lines ? lines.length + 2 : 0;
  const safeIdx = lines ? Math.min(pageIdx, lines.length + 1) : 0;
  const isTitle = lines !== null && safeIdx === 0;
  const isRecap = lines !== null && safeIdx === lines.length + 1;
  const artH = Math.min(H * 0.32, 240 * k);
  // The paper IS the sheet: it flex-fills everything the title, colors
  // and button leave. First frame uses an estimate; onLayout measures.
  const paperEst = Math.min(W * 0.9, H * 0.5, 520);
  const [paperBox, setPaperBox] = useState({ w: 0, h: 0 });
  const pb = paperBox.w > 10 && paperBox.h > 10 ? paperBox : { w: paperEst, h: paperEst };
  const revealS = Math.min(H * 0.4, 200 * k);
  const buddyH = Math.min(H * 0.42, W * 0.17);
  // Start screen: Neli stands big on the ground, bubble above her.
  const entryBuddyH = Math.min(H * 0.44, W * 0.22);
  const tileS = Math.min(H * 0.13, 76 * k);
  const wandH = Math.max(64, 72 * k);
  const s = styles(k, totalSlides > 7);
  const storyIdx = Math.max(0, safeIdx - 1);
  // Every page: the buddy AND the one friend, side by side, big.
  const friend = lines && selected.length > 0 ? selected[0]! : null;
  const buddyArt = buddyPose(buddyId, 'base');
  return (
    <View style={s.root}>
      {placeId === 'sea' ? (
        <SeaScene width={W} height={H} />
      ) : (
        <GameBg pick={placeId === 'home' ? roomBackgroundPickers.bedroom : roomBackgroundPickers.garden} />
      )}

      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 60, elevation: 60 }}>
        <TopBar title="قصه جادویی" titleFa="قصه جادویی" dark showClose onBack={() => navigate({ name: 'MagicGames' })} />
      </View>

      {/* Center stage: camera → cast → story. Top padding keeps every
          label («کی؟» / «کجا؟») fully below the purple TopBar. */}
      {!showingNote ? (
        <View style={[s.stage, { paddingTop: topBarHeight(H, insets.top) + 10 * k }]}>
          {!photo && cast.length === 0 ? (
            <>
              <TouchableOpacity style={s.bubble} activeOpacity={0.9} onPress={() => { tap(); void playFaAudio('story/draw-or-photo'); }} accessibilityRole="button" accessibilityLabel="از اتاقت عکس بگیر یا نقاشی بکش!">
                <Text style={[s.bubbleText, dir('fa'), { textAlign: 'center' }]}>از اتاقت عکس بگیر یا نقاشی بکش!</Text>
              </TouchableOpacity>
              <View style={s.tail} />
              <BuddyGuide mood={mood} size={entryBuddyH} />
              <SoftShadow width={entryBuddyH} />
              {/* Both buttons live at the bottom, left and right of her —
                  never over her feet or the bubble's tail. */}
              <View style={s.entryRow}>
                <View style={[s.entryHalf, { flex: 1.3 }]}>
                  <CandyButton color={PLAY_ACCENTS.story.color} edge={PLAY_ACCENTS.story.edge} onPress={takeRoomPhoto} disabled={analyzing} height={wandH} padH={wandH * 0.15}>
                    <Image source={neliWorldAssets.ui.camera} style={{ width: wandH * 0.3, height: wandH * 0.3, flexShrink: 0 }} resizeMode="contain" />
                    <Text style={s.tellText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>عکس بگیر</Text>
                  </CandyButton>
                </View>
                <View style={[s.entryHalf, { flex: 0.7 }]}>
                  <CandyButton color={PLAY_ACCENTS.sunny.color} edge={PLAY_ACCENTS.sunny.edge} onPress={openDrawing} disabled={analyzing} height={wandH}>
                    <Text style={s.tellText}>بکش!</Text>
                  </CandyButton>
                </View>
              </View>
              <View style={s.privacyPill}>
                <Text style={[s.privacy, dir('fa'), { textAlign: 'center' }]}>عکس‌ها از دستگاه بیرون نمی‌رود</Text>
              </View>
            </>
          ) : analyzing || cast.length === 0 ? (
            <>
              <BuddyGuide mood="thinking" size={buddyH} />
              <View style={s.bubble}>
                <Text style={[s.bubbleText, dir('fa'), { textAlign: 'center' }]}>نلی داره نگاه می‌کنه...</Text>
              </View>
              <ThinkingDots size={14 * k} />
            </>
          ) : (
            <>
              {/* Storybook before the story: the chosen hero stands big
                  in the chosen place, the buddy beside it, and the
                  «قصه بساز!» bubble over them. No white card. */}
              <View style={s.bookStage}>
                <BuddyGuide mood={mood} size={Math.min(120 * k, H * 0.3)} />
                {selected[0] ? (
                  <CastSticker m={selected[0]} size={Math.min(130 * k, H * 0.32)} tilt={-4} />
                ) : roomCartoon ? (
                  <CartoonSticker uri={roomCartoon} size={Math.min(110 * k, H * 0.26)} tilt={-6} />
                ) : photo ? (
                  <StickerFrame size={Math.min(110 * k, H * 0.26)} tilt={-6}>
                    <ToonPhoto uri={photo.uri} size={Math.min(110 * k, H * 0.26) * 0.78} />
                  </StickerFrame>
                ) : null}
                <View style={s.bubbleSmall}>
                  <Text style={[s.bubbleSmallText, dir('fa'), { textAlign: 'center' }]}>{selected[0] ? 'قصه بساز!' : 'کدوم دوست توی قصه باشه؟'}</Text>
                </View>
              </View>
              <View style={s.qPill}><Text style={[s.qPillText, dir('fa')]}>کی؟</Text></View>
              <View style={s.castRow}>
                {cast.map(m => {
                  const on = selectedIds.includes(m.item.id);
                  return (
                    <View key={m.item.id} style={{ alignItems: 'center' }}>
                      <ChoiceFigure
                        size={tileS}
                        selected={on}
                        dimmed={!on}
                        disabled={asking}
                        onPress={() => toggleItem(m.item.id)}
                      >
                        <CastSticker m={m} size={tileS * 0.92} tilt={-6} />
                      </ChoiceFigure>
                      <Text style={[s.castFa, dir('fa'), { textAlign: 'center' }]} numberOfLines={1}>{m.fa}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={s.qPill}><Text style={[s.qPillText, dir('fa')]}>کجا؟</Text></View>
              <View style={s.placeRow}>
                {STORY_PLACES.map(p => {
                  const on = placeId === p.id;
                  const boatArt = ROOM_ITEMS.find(i => i.id === 'boat')?.art;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => { tap(); setPlaceId(p.id); }}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      style={[s.placeChip, on && s.placeChipOn, { width: 76 * k, height: 62 * k }]}
                    >
                      {p.id === 'sea' ? (
                        <View style={s.seaChip}>
                          {boatArt ? <Image source={boatArt} style={{ width: 44 * k, height: 44 * k }} resizeMode="contain" /> : null}
                        </View>
                      ) : (
                        <Image
                          source={p.id === 'home' ? roomBackgroundPickers.bedroom(W, H) : roomBackgroundPickers.garden(W, H)}
                          style={s.placeChipImg}
                          resizeMode="cover"
                        />
                      )}
                      <Text style={[s.placeChipText, dir('fa')]} numberOfLines={1}>{p.fa}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {unmatched.length > 0 ? (
                <Text style={[s.extraFa, dir('fa'), { textAlign: 'center' }]}>…و {unmatched.join('، ')} هم هست</Text>
              ) : null}
              {storyObjects.length > 0 ? (
                <Text style={[s.extraFa, dir('fa'), { textAlign: 'center' }]}>
                  تو قصه هست: {storyObjects.map(o => o.fa).join('، ')}
                </Text>
              ) : null}
              <CandyButton color={PLAY_ACCENTS.story.color} edge={PLAY_ACCENTS.story.edge} onPress={tellStory} disabled={asking || selected.length === 0} height={wandH}>
                <Image source={neliWorldAssets.ui.sparkle} style={{ width: wandH * 0.45, height: wandH * 0.45 }} resizeMode="contain" />
                <Text style={s.tellText}>{asking ? '…' : 'قصه بگو'}</Text>
              </CandyButton>
              {photo ? (
                <TouchableOpacity onPress={() => { tap(); void takeRoomPhoto(); }} activeOpacity={0.7}>
                  <Text style={[s.retake, dir('fa'), { textAlign: 'center' }]}>یه عکس دیگه</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => { tap(); setCast([]); setSelectedIds([]); setStoryObjects([]); openDrawing(); }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.retake, dir('fa'), { textAlign: 'center' }]}>یه نقاشی دیگه</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          {error ? (
            <View style={s.errorRow}>
              <Text style={[s.error, dir('fa')]}>{error}</Text>
              <TouchableOpacity
                style={s.retryBtn}
                onPress={() => { tap(); setError(null); if (selected.length > 0) void tellStory(); }}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <Text style={[s.retryText, dir('fa')]}>دوباره</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* The picture book: one calm open-book page at a time, full
          screen. Left half = big illustration, right half = the line.
          Nothing else on the page but round arrows and page dots. */}
      {showingNote ? (
        <View style={[s.noteWrap, { top: topBarHeight(H, insets.top) }]} pointerEvents="box-none">
          <View style={[s.book, { width: Math.min(W * 0.9, 920 * k), height: Math.min(H * 0.82, 560 * k) }]}>
            {asking || !lines ? (
              <View style={s.noteThinking}>
                <BuddyGuide mood="thinking" size={64 * k} />
                <ThinkingDots size={12 * k} />
              </View>
            ) : (
              <>
                <View style={s.openPages}>
                  {/* Left half: the picture, gently popping in. */}
                  <Animated.View style={[s.halfArt, { transform: [{ scale: pagePop }] }]}>
                    {isRecap ? (
                      friend ? <CastSticker m={friend} size={Math.min(170 * k, H * 0.34)} tilt={-4} /> : null
                    ) : pageArt[storyIdx] && !isTitle ? (
                      <Image source={{ uri: pageArt[storyIdx]! }} style={s.bookIllustration} resizeMode="cover" />
                    ) : (
                      <View style={s.bookFallback}>
                        {roomCartoon ? (
                          <CartoonSticker uri={roomCartoon} size={Math.min(150 * k, H * 0.3)} tilt={-6} />
                        ) : photo ? (
                          <ToonPhoto uri={photo.uri} size={Math.min(150 * k, H * 0.3)} />
                        ) : friend ? (
                          <CastSticker m={friend} size={Math.min(150 * k, H * 0.3)} tilt={-6} />
                        ) : null}
                        <Image
                          source={buddyArt}
                          style={{ width: Math.min(90 * k, H * 0.18), height: Math.min(90 * k, H * 0.18), alignSelf: 'flex-end' }}
                          resizeMode="contain"
                        />
                      </View>
                    )}
                  </Animated.View>
                  {/* Right half: the words, big, with lots of air. */}
                  <View style={s.halfText}>
                    {isTitle ? (
                      <Text style={[s.titleFa, dir('fa'), { textAlign: 'center' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>{storyTitle}</Text>
                    ) : isRecap ? (
                      <>
                        <Text style={[s.titleFa, dir('fa'), { textAlign: 'center' }]}>پایان قصه</Text>
                        <TouchableOpacity
                          style={[s.saveBtn, storySaved && s.saveBtnDone, { width: 76 * k, height: 76 * k, borderRadius: 38 * k }]}
                          onPress={() => void saveStory()}
                          disabled={storySaved}
                          activeOpacity={0.85}
                          accessibilityRole="button"
                          accessibilityLabel="ذخیره در روزهای من"
                        >
                          <Image source={neliWorldAssets.ui.camera} style={{ width: 40 * k, height: 40 * k }} resizeMode="contain" />
                        </TouchableOpacity>
                        {storySaved ? <Text style={[s.savedFa, dir('fa')]}>ذخیره شد</Text> : null}
                      </>
                    ) : (
                      <Text style={[s.line, dir('fa'), { textAlign: 'center' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>{lines[storyIdx]}</Text>
                    )}
                  </View>
                </View>
                <View style={s.pageControls}>
                  <TouchableOpacity
                    style={[s.arrowBtn, { width: 56 * k, height: 56 * k, borderRadius: 28 * k }, safeIdx >= totalSlides - 1 && s.pageBtnOff]}
                    disabled={safeIdx >= totalSlides - 1}
                    onPress={() => { tap(); setPageIdx(safeIdx + 1); }}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="صفحه بعد"
                  >
                    <Text style={[s.arrowText, { fontSize: 30 * k }]}>‹</Text>
                  </TouchableOpacity>
                  <View style={s.dots}>
                    {Array.from({ length: totalSlides }).map((_, i) => (
                      <View key={i} style={[s.dot, i === safeIdx && s.dotOn]} />
                    ))}
                  </View>
                  {idleHint && !isRecap ? <IdleHand size={26 * k} /> : null}
                  <TouchableOpacity
                    style={[s.arrowBtn, { width: 56 * k, height: 56 * k, borderRadius: 28 * k }, safeIdx === 0 && s.pageBtnOff]}
                    disabled={safeIdx === 0}
                    onPress={() => { tap(); setPageIdx(safeIdx - 1); }}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="صفحه قبل"
                  >
                    <Text style={[s.arrowText, { fontSize: 30 * k }]}>›</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      ) : null}

      {error && showingNote ? (
        <View style={s.errorWrap}>
          <Text style={[s.error, dir('fa')]}>{error}</Text>
          <TouchableOpacity
            style={s.retryBtn}
            onPress={() => { tap(); setError(null); if (selected.length > 0) void tellStory(); }}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={[s.retryText, dir('fa')]}>دوباره</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Drawing overlay: finger painting, then the AI cartoon reveal. */}
      {drawing ? (
        <View style={s.noteWrap} pointerEvents="box-none">
          <View style={[s.drawCard, { width: Math.min(W * 0.94, 860), height: H * 0.94 }]}>
            {!cartoonUri ? (
              <>
                <View style={s.drawHead}>
                  <Text style={[s.drawTitle, dir('fa')]}>نقاشیتو بکش!</Text>
                  <View style={s.drawCloseBtn}>
                    <CloseButton inline size={Math.max(36, 40 * k)} onPress={closeDrawing} />
                  </View>
                </View>
                {conjuring ? (
                  <View style={s.noteThinking}>
                    <BuddyGuide mood="thinking" size={64 * k} />
                    <Text style={[s.bubbleSmallText, dir('fa'), { textAlign: 'center' }]}>نلی داره نقاشی می‌کنه...</Text>
                    <ThinkingDots size={12 * k} />
                  </View>
                ) : (
                  <>
                    <View
                      style={[s.paperWrap, { width: '100%', flex: 1 }]}
                      onLayout={e => {
                        const { width: w, height: h } = e.nativeEvent.layout;
                        paperRef.current = { w, h };
                        setPaperBox(prev => (Math.abs(prev.w - w) > 0.5 || Math.abs(prev.h - h) > 0.5 ? { w, h } : prev));
                      }}
                      {...paperResponder.panHandlers}
                    >
                      <Svg width={pb.w} height={pb.h} viewBox="0 0 100 100" preserveAspectRatio="none">
                        {dstrokes.map(st => (
                          <Path
                            key={st.id}
                            d={drawPath(st.points)}
                            stroke={st.color}
                            strokeWidth={st.width * 100}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ))}
                      </Svg>
                    </View>
                    <View style={s.crayonRow}>
                      {DRAW_CRAYONS.map(c => (
                        <TouchableOpacity
                          key={c}
                          onPress={() => { tap(); setDrawColor(c); }}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          style={[
                          s.crayon,
                          { backgroundColor: c, borderBottomColor: 'rgba(0,0,0,0.28)', width: 36 * k, height: 36 * k, borderRadius: 12 * k },
                          c === drawColor && [s.crayonOn, { transform: [{ scale: 1.18 }] }],
                        ]}
                        />
                      ))}
                      {DRAW_WIDTHS.map((w, i) => (
                        <TouchableOpacity
                          key={w}
                          onPress={() => { tap(); setDrawWidthIdx(i); }}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          style={[s.widthDot, i === drawWidthIdx && s.crayonOn]}
                        >
                          <View
                            style={{
                              width: (i + 1) * 7 * k,
                              height: (i + 1) * 7 * k,
                              borderRadius: ((i + 1) * 7 * k) / 2,
                              backgroundColor: PLAY_INK,
                            }}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={s.magicRow}>
                      <TouchableOpacity
                        style={[s.pageBtn, s.magicSimple, conjuring && s.pageBtnOff]}
                        onPress={() => { void conjureCartoon(); }}
                        disabled={conjuring}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Image source={neliWorldAssets.ui.sparkle} style={{ width: 22 * k, height: 22 * k }} resizeMode="contain" />
                          <Text style={s.magicSimpleText}>جادویی‌اش کن</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.eraserBtn, dstrokes.length === 0 && s.pageBtnOff]}
                        disabled={dstrokes.length === 0}
                        onPress={() => { tap(); setDstrokes([]); }}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel="پاک کن"
                      >
                        <EraserIcon size={30 * k} />
                      </TouchableOpacity>
                    </View>
                    <Text style={[s.drawPrivacy, dir('fa'), { textAlign: 'center' }]}>نقاشی فقط برای کارتونی شدن فرستاده می‌شود و نگه داشته نمی‌شود</Text>
                  </>
                )}
                {error ? <Text style={s.error}>{error}</Text> : null}
              </>
            ) : (
              <>
                <Text style={[s.drawTitle, dir('fa'), { textAlign: 'center' }]}>نقاشیت کارتونی شد!</Text>
                <StickerFrame size={revealS} tilt={-6}>
                  <ToonPhoto uri={cartoonUri} size={revealS * 0.78} />
                </StickerFrame>
                <CandyButton
                  color={PLAY_ACCENTS.story.color}
                  edge={PLAY_ACCENTS.story.edge}
                  onPress={drawingToStory}
                  height={wandH * 0.8}
                >
                  <Image source={neliWorldAssets.ui.sparkle} style={{ width: wandH * 0.32, height: wandH * 0.32 }} resizeMode="contain" />
                  <Text style={s.tellText}>ببر تو قصه</Text>
                </CandyButton>
                <TouchableOpacity
                  onPress={() => { tap(); setCartoonUri(null); setCelebrate(false); setDstrokes([]); }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.retake, dir('fa'), { textAlign: 'center' }]}>یه نقاشی دیگه</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      ) : null}
      {celebrate && (lines || cartoonUri) ? <PopperCelebration visible onComplete={() => {}} /> : null}
    </View>
  );
}

const styles = (k: number, compactDots: boolean) => StyleSheet.create({
  root: { flex: 1 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', rowGap: 8 * k, paddingHorizontal: 16 * k },
  bubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18 * k,
    paddingHorizontal: 16 * k,
    paddingVertical: 10 * k,
    maxWidth: '82%',
    shadowColor: 'rgba(45,27,105,0.30)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 5,
  },
  bubbleText: { fontFamily: ff('fa', 'black'), color: PLAY_INK, fontSize: 20 * k },
  bubbleSmall: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14 * k,
    paddingHorizontal: 12 * k,
    paddingVertical: 8 * k,
    maxWidth: '62%',
    shadowColor: 'rgba(45,27,105,0.30)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 5,
  },
  bubbleSmallText: { fontFamily: ff('fa', 'black'), color: PLAY_INK, fontSize: 15 * k },
  tellText: { color: '#FFFFFF', fontSize: 20 * k, fontFamily: ff('fa', 'black') },
  privacy: { color: PLAY_INK, fontSize: 11 * k, fontFamily: ff('fa', 'regular') },
  privacyPill: {
    backgroundColor: 'rgba(255,253,245,0.95)',
    borderRadius: 999,
    paddingHorizontal: 14 * k,
    paddingVertical: 3 * k,
  },
  roomRow: { flexDirection: 'row', alignItems: 'center', gap: 10 * k },
  bookStage: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 14 * k },
  qPill: { backgroundColor: '#FFF9E8', borderRadius: 999, paddingHorizontal: 16 * k, paddingVertical: 5 * k },
  qPillText: { fontFamily: ff('fa', 'black'), color: '#1E1B4B', fontSize: 15 * k },
  placeRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 * k },
  placeChip: { borderRadius: 16 * k, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: 'transparent', alignItems: 'center', justifyContent: 'flex-end' },
  placeChipOn: { borderColor: '#FFB800' },
  placeChipImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  placeChipText: { fontFamily: ff('fa', 'black'), color: '#1E1B4B', fontSize: 12 * k, backgroundColor: 'rgba(255,249,232,0.92)', paddingHorizontal: 8 * k, borderRadius: 999, marginBottom: 4 * k, overflow: 'hidden' },
  seaChip: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#38BDF8', alignItems: 'center', justifyContent: 'center' },
  castRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 * k, maxWidth: 560 },
  castFa: { color: '#FFFFFF', fontSize: 13 * k, fontFamily: ff('fa', 'black'), textShadowColor: 'rgba(46,26,107,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3, marginTop: 2 * k, maxWidth: 84 * k },
  extraFa: { color: '#FFFFFF', fontSize: 12 * k, fontFamily: ff('fa', 'regular'), textShadowColor: 'rgba(46,26,107,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  retake: { color: '#FFFFFF', fontSize: 13 * k, fontFamily: ff('fa', 'black'), textDecorationLine: 'underline', textShadowColor: 'rgba(46,26,107,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  error: { color: '#DC2626', backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 10 * k, paddingHorizontal: 12 * k, paddingVertical: 6 * k, fontSize: 13 * k, overflow: 'hidden', textAlign: 'center' as const },
  errorWrap: { position: 'absolute', bottom: 12 * k, alignSelf: 'center', maxWidth: '86%', alignItems: 'center', rowGap: 8 * k },
  errorRow: { alignItems: 'center', rowGap: 8 * k, maxWidth: '92%' },
  retryBtn: { backgroundColor: '#FFB800', borderRadius: 999, paddingHorizontal: 26 * k, paddingVertical: 10 * k },
  retryText: { fontFamily: ff('fa', 'black'), color: '#1E1B4B', fontSize: 16 * k },
  entryRow: { flexDirection: 'row', gap: 10 * k, width: '100%', maxWidth: 480, justifyContent: 'center' },
  entryHalf: { flex: 1 },
  drawCard: {
    backgroundColor: '#FFFDF4',
    borderRadius: 18 * k,
    paddingHorizontal: 12 * k,
    paddingVertical: 12 * k,
    alignItems: 'center',
    rowGap: 8 * k,
    shadowColor: 'rgba(45,27,105,0.35)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  drawHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative' },
  drawCloseBtn: { position: 'absolute', right: 0, top: -8 * k, width: 44 * k, height: 44 * k, alignItems: 'center', justifyContent: 'center' },
  drawPrivacy: { color: PLAY_INK, fontSize: 11 * k, fontFamily: ff('fa', 'regular') },
  tail: {
    width: 16 * k,
    height: 16 * k,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
    marginTop: -14 * k,
    marginBottom: -2 * k,
  },
  drawTitle: { fontFamily: ff('fa', 'black'), color: PLAY_INK, fontSize: 20 * k },

  paperWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12 * k,
    borderWidth: 2,
    borderColor: '#E5D9FF',
    overflow: 'hidden',
  },
  crayonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 * k, flexWrap: 'wrap' },
  crayon: { borderBottomWidth: 5 * k },
  crayonOn: { borderWidth: 3, borderColor: '#FFB800' },
  widthDot: {
    width: 30 * k,
    height: 30 * k,
    borderRadius: 15 * k,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  magicRow: { flexDirection: 'row', alignItems: 'center', gap: 8 * k, width: '100%' },
  magicSimple: { flex: 1, paddingVertical: 12 * k, borderRadius: 16 * k },
  magicSimpleText: { color: '#FFFFFF', fontSize: 17 * k, fontFamily: ff('fa', 'black') },
  eraserBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16 * k,
    paddingHorizontal: 12 * k,
    paddingVertical: 8 * k,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5D9FF',
  },
  noteWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  note: {
    backgroundColor: '#FFFDF4',
    borderRadius: 18 * k,
    paddingHorizontal: 14 * k,
    paddingVertical: 16 * k,
    shadowColor: 'rgba(45,27,105,0.35)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  // The open picture book: cream paper, soft shadow, rounded corners.
  book: {
    backgroundColor: '#FFF9E8',
    borderRadius: 28 * k,
    paddingHorizontal: 18 * k,
    paddingVertical: 16 * k,
    shadowColor: 'rgba(45,27,105,0.35)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 10,
  },
  openPages: { flex: 1, flexDirection: 'row', alignItems: 'stretch', columnGap: 18 * k },
  halfArt: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 18 * k },
  halfText: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 * k, rowGap: 14 * k },
  bookIllustration: { width: '100%', height: '100%', borderRadius: 18 * k },
  bookFallback: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  arrowBtn: { backgroundColor: '#2D1B69', alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: '#FFFFFF', fontFamily: ff('fa', 'black'), lineHeight: 34 * k },
  saveBtn: { backgroundColor: '#FFB800', alignItems: 'center', justifyContent: 'center' },
  saveBtnDone: { backgroundColor: '#22C55E' },
  savedFa: { fontFamily: ff('fa', 'black'), color: '#15803D', fontSize: 15 * k },
  tapeLeft: { position: 'absolute', top: -8 * k, left: 26 * k, width: 64 * k, height: 20 * k, backgroundColor: 'rgba(255,255,255,0.75)', transform: [{ rotate: '-8deg' }] },
  tapeRight: { position: 'absolute', top: -8 * k, right: 26 * k, width: 64 * k, height: 20 * k, backgroundColor: 'rgba(255,255,255,0.75)', transform: [{ rotate: '8deg' }] },
  noteThinking: { alignItems: 'center', rowGap: 10 * k, paddingVertical: 20 * k },
  page: { alignItems: 'center', rowGap: 6 * k },
  pageArt: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  pageIllustration: { width: '100%', borderRadius: 14 * k },
  pageFigure: { position: 'absolute', right: '6%', bottom: -4 * k },
  pageBuddy: { position: 'absolute', left: '5%', bottom: -2 * k },
  pageFriend: { position: 'absolute', left: '4%', bottom: 0 },
  titleFa: { fontFamily: ff('fa', 'black'), color: PLAY_INK, fontSize: 24 * k },
  line: { fontFamily: ff('fa', 'black'), color: PLAY_INK, fontSize: 20 * k },
  dots: { flexDirection: 'row', gap: (compactDots ? 3 : 6) * k, alignItems: 'center' },
  dot: { width: (compactDots ? 5 : 8) * k, height: (compactDots ? 5 : 8) * k, borderRadius: (compactDots ? 5 : 8) * k / 2, backgroundColor: 'rgba(45,27,105,0.25)' },
  dotOn: { backgroundColor: '#FFB800' },
  pageControls: { flexDirection: 'row', alignItems: 'center', columnGap: 10 * k },
  pageBtn: {
    backgroundColor: '#2D1B69',
    borderRadius: 14 * k,
    paddingHorizontal: 10 * k,
    paddingVertical: 8 * k,
    minWidth: Math.max(72, 76 * k),
    alignItems: 'center',
  },
  pageBtnOff: { opacity: 0.35 },
  pageBtnText: { color: '#FFFFFF', fontSize: 15 * k, fontFamily: ff('fa', 'black') },
  recapCast: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 * k, marginBottom: 4 * k },
  lessonCard: { backgroundColor: '#FFF3C4', borderRadius: 12 * k, paddingHorizontal: 12 * k, paddingVertical: 8 * k, maxWidth: '94%' },
  lessonFa: { fontFamily: ff('fa', 'black'), color: PLAY_INK, fontSize: 15 * k },
  focusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 * k,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12 * k,
    paddingVertical: 6 * k,
    shadowColor: 'rgba(45,27,105,0.30)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 5,
  },
  focusFa: { fontFamily: ff('fa', 'black'), color: PLAY_INK, fontSize: 16 * k },
});
