import React, { useContext } from 'react';
import { Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import TopBar from '../components/TopBar';
import CharacterAvatar from '../components/CharacterAvatar';
import { neliWorldAssets } from '../assets/neliWorldAssets';
import { SOLAR_SYSTEM_BACKGROUND, SOLAR_SYSTEM_PLANETS } from '../assets/solarSystemPuzzle';
import { AppContext } from '../store/AppContext';
import { useNav } from '../store/NavContext';
import { dir, ff } from '../theme/fonts';
import { speakWithGeneratedVoice } from '../utils/faAudio';

type PathStep = {
  id: string;
  label: string;
  labelFa: string;
  type: 'section' | 'game' | 'tracing' | 'coloring' | 'video' | 'sel' | 'physical';
  stars: number;
  color: string;
  soft: string;
  art: string;
};

const PATH: PathStep[] = [
  { id: 'alphabet', label: 'Letters', labelFa: 'حروف', type: 'section', stars: 10, color: '#5E8CFF', soft: '#EAF0FF', art: 'letters' },
  { id: 'numbers', label: 'Numbers', labelFa: 'اعداد', type: 'section', stars: 10, color: '#F6B800', soft: '#FFF4C7', art: 'numbers' },
  { id: 'tracing', label: 'Trace a Letter', labelFa: 'شکل‌کشی حرف', type: 'tracing', stars: 15, color: '#10B981', soft: '#DCFCE7', art: 'pencil' },
  { id: 'quiz', label: 'Word Quiz', labelFa: 'مسابقه کلمه', type: 'game', stars: 20, color: '#0EA5E9', soft: '#E0F2FE', art: 'quiz' },
  { id: 'counting', label: 'Counting', labelFa: 'شمارش', type: 'game', stars: 20, color: '#F59E0B', soft: '#FEF3C7', art: 'counting' },
  { id: 'memory', label: 'Memory Match', labelFa: 'بازی حافظه', type: 'game', stars: 20, color: '#7C3AED', soft: '#F1E8FF', art: 'memory' },
  { id: 'colors', label: 'Color Play', labelFa: 'بازی رنگ', type: 'game', stars: 15, color: '#EC4899', soft: '#FCE7F3', art: 'colors' },
  { id: 'animals', label: 'Animals', labelFa: 'حیوانات', type: 'section', stars: 10, color: '#22C55E', soft: '#DCFCE7', art: 'animal' },
  { id: 'food', label: 'Food', labelFa: 'غذا', type: 'section', stars: 10, color: '#F97316', soft: '#FFEDD5', art: 'food' },
  { id: 'solarPuzzle', label: 'Solar System', labelFa: 'منظومه خورشیدی', type: 'game', stars: 20, color: '#2563EB', soft: '#EAF2FF', art: 'solarPuzzle' },
  { id: 'coloring', label: 'Painting', labelFa: 'نقاشی', type: 'coloring', stars: 15, color: '#A855F7', soft: '#F3E8FF', art: 'paint' },
  { id: 'sel', label: 'Feelings', labelFa: 'احساسات', type: 'sel', stars: 15, color: '#FF5FA2', soft: '#FFE4EF', art: 'heart' },
  { id: 'nowruz', label: 'Nowruz', labelFa: 'نوروز', type: 'section', stars: 15, color: '#14B8A6', soft: '#CCFBF1', art: 'culture' },
];

const FEATURED_IDS = ['tracing', 'quiz', 'solarPuzzle'];

function planet(id: string) {
  return SOLAR_SYSTEM_PLANETS.find(item => item.id === id)?.source ?? SOLAR_SYSTEM_PLANETS[0].source;
}

function StepArt({ type, color, lang, onSpeakSolarPlanet }: { type: string; color: string; lang: string; onSpeakSolarPlanet?: (planetId: string) => void }) {
  const map: Record<string, any> = {
    letters: neliWorldAssets.ui.book,
    numbers: neliWorldAssets.ui.trophy,
    pencil: neliWorldAssets.ui.paintbrush,
    quiz: neliWorldAssets.ui.star,
    counting: neliWorldAssets.foods.apple,
    colors: neliWorldAssets.ui.paintbrush,
    animal: neliWorldAssets.animals.panda,
    food: neliWorldAssets.foods.pasta,
    paint: neliWorldAssets.ui.paintbrush,
    memory: neliWorldAssets.foods.strawberry,
    culture: neliWorldAssets.persianFoods.sabziPolo,
    heart: neliWorldAssets.ui.heart,
    locked: neliWorldAssets.ui.lock,
  };

  if (type === 'animal') {
    return (
      <ImageBackground source={neliWorldAssets.rooms.feedAnimalsJungle} style={styles.artStage} imageStyle={styles.artBg}>
        <View style={styles.imageWash} />
        <Image source={neliWorldAssets.animals.panda} style={styles.stepImageLarge} resizeMode="contain" />
      </ImageBackground>
    );
  }

  if (type === 'food' || type === 'culture') {
    return (
      <ImageBackground source={neliWorldAssets.rooms.kitchenWide} style={styles.artStage} imageStyle={styles.artBg}>
        <View style={styles.imageWash} />
        <Image source={map[type]} style={styles.stepImageLarge} resizeMode="contain" />
      </ImageBackground>
    );
  }

  if (type === 'solarPuzzle') {
    const speakPlanet = (planetId: string) => {
      const item = SOLAR_SYSTEM_PLANETS.find(p => p.id === planetId);
      if (!item) return;
      const spokenName = lang === 'fa' || lang === 'ar' ? item.labelFa : item.id.charAt(0).toUpperCase() + item.id.slice(1);
      void speakWithGeneratedVoice(spokenName, lang === 'fa' || lang === 'ar' ? 'fa-IR' : 'en-US', { interrupt: true, rate: 0.78, pitch: 1.12 });
      onSpeakSolarPlanet?.(planetId);
    };
    return (
      <ImageBackground source={SOLAR_SYSTEM_BACKGROUND} style={styles.artStage} imageStyle={styles.artBg}>
        <View style={styles.solarWash} />
        <TouchableOpacity activeOpacity={0.82} onPressIn={() => speakPlanet('jupiter')} style={[styles.solarPlanetTap, styles.jupiter]}>
          <Image source={planet('jupiter')} style={styles.solarPlanetFill} resizeMode="contain" />
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.82} onPressIn={() => speakPlanet('earth')} style={[styles.solarPlanetTap, styles.earth]}>
          <Image source={planet('earth')} style={styles.solarPlanetFill} resizeMode="contain" />
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.82} onPressIn={() => speakPlanet('saturn')} style={[styles.solarPlanetTap, styles.saturn]}>
          <Image source={planet('saturn')} style={styles.solarPlanetFill} resizeMode="contain" />
        </TouchableOpacity>
      </ImageBackground>
    );
  }

  if (type === 'counting') {
    return (
      <View style={styles.artStage}>
        {[0, 1, 2].map(index => (
          <Image
            key={index}
            source={index === 1 ? neliWorldAssets.foods.carrot : neliWorldAssets.foods.apple}
            style={[styles.countFruit, { left: 28 + index * 36, top: 26 + (index % 2) * 22 }]}
            resizeMode="contain"
          />
        ))}
      </View>
    );
  }

  if (type === 'paint') {
    return (
      <View style={styles.paintingCardScene}>
        <Image source={neliWorldAssets.painting.cardBunny} style={styles.paintingCardImage} resizeMode="contain" />
      </View>
    );
  }

  return (
    <View style={styles.artStage}>
      <View style={[styles.blob, { backgroundColor: color }]} />
      <Image source={map[type] ?? neliWorldAssets.ui.star} style={styles.stepImage} resizeMode="contain" />
    </View>
  );
}

