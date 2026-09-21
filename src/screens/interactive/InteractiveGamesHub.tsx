import React, { useContext } from 'react';
import { Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AppContext } from '../../store/AppContext';
import { useNav } from '../../store/NavContext';
import TopBar from '../../components/TopBar';
import CharacterAvatar from '../../components/CharacterAvatar';
import { characterAssets } from '../../assets/characterAssets';
import { C } from '../../theme/colors';
import { dir, ff } from '../../theme/fonts';
import { useResponsive } from '../../theme/responsive';
import { BOX_CHARACTER_HEIGHT, BOX_CHARACTER_WIDTH } from '../../theme/characterSizes';
import { neliWorldAssets, roomBackgroundPickers } from '../../assets/neliWorldAssets';
import { SOLAR_SYSTEM_BACKGROUND, SOLAR_SYSTEM_PLANETS } from '../../assets/solarSystemPuzzle';

type GameId = 'ConversationGame' | 'DailyRoutine' | 'FeedAnimals' | 'BuildScene' | 'DressUp' | 'Cooking' | 'ToothBrush' | 'SolarPuzzle';
type Kind = 'talk' | 'routine' | 'feed' | 'home' | 'dress' | 'cook' | 'tooth' | 'solar';

const solarPlanetSource = (id: string) => SOLAR_SYSTEM_PLANETS.find(planet => planet.id === id)?.source ?? SOLAR_SYSTEM_PLANETS[0].source;

const GAMES: {
  id: GameId;
  kind: Kind;
  en: string;
  fa: string;
  desc: string;
  descFa: string;
  color: string;
  soft: string;
}[] = [
  { id: 'ConversationGame', kind: 'talk', en: 'Talk & Play', fa: 'گفت‌وگو و بازی', desc: 'Listen to a short sentence and answer by touch.', descFa: 'یک جمله کوتاه بشنو و جواب را لمس کن.', color: '#6C4EFF', soft: '#EEE9FF' },
  { id: 'DailyRoutine', kind: 'routine', en: 'Daily Routine', fa: 'روتین روزانه', desc: 'Practice brushing, washing, dressing, and sleep.', descFa: 'مسواک، شستن، لباس پوشیدن و خواب را تمرین کن.', color: '#38BDF8', soft: '#E7F7FF' },
  { id: 'FeedAnimals', kind: 'feed', en: 'Feed Animals', fa: 'غذا بده', desc: 'Drag the right food to each animal.', descFa: 'غذای درست را به حیوان بده.', color: '#22C55E', soft: '#EAFBEF' },
  { id: 'BuildScene', kind: 'home', en: 'Build the House', fa: 'خانه بساز', desc: 'Put things in the right room.', descFa: 'وسایل را در اتاق درست بگذار.', color: '#FB923C', soft: '#FFF1E6' },
  { id: 'DressUp', kind: 'dress', en: 'Dress Up', fa: 'لباس بپوش', desc: 'Drag clothes onto Neli.', descFa: 'لباس‌ها را روی نلی بکش.', color: '#EC4899', soft: '#FFE9F5' },
  { id: 'Cooking', kind: 'cook', en: 'Cooking', fa: 'آشپزی', desc: 'Make simple Persian and everyday foods.', descFa: 'غذاهای ساده ایرانی و روزمره درست کن.', color: '#FACC15', soft: '#FFF8D8' },
  { id: 'ToothBrush', kind: 'tooth', en: 'Brush Teeth', fa: 'مسواک زدن', desc: 'Move the brush over the teeth.', descFa: 'مسواک را روی دندان‌ها حرکت بده.', color: '#A855F7', soft: '#F3E8FF' },
  { id: 'SolarPuzzle', kind: 'solar', en: 'Solar System', fa: 'منظومه خورشیدی', desc: 'Place each planet on its orbit.', descFa: 'هر سیاره را روی مدار درست بگذار.', color: '#38BDF8', soft: '#EAF7FF' },
];

