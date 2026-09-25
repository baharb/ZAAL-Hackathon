import React, { useContext, useRef, useState } from 'react';
import { Animated, Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import * as Haptics from 'expo-haptics';
import { AppContext } from '../store/AppContext';
import { useSpeech } from '../hooks/useSpeech';
import TopBar from '../components/TopBar';
import CharacterAvatar from '../components/CharacterAvatar';
import { C } from '../theme/colors';
import { dir, ff } from '../theme/fonts';
import { neliWorldAssets } from '../assets/neliWorldAssets';

type PageKind = 'hero' | 'garden' | 'horse' | 'home' | 'night' | 'nowruz' | 'river' | 'friend';
type Story = {
  id: string;
  title: string;
  titleFa: string;
  color: string;
  accent: string;
  pages: { kind: PageKind; text: string; textFa: string }[];
};

const STORIES: Story[] = [
  {
    id: 'neli-nowruz',
    title: 'Neli and Nowruz',
    titleFa: 'نلی و نوروز',
    color: '#22C55E',
    accent: '#FACC15',
    pages: [
      { kind: 'home', text: 'Neli woke up to a bright spring morning.', textFa: 'نلی در یک صبح روشن بهاری بیدار شد.' },
      { kind: 'nowruz', text: 'She helped set the Haft-Sin table with sabzeh and apples.', textFa: 'او کمک کرد سفره هفت‌سین را با سبزه و سیب بچینند.' },
      { kind: 'friend', text: 'Neli said: Happy Nowruz, my friends!', textFa: 'نلی گفت: نوروز مبارک، دوستان من!' },
      { kind: 'garden', text: 'The flowers opened, and everyone smiled.', textFa: 'گل‌ها باز شدند و همه لبخند زدند.' },
    ],
  },
  {
    id: 'little-rakhsh',
    title: 'Little Rakhsh',
    titleFa: 'رخش کوچولو',
    color: '#FB923C',
    accent: '#38BDF8',
    pages: [
      { kind: 'horse', text: 'Little Rakhsh wanted to run like the wind.', textFa: 'رخش کوچولو می‌خواست مثل باد بدود.' },
      { kind: 'hero', text: 'He practiced every day with a brave heart.', textFa: 'او هر روز با دل شجاع تمرین می‌کرد.' },
      { kind: 'river', text: 'One day, he helped a friend cross the river.', textFa: 'یک روز به دوستی کمک کرد از رودخانه بگذرد.' },
      { kind: 'friend', text: 'Rakhsh learned that kindness is real strength.', textFa: 'رخش یاد گرفت مهربانی، قدرت واقعی است.' },
    ],
  },
  {
    id: 'sleepy-star',
    title: 'The Sleepy Star',
    titleFa: 'ستاره خواب‌آلود',
    color: '#A855F7',
    accent: '#FDE68A',
    pages: [
      { kind: 'night', text: 'A small star blinked softly in the sky.', textFa: 'یک ستاره کوچک آرام در آسمان چشمک زد.' },
      { kind: 'home', text: 'It looked through Neli’s window and whispered good night.', textFa: 'از پنجره نلی نگاه کرد و آرام گفت شب بخیر.' },
      { kind: 'garden', text: 'The garden became quiet and calm.', textFa: 'باغ آرام و ساکت شد.' },
      { kind: 'night', text: 'Sleep well, little one. Tomorrow is a new adventure.', textFa: 'خوب بخواب کوچولو. فردا یک ماجرای تازه است.' },
    ],
  },
  {
    id: 'blue-river',
    title: 'The Blue River',
    titleFa: 'رودخانه آبی',
    color: '#38BDF8',
    accent: '#22C55E',
    pages: [
      { kind: 'river', text: 'The blue river sang a soft song.', textFa: 'رودخانه آبی یک آواز آرام خواند.' },
      { kind: 'garden', text: 'Trees listened, flowers danced, and birds rested.', textFa: 'درخت‌ها گوش دادند، گل‌ها رقصیدند و پرنده‌ها استراحت کردند.' },
      { kind: 'friend', text: 'Neli learned the word آب means water.', textFa: 'نلی یاد گرفت کلمه آب یعنی water.' },
      { kind: 'river', text: 'The river said: take care of nature.', textFa: 'رودخانه گفت: از طبیعت مراقبت کن.' },
    ],
  },
];

function StoryArt({ kind, color, accent }: { kind: PageKind; color: string; accent: string }) {
  if (kind === 'home') {
    return (
      <ImageBackground source={neliWorldAssets.rooms.bedroom} style={styles.artStage} imageStyle={styles.artImage}>
          <CharacterAvatar characterId="neli" size={140} floating={false} style={styles.bookNeli} />
      </ImageBackground>
    );
  }
  if (kind === 'garden' || kind === 'friend') {
    return (
      <ImageBackground source={neliWorldAssets.rooms.gardenWide} style={styles.artStage} imageStyle={styles.artImage}>
          <CharacterAvatar characterId="neli" size={140} floating={false} style={styles.bookNeli} />
        <Image source={kind === 'friend' ? neliWorldAssets.animals.rabbit : neliWorldAssets.ui.star} style={styles.bookSmall} resizeMode="contain" />
      </ImageBackground>
    );
  }
  if (kind === 'nowruz') {
    return (
      <ImageBackground source={neliWorldAssets.rooms.gardenWide} style={styles.artStage} imageStyle={styles.artImage}>
        <Image source={neliWorldAssets.persianFoods.sabziPolo} style={styles.bookFood} resizeMode="contain" />
        <Image source={neliWorldAssets.foods.apple} style={styles.bookSmall} resizeMode="contain" />
      </ImageBackground>
    );
  }
  if (kind === 'night') {
    return (
      <ImageBackground source={neliWorldAssets.rooms.bedroom} style={styles.artStage} imageStyle={styles.artImage}>
        <View style={styles.nightWash} />
        <Image source={neliWorldAssets.ui.star} style={styles.bookFood} resizeMode="contain" />
      </ImageBackground>
    );
  }
  if (kind === 'river') {
    return (
      <ImageBackground source={neliWorldAssets.rooms.gardenWide} style={styles.artStage} imageStyle={styles.artImage}>
        <Image source={neliWorldAssets.foods.water} style={styles.bookFood} resizeMode="contain" />
      </ImageBackground>
    );
  }
  if (kind === 'horse' || kind === 'hero') {
    return (
      <ImageBackground source={neliWorldAssets.rooms.gardenWide} style={styles.artStage} imageStyle={styles.artImage}>
        <Image source={neliWorldAssets.giraffe.happy} style={styles.bookNeli} resizeMode="contain" />
      </ImageBackground>
    );
  }
  if (kind === 'nowruz') {
    return (
      <View style={styles.artStage}>
        <View style={[styles.table, { backgroundColor: accent }]} />
        <View style={[styles.sabzeh, { backgroundColor: color }]} />
        <View style={[styles.egg, { backgroundColor: '#EC4899', left: 76 }]} />
        <View style={[styles.egg, { backgroundColor: '#38BDF8', right: 76 }]} />
      </View>
    );
  }
  if (kind === 'horse') {
    return (
      <View style={styles.artStage}>
        <View style={[styles.horseBody, { backgroundColor: color }]} />
        <View style={[styles.horseHead, { backgroundColor: color }]} />
        <View style={[styles.horseMane, { backgroundColor: accent }]} />
        <View style={styles.horseLegA} />
        <View style={styles.horseLegB} />
      </View>
    );
  }
  if (kind === 'river') {
    return (
      <View style={styles.artStage}>
        <View style={[styles.sun, { backgroundColor: accent }]} />
        <View style={[styles.river, { backgroundColor: color }]} />
        <View style={[styles.tree, { backgroundColor: '#22C55E', left: 50 }]} />
        <View style={[styles.tree, { backgroundColor: '#16A34A', right: 54 }]} />
      </View>
    );
  }
  if (kind === 'night') {
    return (
      <View style={[styles.artStage, { backgroundColor: '#33205F' }]}>
        <View style={[styles.moon, { backgroundColor: accent }]} />
        {[0, 1, 2, 3, 4].map(i => <View key={i} style={[styles.star, { left: 45 + i * 45, top: 38 + (i % 2) * 42 }]} />)}
      </View>
    );
  }
  if (kind === 'garden') {
    return (
      <View style={styles.artStage}>
        <View style={[styles.sun, { backgroundColor: accent }]} />
        {[0, 1, 2].map(i => (
          <View key={i} style={[styles.flower, { left: 70 + i * 60 }]}>
            <View style={[styles.flowerPetal, { backgroundColor: i % 2 ? '#EC4899' : color }]} />
            <View style={styles.flowerStem} />
          </View>
        ))}
        <View style={styles.grass} />
      </View>
    );
  }
  if (kind === 'home') {
    return (
      <View style={styles.artStage}>
        <View style={[styles.houseRoof, { borderBottomColor: color }]} />
        <View style={styles.houseBody} />
        <View style={[styles.houseDoor, { backgroundColor: accent }]} />
      </View>
    );
  }
  return (
    <View style={styles.artStage}>
      <View style={[styles.friendFace, { backgroundColor: color }]}>
        <View style={styles.eyeLeft} />
        <View style={styles.eyeRight} />
        <View style={styles.smile} />
      </View>
      <View style={[styles.friendBubble, { backgroundColor: accent }]} />
    </View>
  );
}

export default function AudiobooksScreen() {
  const { lang } = useContext(AppContext);
  const { speakFarsiOnly, speakInLang, stop } = useSpeech();
  const [active, setActive] = useState<Story | null>(null);
  const [page, setPage] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const { width, height } = useWindowDimensions();
  const ui = Math.min(width / 390, height / 844);
  const isFa = lang === 'fa' || lang === 'ar';

  const speakPage = (story: Story, pageIndex: number) => {
    const p = story.pages[pageIndex];
    stop();
    speakFarsiOnly(p.textFa, () => {
      if (!isFa) setTimeout(() => speakInLang(p.text, lang), 250);
    });
  };

  const openStory = (story: Story) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActive(story);
    setPage(0);
    setTimeout(() => speakPage(story, 0), 300);
  };

  const changePage = (next: number) => {
    if (!active || next < 0 || next >= active.pages.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    setPage(next);
    setTimeout(() => speakPage(active, next), 220);
  };

  if (active) {
    const p = active.pages[page];
    return (
      <View style={styles.root}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#35217E' }]} />
        <TopBar title={active.title} titleFa={active.titleFa} showBack dark onBack={() => { stop(); setActive(null); }} />
        <Animated.View style={[styles.bookPage, { opacity: fade, padding: Math.max(14, Math.round(18 * ui)), gap: Math.max(14, Math.round(18 * ui)) }]}>
          <StoryArt kind={p.kind} color={active.color} accent={active.accent} />
          <View style={[styles.textCard, { padding: Math.max(14, Math.round(18 * ui)), borderRadius: Math.max(24, Math.round(28 * ui)) }]}>
            <Text style={[styles.textFa, { fontFamily: ff('fa', 'black'), fontSize: Math.max(22, Math.round(24 * ui)), lineHeight: Math.max(32, Math.round(38 * ui)) }]}>{p.textFa}</Text>
            {!isFa ? <Text style={[styles.textEn, { fontFamily: ff(lang, 'regular'), fontSize: Math.max(13, Math.round(15 * ui)), lineHeight: Math.max(20, Math.round(23 * ui)), marginTop: Math.max(8, Math.round(10 * ui)) }, dir(lang)]}>{p.text}</Text> : null}
          </View>
        </Animated.View>
        <View style={[styles.nav, { padding: Math.max(16, Math.round(20 * ui)), paddingBottom: Math.max(24, Math.round(34 * ui)) }]}>
          <TouchableOpacity style={[styles.navBtn, page === 0 && styles.off]} disabled={page === 0} onPress={() => changePage(page - 1)}>
            <Text style={styles.navText}>{'<'}</Text>
          </TouchableOpacity>
          <View style={styles.dots}>
            {active.pages.map((_, i) => <View key={i} style={[styles.dot, i === page && styles.dotOn]} />)}
          </View>
          <TouchableOpacity style={[styles.navBtn, page === active.pages.length - 1 && styles.off]} disabled={page === active.pages.length - 1} onPress={() => changePage(page + 1)}>
            <Text style={styles.navText}>{'>'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#35217E' }]} />
      <TopBar title="Story Books" titleFa="کتاب قصه" showBack dark />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { padding: Math.max(16, Math.round(20 * ui)), borderRadius: Math.max(26, Math.round(30 * ui)), marginBottom: Math.max(12, Math.round(14 * ui)) }]}>
          <Text style={[styles.kicker, { fontFamily: ff(lang, 'bold'), fontSize: Math.max(12, Math.round(13 * ui)), marginBottom: Math.max(5, Math.round(7 * ui)) }, dir(lang)]}>
            {isFa ? 'قصه‌های کوتاه فارسی' : 'Short Persian storybooks'}
          </Text>
          <Text style={[styles.title, { fontFamily: ff(lang, 'black'), fontSize: Math.max(26, Math.round(30 * ui)), lineHeight: Math.max(33, Math.round(38 * ui)) }, dir(lang)]}>
            {isFa ? 'یک کتاب را باز کن' : 'Open a book'}
          </Text>
        </View>
        {STORIES.map(story => (
          <TouchableOpacity key={story.id} style={styles.storyCard} onPress={() => openStory(story)} activeOpacity={0.88}>
            <View style={[styles.cover, { backgroundColor: story.color, width: Math.max(94, Math.round(104 * ui)), height: Math.max(94, Math.round(104 * ui)), borderRadius: Math.max(20, Math.round(24 * ui)) }]}>
              <StoryArt kind={story.pages[0].kind} color={story.color} accent={story.accent} />
            </View>
            <View style={styles.storyCopy}>
              <Text style={[styles.storyFa, { fontFamily: ff('fa', 'black') }]}>{story.titleFa}</Text>
              <Text style={styles.storyEn}>{story.title}</Text>
              <Text style={styles.storyMeta}>{story.pages.length} {isFa ? 'صفحه' : 'pages'}</Text>
            </View>
            <Text style={styles.chevron}>{'>'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4EEFF' },
  scroll: { padding: 16, paddingBottom: 34 },
  hero: { borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.94)' },
  kicker: { color: C.purple, marginBottom: 7 },
  title: { color: C.textDark },
  storyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 12,
    shadowColor: '#20124D',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  cover: { overflow: 'hidden' },
  storyCopy: { flex: 1 },
  storyFa: { color: C.textDark, fontSize: 19 },
  storyEn: { fontFamily: ff('fa', 'bold'), color: C.textMid, fontSize: 13, marginTop: 2 },
  storyMeta: { fontFamily: ff('fa', 'bold'), color: C.textLight, fontSize: 11, marginTop: 8 },
  chevron: { fontFamily: ff('fa', 'black'), color: C.purple, fontSize: 24 },
  bookPage: { flex: 1, justifyContent: 'center' },
  textCard: { borderRadius: 28, backgroundColor: '#FFFFFF', padding: 18 },
  textFa: { color: C.textDark, fontSize: 24, lineHeight: 38, textAlign: 'right', writingDirection: 'rtl' },
  textEn: { color: C.textMid, fontSize: 15, lineHeight: 23, marginTop: 10 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 34 },
  navBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.35 },
  navText: { fontFamily: ff('fa', 'black'), color: C.purpleDeep, fontSize: 24 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotOn: { width: 28, backgroundColor: C.yellow },
  artStage: { width: '100%', height: 230, borderRadius: 26, backgroundColor: '#E9F7FF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  artImage: { width: '100%', height: '100%' },
  bookNeli: { position: 'absolute', right: 42, bottom: -12, width: 140, height: 182 },
  bookSmall: { position: 'absolute', left: 42, bottom: 34, width: 82, height: 82 },
  bookFood: { width: 142, height: 142 },
  nightWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,12,60,0.46)' },
  table: { position: 'absolute', bottom: 58, width: 190, height: 22, borderRadius: 11 },
  sabzeh: { width: 72, height: 58, borderRadius: 20 },
  egg: { position: 'absolute', bottom: 76, width: 32, height: 43, borderRadius: 20 },
  horseBody: { width: 118, height: 62, borderRadius: 32 },
  horseHead: { position: 'absolute', right: 76, top: 70, width: 52, height: 58, borderRadius: 28 },
  horseMane: { position: 'absolute', right: 108, top: 70, width: 18, height: 60, borderRadius: 9 },
  horseLegA: { position: 'absolute', bottom: 52, left: 117, width: 15, height: 54, borderRadius: 8, backgroundColor: '#7C2D12' },
  horseLegB: { position: 'absolute', bottom: 52, right: 119, width: 15, height: 54, borderRadius: 8, backgroundColor: '#7C2D12' },
  sun: { position: 'absolute', top: 28, right: 38, width: 48, height: 48, borderRadius: 24 },
  river: { position: 'absolute', bottom: 48, width: 280, height: 56, borderRadius: 30, transform: [{ rotate: '-7deg' }] },
  tree: { position: 'absolute', bottom: 82, width: 48, height: 66, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  moon: { width: 72, height: 72, borderRadius: 36 },
  star: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF' },
  flower: { position: 'absolute', bottom: 52, width: 34, height: 80, alignItems: 'center' },
  flowerPetal: { width: 34, height: 34, borderRadius: 17 },
  flowerStem: { width: 7, height: 46, borderRadius: 4, backgroundColor: '#22C55E' },
  grass: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 64, backgroundColor: '#B7F7C8' },
  houseRoof: { width: 0, height: 0, borderLeftWidth: 78, borderRightWidth: 78, borderBottomWidth: 70, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  houseBody: { width: 130, height: 88, borderRadius: 18, backgroundColor: '#FFFFFF' },
  houseDoor: { position: 'absolute', bottom: 45, width: 32, height: 50, borderRadius: 12 },
  friendFace: { width: 130, height: 120, borderRadius: 60 },
  friendBubble: { position: 'absolute', top: 38, right: 64, width: 64, height: 46, borderRadius: 23 },
  eyeLeft: { position: 'absolute', left: 39, top: 45, width: 14, height: 14, borderRadius: 7, backgroundColor: '#1B1238' },
  eyeRight: { position: 'absolute', right: 39, top: 45, width: 14, height: 14, borderRadius: 7, backgroundColor: '#1B1238' },
  smile: { position: 'absolute', bottom: 31, alignSelf: 'center', width: 44, height: 20, borderBottomWidth: 5, borderBottomColor: '#1B1238', borderRadius: 20 },
});
