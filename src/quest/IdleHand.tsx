// Idle hint hand (quest). When the child does nothing for a while, a small
// hand appears over the right thing to tap; any tap hides it again.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image } from 'react-native';

const HAND_SRC = require('../../assets/neli-world/quest/pointer-hand.png');
// Image is 1600x1491, fingertip near (0.70w, 0.15h) from its top-left.

/**
 * True after `delayMs` of being active, for 3 seconds at a time, then the
 * wait restarts. Bumping `resetKey` (e.g. on a tap) hides the hand and
 * restarts the wait. Inactive hides it for good.
 */
const SHOW_MS = 3000;

export function useIdleHint(active: boolean, delayMs: number, resetKey: number): boolean {
  const [show, setShow] = useState(false);
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    if (!active) {
      setShow(false);
      return;
    }
    setShow(false);
    let hide: ReturnType<typeof setTimeout> | null = null;
    const wait = setTimeout(() => {
      setShow(true);
      hide = setTimeout(() => setCycle(c => c + 1), SHOW_MS);
    }, delayMs);
    return () => {
      clearTimeout(wait);
      if (hide) clearTimeout(hide);
    };
  }, [active, delayMs, resetKey, cycle]);
  return show;
}

const IDLE_HAND_DELAY = 6000;
export { IDLE_HAND_DELAY };

/**
 * The pointing hand, fingertip pinned to the middle of its `size` box, so
 * every placement only has to center the box on the right answer. The box
 * itself is transparent to taps.
 */
const HAND_W_PER_H = 1600 / 1491;

export function IdleHand({ size }: { size: number }) {
  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bounce]);
  const dy = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.15] });
  const w = size * HAND_W_PER_H;
  return (
    <Animated.View pointerEvents="none" style={{ width: size, height: size, transform: [{ translateY: dy }] }}>
      <Image
        source={HAND_SRC}
        style={{ position: 'absolute', left: size / 2 - 0.7 * w, top: size / 2 - 0.15 * size, width: w, height: size }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}
