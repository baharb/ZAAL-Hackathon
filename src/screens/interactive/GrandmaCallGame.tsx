// Grandma's Call (زنگ مامان‌بزرگ): Grandma video-calls, Neli talks with her, the child
// answers by tapping, learns the words on cards, then answers Grandma's questions alone.
// The content of each call lives in src/data/grandmaCalls.ts; this screen only plays it.
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../../store/AppContext';
import { useNav } from '../../store/NavContext';
import { useLandscapeDimensions } from '../../hooks/useLandscapeDimensions';
import TopBar, { topBarHeight } from '../../components/TopBar';
import BlinkingNeliImage from '../../components/BlinkingNeliImage';
import PopperCelebration from '../../components/PopperCelebration';
import GameEndOverlay from '../../components/GameEndOverlay';
import { ff } from '../../theme/fonts';
import { noteAudioPlayerReleased, playFaAudio, stopFaAudio } from '../../utils/faAudio';
import { CallStep, GRANDMA_CALLS, Line, Pick, YOUR_TURN_CLIP } from '../../data/grandmaCalls';
import type { FaTestAudioKey } from '../../assets/faTestAudio.generated';

const GRANDMA = require('../../../assets/neli-world/characters/Grandma/grandma_standing.webp');
const GRANDMA_HEAD = require('../../../assets/neli-world/characters/Grandma/grandma_head.webp');
const RING_SOUND = require('../../../assets/audio/phone-ring.wav');
const RING_SECONDS = 2.3; // length of phone-ring.wav, one ring
const TAP_SOUND = require('../../../assets/audio/key-tap.wav');
const YAY_SOUND = require('../../../assets/audio/yay-kids.wav');

// The same coral and butter as the "Grandma calls" reel and the YouTube episode.
const COLORS = { bg: '#FF9B85', shape: '#FFD86B', ink: '#7A2416', ink2: '#9A3320', card: '#FFFFFF', green: '#35C46A', red: '#FF5A5A' };

// Everything is laid out against this reference area (a tablet's space under the top bar)
// and scaled by k, so a 360pt-tall phone gets the same layout, smaller.
const REF_W = 1000;
const REF_H = 520;

type Speaker = 'grandma' | 'neli' | 'you' | null;
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

function playEffect(source: any, volume: number, loop = false): AudioPlayer | null {
  try {
    const player = createAudioPlayer(source);
    player.volume = volume;
    player.loop = loop;
    player.play();
    if (!loop) {
      const sub = player.addListener('playbackStatusUpdate', s => {
        if (s.isLoaded && s.didJustFinish) { sub.remove(); try { player.remove(); } catch {} }
      });
      setTimeout(() => { try { player.remove(); } catch {} }, 6000);
    }
    return player;
  } catch {
    return null; // sound effects are a nice-to-have
  }
}

function PhoneIcon({ size, hangUp = false }: { size: number; hangUp?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {hangUp
        ? <Path fill="#fff" d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
        : <Path fill="#fff" d="M6.62 10.79a15.15 15.15 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />}
    </Svg>
  );
}

// Neli with her blink, using the same proportions and eyelid offsets as Talk & Play
// (ConversationGame's NeliTalkCharacter), where they were tuned to sit exactly on her eyes.
function NeliBlink({ size }: { size: number }) {
  return <BlinkingNeliImage size={size} height={size * 1.18} preview overlayOffsetX={size * 0.01} overlayOffsetY={size * 0.025} />;
}

function PickArt({ pick, size: box }: { pick: Pick; size: number }) {
  const { images, emoji, swatch, scale = 1 } = pick.art;
  const size = box * scale; // drawn bigger, but laid out in the same box as the other pictures
  if (images && images.length > 1) {
    // two foods side by side, the second a little in front
    return (
      <View style={{ width: size, height: size }}>
        <Image source={images[0]} style={{ position: 'absolute', left: 0, top: size * 0.06, width: size * 0.7, height: size * 0.7 }} resizeMode="contain" />
        <Image source={images[1]} style={{ position: 'absolute', right: 0, bottom: 0, width: size * 0.62, height: size * 0.62 }} resizeMode="contain" />
      </View>
    );
  }
  if (images) return <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}><Image source={images[0]} style={{ width: size, height: size }} resizeMode="contain" /></View>;
  if (swatch) return <View style={{ width: size * 0.8, height: size * 0.8, borderRadius: size * 0.4, backgroundColor: swatch }} />;
  return <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: size * 0.72, lineHeight: size * 0.9 }}>{emoji}</Text></View>;
}

