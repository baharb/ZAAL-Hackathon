// Picnic finale (quest v2, section 3). All 5 collected items pop out of
// the car onto the picnic blanket together, the app says each word once
// more, then Grandma cheers and the buddy celebrates. See you tomorrow! 🌙

import React, { useContext, useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { AppContext } from '../store/AppContext';
import { dir, ff } from '../theme/fonts';
import { FaTestAudioKey } from '../assets/faTestAudio.generated';
import { playFaAudioSequence } from '../utils/faAudio';
import { isQuestMuted, questPlay } from './questSound';
import { BuddyId } from './buddyStore';
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
  const { width, height } = useWindowDimensions();
  const isFa = lang === 'fa' || lang === 'ar';

  const [celebrating, setCelebrating] = useState(false);
  const pops = useRef(words.map(() => new Animated.Value(0))).current;
  const buddyBounce = useRef(new Animated.Value(1)).current;

  // Checkered picnic blanket: blue squares drawn in code.
  const blanketW = Math.min(width * 0.72, 520);
  const cols = 10;
  const rows = 3;
  const cell = blanketW / cols;
  const blanketH = cell * rows;
  const itemSize = cell * 1.15;

  const sideSize = Math.min(width * 0.16, height * 0.26);

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
    <View style={styles.root}>
      <Text
        style={[styles.title, { fontFamily: ff(lang, 'black'), fontSize: Math.max(17, height * 0.06) }, dir(lang)]}
      >
        {isFa ? story.titleFa : story.titleEn} 🎉
      </Text>
      {leveledUp && (
        <Text
          style={[styles.level, { fontFamily: ff(lang, 'black'), fontSize: Math.max(14, height * 0.045) }, dir(lang)]}
        >
          {isFa ? `سطح ${level}! 🌟` : `Level ${level}! 🌟`}
        </Text>
      )}
      <View style={[styles.blanket, { width: blanketW, height: blanketH, borderRadius: cell * 0.35 }]}>
        <View style={[styles.cells, { width: blanketW, height: blanketH }]}>
          {Array.from({ length: cols * rows }).map((_, i) => (
            <View
              key={i}
              style={{
                width: cell,
                height: cell,
                backgroundColor: (Math.floor(i / cols) + i) % 2 === 0 ? '#A9D0F5' : '#8FBCF0',
              }}
            />
          ))}
        </View>
        <View style={[styles.items, { gap: cell * 0.25 }]}>
          {words.map((w, i) => (
            <Animated.View key={w.id} style={{ transform: [{ scale: pops[i] ?? 1 }] }}>
              {w.id.startsWith('painting/color/') ? (
                <View
                  style={{
                    width: itemSize * 0.8,
                    height: itemSize * 0.8,
                    borderRadius: itemSize * 0.4,
                    backgroundColor: COLOR_HEX[w.id] ?? '#CCCCCC',
                    borderWidth: 3,
                    borderColor: '#FFFFFF',
                  }}
                  accessibilityLabel={w.fa}
                />
              ) : (
                <WordArt word={w} size={itemSize * 0.9} />
              )}
            </Animated.View>
          ))}
        </View>
      </View>
      <View style={[styles.cast, isFa && { flexDirection: 'row-reverse' }]}>
        <Image
          source={story.grandma}
          style={{ width: sideSize * 0.6, height: sideSize }}
          resizeMode="contain"
          accessibilityLabel={isFa ? 'مادربزرگ' : 'Grandma'}
        />
        <Animated.View style={{ transform: [{ scale: buddyBounce }] }}>
          <Image
            source={buddyPose(buddy, celebrating ? 'celebration' : 'base')}
            style={{ width: sideSize, height: sideSize }}
            resizeMode="contain"
            accessibilityLabel={buddy}
          />
        </Animated.View>
      </View>
      <Text
        style={[styles.bye, { fontFamily: ff(lang, 'black'), fontSize: Math.max(15, height * 0.05) }, dir(lang)]}
      >
        {celebrating ? (isFa ? 'فردا می‌بینمت! 🌙' : 'See you tomorrow! 🌙') : isFa ? 'به به! 😋' : 'Yummy! 😋'}
      </Text>
      <TouchableOpacity
        style={[styles.home, { borderRadius: 999, paddingHorizontal: 26, height: Math.max(44, height * 0.09) }]}
        onPress={onDone}
        activeOpacity={0.85}
        accessibilityLabel={isFa ? 'تمام' : 'Done'}
        accessibilityRole="button"
      >
        <Text
          style={[styles.homeText, { fontFamily: ff(lang, 'black'), fontSize: Math.max(15, height * 0.042) }, dir(lang)]}
        >
          {isFa ? 'تمام! ⭐' : 'Done! ⭐'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFFFFF', textAlign: 'center', marginBottom: 4 },
  level: { color: '#FACC15', marginBottom: 4 },
  blanket: { overflow: 'hidden', marginVertical: 8, alignItems: 'center', justifyContent: 'center' },
  cells: { position: 'absolute', left: 0, top: 0, flexDirection: 'row', flexWrap: 'wrap' },
  items: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  cast: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 12, marginTop: 4 },
  bye: { color: '#FFFFFF', marginTop: 4 },
  home: { backgroundColor: '#22C55E', justifyContent: 'center', marginTop: 8 },
  homeText: { color: '#FFFFFF' },
});
