/**
 * Bold cartoon SVG characters
 * Style: bold cartoon — thick shapes, solid flat colors, NO outlines, huge eyes, round proportions
 * Round-bodied panda with a magnifying glass, big head, simple limbs
 */
import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect, G } from 'react-native-svg';

// ─── PANDA ─────────────────────────────────────────────────────────────────
export function PandaSVG({ size = 120, expression = 'happy' }: { size?: number; expression?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 220">
      {/* Body — big red/pink rounded blob */}
      <Ellipse cx="100" cy="160" rx="68" ry="62" fill="#FF4D6D" />
      {/* Tummy */}
      <Ellipse cx="100" cy="168" rx="44" ry="40" fill="#FFB3C1" />
      {/* Head — large off-white circle */}
      <Circle cx="100" cy="88" r="72" fill="#F0EDE8" />
      {/* Ear patches */}
      <Circle cx="44" cy="34" r="28" fill="#1A1A1A" />
      <Circle cx="156" cy="34" r="28" fill="#1A1A1A" />
      <Circle cx="44" cy="34" r="17" fill="#3A3A3A" />
      <Circle cx="156" cy="34" r="17" fill="#3A3A3A" />
      {/* Eye patches */}
      <Ellipse cx="72" cy="84" rx="24" ry="22" fill="#1A1A1A" />
      <Ellipse cx="128" cy="84" rx="24" ry="22" fill="#1A1A1A" />
      {/* White of eyes */}
      <Circle cx="72" cy="82" r="16" fill="#fff" />
      <Circle cx="128" cy="82" r="16" fill="#fff" />
      {/* Pupils */}
      <Circle cx="75" cy="84" r="10" fill="#1A1A1A" />
      <Circle cx="131" cy="84" r="10" fill="#1A1A1A" />
      {/* Shine */}
      <Circle cx="80" cy="79" r="4" fill="#fff" />
      <Circle cx="136" cy="79" r="4" fill="#fff" />
      {/* Nose */}
      <Ellipse cx="100" cy="102" rx="9" ry="7" fill="#1A1A1A" />
      {/* Mouth */}
      {expression === 'happy'
        ? <Path d="M82 114 Q100 130 118 114" stroke="#1A1A1A" strokeWidth="4" fill="none" strokeLinecap="round" />
        : expression === 'brushing'
        ? <Rect x="82" y="112" width="36" height="14" rx="7" fill="#fff" />
        : <Path d="M86 116 Q100 124 114 116" stroke="#1A1A1A" strokeWidth="4" fill="none" strokeLinecap="round" />}
      {/* Cheeks */}
      <Circle cx="56" cy="108" r="14" fill="#FF8FAB" opacity={0.6} />
      <Circle cx="144" cy="108" r="14" fill="#FF8FAB" opacity={0.6} />
      {/* Arms */}
      <Ellipse cx="26" cy="162" rx="20" ry="30" fill="#1A1A1A" />
      <Ellipse cx="174" cy="162" rx="20" ry="30" fill="#1A1A1A" />
      {/* Feet */}
      <Ellipse cx="70" cy="216" rx="28" ry="16" fill="#1A1A1A" />
      <Ellipse cx="130" cy="216" rx="28" ry="16" fill="#1A1A1A" />
    </Svg>
  );
}