function GameIllustration({ kind, color, artW, artH }: { kind: Kind; color: string; artW: number; artH: number }) {
  if (kind === 'talk') {
    return (
      <ImageBackground source={roomBackgroundPickers.talkPlay(artW, artH)} style={styles.sceneArt} imageStyle={styles.sceneArtImage}>
        <View style={styles.sceneWash} />
        <CharacterAvatar characterId="neli" size={BOX_CHARACTER_WIDTH} floating={false} style={styles.hubTalkNeli} />
      </ImageBackground>
    );
  }
  if (kind === 'feed') {
    return (
      <ImageBackground source={roomBackgroundPickers.feedAnimalsJungle(artW, artH)} style={styles.sceneArt} imageStyle={styles.sceneArtImage}>
        <Image source={neliWorldAssets.animals.monkey} style={styles.hubMonkey} resizeMode="contain" />
        <Image source={neliWorldAssets.animals.rabbit} style={styles.hubAnimal} resizeMode="contain" />
        <Image source={neliWorldAssets.foods.carrot} style={styles.hubFood} resizeMode="contain" />
      </ImageBackground>
    );
  }
  if (kind === 'home') {
    return (
      <ImageBackground source={roomBackgroundPickers.talkPlay(artW, artH)} style={styles.sceneArt} imageStyle={styles.sceneArtImage}>
        <Image source={neliWorldAssets.ui.home} style={styles.hubIconLarge} resizeMode="contain" />
      </ImageBackground>
    );
  }
  if (kind === 'dress') {
    return (
      <ImageBackground source={roomBackgroundPickers.bedroom(artW, artH)} style={styles.sceneArt} imageStyle={styles.sceneArtImage}>
        <CharacterAvatar characterId="neli" size={BOX_CHARACTER_WIDTH} floating={false} style={styles.hubNeli} />
      </ImageBackground>
    );
  }
  if (kind === 'cook') {
    return (
      <ImageBackground source={roomBackgroundPickers.kitchen(artW, artH)} style={styles.sceneArt} imageStyle={styles.sceneArtImage}>
        <Image source={neliWorldAssets.kitchen.pan} style={styles.hubPan} resizeMode="contain" />
        <Image source={neliWorldAssets.foods.pasta} style={styles.hubFood} resizeMode="contain" />
      </ImageBackground>
    );
  }
  if (kind === 'tooth') {
    return (
      <ImageBackground source={roomBackgroundPickers.bathroom(artW, artH)} style={styles.sceneArt} imageStyle={styles.sceneArtImage}>
        <Image source={characterAssets.lila.poses.bigSmile} style={[styles.hubAnimal, { width: BOX_CHARACTER_WIDTH, height: BOX_CHARACTER_HEIGHT }]} resizeMode="contain" />
      </ImageBackground>
    );
  }
  if (kind === 'solar') {
    return (
      <ImageBackground source={SOLAR_SYSTEM_BACKGROUND} style={styles.sceneArt} imageStyle={[styles.sceneArtImage, styles.solarPreviewBg]}>
        <View style={styles.solarPreviewWash} />
        <Image source={solarPlanetSource('jupiter')} style={[styles.solarPreviewPlanet, styles.solarPreviewJupiter]} resizeMode="contain" />
        <Image source={solarPlanetSource('earth')} style={[styles.solarPreviewPlanet, styles.solarPreviewEarth]} resizeMode="contain" />
        <Image source={solarPlanetSource('saturn')} style={[styles.solarPreviewPlanet, styles.solarPreviewSaturn]} resizeMode="contain" />
        <Image source={solarPlanetSource('mars')} style={[styles.solarPreviewPlanet, styles.solarPreviewMars]} resizeMode="contain" />
      </ImageBackground>
    );
  }
  return (
    <ImageBackground source={roomBackgroundPickers.bathroom(artW, artH)} style={styles.sceneArt} imageStyle={styles.sceneArtImage}>
      <Image source={neliWorldAssets.bathroom.soap} style={styles.hubIconLarge} resizeMode="contain" />
    </ImageBackground>
  );
}

