import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, ImageBackground, LayoutAnimation, PanResponder, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import TopBar from '../../components/TopBar';
import { AppContext } from '../../store/AppContext';
import { useNav } from '../../store/NavContext';
import { useLandscapeDimensions } from '../../hooks/useLandscapeDimensions';
import { dir, ff } from '../../theme/fonts';
import { SOLAR_SYSTEM_BACKGROUND, SOLAR_SYSTEM_PLANETS, SolarSystemPlanet } from '../../assets/solarSystemPuzzle';
import { getSolarSystemAudioKey, playFaAudio, FA_AUDIO_KEYS } from '../../utils/faAudio';
import GameEndOverlay from '../../components/GameEndOverlay';

type StageSize = { width: number; height: number };
type Rect = { x: number; y: number; w: number; h: number };

// ─── Inline celebration ───────────────────────────────────────────────────────

const CELEB_COLORS = ['#FF3B5C', '#FF9500', '#FFD60A', '#34C759', '#007AFF', '#BF5AF2', '#FF6B9D', '#00C7BE'];

type CelebShape = 'circle' | 'roundedSquare' | 'star';

type CelebParticle = {
  id: number;
  color: string;
  shape: CelebShape;
  sx: number;       // absolute start X
  sy: number;       // absolute start Y (= H)
  peakDx: number;  // translateX at peak
  peakDy: number;  // translateY at peak (negative = up)
  fallDx: number;  // translateX at end (targetX - sx)
  finalDy: number; // translateY at end (positive, exits below screen)
  pt: number;      // normalised time when peak is reached
  delay: number;   // normalised launch delay
  fi: number;      // normalised fade-in complete time
  size: number;
  spin: number;
};

function buildCelebParticles(W: number, H: number): CelebParticle[] {
  const PER = 60;
  const fanRad = 1.169; // ±67°
  const peakF  = 1.45;
  const riseT  = 0.12;
  const starRatio = 0.70;
  const particles: CelebParticle[] = [];
  let id = 0;
  function rnd(a: number, b: number) { return a + Math.random() * (b - a); }
  function pickShape(): CelebShape {
    const r = Math.random();
    if (r < starRatio) return 'star';
    return r < starRatio + (1 - starRatio) / 2 ? 'circle' : 'roundedSquare';
  }

  [W * 0.20, W * 0.50, W * 0.80].forEach(cx => {
    for (let i = 0; i < PER; i++) {
      const delay   = rnd(0, 0.05);
      const pt      = Math.min(delay + riseT + rnd(-0.02, 0.02), 0.88);
      const fi      = Math.min(delay + 0.04, pt - 0.01);
      const spd     = rnd(0.85, 1.25);
      const angle   = rnd(-fanRad, fanRad);
      const pH      = H * peakF * spd;
      const peakDx  = Math.sin(angle) * pH;
      // Guarantee items reach upper screen even at shallow angles
      const peakDy  = Math.min(-H * 0.65, -Math.cos(angle) * pH);
      const targetX = rnd(W * -0.05, W * 1.05);
      const fallDx  = targetX - cx;
      const finalDy = rnd(H * 1.05, H * 1.40); // always exits below canvas
      const sh = pickShape();
      const sz = sh === 'star' ? Math.round(rnd(8, 18)) : Math.round(rnd(5, 11));
      particles.push({
        id: id++,
        color: CELEB_COLORS[id % CELEB_COLORS.length]!,
        shape: sh,
        sx: cx, sy: H,
        peakDx, peakDy, fallDx, finalDy,
        pt, delay, fi, size: sz,
        spin: rnd(200, 600) * (Math.random() > 0.5 ? 1 : -1),
      });
    }
  });
  return particles;
}

