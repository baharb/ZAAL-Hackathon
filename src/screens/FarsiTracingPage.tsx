import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import TopBar from '../components/TopBar';
import { AppContext } from '../store/AppContext';
import { useNav } from '../store/NavContext';
import { FARSI_LETTERS } from '../data/farsiLetters';
import * as Speech from 'expo-speech';
import { FA_AUDIO_KEYS, FALLBACK_LETTER_NAME_FA, makeAlphabetAudioKey, playFaAudio, playFaAudioOrSpeak, playFaAudioSequence, stopFaAudio } from '../utils/faAudio';
import FarsiLetterTracer from '../components/farsi/FarsiLetterTracer';
import LetterSelectorModal from '../components/farsi/LetterSelectorModal';
import PopperCelebration from '../components/PopperCelebration';
import { neliWorldAssets } from '../assets/neliWorldAssets';
import { ALPHABET_EXAMPLE_ASSETS } from '../assets/alphabetExampleAssets';
import { ff } from '../theme/fonts';
import { C } from '../theme/colors';

export default function FarsiTracingPage() {
  const { width, height } = useWindowDimensions();
  const { lang } = useContext(AppContext);
  const { screen, goBack } = useNav();

  // Single-letter mode: launched from a specific letter tile in GamesScreen
  const isSingleMode = screen.name === 'InteractiveFarsiTrace' && !!screen.letterId;

  const initialIndex = (() => {
    if (isSingleMode && screen.name === 'InteractiveFarsiTrace' && screen.letterId) {
      const i = FARSI_LETTERS.findIndex(l => l.id === screen.letterId);
      return i >= 0 ? i : 0;
    }
    return 0;
  })();

  const [index, setIndex] = useState(initialIndex);
  const [gridOpen, setGridOpen] = useState(false);
  const [guideToken, setGuideToken] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [letterComplete, setLetterComplete] = useState(false);
  const [showLetterReveal, setShowLetterReveal] = useState(false); // phase 1: show letter char in colored box
  const [showCelebration, setShowCelebration] = useState(false);
  const [showEndOverlay, setShowEndOverlay] = useState(false);

  // Prevent state updates + stop audio when the page is closed
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      void stopFaAudio();
      Speech.stop();
    };
  }, []);

  const letter = FARSI_LETTERS[index] ?? FARSI_LETTERS[0]!;
  const isFa = lang === 'fa' || lang === 'ar';
  const compact = width < 900;
  const boardSize = useMemo(() => {
    const sidePad = isSingleMode ? (compact ? 40 : 80) : (compact ? 120 : 160);
    if (compact) return Math.min(width - sidePad, height * 0.52);
    return Math.min(width - sidePad, height * 0.68, 520);
  }, [compact, height, width, isSingleMode]);

  const goToLetter = (nextIndex: number) => {
    void stopFaAudio();
    setIndex(nextIndex);
    setLetterComplete(false);
    setShowLetterReveal(false);
    setShowCelebration(false);
    setGuideToken(token => token + 1);
  };

  const playSuccessSound = async () => {
    // used in multi-letter mode (not called by tracer directly, kept for compatibility)
    if (!soundOn) return;
    try { await playFaAudio(FA_AUDIO_KEYS.feedback.afarin, { awaitFinish: true }); } catch {}
  };

  const playTryAgainSound = async () => {
    if (!soundOn) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await playFaAudioSequence([
        FA_AUDIO_KEYS.feedback.tryAgain,
        FA_AUDIO_KEYS.guidance.followPath,
      ], 180);
    } catch {}
  };

  const next = () => {
    if (!letterComplete || index >= FARSI_LETTERS.length - 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    goToLetter(index + 1);
  };
  const prev = () => {
    if (index <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    goToLetter(index - 1);
  };
  const reset = () => {
    void stopFaAudio();
    setLetterComplete(false);
    setShowLetterReveal(false);
    setShowCelebration(false);
    setGuideToken(token => token + 1);
    void playTryAgainSound();
  };

  const handleComplete = () => {
    if (!isSingleMode) {
      setLetterComplete(true);
      return;
    }
    // Single mode: tracer's successReveal already shows the letter character.
    // Run the full sequence: letter name ×2 → show example → example name ×2 → celebration
    const run = async () => {
      const nameKey    = makeAlphabetAudioKey('name', letter.id);
      const exampleKey = makeAlphabetAudioKey('example', letter.id);
      const pause = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

      // Phase 1 — show letter prominently in colored box, say name twice
      setShowLetterReveal(true);
      await pause(200);
      if (!isMounted.current) return;
      if (soundOn) {
        const nameFallback = FALLBACK_LETTER_NAME_FA[letter.id] ?? letter.letter;
        await playFaAudioOrSpeak(nameKey, nameFallback, { awaitFinish: true });
        if (!isMounted.current) return;
        await pause(200);
        await playFaAudioOrSpeak(nameKey, nameFallback, { awaitFinish: true });
        if (!isMounted.current) return;
        await pause(150);
      } else {
        await pause(1200);
      }

      if (!isMounted.current) return;
      // Phase 2 — swap to example image, say example name twice
      setShowLetterReveal(false);
      setLetterComplete(true);
      await pause(150);
      if (!isMounted.current) return;
      if (soundOn) {
        await playFaAudioOrSpeak(exampleKey, letter.exampleFa ?? '', { awaitFinish: true, rate: 0.72, pitch: 1.14 });
        if (!isMounted.current) return;
        await pause(200);
        await playFaAudioOrSpeak(exampleKey, letter.exampleFa ?? '', { awaitFinish: true, rate: 0.72, pitch: 1.14 });
        if (!isMounted.current) return;
      } else {
        await pause(1000);
      }

      if (!isMounted.current) return;
      // A gap is required here: replace()-ing the shared player onto آفرین
      // immediately after the example word's own didJustFinish can fire a
      // stray leftover status update that resolves it near-instantly
      // (observed: ~12ms, not the clip's real length) — silencing the voice
      // while the celebration still runs its full 3.2s, which is exactly
      // the "not together" feeling reported. Same race as playFaAudioSequence's
      // gapMs guards against elsewhere.
      await pause(150);
      if (!isMounted.current) return;
      // Phase 3 — celebration + آفرین, fired together
      setShowCelebration(true);
      if (soundOn) void playFaAudio(FA_AUDIO_KEYS.feedback.afarin);
    };
    void run();
  };

  // ─── Single-letter mode layout ─────────────────────────────────────────────
  if (isSingleMode) {
    return (
      <View style={[styles.root, { backgroundColor: letter.color ?? '#6C4EFF' }]}>
        <TopBar
          title={letter.nameEn}
          titleFa={letter.nameFa}
          showClose
          dark
          onBack={goBack}
        />

        <View style={styles.singleBody}>
          {/* Box — always the same size; contents rotate through 3 phases */}
          <View style={[styles.boardShell, { width: boardSize, height: boardSize }]}>
            {showLetterReveal ? (
              /* Phase 1: letter character in colored box while name is spoken */
              <View style={[styles.exampleBox, { backgroundColor: letter.color ?? '#6C4EFF' }]}>
                <Text style={styles.letterRevealChar}>{letter.letter}</Text>
                <Text style={styles.letterRevealName}>{letter.nameFa}</Text>
              </View>
            ) : !letterComplete ? (
              /* Tracing phase */
              <FarsiLetterTracer
                key={`${letter.id}-${guideToken}`}
                letter={letter}
                boardSize={boardSize}
                guideReplayToken={guideToken}
                onComplete={handleComplete}
                onTryAgain={playTryAgainSound}
                playSuccessSound={playSuccessSound}
                playTryAgainSound={playTryAgainSound}
                soundOn={soundOn}
                immediateComplete
              />
            ) : (
              /* Phase 2: example image while example name is spoken */
              <View style={[styles.exampleBox, { backgroundColor: letter.color ?? '#6C4EFF' }]}>
                {ALPHABET_EXAMPLE_ASSETS[letter.id]
                  ? <Image source={ALPHABET_EXAMPLE_ASSETS[letter.id] as ImageSourcePropType} style={styles.exampleImage} resizeMode="contain" />
                  : null}
                <Text style={styles.exampleWord}>{letter.exampleFa ?? ''}</Text>
              </View>
            )}
          </View>

        </View>

        <PopperCelebration
          visible={showCelebration}
          onComplete={() => {
            setShowCelebration(false);
            setShowEndOverlay(true);
          }}
        />
        {showEndOverlay && (
          <EndOverlay
            onGo={() => { setShowEndOverlay(false); goBack(); }}
          />
        )}
      </View>
    );
  }

  // ─── Multi-letter mode (original layout) ───────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: letter.color ?? '#6C4EFF' }]}>
      <TopBar
        title="Farsi Tracing"
        titleFa="تمرین نوشتن"
        showClose
        dark={false}
        topInset={6}
        onBack={goBack}
        rightContent={
          <View style={styles.rightTopRow}>
            <TouchableOpacity style={styles.topGridBtn} onPress={() => setGridOpen(true)} activeOpacity={0.8}>
              <View style={styles.topGridIcon}>
                {Array.from({ length: 9 }).map((_, i) => <View key={i} style={styles.topGridDot} />)}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.soundBtn}
              onPress={() => setSoundOn(v => !v)}
              activeOpacity={0.8}
            >
              <View style={[styles.soundDot, { backgroundColor: soundOn ? '#24C878' : '#D1C5E8' }]} />
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.body}>
        <Text style={[styles.progressLine, { fontFamily: ff(isFa ? 'fa' : lang, 'bold') }]}>
          {isFa ? `حرف ${index + 1} از ${FARSI_LETTERS.length}` : `Letter ${index + 1} of ${FARSI_LETTERS.length}`}
        </Text>
        <Text style={styles.subtitle}>
          <Text style={{ fontFamily: ff('fa', 'black') }}>{letter.nameFa}</Text>
          <Text style={{ fontFamily: ff('en', 'black') }}> • {letter.nameEn}</Text>
        </Text>

        <View style={styles.stage}>
          <NavFlash side="left" onPress={prev} disabled={index === 0} />

          <View style={[styles.boardShell, { width: boardSize }]}>
            <FarsiLetterTracer
              key={`${letter.id}-${guideToken}`}
              letter={letter}
              boardSize={boardSize}
              guideReplayToken={guideToken}
              onComplete={() => setLetterComplete(true)}
              onTryAgain={playTryAgainSound}
              playSuccessSound={playSuccessSound}
              playTryAgainSound={playTryAgainSound}
              soundOn={soundOn}
            />
          </View>

          <NavFlash side="right" onPress={next} disabled={!letterComplete || index >= FARSI_LETTERS.length - 1} />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.clearBtn} onPress={reset} activeOpacity={0.86}>
            <Image source={neliWorldAssets.ui.restart} style={styles.clearIcon} resizeMode="contain" />
            <Text style={[styles.clearText, { fontFamily: ff(lang, 'black') }]}>
              {isFa ? 'پاک کن' : 'Clear'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridBtn} onPress={() => setGridOpen(true)} activeOpacity={0.86}>
            <View style={styles.gridIcon}>
              {Array.from({ length: 9 }).map((_, i) => <View key={i} style={styles.gridDot} />)}
            </View>
            <Text style={[styles.gridText, { fontFamily: ff(lang, 'bold') }]}>
              {isFa ? 'همه حروف' : 'All letters'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <LetterSelectorModal
        visible={gridOpen}
        letters={FARSI_LETTERS}
        selectedId={letter.id}
        onClose={() => setGridOpen(false)}
        onSelect={nextIndex => {
          goToLetter(nextIndex);
          setGridOpen(false);
        }}
      />
    </View>
  );
}

