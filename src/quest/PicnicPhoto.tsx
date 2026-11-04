// PicnicPhoto — one real picnic scene, shared by the finished-quest
// polaroid (Finale) and the album card (MyDaysScreen). Garden background,
// the tied balloons up top, Grandma and the buddy at the blanket's edges,
// the counted fruit piled on the plate plus the dish, as in the scene.
// Both places show the same photo — never an icon strip.

import React from 'react';
import { DimensionValue, Image, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import SimpleBall from './SimpleBall';
import WordArt from './WordArt';
import { COLOR_HEX } from './pickLists';
import { buddyPose } from './questTheme';
import { BuddyId } from './buddyStore';
import { DisplayWord } from './questGroups';

/** Bright sun with rays, drawn once for the corner of the sky. */
export function Sun({ size }: { size: number }) {
  const c = size / 2;
  const r = size * 0.3;
  const rays = Array.from({ length: 8 }).map((_, i) => {
    const a = (i * Math.PI) / 4;
    return {
      x1: c + Math.cos(a) * r * 1.25,
      y1: c + Math.sin(a) * r * 1.25,
      x2: c + Math.cos(a) * r * 1.7,
      y2: c + Math.sin(a) * r * 1.7,
    };
  });
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rays.map((ray, i) => (
        <Line key={i} x1={ray.x1} y1={ray.y1} x2={ray.x2} y2={ray.y2} stroke="#FFB300" strokeWidth={size * 0.06} strokeLinecap="round" />
      ))}
      <Circle cx={c} cy={c} r={r} fill="#FFD93B" stroke="#FFB300" strokeWidth={size * 0.05} />
    </Svg>
  );
}

/** One tiny grass flower: five petals around a sunny center. */
export function Flower({ size, petal }: { size: number; petal: string }) {
  const c = size / 2;
  const pr = size * 0.2;
  const off = size * 0.26;
  const spots = Array.from({ length: 5 }).map((_, i) => {
    const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    return { cx: c + Math.cos(a) * off, cy: c + Math.sin(a) * off };
  });
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Line x1={c} y1={c} x2={c} y2={size} stroke="#2E9E47" strokeWidth={size * 0.1} strokeLinecap="round" />
      {spots.map((s, i) => (
        <Circle key={i} cx={s.cx} cy={s.cy} r={pr} fill={petal} />
      ))}
      <Circle cx={c} cy={c} r={pr * 0.9} fill="#FFC93C" />
    </Svg>
  );
}

const PLATE_SRC = require('../../assets/neli-world/kitchen/plate.webp');

/** Fruit pile spots on the plate (fractions of it), same natural
 * single-layer pile as the live Finale scene — slight overlaps. */
function pileSpots(n: number): [number, number, number][] {
  switch (n) {
    case 1: return [[0.5, 0.46, 0]];
    case 2: return [[0.36, 0.47, -8], [0.64, 0.47, 8]];
    case 3: return [[0.3, 0.48, -8], [0.52, 0.43, 0], [0.72, 0.48, 8]];
    case 4: return [[0.26, 0.48, -8], [0.43, 0.45, -3], [0.6, 0.45, 3], [0.76, 0.48, 8]];
    default: return [[0.3, 0.52, -8], [0.5, 0.54, 0], [0.7, 0.52, 8], [0.4, 0.34, -4], [0.61, 0.34, 4]];
  }
}

const FLOWERS: { left: DimensionValue; bottom: DimensionValue; color: string }[] = [
  { left: '3%', bottom: '4%', color: '#FF5D8F' },
  { left: '13%', bottom: '1%', color: '#FF8A3D' },
  { left: '22%', bottom: '6%', color: '#B388FF' },
  { left: '78%', bottom: '3%', color: '#FF5D8F' },
  { left: '88%', bottom: '7%', color: '#4FC3F7' },
  { left: '95%', bottom: '2%', color: '#FF8A3D' },
];

