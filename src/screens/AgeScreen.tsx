import React, { useContext, useRef, useState } from 'react';
import { Animated, Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import LangBar from '../components/LangBar';
import CharacterAvatar from '../components/CharacterAvatar';
import { neliWorldAssets } from '../assets/neliWorldAssets';
import { AppContext } from '../store/AppContext';
import { useNav } from '../store/NavContext';
import { dir, ff } from '../theme/fonts';
import { useResponsive } from '../theme/responsive';

const AGE_GROUPS = [
  { range: [0, 2], label: '0-2', labelFa: '۰-۲', title: 'Baby World', titleFa: 'دنیای کودک', desc: 'Soft sounds and first words', descFa: 'صداهای آرام و اولین کلمات', color: '#69D2FF', room: neliWorldAssets.rooms.bedroomWide, art: neliWorldAssets.characters.neli },
  { range: [2, 4], label: '2-4', labelFa: '۲-۴', title: 'Tiny Explorer', titleFa: 'کاوشگر کوچولو', desc: 'Tap, listen, and repeat', descFa: 'لمس کن، گوش بده، تکرار کن', color: '#FF8FC7', room: neliWorldAssets.rooms.gardenWide, art: neliWorldAssets.animals.rabbit },
  { range: [5, 6], label: '5-6', labelFa: '۵-۶', title: 'Little Learner', titleFa: 'یادگیرنده کوچک', desc: 'Letters, words, and games', descFa: 'حروف، کلمه ها و بازی', color: '#FFD764', room: neliWorldAssets.rooms.bedroomWide, art: neliWorldAssets.ui.book },
  { range: [7, 9], label: '7-9', labelFa: '۷-۹', title: 'Super Student', titleFa: 'دانش آموز قهرمان', desc: 'Phrases and challenges', descFa: 'جمله ها و چالش ها', color: '#57D68D', room: neliWorldAssets.rooms.bedroomWide, art: neliWorldAssets.ui.trophy },
  { range: [10, 12], label: '10-12', labelFa: '۱۰-۱۲', title: 'Persian Star', titleFa: 'ستاره فارسی', desc: 'Culture, stories, and practice', descFa: 'فرهنگ، داستان و تمرین', color: '#A98BFF', room: neliWorldAssets.rooms.kitchenWide, art: neliWorldAssets.persianFoods.sabziPolo },
];

export default function AgeScreen() {
  const { navigate } = useNav();
  const { setAge, lang } = useContext(AppContext);
  const [sel, setSel] = useState<number | null>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isLandscape, isTablet, horizontalPadding, contentWidth } = useResponsive();
  const ui = Math.min(width / 390, height / 844);
  const scales = AGE_GROUPS.map(() => useRef(new Animated.Value(1)).current);
  const isFa = lang === 'fa' || lang === 'ar';
  const twoColumn = isLandscape || isTablet;
  const cardW = twoColumn ? Math.min((contentWidth - horizontalPadding * 2 - 12) / 2, 440) : undefined;

  const pick = (idx: number, midAge: number) => {
    setSel(idx);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(scales[idx], { toValue: 0.96, useNativeDriver: true }),
      Animated.spring(scales[idx], { toValue: 1.03, useNativeDriver: true }),
      Animated.spring(scales[idx], { toValue: 1, useNativeDriver: true }),
    ]).start();
    setAge(midAge);
    setTimeout(() => navigate(midAge <= 2 ? { name: 'BabyWorld' } : { name: 'Main' }), 420);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingHorizontal: horizontalPadding, paddingTop: insets.top + (isLandscape ? 10 : Math.max(12, Math.round(18 * ui))), paddingBottom: Math.max(12, Math.round(18 * ui)), gap: Math.max(10, Math.round(12 * ui)) }, isLandscape && styles.headerLandscape]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.brand, { fontFamily: ff(lang, 'bold'), fontSize: Math.max(12, Math.round(14 * ui)), marginBottom: Math.max(6, Math.round(8 * ui)) }]}>ZAAL</Text>
          <Text style={[styles.question, { fontFamily: ff(lang, 'black'), fontSize: Math.max(25, Math.round(31 * ui)), lineHeight: Math.max(30, Math.round(38 * ui)) }, dir(lang)]}>
            {isFa ? 'سن کودک را انتخاب کن' : "Choose your child's age"}
          </Text>
          <Text style={[styles.sub, { fontFamily: ff(lang, 'regular'), fontSize: Math.max(12, Math.round(14 * ui)), lineHeight: Math.max(18, Math.round(21 * ui)), marginTop: Math.max(5, Math.round(7 * ui)), maxWidth: Math.min(340, width * 0.72) }, dir(lang)]}>
            {isFa ? 'برنامه بر اساس سن ساده تر یا چالشی تر می شود.' : 'The app becomes simpler or more challenging by age.'}
          </Text>
        </View>
        <LangBar />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }, twoColumn && styles.scrollGrid]} showsVerticalScrollIndicator={false}>
        {AGE_GROUPS.map((g, i) => {
          const active = sel === i;
          return (
            <Animated.View key={g.label} style={[twoColumn && { width: cardW }, { transform: [{ scale: scales[i] }] }]}>
              <TouchableOpacity onPress={() => pick(i, Math.round((g.range[0] + g.range[1]) / 2))} activeOpacity={0.88} style={[styles.card, active && styles.cardActive]}>
                <ImageBackground source={g.room} style={styles.cardScene} imageStyle={styles.cardSceneImage}>
                  <View style={[styles.ageBadge, { backgroundColor: g.color, minWidth: Math.max(64, Math.round(72 * ui)), height: Math.max(48, Math.round(54 * ui)), borderRadius: Math.max(20, Math.round(22 * ui)), paddingHorizontal: Math.max(8, Math.round(10 * ui)) }]}>
                    <Text style={[styles.ageTxt, { fontFamily: ff(lang, 'black'), fontSize: Math.max(18, Math.round(20 * ui)) }]}>{isFa ? g.labelFa : g.label}</Text>
                  </View>
                    {i === 0 ? (
                      <CharacterAvatar characterId="neli" size={Math.max(108, Math.round(120 * ui))} floating={false} style={styles.neliArt} />
                    ) : (
                      <Image source={g.art} style={[styles.cardArt, { width: Math.max(96, Math.round(112 * ui)), height: Math.max(96, Math.round(112 * ui)) }]} resizeMode="contain" />
                    )}
                  {active ? <Image source={neliWorldAssets.ui.ok} style={[styles.checkIcon, { width: Math.max(48, Math.round(56 * ui)), height: Math.max(48, Math.round(56 * ui)) }]} resizeMode="contain" /> : null}
                </ImageBackground>
                <View style={[styles.copy, { padding: Math.max(12, Math.round(14 * ui)) }]}>
                  <Text style={[styles.cardTitle, { fontFamily: ff(lang, 'black'), fontSize: Math.max(17, Math.round(19 * ui)) }, dir(lang)]}>{isFa ? g.titleFa : g.title}</Text>
                  <Text style={[styles.cardDesc, { fontFamily: ff(lang, 'regular'), fontSize: Math.max(11, Math.round(12.5 * ui)), lineHeight: Math.max(16, Math.round(18 * ui)) }, dir(lang)]}>{isFa ? g.descFa : g.desc}</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
        <Text style={[styles.note, { fontFamily: ff(lang, 'regular') }, dir(lang)]}>
          {isFa ? 'بعدا از پنل والدین می توانی تغییرش بدهی.' : 'You can change this later in the parent area.'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#24105A' },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingBottom: 18, gap: 12 },
  headerLandscape: { paddingBottom: 12 },
  brand: { color: 'rgba(255,255,255,0.72)', fontSize: 14, fontWeight: '900', marginBottom: 8 },
  question: { color: '#FFFFFF', fontSize: 31, lineHeight: 38, fontWeight: '900' },
  sub: { color: 'rgba(255,255,255,0.76)', fontSize: 14, lineHeight: 21, marginTop: 7, maxWidth: 340 },
  scroll: { paddingTop: 4, paddingBottom: 34, gap: 12 },
  scrollGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  card: { borderRadius: 28, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 6, borderColor: '#FFFFFF' },
  cardActive: { borderColor: '#FFE57A' },
  cardScene: { height: 150, overflow: 'hidden' },
  cardSceneImage: { width: '100%', height: '100%' },
  ageBadge: { position: 'absolute', top: 10, left: 10, minWidth: 72, height: 54, borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderWidth: 3, borderColor: '#FFFFFF', zIndex: 3 },
  ageTxt: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  cardArt: { position: 'absolute', right: 16, bottom: 8, width: 112, height: 112 },
  neliArt: { position: 'absolute', right: 10, bottom: -14, width: 120, height: 150 },
  checkIcon: { position: 'absolute', right: 10, top: 10, width: 56, height: 56 },
  copy: { padding: 14 },
  cardTitle: { color: '#221044', fontSize: 19, fontWeight: '900' },
  cardDesc: { color: '#6E6384', fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  note: { color: 'rgba(255,255,255,0.72)', textAlign: 'center', fontSize: 12.5, marginTop: 6 },
});
