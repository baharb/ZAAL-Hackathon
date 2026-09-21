import React, { useContext, useState } from 'react';
import {
  Image,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { WebView } from 'react-native-webview';
import TopBar from '../components/TopBar';
import CharacterAvatar from '../components/CharacterAvatar';
import { characterAssets } from '../assets/characterAssets';
import { AppContext } from '../store/AppContext';
import { C } from '../theme/colors';
import { dir, ff } from '../theme/fonts';
import { neliWorldAssets } from '../assets/neliWorldAssets';
import { useResponsive } from '../theme/responsive';

type SceneKind = 'wake' | 'brush' | 'breakfast' | 'play' | 'sleep' | 'haftsin' | 'family' | 'jungle' | 'sea';
type VideoCategory = 'all' | 'stories' | 'daily' | 'animals' | 'songs';

type VideoItem = {
  id: string;
  fa: string;
  en: string;
  blurbFa: string;
  blurbEn: string;
  category: VideoCategory;
  kind: SceneKind;
  color: string;
  accent: string;
  playlistIndex: number;
  duration: string;
  soft: string;
};

const PLAYLIST_URL = 'https://youtube.com/playlist?list=PLdgmue3C3ak-RH938CRvQLm96jLBr-JUu&si=HCfZFORwPa-VvdW-';

const CATEGORIES: Array<{ id: VideoCategory; fa: string; en: string }> = [
  { id: 'all', fa: 'همه', en: 'All' },
  { id: 'stories', fa: 'قصه‌ها', en: 'Stories' },
  { id: 'daily', fa: 'روزانه', en: 'Daily' },
  { id: 'animals', fa: 'حیوانات', en: 'Animals' },
  { id: 'songs', fa: 'آهنگ‌ها', en: 'Songs' },
];

const VIDEOS: VideoItem[] = [
  {
    id: 'neli-day',
    fa: 'روز نلی',
    en: "Neli's Day",
    blurbFa: 'یک قصه کوتاه و شیرین از روز نلی',
    blurbEn: 'A short and friendly story about Neli’s day.',
    category: 'stories',
    kind: 'wake',
    color: '#6C4EFF',
    accent: '#FACC15',
    playlistIndex: 1,
    duration: '02:15',
    soft: '#F1E8FF',
  },
  {
    id: 'brush-time',
    fa: 'مسواک زدن',
    en: 'Brush Time',
    blurbFa: 'با نلی مسواک بزن و لبخند بزن',
    blurbEn: 'Brush together with Neli and keep smiling.',
    category: 'daily',
    kind: 'brush',
    color: '#38BDF8',
    accent: '#6C4EFF',
    playlistIndex: 2,
    duration: '01:48',
    soft: '#E0F2FE',
  },
  {
    id: 'breakfast-fun',
    fa: 'صبحانه',
    en: 'Breakfast Fun',
    blurbFa: 'یک ویدیوی خوشمزه برای صبحانه',
    blurbEn: 'A yummy little breakfast video.',
    category: 'daily',
    kind: 'breakfast',
    color: '#F59E0B',
    accent: '#FACC15',
    playlistIndex: 3,
    duration: '02:05',
    soft: '#FEF3C7',
  },
  {
    id: 'play-time',
    fa: 'وقت بازی',
    en: 'Play Time',
    blurbFa: 'بازی و شادی با رنگ‌های شاد',
    blurbEn: 'Playful movement and colorful fun.',
    category: 'songs',
    kind: 'play',
    color: '#EC4899',
    accent: '#FDE68A',
    playlistIndex: 4,
    duration: '02:22',
    soft: '#FCE7F3',
  },
  {
    id: 'nowruz-story',
    fa: 'نوروز',
    en: 'Nowruz Celebration',
    blurbFa: 'قصه‌ای از نوروز و جشن بهار',
    blurbEn: 'A bright story about Nowruz and spring.',
    category: 'stories',
    kind: 'haftsin',
    color: '#22C55E',
    accent: '#EC4899',
    playlistIndex: 5,
    duration: '03:11',
    soft: '#DCFCE7',
  },
  {
    id: 'family-time',
    fa: 'خانواده',
    en: 'Family Time',
    blurbFa: 'با خانواده بخند و همراه شو',
    blurbEn: 'A warm little family story to enjoy together.',
    category: 'stories',
    kind: 'family',
    color: '#14B8A6',
    accent: '#FDE68A',
    playlistIndex: 6,
    duration: '02:34',
    soft: '#CCFBF1',
  },
  {
    id: 'jungle-animals',
    fa: 'حیوانات جنگل',
    en: 'Jungle Animals',
    blurbFa: 'در جنگل با حیوانات همراه شو',
    blurbEn: 'Meet friendly animals in the jungle.',
    category: 'animals',
    kind: 'jungle',
    color: '#FB923C',
    accent: '#38BDF8',
    playlistIndex: 7,
    duration: '02:18',
    soft: '#FFF1E2',
  },
  {
    id: 'ocean-friends',
    fa: 'دوستان دریا',
    en: 'Ocean Friends',
    blurbFa: 'یک ویدیوی آبی و آرام برای بچه‌ها',
    blurbEn: 'A calm ocean video for little learners.',
    category: 'animals',
    kind: 'sea',
    color: '#0EA5E9',
    accent: '#38BDF8',
    playlistIndex: 8,
    duration: '02:41',
    soft: '#E0F2FE',
  },
];

function videoUrl(index: number) {
  return `${PLAYLIST_URL}&index=${index}`;
}

function Character({ color, small = false }: { color: string; small?: boolean }) {
  const size = small ? 78 : 118;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.charHair, { width: size * 0.84, height: size * 0.35 }]} />
      <View style={[styles.charFace, { width: size * 0.8, height: size * 0.74, borderRadius: size * 0.36, backgroundColor: color }]}>
        <View style={[styles.eyeLeft, { left: size * 0.24, top: size * 0.28 }]} />
        <View style={[styles.eyeRight, { right: size * 0.24, top: size * 0.28 }]} />
        <View style={[styles.smile, { bottom: size * 0.2 }]} />
      </View>
    </View>
  );
}

