// Quest map (hackathon step 2, level 1). One screen: the garden background
// (mirrored copies so the joins hide), a soft sandy path drawn in code
// running right → left, 3 round stops, the buddy, and the backpack bar.
// Tapping the glowing stop opens that step; done stops turn into stars and
// the buddy walks (~1 s) to the next one. No timers, no losing.

import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { AppContext } from '../store/AppContext';
import { dir, ff } from '../theme/fonts';
import { BuddyId } from './buddyStore';
import { DisplayWord } from './questGroups';
import { Level1Quest, Level1Step } from './buildLevel1Quest';
import { QUEST_COLORS, buddyPose } from './questTheme';
import { isQuestMuted, questPlay, setQuestMuted } from './questSound';
import WordArt from './WordArt';
import FindIt from './FindIt';

const GARDEN_BG = require('../../assets/neli-world/quest/garden-background.png');

// Stop centers as fractions of the whole content width (right → left,
// the Farsi reading direction: the journey starts at the right edge).
const STOP_FRAC = [0.875, 0.5, 0.125];

function stopX(frac: number, contentW: number) {
  return frac * contentW;
}

function BackpackBar({
  collected,
  height,
}: {
  collected: DisplayWord[];
  height: number;
}) {
  const { lang } = useContext(AppContext);
  const [muted, setMuted] = useState(isQuestMuted());
  const pop = useRef(new Animated.Value(1)).current;
  const thumb = Math.max(30, Math.min(46, height * 0.62));

  useEffect(() => {
    if (collected.length === 0) return;
    Animated.sequence([
      Animated.timing(pop, { toValue: 1.25, duration: 200, useNativeDriver: true }),
      Animated.timing(pop, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [collected.length, pop]);

  return (
    <View style={[styles.packBar, { height, borderRadius: height * 0.3, paddingHorizontal: height * 0.25 }]}>
      <Text style={{ fontSize: thumb * 0.7 }} accessibilityLabel="🎒">🎒</Text>
      <Animated.View style={[styles.packItems, { transform: [{ scale: pop }] }]}>
        {collected.map(w => (
          <WordArt key={w.id} word={w} size={thumb} />
        ))}
      </Animated.View>
      <TouchableOpacity
        onPress={() => {
          const next = !muted;
          setMuted(next);
          setQuestMuted(next);
        }}
        activeOpacity={0.8}
        accessibilityLabel={lang === 'fa' ? 'بی‌صدا' : 'Mute'}
        accessibilityRole="button"
        style={{ marginLeft: 'auto' }}
      >
        <Text style={{ fontSize: thumb * 0.6 }}>{muted ? '🔇' : '🔊'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const SURPRISE_EMOJI: Record<string, string> = {
  gift_box: '🎁',
  shake_tree: '🌳',
  open_basket: '🧺',
};

export default function QuestMap({
  quest,
  buddy,
  collected,
  onCollect,
  onAnswer,
  onGoal,
}: {
  quest: Level1Quest;
  buddy: BuddyId;
  collected: DisplayWord[];
  onCollect: (word: DisplayWord) => void;
  onAnswer: (firstTryRight: boolean) => void;
  onGoal: () => void;
}) {
  const { lang } = useContext(AppContext);
  const { width: W, height: H } = useWindowDimensions();
  const isFa = lang === 'fa' || lang === 'ar';
  const [stopIndex, setStopIndex] = useState(0);
  const [stars, setStars] = useState<boolean[]>([false, false, false]);
  const [modalStep, setModalStep] = useState<Level1Step | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [walking, setWalking] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  const contentW = W * 3;
  const mapH = Math.max(200, H * 0.62);
  const buddySize = Math.min(W * 0.11, mapH * 0.34);
  const stopSize = Math.max(64, Math.min(W * 0.085, mapH * 0.3));
  const buddyX = useRef(new Animated.Value(stopX(STOP_FRAC[0], contentW))).current;
  const glow = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  // Start at the right edge: the first stop and a glimpse of the journey.
  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ x: contentW - W, animated: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One soft pulse on the current stop; nothing else moves.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1.12, duration: 550, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 1, duration: 550, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow, stopIndex]);

  const centerOn = (index: number) => {
    const x = Math.max(0, Math.min(contentW - W, stopX(STOP_FRAC[index], contentW) - W / 2));
    scrollRef.current?.scrollTo({ x, animated: true });
  };

  const openStop = (index: number) => {
    if (index !== stopIndex) return;
    setRevealed(false);
    setModalStep(quest.steps[index]);
  };

  const reveal = async (step: Level1Step) => {
    if (step.type === 'finale') {
      setModalStep(null);
      onGoal();
      return;
    }
    setRevealed(true);
    await questPlay(step.target.audioKey);
  };

  const surpriseTap = (step: Level1Step) => {
    if (step.type === 'finale') {
      void reveal(step);
      return;
    }
    // Shake the tree / unwrap the gift: one gentle motion, then the word.
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
    void reveal(step);
  };

  const collect = async (step: Extract<Level1Step, { type: 'find_it' }>) => {
    // The item flies into the backpack and the app says the word again.
    await questPlay(step.target.audioKey);
    setModalStep(null);
    onCollect(step.target);
    setStars(prev => prev.map((s, i) => (i === stopIndex ? true : s)));
    const next = stopIndex + 1;
    setWalking(true);
    Animated.timing(buddyX, {
      toValue: stopX(STOP_FRAC[next], contentW),
      duration: 1000,
      useNativeDriver: true,
    }).start(() => {
      setWalking(false);
      setStopIndex(next);
      centerOn(next);
    });
  };

  const shakeSpin = shake.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '10deg'] });
  const pathY = mapH * 0.7;

  return (
    <View style={{ flex: 1 }}>
      <BackpackBar collected={collected} height={Math.max(44, H * 0.09)} />
      <View style={[styles.mapWrap, { height: mapH }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
        >
          <View style={{ width: contentW, height: mapH }}>
            {/* Fallback sky + hills drawn in code; the garden art sits above. */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: QUEST_COLORS.sky }]} />
            {[0, 1, 2].map(i => (
              <Image
                key={i}
                source={GARDEN_BG}
                style={{
                  position: 'absolute',
                  left: i * W,
                  top: 0,
                  width: W,
                  height: mapH,
                  transform: [{ scaleX: i % 2 === 1 ? -1 : 1 }],
                }}
                resizeMode="cover"
              />
            ))}
            <Svg
              width={contentW}
              height={mapH}
              viewBox="0 0 300 100"
              preserveAspectRatio="none"
              style={{ position: 'absolute', left: 0, top: 0 }}
            >
              <Ellipse cx="60" cy="108" rx="90" ry="26" fill={QUEST_COLORS.grass} />
              <Ellipse cx="230" cy="110" rx="100" ry="28" fill={QUEST_COLORS.grass} />
              <Path
                d="M 296 72 C 250 58, 210 84, 158 68 S 60 56, 6 74"
                stroke={QUEST_COLORS.sand}
                strokeWidth={9}
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
            {/* Stops on the path. */}
            {quest.steps.map((step, i) => {
              const x = stopX(STOP_FRAC[i], contentW);
              const isCurrent = i === stopIndex;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => openStop(i)}
                  disabled={!isCurrent}
                  activeOpacity={0.85}
                  accessibilityLabel={isFa ? `ایستگاه ${i + 1}` : `Stop ${i + 1}`}
                  accessibilityRole="button"
                  style={[
                    styles.stop,
                    {
                      left: x - stopSize / 2,
                      top: pathY - stopSize / 2,
                      width: stopSize,
                      height: stopSize,
                      borderRadius: stopSize / 2,
                      opacity: i < stopIndex || isCurrent ? 1 : 0.55,
                    },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.stopInner,
                      {
                        width: stopSize,
                        height: stopSize,
                        borderRadius: stopSize / 2,
                        transform: isCurrent && !stars[i] ? [{ scale: glow }] : [],
                      },
                    ]}
                  >
                    <Text style={{ fontSize: stopSize * 0.44 }}>
                      {stars[i] ? '⭐' : step.type === 'finale' ? '🧺' : `${i + 1}`}
                    </Text>
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
            {/* The buddy stands on the current stop. */}
            <Animated.View
              style={{
                position: 'absolute',
                top: pathY - buddySize - stopSize * 0.32,
                left: 0,
                width: buddySize,
                height: buddySize,
                transform: [
                  {
                    translateX: Animated.subtract(buddyX, buddySize / 2),
                  },
                ],
              }}
            >
              <Image
                source={buddyPose(buddy, walking ? 'walking' : 'base')}
                style={{ width: buddySize, height: buddySize }}
                resizeMode="contain"
                accessibilityLabel={buddy}
              />
            </Animated.View>
          </View>
        </ScrollView>
      </View>

      <Modal
        visible={modalStep !== null}
        transparent
        animationType="fade"
        supportedOrientations={['landscape']}
        onRequestClose={() => {}}
      >
        <View style={styles.modalShade}>
          <View style={[styles.modalCard, { width: Math.min(W * 0.7, 560), borderRadius: 28 }]}>
            {modalStep && !revealed && (
              <TouchableOpacity
                onPress={() => surpriseTap(modalStep)}
                activeOpacity={0.85}
                accessibilityLabel={isFa ? 'بازش کن' : 'Open it'}
                accessibilityRole="button"
                style={styles.surprise}
              >
                <Animated.View style={{ transform: [{ rotate: shakeSpin }] }}>
                  <Text style={{ fontSize: Math.min(W * 0.12, 96) }}>
                    {SURPRISE_EMOJI[modalStep.surprise] ?? '🎁'}
                  </Text>
                </Animated.View>
                <Text style={[styles.surpriseText, { fontFamily: ff(lang, 'black') }, dir(lang)]}>
                  {isFa ? 'بزن روش!' : 'Tap it!'}
                </Text>
              </TouchableOpacity>
            )}
            {modalStep && revealed && modalStep.type === 'find_it' && (
              <FindIt
                target={modalStep.target}
                choices={modalStep.choices}
                onResult={firstTry => {
                  onAnswer(firstTry);
                  void collect(modalStep);
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  packBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20,10,50,0.55)',
    marginHorizontal: 12,
    marginBottom: 6,
  },
  packItems: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  mapWrap: { flex: 1, borderRadius: 24, overflow: 'hidden', marginHorizontal: 12 },
  stop: { position: 'absolute' },
  stopInner: {
    backgroundColor: '#FFFDF5',
    borderWidth: 4,
    borderColor: QUEST_COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#170736',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  modalShade: {
    flex: 1,
    backgroundColor: 'rgba(20,10,50,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: { backgroundColor: QUEST_COLORS.card, padding: 20, alignItems: 'center' },
  surprise: { alignItems: 'center', padding: 12 },
  surpriseText: { color: '#3A2A6B', fontSize: 20, marginTop: 8 },
});
