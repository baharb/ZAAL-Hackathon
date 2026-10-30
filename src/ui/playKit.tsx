// playKit — shared look for the 4 new games (Photo Farsi, Magic Story,
// Listen & Find, First Letter), matching the rest of ZAAL: deep-purple
// chrome, one bright accent per game, chunky candy buttons with a darker
// bottom edge, real neli-world art (never emoji for words), an illustrated
// background per game, the child's buddy as guide, star progress and a
// celebration end screen. No English for the child: icons + Farsi + audio.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import TopBar from '../components/TopBar';
import PopperCelebration from '../components/PopperCelebration';
import { useNav } from '../store/NavContext';
import { dir, ff } from '../theme/fonts';
import { neliWorldAssets } from '../assets/neliWorldAssets';
import { BuddyId, loadBuddy } from '../quest/buddyStore';
import { buddyPose } from '../quest/questTheme';

export const PLAY_INK = '#2D1B69';
// One accent per game so each game has its own color.
export const PLAY_ACCENTS = {
  photo: { color: '#22D3EE', edge: '#0E9BB8' },
  story: { color: '#A855F7', edge: '#7C3AED' },
  listen: { color: '#F472B6', edge: '#DB2777' },
  letter: { color: '#FB923C', edge: '#EA580C' },
  sunny: { color: '#FFB800', edge: '#D99A00' },
  green: { color: '#22C55E', edge: '#15803D' },
};

function useTapScale(): { scale: Animated.Value; pressIn: () => void; pressOut: () => void } {
  const scale = useRef(new Animated.Value(1)).current;
  return {
    scale,
    pressIn: () => Animated.timing(scale, { toValue: 0.95, duration: 90, useNativeDriver: true }).start(),
    pressOut: () => Animated.timing(scale, { toValue: 1, duration: 140, useNativeDriver: true }).start(),
  };
}

/** Same top bar as the other games: deep purple with a close button out. */
export function GameTopBar({ title, titleFa }: { title: string; titleFa: string }) {
  const { reset } = useNav();
  return (
    <TopBar
      title={title}
      titleFa={titleFa}
      showClose
      dark
      topInset={10}
      onBack={() => reset({ name: 'Main', tab: 'Games' })}
    />
  );
}

/** Chunky candy button: accent face, darker bottom edge, squash on press. */
export function CandyButton({
  color,
  edge,
  onPress,
  disabled,
  height,
  children,
}: {
  color: string;
  edge: string;
  onPress: () => void;
  disabled?: boolean;
  height: number;
  children: React.ReactNode;
}) {
  const { scale, pressIn, pressOut } = useTapScale();
  const edgeH = Math.max(4, height * 0.09);
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      onPressIn={pressIn}
      onPressOut={pressOut}
      activeOpacity={1}
      accessibilityRole="button"
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <View
          style={{
            backgroundColor: disabled ? '#B9C4D6' : color,
            borderRadius: height * 0.32,
            height,
            paddingHorizontal: height * 0.4,
            paddingBottom: edgeH,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            opacity: disabled ? 0.7 : 1,
            shadowColor: 'rgba(45,27,105,0.35)',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 6,
            elevation: 5,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: height * 0.18 }}>
            {children}
          </View>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: edgeH, backgroundColor: disabled ? '#9AA7BD' : edge }} />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

/** White game card for use on illustrated backgrounds. */
export function GameCard({ children, radius, style }: { children: React.ReactNode; radius: number; style?: any }) {
  return (
    <View
      style={[
        {
          backgroundColor: '#FFFFFF',
          borderRadius: radius,
          shadowColor: 'rgba(45,27,105,0.30)',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 6,
          elevation: 5,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Progress: a row of stars that fill in (no "Round 1/5" text). */
export function StarsRow({ total, filled, size }: { total: number; filled: number; size: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: size * 0.25 }} accessibilityRole="none">
      {Array.from({ length: total }).map((_, i) => (
        <Image
          key={i}
          source={neliWorldAssets.ui.star}
          style={{ width: size, height: size, opacity: i < filled ? 1 : 0.3 }}
          resizeMode="contain"
        />
      ))}
    </View>
  );
}

export type BuddyMood = 'idle' | 'happy' | 'thinking';

/** The child's chosen buddy (Neli by default) as the on-screen guide. */
export function BuddyGuide({ mood, size }: { mood: BuddyMood; size: number }) {
  const [buddy, setBuddy] = useState<BuddyId>('neli');
  const bounce = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    void loadBuddy().then(saved => {
      if (saved) setBuddy(saved);
    });
  }, []);
  useEffect(() => {
    if (mood === 'idle') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(bounce, { toValue: 1.06, duration: 600, useNativeDriver: true }),
          Animated.timing(bounce, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    // Happy jump or thinking bob, played once per mood change.
    Animated.sequence([
      Animated.timing(bounce, { toValue: mood === 'happy' ? 1.18 : 1.08, duration: 220, useNativeDriver: true }),
      Animated.timing(bounce, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood]);
  const pose = mood === 'happy' ? 'celebration' : mood === 'thinking' ? 'thinking' : 'base';
  return (
    <Animated.View
      pointerEvents="none"
      style={{ transform: [{ scale: bounce }, ...(mood === 'thinking' ? [{ rotate: '-8deg' } as const] : [])] }}
    >
      <Image
        source={buddyPose(buddy, pose)}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityLabel={buddy}
      />
    </Animated.View>
  );
}

/** Word art: the real picture when one exists, emoji only as fallback. */
export function WordArt({ art, emoji, size }: { art: any; emoji: string; size: number }) {
  if (art) {
    return <Image source={art} style={{ width: size, height: size }} resizeMode="contain" />;
  }
  return <Text style={{ fontSize: size }}>{emoji}</Text>;
}

/** Illustrated background, bottom-anchored so floors never crop (CLAUDE.md),
 * dimmed slightly so cards read clearly. */
export function GameBg({ pick, dim = 0.15 }: { pick: (w: number, h: number) => any; dim?: number }) {
  const { width: W, height: H } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <Image
        source={pick(W, H)}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: W, height: H * 1.25 }}
        resizeMode="cover"
      />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: `rgba(46,26,107,${dim})` }]} />
    </View>
  );
}

