// Game 1: Neli's Drive (quest v2, section 3). The chosen buddy drives a
// small car right → left along a cream road. Five mystery boxes — one per
// pick — each open a question with the child's own pick + 2 distractors.
// Right: the item flies into the car. Wrong: shake + fade, try again, glow
// after 2 wrong tries. No losing, no going back. Ends at the picnic.

import React, { useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, ImageSourcePropType, LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { createAudioPlayer } from 'expo-audio';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { AppContext } from '../store/AppContext';
import { dir, ff } from '../theme/fonts';
import { noteAudioPlayerReleased, playFaAudio, stopFaAudio } from '../utils/faAudio';
import { recordQuestAnswer } from '../store/wordLog';
import { isQuestMuted, questPlay } from './questSound';
import { BuddyId } from './buddyStore';
import { DisplayWord } from './questGroups';
import { COLOR_HEX, PickKind, pickPool, sampleOptions, shuffle } from './pickLists';
import { Story } from './stories';
import WordArt from './WordArt';

const POP_SOUND = require('../../assets/audio/pop.wav');
const GARDEN_BG = require('../../assets/neli-world/quest/garden-background.png');
const BOX_CLOSED = require('../../assets/neli-world/quest/box-closed.png');
const BOX_OPEN = require('../../assets/neli-world/quest/box-open.png');

const CARS: Record<BuddyId, ImageSourcePropType> = {
  neli: require('../../assets/neli-world/quest/car-neli.png'),
  aidin: require('../../assets/neli-world/quest/car-aidin.png'),
  mila: require('../../assets/neli-world/quest/car-mila.png'),
  lila: require('../../assets/neli-world/quest/car-lila.png'),
  dara: require('../../assets/neli-world/quest/car-dara.png'),
  roboBoombo: require('../../assets/neli-world/quest/car-roboBoombo.png'),
};

// Long horizontal world: about 7 screen widths. All drive positions are
// world X coordinates (right → left). The camera follows the car, so only
// the part around the car is ever visible.
const WORLD_SCREENS = 7;
const DRIVE_MS = 1500;

// Background copies overlap by this much so no hairline shows where two
// copies meet; each copy is drawn slightly oversized inside a clipped tile
// so the join never lands on the image's own edge pixels.
const BG_OVERLAP = 2;
const BG_EDGE_CROP = 8;

// Landmark art, one per gap between stops (right → left).
const SCENERY_SRC: ImageSourcePropType[] = [
  require('../../assets/neli-world/quest/landmarks/apple-tree.png'),
  require('../../assets/neli-world/quest/landmarks/bridge.png'),
  require('../../assets/neli-world/quest/landmarks/sunflowers.png'),
  require('../../assets/neli-world/quest/landmarks/windmill.png'),
  require('../../assets/neli-world/quest/landmarks/mushroom-pond.png'),
];

export type DriveRound = { kind: PickKind; answer: DisplayWord };

function playPop() {
  if (isQuestMuted()) return;
  try {
    const player = createAudioPlayer(POP_SOUND);
    player.volume = 0.5;
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
    // Sound is a nice-to-have; the game goes on without it.
  }
}

function SparkBurst({ x, y, size }: { x: number; y: number; size: number }) {
  const anims = useRef(Array.from({ length: 10 }, () => new Animated.Value(0))).current;
  const cfg = useRef(
    Array.from({ length: 10 }, (_, i) => {
      const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.5;
      const dist = size * (0.5 + Math.random() * 0.9);
      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - size * 0.5,
        delay: Math.random() * 120,
      };
    }),
  ).current;
  useEffect(() => {
    Animated.parallel(
      cfg.map((c, i) =>
        Animated.timing(anims[i]!, { toValue: 1, duration: 550, delay: c.delay, useNativeDriver: true }),
      ),
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={{ position: 'absolute', left: x, top: y, zIndex: 30 }} pointerEvents="none">
      {anims.map((a, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute',
            fontSize: size * 0.26,
            opacity: a.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            transform: [
              { translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, cfg[i]!.dx] }) },
              { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, cfg[i]!.dy] }) },
            ],
          }}
        >
          ✨
        </Animated.Text>
      ))}
    </View>
  );
}