function ShowArt({ kind, color, accent, characterId }: { kind: SceneKind; color: string; accent: string; characterId: string }) {
  if (kind === 'wake' || kind === 'sleep') {
    return (
      <ImageBackground source={neliWorldAssets.rooms.bedroom} style={styles.scene} imageStyle={styles.sceneImage}>
        {kind === 'sleep' ? <View style={styles.nightWash} /> : null}
        <CharacterAvatar characterId={characterId} size={122} />
      </ImageBackground>
    );
  }

  if (kind === 'brush') {
    return (
      <ImageBackground source={neliWorldAssets.rooms.brushTeethBathroom} style={styles.scene} imageStyle={styles.sceneImage}>
        <Image source={characterAssets.lila.poses.bigSmile} style={styles.showGiraffe} resizeMode="contain" />
        <Image source={neliWorldAssets.bathroom.toothbrush} style={styles.showSmall} resizeMode="contain" />
      </ImageBackground>
    );
  }

  if (kind === 'breakfast') {
    return (
      <ImageBackground source={neliWorldAssets.rooms.kitchenWide} style={styles.scene} imageStyle={styles.sceneImage}>
        <Image source={neliWorldAssets.foods.egg} style={styles.showFood} resizeMode="contain" />
        <Image source={neliWorldAssets.kitchen.plate} style={styles.showPlate} resizeMode="contain" />
      </ImageBackground>
    );
  }

  if (kind === 'haftsin') {
    return (
      <ImageBackground source={neliWorldAssets.rooms.gardenWide} style={styles.scene} imageStyle={styles.sceneImage}>
        <Image source={neliWorldAssets.persianFoods.sabziPolo} style={styles.showFood} resizeMode="contain" />
        <Image source={neliWorldAssets.foods.apple} style={styles.showSmall} resizeMode="contain" />
      </ImageBackground>
    );
  }

  if (kind === 'family' || kind === 'play') {
    return (
      <ImageBackground source={neliWorldAssets.rooms.gardenWide} style={styles.scene} imageStyle={styles.sceneImage}>
        <CharacterAvatar characterId={characterId} size={122} />
        <Image source={neliWorldAssets.animals.rabbit} style={styles.showSmall} resizeMode="contain" />
      </ImageBackground>
    );
  }

  if (kind === 'jungle') {
    return (
      <ImageBackground source={neliWorldAssets.rooms.feedAnimalsJungle} style={styles.scene} imageStyle={styles.sceneImage}>
        <Image source={neliWorldAssets.animals.elephant} style={styles.showGiraffe} resizeMode="contain" />
      </ImageBackground>
    );
  }

  if (kind === 'sea') {
    return (
      <View style={[styles.scene, { backgroundColor: '#8EEBFF' }]}>
        <Image source={neliWorldAssets.foods.fish} style={styles.showFood} resizeMode="contain" />
        <Image source={neliWorldAssets.foods.water} style={styles.showSmall} resizeMode="contain" />
      </View>
    );
  }

  return (
    <View style={styles.scene}>
      <Character color={color} />
      <View style={[styles.ball, { backgroundColor: accent }]} />
    </View>
  );
}

