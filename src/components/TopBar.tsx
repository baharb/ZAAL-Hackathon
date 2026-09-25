import React, { useContext } from 'react';
import { Image, View, Text, TouchableOpacity, StyleSheet, PixelRatio } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext, Lang } from '../store/AppContext';
import { useNav } from '../store/NavContext';
import LangBar from './LangBar';
import { ff } from '../theme/fonts';
import { neliWorldAssets } from '../assets/neliWorldAssets';

// Anything that stacks under the bar needs its height, and hard-coding a
// number goes stale the moment the bar becomes responsive — CookingGame had
// `insets.top + 90` pinned, which left a strip of scene showing on phones
// (real height 70) and tucked its tabs under the bar on tablets (~98).
// Same arithmetic as the component below; keep the two in step.
export function topBarHeight(
  screenHeight: number,
  insetsTop: number,
  opts?: { large?: boolean; topInset?: number },
) {
  const large = opts?.large ?? false;
  const topInset = opts?.topInset ?? 0;
  const buttonSize = Math.max(44, Math.min(screenHeight * 0.12, 64));
  const titleSize = large ? Math.max(20, Math.min(screenHeight * 0.078, 40)) : 18;
  const titleSubSize = large ? Math.max(11, Math.min(screenHeight * 0.028, 15)) : 11;
  const padTop = insetsTop + topInset + (large ? Math.max(4, Math.min(screenHeight * 0.022, 16)) : 0);
  const padBottom = large ? Math.max(6, Math.min(screenHeight * 0.032, 18)) : 8;
  return padTop + padBottom + Math.max(buttonSize, titleSize * 1.25 + titleSubSize * 1.3);
}

interface Props {
  title?: string;
  titleFa?: string; titleFr?: string; titleEs?: string;
  titleZh?: string; titleKo?: string; titleAr?: string;
  showBack?: boolean; showClose?: boolean;
  dark?: boolean;
  compactTitle?: boolean;
  large?: boolean;
  topInset?: number;
  onBack?: () => void;
  rightContent?: React.ReactNode;
  displayLang?: Lang;
  showSettingsIcon?: boolean;
  titleIcon?: boolean;
}