function CelebParticleView({ p, anim }: { p: CelebParticle; anim: Animated.Value }) {
  const { pt, delay, fi, peakDy, peakDx, finalDy, fallDx } = p;
  const du = Math.max(pt - delay, 0.001);
  const df = Math.max(1.0 - pt,  0.001);

  // Y: rise with quadratic ease-out, fall with fp^0.8 gravity
  // KEY FIX: fp = (t-pt)/(1-pt) → always reaches 1.0 at t=1, particles ALWAYS exit screen
  const rSteps = [0, 0.35, 0.65, 1.0];
  const fSteps = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  const yIn  = [
    ...rSteps.map(r => delay + r * du),
    ...fSteps.slice(1).map(f => pt + f * df),
  ];
  const yOut = [
    ...rSteps.map(r => peakDy * (2 * r - r * r)),
    ...fSteps.slice(1).map(f => peakDy + (finalDy - peakDy) * Math.pow(f, 1.6)),
  ];

  // X: linear rise → explosive spread on fall (fp^0.20 — most spread in first 8% of fall)
  const xFSteps = [0, 0.08, 0.2, 0.45, 1.0];
  const xIn  = [delay, ...xFSteps.map(f => pt + f * df)];
  const xOut = [0,     ...xFSteps.map(f => peakDx + (fallDx - peakDx) * Math.pow(f, 0.20))];

  const isStar  = p.shape === 'star';
  const radius  = p.shape === 'circle' ? p.size / 2 : p.size * 0.28;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: p.sx - p.size / 2,
        top:  p.sy - p.size / 2,
        width:  isStar ? p.size * 1.2 : p.size,
        height: isStar ? p.size * 1.2 : p.size,
        borderRadius: isStar ? 0 : radius,
        backgroundColor: isStar ? 'transparent' : p.color,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: anim.interpolate({
          inputRange:  [delay, fi, 1.0],
          outputRange: [0, 1, 1],
          extrapolate: 'clamp',
        }),
        transform: [
          { translateX: anim.interpolate({ inputRange: xIn,  outputRange: xOut, extrapolate: 'clamp' }) },
          { translateY: anim.interpolate({ inputRange: yIn,  outputRange: yOut, extrapolate: 'clamp' }) },
          { rotate: anim.interpolate({
              inputRange:  [delay, 1],
              outputRange: ['0deg', `${p.spin}deg`],
              extrapolate: 'clamp',
          }) },
        ],
      }}
    >
      {isStar && (
        <Text style={{ fontSize: p.size, color: p.color, fontWeight: '900', lineHeight: p.size * 1.2 }}>{'★'}</Text>
      )}
    </Animated.View>
  );
}
const TTS = (l: string) => ({ fa: 'fa-IR', ar: 'fa-IR', zh: 'zh-CN', ko: 'ko-KR', fr: 'fr-FR', es: 'es-ES' } as any)[l] ?? 'en-US';
const RATE = (l: string) => (l === 'fa' || l === 'ar' ? 0.65 : 0.8);
const SETTLE_MS = 600;
const PLANET_NAME_EN: Record<string, string> = {
  mercury: 'Mercury',
  venus: 'Venus',
  earth: 'Earth',
  moon: 'Moon',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
};
type PlanetLayout = SolarSystemPlanet & {
  start: Rect;
  target: Rect;
  centerY: number;
  slotDiameter: number;
  imageH: number;
  labelH: number;
  zIndex: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function animatePlanetSettle() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

async function safeImpact() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

async function safeSuccess() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
}

function buildLayout(stage: StageSize): PlanetLayout[] {
  const trayPlanets = SOLAR_SYSTEM_PLANETS.filter(planet => planet.id !== 'moon');
  const cols = trayPlanets.length;
  const trayTop = Math.round(stage.height * 0.84);
  const trayHeight = Math.max(84, stage.height - trayTop - 10);
  const cellW = stage.width / cols;
  const cellH = trayHeight;
  const planetBaseSize = 51.84;
  const labelH = 18;
  const traySize = 66;
  const pieceH = traySize + 6 + labelH;
  const trayOrder = [3, 4, 6, 0, 7, 1, 5, 2];
  const trayIndexById = new Map(trayPlanets.map((planet, index) => [planet.id, index]));

  return SOLAR_SYSTEM_PLANETS.map((planet, index) => {
    const size = Math.round(planetBaseSize * planet.sizeFactor);
    const trayIndex = trayOrder[trayIndexById.get(planet.id) ?? index] ?? (trayIndexById.get(planet.id) ?? index);
    const col = trayIndex % cols;
    const startLeft = Math.round(col * cellW + (cellW - traySize) / 2);
    const startTop = Math.round(trayTop + (cellH - pieceH) / 2);
    const targetLeft = Math.round(stage.width * planet.slotX - size / 2);
    const centerY = Math.round(stage.height * planet.slotY);
    const targetTop = Math.round(centerY - size / 2);
    return {
      ...planet,
      start: { x: startLeft, y: startTop, w: traySize, h: pieceH },
      target: { x: targetLeft, y: targetTop, w: size, h: size },
      centerY,
      slotDiameter: traySize,
      imageH: traySize,
      labelH,
      zIndex: 10 + index,
    };
  });
}

