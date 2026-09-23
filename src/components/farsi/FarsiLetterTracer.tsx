import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';
import { neliWorldAssets } from '../../assets/neliWorldAssets';
import { FarsiLetter } from '../../data/farsiLetters';
import { FA_AUDIO_KEYS, FALLBACK_LETTER_NAME_FA, makeAlphabetAudioKey, playFaAudio, playFaAudioOrSpeak } from '../../utils/faAudio';
import { VAZIR_TRACE_LETTERS } from '../../screens/interactive/vazirmatnTraceData';
import {
  Point,
  angleBetween,
  clamp,
  distance,
  pointAtProgress,
  polylineLength,
  sampleSvgPath,
  validateStrokeMove,
} from '../../utils/tracingUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  letter: FarsiLetter;
  boardSize: number;
  guideReplayToken: number;
  onComplete?: () => void;
  onTryAgain?: () => void;
  playSuccessSound?: () => void;
  playTryAgainSound?: () => void;
  tolerance?: number;
  autoAdvanceDelayMs?: number;
  /** Mute the intro narration (letter name, then "start from the green point"). Defaults to true. */
  soundOn?: boolean;
  /** When true: on success, call onComplete immediately with no audio/celebration (parent owns the sequence) */
  immediateComplete?: boolean;
};

type Phase = 'guide' | 'trace' | 'dots' | 'done';

type CelebParticle = {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  gravity: number;
  size: number;
  delay: number;
  color: string;
  spin: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CELEB_MS    = 2800;
const DASH        = 11;
const GAP         = 13;
const GUIDE_W     = 10;
const POINT_MARKER_SIZE = 46;
const POINT_MARKER_TIP_ANCHOR_Y = 0.5;
const COMPLETE_PROGRESS = 0.95;
const GUIDE_REPEATS = 2;
// Another 25% slower on top of the first 25% slowdown (1.25 × 1.25), vs. the
// original per-unit pace (was 4.2ms / viewBox unit, 520-1700ms clamp).
const GUIDE_SLOWDOWN    = 1.25 * 1.25;
const GUIDE_MS_PER_UNIT = 4.2 * GUIDE_SLOWDOWN;
const GUIDE_MIN_MS      = 520  * GUIDE_SLOWDOWN;
const GUIDE_MAX_MS      = 1700 * GUIDE_SLOWDOWN;
// Safety net for the narration audio the intro sequence waits on before it
// unlocks tracing (same idea as SplashScreen's timeout fallback): a clip that
// fails to fire its "finished" event on a given device must not strand the
// child forever in a non-interactive guide phase.
const NARRATION_TIMEOUT_MS = 4000;
const AnimPath    = Animated.createAnimatedComponent(Path);
const TRACE_IMAGE_ID: Record<string, string> = {
  haa: 'he-jimi',
  heh: 'he',
  nun: 'noon',
  taa: 'ta',
  zaa: 'za',
};

// ─── Celebration particles (3-fountain burst style) ───────────────────────

function buildCelebParticles(W: number, H: number): CelebParticle[] {
  const cols = ['#FFE034','#FF6B9D','#4CC9F0','#80ED99','#FF9F1C','#C77DFF','#FF5757','#56CFE1'];
  const fountains = [
    { x: W * 0.1,  a1: -130, a2: -60 },
    { x: W * 0.9,  a1: -120, a2: -50 },
    { x: W * 0.5,  a1: -140, a2: -40 },
  ];
  const out: CelebParticle[] = [];
  let id = 0;
  fountains.forEach(f => {
    for (let i = 0; i < 52; i++) {
      const deg = f.a1 + Math.random() * (f.a2 - f.a1);
      const rad = deg * Math.PI / 180;
      const spd = H * (0.55 + Math.random() * 0.65);
      out.push({
        id: id++,
        x:  f.x + (Math.random() - 0.5) * W * 0.06,
        y:  H,
        vx: Math.cos(rad) * spd,
        vy: Math.sin(rad) * spd,
        gravity: 480 + Math.random() * 280,
        size: 14 + Math.round(Math.random() * 16),
        delay: Math.random() * 350,
        color: cols[id % cols.length]!,
        spin: (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 2),
      });
    }
  });
  return out;
}

// ─── Celebration overlay ──────────────────────────────────────────────────────

function CelebrationOverlay({
  anim, W, H, particles,
}: { anim: Animated.Value; W: number; H: number; particles: CelebParticle[] }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map(p => {
        const ps   = p.delay / CELEB_MS;
        const pe   = 1;
        const tSec = (pe - ps) * CELEB_MS / 1000;
        const fi   = ps + (pe - ps) * 0.06;
        const fo   = ps + (pe - ps) * 0.84;
        return (
          <Animated.View key={p.id} style={{
            position: 'absolute',
            left:     p.x - p.size / 2,
            top:      p.y - p.size / 2,
            width:    p.size,
            height:   p.size,
            borderRadius: p.size / 2,
            backgroundColor: p.color,
            opacity:  anim.interpolate({ inputRange:[ps,fi,fo,pe], outputRange:[0,1,1,0], extrapolate:'clamp' }),
            transform:[
              { translateX: anim.interpolate({ inputRange:[ps,pe], outputRange:[0, p.vx*tSec], extrapolate:'clamp' }) },
              { translateY: anim.interpolate({ inputRange:[ps,pe], outputRange:[0, p.vy*tSec + 0.5*p.gravity*tSec*tSec], extrapolate:'clamp' }) },
              { rotate:     anim.interpolate({ inputRange:[ps,pe], outputRange:['0deg',`${p.spin*360}deg`], extrapolate:'clamp' }) },
            ],
          }} />
        );
      })}
    </View>
  );
}

