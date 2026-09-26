import React, { useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import KidIcon from '../components/KidIcon';
import PinCircles from '../components/PinCircles';
import NumericKeypad from '../components/NumericKeypad';
import { AppContext } from '../store/AppContext';
import { useNav } from '../store/NavContext';
import { ff } from '../theme/fonts';
import { useWindowDimensions } from '../layout/PortraitFallback';

const KEY_GAP = 12;

export default function TimeUpScreen() {
  const { verifySettingsPassword } = useContext(AppContext);
  const { reset } = useNav();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const { height } = useWindowDimensions();
  // Badge, copy, dots and a 4-row keypad stacked in one column were ~560pt
  // tall — more than a landscape phone has. The keypad sits beside the copy
  // now, sized to the screen height (68pt keys on a tablet, as designed).
  const keySize = Math.round(Math.max(44, Math.min(68, (height - 40 - 3 * KEY_GAP) / 4)));
  const badge = Math.round(132 * keySize / 68);

  const runShake = () => {
    setError(true);
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const onDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setError(false);
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => {
        if (verifySettingsPassword(next)) {
          reset({ name: 'Main', tab: 'Profile' });
        } else {
          runShake();
          setPin('');
        }
      }, 120);
    }
  };

  const onBackspace = () => {
    setError(false);
    setPin(p => p.slice(0, -1));
  };

  return (
    <View style={styles.root}>
      <View style={styles.blobOne} />
      <View style={styles.blobTwo} />

      <View style={styles.copyColumn}>
      <View style={[styles.characterBadge, { width: badge, height: badge, borderRadius: Math.round(badge * 0.3) }]}>
        <KidIcon name="profile" size={Math.round(badge * 0.64)} color="#B7A6E8" softColor="#F4F0FF" />
      </View>

      <Text style={[styles.title, { fontFamily: ff('fa', 'black') }]}>زمان بازی امروز تمام شد</Text>
      <Text style={[styles.subtitle, { fontFamily: ff('fa', 'regular') }]}>فردا دوباره می‌توانی بازی کنی. برای ادامه، از یک بزرگ‌تر بخواه رمز والدین را وارد کند.</Text>

      <Animated.View style={{ transform: [{ translateX: shake }] }}>
        <PinCircles length={pin.length} />
      </Animated.View>
      {error ? <Text style={[styles.error, { fontFamily: ff('fa', 'bold') }]}>رمز اشتباه است</Text> : <View style={styles.errorSpacer} />}
      </View>
      <NumericKeypad onDigit={onDigit} onBackspace={onBackspace} keySize={keySize} gap={KEY_GAP} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', gap: 48, backgroundColor: '#2D1B69', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingHorizontal: 24, paddingVertical: 20 },
  copyColumn: { width: 380, flexShrink: 1, alignItems: 'center' },
  blobOne: { position: 'absolute', width: 420, height: 420, borderRadius: 210, backgroundColor: '#6549C7', top: -190, right: -80 },
  blobTwo: { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: '#4B3A9E', bottom: -230, left: -80 },
  characterBadge: { width: 132, height: 132, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { color: '#FFFFFF', fontSize: 24, textAlign: 'center', marginBottom: 8 },
  subtitle: { color: 'rgba(255,255,255,0.72)', fontSize: 13.5, lineHeight: 21, textAlign: 'center', maxWidth: 380, marginBottom: 22 },
  error: { color: '#FF9D9D', fontSize: 12.5, marginTop: 16 },
  errorSpacer: { height: 12.5 * 1.6 + 16 },
});
