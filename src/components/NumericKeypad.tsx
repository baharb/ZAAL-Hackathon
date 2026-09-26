import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ff } from '../theme/fonts';

type Props = {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  keyColor?: string;
  keyTextColor?: string;
  /** Diameter of each key. 68 is the design size; short screens pass less. */
  keySize?: number;
  gap?: number;
};

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'back'],
];

export default function NumericKeypad({ onDigit, onBackspace, keyColor = 'rgba(255,255,255,0.14)', keyTextColor = '#FFFFFF', keySize = 68, gap = 12 }: Props) {
  const keyBox = { width: keySize, height: keySize, borderRadius: keySize / 2 };
  const press = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === 'back') onBackspace();
    else if (key) onDigit(key);
  };

  return (
    <View style={[styles.grid, { gap }]}>
      {ROWS.map((row, r) => (
        <View key={r} style={[styles.row, { gap }]}>
          {row.map((key, c) => {
            if (!key) return <View key={c} style={[styles.key, keyBox]} />;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.key, keyBox, { backgroundColor: keyColor }]}
                activeOpacity={0.7}
                onPress={() => press(key)}
              >
                {key === 'back' ? (
                  <Text style={[styles.keyText, { color: keyTextColor, fontSize: Math.round(20 * keySize / 68) }]}>⌫</Text>
                ) : (
                  <Text style={[styles.keyText, { color: keyTextColor, fontFamily: ff('en', 'black'), fontSize: Math.round(24 * keySize / 68) }]}>{key}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  key: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 24 },
});
