import React, { useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import type { ImageSourcePropType } from 'react-native';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import Constants from 'expo-constants';
import PopperCelebration from '../components/PopperCelebration';
import { characterAssets } from '../assets/characterAssets';
import { roomBackgroundPickers } from '../assets/neliWorldAssets';
import { AppContext } from '../store/AppContext';
import { useNav } from '../store/NavContext';
import { dir, ff } from '../theme/fonts';

// The real recorded clip of kids shouting "yay" and cheering — plays the
// instant Neli (the last character) arrives. ~2.116s long, mixed quiet.
// WAV, not the original MP3: it was silent on iPhone while every WAV in the
// app (all the pops and all ~250 recorded words) plays there fine.
const YAY_KIDS_SOUND = require('../../assets/audio/yay-kids.wav');
const YAY_DURATION_MS = 2116;
// One short pop as each cast member lands — six of them, 340ms apart,
// so it reads as the huddle assembling rather than as six separate cues.
const POP_SOUND = require('../../assets/audio/pop.wav');
const LOGO_WHITE = require('../../assets/logo-white.webp');
const LOGO_WHITE_ASPECT = 961 / 501;
const APP_VERSION = Constants.expoConfig?.version ?? '';

type CastMember = {
  key: string;
  source: ImageSourcePropType;
  aspectRatio: number;
  leftPct: number;
  bottomPct: number;
  heightPct: number;
  tilt: string;
  zIndex: number;
};

// Same huddle arrangement reviewed in the splash concept: everyone gathers
// in front of the yard, arriving left-to-right, with Neli (the hero) biggest
// and front-and-center as the last arrival.
const CAST: CastMember[] = [
  { key: 'robo', source: characterAssets.roboBoombo.poses.base, aspectRatio: 1, leftPct: 33, bottomPct: 34.5, heightPct: 24.5, tilt: '-6deg', zIndex: 1 },
  { key: 'dara', source: require('../../assets/neli-world/characters/Dara/happy_baby_giraffe_in_cheerful_pose.webp'), aspectRatio: 1, leftPct: 66.5, bottomPct: 34.5, heightPct: 24.5, tilt: '6deg', zIndex: 1 },
  { key: 'lila', source: characterAssets.lila.poses.base, aspectRatio: 1086 / 1448, leftPct: 50, bottomPct: 30.5, heightPct: 26.5, tilt: '0deg', zIndex: 2 },
  { key: 'aidin', source: characterAssets.aidin.poses.base, aspectRatio: 1472 / 2048, leftPct: 38.5, bottomPct: 16.5, heightPct: 30, tilt: '3deg', zIndex: 3 },
  { key: 'mila', source: characterAssets.mila.poses.laugh, aspectRatio: 329 / 420, leftPct: 62.5, bottomPct: 14.5, heightPct: 30.5, tilt: '-3deg', zIndex: 3 },
  { key: 'neli', source: characterAssets.neli.poses.base, aspectRatio: 1, leftPct: 50.5, bottomPct: 1, heightPct: 41, tilt: '0deg', zIndex: 4 },
];

const ENTRANCE_GAP_MS = 340;
const FIRST_ENTRANCE_DELAY_MS = 260;
const ENTRANCE_DURATION_MS = 420;

export default function SplashScreen() {
  const { reset } = useNav();
  const { lang, authReady, hasAccount, timeExpired } = useContext(AppContext);
  const { width, height } = useWindowDimensions();
  const isFa = lang === 'fa' || lang === 'ar';
  const portrait = height > width;

  // Size the wordmark from BOTH axes in explicit points. A percentage width
  // plus `aspectRatio` resolves differently on iOS than on web, and on short
  // landscape phones (~2.2:1) it let the logo outgrow the screen, clipping the
  // outer letters and pushing the name off the bottom. Portrait has width to
  // spare and little height; landscape is the opposite.
  const logoWidth = portrait
    ? Math.min(width * 0.68, height * 0.26 * LOGO_WHITE_ASPECT)
    : Math.min(width * 0.38, height * 0.42 * LOGO_WHITE_ASPECT);

  // The yard exists in several shapes. Pick the nearest so `cover` has least
  // to crop: a 2.22:1 phone and a 1.33:1 iPad are very different pictures,
  // and choosing by orientation alone (as this used to) handed everyone the
  // 16:9 — costing 20% of its height on a Pixel 7 and 25% of its width on an
  // iPad. Same aspect-ratio-bucket picker the room screens use.
  const splashSource = roomBackgroundPickers.splash(width, height);

  // The huddle was composed against a 16:9 yard, every position a percentage.
  // Anchoring those to the raw screen spreads the cast apart on a wide phone
  // and blows it up on a tall one, so place them inside a centred box of the
  // shape they were drawn for. Keeps the composition intact at any ratio.
  const SCENE_ASPECT = 16 / 9;
  const stageW = Math.min(width, height * SCENE_ASPECT);
  const stageH = stageW / SCENE_ASPECT;
  const stageX = (width - stageW) / 2;
  const stageY = (height - stageH) / 2;

  const [finaleVisible, setFinaleVisible] = useState(false);
  const [celebrationOn, setCelebrationOn] = useState(false);
  const finaleOpacity = useRef(new Animated.Value(0)).current;
  const castAnims = useRef(CAST.map(() => new Animated.Value(0))).current;
  const soundRef = useRef<AudioPlayer | null>(null);
  // goNext is defined below, but the entrance effect must reach the
  // current one at fire time, so route it through a ref.
  const goNextRef = useRef<() => void>(() => {});

  // A fresh player per pop, disposed when it finishes — the same shape as the
  // "yay" clip below, which is the pattern that actually works here. Reusing
  // one player and re-seeking it silently played nothing: a player parked at
  // the end won't restart, and seekTo() on a not-yet-loaded player throws
  // before play() is ever reached.
  const playPop = () => {
    try {
      const player = createAudioPlayer(POP_SOUND);
      player.volume = 0.45;
      player.play();
      const subscription = player.addListener('playbackStatusUpdate', status => {
        if (status.isLoaded && status.didJustFinish) {
          subscription.remove();
          try { player.remove(); } catch {}
        }
      });
      // Belt and braces: if the status event never arrives, don't leak.
      setTimeout(() => { try { player.remove(); } catch {} }, 1500);
    } catch {
      // Sound is a nice-to-have; never block the splash on it.
    }
  };

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Reset in case this effect re-fires (e.g. authReady flips).
    setFinaleVisible(false);
    setCelebrationOn(false);
    finaleOpacity.setValue(0);
    castAnims.forEach(a => a.setValue(0));

    castAnims.forEach((anim, i) => {
      timers.push(setTimeout(() => {
        playPop();
        Animated.timing(anim, {
          toValue: 1,
          duration: ENTRANCE_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }, FIRST_ENTRANCE_DELAY_MS + i * ENTRANCE_GAP_MS));
    });

    const lastIndex = CAST.length - 1;
    const lastCharAt = FIRST_ENTRANCE_DELAY_MS + lastIndex * ENTRANCE_GAP_MS;

    // Neli (the last arrival) triggers the real "yay" cheer clip, played quiet.
    // The player is created now, seconds ahead, and only play()ed when Neli
    // lands: creating it and calling play() in the same tick asks iOS to
    // start a clip it hasn't loaded yet.
    try {
      const player = createAudioPlayer(YAY_KIDS_SOUND);
      player.volume = 0.4;
      soundRef.current = player;
      const subscription = player.addListener('playbackStatusUpdate', status => {
        if (status.isLoaded && status.didJustFinish) {
          subscription.remove();
          try { player.remove(); } catch { /* ignore */ }
          if (soundRef.current === player) soundRef.current = null;
        }
      });
    } catch {
      // sound is a nice-to-have, never block the splash on it
    }
    timers.push(setTimeout(() => {
      if (cancelled) return;
      try { soundRef.current?.play(); } catch {}
    }, lastCharAt));

    // Stay on the yard through the cheer, then move on ~70% of the way through it.
    const finaleAt = lastCharAt + YAY_DURATION_MS * 0.7;
    timers.push(setTimeout(() => {
      if (cancelled) return;
      setFinaleVisible(true);
      setCelebrationOn(true);
      Animated.timing(finaleOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    }, finaleAt));

    // Safety net. goNext() is otherwise reachable ONLY from the celebration's
    // completion callback, and Animated.timing reports finished:false whenever
    // it is interrupted or starved of frames — a backgrounded tab, a slow
    // device, an animation cut short. Any of those stranded the user on the
    // splash permanently, with no way forward. Move on regardless.
    timers.push(setTimeout(() => {
      if (cancelled) return;
      goNextRef.current();
    }, finaleAt + 2800));

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      if (soundRef.current) {
        try { soundRef.current.pause(); } catch {}
        try { soundRef.current.remove(); } catch {}
        soundRef.current = null;
      }
    };
    // Deliberately run once, not on [authReady]. authReady flips true
    // asynchronously (an AsyncStorage read in AppContext) partway through
    // this multi-second sequence, not before it starts — depending on it
    // here restarted the whole entrance animation from scratch mid-splash on
    // every real launch. goNext() below is what actually needs to know
    // whether auth is ready, not this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // goNext() no-ops while auth isn't ready yet (see below). If the
  // celebration's onComplete or the safety-net timeout already fired during
  // that window, reachedEndRef remembers to retry the moment authReady
  // flips true, instead of relying on the animation effect to react to it.
  const reachedEndRef = useRef(false);

  const goNext = () => {
    if (!authReady) { reachedEndRef.current = true; return; }
    if (timeExpired) { reset({ name: 'TimeUp' }); return; }
    reset(hasAccount ? { name: 'Home' } : { name: 'AccountSetup' });
  };
  goNextRef.current = goNext;

  useEffect(() => {
    if (authReady && reachedEndRef.current) goNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady]);

  return (
    <ImageBackground source={splashSource} style={styles.root} imageStyle={styles.rootImage} resizeMode="cover">
      {CAST.map((member, i) => {
        const heightPx = (member.heightPct / 100) * stageH;
        const widthPx = heightPx * member.aspectRatio;
        const leftPx = stageX + (member.leftPct / 100) * stageW - widthPx / 2;
        const bottomPx = stageY + (member.bottomPct / 100) * stageH;
        const anim = castAnims[i];
        return (
          <View
            key={member.key}
            pointerEvents="none"
            style={{ position: 'absolute', left: leftPx, bottom: bottomPx, width: widthPx, height: heightPx, zIndex: member.zIndex }}
          >
            <Animated.View
              style={{
                width: '100%',
                height: '100%',
                opacity: anim,
                transform: [
                  { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) },
                  { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) },
                  { rotate: member.tilt },
                ],
              }}
            >
              <Image source={member.source} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
            </Animated.View>
          </View>
        );
      })}

      <Animated.View pointerEvents={finaleVisible ? 'auto' : 'none'} style={[styles.finale, { opacity: finaleOpacity }]}>
        <PopperCelebration visible={celebrationOn} onComplete={() => { setCelebrationOn(false); goNext(); }} />
        <Image source={LOGO_WHITE} resizeMode="contain" style={{ width: logoWidth, height: logoWidth / LOGO_WHITE_ASPECT }} />
        <Text allowFontScaling={false} style={[styles.finaleName, { fontFamily: ff(lang, 'black') }, dir(lang)]}>
          {isFa ? 'زال' : 'Persian for kids'}
        </Text>
        {!!APP_VERSION && (
          <Text allowFontScaling={false} style={[styles.finaleVersion, { fontFamily: ff(lang, 'black') }]}>
            {APP_VERSION}
          </Text>
        )}
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#6B21A8' },
  // Without an explicit imageStyle, react-native-web can leave the background
  // <img> unsized in some nested-flex layouts, so it falls back to its own
  // huge natural pixel size and only a random cropped sliver shows.
  rootImage: { width: '100%', height: '100%' },
  finale: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#6B21A8',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  finaleName: { color: '#FFFFFF', fontSize: 30, lineHeight: 42, marginTop: 14 },
  finaleVersion: { color: '#FFFFFF', fontSize: 30, lineHeight: 42, marginTop: 18 },
});
