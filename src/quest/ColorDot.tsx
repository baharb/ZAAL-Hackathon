// One bold color button for kids: the exact recorded hue, a darker ring
// of the same hue, and a white gloss spot. Used everywhere a color is
// shown (picks, drive options, back window), so colors look sharp and
// attractive without ever shifting the hue the voice names.

import React from 'react';
import { View } from 'react-native';
import { COLOR_HEX, darkenHex } from './pickLists';

export default function ColorDot({ id, size }: { id: string; size: number }) {
  const hex = COLOR_HEX[id] ?? '#CCCCCC';
  const ring = Math.max(3, size * 0.08);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: hex,
          borderWidth: ring,
          borderColor: darkenHex(hex),
          overflow: 'hidden',
        }}
        accessibilityLabel={id}
      >
        <View
          style={{
            position: 'absolute',
            left: size * 0.18,
            top: size * 0.1,
            width: size * 0.34,
            height: size * 0.2,
            borderRadius: size * 0.12,
            backgroundColor: '#FFFFFF',
            opacity: 0.6,
            transform: [{ rotate: '-25deg' }],
          }}
          pointerEvents="none"
        />
      </View>
    </View>
  );
}