// ─── FOX (Zari) ──────────────────────────────────────────────────────────────
export function FoxSVG({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 220">
      {/* Body — orange */}
      <Ellipse cx="100" cy="160" rx="66" ry="60" fill="#FF8C42" />
      <Ellipse cx="100" cy="168" rx="42" ry="38" fill="#FFD4A8" />
      {/* Ear triangles */}
      <Path d="M42 52 L28 8 L72 40" fill="#FF6B20" />
      <Path d="M158 52 L172 8 L128 40" fill="#FF6B20" />
      <Path d="M44 50 L32 16 L68 42" fill="#FFB3C1" />
      <Path d="M156 50 L168 16 L132 42" fill="#FFB3C1" />
      {/* Head */}
      <Circle cx="100" cy="90" r="70" fill="#FF8C42" />
      {/* Face white area */}
      <Ellipse cx="100" cy="106" rx="42" ry="34" fill="#FFD4A8" />
      {/* Eyes */}
      <Circle cx="72" cy="80" r="18" fill="#fff" />
      <Circle cx="128" cy="80" r="18" fill="#fff" />
      <Circle cx="75" cy="82" r="11" fill="#1A0800" />
      <Circle cx="131" cy="82" r="11" fill="#1A0800" />
      <Circle cx="80" cy="77" r="4.5" fill="#fff" />
      <Circle cx="136" cy="77" r="4.5" fill="#fff" />
      {/* Nose */}
      <Ellipse cx="100" cy="104" rx="8" ry="6" fill="#1A0800" />
      {/* Smile */}
      <Path d="M82 116 Q100 132 118 116" stroke="#1A0800" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* Cheeks */}
      <Circle cx="54" cy="100" r="13" fill="#FF6B6B" opacity={0.5} />
      <Circle cx="146" cy="100" r="13" fill="#FF6B6B" opacity={0.5} />
      {/* Arms + feet */}
      <Ellipse cx="26" cy="158" rx="18" ry="28" fill="#FF6B20" />
      <Ellipse cx="174" cy="158" rx="18" ry="28" fill="#FF6B20" />
      <Ellipse cx="70" cy="214" rx="26" ry="15" fill="#FF6B20" />
      <Ellipse cx="130" cy="214" rx="26" ry="15" fill="#FF6B20" />
    </Svg>
  );
}

// ─── OWL (Saba) ──────────────────────────────────────────────────────────────
export function OwlSVG({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 220">
      {/* Body */}
      <Ellipse cx="100" cy="162" rx="64" ry="60" fill="#F0C030" />
      <Ellipse cx="100" cy="172" rx="40" ry="36" fill="#FFF8CC" />
      {/* Wings */}
      <Ellipse cx="28" cy="166" rx="26" ry="44" fill="#D4900A" />
      <Ellipse cx="172" cy="166" rx="26" ry="44" fill="#D4900A" />
      {/* Head */}
      <Circle cx="100" cy="90" r="68" fill="#F0C030" />
      {/* Ear tufts */}
      <Path d="M56 34 L44 4 L76 28" fill="#B07A00" />
      <Path d="M144 34 L156 4 L124 28" fill="#B07A00" />
      {/* Face disc */}
      <Ellipse cx="100" cy="98" rx="52" ry="46" fill="#FFE890" />
      {/* GLASSES */}
      <Circle cx="72" cy="88" r="22" fill="#fff" />
      <Circle cx="128" cy="88" r="22" fill="#fff" />
      <Circle cx="72" cy="88" r="22" fill="none" stroke="#7B4A00" strokeWidth="5" />
      <Circle cx="128" cy="88" r="22" fill="none" stroke="#7B4A00" strokeWidth="5" />
      <Path d="M94 88 L106 88" stroke="#7B4A00" strokeWidth="5" strokeLinecap="round" />
      {/* Eyes behind glasses */}
      <Circle cx="75" cy="90" r="13" fill="#1A1200" />
      <Circle cx="131" cy="90" r="13" fill="#1A1200" />
      <Circle cx="80" cy="85" r="5" fill="#fff" />
      <Circle cx="136" cy="85" r="5" fill="#fff" />
      {/* Beak */}
      <Path d="M88 108 L100 124 L112 108 Q100 116 88 108" fill="#E07800" />
      {/* Feet */}
      <Path d="M70 216 L62 230 M70 216 L70 230 M70 216 L78 230" stroke="#B07A00" strokeWidth="6" strokeLinecap="round" />
      <Path d="M130 216 L122 230 M130 216 L130 230 M130 216 L138 230" stroke="#B07A00" strokeWidth="6" strokeLinecap="round" />
    </Svg>
  );
}