export default function InteractiveGamesHub() {
  const { lang, selectedCharacterId } = useContext(AppContext);
  const { navigate } = useNav();
  const responsive = useResponsive();
  const isFa = lang === 'fa' || lang === 'ar';
  const minCardWidth = 176;
  const gap = 12;
  const columns = Math.max(2, Math.min(4, Math.floor((responsive.contentWidth - responsive.horizontalPadding * 2 + gap) / (minCardWidth + gap))));
  const cardW = (responsive.contentWidth - responsive.horizontalPadding * 2 - gap * (columns - 1)) / columns;
  const cardH = 226;
  // artShell fills the card minus its 6pt border on every edge — the actual
  // box the background image covers, not the screen. Matches CLAUDE.md's
  // "pass the real container size in" fix already applied to GamesScreen.
  const artW = cardW - 12;
  const artH = cardH - 12;
  const characterId = selectedCharacterId;

  const openGame = (id: GameId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigate({ name: id });
  };

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#35217E' }]} />
      <TopBar title="Play Worlds" titleFa="دنیای بازی" showClose dark />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: responsive.horizontalPadding }]} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={[styles.kicker, { fontFamily: ff(lang, 'bold') }, dir(lang)]}>
            {isFa ? 'بازی‌های لمسی فارسی' : 'Touchable Persian play'}
          </Text>
          <Text style={[styles.title, { fontFamily: ff(lang, 'black') }, dir(lang)]}>
            {isFa ? 'یک بازی را انتخاب کن' : 'Choose one game'}
          </Text>
          <Text style={[styles.subtitle, { fontFamily: ff(lang, 'regular') }, dir(lang)]}>
            {isFa ? 'هر کارت یک کار روشن دارد؛ بدون منوی گیج‌کننده.' : 'Each card has one clear activity, with no confusing extra menu.'}
          </Text>
        </View>

        <View style={styles.grid}>
          {GAMES.map(game => (
            <TouchableOpacity
              key={game.id}
              style={[styles.card, { width: cardW, height: cardH }]}
              onPress={() => openGame(game.id)}
              activeOpacity={0.88}
            >
              <View style={[styles.artShell, { backgroundColor: game.soft }]}>
                <GameIllustration kind={game.kind} color={game.color} artW={artW} artH={artH} />
                <View style={styles.cardShade} />
                <View style={styles.cardTextBand}>
                  <Text style={[styles.cardTitle, { fontFamily: ff(lang, 'black') }, dir(lang)]} numberOfLines={1}>
                    {isFa ? game.fa : game.en}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#35217E' },
  scroll: { padding: 16, paddingBottom: 34 },
  hero: {
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.94)',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#20124D',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  kicker: { color: C.purple, fontSize: 13, marginBottom: 7 },
  title: { color: C.textDark, fontSize: 29, lineHeight: 36 },
  subtitle: { color: C.textMid, fontSize: 14, lineHeight: 22, marginTop: 7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    borderRadius: 26,
    borderWidth: 6,
    borderColor: '#FFFFFF',
    padding: 0,
    alignItems: 'stretch',
    backgroundColor: '#AEEBFF',
    overflow: 'hidden',
    shadowColor: '#170736',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  artShell: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sceneArt: { flex: 1, width: '100%', height: '100%', overflow: 'hidden' },
  sceneArtImage: { width: '100%', height: '100%' },
  sceneWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(44, 20, 74, 0.10)' },
  solarPreviewBg: { width: '100%', height: '100%', transform: [{ scale: 1.1 }] },
  solarPreviewWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2, 8, 32, 0.08)' },
  solarPreviewPlanet: {
    position: 'absolute',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  solarPreviewJupiter: { width: 64, height: 64, right: 18, top: 22 },
  solarPreviewEarth: { width: 42, height: 42, left: 34, top: 66 },
  solarPreviewSaturn: { width: 76, height: 52, right: 84, bottom: 48 },
  solarPreviewMars: { width: 32, height: 32, left: 118, top: 34 },
  hubNeli: { position: 'absolute', right: 8, bottom: -12, width: 78, height: 106 },
  hubAnimal: { position: 'absolute', right: 8, bottom: 0, width: 86, height: 100 },
  hubIcon: { position: 'absolute', left: 10, top: 10, width: 48, height: 48 },
  hubWater: { position: 'absolute', left: 10, bottom: 10, width: 76, height: 76 },
  hubTalkNeli: { position: 'absolute', right: 8, bottom: 10, width: 98, height: 126 },
  hubMonkey: { position: 'absolute', left: 2, top: -6, width: 108, height: 108, transform: [{ rotate: '-8deg' }] },
  hubIconLarge: { position: 'absolute', right: 20, bottom: 14, width: 76, height: 76 },
  hubFood: { position: 'absolute', left: 14, bottom: 10, width: 58, height: 58 },
  hubPan: { position: 'absolute', right: 18, bottom: 12, width: 90, height: 70 },
  solarArt: { backgroundColor: '#07112D', justifyContent: 'center', alignItems: 'center' },
  solarBg: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  solarCardStarOne: { position: 'absolute', left: 30, top: 36, width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF7C2' },
  solarCardStarTwo: { position: 'absolute', right: 44, top: 30, width: 5, height: 5, borderRadius: 3, backgroundColor: '#BFEAFF' },
  solarCardStarThree: { position: 'absolute', right: 76, bottom: 62, width: 3, height: 3, borderRadius: 2, backgroundColor: '#FFEFB0' },
  solarGlowOne: {
    position: 'absolute',
    right: -24,
    top: -22,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 193, 92, 0.26)',
  },
  solarGlowTwo: {
    position: 'absolute',
    left: -22,
    bottom: -16,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(56, 189, 248, 0.22)',
  },
  solarSun: {
    position: 'absolute',
    left: 16,
    top: 34,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FDBA74',
    shadowColor: '#FDBA74',
    shadowOpacity: 0.52,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 7,
  },
  solarOrbit: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 76,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  solarOrbitSmall: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 116,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  solarPlanet: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  solarMercury: { left: 66, top: 66, backgroundColor: '#CBD5E1' },
  solarEarth: { left: 132, top: 66, backgroundColor: '#38BDF8' },
  solarJupiter: { left: 220, top: 62, width: 30, height: 30, borderRadius: 15, backgroundColor: '#F59E0B' },
  solarLabelPill: {
    position: 'absolute',
    right: 14,
    bottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(8, 13, 34, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  solarLabelText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  cardShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 48, backgroundColor: 'rgba(37,16,92,0.62)' },
  cardTextBand: { position: 'absolute', left: 10, right: 10, bottom: 9, minHeight: 28, justifyContent: 'center' },
  cardTitle: { color: '#FFFFFF', fontSize: 17, textAlign: 'left', maxWidth: '100%' },
  art: { width: 100, height: 92, alignItems: 'center', justifyContent: 'center' },
  face: { width: 72, height: 68, borderRadius: 34 },
  eyeLeft: { position: 'absolute', left: 22, top: 25, width: 7, height: 7, borderRadius: 4, backgroundColor: '#1B1238' },
  eyeRight: { position: 'absolute', right: 22, top: 25, width: 7, height: 7, borderRadius: 4, backgroundColor: '#1B1238' },
  smile: { position: 'absolute', bottom: 18, alignSelf: 'center', width: 24, height: 12, borderBottomWidth: 3, borderBottomColor: '#1B1238', borderRadius: 12 },
  chatBubble: { position: 'absolute', right: 3, top: 8, width: 38, height: 28, borderRadius: 14 },
  animalHead: { width: 76, height: 70, borderRadius: 35 },
  foodBowl: { position: 'absolute', bottom: 7, width: 66, height: 25, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  houseRoof: { width: 0, height: 0, borderLeftWidth: 42, borderRightWidth: 42, borderBottomWidth: 38, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  houseBody: { width: 70, height: 48, borderRadius: 12, marginTop: -1 },
  houseDoor: { position: 'absolute', bottom: 13, width: 18, height: 28, borderRadius: 7 },
  shirt: { width: 58, height: 68, borderRadius: 18 },
  sleeveLeft: { position: 'absolute', left: 13, top: 22, width: 24, height: 34, borderRadius: 13, transform: [{ rotate: '35deg' }] },
  sleeveRight: { position: 'absolute', right: 13, top: 22, width: 24, height: 34, borderRadius: 13, transform: [{ rotate: '-35deg' }] },
  pot: { width: 78, height: 62, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  potSoup: { position: 'absolute', top: 28, width: 62, height: 18, borderRadius: 9 },
  steamA: { position: 'absolute', top: 4, left: 38, width: 10, height: 25, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.8)' },
  steamB: { position: 'absolute', top: 9, right: 33, width: 8, height: 20, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.62)' },
  tooth: { width: 58, height: 70, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#DDE7F2' },
  brush: { position: 'absolute', width: 78, height: 14, borderRadius: 7, bottom: 14, transform: [{ rotate: '-22deg' }] },
  routineCircle: { width: 74, height: 74, borderRadius: 37 },
  routineDot: { position: 'absolute', width: 30, height: 30, borderRadius: 15 },
});
