// Game 1: Neli's Drive (quest v2, section 3). The chosen buddy drives a
// small car right → left along a cream road. Three mystery boxes — one per
// pick — each a different mini-game: counting the fruit, popping the color
// balloon, finding the dish. Right: the item flies into the car. Wrong:
// try again voice only, hand guides to the right one. No losing, no going
// back. Ends at the picnic.

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
import { COLOR_HEX, farApartPair, PickKind, pickPool, sampleOptions, shuffle } from './pickLists';
import { FaTestAudioKey } from '../assets/faTestAudio.generated';
import Balloon from './Balloon';
import ColorDot from './ColorDot';
import { IdleHand, IDLE_HAND_DELAY, useIdleHint } from './IdleHand';
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

// Long horizontal world: about 5 screen widths. All drive positions are
// world X coordinates (right → left). The camera follows the car, so only
// the part around the car is ever visible.
const WORLD_SCREENS = 5;
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

// Counting sizes: the number buttons run at half scale, the fruits keep
// their size, and the whole column is shrunk only if it would overflow the
// space above the parked car (short phones).
function countingSizes(optSize: number, gw: number, carTop: number, count: number) {
  const fruit = Math.min(optSize * 0.45, (gw * 0.92 - (count - 1) * 8) / Math.max(1, count));
  const num = optSize * 0.5;
  const natural = 28 + 7 + fruit + 8 + num * 1.05;
  const k = Math.min(1, (carTop - 16) / natural);
  return { fruitSize: fruit * k, numSize: num * k };
}

// Persian digits for the counting buttons.
const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵'];

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
    return <ColorDot id={word.id} size={size * 0.92} />;
  }
  // Every picture gets the exact same square box (contain), so herbs and
  // peppers render equally big regardless of their art's aspect ratio.
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <WordArt word={word} size={size * 0.92} />
    </View>
  );
}