function OptionArt({ word, kind, size }: { word: DisplayWord; kind: PickKind; size: number }) {
  if (kind === 'color') {
    return (
      <View
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: COLOR_HEX[word.id] ?? '#CCCCCC' }}
        accessibilityLabel={word.fa}
      />
    );
  }
  return <WordArt word={word} size={size} />;
}

function QuestionView({
  round,
  choices,
  optSize,
  onCorrect,
}: {
  round: DriveRound;
  choices: DisplayWord[];
  optSize: number;
  onCorrect: (firstTry: boolean) => void;
}) {
  const { lang } = useContext(AppContext);
  const isFa = lang === 'fa' || lang === 'ar';
  const [tries, setTries] = useState(0);
  const [faded, setFaded] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  const tap = (word: DisplayWord) => {
    if (done) return;
    if (word.id === round.answer.id) {
      setDone(true);
      const firstTry = tries === 0;
      recordQuestAnswer(round.answer.id, firstTry);
      onCorrect(firstTry);
      return;
    }
    setTries(t => t + 1);
    setFaded(f => (f.includes(word.id) ? f : [...f, word.id]));
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 120, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();
    void questPlay(round.answer.audioKey);
  };

  const shakeX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] });

  return (
    <View style={styles.question} pointerEvents="box-none">
      <View style={styles.promptRow}>
        <Text style={{ fontSize: optSize * 0.32 }}>👉</Text>
        <Text
          style={[styles.prompt, { fontFamily: ff(lang, 'black'), fontSize: Math.max(16, optSize * 0.24) }, dir(lang)]}
        >
          {isFa ? `${round.answer.fa} کدومه؟` : `Which one is ${round.answer.fa}?`}
        </Text>
        <TouchableOpacity
          onPress={() => questPlay(round.answer.audioKey)}
          activeOpacity={0.8}
          accessibilityLabel={isFa ? 'دوباره بشنو' : 'Hear it again'}
          accessibilityRole="button"
        >
          <Text style={{ fontSize: optSize * 0.32 }}>👂</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.qRow, isFa && { flexDirection: 'row-reverse' }]}>
        {choices.map(word => {
          const isTarget = word.id === round.answer.id;
          const showGlow = isTarget && tries >= 2 && !done;
          const dimmed = faded.includes(word.id);
          return (
            <TouchableOpacity
              key={word.id}
              onPress={() => tap(word)}
              activeOpacity={0.85}
              accessibilityLabel={word.fa}
              accessibilityRole="button"
              style={[
                styles.qOption,
                {
                  width: optSize * 1.15,
                  height: optSize * 1.15,
                  borderRadius: optSize * 0.2,
                  borderWidth: showGlow || (done && isTarget) ? Math.max(4, optSize * 0.05) : 0,
                  opacity: dimmed ? 0.35 : 1,
                },
              ]}
            >
              <Animated.View style={dimmed && !isTarget ? { transform: [{ translateX: shakeX }] } : undefined}>
                <OptionArt word={word} kind={round.kind} size={optSize * 0.85} />
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

type DrivePhase = 'driving' | 'atBox' | 'opening' | 'question' | 'flying' | 'arrived';

export default function DriveGame({
  buddy,
  story,
  rounds,
  onDone,
}: {
  buddy: BuddyId;
  story: Story;
  rounds: DriveRound[];
  onDone: (collected: DisplayWord[], accuracy: number) => void;
}) {
  const { lang } = useContext(AppContext);
  const { width: W, height: H } = useWindowDimensions();
  const isFa = lang === 'fa' || lang === 'ar';

  // The real game area: this view sits below the title bar, so measure it
  // and size/position everything from the measurement. The layout re-flows
  // whenever the size changes, and nothing is pushed below the screen.
  // Until the first measurement, fall back to the window size.
  const [gameSize, setGameSize] = useState<{ w: number; h: number } | null>(null);
  const onGameLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w <= 0 || h <= 0) return;
    const next = { w: Math.round(w), h: Math.round(h) };
    setGameSize(prev => (prev && prev.w === next.w && prev.h === next.h ? prev : next));
  };
  const gw = gameSize?.w ?? W;
  const gh = gameSize?.h ?? H;

  // Every size derives from the game-area height, so the car, box, road
  // and landmarks keep the same proportions on every device: the car is
  // 30% of the game height, the box 55% of the car.
  const carH = gh * 0.3;
  const carW = carH / 0.52;
  const boxH = carH * 0.55;
  const boxW = boxH;
  const roadH = gh * 0.32;
  const roadTop = gh - roadH;
  const boxY = roadTop + roadH * 0.45;
  const miniSize = Math.max(24, carH * 0.3);
  const carTop = roadTop + roadH - carH - miniSize - roadH * 0.08;
  const optSize = Math.max(48, Math.min(gw * 0.13, gh * 0.26));
  // Landmarks stand on the grass behind the road, never taller than the car.
  const landmarkH = carH * 0.95;
  const landmarkW = landmarkH * 1.3;
  const destSize = gh * 0.34;

  // World geometry (right → left): the car enters from the right, meets
  // one box per screen, and ends at the picnic at the far LEFT end.
  const worldW = WORLD_SCREENS * gw;
  const boxWorldX = (i: number) => worldW - (1.5 + i) * gw;
  const destWorldX = 0.55 * gw;
  // The car stops BEFORE the box: the box stays ahead-left of the car
  // with a clear gap, so tapping the box never hits the car.
  const STOP_GAP = boxW * 0.35;
  const stopWorldX = (i: number) => boxWorldX(i) + carW / 2 + boxW / 2 + STOP_GAP;
  const destStopX = destWorldX + carW / 2 + destSize * 0.15;
  const landmarkWorldX = (i: number) => {
    const right = i === 0 ? worldW - 0.5 * gw : boxWorldX(i - 1);
    const left = i < rounds.length ? boxWorldX(i) : destWorldX;
    return (right + left) / 2;
  };
  const clampCam = (worldX: number) => Math.min(Math.max(worldX - gw * 0.62, 0), Math.max(worldW - gw, 0));

  const [phase, setPhase] = useState<DrivePhase>('driving');
  const [legIndex, setLegIndex] = useState(0);
  const [boxGone, setBoxGone] = useState(false);
  const [spark, setSpark] = useState(false);
  const [choices, setChoices] = useState<DisplayWord[]>([]);
  const [collected, setCollected] = useState<DisplayWord[]>([]);
  const [flying, setFlying] = useState<DisplayWord | null>(null);

  const carX = useRef(new Animated.Value(WORLD_SCREENS * W + 80)).current;
  const cameraX = useRef(new Animated.Value(Math.max(WORLD_SCREENS * W - W, 0))).current;
  const carBounce = useRef(new Animated.Value(0)).current;
  const bounceLoop = useRef<Animated.CompositeAnimation | null>(null);
  const driveAnim = useRef<Animated.CompositeAnimation | null>(null);
  const wiggle = useRef(new Animated.Value(0)).current;
  const zoomAnim = useRef(new Animated.Value(0)).current;
  const dimAnim = useRef(new Animated.Value(0)).current;
  const qAnim = useRef(new Animated.Value(0)).current;
  const flyAnim = useRef(new Animated.Value(0)).current;
  const grandmaBounce = useRef(new Animated.Value(1)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const collectedRef = useRef<DisplayWord[]>([]);
  const firstTriesRef = useRef<boolean[]>([]);
  const phaseRef = useRef<DrivePhase>('driving');
  phaseRef.current = phase;
  const legIndexRef = useRef(0);
  legIndexRef.current = legIndex;
  const startedRef = useRef(false);
  const headingRef = useRef<'box' | 'dest'>('box');
  const prevSizeRef = useRef<{ w: number; h: number } | null>(null);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      bounceLoop.current?.stop();
      driveAnim.current?.stop();
      void stopFaAudio();
    },
    [],
  );

  const startBounce = () => {
    bounceLoop.current?.stop();
    bounceLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(carBounce, { toValue: -7, duration: 250, useNativeDriver: true }),
        Animated.timing(carBounce, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]),
    );
    bounceLoop.current.start();
  };

  const stopBounce = () => {
    bounceLoop.current?.stop();
    bounceLoop.current = null;
    carBounce.setValue(0);
  };

  const driveTo = (worldX: number, then?: () => void) => {
    setPhase('driving');
    startBounce();
    driveAnim.current?.stop();
    const anim = Animated.parallel([
      Animated.timing(carX, {
        toValue: worldX,
        duration: DRIVE_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(cameraX, {
        toValue: clampCam(worldX),
        duration: DRIVE_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]);
    driveAnim.current = anim;
    anim.start(() => {
      stopBounce();
      then?.();
    });
  };

  const arriveAtBox = () => {
    if (phaseRef.current === 'driving') setPhase('atBox');
  };

  const driveToBox = (i: number) => {
    headingRef.current = 'box';
    driveTo(stopWorldX(i), arriveAtBox);
  };

  const driveToDest = () => {
    headingRef.current = 'dest';
    driveTo(destStopX, () => {
      setPhase('arrived');
      Animated.sequence([
        Animated.timing(grandmaBounce, { toValue: 1.12, duration: 220, useNativeDriver: true }),
        Animated.timing(grandmaBounce, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
      void questPlay(story.arrivalAudio);
      later(2800, () => {
        const tries = firstTriesRef.current;
        const accuracy = tries.length === 0 ? 1 : tries.filter(Boolean).length / tries.length;
        onDone(collectedRef.current, accuracy);
      });
    });
  };

  // The drive starts by itself after the picks, once the game area is
  // measured: the car enters from the right and drives left to the first
  // box, stopping before it.
  useEffect(() => {
    if (!gameSize || startedRef.current) return;
    startedRef.current = true;
    carX.setValue(worldW + 80);
    cameraX.setValue(Math.max(worldW - gw, 0));
    driveToBox(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameSize]);

  // If the game area is resized mid-game, re-seat the car/camera on the
  // current target: restart the drive when en route, snap when parked.
  useEffect(() => {
    if (!gameSize) return;
    const prev = prevSizeRef.current;
    prevSizeRef.current = { w: gw, h: gh };
    if (!startedRef.current) return;
    if (prev && prev.w === gw && prev.h === gh) return;
    driveAnim.current?.stop();
    if (phaseRef.current === 'driving') {
      if (headingRef.current === 'dest') driveToDest();
      else driveToBox(Math.min(legIndexRef.current, rounds.length - 1));
    } else {
      const t = legIndexRef.current >= rounds.length ? destStopX : stopWorldX(legIndexRef.current);
      carX.setValue(t);
      cameraX.setValue(clampCam(t));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gw, gh]);

  const openBox = () => {
    if (phase !== 'atBox') return;
    setPhase('opening');
    // Calm beat 1: the box wiggles.
    Animated.sequence([
      Animated.timing(wiggle, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(wiggle, { toValue: -1, duration: 100, useNativeDriver: true }),
      Animated.timing(wiggle, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start(() => {
      // Calm beat 2: the box zooms toward the screen center while it opens
      // (crossfade to the open art with sparkles) as the scene gently dims.
      setSpark(true);
      playPop();
      later(800, () => setSpark(false));
      Animated.parallel([
        Animated.timing(zoomAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(dimAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start(() => {
        const round = rounds[legIndex]!;
        const distract = sampleOptions(pickPool(round.kind), 2, new Set([round.answer.id]));
        setChoices(shuffle([round.answer, ...distract]));
        setPhase('question');
        void questPlay(round.answer.audioKey);
        // Calm beat 3: the question grows out of the open box into the
        // center while the opened box fades away behind it.
        Animated.timing(qAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      });
    });
  };

  const answerCorrect = (firstTry: boolean) => {
    const round = rounds[legIndex]!;
    firstTriesRef.current.push(firstTry);
    setPhase('flying');
    void questPlay(round.answer.audioKey);
    // The open box is already faded (the question covers it); remove it so
    // the reverse never flashes it back.
    setBoxGone(true);
    setSpark(false);
    setFlying(round.answer);
    flyAnim.setValue(0);
    Animated.sequence([
      // The options shrink away.
      Animated.timing(qAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      // The right item flies from the center into the car.
      Animated.timing(flyAnim, { toValue: 1, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      // The scene brightens again.
      Animated.timing(dimAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setFlying(null);
      const next = [...collectedRef.current, round.answer];
      collectedRef.current = next;
      setCollected(next);
      setBoxGone(false);
      zoomAnim.setValue(0);
      wiggle.setValue(0);
      if (legIndex >= rounds.length - 1) {
        setLegIndex(legIndex + 1);
        driveToDest();
      } else {
        const nextLeg = legIndex + 1;
        setLegIndex(nextLeg);
        driveToBox(nextLeg);
      }
    });
  };

  const wiggleDeg = wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-10deg', '10deg'] });

  // Screen-space geometry for the current leg: the camera has settled, so
  // the box-to-center and center-to-car hops are plain static numbers.
  const leg = Math.min(legIndex, rounds.length - 1);
  const legStopX = stopWorldX(leg);
  const legCam = clampCam(legStopX);
  // How far the active box must travel to reach the screen center.
  const boxDX = gw / 2 - (boxWorldX(leg) - legCam);
  const boxDY = gh / 2 - boxY;
  // The answered item flies from the screen center into the car roof.
  const flyStartY = gh * 0.48;
  const flyDX = legStopX - legCam - gw / 2;
  const flyDY = carTop + miniSize * 0.4 - flyStartY;

  return (
    <View style={styles.root} onLayout={onGameLayout}>
      {/* Camera: the long world slides past; only the part around the car shows. */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: worldW,
          height: gh,
          transform: [{ translateX: Animated.multiply(cameraX, -1) }],
        }}
      >
        {/* Garden background tiled across the whole world. Copies overlap
            by 2px (each later copy covers the seam) and each copy is drawn
            oversized inside a clipped tile so the join never sits on the
            image's edge pixels. */}
        <View style={[styles.bgRow, { width: worldW, height: gh, backgroundColor: '#CDEBF7' }]}>
          {Array.from({ length: WORLD_SCREENS }).map((_, i) => {
            const tileW = i === 0 ? gw : gw + BG_OVERLAP;
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: i === 0 ? 0 : i * gw - BG_OVERLAP,
                  top: 0,
                  width: tileW,
                  height: gh,
                  overflow: 'hidden',
                }}
              >
                <Image
                  source={story.background ?? GARDEN_BG}
                  style={{ position: 'absolute', left: -BG_EDGE_CROP, top: 0, width: tileW + BG_EDGE_CROP * 2, height: gh }}
                  resizeMode="cover"
                />
              </View>
            );
          })}
        </View>

        {/* Cream road drawn in code along the bottom, full world length. */}
        <Svg width={worldW} height={roadH} style={{ position: 'absolute', left: 0, top: roadTop }}>
          <Rect x={0} y={0} width={worldW} height={roadH} fill="#F6E7C8" />
          <Rect x={0} y={0} width={worldW} height={Math.max(4, roadH * 0.06)} fill="#EAD3A8" />
          <Line
            x1={0}
            y1={roadH * 0.55}
            x2={worldW}
            y2={roadH * 0.55}
            stroke="#FFFFFF"
            strokeWidth={Math.max(3, roadH * 0.035)}
            strokeDasharray="16,20"
            strokeLinecap="round"
            opacity={0.8}
          />
        </Svg>

        {/* Destination: picnic blanket + Grandma at the far LEFT end. */}
        <Image
          source={story.destination}
          style={{
            position: 'absolute',
            left: destWorldX - destSize / 2,
            top: roadTop - destSize * 0.72,
            width: destSize,
            height: destSize * 0.72,
          }}
          resizeMode="contain"
          accessibilityLabel={isFa ? 'پیک‌نیک' : 'Picnic'}
        />
        <Animated.View
          style={{
            position: 'absolute',
            left: destWorldX + destSize * 0.1,
            top: roadTop - destSize * 0.95,
            transform: [{ scale: grandmaBounce }],
          }}
        >
          <Image
            source={story.grandma}
            style={{ width: destSize * 0.55, height: destSize * 0.95 }}
            resizeMode="contain"
            accessibilityLabel={isFa ? 'مادربزرگ' : 'Grandma'}
          />
        </Animated.View>

        {/* One landmark in each gap between stops, feet on the grass behind the road. */}
        {SCENERY_SRC.map((src, i) => (
          <Image
            key={i}
            source={src}
            style={{
              position: 'absolute',
              left: landmarkWorldX(i) - landmarkW / 2,
              top: roadTop + 6 - landmarkH,
              width: landmarkW,
              height: landmarkH,
            }}
            resizeMode="contain"
          />
        ))}

        {/* The five mystery boxes, one screen apart along the road. */}
        {rounds.map((_, i) => {
          const worldX = boxWorldX(i);
          if (i < legIndex) return null;
          const active = i === legIndex;
          if (!active) {
            return (
              <View key={i} style={{ position: 'absolute', left: worldX - boxW / 2, top: boxY - boxH / 2, zIndex: 2 }}>
                <Image source={BOX_CLOSED} style={{ width: boxW, height: boxH }} resizeMode="contain" />
                <View
                  style={[
                    styles.qBadge,
                    {
                      width: boxW * 0.42,
                      height: boxW * 0.42,
                      borderRadius: boxW * 0.21,
                    },
                  ]}
                >
                  <Text style={{ fontSize: boxW * 0.26, color: '#6C4EFF', fontWeight: 'bold' }}>؟</Text>
                </View>
              </View>
            );
          }
          if (boxGone) return null;
          return (
            <TouchableOpacity
              key={i}
              onPress={openBox}
              disabled={phase !== 'atBox'}
              activeOpacity={0.85}
              accessibilityLabel={isFa ? `جعبه ${i + 1}` : `Box ${i + 1}`}
              accessibilityRole="button"
              style={{ position: 'absolute', left: worldX - boxW / 2, top: boxY - boxH / 2, zIndex: 5 }}
            >
              <Animated.View
                style={{
                  width: boxW,
                  height: boxH,
                  opacity: Animated.subtract(1, qAnim),
                  transform: [
                    { translateX: Animated.multiply(zoomAnim, boxDX) },
                    { translateY: Animated.multiply(zoomAnim, boxDY) },
                    { scale: zoomAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) },
                    { rotate: wiggleDeg },
                  ],
                }}
              >
                <Image
                  source={BOX_CLOSED}
                  style={{ position: 'absolute', left: 0, top: 0, width: boxW, height: boxH, opacity: Animated.subtract(1, zoomAnim) }}
                  resizeMode="contain"
                />
                <Image
                  source={BOX_OPEN}
                  style={{ position: 'absolute', left: 0, top: 0, width: boxW, height: boxH, opacity: zoomAnim }}
                  resizeMode="contain"
                />
                <Animated.View style={{ opacity: Animated.subtract(1, zoomAnim) }}>
                  <View
                    style={[
                      styles.qBadge,
                      {
                        width: boxW * 0.42,
                        height: boxW * 0.42,
                        borderRadius: boxW * 0.21,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: boxW * 0.26, color: '#6C4EFF', fontWeight: 'bold' }}>؟</Text>
                  </View>
                </Animated.View>
                {spark && <SparkBurst x={boxW / 2} y={-boxH * 0.2} size={boxW} />}
              </Animated.View>
            </TouchableOpacity>
          );
        })}

        {/* The car with the collected items on its roof. It never takes
            touches (pointerEvents none) and paints below the box, so the
            stopped car can never cover or steal taps from the box. */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: carTop,
            width: carW,
            height: carH + miniSize,
            zIndex: 1,
            transform: [{ translateX: Animated.subtract(carX, carW / 2) }],
          }}
        >
          <View style={[styles.roof, { minHeight: miniSize }]}>
            {collected.map(w =>
              w.id.startsWith('painting/color/') ? (
                <View
                  key={w.id}
                  style={{
                    width: miniSize * 0.8,
                    height: miniSize * 0.8,
                    borderRadius: miniSize * 0.4,
                    backgroundColor: COLOR_HEX[w.id] ?? '#CCCCCC',
                  }}
                  accessibilityLabel={w.fa}
                />
              ) : (
                <WordArt key={w.id} word={w} size={miniSize * 0.9} />
              ),
            )}
          </View>
          <Animated.View style={{ transform: [{ translateY: carBounce }] }}>
            <Image
              source={CARS[buddy] ?? CARS.neli}
              style={{ width: carW, height: carH }}
              resizeMode="contain"
              accessibilityLabel={buddy}
            />
          </Animated.View>
        </Animated.View>
      </Animated.View>

      {/* Gentle dim over the scene while the box opens and asks. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          zIndex: 20,
          backgroundColor: '#000000',
          opacity: dimAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }),
        }}
      />

      {/* The right answer flies from the screen center into the car. */}
      {phase === 'flying' && flying && (
        <Animated.View
          style={{
            position: 'absolute',
            left: gw / 2 - optSize * 0.4,
            top: flyStartY - optSize * 0.4,
            zIndex: 30,
            opacity: flyAnim.interpolate({ inputRange: [0.7, 1], outputRange: [1, 0.4] }),
            transform: [
              { translateX: flyAnim.interpolate({ inputRange: [0, 1], outputRange: [0, flyDX] }) },
              { translateY: flyAnim.interpolate({ inputRange: [0, 1], outputRange: [0, flyDY] }) },
            ],
          }}
          pointerEvents="none"
        >
          <OptionArt word={flying} kind={rounds[leg]!.kind} size={optSize * 0.8} />
        </Animated.View>
      )}

      {/* The question grows out of the open box into the center, and
          shrinks away again after the answer. */}
      {(phase === 'question' || phase === 'flying') && choices.length === 3 && (
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 40,
            opacity: qAnim,
            transform: [{ scale: qAnim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }],
          }}
          pointerEvents={phase === 'question' ? 'box-none' : 'none'}
        >
          <QuestionView
            key={legIndex}
            round={rounds[legIndex]!}
            choices={choices}
            optSize={optSize}
            onCorrect={answerCorrect}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  bgRow: { position: 'absolute', left: 0, top: 0 },
  qBadge: {
    position: 'absolute',
    left: '29%',
    top: '34%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  question: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  promptRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  prompt: {
    color: '#FFFFFF',
    textAlign: 'center',
    backgroundColor: 'rgba(45,27,105,0.72)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  qRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  qOption: {
    borderColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roof: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4, marginBottom: 2 },
});
