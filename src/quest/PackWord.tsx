// "Say it to pack it" (hackathon step 2). The only speaking moment: the
// word plays once, the child holds the big mic button and says the word.
// On release the voice plays back with a fun echo and the item flies into
// the backpack. Volume check only — no speech recognition. A shy child gets
// a next-arrow after ~5 s and is never stuck. Without mic permission the
// step packs without recording. Clips stay on this device, never uploaded.

import React, { useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  RecordingPresets,
  createAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { topBarHeight } from '../components/TopBar';
import { AppContext } from '../store/AppContext';
import { dir, ff } from '../theme/fonts';
import { noteAudioPlayerReleased, stopFaAudio } from '../utils/faAudio';
import { questPlay } from './questSound';
import { DisplayWord } from './questGroups';
import { ensureMicPermission } from './micPermission';
import { saveRecording } from './recordings';
import WordArt from './WordArt';

// The child must make a sound this long to count as "said it".
const MIN_SOUND_MS = 500;
// A shy child is never stuck: the next-arrow appears after this long.
const SKIP_AFTER_MS = 5000;
// Safety cap on one hold.
const MAX_HOLD_MS = 8000;
// Slapback delay for the fun echo.
const ECHO_MS = 180;

export default function PackWord({
  word,
  onPacked,
}: {
  word: DisplayWord;
  onPacked: (recordingUri: string | null) => void;
}) {
  const { lang } = useContext(AppContext);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isFa = lang === 'fa' || lang === 'ar';

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder);
  const [mic, setMic] = useState<'asking' | 'ok' | 'off'>('asking');
  const [holding, setHolding] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const packedRef = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micScale = useRef(new Animated.Value(1)).current;

  const bodyH = height - topBarHeight(height, insets.top, {}) - insets.bottom;
  const artSize = Math.min(width * 0.3, bodyH * 0.42);
  const micSize = Math.max(64, Math.min(width * 0.16, bodyH * 0.24));

  // The word plays once when the step opens; the mic question is asked now
  // too — the first time the child reaches this step.
  useEffect(() => {
    let alive = true;
    void stopFaAudio().then(() => {
      if (alive) void questPlay(word.audioKey);
    });
    void ensureMicPermission().then(status => {
      if (!alive) return;
      setMic(status === 'granted' ? 'ok' : 'off');
      if (status === 'granted') {
        try {
          void recorder.prepareToRecordAsync();
        } catch {
          setMic('off');
        }
      }
    });
    const skip = setTimeout(() => {
      if (alive) setShowSkip(true);
    }, SKIP_AFTER_MS);
    return () => {
      alive = false;
      clearTimeout(skip);
      if (holdTimer.current) clearTimeout(holdTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pack = (uri: string | null) => {
    if (packedRef.current) return;
    packedRef.current = true;
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (uri) void saveRecording(word.id, uri);
    onPacked(uri);
  };

  // Gentle grow while the mic is held.
  useEffect(() => {
    Animated.timing(micScale, {
      toValue: holding ? 1.1 : 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [holding, micScale]);

  const playEcho = (uri: string) => {
    // One output at a time: the word clip is over by now, and nothing else
    // may start until the echo has finished (see noteAudioPlayerReleased).
    try {
      const first = createAudioPlayer(uri);
      const second = createAudioPlayer(uri);
      second.volume = 0.4;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        try {
          first.pause();
          second.pause();
        } catch {
          // Players are best-effort; the pack step continues regardless.
        }
        noteAudioPlayerReleased();
        pack(uri);
      };
      const finishTimer = setTimeout(finish, (recState.durationMillis || 2000) + 1500);
      try {
        first.addListener('playbackStatusUpdate', status => {
          if (status.isLoaded && status.didJustFinish) {
            clearTimeout(finishTimer);
            finish();
          }
        });
      } catch {
        // Without the listener the timeout still finishes the step.
      }
      first.play();
      setTimeout(() => {
        try {
          second.play();
        } catch {
          // The first voice alone is still a fine echo.
        }
      }, ECHO_MS);
    } catch {
      pack(uri);
    }
  };

  const beginHold = () => {
    if (packedRef.current || holding) return;
    if (mic !== 'ok') {
      // No mic: a tap still packs the item, with the word itself.
      void questPlay(word.audioKey);
      pack(null);
      return;
    }
    setHolding(true);
    try {
      recorder.record();
    } catch {
      setHolding(false);
      pack(null);
      return;
    }
    holdTimer.current = setTimeout(() => stopHold(true), MAX_HOLD_MS);
  };

  const stopHold = (capped = false) => {
    if (!holding && !capped) return;
    if (holdTimer.current) clearTimeout(holdTimer.current);
    setHolding(false);
    let uri: string | null = null;
    let longEnough = false;
    try {
      longEnough = (recState.durationMillis || 0) >= MIN_SOUND_MS;
    } catch {
      longEnough = false;
    }
    const finishStop = async () => {
      try {
        await recorder.stop();
        uri = recorder.uri;
      } catch {
        uri = null;
      }
      if (uri && longEnough) playEcho(uri);
      else pack(null);
    };
    void finishStop();
  };

  return (
    <View style={styles.root}>
      <WordArt word={word} size={artSize} />
      <Text
        style={[styles.word, { fontFamily: ff(lang, 'black'), fontSize: Math.max(22, bodyH * 0.08) }, dir(lang)]}
      >
        {word.fa}
      </Text>
      <Animated.View style={{ transform: [{ scale: micScale }] }}>
        <TouchableOpacity
          onPressIn={beginHold}
          onPressOut={() => stopHold()}
          activeOpacity={0.85}
          accessibilityLabel={isFa ? 'نگه دار و بگو' : 'Hold and say it'}
          accessibilityRole="button"
          style={[
            styles.mic,
            {
              width: micSize,
              height: micSize,
              borderRadius: micSize / 2,
              backgroundColor: holding ? '#22C55E' : '#FF5C8A',
            },
          ]}
        >
          <Text style={{ fontSize: micSize * 0.44 }}>🎤</Text>
        </TouchableOpacity>
      </Animated.View>
      <Text style={[styles.hint, { fontFamily: ff(lang, 'bold'), fontSize: Math.max(13, bodyH * 0.04) }, dir(lang)]}>
        {holding
          ? isFa
            ? '...بگو'
            : 'Say it…'
          : isFa
            ? 'میکروفون را نگه دار و بگو'
            : 'Hold the mic and say it'}
      </Text>
      {showSkip && !holding && (
        <TouchableOpacity
          onPress={() => pack(null)}
          activeOpacity={0.8}
          accessibilityLabel={isFa ? 'بعدی' : 'Next'}
          accessibilityRole="button"
          style={styles.skip}
        >
          <Text style={styles.skipArrow}>➡️</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  word: { color: '#FFFFFF', marginVertical: 10 },
  mic: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#170736',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  hint: { color: '#E7DEFF', marginTop: 10 },
  skip: {
    position: 'absolute',
    right: 18,
    bottom: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    padding: 10,
  },
  skipArrow: { fontSize: 26 },
});