// ─── BUNNY (Luna) ────────────────────────────────────────────────────────────
export function BunnySVG({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 220">
      {/* Body */}
      <Ellipse cx="100" cy="162" rx="64" ry="60" fill="#A29BFE" />
      <Ellipse cx="100" cy="172" rx="40" ry="36" fill="#D8D4FF" />
      {/* Tall ears */}
      <Ellipse cx="62" cy="28" rx="22" ry="44" fill="#C0B8FF" />
      <Ellipse cx="138" cy="28" rx="22" ry="44" fill="#C0B8FF" />
      <Ellipse cx="62" cy="28" rx="12" ry="32" fill="#FFB6DA" />
      <Ellipse cx="138" cy="28" rx="12" ry="32" fill="#FFB6DA" />
      {/* Head */}
      <Circle cx="100" cy="96" r="68" fill="#C0B8FF" />
      {/* Eyes — large dreamy */}
      <Circle cx="72" cy="86" r="20" fill="#fff" />
      <Circle cx="128" cy="86" r="20" fill="#fff" />
      <Circle cx="75" cy="89" r="13" fill="#3A1A80" />
      <Circle cx="131" cy="89" r="13" fill="#3A1A80" />
      <Circle cx="81" cy="83" r="5.5" fill="#fff" />
      <Circle cx="137" cy="83" r="5.5" fill="#fff" />
      {/* Nose */}
      <Ellipse cx="100" cy="108" rx="7" ry="5" fill="#FF80C0" />
      {/* Smile */}
      <Path d="M84 118 Q100 134 116 118" stroke="#8060C0" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* Cheeks */}
      <Circle cx="54" cy="104" r="14" fill="#FFB6DA" opacity={0.65} />
      <Circle cx="146" cy="104" r="14" fill="#FFB6DA" opacity={0.65} />
      {/* Arms + feet */}
      <Ellipse cx="26" cy="160" rx="18" ry="28" fill="#A29BFE" />
      <Ellipse cx="174" cy="160" rx="18" ry="28" fill="#A29BFE" />
      <Ellipse cx="70" cy="214" rx="26" ry="14" fill="#A29BFE" />
      <Ellipse cx="130" cy="214" rx="26" ry="14" fill="#A29BFE" />
    </Svg>
  );
}

// ─── ELEPHANT (Roshan) ───────────────────────────────────────────────────────
export function ElephantSVG({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 220">
      {/* Body */}
      <Ellipse cx="100" cy="162" rx="68" ry="62" fill="#9B59B6" />
      <Ellipse cx="100" cy="172" rx="44" ry="38" fill="#C39BD3" />
      {/* Ears */}
      <Ellipse cx="24" cy="100" rx="30" ry="44" fill="#7D3C98" />
      <Ellipse cx="176" cy="100" rx="30" ry="44" fill="#7D3C98" />
      <Ellipse cx="24" cy="100" rx="18" ry="30" fill="#BB8FCE" />
      <Ellipse cx="176" cy="100" rx="18" ry="30" fill="#BB8FCE" />
      {/* Head */}
      <Circle cx="100" cy="92" r="68" fill="#9B59B6" />
      {/* Trunk */}
      <Path d="M82 130 Q68 148 72 170 Q78 178 86 168 Q82 150 92 140" fill="#7D3C98" />
      {/* Eyes */}
      <Circle cx="74" cy="80" r="18" fill="#fff" />
      <Circle cx="126" cy="80" r="18" fill="#fff" />
      <Circle cx="77" cy="83" r="11" fill="#1A0050" />
      <Circle cx="129" cy="83" r="11" fill="#1A0050" />
      <Circle cx="82" cy="78" r="4.5" fill="#fff" />
      <Circle cx="134" cy="78" r="4.5" fill="#fff" />
      {/* Cheeks */}
      <Circle cx="52" cy="102" r="13" fill="#E8DAEF" opacity={0.7} />
      <Circle cx="148" cy="102" r="13" fill="#E8DAEF" opacity={0.7} />
      {/* Feet */}
      <Ellipse cx="70" cy="216" rx="28" ry="16" fill="#7D3C98" />
      <Ellipse cx="130" cy="216" rx="28" ry="16" fill="#7D3C98" />
    </Svg>
  );
}

