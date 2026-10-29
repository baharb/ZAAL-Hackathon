// Picnic finale (quest v2, section 3). All 5 collected items pop out of
// the car onto the picnic blanket together, the app says each word once
// more, then Grandma cheers and the buddy celebrates. See you tomorrow! 🌙

import React, { useContext, useEffect, useRef, useState } from 'react';
import { Animated, Image, LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { AppContext } from '../store/AppContext';
import { dir, ff } from '../theme/fonts';
import { FaTestAudioKey } from '../assets/faTestAudio.generated';
import { playFaAudioSequence } from '../utils/faAudio';
import { isQuestMuted, questPlay } from './questSound';
import { BUDDIES, BuddyId } from './buddyStore';
import { DisplayWord } from './questGroups';
import { COLOR_HEX } from './pickLists';
import { Story } from './stories';
import { buddyPose } from './questTheme';
import WordArt from './WordArt';

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
  const pops = useRef(words.map(() => new Animated.Value(0))).current;
  const buddyBounce = useRef(new Animated.Value(1)).current;

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

  // Title uses the chosen buddy's name, never a hard-coded one.
  const buddyName = BUDDIES.find(b => b.id === buddy);
  const titleFa = `سفر ${buddyName?.fa ?? 'نلی'}: پیک‌نیک با مادربزرگ`;
  const titleEn = `${buddyName?.en ?? "Neli"}'s Drive: picnic with Grandma`;

  // All sizes derive from the measured game area so everything fits, even
  // on a 360pt-tall landscape phone. Title pill + scene + bottom bar are
  // the only three rows; the scene takes whatever is left.
  const titleFont = Math.min(20, Math.max(13, gh * 0.055));
  const levelFont = Math.min(16, Math.max(12, gh * 0.045));
  const byeFont = Math.min(18, Math.max(13, gh * 0.048));
  const buttonH = Math.max(40, Math.min(56, gh * 0.13));

  // The cast stands on the grass: each about 35% of the game-area height.
  const charH = gh * 0.35;
  const buddyW = charH;
  const grandmaW = charH * 0.58;

  // Checkered picnic blanket, wider than tall, sized to leave room for the
  // cast on both sides. It sits at the bottom of the scene (on the grass),
  // slightly tilted.
  const blanketW = Math.min(gw * 0.4, gh * 1.05, 420);
  const cols = 10;
  const rows = 4;
  const cell = blanketW / cols;
  const blanketH = cell * rows;
  const itemSize = Math.min((blanketW / 5) * 0.72, blanketH * 0.52);

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

  return (
    <View style={styles.root} onLayout={onGameLayout}>
      <Image
        source={story.background}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        accessibilityLabel={isFa ? 'باغ' : 'Garden'}
      />
      {/* Title on a soft dark rounded pill, like the drive's question bubble. */}
      <View style={styles.titlePill}>
        <Text
          style={[styles.title, { fontFamily: ff(lang, 'black'), fontSize: titleFont }, dir(lang)]}
          numberOfLines={1}
        >
          {isFa ? titleFa : titleEn} 🎉
        </Text>
      </View>
      {leveledUp && (
        <View style={styles.levelPill}>
          <Text
            style={[styles.level, { fontFamily: ff(lang, 'black'), fontSize: levelFont }, dir(lang)]}
            numberOfLines={1}
          >
            {isFa ? `سطح ${level}! 🌟` : `Level ${level}! 🌟`}
          </Text>
        </View>
      )}
      {/* Grass scene: blanket on the grass at the bottom, cast beside it. */}
      <View style={styles.scene}>
        <View
          style={[styles.blanket, { width: blanketW, height: blanketH, borderRadius: cell * 0.3 }]}
        >
          <View style={[styles.cells, { width: blanketW, height: blanketH }]}>
            {Array.from({ length: cols * rows }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: cell,
                  height: cell,
                  backgroundColor: (Math.floor(i / cols) + i) % 2 === 0 ? '#E33E54' : '#FFFFFF',
                }}
              />
            ))}
          </View>
          <View style={[styles.items, { gap: cell * 0.2 }]}>
            {words.map((w, i) => (
              <Animated.View key={w.id} style={{ transform: [{ scale: pops[i] ?? 1 }] }}>
                {w.id.startsWith('painting/color/') ? (
                  <View
                    style={{
                      width: itemSize,
                      height: itemSize,
                      borderRadius: itemSize * 0.5,
                      backgroundColor: COLOR_HEX[w.id] ?? '#CCCCCC',
                      borderWidth: 3,
                      borderColor: '#FFFFFF',
                    }}
                    accessibilityLabel={w.fa}
                  />
                ) : (
                  <WordArt word={w} size={itemSize} />
                )}
              </Animated.View>
            ))}
          </View>
        </View>
        <View
          style={[
            styles.buddySide,
            isFa ? { right: 4 } : { left: 4 },
          ]}
          pointerEvents="none"
        >
          <Animated.View style={{ transform: [{ scale: buddyBounce }] }}>
            <Image
              source={buddyPose(buddy, celebrating ? 'celebration' : 'base')}
              style={{ width: buddyW, height: charH }}
              resizeMode="contain"
              accessibilityLabel={buddy}
            />
          </Animated.View>
        </View>
        <View
          style={[
            styles.grandmaSide,
            isFa ? { left: 4 } : { right: 4 },
          ]}
          pointerEvents="none"
        >
          <Image
            source={story.grandma}
            style={{ width: grandmaW, height: charH }}
            resizeMode="contain"
            accessibilityLabel={isFa ? 'مادربزرگ' : 'Grandma'}
          />
        </View>
      </View>
      <View style={[styles.bottomBar, isFa && { flexDirection: 'row-reverse' }]}>
        <Text
          style={[styles.bye, { fontFamily: ff(lang, 'black'), fontSize: byeFont }, dir(lang)]}
          numberOfLines={1}
        >
          {celebrating ? (isFa ? 'فردا می‌بینمت! 🌙' : 'See you tomorrow! 🌙') : isFa ? 'به به! 😋' : 'Yummy! 😋'}
        </Text>
        <TouchableOpacity
          style={[styles.home, { borderRadius: 999, paddingHorizontal: 26, height: buttonH }]}
          onPress={onDone}
          activeOpacity={0.85}
          accessibilityLabel={isFa ? 'تمام' : 'Done'}
          accessibilityRole="button"
        >
          <Text
            style={[styles.homeText, { fontFamily: ff(lang, 'black'), fontSize: Math.max(14, buttonH * 0.36) }, dir(lang)]}
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
    backgroundColor: 'rgba(45,27,105,0.72)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    maxWidth: '96%',
    overflow: 'hidden',
  },
  title: { color: '#FFFFFF', textAlign: 'center' },
  levelPill: {
    backgroundColor: 'rgba(45,27,105,0.72)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginTop: 4,
    maxWidth: '80%',
    overflow: 'hidden',
  },
  level: { color: '#FACC15', textAlign: 'center' },
  scene: { flex: 1, width: '100%', minHeight: 0, alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  blanket: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-4deg' }],
    borderWidth: 3,
    borderColor: '#FFFFFF',
    marginBottom: 2,
  },
  cells: { position: 'absolute', left: 0, top: 0, flexDirection: 'row', flexWrap: 'wrap' },
  items: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buddySide: { position: 'absolute', bottom: 0, justifyContent: 'flex-end' },
  grandmaSide: { position: 'absolute', bottom: 0, justifyContent: 'flex-end' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 4, maxWidth: '100%' },
  bye: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(45,27,105,0.85)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  home: { backgroundColor: '#22C55E', justifyContent: 'center' },
  homeText: { color: '#FFFFFF' },
});
