// One real ball drawn in code: white soccer ball with patches in the
// child's chosen color, seams and a soft shine. Used at the picnic (and
// on its photo card) instead of balloons.

import React from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path } from 'react-native-svg';
import { darkenHex } from './pickLists';

export default function StripedBall({ color, size }: { color: string; size: number }) {
  const edge = darkenHex(color);
  // Five patches around the rim, cut by the ball's own circle.
  const patches = [0, 72, 144, 216, 288].map(deg => {
    const rad = (deg * Math.PI) / 180;
    return { x: 50 + 36 * Math.cos(rad), y: 50 + 36 * Math.sin(rad), r: deg };
  });
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id="ballClip">
          <Circle cx={50} cy={50} r={46} />
        </ClipPath>
      </Defs>
      <Circle cx={50} cy={50} r={46} fill="#FFFFFF" />
      <G clipPath="url(#ballClip)">
        {patches.map(p => (
          <Path
            key={p.r}
            d={`M ${p.x} ${p.y} l 11 -7 l 4 12 l -9 8 l -12 -4 z`}
            fill={color}
            transform={`rotate(${p.r} ${p.x} ${p.y})`}
          />
        ))}
        <Path d="M 39 39 L 61 39 L 68 54 L 50 66 L 32 54 Z" fill={color} />
        <Path
          d="M 39 39 L 50 22 M 61 39 L 76 30 M 68 54 L 84 60 M 50 66 L 50 84 M 32 54 L 16 60 M 39 39 L 32 54 M 61 39 L 68 54 M 32 54 L 50 66 M 68 54 L 50 66"
          stroke={edge}
          strokeWidth={2}
          fill="none"
        />
        <Ellipse cx={34} cy={26} rx={16} ry={9} fill="#FFFFFF" opacity={0.55} transform="rotate(-24 34 26)" />
        <Ellipse cx={50} cy={88} rx={34} ry={8} fill={edge} opacity={0.18} />
      </G>
      <Circle cx={50} cy={50} r={46} fill="none" stroke={edge} strokeWidth={3.5} />
    </Svg>
  );
}