export function RabbitSVG({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 220">
      <Ellipse cx="100" cy="162" rx="64" ry="60" fill="#F7E9D7" />
      <Ellipse cx="100" cy="172" rx="40" ry="36" fill="#FFE8C8" />
      <Ellipse cx="60" cy="28" rx="22" ry="46" fill="#F3DEC4" />
      <Ellipse cx="140" cy="28" rx="22" ry="46" fill="#F3DEC4" />
      <Ellipse cx="60" cy="28" rx="12" ry="32" fill="#FFC0CB" />
      <Ellipse cx="140" cy="28" rx="12" ry="32" fill="#FFC0CB" />
      <Circle cx="100" cy="92" r="68" fill="#F7E9D7" />
      <Circle cx="72" cy="84" r="18" fill="#fff" />
      <Circle cx="128" cy="84" r="18" fill="#fff" />
      <Circle cx="75" cy="87" r="11" fill="#2B1B14" />
      <Circle cx="131" cy="87" r="11" fill="#2B1B14" />
      <Circle cx="80" cy="81" r="4.5" fill="#fff" />
      <Circle cx="136" cy="81" r="4.5" fill="#fff" />
      <Ellipse cx="100" cy="107" rx="8" ry="6" fill="#FF8A65" />
      <Path d="M86 116 Q100 129 114 116" stroke="#A06A50" strokeWidth="4" fill="none" strokeLinecap="round" />
      <Circle cx="54" cy="102" r="13" fill="#FFB9C8" opacity={0.6} />
      <Circle cx="146" cy="102" r="13" fill="#FFB9C8" opacity={0.6} />
      <Ellipse cx="26" cy="160" rx="18" ry="28" fill="#F3DEC4" />
      <Ellipse cx="174" cy="160" rx="18" ry="28" fill="#F3DEC4" />
      <Ellipse cx="70" cy="214" rx="26" ry="15" fill="#E9D1B7" />
      <Ellipse cx="130" cy="214" rx="26" ry="15" fill="#E9D1B7" />
    </Svg>
  );
}

export function CatSVG({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 220">
      <Ellipse cx="100" cy="162" rx="64" ry="60" fill="#FFB84D" />
      <Ellipse cx="100" cy="172" rx="40" ry="36" fill="#FFE2B3" />
      <Path d="M42 52 L28 12 L68 42" fill="#FF9F1C" />
      <Path d="M158 52 L172 12 L132 42" fill="#FF9F1C" />
      <Path d="M44 50 L34 20 L66 42" fill="#FFD8A8" />
      <Path d="M156 50 L166 20 L134 42" fill="#FFD8A8" />
      <Circle cx="100" cy="90" r="70" fill="#FFB84D" />
      <Ellipse cx="100" cy="108" rx="44" ry="34" fill="#FFE2B3" />
      <Circle cx="72" cy="82" r="18" fill="#fff" />
      <Circle cx="128" cy="82" r="18" fill="#fff" />
      <Circle cx="75" cy="85" r="11" fill="#2B1B14" />
      <Circle cx="131" cy="85" r="11" fill="#2B1B14" />
      <Circle cx="80" cy="80" r="4.5" fill="#fff" />
      <Circle cx="136" cy="80" r="4.5" fill="#fff" />
      <Ellipse cx="100" cy="104" rx="8" ry="6" fill="#FF7F50" />
      <Path d="M82 116 Q100 130 118 116" stroke="#2B1B14" strokeWidth="4" fill="none" strokeLinecap="round" />
      <Circle cx="54" cy="102" r="13" fill="#FFCF99" opacity={0.6} />
      <Circle cx="146" cy="102" r="13" fill="#FFCF99" opacity={0.6} />
      <Ellipse cx="26" cy="160" rx="18" ry="28" fill="#FF9F1C" />
      <Ellipse cx="174" cy="160" rx="18" ry="28" fill="#FF9F1C" />
      <Path d="M154 176 Q186 182 184 214" stroke="#FF9F1C" strokeWidth="14" fill="none" strokeLinecap="round" />
      <Ellipse cx="70" cy="214" rx="26" ry="15" fill="#FF9F1C" />
      <Ellipse cx="130" cy="214" rx="26" ry="15" fill="#FF9F1C" />
    </Svg>
  );
}

