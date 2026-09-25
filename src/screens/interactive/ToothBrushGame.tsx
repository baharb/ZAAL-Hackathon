import React, { useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, ImageBackground, PanResponder, StyleSheet, Text, View } from 'react-native';
import { useWindowDimensions } from '../../layout/PortraitFallback';
import * as Haptics from 'expo-haptics';
import TopBar, { topBarHeight } from '../../components/TopBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../../store/AppContext';
import { useNav } from '../../store/NavContext';
import { useLandscapeDimensions } from '../../hooks/useLandscapeDimensions';
import { dir, ff } from '../../theme/fonts';
import { neliWorldAssets, roomBackgroundPickers } from '../../assets/neliWorldAssets';
import { FA_AUDIO_KEYS, playFaAudioSequence, stopFaAudio } from '../../utils/faAudio';
import GameEndOverlay from '../../components/GameEndOverlay';

const NUM = 10;

const FOAM_POINTS = [
  { left: 0.16, top: 0.02, size: 15 },
  { left: 0.30, top: 0.00, size: 18 },
  { left: 0.46, top: 0.01, size: 16 },
  { left: 0.62, top: 0.03, size: 14 },
  { left: 0.78, top: 0.04, size: 12 },
  { left: 0.12, top: 0.12, size: 10 },
  { left: 0.24, top: 0.11, size: 12 },
  { left: 0.38, top: 0.10, size: 11 },
  { left: 0.52, top: 0.11, size: 13 },
  { left: 0.66, top: 0.12, size: 12 },
  { left: 0.80, top: 0.11, size: 10 },
  { left: 0.18, top: 0.22, size: 9 },
  { left: 0.34, top: 0.20, size: 11 },
  { left: 0.50, top: 0.21, size: 10 },
  { left: 0.68, top: 0.20, size: 9 },
  { left: 0.84, top: 0.19, size: 8 },
  { left: 0.28, top: 0.30, size: 8 },
  { left: 0.44, top: 0.28, size: 10 },
  { left: 0.60, top: 0.29, size: 9 },
  { left: 0.74, top: 0.28, size: 8 },
] as const;

const LILA_BRUSHING = require('../../../assets/neli-world/characters/Lila/lila_big_smile_640.webp');
const BUBBLE_IMAGE = require('../../../assets/neli-world/characters/bubbles_512.webp');
// All art below (brush, bubbles, dirt, sparkles) is authored in fixed px
// against the iPad mini reference, where faceSize caps at exactly 560 — see
// `faceSize` in the component. Every fixed dimension is multiplied by
// `artScale = faceSize / ART_REFERENCE_FACE_SIZE` before it's drawn, so
// tablets (which hit the cap) render unchanged and phones scale down with
// the character instead of the brush/bubbles overwhelming a smaller mouth.
const ART_REFERENCE_FACE_SIZE = 560;
const BRUSH_RENDER_WIDTH = 168;
const BRUSH_RENDER_HEIGHT = Math.round(BRUSH_RENDER_WIDTH * (889 / 512));
const BRUSH_START_RENDER_WIDTH = 112;
const BRUSH_START_RENDER_HEIGHT = Math.round(BRUSH_START_RENDER_WIDTH * (889 / 512));
const BRUSH_START_Y_SHIFT = 0;
const BUBBLE_LAYOUTS = [
  { left: 0.24, top: 0.30, size: 50 },
  { left: 0.40, top: 0.20, size: 56 },
  { left: 0.54, top: 0.18, size: 58 },
  { left: 0.66, top: 0.28, size: 52 },
  { left: 0.34, top: 0.54, size: 44 },
  { left: 0.56, top: 0.50, size: 46 },
  { left: 0.18, top: 0.46, size: 42 },
  { left: 0.72, top: 0.44, size: 40 },
  { left: 0.28, top: 0.72, size: 36 },
  { left: 0.44, top: 0.70, size: 40 },
  { left: 0.60, top: 0.68, size: 38 },
  { left: 0.74, top: 0.66, size: 34 },
] as const;
const FOOD_BITS = [
  { left: 0.17, top: 0.28, w: 8, h: 4, kind: 'carrot' },
  { left: 0.28, top: 0.70, w: 6, h: 6, kind: 'pea' },
  { left: 0.40, top: 0.34, w: 9, h: 4, kind: 'corn' },
  { left: 0.50, top: 0.76, w: 7, h: 5, kind: 'broccoli' },
  { left: 0.62, top: 0.30, w: 8, h: 4, kind: 'tomato' },
  { left: 0.74, top: 0.73, w: 6, h: 6, kind: 'pea' },
  { left: 0.34, top: 0.48, w: 5, h: 3, kind: 'broccoli' },
  { left: 0.66, top: 0.52, w: 5, h: 3, kind: 'carrot' },
] as const;
const CLEAN_SPARKLES = [
  { left: 0.28, top: 0.16, size: 16, glyph: '✦' },
  { left: 0.40, top: 0.06, size: 22, glyph: '★' },
  { left: 0.52, top: 0.10, size: 18, glyph: '✦' },
  { left: 0.64, top: 0.18, size: 16, glyph: '★' },
  { left: 0.34, top: 0.40, size: 14, glyph: '✦' },
  { left: 0.50, top: 0.38, size: 14, glyph: '★' },
  { left: 0.62, top: 0.42, size: 13, glyph: '✦' },
] as const;

