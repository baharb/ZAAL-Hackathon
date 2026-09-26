import React, { useRef, useState } from 'react';
import { Animated, Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { neliWorldAssets } from '../assets/neliWorldAssets';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { Lang } from '../store/AppContext';
import { dir, ff } from '../theme/fonts';
import NumericKeypad from './NumericKeypad';
import PinCircles from './PinCircles';

interface Props {
  iconSource?: ImageSourcePropType;
  iconEmoji?: string;
  iconBg?: string;
  iconTint?: string;
  iconRound?: boolean;
  lang: Lang;
  title: string;
  subtitle: string;
  errorText: string;
  onVerify: (password: string) => boolean;
  onSuccess: () => void;
  onClose: () => void;
  /** Both must be given together to show the link — omit to keep a gate (e.g. Premium) without one. */
  forgotPasswordLabel?: string;
  onForgotPassword?: () => void;
}

const PIN_LENGTH = 4;
const KEY_GAP = 12;
const CARD_PAD_V = 20;

// Shared visual shell for any "confirm the parent password before X" flow —
// currently used by Settings and by Premium. Keeping the card, blobs and PIN
// entry in one place means every password gate in the app looks and behaves
// the same, and a future one is just a few lines of copy plugged in here.
// `lang` follows the parent's chosen settings language so this always reads
// in whatever language they last picked.
//
// PIN entry is the in-app keypad (same as TimeUpScreen), not a TextInput.
// On a landscape phone Android swaps the whole screen for its full-screen
// text-entry mode the moment a TextInput focuses, and even without that the
// system number pad covers the card — there is no layout of a centred card
// and a keyboard that both fit in ~400pt of height. The keypad sits beside
// the copy instead, and the PIN submits on its fourth digit.
export default function PasswordGate({
  iconSource, iconEmoji, iconBg, iconTint, iconRound, lang, title, subtitle, errorText, onVerify, onSuccess, onClose,
  forgotPasswordLabel, onForgotPassword,
}: Props) {
  const { height } = useWindowDimensions();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const shake = useRef(new Animated.Value(0)).current;
  const textDir = dir(lang);

  // Four rows of keys are the tallest thing on the card; size them to the
  // screen (68pt on a tablet, the design size) and let the rest follow.
  const keySize = Math.round(Math.max(44, Math.min(68, (height - 32 - 2 * CARD_PAD_V - 3 * KEY_GAP) / 4)));
  const k = keySize / 68;
  const iconSize = Math.round(88 * k);

  const runShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const onDigit = (d: string) => {
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + d;
    setError('');
    setPin(next);
    if (next.length === PIN_LENGTH) {
      // Let the fourth dot fill before the screen changes or shakes.
      setTimeout(() => {
        if (onVerify(next)) {
          setPin('');
          onSuccess();
        } else {
          setError(errorText);
          setPin('');
          runShake();
        }
      }, 120);
    }
  };

  const onBackspace = () => {
    setError('');
    setPin(p => p.slice(0, -1));
  };

  return (
    <View style={styles.root}>
      <View style={styles.blobOne} />
      <View style={styles.blobTwo} />
      <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Image source={neliWorldAssets.ui.close} style={styles.closeIcon} resizeMode="contain" />
      </TouchableOpacity>
      <View style={styles.card}>
        <View style={styles.copyColumn}>
          <View
            style={[
              styles.iconCircle,
              { width: iconSize, height: iconSize, borderRadius: iconRound ? iconSize / 2 : Math.round(30 * k) },
              iconBg ? { backgroundColor: iconBg } : null,
            ]}
          >
            {iconSource ? (
              <Image
                source={iconSource}
                style={[{ width: Math.round(68 * k), height: Math.round(68 * k) }, iconTint ? { tintColor: iconTint } : null]}
                resizeMode="contain"
              />
            ) : (
              <Text style={{ fontSize: Math.round(44 * k) }}>{iconEmoji}</Text>
            )}
          </View>
          <Text style={[styles.title, { fontFamily: ff(lang, 'black'), fontSize: Math.round(Math.max(22, 28 * k)) }, textDir, styles.centerText]}>{title}</Text>
          <Text style={[styles.subtitle, { fontFamily: ff(lang, 'regular') }, textDir, styles.centerText]}>{subtitle}</Text>
          <Animated.View style={[styles.pinRow, { transform: [{ translateX: shake }] }]}>
            <PinCircles length={pin.length} total={PIN_LENGTH} filledColor="#2D1B69" emptyColor="rgba(45,27,105,0.28)" />
          </Animated.View>
          <Text style={[styles.error, { fontFamily: ff(lang, 'bold') }, styles.centerText]}>{error || ' '}</Text>
          {forgotPasswordLabel && onForgotPassword && (
            <TouchableOpacity onPress={onForgotPassword} activeOpacity={0.7} style={styles.forgotRow}>
              <Text style={[styles.forgotText, { fontFamily: ff(lang, 'bold') }]}>{forgotPasswordLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
        <NumericKeypad
          onDigit={onDigit}
          onBackspace={onBackspace}
          keySize={keySize}
          gap={KEY_GAP}
          keyColor="#F3F0F8"
          keyTextColor="#2D1B69"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2D1B69', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  blobOne: { position: 'absolute', width: 420, height: 420, borderRadius: 210, backgroundColor: '#6549C7', top: -190, right: -80 },
  blobTwo: { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: '#FF9D45', bottom: -230, left: -80 },
  closeButton: { position: 'absolute', top: 12, left: 12, width: 62, height: 62, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  closeIcon: { width: 58, height: 58 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 32, maxWidth: '84%',
    backgroundColor: '#FFFFFF', borderRadius: 32, paddingHorizontal: 32, paddingVertical: CARD_PAD_V,
    borderWidth: 6, borderColor: 'rgba(255,255,255,0.68)',
    elevation: 12, shadowColor: '#0C0623', shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 12 },
  },
  copyColumn: { width: 300, flexShrink: 1, alignItems: 'center' },
  iconCircle: { backgroundColor: '#FFF0C8', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  title: { color: '#2D1B69' },
  subtitle: { color: '#74668F', fontSize: 14, lineHeight: 23, marginTop: 5 },
  centerText: { textAlign: 'center' },
  pinRow: { marginTop: 18 },
  error: { color: '#D73737', marginTop: 10, fontSize: 12 },
  forgotRow: { marginTop: 8 },
  forgotText: { color: '#6B21A8', textAlign: 'center', fontSize: 13 },
});