export function BearSVG({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 220">
      <Ellipse cx="100" cy="162" rx="68" ry="62" fill="#A06A3E" />
      <Ellipse cx="100" cy="172" rx="44" ry="38" fill="#D8B08A" />
      <Circle cx="56" cy="38" r="24" fill="#8F5A31" />
      <Circle cx="144" cy="38" r="24" fill="#8F5A31" />
      <Circle cx="56" cy="38" r="14" fill="#C99667" />
      <Circle cx="144" cy="38" r="14" fill="#C99667" />
      <Circle cx="100" cy="90" r="70" fill="#A06A3E" />
      <Ellipse cx="100" cy="108" rx="42" ry="34" fill="#D8B08A" />
      <Circle cx="72" cy="82" r="18" fill="#fff" />
      <Circle cx="128" cy="82" r="18" fill="#fff" />
      <Circle cx="75" cy="85" r="11" fill="#2B1B14" />
      <Circle cx="131" cy="85" r="11" fill="#2B1B14" />
      <Circle cx="80" cy="80" r="4.5" fill="#fff" />
      <Circle cx="136" cy="80" r="4.5" fill="#fff" />
      <Ellipse cx="100" cy="104" rx="9" ry="7" fill="#2B1B14" />
      <Path d="M82 116 Q100 130 118 116" stroke="#2B1B14" strokeWidth="4" fill="none" strokeLinecap="round" />
      <Circle cx="54" cy="102" r="13" fill="#E7C39B" opacity={0.6} />
      <Circle cx="146" cy="102" r="13" fill="#E7C39B" opacity={0.6} />
      <Ellipse cx="26" cy="160" rx="18" ry="28" fill="#8F5A31" />
      <Ellipse cx="174" cy="160" rx="18" ry="28" fill="#8F5A31" />
      <Ellipse cx="70" cy="214" rx="26" ry="15" fill="#8F5A31" />
      <Ellipse cx="130" cy="214" rx="26" ry="15" fill="#8F5A31" />
    </Svg>
  );
}

// ─── TIGER (Tara) ────────────────────────────────────────────────────────────
export function TigerSVG({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 220">
      {/* Body */}
      <Ellipse cx="100" cy="160" rx="66" ry="62" fill="#FF8C42" />
      {/* Stripes on body */}
      <Path d="M68 120 Q62 146 64 170" stroke="#D06000" strokeWidth="7" fill="none" strokeLinecap="round" opacity={0.6} />
      <Path d="M100 116 L100 176" stroke="#D06000" strokeWidth="7" fill="none" strokeLinecap="round" opacity={0.6} />
      <Path d="M132 120 Q138 146 136 170" stroke="#D06000" strokeWidth="7" fill="none" strokeLinecap="round" opacity={0.6} />
      <Ellipse cx="100" cy="170" rx="42" ry="36" fill="#FFD4A8" />
      {/* Ears */}
      <Path d="M46 46 L32 14 L68 38" fill="#FF6B20" />
      <Path d="M154 46 L168 14 L132 38" fill="#FF6B20" />
      <Path d="M48 44 L36 18 L66 38" fill="#FFB3C1" />
      <Path d="M152 44 L164 18 L134 38" fill="#FFB3C1" />
      {/* Head */}
      <Circle cx="100" cy="90" r="70" fill="#FF8C42" />
      {/* Face stripes */}
      <Path d="M36 62 Q40 78 34 92" stroke="#D06000" strokeWidth="6" fill="none" strokeLinecap="round" opacity={0.7} />
      <Path d="M164 62 Q160 78 166 92" stroke="#D06000" strokeWidth="6" fill="none" strokeLinecap="round" opacity={0.7} />
      {/* Muzzle */}
      <Ellipse cx="100" cy="108" rx="36" ry="26" fill="#FFD4A8" />
      {/* Eyes */}
      <Circle cx="72" cy="82" r="20" fill="#fff" />
      <Circle cx="128" cy="82" r="20" fill="#fff" />
      <Circle cx="75" cy="85" r="12" fill="#1A0800" />
      <Circle cx="131" cy="85" r="12" fill="#1A0800" />
      <Circle cx="80" cy="80" r="5" fill="#fff" />
      <Circle cx="136" cy="80" r="5" fill="#fff" />
      {/* Nose */}
      <Ellipse cx="100" cy="104" rx="9" ry="7" fill="#1A0800" />
      {/* Smile */}
      <Path d="M78 116 Q100 134 122 116" stroke="#1A0800" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* Cheeks */}
      <Circle cx="52" cy="102" r="13" fill="#FF6B6B" opacity={0.55} />
      <Circle cx="148" cy="102" r="13" fill="#FF6B6B" opacity={0.55} />
      {/* Arms + feet */}
      <Ellipse cx="26" cy="158" rx="18" ry="28" fill="#FF6B20" />
      <Ellipse cx="174" cy="158" rx="18" ry="28" fill="#FF6B20" />
      <Ellipse cx="70" cy="214" rx="26" ry="14" fill="#D06000" />
      <Ellipse cx="130" cy="214" rx="26" ry="14" fill="#D06000" />
    </Svg>
  );
}