function ToothbrushGraphic({ width, height }: { width: number; height: number }) {
  return <Image source={neliWorldAssets.bathroom.toothbrush} style={{ width, height }} resizeMode="contain" />;
}

function DirtyFoodBit({
  kind,
  width,
  height,
}: {
  kind: (typeof FOOD_BITS)[number]['kind'];
  width: number;
  height: number;
}) {
  const stylesByKind: any = {
    carrot: { backgroundColor: '#D98A2B', borderRadius: height * 0.4, transform: [{ rotate: '-16deg' }] },
    pea: { backgroundColor: '#8FCB55', borderRadius: height / 2, transform: [{ rotate: '10deg' }] },
    corn: { backgroundColor: '#F2D64A', borderRadius: height * 0.3, transform: [{ rotate: '6deg' }] },
    broccoli: { backgroundColor: '#5CB85C', borderRadius: height * 0.4, transform: [{ rotate: '-8deg' }] },
    tomato: { backgroundColor: '#D9584A', borderRadius: height / 2, transform: [{ rotate: '-12deg' }] },
  }[kind];
  return <View style={[styles.foodBit, stylesByKind, { width, height }]} />;
}

function LilaBrushCharacter({
  size,
  brushing,
}: {
  size: number;
  brushing: boolean;
}) {
  return (
    <View style={{ width: size, height: size * 1.22, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size, height: size * 1.22 }}>
        <Image source={LILA_BRUSHING} style={styles.lilaLayer} resizeMode="contain" />
      </View>
    </View>
  );
}

