import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardEvent,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions as useRealWindowDimensions,
} from 'react-native';
import { EdgeInsets, SafeAreaInsetsContext } from 'react-native-safe-area-context';

// The app is landscape-only (see CLAUDE.md → Orientation), but since iPadOS
// 26 an iPad can ignore that and run it in portrait — which is how App Review
// saw it. Every screen is designed for landscape, so rather than giving each
// one a second portrait layout, portrait renders the whole app inside a
// landscape-shaped box: full width, as tall as the device's own landscape
// aspect (820x1180 iPad → 820x570), centred, at real size.
//
// Real size, never a scale transform: drag, paint and brush code mixes
// pageX/measureInWindow (screen units) with layout units, which only agree
// when nothing is scaled.
//
// In landscape this is a pass-through: same real dimensions, same insets,
// layout-neutral flex:1 wrappers. The element tree is identical in both
// orientations so rotating never remounts (and resets) the current screen.

type Size = { width: number; height: number };

const ViewportContext = createContext<Size | null>(null);

/** Drop-in for react-native's useWindowDimensions. Every screen must use
 *  this one: in portrait it reports the landscape box, not the window. */
export function useWindowDimensions() {
  const real = useRealWindowDimensions();
  const box = useContext(ViewportContext);
  return box ? { ...real, width: box.width, height: box.height } : real;
}

const ZERO_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const BAND_COLOR = '#2D1B69';
const KEYBOARD_GAP = 12;
// Landscape: how much of what sits under the focused field (its submit button) to keep in view too.
const KEYBOARD_ROOM_BELOW = 76;

