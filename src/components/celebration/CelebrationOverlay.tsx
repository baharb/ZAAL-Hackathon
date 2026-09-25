import React, { useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useWindowDimensions } from '../../layout/PortraitFallback';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CelebrationOptions = {
  message?: string;
  subMessage?: string;
  color?: string;
  durationMs?: number;
  particleCount?: number;
  onDone?: () => void;
};

export type CelebrationHandle = {
  play: (opts?: CelebrationOptions) => void;
};

type ParticleData = {
  id: number;
  sx: number; sy: number;
  vx: number; vy: number;
  gravity: number;
  size: number;
  delay: number;
  spin: number;
  emoji: string;
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS = {
  message: 'آفرین! 🌟',
  subMessage: 'Well done!',
  color: '#FF4D6D',
  durationMs: 3200,
  particleCount: 150,
};

const EMOJIS = ['⭐', '🌟', '💫', '✨'];

function rnd(a: number, b: number) { return a + Math.random() * (b - a); }

// ─── Build particles ──────────────────────────────────────────────────────────

function buildParticles(W: number, H: number, total: number): ParticleData[] {
  const out: ParticleData[] = [];
  let id = 0;

  const cannons = [
    { x: W * 0.15, count: Math.round(total * 0.32) },
    { x: W * 0.50, count: Math.round(total * 0.36) },
    { x: W * 0.85, count: Math.round(total * 0.32) },
  ];

  cannons.forEach(c => {
    for (let i = 0; i < c.count; i++) {
      const fan   = rnd(-0.72, 0.72);
      const angle = -Math.PI / 2 + fan;
      const g     = rnd(1400, 2000);
      const spd   = (Math.sqrt(2 * g * H) * rnd(0.90, 1.20)) / Math.abs(Math.sin(angle));
      out.push({
        id: id++,
        sx: c.x + rnd(-W * 0.05, W * 0.05),
        sy: H,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        gravity: g,
        size: rnd(18, 38),
        delay: rnd(0, 120),
        spin: rnd(0.5, 2) * (Math.random() > 0.5 ? 1 : -1),
        emoji: EMOJIS[id % EMOJIS.length]!,
      });
    }
  });

  // Extra spread
  const extra = total - out.length;
  for (let i = 0; i < extra; i++) {
    const g     = rnd(1200, 1800);
    const angle = rnd(-Math.PI * 0.9, -Math.PI * 0.1);
    const spd   = Math.abs((Math.sqrt(2 * g * H) * rnd(0.7, 1.1)) / Math.sin(angle)) * rnd(0.5, 0.85);
    out.push({
      id: id++,
      sx: rnd(W * 0.05, W * 0.95),
      sy: H,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      gravity: g,
      size: rnd(14, 28),
      delay: rnd(0, 300),
      spin: rnd(0.5, 2) * (Math.random() > 0.5 ? 1 : -1),
      emoji: EMOJIS[id % EMOJIS.length]!,
    });
  }

  return out;
}

// ─── Star particle ────────────────────────────────────────────────────────────
// Uses Animated.Text — 100% native driver compatible.
// All 4 animated values interpolate DIRECTLY from the master anim (no chaining).

function StarParticle({
  p,
  anim,
  durationMs,
}: {
  p: ParticleData;
  anim: Animated.Value;
  durationMs: number;
}) {
  const TOTAL = durationMs;

  // This particle's active window in normalised [0..1] time
  const ps = p.delay / TOTAL;       // when it starts (0 = immediately)
  const pe = 1;                      // when it ends

  // Physical travel time in seconds
  const tSec = (pe - ps) * TOTAL / 1000;

  // Final position deltas from spawn point (physics: up then gravity pulls down)
  const endX = p.vx * tSec;
  const endY = p.vy * tSec + 0.5 * p.gravity * tSec * tSec;

  // Fade in fast, hold, fade out near end
  const fadeIn  = ps + (pe - ps) * 0.04;
  const fadeOut = ps + (pe - ps) * 0.80;

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: p.sx - p.size / 2,
        top:  p.sy - p.size / 2,
        fontSize: p.size,
        // Opacity: direct interpolation from anim
        opacity: anim.interpolate({
          inputRange:  [ps, fadeIn, fadeOut, pe],
          outputRange: [0,  1,      1,       0],
          extrapolate: 'clamp',
        }),
        transform: [
          // All transforms: direct from anim
          {
            translateX: anim.interpolate({
              inputRange:  [ps, pe],
              outputRange: [0,  endX],
              extrapolate: 'clamp',
            }),
          },
          {
            translateY: anim.interpolate({
              inputRange:  [ps, pe],
              outputRange: [0,  endY],
              extrapolate: 'clamp',
            }),
          },
          {
            rotate: anim.interpolate({
              inputRange:  [ps, pe],
              outputRange: ['0deg', `${p.spin * 360}deg`],
              extrapolate: 'clamp',
            }),
          },
        ],
      }}
    >
      {p.emoji}
    </Animated.Text>
  );
}

