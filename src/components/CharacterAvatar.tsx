import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import BlinkingNeliImage from './BlinkingNeliImage';
import { neliWorldAssets } from '../assets/neliWorldAssets';
import { CHARACTERS } from '../data/characters';
import { ff } from '../theme/fonts';

type Props = {
  characterId?: string;
  size?: number;
  talking?: boolean;
  talkPattern?: 'default' | 'home';
  talkMouthScale?: number;
  talkMouthOffsetX?: number;
  talkMouthOffsetXPercent?: number;
  talkMouthOffsetY?: number;
  showVoiceBadge?: boolean;
  showName?: boolean;
  floating?: boolean;
  style?: StyleProp<ViewStyle>;
  blink?: boolean;
  blinkPreview?: boolean;
  blinkOffsetX?: number;
  blinkOffsetY?: number;
};

export default function CharacterAvatar({
  characterId = 'neli',
  size = 150,
  talking = false,
  talkPattern = 'default',
  talkMouthScale = 1,
  talkMouthOffsetX = 0,
  talkMouthOffsetXPercent = 0,
  talkMouthOffsetY = 0,
  showVoiceBadge = false,
  showName = false,
  floating = true,
  style,
  blink = true,
  blinkPreview = false,
  blinkOffsetX = 0,
  blinkOffsetY = 0.5,
}: Props) {
  const safeId = neliWorldAssets.characters[characterId as keyof typeof neliWorldAssets.characters] ? characterId : 'neli';
  const characterSource = neliWorldAssets.characters[safeId as keyof typeof neliWorldAssets.characters] ?? neliWorldAssets.characters.neli;
  const character = CHARACTERS.find(item => item.id === safeId) ?? CHARACTERS[0];
  const float = useRef(new Animated.Value(0)).current;
  const mouth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!floating) {
      float.stopAnimation();
      float.setValue(0);
      return;
    }
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -5, duration: 850, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 850, useNativeDriver: true }),
      ]),
    );
    floatLoop.start();
    return () => floatLoop.stop();
  }, [float, floating]);

  useEffect(() => {
    if (!talking) {
      mouth.setValue(0);
      return;
    }
    if (talkPattern === 'home') {
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const sleep = (ms: number) => new Promise<void>(resolve => {
        timer = setTimeout(resolve, ms);
      });
      const animateTo = (value: number, duration: number) => new Promise<void>(resolve => {
        Animated.timing(mouth, { toValue: value, duration, useNativeDriver: true }).start(() => resolve());
      });
      const burst = async (count: number) => {
        for (let i = 0; i < count && !cancelled; i += 1) {
          await animateTo(1, 120);
          if (cancelled) return;
          await animateTo(0, 125);
          if (cancelled) return;
          if (i < count - 1) await sleep(110);
        }
      };
      (async () => {
        while (!cancelled) {
          await burst(5);
          if (cancelled) return;
          await sleep(500);
          if (cancelled) return;
          await burst(3);
          if (cancelled) return;
          await sleep(500);
        }
      })();
      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
        mouth.stopAnimation();
      };
    }
    const mouthLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(mouth, { toValue: 1, duration: 170, useNativeDriver: true }),
        Animated.timing(mouth, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(mouth, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(mouth, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
    );
    mouthLoop.start();
    return () => mouthLoop.stop();
  }, [mouth, talking]);

  const mouthScale = mouth.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.2] });
  const mouthOpacity = mouth.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.92] });
  const neliHeight = size * 1.18;
  const talkMouthWidth = size * 0.13 * talkMouthScale;
  const talkMouthHeight = size * 0.09 * talkMouthScale;
  const talkMouthTop = size * 0.52 + talkMouthOffsetY;
  const talkMouthLeft = talkMouthOffsetX + size * talkMouthOffsetXPercent;

  if (safeId === 'neli') {
    return (
      <View style={[styles.wrap, style, { width: size, minHeight: showName ? neliHeight + 34 : neliHeight }]}>
        <Animated.View style={[styles.neliCharacter, { width: size, height: neliHeight, transform: [{ translateY: float }] }]}>
          {blink ? (
            <BlinkingNeliImage size={size} height={neliHeight} preview={blinkPreview} overlayOffsetX={blinkOffsetX} overlayOffsetY={blinkOffsetY} />
          ) : (
            <Image source={neliWorldAssets.characters.neli} style={{ width: size, height: neliHeight }} resizeMode="contain" />
          )}
          {talking ? (
            <Animated.View
              style={[
                styles.mouth,
                {
                  width: talkMouthWidth,
                  height: talkMouthHeight,
                  borderRadius: size * 0.06 * talkMouthScale,
                  top: talkMouthTop,
                  left: talkMouthLeft,
                  opacity: mouthOpacity,
                  transform: [{ scaleY: mouthScale }],
                },
              ]}
            />
          ) : null}
          {showVoiceBadge ? (
            <Image
              source={neliWorldAssets.ui.voice}
              style={[styles.voiceBadge, { width: size * 0.39, height: size * 0.39, right: -size * 0.01, bottom: size * 0.04 }]}
              resizeMode="contain"
            />
          ) : null}
        </Animated.View>
        {showName ? (
          <View style={styles.namePill}>
            <Text style={styles.nameText} numberOfLines={1}>{character.nameEn}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style, { width: size, minHeight: showName ? size + 34 : size }]}>
      <Animated.View style={[styles.character, { width: size, height: size, transform: [{ translateY: float }] }]}>
        <Image source={characterSource} style={{ width: size * 0.94, height: size * 0.94 }} resizeMode="contain" />
        {talking ? (
          <Animated.View
            style={[
              styles.mouth,
              {
                width: talkMouthWidth,
                height: talkMouthHeight,
                borderRadius: size * 0.06 * talkMouthScale,
                top: talkMouthTop,
                left: talkMouthLeft,
                opacity: mouthOpacity,
                transform: [{ scaleY: mouthScale }],
              },
            ]}
          />
        ) : null}
        {showVoiceBadge ? (
          <Image
            source={neliWorldAssets.ui.voice}
            style={[styles.voiceBadge, { width: size * 0.39, height: size * 0.39, right: -size * 0.01, bottom: size * 0.04 }]}
            resizeMode="contain"
          />
        ) : null}
      </Animated.View>
      {showName ? (
        <View style={styles.namePill}>
          <Text style={styles.nameText} numberOfLines={1}>{character.nameEn}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  character: { alignItems: 'center', justifyContent: 'center' },
  neliCharacter: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  mouth: { position: 'absolute', alignSelf: 'center', backgroundColor: '#241431' },
  voiceBadge: { position: 'absolute' },
  namePill: { marginTop: -2, borderRadius: 999, backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 6 },
  nameText: { fontFamily: ff('fa', 'black'), color: '#2B1268', fontSize: 13 },
});