function QuestionView({
  round,
  choices,
  optSize,
  lift,
  onCorrect,
}: {
  round: DriveRound;
  choices: DisplayWord[];
  optSize: number;
  lift: number;
  onCorrect: (firstTry: boolean) => void;
}) {
  const { lang } = useContext(AppContext);
  const isFa = lang === 'fa' || lang === 'ar';
  const [tries, setTries] = useState(0);
  const [done, setDone] = useState(false);

  const showHandQ = useIdleHint(!done, IDLE_HAND_DELAY, tries);

  const tap = (word: DisplayWord) => {
    if (done) return;
    if (word.id === round.answer.id) {
      setDone(true);
      const firstTry = tries === 0;
      recordQuestAnswer(round.answer.id, firstTry);
      onCorrect(firstTry);
      return;
    }
    // A wrong tap changes nothing on screen: only the try-again voice
    // plays, and the hand points at the right option.
    setTries(t => t + 1);
    void questPlay('feedback/try-again' as FaTestAudioKey);
  };

  return (
    <View style={[styles.question, { paddingBottom: lift }]} pointerEvents="box-none">
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
          // No border on wrong answers: the hand alone guides to the right one.
          const showGlow = false;
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
                },
              ]}
            >
              {showHandQ && isTarget && (
                <View pointerEvents="none" style={styles.handOver}>
                  <IdleHand size={optSize} />
                </View>
              )}
              <OptionArt word={word} kind={round.kind} size={optSize * 0.85} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function CountingView({
  fruit,
  count,
  options,
  fruitSize,
  numSize,
  lift,
  onCorrect,
}: {
  fruit: DisplayWord;
  count: number;
  options: number[];
  fruitSize: number;
  numSize: number;
  lift: number;
  onCorrect: (firstTry: boolean) => void;
}) {
  const { lang } = useContext(AppContext);
  const isFa = lang === 'fa' || lang === 'ar';
  const [tries, setTries] = useState(0);
  const [done, setDone] = useState(false);
  const showHand = useIdleHint(!done, IDLE_HAND_DELAY, tries);

  const tap = (n: number) => {
    if (done) return;
    if (n === count) {
      setDone(true);
      const firstTry = tries === 0;
      recordQuestAnswer(fruit.id, firstTry);
      void questPlay(`counting/number/${count}` as FaTestAudioKey);
      onCorrect(firstTry);
      return;
    }
    // A wrong tap changes nothing on screen: only the try-again voice plays.
    setTries(t => t + 1);
    void questPlay('feedback/try-again' as FaTestAudioKey);
  };

  return (
    <View style={[styles.question, { paddingBottom: lift }]} pointerEvents="box-none">
      <Text
        style={[styles.prompt, { fontFamily: ff(lang, 'black'), fontSize: Math.max(16, numSize * 0.22) }, dir(lang)]}
      >
        {isFa ? 'چندتا میبینی' : 'How many do you see?'}
      </Text>
      <View style={[styles.fruitRow, { gap: 8, marginTop: 7 }]}>
        {Array.from({ length: count }).map((_, i) => (
          <WordArt key={i} word={fruit} size={fruitSize} />
        ))}
      </View>
      <View style={[styles.qRow, isFa && { flexDirection: 'row-reverse' }, { marginTop: 8 }]}>
        {options.map(n => {
          // No border on wrong answers: the hand alone guides to the right one.
          const showGlow = false;
          const isTarget = n === count;
          return (
            <TouchableOpacity
              key={n}
              onPress={() => tap(n)}
              activeOpacity={0.85}
              accessibilityLabel={FA_DIGITS[n]}
              accessibilityRole="button"
              style={[
                styles.numOption,
                {
                  width: numSize * 1.05,
                  height: numSize * 1.05,
                  borderRadius: numSize * 0.28,
                  borderWidth: showGlow || (done && isTarget) ? Math.max(4, numSize * 0.05) : 0,
                },
              ]}
            >
              {showHand && isTarget && (
                <View pointerEvents="none" style={styles.handOver}>
                  <IdleHand size={numSize * 1.05} />
                </View>
              )}
              <Text style={[styles.numText, { fontFamily: ff(lang, 'black'), fontSize: numSize * 0.55 }]}>
                {FA_DIGITS[n]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function BalloonView({
  round,
  choices,
  optSize,
  lift,
  riseDist,
  onCorrect,
}: {
  round: DriveRound;
  choices: DisplayWord[];
  optSize: number;
  lift: number;
  riseDist: number;
  onCorrect: (firstTry: boolean) => void;
}) {
  const { lang } = useContext(AppContext);
  const isFa = lang === 'fa' || lang === 'ar';
  const [tries, setTries] = useState(0);
  const [done, setDone] = useState(false);
  const [rising, setRising] = useState<string | null>(null);
  const rise = useRef(new Animated.Value(0)).current;
  const showHand = useIdleHint(!done, IDLE_HAND_DELAY, tries);

  const tap = (word: DisplayWord) => {
    if (done) return;
    if (word.id === round.answer.id) {
      setDone(true);
      const firstTry = tries === 0;
      recordQuestAnswer(round.answer.id, firstTry);
      // The right balloon floats up before flying to the car.
      setRising(word.id);
      Animated.timing(rise, { toValue: 1, duration: 500, useNativeDriver: true }).start(() =>
        onCorrect(firstTry),
      );
      return;
    }
    // A wrong tap changes nothing on screen: only the try-again voice plays.
    setTries(t => t + 1);
    void questPlay('feedback/try-again' as FaTestAudioKey);
  };

  const riseY = rise.interpolate({ inputRange: [0, 1], outputRange: [0, -riseDist] });

  return (
    <View style={[styles.question, { paddingBottom: lift }]} pointerEvents="box-none">
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
          // No border on wrong answers: the hand alone guides to the right one.
          const showGlow = false;
          const isRising = rising === word.id;
          return (
            <TouchableOpacity
              key={word.id}
              onPress={() => tap(word)}
              activeOpacity={0.85}
              accessibilityLabel={word.fa}
              accessibilityRole="button"
              style={[
                styles.balloonOption,
                {
                  width: optSize * 1.05,
                  borderRadius: optSize * 0.2,
                  borderWidth: showGlow || (done && isTarget) ? Math.max(4, optSize * 0.05) : 0,
                },
              ]}
            >
              {showHand && isTarget && (
                <View pointerEvents="none" style={styles.handOver}>
                  <IdleHand size={optSize} />
                </View>
              )}
              <Animated.View style={isRising ? { transform: [{ translateY: riseY }] } : undefined}>
                <Balloon color={COLOR_HEX[word.id] ?? '#CCCCCC'} size={optSize * 0.85} />
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
  // A strip of grass stays under the road so the car never touches the
  // screen bottom on short phones.
  const roadPad = Math.max(4, gh * 0.02);
  const roadTop = gh - roadH - roadPad;
  // Two lanes: the car drives the upper (far) lane, wheels at 40% of the
  // road height. Each mystery box waits in that same lane, right in front
  // of the car.
  const carWheelsY = roadTop + roadH * 0.4;
  // The box waits in the car's own lane, a touch below the car body's
  // center, so it reads as right in front of the car at every stop.
  const boxY = carWheelsY - carH * 0.42;
  // Collected items ride in the rear side window (the window right of the
  // buddy), smaller, seen through the glass.
  const winCx = carW * 0.71;
  const winCy = carH * 0.41;
  // Window minis run 40% bigger than before; the stack cap below grows
  // by the same factor so all three still fit.
  const winMini = carH * 0.16 * 1.4;
  const carTop = carWheelsY - carH - 2;
  // The question must sit fully above the car + roof rack, never over it.
  const questionLift = Math.max(0, gh - carTop) + 8;
  // Question content is scaled to the measured space above the parked car,
  // so it is never cut off — even on a 360pt-tall phone with the car up in
  // the far lane. Each game passes its own height in optSize units.
  const fitFor = (units: number) => Math.min(1, Math.max(0.2, (carTop - 40) / (optSize * units)));
  const optSize = Math.max(48, Math.min(gw * 0.13, gh * 0.26));
  // Landmarks stand on the grass behind the road, never taller than the car.
  const landmarkH = carH * 0.95;
  const landmarkW = landmarkH * 1.3;
  // Picnic destination: a big blanket with Grandma right at its edge,
  // a head taller than the car, feet on the road near the blanket.
  const destSize = gh * 0.46;
  const grandmaH = carH * 1.2;
  const grandmaW = grandmaH * 0.58;
  const blanketW = destSize;
  const blanketH = destSize * 0.72;
  // Feet rest slightly down onto the road so blanket + Grandma read as
  // close to the road, not floating behind it.
  const destFeetY = roadTop + roadH * 0.14;

  // World geometry (right → left): the car enters from the right, meets
  // one box per screen, and ends at the picnic at the far LEFT end.
  const worldW = WORLD_SCREENS * gw;
  const boxWorldX = (i: number) => worldW - (1.5 + i) * gw;
  const destWorldX = 0.55 * gw;
  // The car stops BEFORE the box: the box stays ahead-left of the car
  // with a clear gap, so tapping the box never hits the car.
  const STOP_GAP = boxW * 0.35;
  const stopWorldX = (i: number) => boxWorldX(i) + carW / 2 + boxW / 2 + STOP_GAP;
  // Park the car right beside the blanket: car nose just past its edge.
  const destStopX = destWorldX + blanketW / 2 + carW / 2 + carW * 0.06;
  const landmarkWorldX = (i: number) => {
    const right = i === 0 ? worldW - 0.5 * gw : boxWorldX(i - 1);
    const left = i < rounds.length ? boxWorldX(i) : destWorldX;
    return (right + left) / 2;
  };
  const clampCam = (worldX: number) => Math.min(Math.max(worldX - gw * 0.62, 0), Math.max(worldW - gw, 0));

  const [phase, setPhase] = useState<DrivePhase>('driving');
  const [legIndex, setLegIndex] = useState(0);
  const [boxGone, setBoxGone] = useState(false);
  const [boxOpen, setBoxOpen] = useState(false);
  const [spark, setSpark] = useState(false);
  const [choices, setChoices] = useState<DisplayWord[]>([]);
  const [collected, setCollected] = useState<DisplayWord[]>([]);
  const [flying, setFlying] = useState<DisplayWord | null>(null);
  const [countQ, setCountQ] = useState<{ count: number; options: number[] } | null>(null);
  const [bubble, setBubble] = useState(false);
  const boxIdle = useIdleHint(phase === 'atBox', IDLE_HAND_DELAY, 0);

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
  const grandmaWave = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const collectedRef = useRef<DisplayWord[]>([]);
  // Balloon color ids for the color round (child's first), saved into the
  // collected word so the picnic ties up the same balloons.
  const paletteRef = useRef<string[]>([]);
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

  const stopBounce = () => {
    bounceLoop.current?.stop();
    bounceLoop.current = null;
    carBounce.setValue(0);
  };

  // No bounce while driving: the ±7pt shake read as vibration on tablet.
  // The car glides still; stopBounce on arrival keeps it settled.
  const driveTo = (worldX: number, then?: () => void) => {
    setPhase('driving');
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
      // Grandma waves hello: rock side to side a few times.
      grandmaWave.setValue(0);
      Animated.sequence([
        Animated.timing(grandmaWave, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(grandmaWave, { toValue: -1, duration: 240, useNativeDriver: true }),
        Animated.timing(grandmaWave, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.timing(grandmaWave, { toValue: 0, duration: 240, useNativeDriver: true }),
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
      // Calm beat 2: the box zooms toward the screen center, swapping to
      // the open art with sparkles, as the scene gently dims.
      setSpark(true);
      setBoxOpen(true);
      setBubble(true);
      later(1600, () => setBubble(false));
      playPop();
      later(800, () => setSpark(false));
      Animated.parallel([
        Animated.timing(zoomAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(dimAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start(() => {
        const round = rounds[legIndex]!;
        if (round.kind === 'fruit') {
          // Counting: N copies of the fruit, N random 1-5, asked in the
          // counting voice. The prompt itself stays text-only (no recording
          // of it exists yet, and no TTS).
          const count = 1 + Math.floor(Math.random() * 5);
          const others = shuffle([1, 2, 3, 4, 5].filter(n => n !== count)).slice(0, 2);
          setCountQ({ count, options: shuffle([count, ...others]) });
          void questPlay('counting/number/info' as FaTestAudioKey);
        } else {
          const distract =
            round.kind === 'color'
              ? farApartPair(pickPool('color'), round.answer.id)
              : sampleOptions(pickPool(round.kind), 2, new Set([round.answer.id]));
          if (round.kind === 'color') paletteRef.current = [round.answer.id, ...distract.map(d => d.id)];
          setChoices(shuffle([round.answer, ...distract]));
          void questPlay(round.answer.audioKey);
        }
        setPhase('question');
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
    // The counting round already played its number clip; nothing else plays.
    if (round.kind !== 'fruit') void questPlay(round.answer.audioKey);
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
      const item: DisplayWord =
        round.kind === 'fruit' && countQ
          ? { ...round.answer, count: countQ.count }
          : round.kind === 'color'
            ? { ...round.answer, balloonIds: paletteRef.current }
            : round.answer;
      const next = [...collectedRef.current, item];
      collectedRef.current = next;
      setCollected(next);
      setBoxGone(false);
      setBoxOpen(false);
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
  // Only one box art is ever mounted (see below): closed until the child
  // taps, open afterwards, both in the exact same box.
  const grandmaWaveDeg = grandmaWave.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '14deg'] });

  // Screen-space geometry for the current leg: the camera has settled, so
  // the box-to-center and center-to-car hops are plain static numbers.
  const leg = Math.min(legIndex, rounds.length - 1);
  const legStopX = stopWorldX(leg);
  const legCam = clampCam(legStopX);
  // How far the active box must travel to reach the screen center.
  const boxDX = gw / 2 - (boxWorldX(leg) - legCam);
  const boxDY = gh / 2 - boxY;
  // The answered item flies from the screen center into the back window.
  const flyStartY = gh * 0.48;
  const flyDX = legStopX - legCam - gw / 2;
  const flyDY = carTop + winCy - flyStartY;

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
            y1={roadH * 0.5}
            x2={worldW}
            y2={roadH * 0.5}
            stroke="#FFFFFF"
            strokeWidth={Math.max(3, roadH * 0.035)}
            strokeDasharray="16,20"
            strokeLinecap="round"
            opacity={0.8}
          />
        </Svg>

        {/* Destination: big picnic blanket + car-height Grandma at the far
            LEFT end, feet on the road. The car parks right beside it. */}
        <Image
          source={story.destination}
          style={{
            position: 'absolute',
            left: destWorldX - blanketW / 2,
            top: destFeetY - blanketH,
            width: blanketW,
            height: blanketH,
          }}
          resizeMode="contain"
          accessibilityLabel={isFa ? 'پیک‌نیک' : 'Picnic'}
        />
        <Animated.View
          style={{
            position: 'absolute',
            left: destWorldX + blanketW / 2 - grandmaW * 0.4,
            top: destFeetY - grandmaH,
            transform: [{ scale: grandmaBounce }, { rotate: grandmaWaveDeg }],
          }}
        >
          <Image
            source={story.grandma}
            style={{ width: grandmaW, height: grandmaH }}
            resizeMode="contain"
            accessibilityLabel={isFa ? 'مادربزرگ' : 'Grandma'}
          />
        </Animated.View>

        {/* One landmark in each gap between stops, feet on the grass behind the road. */}
        {SCENERY_SRC.slice(0, rounds.length + 1).map((src, i) => (
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
              {boxIdle && (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: boxW / 2 - boxH * 0.39,
                    top: boxH / 2 - boxH * 0.39,
                    zIndex: 6,
                  }}
                >
                  <IdleHand size={boxH * 0.78} />
                </View>
              )}
              {bubble && (
                <View pointerEvents="none" style={[styles.bubble, { left: -14, top: -56 }]}>
                  <Text style={[styles.bubbleText, { fontFamily: ff(lang, 'black') }, dir(lang)]}>
                    {isFa ? 'بازش کن!' : 'Open it!'}
                  </Text>
                </View>
              )}
              <Animated.View
                style={{
                  width: boxW,
                  height: boxH,
                  opacity: qAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                  transform: [
                    { translateX: Animated.multiply(zoomAnim, boxDX) },
                    { translateY: Animated.multiply(zoomAnim, boxDY) },
                    { scale: zoomAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) },
                    { rotate: wiggleDeg },
                  ],
                }}
              >
                {/* One art at a time in the exact same box: closed until the
                    tap, open afterwards — never stacked together. */}
                <Image
                  source={boxOpen ? BOX_OPEN : BOX_CLOSED}
                  style={{ position: 'absolute', left: 0, top: 0, width: boxW, height: boxH }}
                  resizeMode="contain"
                />
                {spark && <SparkBurst x={boxW / 2} y={-boxH * 0.2} size={boxW} />}
              </Animated.View>
            </TouchableOpacity>
          );
        })}

        {/* The car with the collected picks visible in its back window. It
            never takes touches (pointerEvents none) and paints below the
            box, so the stopped car can never cover or steal taps. */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: carTop,
            width: carW,
            height: carH,
            zIndex: 1,
            transform: [{ translateX: Animated.subtract(carX, carW / 2) }],
          }}
        >
          <Animated.View style={{ transform: [{ translateY: carBounce }] }}>
            <Image
              source={CARS[buddy] ?? CARS.neli}
              style={{ width: carW, height: carH }}
              resizeMode="contain"
              accessibilityLabel={buddy}
            />
          </Animated.View>
          {/* Collected picks ride in the back window, smaller, stacked
              vertically and centered on the rear side window, over the
              glass. The color rides as a mini balloon with its string.
              Minis shrink as more are collected so all three fit. */}
          {collected.length > 0 && (() => {
            const n = collected.length;
            const m = Math.min(winMini, (carH * 0.34 * 1.4) / (n + (n - 1) * 0.25));
            const gap = m * 0.25;
            const colH = n * m + (n - 1) * gap;
            return (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: winCx - m / 2,
                  top: winCy - colH / 2,
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap,
                }}
              >
                {collected.map(w =>
                  w.id.startsWith('painting/color/') ? (
                    <Balloon key={w.id} color={COLOR_HEX[w.id] ?? '#CCCCCC'} size={m * 0.75} />
                  ) : (
                    <WordArt key={w.id} word={w} size={m} />
                  ),
                )}
              </View>
            );
          })()}
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
          {rounds[leg]!.kind === 'color' ? (
            <Balloon color={COLOR_HEX[flying.id] ?? '#CCCCCC'} size={optSize * 0.8} />
          ) : (
            <OptionArt word={flying} kind={rounds[leg]!.kind} size={optSize * 0.8} />
          )}
        </Animated.View>
      )}

      {/* The question grows out of the open box into the center, and
          shrinks away again after the answer. */}
      {(phase === 'question' || phase === 'flying') &&
        ((rounds[leg]!.kind === 'fruit' && countQ !== null) || choices.length === 3) && (
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
          {rounds[leg]!.kind === 'fruit' && countQ ? (
            <CountingView
              key={legIndex}
              fruit={rounds[legIndex]!.answer}
              count={countQ.count}
              options={countQ.options}
              fruitSize={countingSizes(optSize, gw, carTop, countQ.count).fruitSize}
              numSize={countingSizes(optSize, gw, carTop, countQ.count).numSize}
              lift={questionLift}
              onCorrect={answerCorrect}
            />
          ) : rounds[leg]!.kind === 'color' ? (
            <BalloonView
              key={legIndex}
              round={rounds[legIndex]!}
              choices={choices}
              optSize={optSize * fitFor(1.55)}
              lift={questionLift}
              riseDist={gh * 0.25}
              onCorrect={answerCorrect}
            />
          ) : (
            <QuestionView
              key={legIndex}
              round={rounds[legIndex]!}
              choices={choices}
              optSize={optSize * fitFor(1.6)}
              lift={questionLift}
              onCorrect={answerCorrect}
            />
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  bgRow: { position: 'absolute', left: 0, top: 0 },
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
  fruitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  numOption: {
    backgroundColor: '#FFFDF5',
    borderColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { color: '#3A2A6B', textAlign: 'center', includeFontPadding: false },
  balloonOption: {
    borderColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  handOver: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  bubble: {
    position: 'absolute',
    backgroundColor: '#FFFDF5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 6,
    elevation: 3,
  },
  bubbleText: { color: '#3A2A6B', fontSize: 15, includeFontPadding: false },
  roof: { flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 2 },
  roofItems: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
});