// ─── CelebrationOverlay ───────────────────────────────────────────────────────

const CelebrationOverlay = React.forwardRef<
  CelebrationHandle,
  { width?: number; height?: number }
>(({ width, height }, ref) => {
  const { width: winW, height: winH } = useWindowDimensions();

  // Refs so play() always reads latest size without rebuilding the handle
  const wRef = useRef(0);
  const hRef = useRef(0);
  wRef.current = width  ?? winW;
  hRef.current = height ?? winH;

  // Single anim value drives everything
  const anim    = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const doneRef = useRef<(() => void) | undefined>(undefined);

  // State: null particles = hidden, array = playing
  const [playing,   setPlaying]   = useState(false);
  const [particles, setParticles] = useState<ParticleData[]>([]);
  const [opts,      setOpts]      = useState(DEFAULTS);

  React.useImperativeHandle(ref, () => ({
    play(incoming?: CelebrationOptions) {
      const merged = { ...DEFAULTS, ...incoming };
      doneRef.current = incoming?.onDone;

      // Stop any running animation
      animRef.current?.stop();
      anim.setValue(0);

      // Build and set particles + show
      const pts = buildParticles(wRef.current, hRef.current, merged.particleCount);
      setParticles(pts);
      setOpts(merged);
      setPlaying(true);

      // Small timeout to let React flush the state before starting animation
      // 32ms = 2 frames — enough for RN to commit the new tree on Android
      setTimeout(() => {
        animRef.current = Animated.timing(anim, {
          toValue:         1,
          duration:        merged.durationMs,
          easing:          Easing.linear,
          useNativeDriver: true,
        });
        animRef.current.start(({ finished }) => {
          animRef.current = null;
          anim.setValue(0);
          setPlaying(false);
          setParticles([]);
          if (finished) doneRef.current?.();
        });
      }, 32);
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  // Always render the wrapper so the ref handle is always live.
  // Hide everything when not playing — no cost.
  if (!playing || particles.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Stars */}
      {particles.map(p => (
        <StarParticle
          key={p.id}
          p={p}
          anim={anim}
          durationMs={opts.durationMs}
        />
      ))}

      {/* آفرین badge */}
      <Animated.View
        style={[
          styles.badgeWrap,
          {
            opacity: anim.interpolate({
              inputRange:  [0, 0.06, 0.70, 0.90, 1],
              outputRange: [0,    1,    1,    0,  0],
              extrapolate: 'clamp',
            }),
            transform: [{
              scale: anim.interpolate({
                inputRange:  [0,   0.08, 0.70,  1],
                outputRange: [0.2,  1.1,  1.0, 0.8],
                extrapolate: 'clamp',
              }),
            }],
          },
        ]}
      >
        <View style={[styles.badge, { borderColor: opts.color, shadowColor: opts.color }]}>
          <Text style={[styles.badgeText, { color: opts.color }]}>
            {opts.message}
          </Text>
          {opts.subMessage
            ? <Text style={styles.badgeSub}>{opts.subMessage}</Text>
            : null}
        </View>
      </Animated.View>
    </View>
  );
});

CelebrationOverlay.displayName = 'CelebrationOverlay';
export default CelebrationOverlay;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  badgeWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  badge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 4,
    paddingHorizontal: 40,
    paddingVertical: 20,
    alignItems: 'center',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  badgeText: {
    fontSize: 36,
    fontWeight: '900',
  },
  badgeSub: {
    fontSize: 15,
    color: '#8A7A9B',
    fontWeight: '700',
    marginTop: 5,
  },
});