/** End-of-game celebration: buddy, stars, big تمام! button. */
export function CelebrateEnd({
  stars,
  total,
  onAgain,
  onDone,
}: {
  stars: number;
  total: number;
  onAgain: () => void;
  onDone: () => void;
}) {
  const { height } = useWindowDimensions();
  const k = height / 400;
  const btnH = Math.max(56, 64 * k);
  return (
    <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(46,26,107,0.45)' }]}>
      <PopperCelebration visible onComplete={() => {}} />
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 28 * k, padding: 22 * k, alignItems: 'center', rowGap: 10 * k, maxWidth: '86%' }}>
        <BuddyGuide mood="happy" size={120 * k} />
        <StarsRow total={total} filled={stars} size={30 * k} />
        <Text style={[ { fontFamily: ff('fa', 'black'), color: PLAY_INK, fontSize: 34 * k }, dir('fa')]}>تمام!</Text>
        <View style={{ flexDirection: 'row', gap: 10 * k }}>
          <CandyButton color="#FFFFFF" edge="#E0D6F5" onPress={onAgain} height={btnH}>
            <Image source={neliWorldAssets.ui.restart} style={{ width: btnH * 0.5, height: btnH * 0.5 }} resizeMode="contain" />
            <Text style={{ fontFamily: ff('fa', 'black'), color: PLAY_INK, fontSize: 20 * k }}>دوباره</Text>
          </CandyButton>
          <CandyButton color={PLAY_ACCENTS.green.color} edge={PLAY_ACCENTS.green.edge} onPress={onDone} height={btnH}>
            <Text style={{ fontFamily: ff('fa', 'black'), color: '#FFFFFF', fontSize: 20 * k }}>تمام!</Text>
          </CandyButton>
        </View>
      </View>
    </View>
  );
}

// Word art map: real pictures; chair + doll have no art (emoji fallback).
const ALPHABET = (name: string): any => {
  const map: Record<string, any> = {
    fish: require('../../assets/neli-world/alphabet-icons/fish.webp'),
    ball: require('../../assets/neli-world/alphabet-icons/ball.webp'),
    house: require('../../assets/neli-world/alphabet-icons/house.webp'),
    tree: require('../../assets/neli-world/alphabet-icons/tree.webp'),
    river: require('../../assets/neli-world/alphabet-icons/river.webp'),
    boat: require('../../assets/neli-world/alphabet-icons/boat.webp'),
  };
  return map[name] ?? null;
};

export const WORD_ART: Record<string, any> = {
  book: neliWorldAssets.clothes.book,
  backpack: neliWorldAssets.clothes.backpack,
  hat: neliWorldAssets.clothes.hat,
  shoe: neliWorldAssets.clothes.shoes,
  apple: neliWorldAssets.foods.apple,
  orange: neliWorldAssets.foods.orange,
  bread: neliWorldAssets.foods.bread,
  fish: ALPHABET('fish'),
  water: neliWorldAssets.foods.water,
  bed: require('../../assets/neli-world/word-art/bed.webp'),
  lamp: require('../../assets/neli-world/word-art/lamp.webp'),
  table: require('../../assets/neli-world/word-art/table.webp'),
  chair: null,
  doll: null,
  ball: ALPHABET('ball'),
};

export const HERO_ART: Record<string, any> = {
  cat: neliWorldAssets.animals.cat,
  fish: ALPHABET('fish'),
  monkey: neliWorldAssets.animals.monkey,
};

export const PLACE_ART: Record<string, any> = {
  home: ALPHABET('house'),
  garden: ALPHABET('tree'),
  sea: ALPHABET('boat'),
};
