import React, { useContext } from 'react';
import { Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import TopBar from '../components/TopBar';
import { AppContext } from '../store/AppContext';
import { useNav } from '../store/NavContext';
import { dir, ff } from '../theme/fonts';
import { useResponsive } from '../theme/responsive';
import CharacterAvatar from '../components/CharacterAvatar';
import { characterAssets } from '../assets/characterAssets';
import { neliWorldAssets, roomBackgroundPickers } from '../assets/neliWorldAssets';
import { SOLAR_SYSTEM_BACKGROUND, SOLAR_SYSTEM_PLANETS } from '../assets/solarSystemPuzzle';
import { BOX_CHARACTER_WIDTH } from '../theme/characterSizes';

type Kind = 'talk' | 'grandma' | 'dress' | 'tooth' | 'animal' | 'cook' | 'paint' | 'routine' | 'room' | 'memory' | 'quiz' | 'color' | 'count' | 'culture' | 'tracing' | 'firstTracing' | 'alphabet' | 'alphabetTrain' | 'video' | 'solarPuzzle';
type Tile = {
  id: string;
  route: any;
  en: string;
  fa: string;
  descEn: string;
  descFa: string;
  kind: Kind;
  color: string;
  accent: string;
  group: 'play' | 'learn' | 'alphabet';
  hidden?: boolean;
};

const GAMES: Tile[] = [
  { id: 'talk', route: { name: 'ConversationGame' }, en: 'Talk with Neli', fa: 'گفت و گو', descEn: 'Listen and answer', descFa: 'بشنو و جواب بده', kind: 'talk', color: '#6C4EFF', accent: '#FACC15', group: 'play' },
  { id: 'grandma', route: { name: 'GrandmaCall' }, en: "Grandma's Call", fa: 'زنگ مامان‌بزرگ', descEn: 'Answer Grandma in Farsi', descFa: 'به مامان‌بزرگ جواب بده', kind: 'grandma', color: '#FF7A5C', accent: '#FFD86B', group: 'play' },
  { id: 'animals', route: { name: 'FeedAnimals' }, en: 'Feed Animals', fa: 'غذا بده', descEn: 'Drag food to animals', descFa: 'غذا را به حیوان بده', kind: 'animal', color: '#22C55E', accent: '#FACC15', group: 'play' },
  { id: 'teeth', route: { name: 'ToothBrush' }, en: 'Brush Teeth', fa: 'مسواک بزن', descEn: 'Move the brush', descFa: 'مسواک را حرکت بده', kind: 'tooth', color: '#38BDF8', accent: '#6C4EFF', group: 'play' },
  { id: 'counting', route: { name: 'Game', gameId: 'counting' }, en: 'Counting', fa: 'بشمار', descEn: 'Count with pictures', descFa: 'با تصویر بشمار', kind: 'count', color: '#F72585', accent: '#FFE45E', group: 'learn' },
  { id: 'alphabetTrain', route: { name: 'AlphabetTrain' }, en: 'Alphabet Train', fa: 'قطار الفبا', descEn: 'Ride the letters and words', descFa: 'سوار قطار حرف‌ها شو', kind: 'alphabetTrain', color: '#06B6D4', accent: '#F97316', group: 'learn' },
  { id: 'dress', route: { name: 'DressUp' }, en: 'Dress Up', fa: 'لباس بپوشون', descEn: 'Drag clothes onto Neli', descFa: 'لباس را روی نلی بکش', kind: 'dress', color: '#EC4899', accent: '#FDE68A', group: 'play' },
  { id: 'quiz', route: { name: 'Game', gameId: 'quiz' }, en: 'Word Quiz', fa: 'مسابقه کلمه', descEn: 'See and choose', descFa: 'ببین و انتخاب کن', kind: 'quiz', color: '#38BDF8', accent: '#A855F7', group: 'learn', hidden: true },
  { id: 'colors', route: { name: 'Game', gameId: 'colormatch' }, en: 'Color Play', fa: 'بازی رنگ', descEn: 'Match playful colors', descFa: 'رنگ درست را پیدا کن', kind: 'color', color: '#EC4899', accent: '#FACC15', group: 'learn', hidden: true },
  { id: 'memory', route: { name: 'Game', gameId: 'memory' }, en: 'Memory Match', fa: 'بازی فکر', descEn: 'Find pairs', descFa: 'جفت‌ها را پیدا کن', kind: 'memory', color: '#6C4EFF', accent: '#FACC15', group: 'learn' },
  { id: 'solarPuzzle', route: { name: 'SolarPuzzle' }, en: 'Solar System', fa: 'منظومه خورشیدی', descEn: 'Place each planet', descFa: 'هر سیاره را بگذار', kind: 'solarPuzzle', color: '#38BDF8', accent: '#EAF7FF', group: 'learn', hidden: true },
];

const solarPlanetSource = (id: string) => SOLAR_SYSTEM_PLANETS.find(planet => planet.id === id)?.source ?? SOLAR_SYSTEM_PLANETS[0].source;

// The tile art is authored larger than its card on purpose — characters bleed
// past the edge and get cropped. But it was authored in fixed pixels against a
// ~373pt card (a 1280x800 tablet), and the card ranges from 189pt on an iPhone
// SE to 394pt on an iPad Pro 13. At 189pt the same art is 2.75x the card
// instead of 1.39x, which is why small screens look crowded. Scaling by the
// real card keeps that intended 1.39x crop identical on every device.
const TILE_REFERENCE_BOX = 373;
const GRANDMA_ART = require('../../assets/neli-world/characters/Grandma/grandma_standing.webp');

const MEMORY_CARD_BACKS = [
  { bg: '#38BDF8', rot: '-10deg', left: 14, top: 24 as number | 'mid' },
  { bg: '#FACC15', rot: '10deg', right: 14, top: 34 as number | 'mid' },
  { bg: '#F472B6', rot: '-6deg', left: 4, top: 'mid' as number | 'mid' },
] as { bg: string; rot: string; left?: number; right?: number; top: number | 'mid' }[];

function TileArt({ kind, color, accent, characterId, box }: { kind: Kind; color: string; accent: string; characterId: string; box: number }) {
  const k = box / TILE_REFERENCE_BOX;
  if (kind === 'grandma') {
    // the call screen from the game: coral, a butter blob, and Grandma
    return (
      <View style={[styles.sceneArt, { backgroundColor: '#FF9B85' }]}>
        <View style={{ position: 'absolute', width: 300 * k, height: 270 * k, borderRadius: 140 * k, backgroundColor: '#FFD86B', left: -110 * k, top: -120 * k }} />
        <Text style={{ position: 'absolute', top: 26 * k, right: 30 * k, fontSize: 64 * k }}>📞</Text>
        <Image source={GRANDMA_ART} style={{ position: 'absolute', width: 400 * k, height: 400 * k, bottom: -36 * k, alignSelf: 'center' }} resizeMode="contain" />
      </View>
    );
  }
  if (kind === 'talk') {
    return (
      <ImageBackground source={roomBackgroundPickers.talkPlay(box, box)} style={styles.sceneArt} imageStyle={styles.sceneArtImageCover}>
        <View style={styles.sceneWash} />
        <CharacterAvatar
          characterId="neli"
          size={265 * k}
          talking
          talkPattern="home"
          talkMouthScale={0.6488}
          talkMouthOffsetXPercent={0.465}
          talkMouthOffsetY={8.625}
          floating={false}
          blinkOffsetX={2.35}
          blinkOffsetY={7.7}
          style={[styles.sceneNeliLarge, { width: 398 * k, height: 520 * k, bottom: -42 * k, transform: [{ translateX: 66 * k }, { translateY: 52 * k }] }]}
        />
      </ImageBackground>
    );
  }
  if (kind === 'dress') {
    return (
      <ImageBackground source={roomBackgroundPickers.bedroom(box, box)} style={styles.sceneArt} imageStyle={styles.sceneArtImage}>
        <CharacterAvatar characterId={characterId} size={BOX_CHARACTER_WIDTH * 2.75 * k} floating={false} blinkOffsetX={3.432} blinkOffsetY={8.42} style={[styles.tileDressCharacter, { width: 230 * k, height: 300 * k, right: 10 * k, bottom: 2 * k }]} />
      </ImageBackground>
    );
  }
  if (kind === 'tooth') {
    return (
      <ImageBackground source={roomBackgroundPickers.brushTeethBathroom(box, box)} style={styles.sceneArt} imageStyle={styles.sceneArtImage}>
        <Image source={characterAssets.lila.poses.bigSmile} style={[styles.sceneGiraffe, { width: 322.9 * k, height: 409.5 * k, bottom: -55 * k }]} resizeMode="contain" />
      </ImageBackground>
    );
  }
  if (kind === 'cook') {
    return (
      <ImageBackground
        source={roomBackgroundPickers.kitchenCheerful(box, box)}
        style={styles.sceneArt}
        imageStyle={styles.sceneArtImage}
      >
        <View style={styles.sceneWashSoft} />
        <Image source={characterAssets.neli.poses.cooking} style={[styles.tileCookNeli, { width: 158.4 * k, height: 208.8 * k, bottom: -4 * k }]} resizeMode="contain" />
      </ImageBackground>
    );
  }
  if (kind === 'animal') {
    return (
      <ImageBackground source={roomBackgroundPickers.feedAnimalsJungle(box, box)} style={styles.sceneArt} imageStyle={styles.sceneArtImage}>
        <Image source={neliWorldAssets.animals.monkey} style={[styles.tileMonkey, { width: 280 * k, height: 280 * k, top: -10 * k }]} resizeMode="contain" />
        <View style={styles.sceneWashSoft} />
      </ImageBackground>
    );
  }
  if (kind === 'paint') {
    return (
      <View style={styles.paintingCardScene}>
        <Image source={neliWorldAssets.painting.cardBunny} style={styles.paintingCardImage} resizeMode="contain" />
      </View>
    );
  }
  if (kind === 'memory') {
    return (
      <View style={styles.memoryScene}>
        {MEMORY_CARD_BACKS.map((b, i) => (
          <View
            key={i}
            style={[
              styles.memoryCardBack,
              {
                width: 76 * k, height: 76 * k, borderRadius: 18 * k,
                backgroundColor: b.bg, transform: [{ rotate: b.rot }],
                ...(b.left != null ? { left: b.left * k } : { right: b.right! * k }),
                ...(b.top === 'mid' ? { top: '42%' as const, marginTop: -38 * k } : { top: (b.top as number) * k }),
              },
            ]}
          >
            <Text style={[styles.memoryCardMark, { fontSize: 34 * k }]}>?</Text>
          </View>
        ))}
        <Image source={characterAssets.lila.poses.thinkingAlt} style={[styles.memoryMascot, { width: 336.6 * k, height: 441 * k, bottom: -32.85 * k }]} resizeMode="contain" />
      </View>
    );
  }
  if (kind === 'color') return <View style={styles.art}>{[color, accent, '#22C55E', '#38BDF8'].map((c, i) => <View key={c} style={[styles.paintDot, { width: 30 * k, height: 30 * k, borderRadius: 15 * k, backgroundColor: c, left: (42 + (i % 2) * 38) * k, top: (24 + Math.floor(i / 2) * 38) * k }]} />)}</View>;
  if (kind === 'room') return <View style={styles.art}><View style={[styles.roof, { borderLeftWidth: 42 * k, borderRightWidth: 42 * k, borderBottomWidth: 38 * k, borderBottomColor: color }]} /><View style={[styles.house, { width: 70 * k, height: 48 * k, borderRadius: 12 * k }]} /><View style={[styles.door, { width: 18 * k, height: 28 * k, borderRadius: 7 * k, bottom: 23 * k, backgroundColor: accent }]} /></View>;
  if (kind === 'tracing') return <View style={styles.art}><Image source={neliWorldAssets.ui.brush} style={[styles.tileBrush, { width: 54 * k, height: 54 * k, left: 12 * k, bottom: 14 * k }]} resizeMode="contain" /><Image source={neliWorldAssets.ui.book} style={[styles.tileWater, { width: 58 * k, height: 58 * k, left: 50 * k }]} resizeMode="contain" /></View>;
  if (kind === 'firstTracing') return (
    <View style={styles.firstTracingScene}>
      <View style={styles.firstTracingBoard}>
        <View style={styles.firstTracingBoardInner}>
          <View style={styles.firstTracingGuide} />
          <View style={styles.firstTracingStartDot} />
          <View style={styles.firstTracingPencil}>
            <View style={styles.firstTracingPencilBody} />
            <View style={styles.firstTracingPencilTip} />
          </View>
          <View style={styles.firstTracingStroke} />
          <View style={styles.firstTracingArrow} />
        </View>
      </View>
      <View style={styles.firstTracingLetterChip}><Text style={styles.firstTracingLetter}>ا</Text></View>
    </View>
  );
  if (kind === 'alphabet') return (
    <View style={styles.alphabetScene}>
      <View style={[styles.alphabetBubble, styles.alphabetBubbleAlef]}><Text style={styles.alphabetLetter}>ا</Text></View>
      <View style={[styles.alphabetBubble, styles.alphabetBubbleBe]}><Text style={styles.alphabetLetter}>ب</Text></View>
      <View style={[styles.alphabetBubble, styles.alphabetBubblePe]}><Text style={styles.alphabetLetter}>پ</Text></View>
    </View>
  );
  if (kind === 'alphabetTrain') return (
    <View style={styles.alphabetTrainScene}>
      <View style={styles.alphabetTrainRow}>
        <View style={styles.alphabetTrainCarSlot}>
          <Image source={neliWorldAssets.ui.toyWagon} style={styles.alphabetTrainWagonImg} resizeMode="contain" />
          <View style={styles.alphabetTrainLetterBadge}>
            <Text style={styles.alphabetTrainLetter}>ا</Text>
          </View>
        </View>
        <View style={styles.alphabetTrainCarSlot}>
          <Image source={neliWorldAssets.ui.toyWagon} style={styles.alphabetTrainWagonImg} resizeMode="contain" />
          <Image source={characterAssets.dara.poses.reading} style={styles.alphabetTrainRiderImg} resizeMode="contain" />
        </View>
        <View style={styles.alphabetTrainCarSlot}>
          <Image source={neliWorldAssets.ui.toyWagon} style={styles.alphabetTrainWagonImg} resizeMode="contain" />
          <View style={[styles.alphabetTrainLetterBadge, styles.alphabetTrainLetterBadgeAlt]}>
            <Text style={styles.alphabetTrainLetter}>ب</Text>
          </View>
        </View>
        <View style={styles.alphabetTrainEngineWrap}>
          <Image source={neliWorldAssets.ui.trainHead} style={styles.alphabetTrainEngineImg} resizeMode="contain" />
          <View style={styles.alphabetTrainSmokeCloud} />
          <View style={[styles.alphabetTrainSmokeCloud, styles.alphabetTrainSmokeCloudTwo]} />
        </View>
      </View>
    </View>
  );
  if (kind === 'video') return (
    <View style={styles.videoScene}>
      <View style={[styles.videoFrame, styles.videoFrameBack]} />
      <View style={styles.videoFrame}>
        <View style={styles.videoPlay}>
          <Text style={styles.videoPlayText}>▶</Text>
        </View>
      </View>
      <View style={[styles.videoSpark, styles.videoSparkOne]} />
      <View style={[styles.videoSpark, styles.videoSparkTwo]} />
    </View>
  );
  if (kind === 'solarPuzzle') return (
    <ImageBackground source={SOLAR_SYSTEM_BACKGROUND} style={styles.sceneArt} imageStyle={[styles.sceneArtImage, styles.solarPreviewBg]}>
      <View style={styles.solarPreviewWash} />
      <View style={styles.solarPreviewRow}>
        <Image source={solarPlanetSource('mercury')} style={[styles.solarPreviewPlanetFlex, styles.solarPreviewMercury]} resizeMode="contain" />
        <Image source={solarPlanetSource('venus')} style={[styles.solarPreviewPlanetFlex, styles.solarPreviewVenus]} resizeMode="contain" />
        <Image source={solarPlanetSource('earth')} style={[styles.solarPreviewPlanetFlex, styles.solarPreviewEarthRow]} resizeMode="contain" />
        <Image source={solarPlanetSource('mars')} style={[styles.solarPreviewPlanetFlex, styles.solarPreviewMarsRow]} resizeMode="contain" />
      </View>
    </ImageBackground>
  );
  if (kind === 'count') {
    const owlW = 242.55 * k;
    const owlH = 299.25 * k;
    return (
      <View style={styles.countingScene}>
        <View style={[styles.countingGlow, { width: 190 * k, height: 190 * k, borderRadius: 95 * k, right: -42 * k, top: -72 * k }]} />
        <View style={[styles.countingBadge, { left: 11.5 * k, top: 6.5 * k, width: 61 * k, height: 61 * k, backgroundColor: '#38BDF8' }]}>
          <Text style={[styles.countingNumber, { fontSize: 38 * k, transform: [{ rotate: '-10deg' }] }]}>۱</Text>
        </View>
        <View style={[styles.countingBadge, { left: 74.5 * k, top: 39.5 * k, width: 45 * k, height: 45 * k, backgroundColor: '#A855F7' }]}>
          <Text style={[styles.countingNumber, { fontSize: 28 * k, color: '#FFE45E', transform: [{ rotate: '8deg' }] }]}>۲</Text>
        </View>
        <View style={[styles.countingBadge, { left: 17.5 * k, top: 86.5 * k, width: 50 * k, height: 50 * k, backgroundColor: '#FFE45E' }]}>
          <Text style={[styles.countingNumber, { fontSize: 31 * k, color: '#1E3A8A', transform: [{ rotate: '7deg' }] }]}>۳</Text>
        </View>
        <View style={[styles.countingBadge, { right: 12 * k, top: 6 * k, width: 42 * k, height: 42 * k, backgroundColor: '#22C55E' }]}>
          <Text style={[styles.countingNumber, { fontSize: 26 * k, color: '#FFE45E', transform: [{ rotate: '12deg' }] }]}>۵</Text>
        </View>
        <View style={[styles.countingBadge, { left: 93 * k, bottom: 35 * k, width: 38 * k, height: 38 * k, backgroundColor: '#EC4899' }]}>
          <Text style={[styles.countingNumber, { fontSize: 24 * k, transform: [{ rotate: '-8deg' }] }]}>۷</Text>
        </View>
        <Image
          source={characterAssets.aidin.poses.waving}
          style={[styles.countingOwl, { width: owlW, height: owlH, marginLeft: -owlW / 2, marginTop: -owlH / 2 }]}
          resizeMode="contain"
        />
      </View>
    );
  }
  if (kind === 'culture') return <View style={styles.art}><View style={[styles.book, { backgroundColor: color }]} /><View style={[styles.sun, { backgroundColor: accent }]} /></View>;
  return <View style={styles.art}><View style={[styles.face, { backgroundColor: color }]}><View style={styles.eyeLeft} /><View style={styles.eyeRight} /><View style={styles.smile} /></View><View style={[styles.chat, { backgroundColor: accent }]} /></View>;
}

export default function GamesScreen() {
  const { navigate } = useNav();
  const { lang, selectedCharacterId } = useContext(AppContext);
  const { width, height } = useWindowDimensions();
  const responsive = useResponsive();
  const ui = Math.min(width / 390, height / 844);
  const isFa = lang === 'fa' || lang === 'ar';
  const gap = Math.round(Math.max(20, Math.round(24 * ui)) * 1.5);
  const edgePad = Math.round(responsive.horizontalPadding * 1.2 * 1.2);
  const columns = 3;
  const usableWidth = responsive.contentWidth - edgePad * 2 - gap * (columns - 1);
  const cardWRaw = usableWidth / columns - Math.max(2, Math.round(4 * ui));
  const cardSize = cardWRaw;
  const visibleGames = GAMES.filter(game => !game.hidden);
  const rows: (typeof GAMES)[] = [];
  for (let i = 0; i < visibleGames.length; i += columns) {
    rows.push(visibleGames.slice(i, i + columns));
  }

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#35217E' }]} />
      <TopBar title="Games" titleFa="بازی‌ها" dark showClose onBack={() => navigate({ name: 'Home' })} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: edgePad }]} showsVerticalScrollIndicator={false}>
        <View style={{ gap }}>
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={[styles.grid, { columnGap: gap, justifyContent: 'center' }]}>
              {row.map(game => (
                <TouchableOpacity key={game.id} style={[styles.card, { width: cardSize, height: cardSize, borderRadius: Math.max(44, Math.round(48 * ui)) }]} onPress={() => navigate(game.route)} activeOpacity={0.88}>
                  <View style={[styles.thumb, { backgroundColor: '#AEEBFF', borderRadius: Math.max(44, Math.round(48 * ui)) }]}>
                    <TileArt kind={game.kind} color={game.color} accent={game.accent} characterId={selectedCharacterId} box={cardSize} />
                    <View style={styles.cardShade} />
                    <View style={styles.cardTextBand}>
                      <Text style={[styles.cardTitle, { fontFamily: ff(lang, 'black'), fontSize: Math.max(17.42, Math.round(18.88 * ui)) }, dir(lang), { textAlign: 'center' }]} numberOfLines={2}>{isFa ? game.fa : game.en}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#35217E' },
  scroll: { paddingHorizontal: 14, paddingBottom: 36 },
  group: { marginBottom: 18 },
  groupTitle: { color: '#FFFFFF', fontSize: 19, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { backgroundColor: '#AEEBFF', borderRadius: 34, overflow: 'hidden', borderWidth: 0, shadowColor: '#170736', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 8 },
  thumb: { flex: 1, overflow: 'hidden' },
  cardShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 57.6, backgroundColor: 'rgba(37,16,92,0.62)' },
  cardTextBand: { position: 'absolute', left: 10, right: 10, bottom: 9, minHeight: 33.88, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { color: '#FFFFFF', fontSize: 23.23, textAlign: 'center' },
  art: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  memoryScene: { flex: 1, width: '100%', height: '100%', backgroundColor: '#6C4EFF', alignItems: 'center', justifyContent: 'center' },
  memoryCardBack: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#140A36',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  memoryCardMark: { color: '#FFFFFF', fontSize: 34, fontFamily: 'Vazirmatn_800ExtraBold' },
  memoryCardBackOne: { left: 14, top: 24, backgroundColor: '#38BDF8', transform: [{ rotate: '-10deg' }] },
  memoryCardBackTwo: { right: 14, top: 34, backgroundColor: '#FACC15', transform: [{ rotate: '10deg' }] },
  memoryCardBackThree: { left: 4, top: '42%', marginTop: -38, backgroundColor: '#F472B6', transform: [{ rotate: '-6deg' }] },
  memoryMascot: { width: 336.6, height: 441, position: 'absolute', bottom: -32.85, alignSelf: 'center' },
  sceneArt: { flex: 1, width: '100%', height: '100%', overflow: 'hidden' },
  sceneArtImage: { width: '100%', height: '100%' },
  sceneArtImageCover: { width: '100%', height: '100%' },
  sceneWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(44, 20, 74, 0.10)' },
  sceneWashSoft: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.06)' },
  paintingCardScene: { flex: 1, width: '100%', height: '100%', backgroundColor: '#18C977', alignItems: 'center', justifyContent: 'center' },
  paintingCardImage: { width: '100%', height: '100%' },
  solarPreviewBg: { width: '100%', height: '100%', transform: [{ scale: 1.1 }] },
  solarPreviewWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2, 8, 32, 0.08)' },
  solarPreviewRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: '4%',
  },
  solarPreviewPlanetFlex: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  solarPreviewMercury: { width: '15.015%', aspectRatio: 1 },
  solarPreviewVenus: { width: '21.945%', aspectRatio: 1 },
  solarPreviewEarthRow: { width: '24.255%', aspectRatio: 1 },
  solarPreviewMarsRow: { width: '18.48%', aspectRatio: 1 },
  solarCardArt: { backgroundColor: '#07112D' },
  solarCardStarOne: { position: 'absolute', left: 28, top: 34, width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF7C2' },
  solarCardStarTwo: { position: 'absolute', right: 42, top: 26, width: 5, height: 5, borderRadius: 3, backgroundColor: '#BFEAFF' },
  solarCardStarThree: { position: 'absolute', right: 72, bottom: 58, width: 3, height: 3, borderRadius: 2, backgroundColor: '#FFEFB0' },
  sceneNeliLarge: { position: 'absolute', width: 398, height: 520, alignSelf: 'center', bottom: -42, transform: [{ translateX: 66 }, { translateY: 52 }] },
  sceneGiraffe: { position: 'absolute', width: 322.9, height: 409.5, alignSelf: 'center', bottom: -55 },
  tileGiraffe: { position: 'absolute', width: 172.2, height: 218.4, alignSelf: 'center', bottom: -14 },
  tileBrush: { position: 'absolute', width: 54, height: 54, left: 12, bottom: 14, transform: [{ rotate: '-18deg' }] },
  tileWater: { position: 'absolute', width: 58, height: 58, left: 50, bottom: 0 },
  firstTracingScene: { flex: 1, width: '100%', height: '100%', backgroundColor: '#FFF0DE', alignItems: 'center', justifyContent: 'center' },
  firstTracingBoard: {
    width: '78%',
    aspectRatio: 1,
    borderRadius: 20,
    backgroundColor: '#FFFDF8',
    borderWidth: 4,
    borderColor: '#F4C6D5',
    shadowColor: '#170736',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  firstTracingBoardInner: {
    width: '82%',
    height: '82%',
    borderRadius: 18,
    backgroundColor: '#FFFDF8',
    borderWidth: 2,
    borderColor: '#F3D7E2',
    overflow: 'hidden',
  },
  firstTracingGuide: {
    position: 'absolute',
    left: '50%',
    top: '13%',
    bottom: '13%',
    width: 20,
    marginLeft: -10,
    borderRadius: 12,
    backgroundColor: 'rgba(243, 162, 188, 0.28)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.86)',
    borderStyle: 'dashed',
  },
  firstTracingStartDot: {
    position: 'absolute',
    left: '50%',
    top: '12%',
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: 8,
    backgroundColor: '#2ECC71',
  },
  firstTracingPencil: {
    position: 'absolute',
    left: '50%',
    top: '22%',
    width: 42,
    height: 42,
    marginLeft: -21,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '0deg' }],
  },
  firstTracingPencilBody: {
    width: 22,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FFE36E',
    transform: [{ rotate: '90deg' }],
  },
  firstTracingPencilTip: {
    position: 'absolute',
    bottom: 8,
    width: 8,
    height: 10,
    borderRadius: 3,
    backgroundColor: '#F08A5D',
  },
  firstTracingStroke: {
    position: 'absolute',
    left: '50%',
    top: '16%',
    width: 22,
    height: '62%',
    marginLeft: -11,
    borderRadius: 12,
    backgroundColor: '#FF7AA7',
  },
  firstTracingArrow: {
    position: 'absolute',
    left: '50%',
    top: '24%',
    width: 0,
    height: 0,
    marginLeft: -8,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 13,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#49A6FF',
  },
  firstTracingLetterChip: {
    position: 'absolute',
    right: 16,
    top: 18,
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#6C4EFF',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#170736',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  firstTracingLetter: { fontFamily: ff('fa', 'black'), color: '#FFFFFF', fontSize: 28, lineHeight: 34 },
  alphabetScene: { flex: 1, width: '100%', height: '100%', backgroundColor: '#F5ECFF', alignItems: 'center', justifyContent: 'center' },
  alphabetBubble: { position: 'absolute', width: 78, height: 78, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: '#FFFFFF', shadowColor: '#170736', shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  alphabetBubbleAlef: { left: 18, top: 20, backgroundColor: '#8B5CF6', transform: [{ rotate: '-8deg' }] },
  alphabetBubbleBe: { right: 18, top: 34, backgroundColor: '#38BDF8', transform: [{ rotate: '8deg' }] },
  alphabetBubblePe: { bottom: 24, backgroundColor: '#F97316', transform: [{ rotate: '-2deg' }] },
  alphabetLetter: { fontFamily: ff('fa', 'black'), color: '#FFFFFF', fontSize: 34 },
  alphabetTrainScene: { flex: 1, width: '100%', height: '100%', backgroundColor: '#71D571', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  alphabetTrainRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 3,
  },
  alphabetTrainEngineWrap: {
    width: '41%',
    // Overlaps back onto the last wagon by the amount the engine grew, so
    // the row still totals 100% width instead of overflowing the box —
    // same coupling-overlap idea as the `marginRight: -overlap` pattern
    // used for real wagons in TrainCar/IntroTrainStrip elsewhere.
    marginLeft: '-7%',
    aspectRatio: 1535 / 1024,
    position: 'relative',
    // The trainHead artwork has extra empty space baked in above its wheels
    // compared to the wagon artwork, so it sits a bit high without this —
    // same fix used for this same engine/wagon pairing in IntroTrainStrip.
    transform: [{ translateY: 3 }],
    // Extra requested downward nudge. Uses `top` (a normal relative-position
    // offset, resolved against the row's height) rather than a percentage
    // inside `transform` — percentage translateY crashes at runtime on this
    // RN version (see the note further down by alphabetTrainLetter).
    top: '3%',
  },
  alphabetTrainEngineImg: { width: '100%', height: '100%' },
  alphabetTrainSmokeCloud: {
    position: 'absolute',
    // ~61% along the engine is roughly where the smokestack sits on this
    // artwork — same horizontal anchor IntroTrainStrip/TrainCar use for
    // their smoke puffs on this same trainHead asset.
    left: '64%',
    top: '-25%',
    width: '20%',
    aspectRatio: 1,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  alphabetTrainSmokeCloudTwo: {
    left: '76%',
    top: '-50%',
    width: '14%',
  },
  alphabetTrainCarSlot: {
    width: '22%',
    aspectRatio: 16 / 9,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  alphabetTrainWagonImg: { width: '100%', height: '100%' },
  alphabetTrainLetterBadge: {
    position: 'absolute',
    top: '-118%',
    width: '70%',
    aspectRatio: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EC4899',
  },
  alphabetTrainLetterBadgeAlt: { backgroundColor: '#0EA5E9' },
  alphabetTrainRiderImg: {
    position: 'absolute',
    top: '-211%',
    width: '250%',
    height: '227%',
  },
  alphabetTrainLetter: { fontFamily: ff('fa', 'black'), color: '#FFFFFF', fontSize: 16 },
  videoScene: { flex: 1, width: '100%', height: '100%', backgroundColor: '#FCE7F3', alignItems: 'center', justifyContent: 'center' },
  videoFrame: { position: 'absolute', width: 138, height: 96, borderRadius: 24, backgroundColor: '#EC4899', borderWidth: 6, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#170736', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  videoFrameBack: { backgroundColor: '#38BDF8', transform: [{ rotate: '-9deg' }, { translateX: -18 }, { translateY: -10 }] },
  videoPlay: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#FACC15', alignItems: 'center', justifyContent: 'center' },
  videoPlayText: { color: '#25105C', fontSize: 22, marginLeft: 4 },
  videoSpark: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: '#FACC15' },
  videoSparkOne: { left: 22, top: 22 },
  videoSparkTwo: { right: 24, bottom: 36, backgroundColor: '#38BDF8' },
  tileCookNeli: { position: 'absolute', width: 158.4, height: 208.8, alignSelf: 'center', bottom: -4 },
  tileMonkey: { position: 'absolute', left: 0, top: -10, width: 280, height: 280, transform: [{ rotate: '-8deg' }] },
  tileAnimal: { position: 'absolute', width: 94, height: 94, right: 16, bottom: 6 },
  tileCarrot: { position: 'absolute', width: 60, height: 60, left: 18, bottom: 12, transform: [{ rotate: '-10deg' }] },
  solarSun: {
    position: 'absolute',
    left: 16,
    top: 18,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FDBA74',
    shadowColor: '#FDBA74',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  solarOrbit: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 56,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  solarOrbitSmall: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 92,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  solarPlanet: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  solarPlanetOne: { left: 68, top: 46, backgroundColor: '#CBD5E1' },
  solarPlanetTwo: { left: 136, top: 46, backgroundColor: '#38BDF8' },
  solarPlanetThree: { left: 210, top: 42, width: 28, height: 28, borderRadius: 14, backgroundColor: '#F59E0B' },
  solarLabelWrap: {
    position: 'absolute',
    right: 14,
    bottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(8, 13, 34, 0.5)',
  },
  solarLabel: { color: '#FFFFFF', fontSize: 12 },
  face: { width: 72, height: 68, borderRadius: 34 },
  eyeLeft: { position: 'absolute', left: 22, top: 25, width: 7, height: 7, borderRadius: 4, backgroundColor: '#1B1238' },
  eyeRight: { position: 'absolute', right: 22, top: 25, width: 7, height: 7, borderRadius: 4, backgroundColor: '#1B1238' },
  smile: { position: 'absolute', bottom: 18, alignSelf: 'center', width: 24, height: 12, borderBottomWidth: 3, borderBottomColor: '#1B1238', borderRadius: 12 },
  chat: { position: 'absolute', right: 32, top: 17, width: 36, height: 26, borderRadius: 13 },
  tooth: { width: 56, height: 68, borderRadius: 23, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#DDE7F2' },
  brush: { position: 'absolute', width: 78, height: 14, borderRadius: 7, bottom: 27, transform: [{ rotate: '-22deg' }] },
  pot: { width: 78, height: 58, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  soup: { position: 'absolute', top: 43, width: 60, height: 16, borderRadius: 8 },
  paintDot: { position: 'absolute', width: 30, height: 30, borderRadius: 15 },
  bowl: { position: 'absolute', bottom: 18, width: 64, height: 24, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  shirt: { width: 54, height: 64, borderRadius: 17 },
  sleeveA: { position: 'absolute', left: 39, top: 32, width: 24, height: 34, borderRadius: 13, transform: [{ rotate: '35deg' }] },
  sleeveB: { position: 'absolute', right: 39, top: 32, width: 24, height: 34, borderRadius: 13, transform: [{ rotate: '-35deg' }] },
  roof: { width: 0, height: 0, borderLeftWidth: 42, borderRightWidth: 42, borderBottomWidth: 38, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  house: { width: 70, height: 48, borderRadius: 12, backgroundColor: '#FFFFFF' },
  door: { position: 'absolute', bottom: 23, width: 18, height: 28, borderRadius: 7 },
  countingScene: { flex: 1, width: '100%', height: '100%', backgroundColor: '#FD52D4', overflow: 'hidden' },
  countingGlow: { position: 'absolute', backgroundColor: '#FFE45E' },
  countingBadge: { position: 'absolute', borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  countingOwl: { position: 'absolute', top: '50%', left: '50%' },
  countingNumber: { fontFamily: 'Vazirmatn_800ExtraBold', color: '#FFFFFF' },
  book: { width: 68, height: 74, borderRadius: 14 },
  sun: { position: 'absolute', right: 41, top: 25, width: 32, height: 32, borderRadius: 16 },
  tileTalkCharacter: { position: 'absolute', right: 10, bottom: -10, width: 92, height: 120 },
  tileDressCharacter: { position: 'absolute', right: 10, bottom: 2, width: 230, height: 300 },
});




