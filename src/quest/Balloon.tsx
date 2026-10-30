// One party balloon drawn in code: round body, shine, knot and string.
// Used by the trip's color game and tied to the picnic tree.

import React from 'react';
import Svg, { Ellipse, Line, Path } from 'react-native-svg';
import { darkenHex } from './pickLists';

export default function Balloon({ color, size }: { color: string; size: number }) {
  const w = size;
  const bodyCY = size * 0.34;
  const bodyRX = size * 0.32;
  const bodyRY = size * 0.36;
  const knotY = bodyCY + bodyRY;
  const stringEnd = size * 1.3;
  // Clearance above the body so the top (plus its outline) is never cut
  // by the SVG frame on any screen.
  const pad = size * 0.06;
  return (
    <Svg width={w} height={stringEnd + pad} viewBox={`0 ${-pad} ${w} ${stringEnd + pad}`}>
      <Line
        x1={w / 2}
        y1={knotY + size * 0.04}
        x2={w / 2}
        y2={stringEnd}
        stroke="#7C6A4F"
        strokeWidth={Math.max(1.5, size * 0.022)}
        strokeLinecap="round"
      />
      <Ellipse cx={w / 2} cy={bodyCY} rx={bodyRX} ry={bodyRY} fill={color} stroke={darkenHex(color)} strokeWidth={Math.max(2, size * 0.035)} />
      <Ellipse
        cx={w / 2 - size * 0.12}
        cy={bodyCY - size * 0.12}
        rx={size * 0.065}
        ry={size * 0.12}
        fill="#FFFFFF"
        opacity={0.45}
      />
      <Path
        d={`M ${w / 2 - size * 0.045} ${knotY} L ${w / 2 + size * 0.045} ${knotY} L ${w / 2} ${knotY + size * 0.05} Z`}
        fill={color}
      />
    </Svg>
  );
}
