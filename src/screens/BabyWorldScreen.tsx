import React, { useContext, useState } from 'react';
import { Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import * as Haptics from 'expo-haptics';
import { AppContext } from '../store/AppContext';
import { useNav } from '../store/NavContext';
import { useSpeech } from '../hooks/useSpeech';
import TopBar from '../components/TopBar';
import CharacterAvatar from '../components/CharacterAvatar';
import { C } from '../theme/colors';
import { dir, ff } from '../theme/fonts';
import { neliWorldAssets, roomBackgroundPickers } from '../assets/neliWorldAssets';

type TabId = 'lullabies' | 'sounds' | 'stories' | 'words';

const TABS: { id: TabId; en: string; fa: string; color: string }[] = [
  { id: 'lullabies', en: 'Lullabies', fa: 'لالایی', color: '#A855F7' },
  { id: 'sounds', en: 'Calm', fa: 'آرامش', color: '#38BDF8' },
  { id: 'stories', en: 'Stories', fa: 'قصه', color: '#FACC15' },
  { id: 'words', en: 'Words', fa: 'کلمات', color: '#EC4899' },
];

const LULLABIES = [
  { fa: 'لالا لالا، گل کوچولو، چشماتو ببند آروم آروم.', en: 'Sleep softly, little flower, close your eyes slowly.', color: '#A855F7' },
  { fa: 'ماه اومده پشت پنجره، ستاره می‌گه شب بخیر.', en: 'The moon is by the window, the star says good night.', color: '#6C4EFF' },
  { fa: 'مامان کنارته، بابا کنارته، دنیا امن و آرومه.', en: 'Mama is near, Baba is near, the world is safe and calm.', color: '#EC4899' },
];

const SOUNDS = [
  { fa: 'باران آرام', en: 'Soft rain', color: '#38BDF8', pattern: 'rain' },
  { fa: 'موج دریا', en: 'Ocean waves', color: '#0EA5E9', pattern: 'wave' },
  { fa: 'نسیم باغ', en: 'Garden wind', color: '#22C55E', pattern: 'leaf' },
  { fa: 'زمزمه فارسی', en: 'Persian hum', color: '#A855F7', pattern: 'hum' },
];

const STORIES = [
  { fa: 'خرگوش کوچولو در چمن نرم خوابید.', en: 'The little bunny slept in soft grass.', color: '#FDE68A' },
  { fa: 'ستاره کوچک تمام شب مراقب بچه بود.', en: 'The little star watched over the baby all night.', color: '#A78BFA' },
  { fa: 'ابر نرم از آسمان گذشت و خواب شیرین آورد.', en: 'A soft cloud passed by and brought sweet dreams.', color: '#93C5FD' },
];

const WORDS = [
  { fa: 'مامان', en: 'Mama', color: '#EC4899' },
  { fa: 'بابا', en: 'Baba', color: '#38BDF8' },
  { fa: 'آب', en: 'Water', color: '#0EA5E9' },
  { fa: 'شیر', en: 'Milk', color: '#F8FAFC' },
  { fa: 'خواب', en: 'Sleep', color: '#A855F7' },
  { fa: 'بغل', en: 'Hug', color: '#FB923C' },
  { fa: 'گل', en: 'Flower', color: '#FF80C0' },
  { fa: 'ماه', en: 'Moon', color: '#6C4EFF' },
  { fa: 'خانه', en: 'Home', color: '#22C55E' },
];

function SoftArt({ color, type = 'moon' }: { color: string; type?: string }) {
  if (type === 'wave') {
    return <View style={styles.softArt}><View style={[styles.wave, { backgroundColor: color }]} /><View style={[styles.waveSmall, { backgroundColor: '#FFFFFF' }]} /></View>;
  }
  if (type === 'leaf') {
    return <View style={styles.softArt}><View style={[styles.leaf, { backgroundColor: color }]} /><View style={[styles.leafSmall, { backgroundColor: '#86EFAC' }]} /></View>;
  }
  if (type === 'rain') {
    return <View style={styles.softArt}>{[0, 1, 2].map(i => <View key={i} style={[styles.drop, { left: 28 + i * 18, backgroundColor: color }]} />)}</View>;
  }
  if (type === 'word') {
    return <View style={[styles.wordBubble, { backgroundColor: color }]} />;
  }
  return <View style={styles.softArt}><View style={[styles.moon, { backgroundColor: color }]} /><View style={styles.star} /></View>;
}

export default function BabyWorldScreen() {
  const { lang } = useContext(AppContext);
  const { navigate } = useNav();
  const { speakFarsiOnly, speakInLang, stop } = useSpeech();
  const { width, height } = useWindowDimensions();
  const [tab, setTab] = useState<TabId>('lullabies');
  const isFa = lang === 'fa' || lang === 'ar';
  const heroSource = roomBackgroundPickers.bedroom(width, height);

  const speak = (fa: string, en: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    stop();
    speakFarsiOnly(fa, () => {
      if (!isFa) setTimeout(() => speakInLang(en, lang), 240);
    });
  };

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#161033' }]} />
      <TopBar title="Baby World" titleFa="دنیای کوچولو" showBack dark />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ImageBackground source={heroSource} style={styles.hero} imageStyle={styles.heroImage}>
          <View style={styles.heroWash} />
          <CharacterAvatar characterId="neli" size={142} floating={false} style={styles.heroNeli} />
          <Text style={[styles.heroTitle, { fontFamily: ff(lang, 'black') }, dir(lang)]}>
            {isFa ? 'آرام، ساده، فارسی' : 'Calm, simple Persian'}
          </Text>
          <Text style={[styles.heroSub, { fontFamily: ff(lang, 'regular') }, dir(lang)]}>
            {isFa ? 'برای بچه‌های کوچک‌تر؛ صدا، قصه و کلمه‌های اول.' : 'For little ones: voice, stories, and first words.'}
          </Text>
        </ImageBackground>

        <TouchableOpacity style={styles.talkCard} onPress={() => navigate({ name: 'ConversationGame' })} activeOpacity={0.88}>
          <ImageBackground source={heroSource} style={styles.talkScene} imageStyle={styles.talkSceneImage}>
            <View style={styles.talkSceneWash} />
            <Image source={neliWorldAssets.foods.water} style={styles.talkSceneWater} resizeMode="contain" />
            <Image source={neliWorldAssets.ui.voice} style={styles.talkSceneVoice} resizeMode="contain" />
            <CharacterAvatar characterId="neli" size={120} floating={false} style={styles.talkSceneNeli} />
          </ImageBackground>
          <View style={styles.talkCopyRow}>
            <View style={styles.talkCopy}>
              <Text style={[styles.talkTitle, { fontFamily: ff(lang, 'black') }, dir(lang)]}>
                {isFa ? 'گفت‌وگو و بازی' : 'Talk & Play'}
              </Text>
              <Text style={[styles.talkSub, { fontFamily: ff(lang, 'regular') }, dir(lang)]}>
                {isFa ? 'جمله کوتاه فارسی بشنو و انتخاب کن.' : 'Hear short Persian and choose.'}
              </Text>
            </View>
            <Text style={styles.arrow}>{'>'}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.tabs}>
          {TABS.map(t => (
            <TouchableOpacity key={t.id} style={[styles.tab, tab === t.id && { backgroundColor: t.color }]} onPress={() => setTab(t.id)}>
              <Text style={[styles.tabText, tab === t.id && styles.tabTextOn]}>
                {isFa ? t.fa : t.en}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'lullabies' ? (
          <View style={styles.list}>
            {LULLABIES.map((item, i) => (
              <TouchableOpacity key={i} style={styles.rowCard} onPress={() => speak(item.fa, item.en)}>
                <SoftArt color={item.color} />
                <View style={styles.rowCopy}>
                  <Text style={[styles.rowFa, { fontFamily: ff('fa', 'black') }]}>{item.fa}</Text>
                  {!isFa ? <Text style={styles.rowEn}>{item.en}</Text> : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {tab === 'sounds' ? (
          <View style={styles.grid}>
            {SOUNDS.map(item => (
              <TouchableOpacity key={item.en} style={styles.soundCard} onPress={() => speak(item.fa, `${item.en}. shhh... calm and soft.`)}>
                <SoftArt color={item.color} type={item.pattern} />
                <Text style={[styles.soundFa, { fontFamily: ff('fa', 'black') }]}>{item.fa}</Text>
                <Text style={styles.soundEn}>{item.en}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {tab === 'stories' ? (
          <View style={styles.list}>
            {STORIES.map((item, i) => (
              <TouchableOpacity key={i} style={styles.rowCard} onPress={() => speak(item.fa, item.en)}>
                <SoftArt color={item.color} />
                <View style={styles.rowCopy}>
                  <Text style={[styles.rowFa, { fontFamily: ff('fa', 'black') }]}>{item.fa}</Text>
                  {!isFa ? <Text style={styles.rowEn}>{item.en}</Text> : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {tab === 'words' ? (
          <View style={styles.wordGrid}>
            {WORDS.map(word => (
              <TouchableOpacity key={word.fa} style={styles.wordCard} onPress={() => speak(word.fa, word.en)}>
                <SoftArt color={word.color} type="word" />
                <Text style={[styles.wordFa, { fontFamily: ff('fa', 'black') }]}>{word.fa}</Text>
                <Text style={styles.wordEn}>{word.en}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#161033' },
  scroll: { padding: 16, paddingBottom: 34 },
  hero: { minHeight: 260, borderRadius: 32, padding: 20, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden', borderWidth: 6, borderColor: '#FFFFFF' },
  heroImage: { width: '100%', height: '100%' },
  heroWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(22,16,51,0.16)' },
  heroNeli: { position: 'absolute', top: 14, width: 142, height: 178 },
  heroTitle: { color: '#FFFFFF', fontSize: 28, lineHeight: 36, marginTop: 8, textAlign: 'center' },
  heroSub: { color: 'rgba(255,255,255,0.92)', fontSize: 14, lineHeight: 22, marginTop: 6, textAlign: 'center' },
  talkCard: { borderRadius: 28, overflow: 'hidden', marginTop: 14, backgroundColor: '#FFFFFF' },
  talkScene: { width: '100%', height: 156 },
  talkSceneImage: { width: '100%', height: '100%' },
  talkSceneWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(44, 20, 74, 0.10)' },
  talkSceneWater: { position: 'absolute', left: 12, bottom: 10, width: 60, height: 60 },
  talkSceneVoice: { position: 'absolute', left: 16, top: 12, width: 44, height: 44 },
  talkSceneNeli: { position: 'absolute', right: 10, bottom: -18, width: 120, height: 138 },
  talkCopyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  talkIcon: { width: 68, height: 68 },
  talkFace: { width: 68, height: 62, borderRadius: 31, backgroundColor: '#6C4EFF' },
  talkCopy: { flex: 1 },
  talkTitle: { color: C.textDark, fontSize: 18 },
  talkSub: { color: C.textMid, fontSize: 12, lineHeight: 18, marginTop: 3 },
  arrow: { fontFamily: ff('fa', 'black'), color: C.purple, fontSize: 24 },
  eyeLeft: { position: 'absolute', left: 20, top: 24, width: 7, height: 7, borderRadius: 4, backgroundColor: '#1B1238' },
  eyeRight: { position: 'absolute', right: 20, top: 24, width: 7, height: 7, borderRadius: 4, backgroundColor: '#1B1238' },
  smile: { position: 'absolute', bottom: 17, alignSelf: 'center', width: 22, height: 10, borderBottomWidth: 3, borderBottomColor: '#1B1238', borderRadius: 10 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 14 },
  tab: { flex: 1, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.78)', paddingVertical: 11, alignItems: 'center' },
  tabText: { fontFamily: ff('fa', 'black'), color: C.textDark, fontSize: 11 },
  tabTextOn: { color: '#FFFFFF' },
  list: { gap: 12 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 26, backgroundColor: '#FFFFFF', padding: 14 },
  rowCopy: { flex: 1 },
  rowFa: { color: C.textDark, fontSize: 17, lineHeight: 27, textAlign: 'right', writingDirection: 'rtl' },
  rowEn: { fontFamily: ff('fa', 'bold'), color: C.textMid, fontSize: 12, lineHeight: 18, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  soundCard: { width: '48%', minHeight: 158, borderRadius: 28, backgroundColor: '#FFFFFF', padding: 14, alignItems: 'center', justifyContent: 'center' },
  soundFa: { color: C.textDark, fontSize: 16, textAlign: 'center', marginTop: 8 },
  soundEn: { fontFamily: ff('fa', 'bold'), color: C.textMid, fontSize: 12, marginTop: 2, textAlign: 'center' },
  wordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  wordCard: { width: '31%', minHeight: 132, borderRadius: 24, backgroundColor: '#FFFFFF', padding: 10, alignItems: 'center', justifyContent: 'center' },
  wordFa: { color: C.textDark, fontSize: 18, textAlign: 'center', marginTop: 5 },
  wordEn: { fontFamily: ff('fa', 'bold'), color: C.textMid, fontSize: 11, textAlign: 'center' },
  softArt: { width: 74, height: 74, borderRadius: 24, backgroundColor: '#F4EEFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  moon: { width: 44, height: 44, borderRadius: 22 },
  star: { position: 'absolute', top: 18, right: 18, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF' },
  wave: { width: 82, height: 36, borderRadius: 18, transform: [{ rotate: '-12deg' }] },
  waveSmall: { position: 'absolute', width: 42, height: 12, borderRadius: 6 },
  leaf: { width: 46, height: 54, borderTopLeftRadius: 28, borderBottomRightRadius: 28 },
  leafSmall: { position: 'absolute', right: 17, top: 18, width: 22, height: 28, borderTopLeftRadius: 16, borderBottomRightRadius: 16 },
  drop: { position: 'absolute', top: 16, width: 12, height: 34, borderRadius: 8, transform: [{ rotate: '18deg' }] },
  wordBubble: { width: 50, height: 50, borderRadius: 25 },
});



