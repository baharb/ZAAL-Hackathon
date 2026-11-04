// Picnic finale (quest v2, section 3). One real scene: the garden picture
// is pinned to the bottom so the grass always shows, the blanket lies on
// the grass in the child's chosen color, and the collected items are served
// on it — the counted fruit in a bowl, the dish on the big middle plate —
// with the trip balloons tied to the tree behind the blanket. Grandma and
// the buddy sit at the blanket's edges.
// Then a pretend-camera moment: flash + click, and the scene freezes into a
// polaroid that flies into the روزهای من album (device only, no uploads).
// No Modal here on purpose: every Modal needs a landscape prop on iPhone.

import React, { useContext, useEffect, useRef, useState } from 'react';
import { Animated, Image, LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { neliWorldAssets } from '../assets/neliWorldAssets';
import PopperCelebration from '../components/PopperCelebration';
import { AppContext } from '../store/AppContext';
import { dir, ff } from '../theme/fonts';
import { FaTestAudioKey } from '../assets/faTestAudio.generated';
import { noteAudioPlayerReleased } from '../utils/faAudio';
import { isQuestMuted, questPlay } from './questSound';
import { BUDDIES, BuddyId } from './buddyStore';
import { DisplayWord } from './questGroups';
import { COLOR_HEX } from './pickLists';
import { Story } from './stories';
import { gardenDrawnSize, gardenSourceSize } from './QuestBackdrop';
import { buddyPose } from './questTheme';
import { saveMyDay } from './myDaysStore';
import WordArt from './WordArt';
import { SoftShadow } from '../ui/playKit';
import { grandmaArtFor } from './grandmaArt';
import TopBar from '../components/TopBar';
import PicnicPhoto from './PicnicPhoto';
import GameEndOverlay from '../components/GameEndOverlay';
import SimpleBall from './SimpleBall';

// Lila's happy-at-the-end art: the waving lamb in yellow overalls, not
// the baker pose her shared 'celebration' art uses.
const LILA_HAPPY_END = require('../../assets/neli-world/characters/Lila/cheerful_lamb_waving_in_yellow_overalls.webp');

const QUEST_CAMERA = require('../../assets/neli-world/quest/camera.png');
import { IdleHand, IDLE_HAND_DELAY, useIdleHint } from './IdleHand';

const CLICK_SOUND = require('../../assets/audio/key-tap.wav');
const YAY_SOUND = require('../../assets/audio/yay-kids.wav');
const TREE_SRC = require('../../assets/neli-world/quest/landmarks/apple-tree.png');

const PLATE_SRC = require('../../assets/neli-world/kitchen/plate.webp');

// Reference height: a landscape phone is 360-440pt tall. k scales every
// size AND every offset so nothing is cut off on phones or tablets.
const FINALE_REFERENCE_H = 380;

function playClick() {
  if (isQuestMuted()) return;
  try {
    const player = createAudioPlayer(CLICK_SOUND);
    player.volume = 0.6;
    player.play();
    const subscription = player.addListener('playbackStatusUpdate', status => {
      if (status.isLoaded && status.didJustFinish) {
        subscription.remove();
        noteAudioPlayerReleased();
        try { player.remove(); } catch { /* best effort */ }
      }
    });
    setTimeout(() => { try { player.remove(); } catch { /* best effort */ } }, 1500);
  } catch {
    // Sound is a nice-to-have; the photo goes on without it.
  }
}

// Kids cheering "yay", played WITH the celebration when the photo is done.
function playYay() {
  if (isQuestMuted()) return;
  try {
    const player = createAudioPlayer(YAY_SOUND);
    player.volume = 0.7;
    player.play();
    const subscription = player.addListener('playbackStatusUpdate', status => {
      if (status.isLoaded && status.didJustFinish) {
        subscription.remove();
        noteAudioPlayerReleased();
        try { player.remove(); } catch { /* best effort */ }
      }
    });
    setTimeout(() => { try { player.remove(); } catch { /* best effort */ } }, 6000);
  } catch {
    // Sound is a nice-to-have; the celebration goes on without it.
  }
}

type PhotoPhase = 'none' | 'flash' | 'card' | 'flying' | 'saved';

export default function Finale({
  words,
  buddy,
  story,
  leveledUp,
  level,
  onDone,
  onAlbum,
  albumActive,
}: {
  words: DisplayWord[];
  buddy: BuddyId;
  story: Story;
  leveledUp: boolean;
  level: number;
  onDone: () => void;
  /** Open the My Days album on top of the picnic (back returns here). */
  onAlbum: () => void;
  /** True while the album overlay covers the picnic. */
  albumActive: boolean;
}) {
  const { lang } = useContext(AppContext);
  const { width: W, height: H } = useWindowDimensions();
  const isFa = lang === 'fa' || lang === 'ar';

  const [celebrating, setCelebrating] = useState(false);
  const [photoPhase, setPhotoPhase] = useState<PhotoPhase>('none');
  const [showCeleb, setShowCeleb] = useState(false);
  const pops = useRef(words.map(() => new Animated.Value(0))).current;
  const buddyBounce = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const photoTaken = useRef(false);
  const exitedRef = useRef(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The camera shows once Neli has announced it, so the child sees the
  // picnic scene first; the hand hint waits for the camera too.
  const [camReady, setCamReady] = useState(false);
  useEffect(() => {
    if (!celebrating) return;
    let live = true;
    void (async () => {
      await questPlay('quest/photo' as FaTestAudioKey, { awaitFinish: true });
      if (live) setCamReady(true);
    })();
    return () => {
      live = false;
    };
  }, [celebrating]);
  const camIdle = useIdleHint(camReady && photoPhase === 'none', IDLE_HAND_DELAY, 0);

  // The celebration ends the quest: confetti + yay cheer, then back.
  const safeExit = () => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    onDone();
  };

  // تمام! says see-you, then closes the quest — but never waits on the
  // clip: 2.5s at most, so the end always feels snappy.
  const finishQuest = async () => {
    if (exitedRef.current) return;
    setShowTamam(false);
    await Promise.race([
      questPlay('quest/see-you' as FaTestAudioKey, { awaitFinish: true }),
      new Promise(resolve => setTimeout(resolve, 2500)),
    ]);
    if (exitedRef.current) return;
    safeExit();
  };

  // Open the album instead of leaving: stop every pending timer first so
  // the auto-exit can never fire from behind the album overlay. The photo
  // sequence keeps its state — a card or flight interrupted here finishes
  // on return, so the picnic comes back clean with تمام! and no overlay.
  const openAlbum = () => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
    if (photoTimer.current) clearTimeout(photoTimer.current);
    onAlbum();
  };

  // After the album closes: an interrupted photo finishes now (clean
  // picnic plus تمام!), an already-finished one simply waits. Either way
  // the child is never trapped at the picnic.
  const albumWasActive = useRef(false);
  useEffect(() => {
    if (albumActive) {
      albumWasActive.current = true;
      return;
    }
    if (albumWasActive.current && photoTaken.current && !exitedRef.current) {
      albumWasActive.current = false;
      if (voicePending.current) {
        voicePending.current = false;
        void (async () => {
          await questPlay('quest/saved' as FaTestAudioKey, { awaitFinish: true });
          if (exitedRef.current) return;
          setShowTamam(true);
          armExit();
        })();
      } else if (photoPhaseRef.current !== 'saved') {
        finalizePhoto();
      } else {
        setShowTamam(true);
        if (!exitTimer.current) armExit();
      }
    } else {
      albumWasActive.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumActive]);

  // The real game area: this view sits below the title bar, so measure it
  // and size everything from the measurement. Until the first measurement,
  // fall back to the window size. Nothing may overflow this box.
  const [gameSize, setGameSize] = useState<{ w: number; h: number } | null>(null);
  const onGameLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w <= 0 || h <= 0) return;
    const next = { w: Math.round(w), h: Math.round(h) };
    setGameSize(prev => (prev && prev.w === next.w && prev.h === next.h ? prev : next));
  };
  const gw = gameSize?.w ?? W;
  const gh = gameSize?.h ?? H;
  const picnicDims = gardenSourceSize(story.background);
  const picnicDrawn = gardenDrawnSize(picnicDims.w, picnicDims.h, gw, gh);
  const k = gh / FINALE_REFERENCE_H;
  const insets = useSafeAreaInsets();
  const closeS = Math.max(48, Math.min(gh * 0.13, 56));

  // The 3 picks in quest order: fruit, color, dish.
  const fruitWord = words[0];
  const colorWord = words.find(w => w.id.startsWith('painting/color/')) ?? words[1];
  const dishWord = words.find(w => w.id.startsWith('cooking/name/')) ?? words[2];
  const fruitCount = fruitWord?.count ?? 1;
  // Only the child's chosen color floats over the picnic — never the
  // mixed box distractors.
  const balloonIds = colorWord ? [colorWord.id] : [];
  const blanketColor = (colorWord && COLOR_HEX[colorWord.id]) ?? '#E33E54';

  // Title uses the chosen buddy's name, never a hard-coded one.
  const buddyName = BUDDIES.find(b => b.id === buddy);
  const todayISO = new Date().toISOString().slice(0, 10);

  // Every size and offset below derives from k, so the whole scene fits a
  // 360pt-tall phone as well as a tablet.
  const levelFont = Math.min(15, Math.max(11, 12.5 * k));

  // Yellow square camera, bottom-center on its own strip below the
  // blanket — never on top of the food.
  const camS = Math.min(gh * 0.2, 110);
  const [showTamam, setShowTamam] = useState(false);
  // Finishing the photo exactly once: the saved voice plays unless the
  // album is covering the screen (then it replays on return), تمام!
  // shows, and the safety exit timer never arms behind the album.
  const savedSpoken = useRef(false);
  const voicePending = useRef(false);
  const albumActiveRef = useRef(albumActive);
  albumActiveRef.current = albumActive;
  const photoPhaseRef = useRef(photoPhase);
  photoPhaseRef.current = photoPhase;
  const armExit = () => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => void finishQuest(), 30000);
  };
  const finalizePhoto = () => {
    setPhotoPhase('saved');
    // The game-over card shows IMMEDIATELY — the saved voice plays in
    // the background and never delays the end screen.
    setShowTamam(true);
    if (!savedSpoken.current) {
      savedSpoken.current = true;
      if (!albumActiveRef.current) {
        // Saved voice first, then the yay cheer WITH the end celebration
        // (never overlapping another clip).
        void (async () => {
          await questPlay('quest/saved' as FaTestAudioKey, { awaitFinish: true });
          if (!exitedRef.current) playYay();
        })();
        armExit();
      } else {
        voicePending.current = true;
      }
    } else if (!albumActiveRef.current && !exitTimer.current) {
      armExit();
    }
  };

  // Blanket on the grass, lifted above the camera strip, in the child's
  // chosen color — the whole picnic fits even a 360pt-tall phone.
  const blanketW = Math.min(gw * 0.46, gh * 1.12, 430);
  const blanketH = blanketW * 0.6;
  const cols = 8;
  const rows = 4;
  const cell = blanketW / cols;
  const blanketBottom = camS + 10;

  // Served on the blanket: the counted fruit laid out on the real game
  // plate and the dish with no plate under it. The row is shrunk to fit
  // inside 90% of the blanket.
  const plateWraw = Math.min(blanketW * 0.42, blanketH * 1.0);
  const bigPlateRaw = Math.min(blanketW * 0.34, blanketH * 0.82);
  const foodGap = Math.max(3, 6 * k);
  const fitScale = Math.min(1, (blanketW * 0.9) / (plateWraw + bigPlateRaw + foodGap));
  const plateW = plateWraw * fitScale;
  const plateH = plateW * 0.82;
  const bigPlate = bigPlateRaw * fitScale;
  const fruitF = plateW * 0.3;
  // Fruit spots (fractions of the plate): a natural single layer, slight
  // overlaps like a real serving.
  const pileSpots = (n: number): [number, number, number][] => {
    switch (n) {
      case 1: return [[0.5, 0.46, 0]];
      case 2: return [[0.36, 0.47, -8], [0.64, 0.47, 8]];
      case 3: return [[0.3, 0.48, -8], [0.52, 0.43, 0], [0.72, 0.48, 8]];
      case 4: return [[0.26, 0.48, -8], [0.43, 0.45, -3], [0.6, 0.45, 3], [0.76, 0.48, 8]];
      default: return [[0.3, 0.52, -8], [0.5, 0.54, 0], [0.7, 0.52, 8], [0.4, 0.34, -4], [0.61, 0.34, 4]];
    }
  };

  // The cast stands right next to the blanket, both the same height, so
  // Grandma reads as AT the picnic instead of tiny at the far edge.
  const charH = gh * 0.384;
  const charW = charH * 0.85;
  // On the mat: each figure sits at a front corner of the blanket, at
  // most 28% of its width, centers 30% apart each way — the gap between
  // them is wide and they can never overlap, at any size.
  const matCharW = Math.min(blanketW * 0.44, charW * 1.8);
  const matCharH = matCharW / 0.85;
  const buddyCx = gw / 2 + (isFa ? 1 : -1) * blanketW * 0.27;
  const grandmaCx = gw / 2 - (isFa ? 1 : -1) * blanketW * 0.27;

  // Tree behind the blanket with the trip balloons tied to it.
  const treeH = Math.min(charH * 0.9, gh * 0.3);
  const treeW = treeH;
  const treeBottom = blanketBottom + blanketH * 0.55;
  // The camera floats over the middle of the scene and vanishes after
  // the photo, so the scene always owns the full height: the level pill
  // is an overlay too. The striped balls are capped so their tops always
  // stay inside the scene, even on a 360pt-tall phone.
  const sceneH = gh;
  const bsRaw = Math.min(charH * 0.42, 84);
  const bsMax = sceneH - 8 - (treeBottom + treeH - 6);
  const bs = Math.min(bsRaw, Math.max(24, bsMax));

  // Polaroid card size (also from k, so it fits small phones).
  const cardW = Math.min(gw * 0.44, gh * 0.92, 330);
  const cardPhotoH = cardW * 0.62;

  useEffect(() => {
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    pops.forEach((p, i) => {
      timers.push(
        setTimeout(() => {
          Animated.sequence([
            Animated.timing(p, { toValue: 1.12, duration: 200, useNativeDriver: true }),
            Animated.timing(p, { toValue: 1, duration: 220, useNativeDriver: true }),
          ]).start();
        }, 350 + i * 280),
      );
    });
    void (async () => {
      await new Promise(resolve => setTimeout(resolve, 350 + words.length * 280 + 500));
      if (!alive) return;
      // No roll-call of the picked names: the friends are already dancing
      // on screen, and repeating every name bores a 4-year-old. The picnic
      // speaks instead: arrived, yum — then celebrate.
      await questPlay('quest/arrived' as FaTestAudioKey, { awaitFinish: true });
      if (!alive) return;
      await questPlay('quest/yum' as FaTestAudioKey, { awaitFinish: true });
      if (!alive) return;
      setCelebrating(true);
      // Safety net: a child who never taps the camera still leaves.
      timers.push(setTimeout(() => {
        if (!alive) return;
        if (!photoTaken.current) safeExit();
      }, 90000));
      Animated.loop(
        Animated.sequence([
          Animated.timing(buddyBounce, { toValue: 1.1, duration: 350, useNativeDriver: true }),
          Animated.timing(buddyBounce, { toValue: 1, duration: 350, useNativeDriver: true }),
        ]),
      ).start();
    })();
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      if (exitTimer.current) clearTimeout(exitTimer.current);
      if (photoTimer.current) clearTimeout(photoTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const takePhoto = () => {
    if (photoTaken.current || !celebrating) return;
    photoTaken.current = true;
    // Save first (device only): date, buddy, picks and story id — plus
    // the counted fruit number and balloon colors so the album card can
    // show the same picnic scene.
    void saveMyDay({
      id: String(Date.now()),
      dateISO: todayISO,
      buddy,
      storyId: story.id,
      picks: words.map((w, i) => ({
        id: w.id,
        fa: w.fa,
        ...(i === 0 ? { count: fruitCount } : {}),
      })),
      colorHex: blanketColor,
      balloonIds,
    });
    playClick();
    setPhotoPhase('flash');
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 130, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start(() => {
      setPhotoPhase('card');
      // The moment the captured photo shows: yay + celebration together.
      // The ball stays on the ground beside the mat.
      setShowCeleb(true);
      playYay();
      cardAnim.setValue(0);
      Animated.timing(cardAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start(() => {
        // Let the child look at the captured photo briefly, then fly it
        // into the album and show the game-over card right away.
        photoTimer.current = setTimeout(() => {
          setPhotoPhase('flying');
          cardAnim.setValue(0);
          Animated.timing(cardAnim, { toValue: 1, duration: 650, useNativeDriver: true }).start(() => {
            // The album may have opened mid-flight: finalizePhoto skips the
            // voice and the exit timer behind the overlay; the return path
            // above replays the voice and arms the timer.
            finalizePhoto();
          });
        }, 2200);
      });
    });
  };

  // The polaroid flies from the center into the album chip (top-left).
  const flyX = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -gw * 0.3] });
  const flyY = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -gh * 0.32] });
  const flyScale = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] });
  const flyOpacity = cardAnim.interpolate({ inputRange: [0.7, 1], outputRange: [1, 0.2] });

  const servingOrder: { key: string; node: React.ReactNode }[] = [];
  if (fruitWord) {
    servingOrder.push({
      key: `plate-${fruitWord.id}`,
      node: (
        <View style={{ width: plateW, height: plateH }}>
          <Image
            source={PLATE_SRC}
            style={{ position: 'absolute', left: 0, top: 0, width: plateW, height: plateH }}
            resizeMode="contain"
            accessibilityLabel={isFa ? 'بشقاب' : 'Plate'}
          />
          {pileSpots(fruitCount).map(([fx, fy, rot], i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: fx * plateW - fruitF / 2,
                top: fy * plateH - fruitF / 2,
                transform: [{ rotate: `${rot}deg` }],
              }}
            >
              <WordArt word={fruitWord} size={fruitF} />
            </View>
          ))}
        </View>
      ),
    });
  }
  if (dishWord) {
    servingOrder.push({
      key: `big-${dishWord.id}`,
      node: <WordArt word={dishWord} size={bigPlate} />,
    });
  }

  return (
    <View style={styles.root} onLayout={onGameLayout}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 60, elevation: 60 }}>
        <TopBar title="Picnic with Grandma" titleFa="پیک‌نیک با مامان‌بزرگ" dark showClose onBack={safeExit} />
      </View>
      {/* Garden background, pinned to the bottom and oversized so its
          pale cloud band overflows off the top (never a half-cut strip),
          and the grass is always visible. */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: gw, height: gh, overflow: 'hidden' }}>
        <Image
          source={story.background}
          style={{ position: 'absolute', left: (gw - picnicDrawn.w) / 2, bottom: 0, width: picnicDrawn.w, height: picnicDrawn.h }}
          resizeMode="cover"
          accessibilityLabel={isFa ? 'باغ' : 'Garden'}
        />
      </View>
      {/* Absolute overlay: it must never take layout space, or the whole
          scene shifts when it appears. */}
      {leveledUp && (
        <View
          pointerEvents="none"
          style={[styles.levelPill, { position: 'absolute', top: Math.max(2, 4 * k), alignSelf: 'center', paddingHorizontal: Math.max(8, 12 * k) }]}
        >
          <Text
            style={[styles.level, { fontFamily: ff(lang, 'black'), fontSize: levelFont }, dir(lang)]}
            numberOfLines={1}
          >
            {isFa ? `سطح ${level}! ★` : `Level ${level}! ★`}
          </Text>
        </View>
      )}
      {/* Album chip below the X (never under it), so the buddy avatar
          (top-right) never covers it either. Tappable from the moment the
          photo shows: it opens the album on top of the picnic (back
          returns here), it never leaves. */}
      {(photoPhase === 'card' || photoPhase === 'flying' || photoPhase === 'saved') && (
        <TouchableOpacity
          onPress={openAlbum}
          activeOpacity={0.85}
          accessibilityLabel={isFa ? 'روزهای من' : 'My Days'}
          accessibilityRole="button"
          style={[styles.albumChip, { top: insets.top + 8 + closeS + 12, left: 12, paddingHorizontal: Math.max(8, 12 * k), zIndex: 45, elevation: 45 }]}
        >
          <View style={{ flexDirection: isFa ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
            <Image source={neliWorldAssets.ui.camera} style={{ width: levelFont, height: levelFont }} resizeMode="contain" />
            <Text style={[styles.albumChipText, { fontFamily: ff(lang, 'black'), fontSize: levelFont }, dir(lang)]}>
              {isFa ? 'روزهای من' : 'My Days'}
            </Text>
          </View>
        </TouchableOpacity>
      )}
      {/* One real scene: tree with balloons behind the blanket, blanket on
          the grass, cast at its edges. */}
      <View style={styles.scene}>
        <View
          style={[styles.treeWrap, { left: gw / 2 - treeW / 2, bottom: treeBottom, width: treeW, height: treeH }]}
          pointerEvents="none"
        >
          <Image
            source={TREE_SRC}
            style={{ width: treeW, height: treeH }}
            resizeMode="contain"
            accessibilityLabel={isFa ? 'درخت' : 'Tree'}
          />
        </View>
        {/* The chosen-color ball rests on the ground beside the mat.
            It never floats up. */}
        {balloonIds.length > 0 && (
          <View
            style={[
              styles.balloonRow,
              {
                left: Math.min(gw / 2 + blanketW / 2 + gw * 0.03, gw - bs * balloonIds.length - (balloonIds.length - 1) * 6 - 8),
                bottom: Math.max(6, blanketBottom - bs * 0.25),
                gap: 6,
              },
            ]}
            pointerEvents="none"
          >
            {balloonIds.map(id => (
              <SimpleBall key={id} color={COLOR_HEX[id] ?? '#CCCCCC'} size={bs} />
            ))}
          </View>
        )}
        {/* Soft contact shadow, tilted exactly like the mat. */}
        <View
          style={{
            position: 'absolute',
            left: gw / 2 - (blanketW * 1.04) / 2,
            bottom: blanketBottom - 2,
            width: blanketW * 1.04,
            height: Math.max(10, 12 * k),
            borderRadius: 999,
            backgroundColor: 'rgba(31,61,31,0.28)',
            transform: [{ rotate: '-3deg' }],
          }}
          pointerEvents="none"
        />
        <View
          style={[
            styles.blanket,
            {
              width: blanketW,
              height: blanketH,
              borderRadius: cell * 0.25,
              marginBottom: blanketBottom,
              // Slight tilt back into the ground plane so the mat lies on
              // the grass instead of looking pasted on top of it. The
              // dishes ride along in the same plane.
              transform: [{ perspective: 400 }, { rotateX: '18deg' }, { rotate: '-3deg' }],
              shadowColor: '#1F3D1F',
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: 0.35,
              shadowRadius: 7,
              elevation: 6,
            },
          ]}
        >
          <View style={[styles.cells, { width: blanketW, height: blanketH }]}>
            {Array.from({ length: cols * rows }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: cell,
                  height: blanketH / rows,
                  backgroundColor: (Math.floor(i / cols) + i) % 2 === 0 ? blanketColor : 'rgba(255,255,255,0.88)',
                }}
              />
            ))}
          </View>
          <View style={[styles.items, { gap: foodGap }]}>
            {servingOrder.map((s, i) => (
              <Animated.View key={s.key} style={{ transform: [{ scale: pops[i] ?? 1 }] }}>
                {s.node}
              </Animated.View>
            ))}
          </View>
        </View>
        {/* Both sit ON the picnic mat, one on each half, with a clear
            gap between them — never overlapped. */}
        <View
          style={[
            styles.buddySide,
            { left: buddyCx - matCharW / 2, bottom: blanketBottom + blanketH * 0.76, alignItems: 'center' },
          ]}
          pointerEvents="none"
        >
          <Animated.View style={{ transform: [{ scale: buddyBounce }], alignItems: 'center' }}>
            <Image
              source={celebrating && buddy === 'lila' ? LILA_HAPPY_END : buddyPose(buddy, celebrating ? 'celebration' : 'base')}
              style={{ width: matCharW, height: matCharH }}
              resizeMode="contain"
              accessibilityLabel={buddy}
            />
            <SoftShadow width={matCharW} />
          </Animated.View>
        </View>
        <View
          style={[
            styles.grandmaSide,
            { left: grandmaCx - matCharW / 2, bottom: blanketBottom + blanketH * 0.76, alignItems: 'center' },
          ]}
          pointerEvents="none"
        >
          <Image
            source={grandmaArtFor(buddy)}
            style={{ width: matCharW, height: matCharH }}
            resizeMode="contain"
            accessibilityLabel={isFa ? 'مادربزرگ' : 'Grandma'}
          />
          <SoftShadow width={matCharW} />
        </View>
      </View>
      {/* White camera flash. */}
      {photoPhase === 'flash' && (
        <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flashAnim }]} />
      )}
      {/* The frozen polaroid: card pops in, then flies into the album. */}
      {(photoPhase === 'card' || photoPhase === 'flying') && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.polaroid,
            {
              width: cardW,
              borderRadius: cardW * 0.04,
              padding: cardW * 0.04,
              transform: photoPhase === 'flying'
                ? [{ translateX: flyX }, { translateY: flyY }, { scale: flyScale }]
                : [{ scale: cardAnim }],
              opacity: photoPhase === 'flying' ? flyOpacity : 1,
            },
          ]}
        >
          <View style={[styles.polaroidPhoto, { height: cardPhotoH }]}>
            <PicnicPhoto
              background={story.background}
              grandma={grandmaArtFor(buddy)}
              buddy={buddy}
              fruitWord={fruitWord ?? null}
              fruitCount={fruitCount}
              dishWord={dishWord ?? null}
              balloonIds={balloonIds}
              colorHex={blanketColor}
              w={cardW - cardW * 0.08}
              h={cardPhotoH}
              radius={cardW * 0.02}
            />
          </View>
          <Text
            style={[styles.polaroidCaption, { fontFamily: ff(lang, 'black'), fontSize: Math.max(11, cardW * 0.055) }, dir(lang)]}
            numberOfLines={1}
          >
            {isFa ? `پیک‌نیک با ${buddyName?.fa ?? 'نلی'} • ${todayISO}` : `Picnic with ${buddyName?.en ?? 'Neli'} • ${todayISO}`}
          </Text>
        </Animated.View>
      )}
      {/* The yellow square camera sits bottom-center on its own strip
          below the blanket — never on the food. Tapping shows the picture,
          and the balloons rise while yay and the celebration play together.
          After the photo, تمام! takes the same spot. */}
      {camReady && photoPhase === 'none' && (
        <View pointerEvents="box-none" style={styles.camCenter}>
          <View>
            <TouchableOpacity
              onPress={takePhoto}
              activeOpacity={0.85}
              accessibilityLabel={isFa ? 'عکس بگیر!' : 'Take a photo!'}
              accessibilityRole="button"
            >
              <Image
                source={QUEST_CAMERA}
                style={{ width: camS * 3, height: camS * 3 }}
                resizeMode="contain"
                accessibilityLabel={isFa ? 'عکس بگیر!' : 'Take a photo!'}
              />
            </TouchableOpacity>
            {/* The direction hand sits right over the camera. */}
            {camIdle && (
              <View pointerEvents="none" style={styles.camHandOver}>
                <IdleHand size={camS * 0.9} />
              </View>
            )}
          </View>
        </View>
      )}
      {/* Game over, exactly like Feed Animals: the shared end overlay
          (countdown ring + «بریم بازی دیگه!») after the celebration. */}
      {showTamam && photoPhase === 'saved' && (
        <GameEndOverlay
          onGo={() => {
            setShowTamam(false);
            void finishQuest();
          }}
        />
      )}
      {/* The celebration bursts OVER the end overlay, with the yay. */}
      {showTamam && photoPhase === 'saved' && <PopperCelebration visible />}
      {showCeleb && <PopperCelebration visible />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', overflow: 'hidden', backgroundColor: '#8FD694', paddingTop: 6, paddingBottom: 6 },
  levelPill: {
    shadowColor: 'rgba(58,42,107,0.30)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 4,
    backgroundColor: 'rgba(255,253,245,0.94)',
    borderRadius: 999,
    paddingVertical: 3,
    maxWidth: '80%',
    overflow: 'hidden',
  },
  level: { color: '#B45309', textAlign: 'center' },
  albumChip: {
    position: 'absolute',
    shadowColor: 'rgba(58,42,107,0.30)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 4,
    backgroundColor: 'rgba(255,253,245,0.94)',
    borderRadius: 999,
    paddingVertical: 4,
  },
  albumChipText: { color: '#3A2A6B' },
  scene: { flex: 1, width: '100%', minHeight: 0, alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  treeWrap: { position: 'absolute', justifyContent: 'flex-end' },
  balloonRow: { position: 'absolute', flexDirection: 'row' },
  blanket: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  cells: { position: 'absolute', left: 0, top: 0, flexDirection: 'row', flexWrap: 'wrap' },
  items: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buddySide: { position: 'absolute', justifyContent: 'flex-end' },
  grandmaSide: { position: 'absolute', justifyContent: 'flex-end' },
  flash: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#FFFFFF' },
  polaroid: {
    position: 'absolute',
    alignSelf: 'center',
    // Over the ground in front of the mat, never up at the top.
    bottom: '5%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#170736',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  polaroidPhoto: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  polaroidCaption: { color: '#3A2A6B', marginTop: 6, textAlign: 'center' },
  camBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  // The child's own camera, no background, big and high on the page —
  // above the characters' heads.
  camCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: '7%',
    zIndex: 45,
    elevation: 45,
  },
  camBtn: {
    backgroundColor: '#FFB800',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(45,27,105,0.30)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 5,
  },
  tamamBtn: {
    backgroundColor: '#22C55E',
    borderBottomColor: '#15803D',
    borderBottomWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
    shadowColor: 'rgba(45,27,105,0.30)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 5,
  },
  tamamText: { color: '#FFFFFF' },
  camHandOver: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
    elevation: 6,
  },
  camHint: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
});