export default function GrandmaCallGame() {
  const { lang, addStars } = useContext(AppContext);
  const { reset } = useNav();
  const insets = useSafeAreaInsets();
  const { width, height } = useLandscapeDimensions();
  const showEnglish = lang !== 'fa' && lang !== 'ar';

  // the home-indicator strip stays clear: the answer cards sit right at the bottom
  const availH = height - topBarHeight(height, insets.top, { topInset: 10 }) - insets.bottom;
  const k = Math.min(availH / REF_H, width / REF_W);
  const s = (n: number) => Math.round(n * k);
  // Phones are far wider than the reference area for their height, so the tablet layout,
  // shrunk to fit the height, leaves the sides empty and the answer cards small. There the
  // two video tiles stack in a column on the left and the panel gets the rest of the screen.
  // two video tiles stacked in a column on the left and the panel beside it. Used only
  // where it makes the panel clearly bigger (not on a 16:9 phone like the iPhone SE).
  const sideL = Math.max(s(24), insets.left + 8);
  const sideR = Math.max(s(24), insets.right + 8);
  const TILE_TOP = 34; // below the call timer at the top
  const colTileH = Math.floor((availH - s(TILE_TOP) - s(16) - s(12)) / 2);
  const colTileW = Math.round(colTileH * 1.45);
  const colPanelLeft = sideL + colTileW + s(24);
  const colPanelW = width - colPanelLeft - sideR;
  // 768 x 300: three answer cards with their gaps, and the question above them, on the reference layout
  const colKp = Math.min(colPanelW / 768, (availH - s(14)) / 300);
  const compact = colKp > k * 1.1;

  const call = GRANDMA_CALLS[0];
  const [stepIdx, setStepIdx] = useState(-1); // -1 = the phone is ringing
  const [speaker, setSpeaker] = useState<Speaker>(null);
  const [line, setLine] = useState<Line | null>(null);
  const [options, setOptions] = useState<Pick[]>([]);
  const [optionsLive, setOptionsLive] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [activeWord, setActiveWord] = useState(-1);
  const [clock, setClock] = useState(0);
  const [barsTick, setBarsTick] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  const step: CallStep | undefined = call.steps[stepIdx];
  const runId = useRef(0);
  const ringPlayer = useRef<AudioPlayer | null>(null);
  const firstQuizDone = useRef(false);
  // quiz reminder: Grandma repeats the question after a quiet while. It must never start while
  // someone is talking or once the child has answered, or the repeat cuts off Neli's answer.
  const remindTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armRemind = useRef<() => void>(() => {});
  const answered = useRef(false);
  const talking = useRef(false);
  const stopRemind = () => { if (remindTimer.current) clearTimeout(remindTimer.current); remindTimer.current = null; };
  const ringPulse = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  const stopRing = () => {
    if (!ringPlayer.current) return;
    try { ringPlayer.current.pause(); ringPlayer.current.remove(); } catch {}
    ringPlayer.current = null;
    noteAudioPlayerReleased();
  };

  // ringing: the ringtone loops, the rings pulse, and Neli calls out who it is
  useEffect(() => {
    if (stepIdx !== -1) return;
    const loop = Animated.loop(Animated.timing(ringPulse, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    ringPlayer.current = playEffect(RING_SOUND, 0.35, true);
    const t = setTimeout(() => { void playFaAudio('grandma-call/neli/ring' as FaTestAudioKey); }, 900);
    // like a real phone: three rings, then quiet (the call screen keeps pulsing until answered)
    const quiet = setTimeout(stopRing, RING_SECONDS * 3 * 1000);
    return () => { loop.stop(); clearTimeout(t); clearTimeout(quiet); stopRing(); };
  }, [stepIdx]);

  useEffect(() => () => { runId.current++; stopRing(); void stopFaAudio(); }, []);

  // the call clock, and the sound bars of whoever is talking
  useEffect(() => {
    if (stepIdx < 0) return;
    const id = setInterval(() => setClock(c => c + 1), 1000);
    return () => clearInterval(id);
  }, [stepIdx >= 0]);
  useEffect(() => {
    if (speaker !== 'grandma' && speaker !== 'neli') return;
    const id = setInterval(() => setBarsTick(t => t + 1), 140);
    return () => clearInterval(id);
  }, [speaker]);

  const say = async (who: Speaker, clip: FaTestAudioKey, text: Line | null, run: number) => {
    setSpeaker(who);
    if (text) setLine(text);
    talking.current = true;
    await playFaAudio(clip, { awaitFinish: true });
    talking.current = false;
    if (runId.current === run) setSpeaker(null);
  };
  const next = () => setStepIdx(i => i + 1);

  // play each step
  useEffect(() => {
    if (stepIdx < 0) return;
    const run = ++runId.current;
    const alive = () => runId.current === run;
    // a quiz step puts its pictures up straight away, so the screen goes from one question's
    // pictures to the next with nothing in between (no flash of the last answer on its own)
    stopRemind();
    answered.current = false;
    const nextOptions = step?.kind === 'quiz' ? shuffle(step.options) : [];
    setOptions(nextOptions); setOptionsLive(false); setPicked(null); setWrong(null); setActiveWord(-1);
    if (step?.kind !== 'quiz') setLine(null);
    if (step?.kind !== 'quiz' || !nextOptions.length) pop.setValue(0);

    if (!step) { // the call is over: confetti and a cheer
      setSpeaker(null);
      setCelebrate(true);
      playEffect(YAY_SOUND, 0.7);
      return;
    }

    (async () => {
      await wait(350);
      if (!alive()) return;
      if (step.kind === 'grandma' || step.kind === 'neli') {
        await say(step.kind, step.clip, step, run);
        if (!alive()) return;
        await wait(450);
        if (alive()) next();
      } else if (step.kind === 'reply') {
        setSpeaker('you');
        setLine({ fa: 'تو جواب بده!', en: 'Tap to answer Grandma' });
        setOptions(step.options);
        setOptionsLive(true);
        Animated.spring(pop, { toValue: 1, friction: 6, useNativeDriver: true }).start();
      } else if (step.kind === 'words') {
        setSpeaker(null);
        setLine(null);
        Animated.spring(pop, { toValue: 1, friction: 6, useNativeDriver: true }).start();
        for (let i = 0; i < step.words.length; i++) {
          if (!alive()) return;
          setActiveWord(i);
          await playFaAudio(step.words[i].clip, { awaitFinish: true });
          await wait(250);
        }
        if (!alive()) return;
        setActiveWord(-1);
        await wait(900); // a moment to look at the cards, then the call goes on
        if (alive()) next();
      } else if (step.kind === 'quiz') {
        await say('grandma', step.clip, step, run);
        if (!alive()) return;
        setSpeaker('you');
        Animated.spring(pop, { toValue: 1, friction: 6, useNativeDriver: true }).start();
        setOptionsLive(true);
        // «نوبت توئه! تو بگو!» before the first question only; after that Grandma's question is enough
        if (!firstQuizDone.current) await playFaAudio(YOUR_TURN_CLIP, { awaitFinish: true });
        firstQuizDone.current = true;
        // no answer for a while: Grandma asks again (and then waits again)
        armRemind.current = () => {
          stopRemind();
          remindTimer.current = setTimeout(async () => {
            remindTimer.current = null;
            if (!alive() || answered.current) return;
            if (talking.current) { armRemind.current(); return; }
            await say('grandma', step.clip, step, run);
            if (alive() && !answered.current) { setSpeaker('you'); armRemind.current(); }
          }, 7000);
        };
        if (alive() && !answered.current) armRemind.current();
      }
    })();
    return () => stopRemind();
  }, [stepIdx]);

  const answerCall = () => {
    if (stepIdx !== -1) return;
    stopRing();
    void stopFaAudio();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playEffect(TAP_SOUND, 0.6);
    setStepIdx(0);
  };

  const choose = async (pick: Pick) => {
    if (!step || !optionsLive || picked) return;
    const run = runId.current;
    stopRemind();
    if (step.kind === 'quiz' && pick.id !== step.answer) {
      // gentle: a wobble, then Grandma asks again; no "wrong" sound
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setWrong(pick.id);
      shake.setValue(0);
      Animated.sequence([0, 1, -1, 1, -1, 0].map(v => Animated.timing(shake, { toValue: v, duration: 70, useNativeDriver: true }))).start(() => setWrong(null));
      await say('grandma', step.clip, step, run);
      if (runId.current === run && !answered.current) { setSpeaker('you'); armRemind.current(); }
      return;
    }
    answered.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPicked(pick.id);
    setOptionsLive(false);
    if (step.kind === 'quiz') addStars(2);
    await say('neli', pick.clip, pick.said ?? pick, run);
    if (runId.current !== run) return;
    await wait(500);
    if (runId.current === run) next();
  };

  const replayWord = (i: number, pick: Pick) => {
    if (!step || step.kind !== 'words') return;
    setActiveWord(i);
    void playFaAudio(pick.clip, { awaitFinish: true }).then(() => setActiveWord(a => (a === i ? -1 : a)));
  };

  // ---------------------------------------------------------------- drawing
  const faTextAt = (scale: (n: number) => number) => (size: number, color = COLORS.ink) => ({ fontFamily: ff('fa', 'black'), fontSize: scale(size), lineHeight: scale(size * 1.35), color, writingDirection: 'rtl' as const, textAlign: 'center' as const });
  const enTextAt = (scale: (n: number) => number) => (size: number, color = COLORS.ink2) => ({ fontFamily: ff('en', 'black'), fontSize: scale(size), lineHeight: scale(size * 1.3), color, textAlign: 'center' as const });
  const faText = faTextAt(s);
  const enText = enTextAt(s);

  const Blobs = (
    <>
      <View style={[styles.blob, { width: s(520), height: s(470), left: -s(220), top: -s(230), borderRadius: s(240) }]} />
      <View style={[styles.blob, { width: s(480), height: s(430), right: -s(200), bottom: -s(240), borderRadius: s(220) }]} />
    </>
  );

  // render helpers (plain functions, not components: a component declared inside the
  // render is a new type every render, so its images remount on every sound-bar tick)
  const bars = (on: boolean) => (
    <View style={[styles.bars, { right: s(compact ? 14 : 26), top: s(compact ? 14 : 22), height: s(46), gap: s(6), opacity: on ? 1 : 0.25 }]}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={{ width: s(11), borderRadius: s(6), backgroundColor: COLORS.ink, height: s(on ? 12 + 34 * Math.abs(Math.sin(barsTick * (0.9 + i * 0.37) + i)) : 12) }} />
      ))}
    </View>
  );

  function optionsVisible() { return options.length > 0 || (step?.kind === 'words'); }
  const tileW = compact ? colTileW : s(400);
  const tileH = compact ? colTileH : s(optionsVisible() ? 200 : 240);
  const tileGap = compact ? s(16) : s(30);
  const tilesLeft = compact ? sideL : (width - (tileW * 2 + tileGap)) / 2;
  const tileAt = (who: 'grandma' | 'neli') => compact
    ? { left: tilesLeft, top: s(TILE_TOP) + (who === 'grandma' ? 0 : tileH + tileGap) }
    : { left: tilesLeft + (who === 'grandma' ? 0 : tileW + tileGap), top: s(TILE_TOP) };

  const tile = (who: 'grandma' | 'neli') => {
    const on = speaker === who;
    return (
      <View key={who} style={[styles.tile, {
        ...tileAt(who), width: tileW, height: tileH, borderRadius: s(compact ? 34 : 46),
        borderWidth: on ? s(8) : 0, transform: [{ scale: on ? 1.03 : 0.97 }], opacity: speaker === 'you' ? 0.8 : 1,
      }]}>
        {/* in the narrower column tiles the character sits left of centre, clear of the sound bars */}
        {who === 'grandma'
          ? <Image source={GRANDMA} style={{ position: 'absolute', top: s(10), width: tileH * 1.02, height: tileH * 1.02, ...(compact ? { left: s(6) } : { alignSelf: 'center' }) }} resizeMode="contain" />
          : <View style={{ position: 'absolute', top: s(6), ...(compact ? { left: s(14) } : { alignSelf: 'center' }) }}><NeliBlink size={tileH * 0.92} /></View>}
        {bars(on)}
      </View>
    );
  };

  const panelLeft = compact ? colPanelLeft : 0;
  const panelW = compact ? colPanelW : width;
  const panelTop = compact ? s(8) : s(TILE_TOP) + tileH + s(10);
  const panelH = availH - panelTop - s(6);
  // what's in the panel is laid out with its own scale: k on a tablet, and as big as the
  // panel allows beside the column on a phone
  const kp = compact ? colKp : k;
  const sp = (n: number) => Math.round(n * kp);
  const pFa = faTextAt(sp);
  const pEn = enTextAt(sp);

  const optionCard = (pick: Pick, cardW: number, cardH: number) => {
    const isWrong = wrong === pick.id;
    const isPicked = picked === pick.id;
    const dim = !!picked && !isPicked;
    return (
      <Animated.View key={pick.id} style={{ transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }, { translateX: isWrong ? shake.interpolate({ inputRange: [-1, 1], outputRange: [-sp(10), sp(10)] }) : 0 }], opacity: dim ? 0.45 : 1 }}>
        <TouchableOpacity activeOpacity={0.85} onPress={() => choose(pick)} style={[styles.card, {
          width: cardW, height: cardH, borderRadius: sp(30), padding: sp(10),
          borderWidth: sp(6), borderColor: isPicked ? COLORS.green : 'transparent',
        }]}>
          <PickArt pick={pick} size={cardH * (options.length === 1 ? 0.5 : 0.58)} />
          <Text style={pFa(options.length === 1 ? 28 : 26)} numberOfLines={2}>{pick.fa}</Text>
          {showEnglish && <Text style={pEn(16)} numberOfLines={1}>{pick.en}</Text>}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const wordCard = (pick: Pick, i: number, cardW: number, cardH: number) => {
    const on = activeWord === i;
    return (
      <Animated.View key={pick.id} style={{ transform: [{ scale: Animated.multiply(pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }), on ? 1.06 : 1) }] }}>
        <TouchableOpacity activeOpacity={0.85} onPress={() => replayWord(i, pick)} style={[styles.card, {
          width: cardW, height: cardH, borderRadius: sp(30), padding: sp(8), borderWidth: sp(6), borderColor: on ? COLORS.shape : 'transparent',
        }]}>
          <PickArt pick={pick} size={cardH * 0.46} />
          <Text style={pFa(42)}>{pick.fa}</Text>
          <Text style={pEn(20)}>{pick.translit}{showEnglish ? ` = ${pick.en}` : ''}</Text>
          <Text style={{ position: 'absolute', top: sp(8), right: sp(12), fontSize: sp(22) }}>🔊</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderPanel = () => {
    if (!step) return null;
    if (step.kind === 'words') {
      const cardH = Math.min(panelH - sp(4), sp(240)), cardW = sp(220);
      return (
        <View style={[styles.row, { gap: sp(28) }]}>
          <View style={[styles.newWord, { paddingHorizontal: sp(20), paddingVertical: sp(6), borderRadius: sp(30) }]}>
            <Text style={pFa(24)}>کلمه‌ی جدید</Text>
            {showEnglish && <Text style={pEn(15)}>New word</Text>}
          </View>
          {step.words.map((w, i) => wordCard(w, i, cardW, cardH))}
        </View>
      );
    }
    if (options.length) {
      const questionH = sp(48);
      const cardW = options.length === 1 ? sp(360) : Math.min(sp(240), (panelW - sp(60)) / options.length - sp(20));
      // beside the column there is height to spare, so the cards grow taller (bigger pictures)
      const cardH = Math.min(panelH - questionH - sp(8), compact ? Math.max(sp(210), cardW * 1.08) : sp(210));
      return (
        <View style={{ alignItems: 'center' }}>
          <View style={{ height: questionH, flexDirection: 'row', alignItems: 'center', gap: sp(14) }}>
            {speaker === 'you' && <Text style={{ fontSize: sp(30) }}>🎤</Text>}
            <Text style={pFa(30)}>{step.kind === 'quiz' ? step.fa : 'تو جواب بده!'}</Text>
            {showEnglish && <Text style={pEn(18)}>{step.kind === 'quiz' ? step.en : 'Tap to answer'}</Text>}
          </View>
          <View style={[styles.row, { gap: sp(24), marginTop: sp(8) }]}>
            {options.map(p => optionCard(p, cardW, cardH))}
          </View>
        </View>
      );
    }
    if (!line) return null;
    if (line.icon) return <Text style={{ fontSize: sp(120), lineHeight: sp(150) }}>{line.icon}</Text>;
    if (line.pics) {
      // Neli's answer shows as the things she names, picture and word, not her whole sentence
      const picH = Math.min(panelH - sp(8), sp(200));
      return (
        <View style={[styles.row, { gap: sp(22) }]}>
          {line.pics.map(p => (
            <View key={p.id} style={[styles.card, { width: sp(180), height: picH, borderRadius: sp(28), padding: sp(8) }]}>
              <PickArt pick={p} size={picH * 0.56} />
              <Text style={pFa(36)}>{p.fa}</Text>
              {showEnglish && <Text style={pEn(17)}>{p.en}</Text>}
            </View>
          ))}
        </View>
      );
    }
    return (
      <View style={{ alignItems: 'center' }}>
        <Text style={pFa(46)}>{line.fa}</Text>
        {showEnglish && <Text style={pEn(22)}>{line.en}</Text>}
      </View>
    );
  };

  const ringScale = ringPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
  const ringOpacity = ringPulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] });

  return (
    <View style={styles.root}>
      <TopBar title="Grandma's Call" titleFa="زنگ مامان‌بزرگ" showClose dark topInset={10} onBack={() => reset({ name: 'Main', tab: 'Games' })} />
      <View style={styles.stage}>
        {Blobs}
        {stepIdx === -1 ? (
          // ------------------------------------------------ the phone is ringing
          <View style={styles.fill}>
            <View style={{ alignItems: 'center', marginTop: s(14) }}>
              <Text style={faText(40)}>مامان‌بزرگ زنگ زده! 📞</Text>
              {showEnglish && <Text style={enText(22)}>Grandma's calling!</Text>}
            </View>
            <View style={[styles.callCard, { width: s(340), marginTop: s(10), paddingVertical: s(20), borderRadius: s(48) }]}>
              <View style={{ width: s(150), height: s(150), alignItems: 'center', justifyContent: 'center' }}>
                <Animated.View style={[styles.ring, { width: s(150), height: s(150), borderRadius: s(75), borderWidth: s(8), transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
                <Image source={GRANDMA_HEAD} style={{ width: s(150), height: s(150), borderRadius: s(75) }} />
              </View>
              <Text style={[faText(38), { marginTop: s(10) }]}>مامان‌بزرگ</Text>
              <View style={[styles.row, { gap: s(110), marginTop: s(16) }]}>
                <View style={[styles.callBtn, { width: s(80), height: s(80), borderRadius: s(40), backgroundColor: COLORS.red, opacity: 0.5 }]}>
                  <PhoneIcon size={s(40)} hangUp />
                </View>
                <Animated.View style={{ transform: [{ scale: ringPulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.12, 1] }) }] }}>
                  <TouchableOpacity onPress={answerCall} activeOpacity={0.8} style={[styles.callBtn, { width: s(80), height: s(80), borderRadius: s(40), backgroundColor: COLORS.green }]}>
                    <PhoneIcon size={s(40)} />
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>
            <View style={{ position: 'absolute', left: Math.max(s(70), sideL), bottom: insets.bottom }}>
              <NeliBlink size={s(250)} />
            </View>
          </View>
        ) : (
          // ------------------------------------------------ the video call
          <View style={styles.fill}>
            {/* the call timer, centred over the tiles: across the top, or over the column */}
            <View style={[styles.clockRow, { top: s(4), left: compact ? tilesLeft : 0, width: compact ? tileW : width }]}>
              <View style={[styles.clock, { paddingHorizontal: s(18), paddingVertical: s(4), borderRadius: s(20) }]}>
                <View style={{ width: s(12), height: s(12), borderRadius: s(6), backgroundColor: COLORS.green }} />
                <Text style={enText(18, COLORS.ink)}>{`${String(Math.floor(clock / 60)).padStart(2, '0')}:${String(clock % 60).padStart(2, '0')}`}</Text>
              </View>
            </View>
            {tile('grandma')}
            {tile('neli')}
            <View style={[styles.panel, { top: panelTop, height: panelH, left: panelLeft, width: panelW }]}>{renderPanel()}</View>
          </View>
        )}
      </View>
      <PopperCelebration visible={celebrate} onComplete={() => { setCelebrate(false); setShowEnd(true); }} />
      {showEnd && <GameEndOverlay onGo={() => { setShowEnd(false); reset({ name: 'Main', tab: 'Games' }); }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  stage: { flex: 1, overflow: 'hidden' },
  fill: { flex: 1, alignItems: 'center' },
  blob: { position: 'absolute', backgroundColor: COLORS.shape },
  callCard: { backgroundColor: COLORS.card, alignItems: 'center', shadowColor: COLORS.ink, shadowOpacity: 0.15, shadowRadius: 0, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  ring: { position: 'absolute', borderColor: COLORS.shape },
  callBtn: { alignItems: 'center', justifyContent: 'center' },
  tile: { position: 'absolute', backgroundColor: COLORS.card, borderColor: COLORS.ink, overflow: 'hidden', alignItems: 'center' },
  bars: { position: 'absolute', flexDirection: 'row', alignItems: 'flex-end' },
  clockRow: { position: 'absolute', zIndex: 2, alignItems: 'center' },
  clock: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.card },
  panel: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.ink, shadowOpacity: 0.14, shadowRadius: 0, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  newWord: { backgroundColor: COLORS.shape, alignItems: 'center' },
});
