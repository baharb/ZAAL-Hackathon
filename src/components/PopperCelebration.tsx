import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';

const COLORS = ['#FF5F4E', '#FFD53D', '#41EFAA', '#5BE8FF', '#FF80C0', '#B48DFF', '#FF9A3C', '#A0FF61'];
type CelebShape = 'circle' | 'rect' | 'star';
type CelebParticle = {
  id: number;
  color: string;
  shape: CelebShape;
  sx: number; sy: number;
  peakDx: number; peakDy: number;
  fallDx: number; finalDy: number;
  pt: number;
  size: number;
  spin: number;
};

// Kept modest on purpose: mounting hundreds of native-driven animated views
// in one frame (the old value was 450) stalls the JS thread long enough that
// touches — including the close button — stop responding while this plays.
const PER = 180;
// Real party-popper timing: very fast burst up (~300ms), shorter slow fall.
// pt  = per-particle launch delay (stagger), 0.02–0.06 of DURATION
// RISE_FRAC = fraction of DURATION for the rise phase (constant per particle)
// Peak arrives at (pt + RISE_FRAC) ≈ 8–12% of total → fast burst
// Fall from peak to end ≈ 88–92% of total → slow drift
const DURATION   = 3200;
const RISE_FRAC  = 0.08;
const FAN_RAD    = 1.1;

function buildParticles(w: number, h: number): CelebParticle[] {
  const poppers = [
    { x: w * 0.18, y: h * 0.95 },
    { x: w * 0.50, y: h * 0.95 },
    { x: w * 0.82, y: h * 0.95 },
  ];
  const particles: CelebParticle[] = [];
  let id = 0;
  for (const origin of poppers) {
    const count = Math.round(PER / poppers.length);
    for (let i = 0; i < count; i++) {
      // Angle: mostly upward, with generous fan spread
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * FAN_RAD * 2;
      // Peak reaches 75–110% of screen height (shoots past top)
      const peakDist = h * (0.75 + Math.random() * 0.35);
      // pt = launch-delay stagger so not all particles fire at identical moment
      const pt = 0.02 + Math.random() * 0.04;
      const r = Math.random();
      const shape: CelebShape = r < 0.38 ? 'circle' : r < 0.72 ? 'rect' : 'star';
      particles.push({
        id: id++,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
        shape,
        sx: origin.x, sy: origin.y,
        peakDx: Math.cos(angle) * peakDist,
        peakDy: Math.sin(angle) * peakDist,
        fallDx: (Math.random() - 0.5) * w * 0.55,
        finalDy: h * 0.30,
        pt,
        size: 7 + Math.random() * 11,
        spin: (Math.random() - 0.5) * 1080,
      });
    }
  }
  return particles;
}

function CelebParticleView({ p, anim }: { p: CelebParticle; anim: Animated.Value }) {
  const ptSafe = Math.max(p.pt, 0.001);
  // peakT: the moment this particle reaches its peak — very early in animation
  const peakT  = Math.min(ptSafe + RISE_FRAC, 0.98);

  const translateX = anim.interpolate({
    inputRange:  [0, ptSafe, peakT, 1],
    outputRange: [p.sx, p.sx, p.sx + p.peakDx, p.sx + p.peakDx + p.fallDx],
    extrapolate: 'clamp',
  });
  const translateY = anim.interpolate({
    inputRange:  [0, ptSafe, peakT, 1],
    outputRange: [p.sy, p.sy, p.sy + p.peakDy, p.sy + p.finalDy],
    extrapolate: 'clamp',
  });
  const rotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${p.spin}deg`],
    extrapolate: 'clamp',
  });
  const opacity = anim.interpolate({
    inputRange:  [0, ptSafe, 0.82, 1],
    outputRange: [0, 1,      1,    0],
    extrapolate: 'clamp',
  });

  const s = p.size;
  const shapeStyle =
    p.shape === 'circle'
      ? { width: s, height: s, borderRadius: s / 2, backgroundColor: p.color }
      : p.shape === 'rect'
      ? { width: s * 0.65, height: s * 1.3, borderRadius: 2, backgroundColor: p.color }
      : { width: s, height: s, borderRadius: 3, backgroundColor: p.color };  // star = square + spin

  return (
    <Animated.View
      style={[
        styles.particle,
        shapeStyle,
        { opacity, transform: [{ translateX }, { translateY }, { rotate }] },
      ]}
    />
  );
}

type Props = {
  visible: boolean;
  onComplete?: () => void;
};

export default function PopperCelebration({ visible, onComplete }: Props) {
  const { width, height } = useWindowDimensions();
  const anim = useRef(new Animated.Value(0)).current;
  const particles = useMemo(() => buildParticles(width, height), [width, height]);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; });

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      // Delay by 1 frame so the 450 views can mount before animation starts
      const raf = requestAnimationFrame(() => {
        Animated.timing(anim, {
          toValue: 1,
          duration: DURATION,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) onCompleteRef.current?.();
        });
      });
      return () => cancelAnimationFrame(raf);
    } else {
      anim.stopAnimation();
      anim.setValue(0);
    }
  }, [visible, anim]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map(p => (
        <CelebParticleView key={p.id} p={p} anim={anim} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
