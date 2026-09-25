import React, { useContext } from 'react';
import { Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import TopBar from '../components/TopBar';
import CharacterAvatar from '../components/CharacterAvatar';
import { neliWorldAssets } from '../assets/neliWorldAssets';
import { SECTIONS } from '../data/sections';
import { AppContext } from '../store/AppContext';
import { useNav } from '../store/NavContext';
import { dir, ff } from '../theme/fonts';
import { useResponsive } from '../theme/responsive';

const COLORS = ['#62D4FF', '#FFD764', '#52D6A4', '#FF86B7', '#B88CFF', '#FF9A6A'] as const;

function subjectImage(id: string) {
  const map: Record<string, any> = {
    alphabet: neliWorldAssets.ui.book,
    numbers: neliWorldAssets.ui.trophy,
    colors: neliWorldAssets.ui.paintbrush,
    animals: neliWorldAssets.animals.rabbit,
    food: neliWorldAssets.foods.apple,
    vegetables: neliWorldAssets.foods.carrot,
    family: neliWorldAssets.characters.neli,
    shapes: neliWorldAssets.ui.star,
    transport: neliWorldAssets.ui.gamepad,
    school: neliWorldAssets.ui.book,
    sports: neliWorldAssets.ui.play,
    house: neliWorldAssets.rooms.livingRoomWide,
    cooking: neliWorldAssets.kitchen.pan,
    culture: neliWorldAssets.ui.star,
    songs: neliWorldAssets.ui.voice,
    nowruz: neliWorldAssets.persianFoods.sabziPolo,
    poets: neliWorldAssets.ui.book,
  };
  return map[id] ?? neliWorldAssets.ui.book;
}

function SubjectArt({ id }: { id: string }) {
  const source = subjectImage(id);
  if (id === 'house') {
    return (
      <ImageBackground source={source} style={styles.artFull} imageStyle={styles.artImage}>
        <CharacterAvatar characterId="neli" size={104} />
      </ImageBackground>
    );
  }
  return (
    <View style={styles.artFull}>
      <Image source={source} style={id === 'family' ? styles.artNeli : styles.artAsset} resizeMode="contain" />
    </View>
  );
}

export default function SubjectsScreen() {
  const { navigate } = useNav();
  const { lang, completedSections, selectedCharacterId } = useContext(AppContext);
  const { width } = useWindowDimensions();
  const responsive = useResponsive();
  const isFa = lang === 'fa' || lang === 'ar';
  const gap = 12;
  const minCardWidth = 150;
  const columns = Math.max(2, Math.min(4, Math.floor((responsive.contentWidth - responsive.horizontalPadding * 2 + gap) / (minCardWidth + gap))));
  const cardW = (responsive.contentWidth - responsive.horizontalPadding * 2 - gap * (columns - 1)) / columns;

  return (
    <View style={styles.root}>
      <TopBar title="Learn" titleFa="یادگیری" titleFr="Apprendre" titleEs="Aprender" titleAr="تعلم" dark />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: responsive.horizontalPadding }]} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <CharacterAvatar characterId={selectedCharacterId} size={126} />
          <View style={styles.heroCopy}>
            <Text style={[styles.pageTitle, { fontFamily: ff(lang, 'black') }, dir(lang)]}>
              {isFa ? 'چه چیزی یاد بگیریم؟' : 'What should we learn?'}
            </Text>
            <Text style={[styles.pageSub, { fontFamily: ff(lang, 'regular') }, dir(lang)]}>
              {isFa ? 'موضوع های کوتاه با صدا، بازی و تصویر.' : 'Short picture-led topics with sound and play.'}
            </Text>
          </View>
        </View>

        <View style={styles.grid}>
          {SECTIONS.map((s, i) => {
            const done = completedSections?.includes(s.id);
            const color = COLORS[i % COLORS.length];
            return (
              <TouchableOpacity key={s.id} style={[styles.card, { width: cardW, backgroundColor: color }]} onPress={() => navigate({ name: 'Section', id: s.id })} activeOpacity={0.86}>
                <SubjectArt id={s.id} />
                <View style={styles.labelBand}>
                  <Text style={[styles.cardLbl, { fontFamily: ff(lang, 'bold') }, dir(lang)]} numberOfLines={1}>
                    {isFa ? s.labelFa : s.label}
                  </Text>
                </View>
                {done ? <Image source={neliWorldAssets.ui.ok} style={styles.doneBadge} resizeMode="contain" /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#123B7A' },
  scroll: { paddingBottom: 34 },
  hero: { minHeight: 162, borderRadius: 30, marginBottom: 16, padding: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 6, borderColor: '#FFFFFF', overflow: 'hidden' },
  heroCopy: { flex: 1 },
  pageTitle: { color: '#221044', fontSize: 27, lineHeight: 34, fontWeight: '900', marginBottom: 5 },
  pageSub: { color: '#6B5A89', fontSize: 14, lineHeight: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { height: 178, borderRadius: 26, overflow: 'hidden', borderWidth: 6, borderColor: '#FFFFFF' },
  artFull: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  artImage: { width: '100%', height: '100%' },
  artAsset: { width: '74%', height: '74%' },
  artNeli: { width: '80%', height: '98%', marginBottom: -14 },
  labelBand: { position: 'absolute', left: 8, right: 8, bottom: 8, borderRadius: 18, backgroundColor: 'rgba(37,16,92,0.68)', paddingHorizontal: 10, paddingVertical: 8 },
  cardLbl: { color: '#FFFFFF', fontSize: 15, lineHeight: 20, fontWeight: '900', textAlign: 'center' },
  doneBadge: { position: 'absolute', top: 8, right: 8, width: 46, height: 46 },
});