export default function ToothBrushGame() {
  const { lang, addStars } = useContext(AppContext);
  const { reset } = useNav();
  const { width, height } = useLandscapeDimensions();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Matches HomeScreen's tablet test: shortest edge >= 600dp in landscape.
  const isTablet = height >= 600;

  const [cleaned, setCleaned] = useState<boolean[]>(Array(NUM).fill(false));
  const [done, setDone] = useState(false);
  const [brushing, setBrushing] = useState(false);
  const [started, setStarted] = useState(false);
  const [finishVisible, setFinishVisible] = useState(false);
  const brushX = useRef(new Animated.Value(0)).current;
  const brushY = useRef(new Animated.Value(0)).current;
  const brushCenterRef = useRef({ x: 0, y: 0 });
  const doneSlide = useRef(new Animated.Value(420)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const scrub = useRef(new Animated.Value(0)).current;
  const sparklePulse = useRef(new Animated.Value(0)).current;
  const cleanedRef = useRef(cleaned);
  const doneRef = useRef(done);
  const zoneRef = useRef({ x: 0, y: 0, w: 1, h: 1 });
  const bubbleZoneRef = useRef({ x: 0, y: 0, w: 1, h: 1 });
  const gameAreaFrameRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const lilaFrameRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const lilaRef = useRef<View>(null);
  const gameAreaRef = useRef<any>(null);
  const brushStartedRef = useRef(false);
  const brushTouchStartCleanCountRef = useRef(0);
  const brushIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const brushIdleCuePlayedRef = useRef(false);
  const lastBubblePointRef = useRef({ x: 0, y: 0, active: false });
  const bubbleClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sparkleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layoutSyncTimerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const brushMetricsRef = useRef({
    width: BRUSH_RENDER_WIDTH,
    height: BRUSH_RENDER_HEIGHT,
    startHeight: BRUSH_START_RENDER_HEIGHT,
    tipOffsetX: BRUSH_RENDER_WIDTH / 2,
    tipOffsetY: BRUSH_RENDER_HEIGHT / 2,
  });
  const [showSparkles, setShowSparkles] = useState(false);
  const [showEndOverlay, setShowEndOverlay] = useState(false);
  const brushRadius = 48;
  const [mouthFrame, setMouthFrame] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const isLandscape = width > height;
  // The `480` floor inside this Math.max was meant to keep the character
  // legible on a tablet, where width/height-scaled terms alone can land a
  // bit small (~410-475). But Math.max applies it unconditionally — on
  // every phone (where both terms are well under 480) it became the
  // dominant value, pinning the character at ~560 (its height, at 1.22x,
  // ~680) regardless of the screen only being 360-440pt tall. That's why
  // it rendered with its head cut off behind the header. Phones already
  // get a sensible size from the width/height terms alone; keep the floor
  // but only high enough to matter once those terms are already close to
  // it (i.e. on a tablet), not overriding a phone's much smaller value.
  // (A further header-aware height cap was tried here too, but the
  // toothbrush's start position and mouth hotspot are placed by separate
  // faceSize-derived formulas below that assume this specific sizing —
  // capping just this value desynced the brush from the mouth. Fixing
  // that fully means re-deriving those formulas too; out of scope here.)
  const rawFaceSize = Math.min(Math.max(width * (isLandscape ? 0.38 : 0.62), height * (isLandscape ? 0.68 : 0.54)) * 1.2, 560);
  // The formula above sizes the character off screen width/height alone —
  // it has no idea how much vertical room the header actually leaves. On a
  // tablet that's never a problem (there's headroom to spare), but on a
  // short phone screen it can hand back a box taller than what's left below
  // the bar, pushing the head behind it and pinning the boots off the
  // bottom of the screen. Phones only: cap the box height (faceSize * 1.22)
  // to the space actually left under the bar so it never overlaps the
  // header — the vertical anchoring below (`gameArea`'s flex-end plus the
  // artScale-scaled translateY) keeps the same tablet-calibrated look at
  // whatever size comes out.
  const topBarH = topBarHeight(height, insets.top, { topInset: 10 });
  const gameAreaAvailableH = height - topBarH - 10;
  const faceSize = isTablet ? rawFaceSize : Math.min(rawFaceSize, gameAreaAvailableH / 1.22);
  // faceSize caps at ART_REFERENCE_FACE_SIZE on every tablet, so artScale is
  // exactly 1 there (unchanged look); it only shrinks below 1 on phones.
  const artScale = faceSize / ART_REFERENCE_FACE_SIZE;
  const brushRenderWidth = BRUSH_RENDER_WIDTH * artScale;
  const brushRenderHeight = BRUSH_RENDER_HEIGHT * artScale;
  const brushStartRenderHeight = BRUSH_START_RENDER_HEIGHT * artScale;
  const brushTipOffsetX = brushRenderWidth / 2;
  const brushTipOffsetY = brushRenderHeight / 2;
  const isFa = lang === 'fa' || lang === 'ar';
  const cleanCount = cleaned.filter(Boolean).length;
  const completed = cleanCount === NUM;
  const showFoodBits = !done && !showSparkles;
  const foodAreaOffsetY = (mouthFrame.h || faceSize * 0.12) * 0.5;
  const sceneSource = roomBackgroundPickers.brushTeethBathroom(width, height);
  const isPhysicalPortrait = screenHeight > screenWidth;

  useEffect(() => {
    brushMetricsRef.current = {
      width: brushRenderWidth,
      height: brushRenderHeight,
      startHeight: brushStartRenderHeight,
      tipOffsetX: brushTipOffsetX,
      tipOffsetY: brushTipOffsetY,
    };
  }, [brushRenderWidth, brushRenderHeight, brushStartRenderHeight, brushTipOffsetX, brushTipOffsetY]);

  useEffect(() => {
    cleanedRef.current = cleaned;
  }, [cleaned]);

  useEffect(() => {
    doneRef.current = done;
  }, [done]);

  useEffect(() => {
    void stopFaAudio();
    const id = setTimeout(() => {
      void playFaAudioSequence([FA_AUDIO_KEYS.toothbrush.brushLilaTeeth], 110);
    }, 450);
    return () => clearTimeout(id);
  }, [isFa, lang]);

  useEffect(() => {
    if (!completed || done) return;
    doneRef.current = true;
    setDone(true);
    setFinishVisible(true);
    clearBrushIdleTimer();
    setBrushing(false);
    setStarted(true);
    addStars(3);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.spring(doneSlide, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }).start();
    Animated.spring(scale, { toValue: 1.04, useNativeDriver: true }).start();
    if (bubbleClearTimerRef.current) clearTimeout(bubbleClearTimerRef.current);
    if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
    if (sparkleTimerRef.current) clearTimeout(sparkleTimerRef.current);
    const empty = Array(NUM).fill(false);
    bubbleClearTimerRef.current = setTimeout(() => {
      cleanedRef.current = empty;
      setCleaned(empty);
      setShowSparkles(false);
      sparkleTimerRef.current = setTimeout(() => {
        setShowSparkles(true);
        sparklePulse.setValue(0);
        requestAnimationFrame(() => placeBrushNearHead());
        void playFaAudioSequence([FA_AUDIO_KEYS.feedback.afarin], 100);
      }, 160);
    }, 120);
    completionTimerRef.current = setTimeout(() => {
      setShowSparkles(false);
      setShowEndOverlay(true);
    }, 2200);
  }, [addStars, completed, done, doneSlide, isFa, lang, scale]);

  useEffect(() => {
    if (!showSparkles) {
      sparklePulse.stopAnimation();
      sparklePulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sparklePulse, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(sparklePulse, { toValue: 0, duration: 420, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [showSparkles, sparklePulse]);

  useEffect(() => {
    if (!brushing || done) {
      scrub.stopAnimation();
      scrub.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(scrub, {
        toValue: 1,
        duration: 260,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [brushing, done, scrub]);

  useEffect(() => {
    return () => {
      if (bubbleClearTimerRef.current) clearTimeout(bubbleClearTimerRef.current);
      if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
      if (sparkleTimerRef.current) clearTimeout(sparkleTimerRef.current);
      if (brushIdleTimerRef.current) clearTimeout(brushIdleTimerRef.current);
      layoutSyncTimerRefs.current.forEach(clearTimeout);
      layoutSyncTimerRefs.current = [];
    };
  }, []);

  const clampBrushPosition = (x: number, y: number) => ({
    x: Math.max(12, Math.min(screenWidth - brushMetricsRef.current.width - 12, x)),
    y: Math.max(12, Math.min(screenHeight - brushMetricsRef.current.height - 12, y)),
  });

  const setBrushPosition = (x: number, y: number) => {
    const next = clampBrushPosition(x, y);
    brushCenterRef.current = next;
    brushX.setValue(next.x);
    brushY.setValue(next.y);
  };

  const placeBrushNearHead = () => {
    const area = zoneRef.current;
    if (area.w <= 0 || area.h <= 0) return;

    const game = gameAreaFrameRef.current;
    // Keep the brush just left of the mouth box, with the bristles starting at mouth level.
    const brushLeft = game.x + area.x - area.w * 2;
    const brushTop = game.y + area.y + area.h * 0.46 - brushMetricsRef.current.startHeight * 0.42;
    setBrushPosition(brushLeft, brushTop);
  };

  const syncLayouts = () => {
    requestAnimationFrame(() => {
      gameAreaRef.current?.measureInWindow((gameX: number, gameY: number, gameW: number, gameH: number) => {
        gameAreaFrameRef.current = { x: gameX, y: gameY, w: gameW, h: gameH };
        lilaRef.current?.measureInWindow((x: number, y: number, w: number, h: number) => {
          lilaFrameRef.current = { x, y, w, h };
          const mouthWidth = w * 0.18;
          const mouthHeight = h * 0.075;
          const mouthLeft = x - gameX + (w - mouthWidth) / 2;
          // Keep the box in the last-good vertical band.
          const mouthTop = y - gameY + h * 0.39;
          zoneRef.current = {
            x: mouthLeft,
            y: mouthTop,
            w: mouthWidth,
            h: mouthHeight,
          };
          bubbleZoneRef.current = {
            x: mouthLeft,
            y: mouthTop,
            w: mouthWidth,
            h: mouthHeight,
          };
          setMouthFrame({ x: mouthLeft, y: mouthTop, w: mouthWidth, h: mouthHeight });
          if (!brushStartedRef.current) {
            brushStartedRef.current = true;
            placeBrushNearHead();
          } else if (!started) {
            placeBrushNearHead();
          }
        });
      });
    });
  };

  useEffect(() => {
    layoutSyncTimerRefs.current.forEach(clearTimeout);
    layoutSyncTimerRefs.current = [0, 90, 220, 420].map(delay =>
      setTimeout(() => {
        syncLayouts();
      }, delay),
    );

    return () => {
      layoutSyncTimerRefs.current.forEach(clearTimeout);
      layoutSyncTimerRefs.current = [];
    };
  }, [faceSize, height, width]);

  const markTeeth = (pageX: number, pageY: number) => {
    if (doneRef.current) return false;

    const game = gameAreaFrameRef.current;
    const localX = pageX - game.x;
    const localY = pageY - game.y;
    const relX = localX - bubbleZoneRef.current.x;
    const relY = localY - bubbleZoneRef.current.y;
    const padX = bubbleZoneRef.current.w * 0.12;
    const padY = bubbleZoneRef.current.h * 0.18;
    const contact = relX >= -padX && relX <= bubbleZoneRef.current.w + padX && relY >= -padY && relY <= bubbleZoneRef.current.h + padY;

    if (!contact) return false;

    setStarted(true);
    const last = lastBubblePointRef.current;
    if (!last.active) {
      lastBubblePointRef.current = { x: localX, y: localY, active: true };
      return true;
    }

    const dx = localX - last.x;
    const dy = localY - last.y;
    const traveled = Math.hypot(dx, dy);
    last.x = localX;
    last.y = localY;
    if (traveled < 18) return true;

    const prev = cleanedRef.current;
    const i = prev.findIndex(v => !v);
    if (i < 0) return true;
    const next = [...prev];
    next[i] = true;
    cleanedRef.current = next;
    setCleaned(next);
    lastBubblePointRef.current = { x: localX, y: localY, active: true };
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(bounce, { toValue: -7, duration: 80, useNativeDriver: true }),
      Animated.spring(bounce, { toValue: 0, tension: 620, useNativeDriver: true }),
    ]).start();
    return true;
  };

  const clearBrushIdleTimer = () => {
    if (brushIdleTimerRef.current) {
      clearTimeout(brushIdleTimerRef.current);
      brushIdleTimerRef.current = null;
    }
  };

  const scheduleBrushIdleCue = () => {
    clearBrushIdleTimer();
    if (doneRef.current || brushIdleCuePlayedRef.current) return;
    brushIdleTimerRef.current = setTimeout(() => {
      const currentCleanCount = cleanedRef.current.filter(Boolean).length;
      if (!doneRef.current && currentCleanCount < NUM && lastBubblePointRef.current.active) {
        brushIdleCuePlayedRef.current = true;
      }
    }, 900);
  };

  const handleBrushEnd = () => {
    clearBrushIdleTimer();
    setBrushing(false);
    lastBubblePointRef.current.active = false;
    const currentCleanCount = cleanedRef.current.filter(Boolean).length;
    if (!doneRef.current && currentCleanCount < NUM) {
    }
  };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !doneRef.current,
    onMoveShouldSetPanResponder: () => !doneRef.current,
    onPanResponderGrant: e => {
      setBrushing(true);
      const pageX = e.nativeEvent.pageX;
      const pageY = e.nativeEvent.pageY;
      brushTouchStartCleanCountRef.current = cleanedRef.current.filter(Boolean).length;
      lastBubblePointRef.current = { x: pageX, y: pageY, active: true };
      setBrushPosition(pageX - brushMetricsRef.current.tipOffsetX, pageY - brushMetricsRef.current.tipOffsetY);
      markTeeth(pageX, pageY);
      scheduleBrushIdleCue();
    },
    onPanResponderMove: e => {
      const pageX = e.nativeEvent.pageX;
      const pageY = e.nativeEvent.pageY;
      setBrushPosition(pageX - brushMetricsRef.current.tipOffsetX, pageY - brushMetricsRef.current.tipOffsetY);
      markTeeth(pageX, pageY);
      scheduleBrushIdleCue();
    },
    onPanResponderRelease: handleBrushEnd,
    onPanResponderTerminate: handleBrushEnd,
  })).current;

  const resetGame = () => {
    const empty = Array(NUM).fill(false);
    cleanedRef.current = empty;
    doneRef.current = false;
    brushStartedRef.current = false;
    brushTouchStartCleanCountRef.current = 0;
    brushIdleCuePlayedRef.current = false;
    clearBrushIdleTimer();
    lastBubblePointRef.current = { x: 0, y: 0, active: false };
    if (bubbleClearTimerRef.current) clearTimeout(bubbleClearTimerRef.current);
    if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
    if (sparkleTimerRef.current) clearTimeout(sparkleTimerRef.current);
    setCleaned(empty);
    setDone(false);
    setFinishVisible(false);
    setShowSparkles(false);
    clearBrushIdleTimer();
    setBrushing(false);
    setStarted(false);
    doneSlide.setValue(420);
    scale.setValue(1);
    scrub.setValue(0);
    sparklePulse.setValue(0);
    requestAnimationFrame(() => {
      syncLayouts();
      placeBrushNearHead();
    });
  };

  return (
    <View style={styles.root}>
      <ImageBackground source={sceneSource} style={styles.scene} imageStyle={styles.sceneImage} resizeMode="cover">
        <TopBar title="Brush Teeth" titleFa="مسواک بزن" showClose dark topInset={10} onBack={() => reset({ name: 'Main', tab: 'Games' })} />

        {isTablet && !showSparkles && !done ? (
          <View style={styles.promptPill}>
            <Text style={[styles.progressTitle, dir(lang), { fontFamily: isFa ? ff('fa', 'black') : ff(lang, 'black') }]}>
              {isFa ? 'دندان‌های لی لا را مسواک بزن' : "Brush Lila's teeth"}
            </Text>
          </View>
        ) : null}

        <View
          ref={gameAreaRef}
          style={styles.gameArea}
          onLayout={syncLayouts}
          {...pan.panHandlers}
        >
          <Animated.View ref={lilaRef} onLayout={syncLayouts} style={[styles.lilaWrap, { transform: [{ translateY: bounce }, { scale }, { translateY: 92 * artScale }] }]}>
            <LilaBrushCharacter size={faceSize} brushing={brushing} />
          </Animated.View>

          <View
            style={[
              styles.mouthZone,
              {
                width: mouthFrame.w || faceSize * 0.2,
                height: mouthFrame.h || faceSize * 0.12,
                left: mouthFrame.x || faceSize * 0.39,
                top: mouthFrame.y || faceSize * 0.31,
              },
            ]}
          />

          {showFoodBits ? (
            <View
              pointerEvents="none"
              style={[
                styles.foodCloud,
                {
                  width: mouthFrame.w || faceSize * 0.2,
                  height: (mouthFrame.h || faceSize * 0.12) * 0.54,
                  left: mouthFrame.x || faceSize * 0.39,
                  top: (mouthFrame.y || faceSize * 0.31) + foodAreaOffsetY,
                },
              ]}
            >
                {FOOD_BITS.map((food, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.foodBitWrap,
                      {
                        left: `${food.left * 100}%`,
                        top: `${food.top * 100}%`,
                      },
                    ]}
                  >
                    <DirtyFoodBit kind={food.kind} width={food.w * artScale} height={food.h * artScale} />
                  </View>
                ))}
              </View>
            ) : null}

          <View
            pointerEvents="none"
            style={[
              styles.bubbleCloud,
              {
                width: bubbleZoneRef.current.w || mouthFrame.w || faceSize * 0.18,
                height: bubbleZoneRef.current.h || mouthFrame.h || faceSize * 0.075,
                left: (bubbleZoneRef.current.x || mouthFrame.x || faceSize * 0.39) - (bubbleZoneRef.current.w || mouthFrame.w || faceSize * 0.18) / 2,
                top: (bubbleZoneRef.current.y || mouthFrame.y || faceSize * 0.31) - (bubbleZoneRef.current.h || mouthFrame.h || faceSize * 0.075) / 2,
              },
            ]}
          >
            {cleaned.map((isCleaned, idx) => {
              if (!isCleaned) return null;
              const bubble = BUBBLE_LAYOUTS[idx];
              return (
                <Image
                  key={idx}
                  source={BUBBLE_IMAGE}
                  resizeMode="contain"
                  style={[
                    styles.bubbleImage,
                    {
                      left: `${bubble.left * 100}%`,
                      top: `${bubble.top * 100}%`,
                      width: bubble.size * 2 * artScale,
                      height: bubble.size * 2 * artScale,
                    },
                  ]}
                />
              );
            })}
          </View>

            {showSparkles ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.sparkleLayer,
                    {
                    left:
                      (bubbleZoneRef.current.x || mouthFrame.x || faceSize * 0.39) +
                      (bubbleZoneRef.current.w || mouthFrame.w || faceSize * 0.18) * 0.1,
                    top:
                      (bubbleZoneRef.current.y || mouthFrame.y || faceSize * 0.31) +
                      (bubbleZoneRef.current.h || mouthFrame.h || faceSize * 0.075) * 0.58,
                    width: bubbleZoneRef.current.w || mouthFrame.w || faceSize * 0.18,
                    height: bubbleZoneRef.current.h || mouthFrame.h || faceSize * 0.075,
                  },
                ]}
            >
              {CLEAN_SPARKLES.map((sparkle, idx) => (
                <Animated.View
                  key={idx}
                  style={[
                    styles.sparkleDot,
                    {
                      left: `${sparkle.left * 100}%`,
                      top: `${sparkle.top * 100}%`,
                      width: sparkle.size * artScale,
                      height: sparkle.size * artScale,
                      borderRadius: (sparkle.size * artScale) / 2,
                      opacity: sparklePulse.interpolate({
                        inputRange: [0, 0.4, 1],
                        outputRange: [0.15, 1, 0.05],
                      }),
                      transform: [
                        {
                          scale: sparklePulse.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0.4, 1.2, 0.65],
                          }),
                        },
                        { rotate: `${idx % 2 === 0 ? -14 : 14}deg` },
                      ],
                    },
                  ]}
                >
                  <Text style={[styles.sparkleGlyph, { fontSize: sparkle.size * artScale }]}>{sparkle.glyph}</Text>
                </Animated.View>
              ))}
            </View>
          ) : null}

        </View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.brushOverlay,
            isPhysicalPortrait ? styles.brushOverlayPortrait : null,
            { opacity: brushing || !done ? 1 : 0.96 },
          ]}
        >
          <Animated.View
            style={[
              styles.brushFollower,
              { width: brushRenderWidth, height: brushRenderHeight },
              {
                transform: [
                  {
                    translateX: scrub.interpolate({
                      inputRange: [0, 0.25, 0.5, 0.75, 1],
                      outputRange: [0, 3, -2, 2, 0],
                    }),
                  },
                  {
                    translateY: scrub.interpolate({
                      inputRange: [0, 0.25, 0.5, 0.75, 1],
                      outputRange: [0, -2, 2, -1, 0],
                    }),
                  },
                  { translateX: brushX },
                  { translateY: brushY },
                ],
              },
            ]}
          >
            <ToothbrushGraphic width={brushRenderWidth} height={brushRenderHeight} />
          </Animated.View>
        </Animated.View>

        <View style={styles.bottomControls} />
      </ImageBackground>
      {showEndOverlay && (
        <GameEndOverlay onGo={() => { setShowEndOverlay(false); reset({ name: 'Main', tab: 'Games' }); }} />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#4CD5ED' },
  scene: { flex: 1 },
  // Without an explicit imageStyle, react-native-web can leave the background
  // <img> unsized in some nested-flex layouts, so it falls back to its own
  // huge natural pixel size and only a random cropped sliver shows.
  sceneImage: { width: '100%', height: '100%' },
  promptPill: {
    alignSelf: 'center',
    minWidth: 250,
    maxWidth: 520,
    marginHorizontal: 18,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  progressTitle: { color: '#112B4C', fontSize: 16, marginBottom: 9 },
  gameArea: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', position: 'relative', paddingBottom: 10 },
  lilaWrap: { zIndex: 3, marginBottom: 0 },
  brushOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 20 },
  brushOverlayPortrait: { transform: [{ rotate: '-90deg' }] },
  mouthZone: {
    position: 'absolute',
    borderRadius: 999,
    zIndex: 8,
  },
  foodCloud: { position: 'absolute', zIndex: 9 },
  foodBitWrap: { position: 'absolute' },
  foodBit: {
    borderWidth: 1,
    borderColor: 'rgba(94, 54, 0, 0.28)',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 1.6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  teethDebug: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 0, 0, 0.95)',
    borderRadius: 14,
    zIndex: 9,
  },
  brushFollower: { position: 'absolute', alignItems: 'center', justifyContent: 'center', zIndex: 14 },
  lilaLayer: { position: 'absolute', left: 0, right: 0, top: 0, width: '100%', height: '100%' },
  lilaMouthWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  lilaMouthOpen: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  lilaMouthClosed: {
    width: '100%',
    height: '36%',
    borderRadius: 999,
  },
  lilaTeethStrip: { width: '72%', height: '20%', marginTop: 2, borderRadius: 10, backgroundColor: '#FFF8EE' },
  bubbleCloud: { position: 'absolute', zIndex: 12 },
  bubbleImage: { position: 'absolute' },
  sparkleLayer: { position: 'absolute', zIndex: 13 },
  sparkleDot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 247, 161, 0.18)',
    shadowColor: '#FFF56A',
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  sparkleGlyph: {
    color: '#FFDF4A',
    textShadowColor: 'rgba(255, 190, 0, 0.95)',
    textShadowRadius: 10,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontWeight: '900',
  },
  bottomControls: { paddingBottom: 14, alignItems: 'center' },
  sparkleBadge: { position: 'absolute', top: 12, right: 10, width: 76, height: 76, zIndex: 6 },
});