// ─── Animated guide path (flowing dashes) ────────────────────

function AnimatedGuidePath({
  pathD, color, anim, opacity = 0.6,
}: { pathD: string; color: string; anim: Animated.Value; opacity?: number }) {
  // Interpolate strokeDashoffset directly from anim — no chaining
  const offset = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, -(DASH + GAP)],
    extrapolate: 'clamp',
  });
  return (
    <G>
      <AnimPath
        d={pathD}
        stroke={color}
        strokeWidth={GUIDE_W}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={`${DASH} ${GAP}`}
        opacity={opacity}
        strokeDashoffset={offset as any}
      />
    </G>
  );
}

function buildDashedPaths(points: Point[], dashLength = DASH, gapLength = GAP, dashStops?: Array<[number, number]>) {
  if (dashStops?.length) {
    return dashStops.map(([start, end]) => {
      const a = pointAtProgress(points, clamp(start, 0, 1));
      const b = pointAtProgress(points, clamp(end, 0, 1));
      return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
    });
  }
  if (points.length < 2) return [];
  const total = polylineLength(points);
  if (total <= 0) return [];
  const out: string[] = [];
  let cursor = 0;
  while (cursor < total) {
    const start = cursor;
    const end = Math.min(total, cursor + dashLength);
    const a = pointAtProgress(points, start / total);
    const b = pointAtProgress(points, end / total);
    out.push(`M ${a.x} ${a.y} L ${b.x} ${b.y}`);
    cursor += dashLength + gapLength;
  }
  return out;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FarsiLetterTracer({
  letter,
  boardSize,
  guideReplayToken,
  onComplete,
  onTryAgain,
  playSuccessSound,
  playTryAgainSound,
  tolerance = 32,
  autoAdvanceDelayMs = 0,
  immediateComplete = false,
  soundOn = true,
}: Props) {
  const vb = parseViewBox(letter.viewBox);
  const scaleX = boardSize / vb.width;
  const scaleY = boardSize / vb.height;

  const strokes = useMemo(
    () => letter.strokes.map(st => {
      const samples = sampleSvgPath(st.path, 160);
      return {
        ...st,
        samples,
        points: samples.map(s => ({ x: s.x, y: s.y })),
      };
    }),
    [letter],
  );

  const [phase,         setPhase]         = useState<Phase>('guide');
  const [activeStroke,  setActiveStroke]  = useState(0);
  const [strokeProg,    setStrokeProg]    = useState<number[]>(() => strokes.map(() => 0));
  const [completedDots, setCompletedDots] = useState<number[]>([]);
  const [success,       setSuccess]       = useState(false);
  const [guideTick,     setGuideTick]     = useState({ si: 0, progress: 0 });
  const [showCeleb,     setShowCeleb]     = useState(false);
  const [celebParticles,setCelebParticles] = useState<CelebParticle[]>([]);

  const pointerActive   = useRef(false);
  const strokeArmed     = useRef(false);
  const dotTouchConsumed = useRef(false);
  const guideCancel     = useRef(false);
  const advanceTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // pulse for start dot and dot targets
  const pulse     = useRef(new Animated.Value(0)).current;
  // guide dash animation
  const guideAnim = useRef(new Animated.Value(0)).current;
  const guideLoop = useRef<Animated.CompositeAnimation | null>(null);
  // celebration
  const celebAnim = useRef(new Animated.Value(0)).current;

  const traceMeta = useMemo(() => {
    const imageId = TRACE_IMAGE_ID[letter.id] ?? letter.id;
    return VAZIR_TRACE_LETTERS.find(item => item.id === imageId);
  }, [letter.id]);
  const dotTargets = useMemo(
    () => {
      const sourceDots = letter.dots?.length
        ? letter.dots
        : traceMeta?.dots?.length
          ? traceMeta.dots.map(dot => ({ x: dot.x * vb.width, y: dot.y * vb.height }))
          : [];
      return sourceDots;
    },
    [letter.dots, traceMeta, vb.height, vb.width],
  );
  const traceTolerance = Math.max(tolerance, 34);
  const traceStartGate = Math.max(18, traceTolerance * 0.78);
  const maxProgressJump = 0.22;
  // Dot tolerance: generous enough for kids but small enough that adjacent dots
  // (≥24 viewBox units apart for te/se) cannot be hit at the same time.
  const dotTolerance = Math.max(tolerance * 0.65, Math.min(boardSize * 0.09, 26));
  const activeDotTolerance = Math.max(dotTolerance * 1.25, Math.min(boardSize * 0.11, 32));

  // ── Pulse loop (for start dot) ──
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue:1, duration:900, easing:Easing.out(Easing.quad), useNativeDriver:true }),
        Animated.timing(pulse, { toValue:0, duration:900, easing:Easing.in(Easing.quad),  useNativeDriver:true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // ── Guide dash animation loop (flowing dashes, runs for the whole guide phase) ──
  const startGuideAnim = () => {
    guideLoop.current?.stop();
    guideAnim.setValue(0);
    guideLoop.current = Animated.loop(
      Animated.timing(guideAnim, {
        toValue:  1,
        duration: 1100,
        easing:   Easing.linear,
        useNativeDriver: true,
      }),
    );
    guideLoop.current.start();
  };

  // Animates the pencil dot once along every stroke and resolves when the
  // pass finishes (or immediately if guideCancel fires mid-pass).
  function runGuidePass(): Promise<void> {
    return new Promise(resolve => {
      setGuideTick({ si: 0, progress: 0 });
      // Cap raised from 1100 so longer merged strokes (e.g. sin/shin's single
      // continuous path) keep the same per-unit pace as everything else
      // instead of the guide dot suddenly zipping through in ~1s.
      const durations = strokes.map(st => clamp(polylineLength(st.points) * GUIDE_MS_PER_UNIT, GUIDE_MIN_MS, GUIDE_MAX_MS));
      let si = 0;
      let tStart = Date.now();

      const tick = () => {
        if (guideCancel.current) { resolve(); return; }
        const st = strokes[si];
        if (!st) { resolve(); return; }
        const dur = durations[si] ?? GUIDE_MIN_MS;
        const prog = clamp((Date.now() - tStart) / dur, 0, 1);
        setGuideTick({ si, progress: prog });
        if (prog >= 1) {
          si++;
          tStart = Date.now();
          setTimeout(tick, 80);
        } else {
          requestAnimationFrame(tick);
        }
      };
      requestAnimationFrame(tick);
    });
  }

  // ── Intro sequence on letter change or replay token ──
  // Order: say the letter name → show the guide path twice → invite the
  // child to start. Tracing only becomes interactive (phase 'trace') once
  // every step above has actually finished, so a stray touch during the
  // narration can never be mistaken for the child having traced the letter.
  useEffect(() => {
    guideCancel.current = true;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    guideLoop.current?.stop();

    setPhase('guide');
    setActiveStroke(0);
    setStrokeProg(strokes.map(() => 0));
    setCompletedDots([]);
    setSuccess(false);
    setShowCeleb(false);
    setGuideTick({ si: 0, progress: 0 });
    strokeArmed.current = false;
    pointerActive.current = false;

    guideCancel.current = false;
    startGuideAnim();

    let cancelled = false;
    const pause = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
    const withTimeout = (p: Promise<unknown>) => Promise.race([p, pause(NARRATION_TIMEOUT_MS)]);

    const run = async () => {
      const nameKey = makeAlphabetAudioKey('name', letter.id);
      const nameFallback = FALLBACK_LETTER_NAME_FA[letter.id] ?? letter.letter;

      if (soundOn) {
        await withTimeout(playFaAudioOrSpeak(nameKey, nameFallback, { awaitFinish: true }));
      } else {
        await pause(600);
      }
      if (cancelled || guideCancel.current) return;

      for (let i = 0; i < GUIDE_REPEATS; i++) {
        await runGuidePass();
        if (cancelled || guideCancel.current) return;
      }

      // Send the pencil back to the first point of the path — the green dot —
      // before inviting the child to start, so "start from the green point"
      // is said while it's actually sitting there, not wherever the last
      // guide pass happened to end.
      setGuideTick({ si: 0, progress: 0 });
      if (cancelled || guideCancel.current) return;
      await pause(300);
      if (cancelled || guideCancel.current) return;

      // Activate tracing immediately — the child can start dragging the green
      // point the instant it appears. "Start from the green point" plays
      // alongside that, not as a gate in front of it.
      guideLoop.current?.stop();
      setStrokeProg(strokes.map(() => 0));
      setActiveStroke(0);
      strokeArmed.current = false;
      setPhase('trace');

      if (soundOn) {
        void playFaAudio(FA_AUDIO_KEYS.guidance.startHere);
      }
    };
    void run();

    return () => {
      cancelled = true;
      guideCancel.current = true;
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      guideLoop.current?.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letter.id, guideReplayToken, soundOn]);

  // ── Celebration on success ──
  useEffect(() => {
    if (!success) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (immediateComplete) {
      // Parent owns audio + celebration — just fire onComplete immediately
      onComplete?.();
      return;
    }

    const run = async () => {
      const nameKey = makeAlphabetAudioKey('name', letter.id);
      const nameFallback = FALLBACK_LETTER_NAME_FA[letter.id] ?? letter.letter;
      // Say the letter name twice
      await playFaAudioOrSpeak(nameKey, nameFallback, { awaitFinish: true });
      await new Promise<void>(r => setTimeout(r, 250));
      await playFaAudioOrSpeak(nameKey, nameFallback, { awaitFinish: true });
      await new Promise<void>(r => setTimeout(r, 200));
      // Launch particle celebration
      setCelebParticles(buildCelebParticles(boardSize, boardSize));
      celebAnim.setValue(0);
      setShowCeleb(true);
      Animated.timing(celebAnim, {
        toValue: 1,
        duration: CELEB_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => setShowCeleb(false));
      // Say آفرین
      void playFaAudio(FA_AUDIO_KEYS.feedback.afarin);
      if (onComplete) advanceTimer.current = setTimeout(onComplete, autoAdvanceDelayMs);
    };
    void run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success]);

  function finishLetter() {
    if (success) return;
    setSuccess(true);
    setPhase('done');
  }

  function updateTrace(point: Point) {
    if (phase !== 'trace' && phase !== 'dots') return;

    if (phase === 'dots') {
      if (dotTouchConsumed.current) return;
      const nextDotIndex = completedDots.length;
      const nextDot = dotTargets[nextDotIndex];
      if (!nextDot) {
        finishLetter();
        return;
      }

      if (distance(point, nextDot) <= activeDotTolerance) {
        dotTouchConsumed.current = true;
        const next = [...completedDots, nextDotIndex];
        setCompletedDots(next);
        if (next.length >= dotTargets.length) finishLetter();
      }
      return;
    }

    const st = strokes[activeStroke];
    if (!st) return;
    const pts = st.points;
    const samples = st.samples;
    const curProg = strokeProg[activeStroke] ?? 0;
    const startPt = pts[0]!;
    const requiredPt = curProg > 0.03 ? pointAtProgress(pts, curProg) : startPt;
    const gate = traceStartGate;

    if (!strokeArmed.current) {
      if (distance(point, requiredPt) <= gate) {
        strokeArmed.current = true;
      } else {
        return;
      }
    }

    const validation = validateStrokeMove({
      point,
      samples,
      currentProgress: curProg,
      tolerance: traceTolerance,
      startTolerance: gate,
      maxProgressJump,
    });

    if (validation.accepted) {
      const progress = validation.progress;
      const next = strokeProg.slice();
      next[activeStroke] = progress;
      setStrokeProg(next);

      if (progress >= COMPLETE_PROGRESS) {
        strokeArmed.current    = false;
        const nextStroke = activeStroke + 1;
        if (nextStroke < strokes.length) {
          setActiveStroke(nextStroke);
          setPhase('trace');
        } else if (dotTargets.length > 0) {
          setPhase('dots');
        } else {
          finishLetter();
        }
      }
    }
  }

  function handleDown(event: any) {
    if (phase === 'guide' || success) return;
    pointerActive.current = true;
    dotTouchConsumed.current = false;
    const pt = extractPoint(event, scaleX, scaleY);
    if (phase === 'trace') {
      const st = strokes[activeStroke];
      const curProg = strokeProg[activeStroke] ?? 0;
      const startPt = st?.points?.[0];
      const requiredPt = st && curProg > 0.03 ? pointAtProgress(st.points, curProg) : startPt;
      if (!requiredPt || distance(pt, requiredPt) > traceStartGate) {
        pointerActive.current = false;
        strokeArmed.current = false;
        return;
      }
      strokeArmed.current = true;
    }
    updateTrace(pt);
  }

  function handleMove(event: any) {
    // Skip dots phase in move — dots must be registered by explicit tap (handleDown) only
    if (!pointerActive.current || phase === 'guide' || phase === 'dots' || success) return;
    updateTrace(extractPoint(event, scaleX, scaleY));
  }

  function handleUp() {
    pointerActive.current = false;
    dotTouchConsumed.current = false;
  }

  // Guide pencil position
  const guidePoint = useMemo(() => {
    const st = strokes[guideTick.si];
    if (!st) return { x: 0, y: 0 };
    return pointAtProgress(st.points, guideTick.progress);
  }, [guideTick, strokes]);

  const guideAngle = useMemo(() => {
    const st = strokes[guideTick.si];
    if (!st) return 0;
    const pts = st.points;
    const i = Math.max(1, Math.floor(guideTick.progress * (pts.length - 1)));
    return angleBetween(pts[i-1] ?? pts[0]!, pts[i] ?? pts[pts.length-1]!);
  }, [guideTick, strokes]);

  const activeMarkerPoint = useMemo(() => {
    const st = strokes[activeStroke];
    if (!st) return { x: 0, y: 0 };
    return pointAtProgress(st.points, strokeProg[activeStroke] ?? 0);
  }, [activeStroke, strokeProg, strokes]);

  const activeMarkerAngle = useMemo(() => {
    const st = strokes[activeStroke];
    if (!st) return 0;
    const pts = st.points;
    if (pts.length < 2) return 0;
    const i = Math.max(1, Math.floor((strokeProg[activeStroke] ?? 0) * (pts.length - 1)));
    return angleBetween(pts[i - 1] ?? pts[0]!, pts[i] ?? pts[pts.length - 1]!);
  }, [activeStroke, strokeProg, strokes]);

  // Progress for each stroke (guide vs trace mode)
  const progFor = (si: number) => {
    if (phase === 'guide') {
      if (si < guideTick.si) return 1;
      if (si > guideTick.si) return 0;
      return guideTick.progress;
    }
    return strokeProg[si] ?? 0;
  };

  const col = letter.color ?? '#FF7AA7';
  const traceImage = traceMeta?.image;

  return (
    <View
      style={[styles.board, { width: boardSize, height: boardSize }]}
      accessibilityLabel={`Trace the Farsi letter ${letter.letter}`}
      accessibilityRole="image"
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onTouchStart={handleDown}
      onTouchMove={handleMove}
      onTouchEnd={handleUp}
      onTouchCancel={handleUp}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
    >
      {traceImage ? (
        <View pointerEvents="none" style={styles.traceGhostImageWrap}>
          <Image
            source={traceImage}
            style={[styles.traceGhostImage, { tintColor: '#FFFFFF' }]}
            resizeMode="contain"
          />
        </View>
      ) : null}

      <Svg width={boardSize} height={boardSize} viewBox={letter.viewBox} accessible accessibilityLabel={`Trace the Farsi letter ${letter.letter}`}>
        {strokes.map((st, si) => {
          if (success) return null; // hide strokes — letter image shown instead
          const prog = progFor(si);

          return (
            <G key={st.id}>
              {/* Guide path — animated dashes (always shown in guide phase, faint in trace) */}
              {phase === 'guide' ? (
                <G>
                  <AnimatedGuidePath
                    pathD={st.path}
                    color={col}
                    anim={guideAnim}
                    opacity={0.18}
                  />
                  {buildDashedPaths(st.points, DASH, GAP, letter.dashStops).map((seg, dashIndex) => (
                    <Path
                      key={`${st.id}-dash-${dashIndex}`}
                      d={seg}
                      stroke={si < guideTick.si ? 'rgba(78,69,101,0.55)' : col}
                      strokeWidth={GUIDE_W}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      opacity={si < guideTick.si ? 0.58 : 0.96}
                    />
                  ))}
                </G>
              ) : (
                // Trace phase: show static dashed guide (faint) underneath user trail
                <G>
                  {buildDashedPaths(st.points, DASH, GAP, letter.dashStops).map((seg, dashIndex, dashes) => {
                    const dashProgress = ((dashIndex + 1) / Math.max(1, dashes.length)) * COMPLETE_PROGRESS;
                    const isTraced = prog >= dashProgress;
                    return (
                      <Path
                        key={`${st.id}-trace-dash-${dashIndex}`}
                        d={seg}
                        stroke={isTraced ? col : 'rgba(78,69,101,0.58)'}
                        strokeWidth={GUIDE_W}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        opacity={isTraced ? 0.98 : 0.78}
                      />
                    );
                  })}
                  {letter.extraDashSegments?.map((seg, extraIndex) => (
                    <Line
                      key={`${st.id}-extra-${seg.id ?? extraIndex}`}
                      x1={getExtraSegmentPoints(seg, vb).x1}
                      y1={getExtraSegmentPoints(seg, vb).y1}
                      x2={getExtraSegmentPoints(seg, vb).x2}
                      y2={getExtraSegmentPoints(seg, vb).y2}
                      stroke={col}
                      strokeWidth={GUIDE_W}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.98}
                    />
                  ))}
                </G>
              )}

            </G>
          );
        })}

        {/* Done: nothing in SVG — letter image shown in overlay below */}

        {/* Dot targets for letters with dots */}
        {phase === 'dots' && !success
          ? dotTargets.map((dot, di) => {
              const isDone   = completedDots.includes(di);
              const isActive = di === completedDots.length;
              return (
                <G key={`dot-${di}`}>
                  <Circle
                    cx={dot.x}
                    cy={dot.y}
                    r={isDone ? 10 : isActive ? 9 : 7}
                    fill={isDone ? col : isActive ? 'rgba(78,69,101,0.72)' : 'rgba(78,69,101,0.38)'}
                    opacity={1}
                  />
                  <Circle cx={dot.x} cy={dot.y} r={isDone ? 4 : isActive ? 3.5 : 2.5} fill="white" opacity={0.9} />
                </G>
              );
            })
          : null}

        {/* Static dots shown in guide/trace phase (preview of where to tap) —
            solid white to match the (also white) ghost/trace-path styling, since
            a col-tinted dot disappears against the now col-colored page bg */}
        {phase !== 'dots' && dotTargets.length > 0
          ? dotTargets.map((dot, di) => (
              <G key={`sdot-${di}`}>
                <Circle cx={dot.x} cy={dot.y} r={8} fill="white" opacity={0.88} />
              </G>
            ))
          : null}

      </Svg>

      {/* Success: show the letter example image in center */}
      {success ? (
        <View style={styles.successReveal} pointerEvents="none">
          {traceImage ? (
            <Image source={traceImage} style={styles.successImage} resizeMode="contain" />
          ) : (
            <Text style={[styles.successLetter, { color: col }]}>{letter.letter}</Text>
          )}
        </View>
      ) : null}

      {/* Overlay (pointer / hints) */}
      <View style={styles.overlay} pointerEvents="none">

        {/* Animated pointer during guide phase */}
        {phase === 'guide' ? (
          <Animated.View style={[styles.pencilWrap, {
            left:  guidePoint.x * scaleX - POINT_MARKER_SIZE / 2,
            top:   guidePoint.y * scaleY - POINT_MARKER_SIZE * POINT_MARKER_TIP_ANCHOR_Y,
            transform: [
              { rotate: `${guideAngle - 90}deg` },
              { scale: pulse.interpolate({ inputRange:[0,1], outputRange:[0.94,1.06] }) },
            ],
          }]}>
            <Image
              source={neliWorldAssets.ui.point}
              style={styles.pencilPointImage}
              resizeMode="contain"
            />
          </Animated.View>
        ) : null}

        {/* Start marker image aligned to the current path point */}
        {phase === 'trace' && !success ? (
          <Animated.View style={[styles.pointMarkerWrap, {
            left: activeMarkerPoint.x * scaleX - POINT_MARKER_SIZE / 2,
            top:  activeMarkerPoint.y * scaleY - POINT_MARKER_SIZE * POINT_MARKER_TIP_ANCHOR_Y,
            transform: [{ rotate: `${activeMarkerAngle - 90}deg` }],
          }]} pointerEvents="none">
            <Image
              source={neliWorldAssets.ui.point}
              style={styles.pointMarker}
              resizeMode="contain"
            />
          </Animated.View>
        ) : null}

        {/* Phase label top-right */}
        {phase === 'guide' && (
          <View style={styles.phasePill}>
            <Text style={styles.phasePillText}>👀 تماشا کن</Text>
          </View>
        )}
      </View>

      {/* Celebration overlay */}
      {showCeleb ? (
        <CelebrationOverlay
          anim={celebAnim}
          W={boardSize}
          H={boardSize}
          particles={celebParticles}
        />
      ) : null}
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractPoint(event: any, sx: number, sy: number): Point {
  const n = event?.nativeEvent ?? {};
  const lx = typeof n.locationX === 'number' ? n.locationX : typeof n.pageX === 'number' ? n.pageX : 0;
  const ly = typeof n.locationY === 'number' ? n.locationY : typeof n.pageY === 'number' ? n.pageY : 0;
  return { x: lx / sx, y: ly / sy };
}

function parseViewBox(vb: string) {
  const [,,w=200,h=200] = vb.split(/\s+/).map(Number);
  return { width: w, height: h };
}

function getExtraSegmentPoints(
  seg: { x1: number; y1: number; x2: number; y2: number; rotation?: number },
  vb: { width: number; height: number },
) {
  const x1 = seg.x1 * vb.width;
  const y1 = seg.y1 * vb.height;
  const x2 = seg.x2 * vb.width;
  const y2 = seg.y2 * vb.height;
  if (seg.rotation == null) return { x1, y1, x2, y2 };

  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const dx = (x2 - x1) / 2;
  const dy = (y2 - y1) / 2;
  const rad = seg.rotation * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;
  return { x1: cx - rx, y1: cy - ry, x2: cx + rx, y2: cy + ry };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  board: {
    overflow: 'hidden',
    position: 'relative',
  },
  traceGhostImageWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  traceGhostImage: {
    width: '100%',
    height: '100%',
    opacity: 0.88,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  pencilWrap: {
    position: 'absolute',
    width: POINT_MARKER_SIZE,
    height: POINT_MARKER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pencilPointImage: {
    width: POINT_MARKER_SIZE,
    height: POINT_MARKER_SIZE,
  },
  pointMarkerWrap: {
    position: 'absolute',
    width: POINT_MARKER_SIZE,
    height: POINT_MARKER_SIZE,
  },
  pointMarker: {
    width: POINT_MARKER_SIZE,
    height: POINT_MARKER_SIZE,
  },
  phasePill: {
    position: 'absolute',
    top: 14,
    right: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1.5,
    borderColor: 'rgba(108,78,255,0.2)',
  },
  phasePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6C4EFF',
  },
  successReveal: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDF8',
  },
  successImage: {
    width: '78%',
    height: '78%',
  },
  successLetter: {
    fontSize: 120,
    fontFamily: 'Vazirmatn_800ExtraBold',
    textAlign: 'center',
  },
});


