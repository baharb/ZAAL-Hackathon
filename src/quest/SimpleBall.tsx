// One simple ball drawn in code: a solid chosen color with a soft
// shine and bottom shade — round like a real ball, no stripes, no
// patches. Used for the color question and at the picnic.

import React from 'react';
import Svg, { Circle, Ellipse } from 'react-native-svg';
import { darkenHex } from './pickLists';

export default function SimpleBall({ color, size }: { color: string; size: number }) {
  const edge = darkenHex(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={46} fill={color} />
      <Ellipse cx={50} cy={82} rx={36} ry={14} fill={edge} opacity={0.25} />
      <Ellipse cx={34} cy={28} rx={17} ry={10} fill="#FFFFFF" opacity={0.55} transform="rotate(-24 34 28)" />
      <Circle cx={50} cy={50} r={46} fill="none" stroke={edge} strokeWidth={3.5} />
    </Svg>
  );
}
