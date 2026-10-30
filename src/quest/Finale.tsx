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
import PopperCelebration from '../components/PopperCelebration';
import { AppContext } from '../store/AppContext';
import { dir, ff } from '../theme/fonts';
import { FaTestAudioKey } from '../assets/faTestAudio.generated';
import { noteAudioPlayerReleased, playFaAudioSequence } from '../utils/faAudio';
import { isQuestMuted } from './questSound';
import { BUDDIES, BuddyId } from './buddyStore';
import { DisplayWord } from './questGroups';
import { COLOR_HEX } from './pickLists';
import { Story } from './stories';
import { buddyPose } from './questTheme';
import { saveMyDay } from './myDaysStore';
import WordArt from './WordArt';
import Balloon from './Balloon';
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
}: {
  words: DisplayWord[];
  buddy: BuddyId;
  story: Story;
  leveledUp: boolean;
  level: number;
  onDone: () => void;
}) {
  const { lang } = useContext(AppContext);
  const { width: W, height: H } = useWindowDimensions();
  const isFa = lang === 'fa' || lang === 'ar';

  const [celebrating, setCelebrating] = useState(false);
  const [photoPhase, setPhotoPhase] = useState<PhotoPhase>('none');
  const [showCeleb, setShowCeleb] = useState(false);
  const [balloonsGone, setBalloonsGone] = useState(false);
  const pops = useRef(words.map(() => new Animated.Value(0))).current;
  const buddyBounce = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const balloonRise = useRef(new Animated.Value(0)).current;
  const photoTaken = useRef(false);
  const exitedRef = useRef(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The camera shows with a small delay, so the child sees the picnic
  // scene first; the hand hint waits for the camera too.
  const [camReady, setCamReady] = useState(false);
  useEffect(() => {
    if (!celebrating) return;
    const t = setTimeout(() => setCamReady(true), 2500);
    return () => clearTimeout(t);
  }, [celebrating]);
  const camIdle = useIdleHint(camReady && photoPhase === 'none', IDLE_HAND_DELAY, 0);

  // The celebration ends the quest: confetti + yay cheer, then back.
  const safeExit = () => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    onDone();
  };

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
  const k = gh / FINALE_REFERENCE_H;

  // The 3 picks in quest order: fruit, color, dish.
  const fruitWord = words[0];
  const colorWord = words.find(w => w.id.startsWith('painting/color/')) ?? words[1];
  const dishWord = words.find(w => w.id.startsWith('cooking/name/')) ?? words[2];
  const fruitCount = fruitWord?.count ?? 1;
  // The exact balloons from the trip (child's first), for the tree.
  const balloonIds = (colorWord?.balloonIds ?? (colorWord ? [colorWord.id] : [])).slice(0, 3);
  const blanketColor = (colorWord && COLOR_HEX[colorWord.id]) ?? '#E33E54';

  // Title uses the chosen buddy's name, never a hard-coded one.
  const buddyName = BUDDIES.find(b => b.id === buddy);
  const todayISO = new Date().toISOString().slice(0, 10);

  // Every size and offset below derives from k, so the whole scene fits a
  // 360pt-tall phone as well as a tablet.
  const levelFont = Math.min(15, Math.max(11, 12.5 * k));
  const buttonH = Math.max(38, Math.min(54, gh * 0.13));
  // One big round camera button, no text on it.
  const camSize = buttonH * 1.6;

  // Blanket on the grass at the bottom, in the child's chosen color.
  const blanketW = Math.min(gw * 0.46, gh * 1.12, 430);
  const blanketH = blanketW * 0.6;
  const cols = 8;
  const rows = 4;
  const cell = blanketW / cols;
  const blanketBottom = Math.max(2, 4 * k);

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
  // Distance of each figure from its screen edge: the blanket's edge minus
  // a small overlap, so each figure tucks just against the blanket.
  const castInset = Math.max(2, gw / 2 - blanketW / 2 - charW * 0.55);

  // Tree behind the blanket with the trip balloons tied to it.
  const treeH = Math.min(charH * 0.9, gh * 0.3);
  const treeW = treeH;
  const treeBottom = blanketBottom + blanketH * 0.55;
  const bs = Math.min(charH * 0.42, 84);

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
      if (!isQuestMuted()) {
        await playFaAudioSequence(words.map(w => w.audioKey as FaTestAudioKey));
      }
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
    // Save first (device only): date, buddy, picks and story id.
    void saveMyDay({
      id: String(Date.now()),
      dateISO: todayISO,
      buddy,
      storyId: story.id,
      picks: words.map(w => ({ id: w.id, fa: w.fa })),
      colorHex: blanketColor,
    });
    playClick();
    setPhotoPhase('flash');
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 130, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start(() => {
      setPhotoPhase('card');
      // The moment the captured photo shows: yay + celebration together
      // while the balloons float up, all at once.
      setShowCeleb(true);
      playYay();
      Animated.timing(balloonRise, { toValue: 1, duration: 1400, useNativeDriver: true }).start(() => {
        setBalloonsGone(true);
      });
      cardAnim.setValue(0);
      Animated.timing(cardAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start(() => {
        // Let the child look at the captured photo for 4 seconds, then
        // fly it into the album and close the quest.
        photoTimer.current = setTimeout(() => {
          setPhotoPhase('flying');
          cardAnim.setValue(0);
          Animated.timing(cardAnim, { toValue: 1, duration: 650, useNativeDriver: true }).start(() => {
            setPhotoPhase('saved');
            exitTimer.current = setTimeout(safeExit, 900);
          });
        }, 4000);
      });
    });
  };

  // The trip balloons float up off the top together once the photo is shown.
  const balloonRiseY = balloonRise.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(treeBottom + treeH + bs * 1.3 + 40)],
  });

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
      {/* Garden background, pinned to the bottom: it overflows off the top
          (sky), never the bottom, so the grass is always visible. */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: gw, height: gh, overflow: 'hidden' }}>
        <Image
          source={story.background}
          style={{ position: 'absolute', left: 0, bottom: 0, width: gw, height: gh * 1.25 }}
          resizeMode="cover"
          accessibilityLabel={isFa ? 'باغ' : 'Garden'}
        />
      </View>
      {leveledUp && (
        <View style={[styles.levelPill, { paddingHorizontal: Math.max(8, 12 * k), marginTop: Math.max(2, 4 * k) }]}>
          <Text
            style={[styles.level, { fontFamily: ff(lang, 'black'), fontSize: levelFont }, dir(lang)]}
            numberOfLines={1}
          >
            {isFa ? `سطح ${level}! 🌟` : `Level ${level}! 🌟`}
          </Text>
        </View>
      )}
      {/* Album chip, top-LEFT so the buddy avatar (top-right) never covers
          it. The polaroid flies into it after the photo. */}
      {(photoPhase === 'flying' || photoPhase === 'saved') && (
        <View style={[styles.albumChip, { top: Math.max(2, 4 * k), left: 8, paddingHorizontal: Math.max(8, 12 * k) }]}>
          <Text style={[styles.albumChipText, { fontFamily: ff(lang, 'black'), fontSize: levelFont }, dir(lang)]}>
            {isFa ? 'روزهای من 📸' : 'My Days 📸'}
          </Text>
        </View>
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
        {balloonIds.length > 0 && !balloonsGone && (
          <Animated.View
            style={[
              styles.balloonRow,
              {
                left: gw / 2 - (balloonIds.length * bs + (balloonIds.length - 1) * 6) / 2,
                bottom: treeBottom + treeH - 6,
                gap: 6,
                transform: [{ translateY: balloonRiseY }],
              },
            ]}
            pointerEvents="none"
          >
            {balloonIds.map(id => (
              <Balloon key={id} color={COLOR_HEX[id] ?? '#CCCCCC'} size={bs} />
            ))}
          </Animated.View>
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
        <View
          style={[
            styles.buddySide,
            isFa ? { right: castInset } : { left: castInset },
            { bottom: blanketBottom },
          ]}
          pointerEvents="none"
        >
          <Animated.View style={{ transform: [{ scale: buddyBounce }] }}>
            <Image
              source={buddyPose(buddy, celebrating ? 'celebration' : 'base')}
              style={{ width: charW, height: charH }}
              resizeMode="contain"
              accessibilityLabel={buddy}
            />
          </Animated.View>
        </View>
        <View
          style={[
            styles.grandmaSide,
            isFa ? { left: castInset } : { right: castInset },
            { bottom: blanketBottom },
          ]}
          pointerEvents="none"
        >
          <Image
            source={story.grandma}
            style={{ width: charW, height: charH }}
            resizeMode="contain"
            accessibilityLabel={isFa ? 'مادربزرگ' : 'Grandma'}
          />
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
          <View style={[styles.polaroidPhoto, { height: cardPhotoH, backgroundColor: blanketColor, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' }]}>
            <Image
              source={story.grandma}
              style={{ flex: 1, height: '100%' }}
              resizeMode="contain"
              accessibilityLabel={isFa ? 'مادربزرگ' : 'Grandma'}
            />
            <View style={{ flex: 1.1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 }}>
              <View style={[styles.items, { gap: 3 }]}>
                {fruitWord && <WordArt word={fruitWord} size={cardPhotoH * 0.3} />}
                {dishWord && <WordArt word={dishWord} size={cardPhotoH * 0.4} />}
              </View>
              {balloonIds.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                  {balloonIds.map(id => (
                    <View
                      key={id}
                      style={{
                        width: cardW * 0.05,
                        height: cardW * 0.05,
                        borderRadius: cardW * 0.025,
                        backgroundColor: COLOR_HEX[id] ?? '#CCCCCC',
                      }}
                    />
                  ))}
                </View>
              )}
            </View>
            <Image
              source={buddyPose(buddy, 'celebration')}
              style={{ flex: 1, height: '100%' }}
              resizeMode="contain"
              accessibilityLabel={buddy}
            />
          </View>
          <Text
            style={[styles.polaroidCaption, { fontFamily: ff(lang, 'black'), fontSize: Math.max(11, cardW * 0.055) }, dir(lang)]}
            numberOfLines={1}
          >
            {isFa ? `پیک‌نیک با ${buddyName?.fa ?? 'نلی'} 📸 ${todayISO}` : `Picnic with ${buddyName?.en ?? 'Neli'} 📸 ${todayISO}`}
          </Text>
        </Animated.View>
      )}
      {camReady && photoPhase === 'none' && (
        <View style={styles.bottomBar}>
          <View>
            {camIdle && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 5,
                }}
              >
                <IdleHand size={camSize * 0.65} />
              </View>
            )}
            <TouchableOpacity
              style={[styles.camera, { width: camSize, height: camSize, borderRadius: camSize / 2 }]}
              onPress={takePhoto}
              activeOpacity={0.85}
              accessibilityLabel={isFa ? 'عکس بگیر!' : 'Take a photo!'}
              accessibilityRole="button"
            >
              <Text style={{ fontSize: camSize * 0.55 }}>📷</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {showCeleb && <PopperCelebration visible />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', overflow: 'hidden', backgroundColor: '#8FD694', paddingTop: 6, paddingBottom: 6 },
  levelPill: {
    backgroundColor: 'rgba(255,253,245,0.94)',
    borderRadius: 999,
    paddingVertical: 3,
    maxWidth: '80%',
    overflow: 'hidden',
  },
  level: { color: '#B45309', textAlign: 'center' },
  albumChip: {
    position: 'absolute',
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
    top: '12%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#170736',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  polaroidPhoto: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  polaroidCaption: { color: '#3A2A6B', marginTop: 6, textAlign: 'center' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 4, maxWidth: '100%' },
  camera: {
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C2D12',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
});