function PlanetPiece({
  planet,
  onPlaced,
  onActivate,
  isActive,
  lang,
}: {
  planet: PlanetLayout;
  onPlaced: (id: string) => void;
  onActivate: (id: string | null) => void;
  isActive: boolean;
  lang: string;
}) {
  const draggedRef = useRef(false);
  const [size, setSize] = useState({ w: planet.start.w, h: planet.start.h });
  const [imageH, setImageH] = useState(planet.imageH);
  const [placed, setPlaced] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [settling, setSettling] = useState(false);
  const [showPressedLabel, setShowPressedLabel] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const xAnim = useRef(new Animated.Value(planet.start.x)).current;
  const yAnim = useRef(new Animated.Value(planet.start.y)).current;
  // Stable refs so the PanResponder below isn't rebuilt (and an in-progress
  // drag lost) whenever the parent re-renders and hands down new callback
  // function identities.
  const onActivateRef = useRef(onActivate);
  onActivateRef.current = onActivate;
  const onPlacedRef = useRef(onPlaced);
  onPlacedRef.current = onPlaced;

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => !placed,
        onMoveShouldSetPanResponderCapture: () => !placed,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          setShowPressedLabel(true);
          draggedRef.current = false;
          setPressed(true);
          setSettling(false);
          onActivateRef.current(planet.id);
          const isFa = lang === 'fa' || lang === 'ar';
          const spokenName = isFa ? planet.labelFa : (PLANET_NAME_EN[planet.id] ?? planet.labelFa);
          const audioKey = isFa ? getSolarSystemAudioKey(planet.id) : null;
          if (audioKey) {
            void playFaAudio(audioKey);
          } else {
            Speech.stop();
            Speech.speak(spokenName, {
              language: TTS(lang),
              rate: RATE(lang),
              pitch: 1.16,
            });
          }
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 180,
            useNativeDriver: true,
          }).start();
          void safeImpact();
        },
        onPanResponderMove: (_evt, gestureState) => {
          if (placed) return;
          xAnim.setValue(planet.start.x + gestureState.dx);
          yAnim.setValue(planet.start.y + gestureState.dy);
          if (Math.abs(gestureState.dx) + Math.abs(gestureState.dy) > 8) {
            draggedRef.current = true;
          }
        },
        onPanResponderRelease: (_evt, gestureState) => {
          setShowPressedLabel(false);
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }).start();
          if (placed) {
            setPressed(false);
            onActivateRef.current(null);
            return;
          }
          setPressed(false);
          const moved = draggedRef.current || Math.abs(gestureState.dx) + Math.abs(gestureState.dy) > 8;
          const settleToTarget = () => {
            Animated.parallel([
              Animated.timing(xAnim, {
                toValue: planet.target.x,
                duration: SETTLE_MS,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(yAnim, {
                toValue: planet.target.y,
                duration: SETTLE_MS,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
            ]).start(() => { setSettling(false); });
            // Fire immediately so celebration doesn't wait for settle animation
            onPlacedRef.current(planet.id);
          };
          if (!moved) {
            animatePlanetSettle();
            setSettling(true);
            setPlaced(true);
            setShowPressedLabel(false);
            setSize({ w: planet.target.w, h: planet.target.w });
            setImageH(planet.target.w);
            settleToTarget();
            onActivateRef.current(null);
            return;
          }

          animatePlanetSettle();
          setSettling(true);
          void safeSuccess();
          setPlaced(true);
          setShowPressedLabel(false);
          setSize({ w: planet.target.w, h: planet.target.w });
          setImageH(planet.target.w);
          settleToTarget();
          onActivateRef.current(null);
        },
        onPanResponderTerminate: () => {
          setShowPressedLabel(false);
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }).start();
          if (placed) {
            setPressed(false);
            onActivateRef.current(null);
            return;
          }
          setPressed(false);
          animatePlanetSettle();
          setSettling(true);
          setSize({ w: planet.target.w, h: planet.target.w });
          setImageH(planet.target.w);
          Animated.parallel([
            Animated.timing(xAnim, {
              toValue: planet.target.x,
              duration: SETTLE_MS,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(yAnim, {
              toValue: planet.target.y,
              duration: SETTLE_MS,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]).start(() => {
            setSettling(false);
          });
          onActivateRef.current(null);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [lang, planet.id, planet.labelFa, planet.start.x, planet.start.y, planet.target.h, planet.target.w, planet.target.x, planet.target.y, placed, size.h, size.w, xAnim, yAnim],
  );

  useEffect(() => {
    if (!placed) return;
    setSettling(false);
  }, [placed]);

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.piece,
        {
          left: 0,
          top: 0,
          width: size.w,
          height: size.h,
          zIndex: placed ? 1000 + planet.zIndex : isActive ? 900 + planet.zIndex : planet.zIndex,
          opacity: pressed || settling ? 0.99 : 1,
          transform: [
            { translateX: xAnim },
            { translateY: yAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
      >
      <Image source={planet.source} style={[styles.pieceImage, { height: imageH }]} resizeMode="contain" />
      {planet.id !== 'moon' && (!placed || showPressedLabel) ? (
        <View
          style={[
            styles.labelPill,
          ]}
          pointerEvents="none"
        >
          <Text style={[styles.labelText, { fontFamily: ff('fa', 'bold') }]} numberOfLines={1}>
            {planet.labelFa}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

export default function SolarSystemPuzzleGame() {
  const { lang, addStars } = useContext(AppContext);
  const { reset } = useNav();
  const { width, height } = useLandscapeDimensions();
  const [stageSize, setStageSize] = useState<StageSize>({ width: 0, height: 0 });
  const [placedCount, setPlacedCount] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [placedIds, setPlacedIds] = useState<string[]>([]);
  const [celebParticles, setCelebParticles] = useState<CelebParticle[]>([]);
  const [showEndOverlay, setShowEndOverlay] = useState(false);
  const celebAnim = useRef(new Animated.Value(0)).current;
  const celebPlayedRef = useRef(false);
  const prebuiltParticlesRef = useRef<CelebParticle[]>([]);
  const placedIdsRef = useRef<string[]>([]);
  const placedCountRef = useRef(0);
  const isFa = lang === 'fa' || lang === 'ar';

  // Pre-build celebration particles as soon as stage size is known,
  // so startCelebration has zero computation cost when the last planet is placed.
  useEffect(() => {
    if (stageSize.width && stageSize.height) {
      prebuiltParticlesRef.current = buildCelebParticles(stageSize.width, stageSize.height);
    }
  }, [stageSize]);

  const layout = useMemo(() => {
    if (!stageSize.width || !stageSize.height) return [];
    return buildLayout(stageSize);
  }, [stageSize]);

  const draggableLayout = useMemo(() => layout.filter(planet => planet.id !== 'moon'), [layout]);
  const moonLayout = useMemo(() => layout.find(planet => planet.id === 'moon') ?? null, [layout]);
  const allPlaced = placedCount >= draggableLayout.length;
  const bottomTrayHeight = useMemo(() => {
    if (!draggableLayout.length) return 84;
    return Math.max(84, Math.max(...draggableLayout.map(item => item.start.h)) + 10);
  }, [draggableLayout]);

  const startCelebration = () => {
    if (celebPlayedRef.current || !stageSize.width || !stageSize.height) return;
    celebPlayedRef.current = true;
    // Delay afarin so the last planet's name audio (played on touch-down) finishes first
    setTimeout(() => { void playFaAudio(FA_AUDIO_KEYS.feedback.afarin); }, 1600);
    // Defer one frame so the drop gesture commit renders first, then mount particles
    requestAnimationFrame(() => {
      setCelebParticles(prebuiltParticlesRef.current);
      celebAnim.setValue(0);
      Animated.timing(celebAnim, {
        toValue: 1,
        duration: 5000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => {
        setCelebParticles([]);
        celebAnim.setValue(0);
        setShowEndOverlay(true);
      });
    });
  };

  const handlePlaced = () => {
    setActiveId(null);
    const nextCount = Math.min(draggableLayout.length, placedCountRef.current + 1);
    placedCountRef.current = nextCount;
    setPlacedCount(nextCount);
    void addStars(1);
    if (nextCount >= draggableLayout.length) {
      startCelebration();
    }
  };

  const handlePlanetPlaced = (id: string) => {
    if (placedIdsRef.current.includes(id)) return;
    placedIdsRef.current = [...placedIdsRef.current, id];
    setPlacedIds(placedIdsRef.current);
    handlePlaced();
  };

  useEffect(() => {
    if (allPlaced) return;
    celebPlayedRef.current = false;
  }, [allPlaced]);

  return (
    <View style={styles.root}>
      <ImageBackground source={SOLAR_SYSTEM_BACKGROUND} style={styles.bg} imageStyle={styles.bgImage} resizeMode="cover">
        <View style={styles.bgWash} />
      </ImageBackground>

      <TopBar title="Solar System" titleFa="منظومه خورشیدی" showClose dark onBack={() => reset({ name: 'Main', tab: 'Games' })} />

      <View style={styles.stage} onLayout={event => setStageSize(event.nativeEvent.layout)}>
        {layout.length ? (
          <>
            <View style={styles.trackLayer} pointerEvents="none">
              {moonLayout ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.staticMoon,
                    {
                      left: moonLayout.target.x,
                      top: moonLayout.target.y,
                      width: moonLayout.target.w,
                      height: moonLayout.target.w,
                    },
                  ]}
                >
                  <Image
                    source={moonLayout.source}
                    style={styles.staticMoonImage}
                    resizeMode="contain"
                  />
                </View>
              ) : null}
              {!allPlaced ? draggableLayout.map(planet => (
                <View
                  key={planet.id}
                  pointerEvents="none"
                  style={[
                    styles.slot,
                    {
                      left: Math.round(planet.target.x + planet.target.w / 2 - planet.slotDiameter / 2),
                      top: Math.round(planet.centerY - planet.slotDiameter / 2),
                      width: planet.slotDiameter,
                      height: planet.slotDiameter,
                      borderRadius: planet.slotDiameter / 2,
                      opacity: placedIds.includes(planet.id) ? 0 : 1,
                    },
                  ]}
                />
              )) : null}
            </View>

            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
              {draggableLayout.map(planet => (
                <PlanetPiece
                  key={planet.id}
                  planet={planet}
                  isActive={activeId === planet.id}
                  onActivate={setActiveId}
                  onPlaced={handlePlanetPlaced}
                  lang={lang}
                />
              ))}
            </View>

            {/* Celebration particles */}
            {celebParticles.map(p => (
              <CelebParticleView key={p.id} p={p} anim={celebAnim} />
            ))}
          </>
        ) : null}

        {!allPlaced ? (
          <View
            style={[
              styles.bottomTray,
              {
                height: bottomTrayHeight,
              },
            ]}
            pointerEvents="box-none"
          >
            <View style={styles.bottomTrayGlow} />
          </View>
        ) : null}
      </View>
      {showEndOverlay && (
        <GameEndOverlay onGo={() => { setShowEndOverlay(false); reset({ name: 'Main', tab: 'Games' }); }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#07112D',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  // Without an explicit imageStyle, react-native-web can leave the background
  // <img> unsized in some nested-flex layouts, so it falls back to its own
  // huge natural pixel size and only a random cropped sliver shows.
  bgImage: { width: '100%', height: '100%' },
  bgWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 10, 32, 0.10)',
  },
  stage: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  bgStarGlow: {
    width: '100%',
    height: '100%',
    shadowColor: 'rgba(255, 245, 180, 1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 12,
  },
  trackLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  slot: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.32)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  piece: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  pieceImage: {
    width: '100%',
    height: '78%',
  },
  staticMoon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staticMoonImage: {
    width: '100%',
    height: '100%',
  },
  labelPill: {
    width: '100%',
    marginTop: 0,
    paddingVertical: 3,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(3, 10, 32, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomTray: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '31%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: 'rgba(4, 10, 28, 0.26)',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  bottomTrayGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  progressPill: {
    position: 'absolute',
    left: 16,
    bottom: 14,
    minWidth: 76,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  progressText: {
    color: '#0B1B4E',
    fontSize: 14,
    textAlign: 'center',
  },
  doneBtn: {
    position: 'absolute',
    right: 16,
    bottom: 14,
    height: 50,
    minWidth: 112,
    paddingHorizontal: 18,
    borderRadius: 26,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  doneText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});