export default function LearningPathScreen() {
  const { lang, completedSections, stars, pathProgress, setPathProgress, selectedCharacterId } = useContext(AppContext);
  const isFa = lang === 'fa' || lang === 'ar';
  const { navigate } = useNav();
  const { width, height } = useWindowDimensions();
  const ui = Math.min(width / 1024, height / 640);
  const featured = PATH.filter(step => FEATURED_IDS.includes(step.id));
  const regular = PATH.filter(step => !FEATURED_IDS.includes(step.id));

  const handleStep = (step: PathStep, index: number) => {
    if (index > pathProgress + 1) return;
    if (index > pathProgress) setPathProgress(index);

    switch (step.type) {
      case 'section': navigate({ name: 'Section', id: step.id }); break;
      case 'game': navigate({ name: 'Game', gameId: step.id }); break;
      case 'tracing': navigate({ name: 'InteractiveFarsiTrace' }); break;
      case 'coloring': navigate({ name: 'Coloring' }); break;
      case 'video': navigate({ name: 'VideoShows' }); break;
      case 'sel': navigate({ name: 'SEL' }); break;
      case 'physical': navigate({ name: 'PhysicalActivity' }); break;
    }
  };

  const progress = Math.min(100, Math.round(((pathProgress + 1) / PATH.length) * 100));

  const speakSolarPlanet = (planetId: string) => {
    const item = SOLAR_SYSTEM_PLANETS.find(p => p.id === planetId);
    if (!item) return;
    void speakWithGeneratedVoice(item.labelFa, isFa ? 'fa-IR' : 'en-US', { interrupt: true, rate: isFa ? 0.78 : 0.86, pitch: 1.12 });
  };

  return (
    <View style={styles.root}>
      <View style={styles.bgSky} />
      <View style={styles.bgSun} />
      <View style={styles.bgLeaf} />
      <View style={styles.bgPink} />
      <TopBar title="Learning Path" titleFa="مسیر یادگیری" showBack dark={false} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroCharacterWrap}>
            <View style={styles.heroCharacterGlow} />
            <CharacterAvatar characterId={selectedCharacterId} size={Math.max(118, Math.round(146 * ui))} />
          </View>
          <View style={styles.heroCopy}>
            <View style={styles.starPill}>
              <Text style={[styles.starPillText, { fontFamily: ff(lang, 'black') }]}>
                {isFa ? `${stars} ستاره` : `${stars} stars`}
              </Text>
            </View>
            <Text style={[styles.heroTitle, { fontFamily: ff(lang, 'black') }, dir(lang)]}>
              {isFa ? 'امروز چی یاد بگیریم؟' : 'What shall we learn today?'}
            </Text>
            <Text style={[styles.heroSub, { fontFamily: ff(lang, 'bold') }, dir(lang)]}>
              {isFa ? 'بازی‌های کوتاه، رنگی و مرحله‌به‌مرحله برای یادگیری فارسی' : 'Short colorful activities that grow Persian step by step'}
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>
        </View>

        <View style={styles.featuredRow}>
          {featured.map(step => {
            const realIndex = PATH.findIndex(item => item.id === step.id);
            const locked = realIndex > pathProgress + 1;
            return (
              <TouchableOpacity
                key={step.id}
                style={[styles.featureCard, locked && styles.lockedCard]}
                onPress={() => handleStep(step, realIndex)}
                activeOpacity={locked ? 1 : 0.88}
              >
                <View style={[styles.featureArt, { backgroundColor: locked ? '#E7E2F2' : step.soft }]}>
                  <StepArt type={locked ? 'locked' : step.art} color={step.color} lang={lang} onSpeakSolarPlanet={step.id === 'solarPuzzle' ? speakSolarPlanet : undefined} />
                </View>
                <View style={styles.featureText}>
                  <Text style={[styles.featureTitle, { fontFamily: ff(lang, 'black') }, dir(lang)]} numberOfLines={1}>
                    {locked ? (isFa ? 'قفل' : 'Locked') : isFa ? step.labelFa : step.label}
                  </Text>
                  <Text style={[styles.featureSub, { fontFamily: ff(lang, 'bold') }]}>
                    {locked ? (isFa ? 'بعدی' : 'Next') : `+${step.stars}`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { fontFamily: ff(lang, 'black') }, dir(lang)]}>
          {isFa ? 'بازی‌ها و درس‌ها' : 'Games and lessons'}
        </Text>

        <View style={styles.grid}>
          {regular.map(step => {
            const realIndex = PATH.findIndex(item => item.id === step.id);
            const locked = realIndex > pathProgress + 1;
            const done = completedSections.includes(step.id);
            return (
              <TouchableOpacity
                key={step.id}
                style={[styles.card, locked && styles.lockedCard]}
                onPress={() => handleStep(step, realIndex)}
                activeOpacity={locked ? 1 : 0.88}
              >
                <View style={[styles.thumb, { backgroundColor: locked ? '#E7E2F2' : step.soft }]}>
                  <StepArt type={locked ? 'locked' : step.art} color={step.color} lang={lang} onSpeakSolarPlanet={step.id === 'solarPuzzle' ? speakSolarPlanet : undefined} />
                </View>
                <View style={styles.cardCopy}>
                  <Text style={[styles.cardTitle, { fontFamily: ff(lang, 'black') }, dir(lang)]} numberOfLines={1}>
                    {locked ? (isFa ? 'قفل' : 'Locked') : isFa ? step.labelFa : step.label}
                  </Text>
                  <View style={[styles.rewardChip, { backgroundColor: done ? '#DCFCE7' : step.soft }]}>
                    <Text style={[styles.rewardText, { color: done ? '#15803D' : step.color, fontFamily: ff(lang, 'black') }]}>
                      {done ? (isFa ? 'انجام شد' : 'Done') : `+${step.stars}`}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFDF4', overflow: 'hidden' },
  bgSky: {
    position: 'absolute',
    left: -100,
    top: 78,
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: '#DDF4FF',
  },
  bgSun: {
    position: 'absolute',
    right: 34,
    top: 88,
    width: 166,
    height: 166,
    borderRadius: 83,
    backgroundColor: '#FFF0A8',
  },
  bgLeaf: {
    position: 'absolute',
    left: '47%',
    bottom: -90,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#DCFCE7',
  },
  bgPink: {
    position: 'absolute',
    right: -70,
    bottom: -78,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#FFE4EF',
  },
  scroll: { paddingHorizontal: 24, paddingBottom: 36 },
  hero: {
    minHeight: 164,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.11,
    shadowRadius: 18,
    elevation: 4,
  },
  heroCharacterWrap: { width: 168, alignItems: 'center', justifyContent: 'center' },
  heroCharacterGlow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FEF3C7',
  },
  heroCopy: { flex: 1 },
  starPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#FFF4C7',
    paddingHorizontal: 15,
    paddingVertical: 7,
    marginBottom: 8,
  },
  starPillText: { color: '#A16207', fontSize: 13 },
  heroTitle: { color: '#1A0050', fontSize: 28, lineHeight: 36 },
  heroSub: { color: '#5D5875', fontSize: 14, lineHeight: 20, marginTop: 3, maxWidth: 560 },
  progressTrack: {
    width: '86%',
    height: 14,
    borderRadius: 999,
    backgroundColor: '#E9E2FA',
    overflow: 'hidden',
    marginTop: 14,
  },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#22C55E' },
  featuredRow: { flexDirection: 'row', gap: 14, marginTop: 16 },
  featureCard: {
    flex: 1,
    minHeight: 178,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#334155',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },
  featureArt: { flex: 1, minHeight: 118, borderRadius: 26, overflow: 'hidden' },
  featureText: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingTop: 9 },
  featureTitle: { color: '#1A0050', fontSize: 17, lineHeight: 23, flex: 1 },
  featureSub: { color: '#7C3AED', fontSize: 13, marginLeft: 8 },
  sectionTitle: { color: '#1A0050', fontSize: 21, lineHeight: 28, marginTop: 20, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '23.6%',
    minHeight: 166,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    padding: 9,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#334155',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 3,
  },
  lockedCard: { opacity: 0.62 },
  thumb: { height: 96, borderRadius: 22, overflow: 'hidden' },
  cardCopy: { paddingHorizontal: 4, paddingTop: 8 },
  cardTitle: { color: '#1A0050', fontSize: 14, lineHeight: 19 },
  rewardChip: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 5 },
  rewardText: { fontSize: 11 },
  artStage: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  artBg: { width: '100%', height: '100%' },
  imageWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.28)' },
  paintingCardScene: { flex: 1, width: '100%', height: '100%', backgroundColor: '#18C977', alignItems: 'center', justifyContent: 'center' },
  paintingCardImage: { width: '100%', height: '100%' },
  blob: { position: 'absolute', width: 74, height: 74, borderRadius: 37, opacity: 0.14 },
  stepImage: { width: 70, height: 70 },
  stepImageLarge: { width: 90, height: 90 },
  countFruit: { position: 'absolute', width: 54, height: 54 },
  solarWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2, 8, 32, 0.08)' },
  solarPlanetTap: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  solarPlanetFill: { width: '100%', height: '100%' },
  solarPlanet: {
    position: 'absolute',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  jupiter: { width: 58, height: 58, right: 18, top: 16 },
  earth: { width: 38, height: 38, left: 28, top: 50 },
  saturn: { width: 72, height: 52, right: 62, bottom: 26 },
});