export default function TopBar({
  title = '', titleFa, titleFr, titleEs, titleZh, titleKo, titleAr,
  showBack = false, showClose = false, dark = true, compactTitle = false, large = false, topInset = 0, onBack, rightContent,
  displayLang, showSettingsIcon = true, titleIcon = false,
}: Props) {
  const { lang: appLang } = useContext(AppContext);
  const lang = displayLang ?? appLang;
  const { goBack } = useNav();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Sized off `height` (the short dimension while landscape-locked), not
  // `width` — a phone rotated to landscape reports nearly as much width as
  // a tablet, but only a fraction of the vertical space, so a button/title
  // scale tied to width alone renders proportionally oversized on phones.
  // Minimums still respect Apple/Android's ~44pt touch-target guidance.
  const bg       = dark ? '#2D1B69' : '#fff';
  const txtColor = dark ? '#fff' : '#1A0050';
  // These were all `fraction of height` with minimums generous enough that on
  // a landscape phone the minimum always won — so the bar never shrank. It
  // measured 93pt on a 375pt-tall iPhone SE (24.7% of the screen) against
  // 98pt on an 800pt tablet (12.3%). The caps below are unchanged, so tablets
  // render exactly as before; only short screens come down. 44pt stays the
  // floor for the button — that is Apple/Android's touch-target guidance and
  // is not negotiable.
  const buttonSize = PixelRatio.roundToNearestPixel(Math.max(44, Math.min(height * 0.12, 64)));
  const iconSize = PixelRatio.roundToNearestPixel(Math.max(32, Math.min(height * 0.095, 52)));
  const titleSize = large ? Math.max(20, Math.min(height * 0.078, 40)) : 18;
  const titleSubSize = large ? Math.max(11, Math.min(height * 0.028, 15)) : 11;
  // Wide enough for the button it holds plus breathing room, instead of a flat
  // 84pt that wasted horizontal space on phones and could clip on tablets.
  const sideWidth = Math.max(buttonSize + 14, 68);

  const localTitle = (() => {
    if (lang === 'fa' && titleFa) return titleFa;
    if (lang === 'fr' && titleFr) return titleFr;
    if (lang === 'es' && titleEs) return titleEs;
    if (lang === 'zh' && titleZh) return titleZh;
    if (lang === 'ko' && titleKo) return titleKo;
    if (lang === 'ar' && titleAr) return titleAr;
    return title;
  })();

  return (
    <View style={[styles.bar, { backgroundColor: bg, paddingTop: insets.top + topInset + (large ? Math.max(4, Math.min(height * 0.022, 16)) : 0), paddingBottom: large ? Math.max(6, Math.min(height * 0.032, 18)) : 8, paddingHorizontal: Math.max(12, Math.min(width * 0.022, 18)) + Math.max(insets.left, insets.right) }]}>
      {/* Back button — large, bold, pill-shaped */}
      <View style={[styles.side, { width: sideWidth }]}>
        {showClose ? (
          <TouchableOpacity
            onPress={onBack ?? goBack}
            style={[styles.backBtn, { width: buttonSize, height: buttonSize, marginLeft: -4 }]}
            activeOpacity={0.7}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <Image
              source={neliWorldAssets.ui.close}
              style={[styles.navIcon, { width: iconSize, height: iconSize }]}
              resizeMode="contain"
              resizeMethod="resize"
              fadeDuration={0}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Title */}
      <View style={styles.titleWrap}>
        {compactTitle ? (
          <Text style={[styles.titleOnly, { color: txtColor, fontFamily: ff(lang, 'black') }]} numberOfLines={1}>
            {localTitle}
          </Text>
        ) : large ? (
          <>
            <Text style={[styles.titleFa, { color: txtColor, fontFamily: ff('en', 'black'), fontSize: titleSize, letterSpacing: 1.5 }]} numberOfLines={1}>
              {title || localTitle}
            </Text>
            {titleFa ? (
              <Text style={[styles.titleEnSub, { color: txtColor, fontFamily: ff('fa', 'bold'), fontSize: titleSubSize, opacity: 0.82 }]} numberOfLines={1}>
                {titleFa}
              </Text>
            ) : null}
          </>
        ) : titleFa ? (
          <>
            <View style={[styles.titleRow, (lang === 'fa' || lang === 'ar') && styles.titleRowRtl]}>
              {titleIcon ? (
                <Image
                  source={neliWorldAssets.ui.settingsIcon}
                  style={[styles.titleIconImg, { width: titleSize * 1.44, height: titleSize * 1.44, tintColor: txtColor }]}
                  resizeMode="contain"
                />
              ) : null}
              <Text style={[styles.titleFa, { color: txtColor, fontFamily: ff(lang, 'black'), fontSize: titleSize }]} numberOfLines={1}>
                {localTitle}
              </Text>
            </View>
            {title && localTitle !== title ? (
              <Text style={[styles.titleEnSub, { color: txtColor, fontFamily: ff('en', 'regular'), fontSize: titleSubSize }]} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={[styles.titleOnly, { color: txtColor, fontFamily: ff(lang, 'black') }]} numberOfLines={1}>
            {localTitle}
          </Text>
        )}
      </View>

      <View style={[styles.side, { width: sideWidth, alignItems: 'flex-end' }]}>
        <View style={styles.rightRow}>
          {rightContent}
          {showSettingsIcon ? <LangBar dark={dark} buttonSize={buttonSize} iconSize={iconSize} /> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: 8, gap: 6,
  },
  side:      { justifyContent: 'center' },
  rightRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  titleWrap: { flex: 1, alignItems: 'center' },
  titleRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  titleRowRtl: { flexDirection: 'row-reverse' },
  titleIconImg: {},
  titleFa:   { fontSize: 18, textAlign: 'center' },
  titleEnSub:{ fontSize: 11, textAlign: 'center', opacity: 0.55 },
  titleOnly: { fontSize: 18, textAlign: 'center' },

  /* Large pill back button, bold chevron */
  backBtn: {
    alignItems: 'center', justifyContent: 'center',
    zIndex: 5,
  },
  navIcon: { },
});