// ─── 5-second countdown overlay shown after celebration ───────────────────────

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const COUNTDOWN_S = 5;
const RING_R = 30;
const RING_C = 2 * Math.PI * RING_R;

function EndOverlay({ onGo }: { onGo: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;
  // Guards against the 5s auto-advance and a manual tap on the button both
  // firing onGo — without this, a tap landing right as the countdown ends
  // calls goBack() twice, popping one screen further than intended.
  const firedRef = useRef(false);
  const fireOnGo = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onGo();
  };

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: COUNTDOWN_S * 1000,
      easing: Easing.linear,
      useNativeDriver: false,   // SVG strokeDashoffset can't use native driver
    }).start(({ finished }) => {
      if (finished) fireOnGo();
    });
    return () => progress.stopAnimation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, RING_C],
  });

  return (
    <View style={endStyles.root}>
      <View style={endStyles.card}>
        {/* Circular countdown timer */}
        <Svg width={80} height={80} style={{ marginBottom: 20 }}>
          {/* Background ring */}
          <Circle cx={40} cy={40} r={RING_R} stroke="#E0D8FF" strokeWidth={7} fill="none" />
          {/* Progress ring — drains over 5 seconds */}
          <AnimatedCircle
            cx={40}
            cy={40}
            r={RING_R}
            stroke="#6C4EFF"
            strokeWidth={7}
            fill="none"
            strokeDasharray={RING_C}
            strokeDashoffset={dashoffset as any}
            strokeLinecap="round"
            rotation={-90}
            origin="40,40"
          />
        </Svg>

        <TouchableOpacity style={endStyles.btn} onPress={fireOnGo} activeOpacity={0.82}>
          <Text style={endStyles.btnText}>بریم بازی دیگه! 🎮</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function NavFlash({ side, onPress, disabled }: { side: 'left' | 'right'; onPress: () => void; disabled?: boolean }) {
  const icon = side === 'left' ? neliWorldAssets.ui.back : neliWorldAssets.ui.next;
  return (
    <TouchableOpacity
      style={[styles.navFlash, disabled && styles.navFlashDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.82}
      hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
    >
      <Image source={icon} style={styles.navFlashIcon} resizeMode="contain" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  // ─── Single mode ────────────────────────────────────────────────────────────
  singleBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 20,
  },
  exampleBox: {
    flex: 1,
    width: '100%',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  exampleImage: {
    width: '85%',
    height: '58%',
  },
  letterRevealChar: {
    fontFamily: ff('fa', 'black'),
    color: '#FFFFFF',
    fontSize: 176,
    lineHeight: 300,
    paddingTop: 14,
    textAlign: 'center',
    includeFontPadding: true,
  },
  letterRevealName: {
    fontFamily: ff('fa', 'black'),
    color: 'rgba(255,255,255,0.85)',
    fontSize: 28,
    lineHeight: 38,
    textAlign: 'center',
  },
  exampleWord: {
    fontFamily: ff('fa', 'black'),
    color: '#FFFFFF',
    fontSize: 64,
    lineHeight: 84,
    textAlign: 'center',
  },
  clearBtnSingle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0EBFF',
    borderWidth: 2,
    borderColor: '#D8CFFF',
    paddingHorizontal: 22,
    justifyContent: 'center',
  },

  // ─── Multi-letter mode ───────────────────────────────────────────────────────
  rightTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topGridBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1EBFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topGridIcon: {
    width: 18,
    height: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  topGridDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6C4EFF',
  },
  soundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  progressLine: {
    color: C.textMid,
    fontSize: 14,
    lineHeight: 18,
  },
  subtitle: {
    color: C.textDark,
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
  },
  stage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  navFlash: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navFlashDisabled: {
    opacity: 0.32,
  },
  navFlashIcon: {
    width: 56,
    height: 56,
  },
  boardShell: {
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 6,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 130,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.white,
    borderWidth: 2,
    borderColor: C.border,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  clearIcon: {
    width: 22,
    height: 22,
    tintColor: C.purple,
  },
  clearText: {
    color: C.purple,
    fontSize: 16,
  },
  gridBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 130,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.purpleLight,
    borderWidth: 2,
    borderColor: C.border,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  gridIcon: {
    width: 16,
    height: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  gridDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.purple,
  },
  gridText: {
    color: C.purple,
    fontSize: 14,
  },
});

// End-overlay styles (separate sheet so EndOverlay component can use it)
const endStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  card: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 28,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    shadowColor: '#6C4EFF',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  btn: {
    backgroundColor: '#6C4EFF',
    borderRadius: 28,
    paddingHorizontal: 32,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: ff('fa', 'black'),
  },
});
