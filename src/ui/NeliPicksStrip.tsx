// Small cream line shown at the start of a game when Muse Spark picked
// today's practice words ("Neli remembers"). Pictures only for the child
// plus this one short line; no other text.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { dir, ff } from '../theme/fonts';

export default function NeliPicksStrip({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={[styles.text, dir('fa')]} numberOfLines={1}>امروز نلی اینا رو برات انتخاب کرده</Text>
      <View style={styles.pics}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFF6D8',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: 'rgba(45,27,105,0.30)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 5,
  },
  text: { fontFamily: ff('fa', 'black'), color: '#1E1B4B', fontSize: 13 },
  pics: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