// ─── BIRD (Nasim) ────────────────────────────────────────────────────────────
export function BirdSVG({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 220">
      {/* Body */}
      <Ellipse cx="100" cy="162" rx="62" ry="56" fill="#4DBFFF" />
      {/* Wing left */}
      <Ellipse cx="28" cy="158" rx="28" ry="48" fill="#0090CC" rotation="-18" originX="28" originY="158" />
      {/* Wing right */}
      <Ellipse cx="172" cy="158" rx="28" ry="48" fill="#0090CC" rotation="18" originX="172" originY="158" />
      <Ellipse cx="100" cy="172" rx="38" ry="32" fill="#A8EEFF" />
      {/* Head */}
      <Circle cx="100" cy="92" r="66" fill="#4DBFFF" />
      {/* Crest feathers */}
      <Ellipse cx="80" cy="34" rx="10" ry="28" fill="#FFD93D" rotation="-20" originX="80" originY="34" />
      <Ellipse cx="100" cy="28" rx="10" ry="30" fill="#FFD93D" />
      <Ellipse cx="120" cy="34" rx="10" ry="28" fill="#FFD93D" rotation="20" originX="120" originY="34" />
      {/* Eyes */}
      <Circle cx="72" cy="86" r="19" fill="#fff" />
      <Circle cx="128" cy="86" r="19" fill="#fff" />
      <Circle cx="75" cy="89" r="12" fill="#1A0050" />
      <Circle cx="131" cy="89" r="12" fill="#1A0050" />
      <Circle cx="80" cy="84" r="5" fill="#fff" />
      <Circle cx="136" cy="84" r="5" fill="#fff" />
      {/* Beak */}
      <Path d="M84 106 L100 124 L116 106 Q100 114 84 106" fill="#FFB300" />
      {/* Cheeks */}
      <Circle cx="52" cy="100" r="13" fill="#7DD8FF" opacity={0.7} />
      <Circle cx="148" cy="100" r="13" fill="#7DD8FF" opacity={0.7} />
      {/* Feet */}
      <Path d="M74 214 L66 228 M74 214 L74 228 M74 214 L82 228" stroke="#0090CC" strokeWidth="6" strokeLinecap="round" />
      <Path d="M126 214 L118 228 M126 214 L126 228 M126 214 L134 228" stroke="#0090CC" strokeWidth="6" strokeLinecap="round" />
    </Svg>
  );
}

// ─── Export map ──────────────────────────────────────────────────────────────
export const CHARACTER_SVG_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  panda:    PandaSVG,
  fox:      FoxSVG,
  owl:      OwlSVG,
  bunny:    BunnySVG,
  elephant: ElephantSVG,
  tiger:    TigerSVG,
  bird:     BirdSVG,
};

export const FEED_ANIMAL_SVG_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  rabbit: RabbitSVG,
  cat: CatSVG,
  elephant: ElephantSVG,
  panda: PandaSVG,
  bear: BearSVG,
};
