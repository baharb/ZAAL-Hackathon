// Picnic finale (quest v2, section 3). One real scene: the garden picture
// is pinned to the bottom so the grass always shows, the blanket lies on
// the grass in the child's chosen color, and the picks are served on it —
// fruit in a bowl, the dish on the big middle plate, the two ingredients on
// small plates. Grandma and the buddy sit at the blanket's edges.
// Then a pretend-camera moment: flash + click, and the scene freezes into a
// polaroid that flies into the روزهای من album (device only, no uploads).
// No Modal here on purpose: every Modal needs a landscape prop on iPhone.

import React, { useContext, useEffect, useRef, useState } from 'react';
import { Animated, Image, LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../store/AppContext';
import { dir, ff } from '../theme/fonts';
import { FaTestAudioKey } from '../assets/faTestAudio.generated';
import { noteAudioPlayerReleased, playFaAudioSequence } from '../utils/faAudio';
import { isQuestMuted, questPlay } from './questSound';
import { BUDDIES, BuddyId } from './buddyStore';
import { DisplayWord } from './questGroups';
import { COLOR_HEX } from './pickLists';
import { Story } from './stories';
import { buddyPose } from './questTheme';
import { saveMyDay } from './myDaysStore';
import WordArt from './WordArt';

const CLICK_SOUND = require('../../assets/audio/key-tap.wav');

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

function Plate({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#3A2A6B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: size * 0.72,
          height: size * 0.72,
          borderRadius: size * 0.36,
          borderWidth: Math.max(1.5, size * 0.03),
          borderColor: '#E5DCC8',
        }}
      />
      {children}
    </View>
  );
}