export default function PortraitFallback({ children }: { children: React.ReactNode }) {
  const windowSize = useRealWindowDimensions();
  const realInsets = useContext(SafeAreaInsetsContext);

  // In landscape, report the root view's measured size rather than the
  // window metrics. Some Android phones (seen on a Xiaomi) report a window
  // ~80dp narrower than what the app actually draws into — the hidden nav
  // bar / cutout strip is excluded from the metrics but not from the view —
  // so anything positioned from `width` stopped short of the right edge
  // (CookingGame's kitchen left a bare strip there). Until the first layout
  // arrives, fall back to the window size.
  const [measured, setMeasured] = useState<Size | null>(null);
  const onRootLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w <= 0 || h <= 0) return;
    const next = { width: Math.round(w), height: Math.round(h) };
    setMeasured(prev => {
      if (!prev || prev.width !== next.width) return next;
      // Same width, shorter: Android's adjustResize shrinking the root for
      // the keyboard. Screens size themselves off the full height, not the
      // sliver above the keyboard (the window metrics never shrank either).
      return next.height > prev.height ? next : prev;
    });
  };

  // Portrait or landscape is decided from that measured view too, never from the window metrics
  // alone. On Android with a non-default system font size, MainApplication's fontScale override
  // freezes the metrics at whatever orientation the app launched in: a Galaxy S25 Ultra started
  // while held upright reported a portrait window (411x891) while drawing landscape, so the first
  // re-measure (opening the keyboard) dropped the whole app into the portrait box in a corner.
  const { width, height } = measured ?? windowSize;
  const portrait = height > width;
  const landscapeSize = portrait ? null : measured;

  const boxW = width;
  const boxH = Math.round((width * width) / height);
  const boxTop = Math.max(0, Math.round((height - boxH) / 2));

  // Screens' own KeyboardAvoidingViews measure from their local frame, so
  // inside the box they never see a keyboard coming up from the bottom of
  // the real screen. Lift the whole box clear of it instead.
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  useEffect(() => {
    if (!portrait) return;
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(show, (e: KeyboardEvent) => setKeyboardTop(e.endCoordinates.screenY));
    const b = Keyboard.addListener(hide, () => setKeyboardTop(null));
    return () => { a.remove(); b.remove(); setKeyboardTop(null); };
  }, [portrait]);
  const lift = portrait && keyboardTop != null
    ? Math.min(boxTop, Math.max(0, boxTop + boxH + KEYBOARD_GAP - keyboardTop))
    : 0;

  // Landscape: nothing moves the app for the keyboard by itself. Android draws edge-to-edge
  // (edgeToEdgeEnabled), where adjustResize does nothing, and a phone's landscape keyboard covers
  // two thirds of the screen, so it sat right over the field being typed in (AccountSetup's code
  // on a Galaxy S25 Ultra). Shift the whole app up just far enough to show the focused field and
  // the button under it. Re-checked while the keyboard is up, so moving to another field follows.
  const [inputLift, setInputLift] = useState(0);
  const inputLiftRef = useRef(0);
  useEffect(() => {
    if (portrait) return;
    let kbTop: number | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    const apply = (next: number) => {
      const v = Math.round(next);
      if (v === inputLiftRef.current) return;
      inputLiftRef.current = v;
      setInputLift(v);
    };
    const update = () => {
      const input = TextInput.State.currentlyFocusedInput();
      if (kbTop == null || !input) { apply(0); return; }
      input.measureInWindow((_x, y, _w, h) => {
        if (kbTop == null || !(h > 0)) return;
        const top = y + inputLiftRef.current; // where the field sits with no lift
        const wanted = top + h + KEYBOARD_ROOM_BELOW - kbTop;
        apply(Math.max(0, Math.min(wanted, top - KEYBOARD_GAP)));
      });
    };
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(show, (e: KeyboardEvent) => {
      kbTop = e.endCoordinates.screenY;
      update();
      if (!poll) poll = setInterval(update, 300);
    });
    const b = Keyboard.addListener(hide, () => {
      kbTop = null;
      if (poll) clearInterval(poll);
      poll = null;
      apply(0);
    });
    return () => { a.remove(); b.remove(); if (poll) clearInterval(poll); apply(0); };
  }, [portrait]);

  return (
    <View style={[styles.fill, portrait && styles.band]} onLayout={onRootLayout}>
      <View
        style={portrait
          ? { position: 'absolute', left: 0, top: boxTop - lift, width: boxW, height: boxH, overflow: 'hidden' }
          : [styles.fill, inputLift > 0 && { top: -inputLift }]}
      >
        <ViewportContext.Provider value={portrait ? { width: boxW, height: boxH } : landscapeSize}>
          {/* The box sits in the middle of the screen, clear of the status
              bar and home indicator, so nothing inside should pad for them. */}
          <SafeAreaInsetsContext.Provider value={portrait ? ZERO_INSETS : realInsets}>
            {children}
          </SafeAreaInsetsContext.Provider>
        </ViewportContext.Provider>
      </View>
      {portrait && lift === 0 && (
        <RotateHint top={boxTop + boxH} height={height - boxTop - boxH} />
      )}
    </View>
  );
}

/** A small device outline tipping onto its side, in the band under the box,
 *  so a parent knows the app is meant to be held the other way. */
function RotateHint({ top, height }: { top: number; height: number }) {
  const turn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(turn, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.delay(1200),
        Animated.timing(turn, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [turn]);

  if (height < 90) return null;
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-90deg'] });
  return (
    <View style={[styles.hint, { top, height }]} pointerEvents="none">
      <Animated.View style={[styles.device, { transform: [{ rotate }] }]}>
        <View style={styles.deviceButton} />
      </Animated.View>
      <Text style={styles.hintText}>دستگاه را بچرخانید</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  band: { backgroundColor: BAND_COLOR },
  hint: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', gap: 14 },
  device: {
    width: 34, height: 52, borderRadius: 8, borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4,
  },
  deviceButton: { width: 8, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)' },
  hintText: { color: 'rgba(255,255,255,0.75)', fontSize: 15, fontFamily: 'Vazirmatn_700Bold' },
});
