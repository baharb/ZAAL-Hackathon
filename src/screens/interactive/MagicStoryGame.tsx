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
import { STORY_FOCUS_WORDS, StoryFocus, fallbackStory, validStoryLines } from '../../data/magicStory';
import { ROOM_ITEMS, RecognizedWord, RoomItem, matchRoomItem } from '../../data/roomItems';
import { BUDDIES, BuddyId, loadBuddy } from '../../quest/buddyStore';
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
  const [lines, setLines] = useState<string[] | null>(null);
  // Picture-book pages: one generated illustration per line, produced in
  // the background after the story lands. Until a page's picture arrives
  // (or if generation fails) the page keeps its buddy+friend art.
  const [scenes, setScenes] = useState<string[] | null>(null);
  const [pageArt, setPageArt] = useState<(string | null)[]>([]);
  const pageArtRef = useRef<(string | null)[]>([]);
  const [storyTitle, setStoryTitle] = useState('');
  const [recap, setRecap] = useState('');
  const [lesson, setLesson] = useState('');
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [pageIdx, setPageIdx] = useState(0);
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

  // The entry instruction speaks on open, once its recording ships.
  useEffect(() => {
    void playFaAudio('story/draw-or-photo');
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
        setError('Camera is off. Neli cannot see the room.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.5, base64: true, exif: false });
      const asset = res.canceled ? undefined : res.assets?.[0];
      if (!asset?.uri || !asset.base64) return;
      if (asset.base64.length > MAX_PHOTO_BASE64_CHARS) {
        setError('That photo is too big. Try again.');
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
        setError('نلی الان نمی‌تونه، دوباره امتحان کن');
        setPhoto(null);
        return;
      }
      const found = parseItems(named.text);
      if (!found) {
        setError('نلی چیزی نشناخت، یه عکس دیگه بگیر');
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
        setError('نلی چیزی نشناخت، یه عکس دیگه بگیر');
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
      setError('Camera did not open. Try again.');
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
      setError('اول یه چیزی بکش، بعد جادویی‌اش کن!');
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
        setError('نلی الان نمی‌تونه، دوباره امتحان کن');
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
        `Setting: a cozy home day. ` +
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
      <GameBg pick={roomBackgroundPickers.garden} />

      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 60, elevation: 60 }}>
        <TopBar title="قصه جادویی" titleFa="قصه جادویی" dark showClose onBack={() => navigate({ name: 'MagicGames' })} />
      </View>

      {/* Center stage: camera → cast → story. */}
      {!showingNote ? (
        <View style={s.stage}>
          {!photo && cast.length === 0 ? (
            <>
              <View style={s.bubble}>
                <Text style={[s.bubbleText, dir('fa'), { textAlign: 'center' }]}>از اتاقت عکس بگیر یا نقاشی بکش!</Text>
              </View>
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
              <View style={s.roomRow}>
                {roomCartoon ? (
                  <CartoonSticker uri={roomCartoon} size={Math.min(110 * k, H * 0.24)} tilt={-6} />
                ) : photo ? (
                  <StickerFrame size={Math.min(110 * k, H * 0.24)} tilt={-6}>
                    <ToonPhoto uri={photo.uri} size={Math.min(110 * k, H * 0.24) * 0.78} />
                  </StickerFrame>
                ) : null}
                <View style={s.bubbleSmall}>
                  <Text style={[s.bubbleSmallText, dir('fa'), { textAlign: 'center' }]}>کدوم دوست توی قصه باشه؟</Text>
                </View>
              </View>
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
          {error ? <Text style={s.error}>{error}</Text> : null}
        </View>
      ) : null}

      {/* Story paper note: one picture page at a time, recap last. */}
      {showingNote ? (
        <View style={s.noteWrap} pointerEvents="box-none">
          <View style={[s.note, { width: Math.min(W * 0.62, 620), maxHeight: H * 0.9 }]}>
            <View style={s.tapeLeft} />
            <View style={s.tapeRight} />
            {asking || !lines ? (
              <View style={s.noteThinking}>
                <BuddyGuide mood="thinking" size={64 * k} />
                <ThinkingDots size={12 * k} />
              </View>
            ) : (
              <View style={s.page}>
                {isTitle ? (
                  <>
                    <View style={s.recapCast}>
                      <Image
                        source={buddyArt}
                        style={{ width: Math.min(72 * k, H * 0.16), height: Math.min(72 * k, H * 0.16) }}
                        resizeMode="contain"
                      />
                      {friend ? <CastSticker m={friend} size={Math.min(72 * k, H * 0.16)} tilt={-6} /> : null}
                    </View>
                    <Text style={[s.titleFa, dir('fa'), { textAlign: 'center' }]}>{storyTitle}</Text>
                  </>
                ) : !isRecap ? (
                  <>
                    {pageArt[storyIdx] ? (
                      <Image
                        source={{ uri: pageArt[storyIdx]! }}
                        style={[s.pageIllustration, { height: artH }]}
                        resizeMode="cover"
                      />
                    ) : (
                    <View style={[s.pageArt, { height: artH }]}>
                      {roomCartoon ? (
                        <CartoonSticker uri={roomCartoon} size={artH * 0.9} tilt={-6} />
                      ) : photo ? (
                        <ToonPhoto uri={photo.uri} size={artH} />
                      ) : friend?.heroUri ? (
                        <CartoonSticker uri={friend.heroUri} size={artH * 0.9} tilt={-6} />
                      ) : null}
                      <View style={s.pageFigure}>
                        <Image
                          source={buddyArt}
                          style={{ width: artH * 0.44, height: artH * 0.44 }}
                          resizeMode="contain"
                        />
                      </View>
                      {friend ? (
                        <View style={s.pageFriend}>
                          <CastSticker m={friend} size={artH * 0.44} tilt={-6} />
                        </View>
                      ) : null}
                    </View>
                    )}
                    <Text style={[s.line, dir('fa'), { textAlign: 'center' }]}>{lines[storyIdx]}</Text>
                  </>
                ) : (
                  <>
                    <View style={s.recapCast}>
                      <Image
                        source={buddyArt}
                        style={{ width: Math.min(64 * k, H * 0.14), height: Math.min(64 * k, H * 0.14) }}
                        resizeMode="contain"
                      />
                      {friend ? <CastSticker m={friend} size={Math.min(64 * k, H * 0.14)} tilt={-6} /> : null}
                    </View>
                    {recap ? <Text style={[s.line, dir('fa'), { textAlign: 'center' }]}>{recap}</Text> : null}
                    {lesson ? (
                      <View style={s.lessonCard}>
                        <Text style={[s.lessonFa, dir('fa'), { textAlign: 'center' }]}>یاد گرفتیم: {lesson}</Text>
                      </View>
                    ) : null}
                    {focus ? (
                      <TouchableOpacity style={s.focusChip} onPress={speakFocus} activeOpacity={0.85}>
                        <WordArt art={WORD_ART[focus.id] ?? null} emoji={focus.emoji} size={30 * k} />
                        <Text style={[s.focusFa, dir('fa')]}>{focus.fa}</Text>
                        <Image source={neliWorldAssets.ui.voice} style={{ width: 30 * k, height: 30 * k }} resizeMode="contain" />
                      </TouchableOpacity>
                    ) : null}
                  </>
                )}
                <View style={s.pageControls}>
                  <TouchableOpacity
                    style={[s.pageBtn, safeIdx === 0 && s.pageBtnOff]}
                    disabled={safeIdx === 0}
                    onPress={() => { tap(); setPageIdx(safeIdx - 1); }}
                    activeOpacity={0.85}
                  >
                    <Text style={s.pageBtnText}>قبلی</Text>
                  </TouchableOpacity>
                  <View style={s.dots}>
                    {Array.from({ length: totalSlides }).map((_, i) => (
                      <View key={i} style={[s.dot, i === safeIdx && s.dotOn]} />
                    ))}
                  </View>
                  {idleHint && !isRecap ? <IdleHand size={26 * k} /> : null}
                  <TouchableOpacity
                    style={s.pageBtn}
                    onPress={() => { tap(); setPageIdx(safeIdx >= totalSlides - 1 ? 0 : safeIdx + 1); }}
                    activeOpacity={0.85}
                  >
                    <Text style={s.pageBtnText}>{safeIdx >= totalSlides - 1 ? 'از اول' : 'بعدی'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      ) : null}

      {error && showingNote ? (
        <View style={s.errorWrap} pointerEvents="none">
          <Text style={s.error}>{error}</Text>
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
  castRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 * k, maxWidth: 560 },
  castFa: { color: '#FFFFFF', fontSize: 13 * k, fontFamily: ff('fa', 'black'), textShadowColor: 'rgba(46,26,107,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3, marginTop: 2 * k, maxWidth: 84 * k },
  extraFa: { color: '#FFFFFF', fontSize: 12 * k, fontFamily: ff('fa', 'regular'), textShadowColor: 'rgba(46,26,107,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  retake: { color: '#FFFFFF', fontSize: 13 * k, fontFamily: ff('fa', 'black'), textDecorationLine: 'underline', textShadowColor: 'rgba(46,26,107,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  error: { color: '#DC2626', backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 10 * k, paddingHorizontal: 12 * k, paddingVertical: 6 * k, fontSize: 13 * k, overflow: 'hidden', textAlign: 'center' as const },
  errorWrap: { position: 'absolute', bottom: 12 * k, alignSelf: 'center', maxWidth: '86%' },
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