function Bowl({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <View
      style={{
        width: size,
        height: size * 0.92,
        borderRadius: size * 0.42,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#3A2A6B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
      }}
    >
      <View
        style={{
          width: size * 0.74,
          height: size * 0.66,
          borderRadius: size * 0.33,
          backgroundColor: '#DFF1FB',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}

type PhotoPhase = 'none' | 'flash' | 'card' | 'flying' | 'saved';

export default function Finale({
  words,
  buddy,
  story,
  leveledUp,
  level,
  onDone,
  onOpenAlbum,
}: {
  words: DisplayWord[];
  buddy: BuddyId;
  story: Story;
  leveledUp: boolean;
  level: number;
  onDone: () => void;
  onOpenAlbum: () => void;
}) {
  const { lang } = useContext(AppContext);
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isFa = lang === 'fa' || lang === 'ar';

  const [celebrating, setCelebrating] = useState(false);
  const [photoPhase, setPhotoPhase] = useState<PhotoPhase>('none');
  const pops = useRef(words.map(() => new Animated.Value(0))).current;
  const buddyBounce = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const photoTaken = useRef(false);

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

  // The 5 picks in quest order: fruit, ingredient, color, ingredient, dish.
  const colorWord = words.find(w => w.id.startsWith('painting/color/')) ?? words[2];
  const dishWord = words.find(w => w.id.startsWith('cooking/name/')) ?? words[4];
  const fruitWord = words[0];
  const ingredientWords = words
    .filter(w => w !== fruitWord && w !== colorWord && w !== dishWord)
    .slice(0, 2);
  const blanketColor = (colorWord && COLOR_HEX[colorWord.id]) ?? '#E33E54';

  // Title uses the chosen buddy's name, never a hard-coded one.
  const buddyName = BUDDIES.find(b => b.id === buddy);
  const titleFa = `سفر ${buddyName?.fa ?? 'نلی'}: پیک‌نیک با مادربزرگ`;
  const titleEn = `${buddyName?.en ?? "Neli"}'s Drive: picnic with Grandma`;
  const todayISO = new Date().toISOString().slice(0, 10);

  // Every size and offset below derives from k, so the whole scene fits a
  // 360pt-tall phone as well as a tablet.
  const titleFont = Math.min(17, Math.max(12, 15 * k));
  const levelFont = Math.min(15, Math.max(11, 12.5 * k));
  const byeFont = Math.min(17, Math.max(12, 14 * k));
  const buttonH = Math.max(38, Math.min(54, gh * 0.13));
  const buttonFont = Math.max(13, buttonH * 0.34);
  // Same size as the floating close button above this scene, so the album
  // chip can sit just below it without overlapping.
  const closeSize = Math.max(44, Math.min(gh * 0.12, 64));

  // Blanket on the grass at the bottom, in the child's chosen color.
  const blanketW = Math.min(gw * 0.46, gh * 1.12, 430);
  const blanketH = blanketW * 0.6;
  const cols = 8;
  const rows = 4;
  const cell = blanketW / cols;
  const blanketBottom = Math.max(2, 4 * k);

  // Dishes served on the blanket: big dish plate in the middle, fruit bowl
  // and two small ingredient plates beside it. The whole row (3 small + 1
  // big + gaps) is shrunk to fit inside 90% of the blanket, so on wide
  // tablets the side plates never hang off the blanket's edges.
  const bigPlateRaw = Math.min(blanketW * 0.3, blanketH * 0.78);
  const smallPlateRaw = Math.min(blanketW * 0.21, blanketH * 0.58);
  const foodGap = Math.max(3, 6 * k);
  const fitScale = Math.min(1, (blanketW * 0.9) / (bigPlateRaw + smallPlateRaw * 3 + foodGap * 3));
  const bigPlate = bigPlateRaw * fitScale;
  const smallPlate = smallPlateRaw * fitScale;

  // The cast stands right next to the blanket, both the same height, so
  // Grandma reads as AT the picnic instead of tiny at the far edge.
  const charH = gh * 0.32;
  const charW = charH * 0.85;
  // Distance of each figure from its screen edge: the blanket's edge minus
  // a small overlap, so each figure tucks just against the blanket.
  const castInset = Math.max(2, gw / 2 - blanketW / 2 - charW * 0.55);

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
        if (!alive) return;
        await questPlay(story.praiseAudio);
      }
      if (!alive) return;
      setCelebrating(true);
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
      cardAnim.setValue(0);
      Animated.timing(cardAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start(() => {
        setPhotoPhase('flying');
        cardAnim.setValue(0);
        Animated.timing(cardAnim, { toValue: 1, duration: 650, useNativeDriver: true }).start(() => {
          setPhotoPhase('saved');
        });
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
      key: `bowl-${fruitWord.id}`,
      node: (
        <Bowl size={smallPlate}>
          <WordArt word={fruitWord} size={smallPlate * 0.52} />
        </Bowl>
      ),
    });
  }
  if (ingredientWords[0]) {
    const ing = ingredientWords[0];
    servingOrder.push({
      key: `small-${ing.id}`,
      node: (
        <Plate size={smallPlate}>
          <WordArt word={ing} size={smallPlate * 0.6} />
        </Plate>
      ),
    });
  }
  if (dishWord) {
    servingOrder.push({
      key: `big-${dishWord.id}`,
      node: (
        <Plate size={bigPlate}>
          <WordArt word={dishWord} size={bigPlate * 0.66} />
        </Plate>
      ),
    });
  }
  if (ingredientWords[1]) {
    const ing = ingredientWords[1];
    servingOrder.push({
      key: `small-${ing.id}`,
      node: (
        <Plate size={smallPlate}>
          <WordArt word={ing} size={smallPlate * 0.6} />
        </Plate>
      ),
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
      {/* Title on a small rounded cream pill so it reads on top of the art. */}
      <View style={[styles.titlePill, { paddingHorizontal: Math.max(10, 14 * k), paddingVertical: Math.max(4, 6 * k) }]}>
        <Text
          style={[styles.title, { fontFamily: ff(lang, 'black'), fontSize: titleFont }, dir(lang)]}
          numberOfLines={1}
        >
          {isFa ? titleFa : titleEn} 🎉
        </Text>
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
          it, and low enough to clear the floating close button. The
          polaroid flies into it after the photo. */}
      {(photoPhase === 'flying' || photoPhase === 'saved') && (
        <View style={[styles.albumChip, { top: insets.top + 8 + closeSize + 6, left: 8, paddingHorizontal: Math.max(8, 12 * k) }]}>
          <Text style={[styles.albumChipText, { fontFamily: ff(lang, 'black'), fontSize: levelFont }, dir(lang)]}>
            {isFa ? 'روزهای من 📸' : 'My Days 📸'}
          </Text>
        </View>
      )}
      {/* One real scene: blanket on the grass, cast at its edges. */}
      <View style={styles.scene}>
        <View
          style={[
            styles.blanket,
            {
              width: blanketW,
              height: blanketH,
              borderRadius: cell * 0.25,
              marginBottom: blanketBottom,
              transform: [{ rotate: '-3deg' }],
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
          <View style={[styles.polaroidPhoto, { height: cardPhotoH, backgroundColor: blanketColor }]}>
            <View style={[styles.items, { gap: 3 }]}>
              {fruitWord && <WordArt word={fruitWord} size={cardPhotoH * 0.42} />}
              {dishWord && <WordArt word={dishWord} size={cardPhotoH * 0.58} />}
              {ingredientWords[0] && <WordArt word={ingredientWords[0]} size={cardPhotoH * 0.38} />}
            </View>
          </View>
          <Text
            style={[styles.polaroidCaption, { fontFamily: ff(lang, 'black'), fontSize: Math.max(11, cardW * 0.055) }, dir(lang)]}
            numberOfLines={1}
          >
            {isFa ? `پیک‌نیک با ${buddyName?.fa ?? 'نلی'} 📸 ${todayISO}` : `Picnic with ${buddyName?.en ?? 'Neli'} 📸 ${todayISO}`}
          </Text>
        </Animated.View>
      )}
      <View style={[styles.bottomBar, isFa && { flexDirection: 'row-reverse' }, { gap: Math.max(6, 10 * k) }]}>
        <Text
          style={[styles.bye, { fontFamily: ff(lang, 'black'), fontSize: byeFont }, dir(lang)]}
          numberOfLines={1}
        >
          {photoPhase === 'saved'
            ? isFa ? 'تو روزهای من ذخیره شد! 📸' : 'Saved to My Days! 📸'
            : celebrating
              ? isFa ? 'فردا می‌بینمت! 🌙' : 'See you tomorrow! 🌙'
              : isFa ? 'به به! 😋' : 'Yummy! 😋'}
        </Text>
        {celebrating && photoPhase === 'none' && (
          <TouchableOpacity
            style={[styles.camera, { borderRadius: 999, paddingHorizontal: Math.max(16, 24 * k), height: buttonH }]}
            onPress={takePhoto}
            activeOpacity={0.85}
            accessibilityLabel={isFa ? 'عکس بگیر!' : 'Take a photo!'}
            accessibilityRole="button"
          >
            <Text style={[styles.cameraText, { fontFamily: ff(lang, 'black'), fontSize: buttonFont }, dir(lang)]}>
              {isFa ? '📷 عکس!' : '📷 Photo!'}
            </Text>
          </TouchableOpacity>
        )}
        {photoPhase === 'saved' && (
          <TouchableOpacity
            style={[styles.album, { borderRadius: 999, paddingHorizontal: Math.max(16, 24 * k), height: buttonH }]}
            onPress={onOpenAlbum}
            activeOpacity={0.85}
            accessibilityLabel={isFa ? 'روزهای من' : 'My Days'}
            accessibilityRole="button"
          >
            <Text style={[styles.albumText, { fontFamily: ff(lang, 'black'), fontSize: buttonFont }, dir(lang)]}>
              {isFa ? 'روزهای من 📸' : 'My Days 📸'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.home, { borderRadius: 999, paddingHorizontal: Math.max(16, 26 * k), height: buttonH }]}
          onPress={onDone}
          activeOpacity={0.85}
          accessibilityLabel={isFa ? 'تمام' : 'Done'}
          accessibilityRole="button"
        >
          <Text
            style={[styles.homeText, { fontFamily: ff(lang, 'black'), fontSize: buttonFont }, dir(lang)]}
          >
            {isFa ? 'تمام! ⭐' : 'Done! ⭐'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', overflow: 'hidden', backgroundColor: '#8FD694', paddingTop: 6, paddingBottom: 6 },
  titlePill: {
    backgroundColor: 'rgba(255,253,245,0.94)',
    borderRadius: 999,
    maxWidth: '96%',
    overflow: 'hidden',
  },
  title: { color: '#3A2A6B', textAlign: 'center' },
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
  bye: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(45,27,105,0.85)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  camera: { backgroundColor: '#F59E0B', justifyContent: 'center' },
  cameraText: { color: '#FFFFFF' },
  album: { backgroundColor: '#6C4EFF', justifyContent: 'center' },
  albumText: { color: '#FFFFFF' },
  home: { backgroundColor: '#22C55E', justifyContent: 'center' },
  homeText: { color: '#FFFFFF' },
});
