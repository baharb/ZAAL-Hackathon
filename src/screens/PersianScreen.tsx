import React, { useContext } from 'react';
import { Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TopBar from '../components/TopBar';
import { neliWorldAssets } from '../assets/neliWorldAssets';
import { AppContext } from '../store/AppContext';
import { useNav } from '../store/NavContext';
import { C } from '../theme/colors';
import { dir, ff } from '../theme/fonts';
import { useResponsive } from '../theme/responsive';

type Section = {
  id: string;
  en: string;
  fa: string;
  descEn: string;
  descFa: string;
  color: string;
  accent: string;
  kind: 'story' | 'nowruz' | 'party' | 'food' | 'art' | 'poet' | 'song';
};

const SECTIONS: Section[] = [
  { id: 'culture', en: 'Persian Stories', fa: 'داستان‌های ایرانی', descEn: 'Heroes and gentle stories', descFa: 'قهرمان‌ها و قصه‌های نرم', color: '#6C4EFF', accent: '#FACC15', kind: 'story' },
  { id: 'nowruz', en: 'Nowruz', fa: 'نوروز', descEn: 'Spring, sabzeh, and Haft-Sin', descFa: 'بهار، سبزه و هفت‌سین', color: '#22C55E', accent: '#EC4899', kind: 'nowruz' },
  { id: 'celebrations', en: 'Celebrations', fa: 'جشن‌ها', descEn: 'Happy family traditions', descFa: 'رسم‌های شاد خانوادگی', color: '#FB923C', accent: '#FACC15', kind: 'party' },
  { id: 'iranfood', en: 'Persian Food', fa: 'غذای ایرانی', descEn: 'Taste words and kitchen play', descFa: 'کلمه‌های خوشمزه', color: '#F97316', accent: '#22C55E', kind: 'food' },
  { id: 'iranart', en: 'Persian Art', fa: 'هنر ایرانی', descEn: 'Color, pattern, and craft', descFa: 'رنگ، نقش و هنر', color: '#EC4899', accent: '#38BDF8', kind: 'art' },
  { id: 'poets', en: 'Great Poets', fa: 'شاعران بزرگ', descEn: 'Simple poetry for children', descFa: 'شعر ساده برای کودک', color: '#A855F7', accent: '#FDE68A', kind: 'poet' },
  { id: 'songs', en: 'Persian Songs', fa: 'آهنگ‌های فارسی', descEn: 'Sing, listen, and repeat', descFa: 'بخوان، گوش کن و تکرار کن', color: '#38BDF8', accent: '#6C4EFF', kind: 'song' },
];

function CultureArt({ item }: { item: Section }) {
  if (item.kind === 'food') {
    return (
      <ImageBackground source={neliWorldAssets.rooms.kitchenWide} style={styles.art} imageStyle={styles.artImage}>
        <Image source={neliWorldAssets.persianFoods.sabziPolo} style={styles.assetLarge} resizeMode="contain" />
      </ImageBackground>
    );
  }
  if (item.kind === 'nowruz') {
    return (
      <ImageBackground source={neliWorldAssets.rooms.gardenWide} style={styles.art} imageStyle={styles.artImage}>
        <Image source={neliWorldAssets.persianFoods.sabziPolo} style={styles.assetLarge} resizeMode="contain" />
        <Image source={neliWorldAssets.foods.apple} style={styles.assetTiny} resizeMode="contain" />
      </ImageBackground>
    );
  }
  if (item.kind === 'song') {
    return <View style={[styles.art, { backgroundColor: '#DFF8FF' }]}><Image source={neliWorldAssets.ui.voice} style={styles.assetLarge} resizeMode="contain" /></View>;
  }
  if (item.kind === 'poet' || item.kind === 'story') {
    return <View style={[styles.art, { backgroundColor: '#EFE7FF' }]}><Image source={neliWorldAssets.ui.book} style={styles.assetLarge} resizeMode="contain" /></View>;
  }
  if (item.kind === 'art') {
    return <View style={[styles.art, { backgroundColor: '#FFE8F4' }]}><Image source={neliWorldAssets.ui.paintbrush} style={styles.assetLarge} resizeMode="contain" /></View>;
  }
  if (item.kind === 'party') {
    return <View style={[styles.art, { backgroundColor: '#FFF0C7' }]}><Image source={neliWorldAssets.ui.star} style={styles.assetLarge} resizeMode="contain" /></View>;
  }
  if (item.kind === 'food') return <View style={styles.art}><View style={styles.plate} /><View style={[styles.food, { backgroundColor: item.color }]} /><View style={[styles.herb, { backgroundColor: item.accent }]} /></View>;
  if (item.kind === 'nowruz') return <View style={styles.art}><View style={[styles.table, { backgroundColor: item.accent }]} /><View style={[styles.sabzeh, { backgroundColor: item.color }]} /><View style={[styles.egg, { backgroundColor: '#EC4899', left: 44 }]} /><View style={[styles.egg, { backgroundColor: '#38BDF8', right: 44 }]} /></View>;
  if (item.kind === 'art') return <View style={styles.art}>{[item.color, item.accent, '#FACC15', '#22C55E'].map((c, i) => <View key={c} style={[styles.patternDot, { backgroundColor: c, left: 38 + (i % 2) * 38, top: 24 + Math.floor(i / 2) * 38 }]} />)}</View>;
  if (item.kind === 'song') return <View style={styles.art}><View style={[styles.noteStem, { backgroundColor: item.color }]} /><View style={[styles.noteDot, { backgroundColor: item.color }]} /><View style={[styles.noteDotSmall, { backgroundColor: item.accent }]} /></View>;
  if (item.kind === 'party') return <View style={styles.art}><View style={[styles.banner, { backgroundColor: item.color }]} /><View style={[styles.balloon, { backgroundColor: item.accent }]} /></View>;
  return <View style={styles.art}><View style={[styles.book, { backgroundColor: item.color }]} /><View style={[styles.sun, { backgroundColor: item.accent }]} /></View>;
}

export default function PersianScreen() {
  const { navigate } = useNav();
  const { lang } = useContext(AppContext);
  const responsive = useResponsive();
  const isFa = lang === 'fa' || lang === 'ar';
  const twoColumn = responsive.contentWidth >= 760;
  const cardW = twoColumn
    ? (responsive.contentWidth - responsive.horizontalPadding * 2 - 12) / 2
    : undefined;

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#35217E' }]} />
      <TopBar title="Persian Culture" titleFa="فرهنگ ایرانی" dark />
      <ScrollView contentContainerStyle={[styles.list, { paddingHorizontal: responsive.horizontalPadding }, twoColumn && styles.listGrid]} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={[styles.kicker, { fontFamily: ff(lang, 'bold') }, dir(lang)]}>{isFa ? 'فارسی فقط کلمه نیست' : 'Persian is more than words'}</Text>
          <Text style={[styles.pageTitle, { fontFamily: ff(lang, 'black') }, dir(lang)]}>{isFa ? 'فرهنگ، قصه و آهنگ' : 'Culture, stories, and songs'}</Text>
          <Text style={[styles.pageSub, { fontFamily: ff(lang, 'regular') }, dir(lang)]}>{isFa ? 'یک دنیای گرم خانوادگی برای بچه‌های فارسی‌زبان.' : 'A warm family world for Persian children.'}</Text>
        </View>
        {SECTIONS.map(item => (
          <TouchableOpacity key={item.id} onPress={() => navigate({ name: 'Section', id: item.id })} activeOpacity={0.88} style={[styles.card, twoColumn && { width: cardW }]}>
            <View style={[styles.thumb, { backgroundColor: item.color + '22' }]}>
              <CultureArt item={item} />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.lbl, { fontFamily: ff(lang, 'black') }, dir(lang)]}>{isFa ? item.fa : item.en}</Text>
              <Text style={[styles.desc, { fontFamily: ff(lang, 'regular') }, dir(lang)]}>{isFa ? item.descFa : item.descEn}</Text>
            </View>
            <Text style={styles.arrow}>{'>'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#35217E' },
  list: { paddingHorizontal: 14, paddingBottom: 34, gap: 12 },
  listGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  hero: { borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.94)', padding: 20 },
  kicker: { color: C.purple, fontSize: 13, marginBottom: 7 },
  pageTitle: { color: C.textDark, fontSize: 28, lineHeight: 36 },
  pageSub: { color: C.textMid, fontSize: 14, lineHeight: 21, marginTop: 5 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 28, backgroundColor: '#FFFFFF', padding: 12 },
  thumb: { width: 92, height: 92, borderRadius: 24, overflow: 'hidden' },
  copy: { flex: 1 },
  lbl: { color: C.textDark, fontSize: 18 },
  desc: { color: C.textMid, fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  arrow: { fontFamily: ff('fa', 'black'), color: C.purple, fontSize: 22 },
  art: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  artImage: { width: '100%', height: '100%' },
  assetLarge: { width: 72, height: 72 },
  assetTiny: { position: 'absolute', right: 12, bottom: 10, width: 34, height: 34 },
  plate: { width: 62, height: 46, borderRadius: 23, backgroundColor: '#FFFFFF' },
  food: { position: 'absolute', width: 34, height: 28, borderRadius: 14 },
  herb: { position: 'absolute', right: 26, top: 28, width: 16, height: 16, borderRadius: 8 },
  table: { position: 'absolute', bottom: 25, width: 72, height: 10, borderRadius: 5 },
  sabzeh: { width: 38, height: 32, borderRadius: 12 },
  egg: { position: 'absolute', bottom: 35, width: 17, height: 24, borderRadius: 12 },
  patternDot: { position: 'absolute', width: 24, height: 24, borderRadius: 12 },
  noteStem: { width: 12, height: 60, borderRadius: 6 },
  noteDot: { position: 'absolute', bottom: 20, left: 28, width: 32, height: 32, borderRadius: 16 },
  noteDotSmall: { position: 'absolute', top: 24, right: 28, width: 20, height: 20, borderRadius: 10 },
  banner: { width: 70, height: 28, borderRadius: 14 },
  balloon: { position: 'absolute', bottom: 20, width: 34, height: 42, borderRadius: 18 },
  book: { width: 54, height: 62, borderRadius: 12 },
  sun: { position: 'absolute', right: 25, top: 23, width: 26, height: 26, borderRadius: 13 },
});