export default function VideoLibraryScreen() {
  const { lang, selectedCharacterId } = useContext(AppContext);
  const responsive = useResponsive();
  const [activeCategory, setActiveCategory] = useState<VideoCategory>('all');
  const [selectedId, setSelectedId] = useState(VIDEOS[0].id);
  const [playerVisible, setPlayerVisible] = useState(false);
  const isFa = lang === 'fa' || lang === 'ar';

  const visibleVideos = activeCategory === 'all' ? VIDEOS : VIDEOS.filter(video => video.category === activeCategory);
  const selectedVideo = visibleVideos.find(video => video.id === selectedId) ?? visibleVideos[0] ?? VIDEOS[0];

  const gap = 12;
  const minCardWidth = 160;
  const columns = Math.max(2, Math.min(3, Math.floor((responsive.contentWidth - responsive.horizontalPadding * 2 + gap) / (minCardWidth + gap))));
  const cardW = (responsive.contentWidth - responsive.horizontalPadding * 2 - gap * (columns - 1)) / columns;

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#35217E' }]} />
      <TopBar title="Videos" titleFa="ویدیوها" showClose dark />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: responsive.horizontalPadding }]} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={[styles.heroArtWrap, { backgroundColor: selectedVideo.soft }]}>
            <ShowArt kind={selectedVideo.kind} color={selectedVideo.color} accent={selectedVideo.accent} characterId={selectedCharacterId} />
            <View style={[styles.durationPill, { backgroundColor: selectedVideo.accent }]}>
              <Text style={styles.durationText}>{selectedVideo.duration}</Text>
            </View>
          </View>

          <View style={styles.heroBody}>
            <View style={styles.heroPill}>
              <Text style={[styles.heroPillText, { fontFamily: ff(lang, 'black') }]}>{isFa ? 'ویدیوی انتخاب‌شده' : 'Selected video'}</Text>
            </View>

            <Text style={[styles.heroTitle, { fontFamily: ff(lang, 'black') }, dir(lang)]}>
              {isFa ? selectedVideo.fa : selectedVideo.en}
            </Text>
            <Text style={[styles.heroSub, { fontFamily: ff(lang, 'bold') }, dir(lang)]}>
              {isFa ? selectedVideo.blurbFa : selectedVideo.blurbEn}
            </Text>

            <Text style={[styles.heroHint, { fontFamily: ff(lang, 'bold') }, dir(lang)]}>
              {isFa ? 'روی هر کارت بزن تا ویدیو انتخاب و پخش شود.' : 'Tap a card to select and play it.'}
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {CATEGORIES.map(category => {
            const active = category.id === activeCategory;
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveCategory(category.id);
                  const firstVisible = category.id === 'all' ? VIDEOS[0] : VIDEOS.find(video => video.category === category.id);
                  if (firstVisible) setSelectedId(firstVisible.id);
                }}
                activeOpacity={0.88}
              >
                <Text style={[styles.chipText, { fontFamily: ff(lang, 'black') }, active && styles.chipTextActive]}>
                  {isFa ? category.fa : category.en}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={[styles.grid, { gap }]}>
          {visibleVideos.map(video => {
            const selected = video.id === selectedVideo.id;
            return (
              <TouchableOpacity
                key={video.id}
                style={[
                  styles.card,
                  { width: cardW },
                  selected && styles.cardSelected,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedId(video.id);
                  setPlayerVisible(true);
                }}
                activeOpacity={0.9}
              >
                <View style={[styles.thumb, { backgroundColor: video.soft }]}>
                  <ShowArt kind={video.kind} color={video.color} accent={video.accent} characterId={selectedCharacterId} />
                  <View style={[styles.cardDuration, { backgroundColor: video.accent }]}>
                    <Text style={styles.cardDurationText}>{video.duration}</Text>
                  </View>
                  <View style={styles.playBadge}>
                    <Text style={styles.playBadgeText}>▶</Text>
                  </View>
                </View>
                <Text style={[styles.cardTitle, { fontFamily: ff(lang, 'black') }, dir(lang)]} numberOfLines={2}>
                  {isFa ? video.fa : video.en}
                </Text>
                <Text style={[styles.cardSub, { fontFamily: ff(lang, 'bold') }, dir(lang)]} numberOfLines={2}>
                  {isFa ? video.blurbFa : video.blurbEn}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>

      <Modal visible={playerVisible} animationType="fade" transparent onRequestClose={() => setPlayerVisible(false)}>
        <View style={styles.playerOverlay}>
          <View style={styles.playerCard}>
            <View style={styles.playerHeader}>
              <TouchableOpacity style={styles.closeButton} onPress={() => setPlayerVisible(false)} activeOpacity={0.85}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
              <View style={styles.playerHeaderText}>
                <Text style={[styles.playerTitle, { fontFamily: ff(lang, 'black') }, dir(lang)]}>
                  {isFa ? selectedVideo.fa : selectedVideo.en}
                </Text>
                <Text style={[styles.playerSub, { fontFamily: ff(lang, 'bold') }, dir(lang)]}>
                  {isFa ? 'پخش داخل برنامه' : 'Playing inside the app'}
                </Text>
              </View>
            </View>
            <View style={styles.webWrap}>
              <WebView
                source={{ uri: `https://www.youtube.com/embed/videoseries?list=${PLAYLIST_URL.split('list=')[1].split('&')[0]}&index=${selectedVideo.playlistIndex}&autoplay=1&rel=0&modestbranding=1` }}
                allowsFullscreenVideo
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState
                originWhitelist={['https://www.youtube.com', 'https://www.youtube-nocookie.com']}
                setSupportMultipleWindows={false}
                onShouldStartLoadWithRequest={request => {
                  try {
                    const host = new URL(request.url).hostname;
                    // Keep playback confined to YouTube's own domains so a child
                    // can't be navigated out to an arbitrary external site.
                    return host === 'www.youtube.com' || host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtube-nocookie.com' || host.endsWith('.youtube-nocookie.com') || host === 'www.google.com' || host.endsWith('.googlevideo.com');
                  } catch {
                    return false;
                  }
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#35217E' },
  scroll: { paddingBottom: 30 },
  hero: {
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    padding: 12,
    shadowColor: '#170736',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  heroArtWrap: {
    height: 230,
    borderRadius: 26,
    overflow: 'hidden',
  },
  durationPill: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    minWidth: 58,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationText: { color: '#FFFFFF', fontSize: 12, fontFamily: ff('en', 'black') },
  heroBody: { paddingHorizontal: 6, paddingTop: 14, paddingBottom: 4 },
  heroPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#F1E8FF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 8,
  },
  heroPillText: { color: '#6C4EFF', fontSize: 12 },
  heroTitle: { color: '#1A0050', fontSize: 28, lineHeight: 35 },
  heroSub: { color: '#5D5875', fontSize: 14, lineHeight: 20, marginTop: 6 },
  heroHint: { color: '#7A748C', fontSize: 12, marginTop: 10 },
  chipsRow: { gap: 10, paddingTop: 16, paddingBottom: 8 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  chipActive: { backgroundColor: '#FACC15' },
  chipText: { color: '#FFFFFF', fontSize: 13 },
  chipTextActive: { color: '#1A0050' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  card: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 10,
    shadowColor: '#140A36',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.11,
    shadowRadius: 14,
    elevation: 4,
    marginBottom: 12,
  },
  cardSelected: {
    borderWidth: 3,
    borderColor: '#FACC15',
    transform: [{ translateY: -2 }],
  },
  thumb: {
    height: 138,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 10,
  },
  cardDuration: {
    position: 'absolute',
    left: 10,
    top: 10,
    minWidth: 48,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignItems: 'center',
  },
  cardDurationText: { color: '#FFFFFF', fontSize: 11, fontFamily: ff('en', 'black') },
  playBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadgeText: { color: '#6C4EFF', fontSize: 14, marginLeft: 2 },
  cardTitle: { color: '#1A0050', fontSize: 15, lineHeight: 20 },
  cardSub: { color: '#6B5A89', fontSize: 12, lineHeight: 16, marginTop: 4 },
  playerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 6, 28, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  playerCard: {
    width: '100%',
    maxWidth: 840,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 12,
    gap: 12,
  },
  playerHeaderText: { flex: 1 },
  playerTitle: { color: '#1A0050', fontSize: 20, lineHeight: 26 },
  playerSub: { color: '#6B5A89', fontSize: 12, marginTop: 2 },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: { color: '#6C4EFF', fontSize: 28, marginTop: -2, lineHeight: 28 },
  webWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  scene: { width: '100%', height: '100%', borderRadius: 28, backgroundColor: '#E9F7FF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sceneImage: { width: '100%', height: '100%' },
  nightWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(30,20,80,0.42)' },
  showGiraffe: { position: 'absolute', right: 40, bottom: -8, width: 150, height: 190 },
  showSmall: { position: 'absolute', left: 44, bottom: 32, width: 86, height: 86 },
  showFood: { width: 150, height: 150 },
  showPlate: { position: 'absolute', right: 48, bottom: 26, width: 124, height: 96 },
  charHair: { position: 'absolute', top: 8, borderRadius: 34, backgroundColor: C.yellow },
  charFace: { borderWidth: 6, borderColor: '#FFFFFF' },
  eyeLeft: { position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: '#1B1238' },
  eyeRight: { position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: '#1B1238' },
  smile: { position: 'absolute', alignSelf: 'center', width: 30, height: 14, borderBottomWidth: 4, borderBottomColor: '#1B1238', borderRadius: 14 },
  ball: { position: 'absolute', bottom: 58, right: 70, width: 48, height: 48, borderRadius: 24 },
});