export default function PicnicPhoto({
  background,
  grandma,
  buddy,
  fruitWord,
  fruitCount,
  dishWord,
  balloonIds,
  colorHex,
  w,
  h,
  radius,
}: {
  background?: any;
  grandma?: any;
  buddy: BuddyId;
  fruitWord: DisplayWord | null;
  fruitCount: number;
  dishWord: DisplayWord | null;
  balloonIds: string[];
  colorHex: string;
  w: number;
  h: number;
  radius?: number;
}) {
  const castH = h * 0.52;
  // Served like the real scene: the counted fruit piled ON the plate,
  // the dish beside it — shrunk together to fit inside the blanket.
  const blanketW = Math.max(0, w - castH * 1.4);
  const blanketH = h * 0.36;
  const foodGap = Math.max(2, h * 0.02);
  const plateRaw = Math.min(blanketW * 0.42, blanketH);
  const bigRaw = Math.min(blanketW * 0.34, blanketH * 0.82);
  const fit = Math.min(1, (blanketW * 0.9) / Math.max(1, plateRaw + bigRaw + foodGap));
  const plateW = plateRaw * fit;
  const plateH = plateW * 0.82;
  const bigPlate = bigRaw * fit;
  const fruitF = plateW * 0.3;
  const shown = Math.min(Math.max(fruitCount, 1), 5);
  return (
    <View style={{ width: w, height: h, borderRadius: radius ?? 0, overflow: 'hidden' }}>
      {background ? (
        <Image
          source={background}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#8FD694' }} />
      )}
      {/* Gentle warm sunny lift over the garden (never white): the art
          underneath shows at full color. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,174,66,0.10)' }} />
      <View pointerEvents="none" style={{ position: 'absolute', top: 2, left: 4 }}>
        <Sun size={h * 0.24} />
      </View>
      {FLOWERS.map((f, i) => (
        <View key={i} pointerEvents="none" style={{ position: 'absolute', left: f.left, bottom: f.bottom }}>
          <Flower size={h * 0.11} petal={f.color} />
        </View>
      ))}
      {balloonIds.length > 0 && (
        <View style={{ position: 'absolute', bottom: Math.max(2, h * 0.02), left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 2 }}>
          {balloonIds.map(id => (
            <SimpleBall key={id} color={COLOR_HEX[id] ?? '#CCCCCC'} size={h * 0.16} />
          ))}
        </View>
      )}
      {grandma ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 6, bottom: 1, width: castH * 0.8, height: Math.max(4, h * 0.03), borderRadius: 999, backgroundColor: 'rgba(31,61,31,0.25)' }} />
      ) : null}
      {grandma ? (
        <Image
          source={grandma}
          style={{ position: 'absolute', left: 4, bottom: 2, width: castH * 0.85, height: castH }}
          resizeMode="contain"
        />
      ) : null}
      <View pointerEvents="none" style={{ position: 'absolute', right: 6, bottom: 1, width: castH * 0.8, height: Math.max(4, h * 0.03), borderRadius: 999, backgroundColor: 'rgba(31,61,31,0.25)' }} />
      <Image
        source={buddyPose(buddy, 'celebration')}
        style={{ position: 'absolute', right: 4, bottom: 2, width: castH * 0.85, height: castH }}
        resizeMode="contain"
      />
      <View
        style={{
          position: 'absolute',
          left: castH * 0.7,
          right: castH * 0.7,
          bottom: 2,
          height: h * 0.36,
          borderRadius: 6,
          overflow: 'hidden',
          backgroundColor: colorHex,
          borderWidth: 2,
          borderColor: 'rgba(31,61,31,0.60)',
          shadowColor: '#1F3D1F',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.35,
          shadowRadius: 4,
          elevation: 4,
          flexDirection: 'row',
          flexWrap: 'wrap',
        }}
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <View
            key={i}
            style={{
              width: '12.5%',
              height: '50%',
              backgroundColor: (Math.floor(i / 8) + i) % 2 === 0 ? colorHex : '#FFFFFF',
            }}
          />
        ))}
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: foodGap }}>
          {fruitWord && (
            <View style={{ width: plateW, height: plateH }}>
              <Image source={PLATE_SRC} style={{ position: 'absolute', left: 0, top: 0, width: plateW, height: plateH }} resizeMode="contain" />
              {pileSpots(shown).map(([fx, fy, rot], i) => (
                <View key={i} style={{ position: 'absolute', left: fx * plateW - fruitF / 2, top: fy * plateH - fruitF / 2, transform: [{ rotate: `${rot}deg` }] }}>
                  <WordArt word={fruitWord} size={fruitF} />
                </View>
              ))}
            </View>
          )}
          {dishWord && <WordArt word={dishWord} size={bigPlate} />}
        </View>
      </View>
    </View>
  );
}
