// One striped picnic ball drawn in code: white and the child's chosen
// color, beach-ball style with a soft shine. Used at the picnic (and on
// its photo card) instead of balloons.

import React from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G } from 'react-native-svg';
import { darkenHex } from './pickLists';

export default function StripedBall({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id="ballClip">
          <Circle cx={50} cy={50} r={46} />
        </ClipPath>
      </Defs>
      <Circle cx={50} cy={50} r={46} fill={color} />
      <G clipPath="url(#ballClip)">
        <Ellipse cx={50} cy={50} rx={15} ry={48} fill="#FFFFFF" />
        <Ellipse cx={13} cy={50} rx={11} ry={48} fill="#FFFFFF" />
        <Ellipse cx={87} cy={50} rx={11} ry={48} fill="#FFFFFF" />
        <Ellipse cx={32} cy={24} rx={14} ry={8} fill="#FFFFFF" opacity={0.5} />
      </G>
      <Circle cx={50} cy={50} r={46} fill="none" stroke={darkenHex(color)} strokeWidth={3.5} />
    </Svg>
  );
}
