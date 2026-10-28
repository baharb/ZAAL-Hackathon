// Game 1: Neli's Drive (quest v2, section 3). The chosen buddy drives a
// small car right → left along a cream road. Five mystery boxes — one per
// pick — each open a question with the child's own pick + 2 distractors.
// Right: the item flies into the car. Wrong: shake + fade, try again, glow
// after 2 wrong tries. No losing, no going back. Ends at the picnic.

import React, { useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

// Roadside scenery standing between the boxes (fractions of screen width).
const SCENERY: { src: ImageSourcePropType; frac: number }[] = [
  { src: require('../../assets/neli-world/quest/landmarks/apple-tree.png'), frac: 0.75 },
  { src: require('../../assets/neli-world/quest/landmarks/bridge.png'), frac: 0.61 },
  { src: require('../../assets/neli-world/quest/landmarks/sunflowers.png'), frac: 0.47 },
  { src: require('../../assets/neli-world/quest/landmarks/windmill.png'), frac: 0.33 },
  { src: require('../../assets/neli-world/quest/landmarks/mushroom-pond.png'), frac: 0.2 },
];

// Box centers as fractions of width, right → left. The car stops at the
// picnic (grandma's side) after the last box.
const BOX_FRAC = [0.82, 0.68, 0.54, 0.4, 0.28];
const DEST_FRAC = 0.22;
const DRIVE_MS = 1500;

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
  promptTop,
  onCorrect,
}: {
  round: DriveRound;
  choices: DisplayWord[];
  optSize: number;
  promptTop: number;
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
    <View style={[styles.question, { top: promptTop }]} pointerEvents="box-none">
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

  const roadH = H * 0.3;
  const roadTop = H - roadH;
  const boxSize = Math.max(64, Math.min(W * 0.1, H * 0.26));
  const carW = Math.min(W * 0.2, H * 0.38);
  const carH = carW * 0.52;
  const carTop = H - roadH * 0.18 - carH;
  const optSize = Math.max(64, Math.min(W * 0.14, H * 0.26));
  const landmarkH = Math.min(W * 0.085, H * 0.24);
  const destSize = Math.min(W * 0.16, H * 0.36);

  const boxX = (i: number) => BOX_FRAC[i]! * W;
  const boxY = H - roadH * 0.55;

  const [phase, setPhase] = useState<DrivePhase>('driving');
  const [legIndex, setLegIndex] = useState(0);
  const [boxOpen, setBoxOpen] = useState(false);
  const [boxGone, setBoxGone] = useState(false);
  const [spark, setSpark] = useState(false);
  const [choices, setChoices] = useState<DisplayWord[]>([]);
  const [collected, setCollected] = useState<DisplayWord[]>([]);
  const [flying, setFlying] = useState<DisplayWord | null>(null);

  const carX = useRef(new Animated.Value(W * 1.05)).current;
  const carBounce = useRef(new Animated.Value(0)).current;
  const bounceLoop = useRef<Animated.CompositeAnimation | null>(null);
  const wiggle = useRef(new Animated.Value(0)).current;
  const boxFade = useRef(new Animated.Value(1)).current;
  const flyAnim = useRef(new Animated.Value(0)).current;
  const grandmaBounce = useRef(new Animated.Value(1)).current;
  const bgShift = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const collectedRef = useRef<DisplayWord[]>([]);
  const firstTriesRef = useRef<boolean[]>([]);
  const phaseRef = useRef<DrivePhase>('driving');
  phaseRef.current = phase;

  const later = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      bounceLoop.current?.stop();
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

  const driveTo = (frac: number, then?: () => void) => {
    setPhase('driving');
    startBounce();
    Animated.parallel([
      Animated.timing(carX, {
        toValue: frac * W,
        duration: DRIVE_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(bgShift, {
        toValue: 1 - frac,
        duration: DRIVE_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      stopBounce();
      then?.();
    });
  };

  // The quest starts with the drive to the first box.
  useEffect(() => {
    driveTo(BOX_FRAC[0]!, () => {
      if (phaseRef.current === 'driving') setPhase('atBox');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openBox = () => {
    if (phase !== 'atBox') return;
    setPhase('opening');
    Animated.sequence([
      Animated.timing(wiggle, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(wiggle, { toValue: -1, duration: 180, useNativeDriver: true }),
      Animated.timing(wiggle, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setBoxOpen(true);
      playPop();
      setSpark(true);
      later(650, () => {
        setSpark(false);
        const round = rounds[legIndex]!;
        const distract = sampleOptions(pickPool(round.kind), 2, new Set([round.answer.id]));
        setChoices(shuffle([round.answer, ...distract]));
        // The question rises out of the open box; the box fades away.
        Animated.timing(boxFade, { toValue: 0, duration: 400, useNativeDriver: true }).start(() =>
          setBoxGone(true),
        );
        setPhase('question');
        void questPlay(round.answer.audioKey);
      });
    });
  };

  const answerCorrect = (firstTry: boolean) => {
    const round = rounds[legIndex]!;
    firstTriesRef.current.push(firstTry);
    setPhase('flying');
    void questPlay(round.answer.audioKey);
    setFlying(round.answer);
    flyAnim.setValue(0);
    Animated.timing(flyAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start(
      () => {
        setFlying(null);
        const next = [...collectedRef.current, round.answer];
        collectedRef.current = next;
        setCollected(next);
        setBoxOpen(false);
        setBoxGone(false);
        boxFade.setValue(1);
        if (legIndex >= rounds.length - 1) {
          const dest = DEST_FRAC;
          setLegIndex(legIndex + 1);
          driveTo(dest, () => {
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
        } else {
          const nextLeg = legIndex + 1;
          setLegIndex(nextLeg);
          driveTo(BOX_FRAC[nextLeg]!, () => {
            if (phaseRef.current === 'driving') setPhase('atBox');
          });
        }
      },
    );
  };

  const wiggleDeg = wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-10deg', '10deg'] });
  const bgX = bgShift.interpolate({ inputRange: [0, 1], outputRange: [0, -W * 0.3] });
  const miniSize = Math.max(28, Math.min(carW * 0.22, H * 0.09));

  const flyX = flyAnim.interpolate({ inputRange: [0, 1], outputRange: [boxX(legIndex), DEST_FRAC * W] });
  const flyY = flyAnim.interpolate({ inputRange: [0, 1], outputRange: [boxY, carTop] });

  return (
    <View style={styles.root}>
      {/* Garden background, mirrored copies; shifts gently as the car moves. */}
      <Animated.View style={[styles.bgRow, { width: W * 2.3, height: H, transform: [{ translateX: bgX }] }]}>
        <Image source={GARDEN_BG} style={{ width: W * 1.15, height: H }} resizeMode="cover" />
        <Image
          source={GARDEN_BG}
          style={{ width: W * 1.15, height: H, transform: [{ scaleX: -1 }] }}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Cream road drawn in code along the bottom. */}
      <Svg width={W} height={roadH} style={{ position: 'absolute', left: 0, top: roadTop }}>
        <Rect x={0} y={0} width={W} height={roadH} fill="#F6E7C8" />
        <Rect x={0} y={0} width={W} height={Math.max(4, roadH * 0.06)} fill="#EAD3A8" />
        <Line
          x1={0}
          y1={roadH * 0.55}
          x2={W}
          y2={roadH * 0.55}
          stroke="#FFFFFF"
          strokeWidth={Math.max(3, roadH * 0.035)}
          strokeDasharray="16,20"
          strokeLinecap="round"
          opacity={0.8}
        />
      </Svg>

      {/* Destination: picnic blanket + Grandma. */}
      <Image
        source={story.destination}
        style={{
          position: 'absolute',
          left: 0.015 * W,
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
          left: 0.1 * W,
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

      {/* Roadside scenery between the boxes. */}
      {SCENERY.map((s, i) => (
        <Image
          key={i}
          source={s.src}
          style={{
            position: 'absolute',
            left: s.frac * W - landmarkH / 2,
            top: roadTop - landmarkH * 1.05,
            width: landmarkH,
            height: landmarkH * 1.05,
          }}
          resizeMode="contain"
        />
      ))}

      {/* The five mystery boxes. */}
      {BOX_FRAC.map((frac, i) => {
        if (i < legIndex) return null;
        const active = i === legIndex;
        if (!active) {
          return (
            <View key={i} style={{ position: 'absolute', left: frac * W - boxSize / 2, top: boxY - boxSize / 2 }}>
              <Image source={BOX_CLOSED} style={{ width: boxSize, height: boxSize }} resizeMode="contain" />
              <View
                style={[
                  styles.qBadge,
                  {
                    width: boxSize * 0.42,
                    height: boxSize * 0.42,
                    borderRadius: boxSize * 0.21,
                  },
                ]}
              >
                <Text style={{ fontSize: boxSize * 0.26, color: '#6C4EFF', fontWeight: 'bold' }}>؟</Text>
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
            style={{ position: 'absolute', left: frac * W - boxSize / 2, top: boxY - boxSize / 2 }}
          >
            <Animated.View style={{ opacity: boxFade, transform: [{ rotate: wiggleDeg }] }}>
              <Image
                source={boxOpen ? BOX_OPEN : BOX_CLOSED}
                style={{ width: boxSize, height: boxSize }}
                resizeMode="contain"
              />
              {!boxOpen && (
                <View
                  style={[
                    styles.qBadge,
                    {
                      width: boxSize * 0.42,
                      height: boxSize * 0.42,
                      borderRadius: boxSize * 0.21,
                    },
                  ]}
                >
                  <Text style={{ fontSize: boxSize * 0.26, color: '#6C4EFF', fontWeight: 'bold' }}>؟</Text>
                </View>
              )}
            </Animated.View>
          </TouchableOpacity>
        );
      })}
      {spark && <SparkBurst x={boxX(legIndex)} y={boxY - boxSize * 0.7} size={boxSize} />}

      {/* The question rises out of the open box. */}
      {phase === 'question' && choices.length === 3 && (
        <QuestionView
          key={legIndex}
          round={rounds[legIndex]!}
          choices={choices}
          optSize={optSize}
          promptTop={Math.max(4, H * 0.06)}
          onCorrect={answerCorrect}
        />
      )}

      {/* The car with the collected items on its roof. */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: carTop,
          width: carW,
          height: carH + miniSize,
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

      {/* The right answer flies from the box into the car. */}
      {flying && (
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            zIndex: 20,
            opacity: flyAnim.interpolate({ inputRange: [0.7, 1], outputRange: [1, 0.4] }),
            transform: [{ translateX: flyX }, { translateY: flyY }],
          }}
          pointerEvents="none"
        >
          <OptionArt word={flying} kind={rounds[legIndex]!.kind} size={optSize * 0.8} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  bgRow: { position: 'absolute', left: 0, top: 0, flexDirection: 'row' },
  qBadge: {
    position: 'absolute',
    left: '29%',
    top: '34%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  question: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 10 },
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
