import React, { useContext, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import * as Haptics from 'expo-haptics';
import { AppContext } from '../store/AppContext';
import { useNav } from '../store/NavContext';
import { useSpeech } from '../hooks/useSpeech';
import { CONTENT } from '../data/content';
import { SECTIONS } from '../data/sections';
import { ff, dir } from '../theme/fonts';
import { C } from '../theme/colors';
import TopBar from '../components/TopBar';

const CULTURE_IDS = new Set(['poets', 'songs', 'culture', 'celebrations', 'iranfood', 'nowruz', 'iranart']);

const SECTION_PALETTES = [
  ['#6C4EFF', '#3DB8FF', '#FFE566'],
  ['#FF6B8A', '#FFD166', '#62D4C2'],
  ['#4ECDC4', '#6C4EFF', '#FF80C0'],
  ['#FF8C42', '#FFE566', '#5BDA7A'],
] as const;

const COLOR_MAP: Record<string, string> = {
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#22C55E',
  yellow: '#FACC15',
  orange: '#FB923C',
  purple: '#A855F7',
  pink: '#EC4899',
  black: '#111827',
  white: '#FFFFFF',
  brown: '#92400E',
  gray: '#9CA3AF',
  grey: '#9CA3AF',
  turquoise: '#2DD4BF',
};

function pickPalette(sectionId: string, index: number) {
  const seed = sectionId.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), index);
  return SECTION_PALETTES[seed % SECTION_PALETTES.length];
}

function numberFromName(en: string, fallback: number) {
  const names: Record<string, string> = {
    zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
    six: '6', seven: '7', eight: '8', nine: '9', ten: '10', hundred: '100',
  };
  return names[en.toLowerCase()] ?? String(fallback + 1);
}

function ShapeArt({ name, color }: { name: string; color: string }) {
  const lower = name.toLowerCase();
  if (lower.includes('triangle')) return <View style={[styles.triangle, { borderBottomColor: color }]} />;
  if (lower.includes('square')) return <View style={[styles.squareShape, { backgroundColor: color }]} />;
  if (lower.includes('rectangle')) return <View style={[styles.rectShape, { backgroundColor: color }]} />;
  if (lower.includes('diamond')) return <View style={[styles.diamond, { backgroundColor: color }]} />;
  if (lower.includes('star')) return <Text style={[styles.cleanSymbol, { color }]}>*</Text>;
  if (lower.includes('heart')) return <Text style={[styles.cleanSymbol, { color }]}>♥</Text>;
  return <View style={[styles.circleShape, { backgroundColor: color }]} />;
}

function Illustration({ sectionId, item, index }: { sectionId: string; item: any; index: number }) {
  const palette = pickPalette(sectionId, index);
  const en = String(item.en ?? '');
  const color = COLOR_MAP[en.toLowerCase()] ?? palette[0];

  if (sectionId === 'alphabet') {
    return (
      <View style={[styles.illWrap, { backgroundColor: palette[2] }]}>
        <View style={[styles.bigLetterBubble, { backgroundColor: palette[0] }]}>
          <Text style={styles.bigLetter}>{item.fa}</Text>
        </View>
        <View style={[styles.dot, styles.dotA, { backgroundColor: palette[1] }]} />
        <View style={[styles.dot, styles.dotB, { backgroundColor: '#fff' }]} />
      </View>
    );
  }

  if (sectionId === 'numbers') {
    return (
      <View style={[styles.illWrap, { backgroundColor: palette[1] }]}>
        <View style={[styles.numberPlate, { backgroundColor: '#fff' }]}>
          <Text style={[styles.numberText, { color: palette[0] }]}>{numberFromName(en, index)}</Text>
        </View>
        <View style={[styles.countDot, { left: 18, top: 18, backgroundColor: palette[2] }]} />
        <View style={[styles.countDot, { right: 18, bottom: 22, backgroundColor: palette[2] }]} />
      </View>
    );
  }

  if (sectionId === 'colors') {
    return (
      <View style={[styles.illWrap, { backgroundColor: '#F7F2FF' }]}>
        <View style={[styles.paintBlob, { backgroundColor: color }]} />
        <View style={[styles.paintDrop, { backgroundColor: palette[1] }]} />
        <View style={[styles.paintDropSmall, { backgroundColor: palette[2] }]} />
      </View>
    );
  }

  if (sectionId === 'shapes') {
    return (
      <View style={[styles.illWrap, { backgroundColor: '#FFF7D9' }]}>
        <ShapeArt name={en} color={color} />
      </View>
    );
  }

  if (['animals', 'pets', 'insects', 'sealife'].includes(sectionId)) {
    return (
      <View style={[styles.illWrap, { backgroundColor: '#EAFBF4' }]}>
        <View style={[styles.creatureBody, { backgroundColor: palette[0] }]} />
        <View style={[styles.creatureHead, { backgroundColor: palette[1] }]}>
          <View style={styles.eyeLeft} />
          <View style={styles.eyeRight} />
          <View style={styles.smile} />
        </View>
        <View style={[styles.earLeft, { backgroundColor: palette[2] }]} />
        <View style={[styles.earRight, { backgroundColor: palette[2] }]} />
      </View>
    );
  }

  if (['food', 'vegetables', 'fruits', 'iranfood', 'cooking'].includes(sectionId)) {
    return (
      <View style={[styles.illWrap, { backgroundColor: '#FFF3E6' }]}>
        <View style={styles.plate}>
          <View style={[styles.foodPiece, { backgroundColor: palette[0], left: 22, top: 22 }]} />
          <View style={[styles.foodPiece, { backgroundColor: palette[1], right: 22, top: 26 }]} />
          <View style={[styles.foodPieceSmall, { backgroundColor: palette[2], left: 45, bottom: 22 }]} />
        </View>
      </View>
    );
  }

  if (['transport', 'school', 'house', 'professions'].includes(sectionId)) {
    return (
      <View style={[styles.illWrap, { backgroundColor: '#EAF4FF' }]}>
        <View style={[styles.vehicleBody, { backgroundColor: palette[0] }]} />
        <View style={[styles.vehicleTop, { backgroundColor: palette[1] }]} />
        <View style={styles.wheelLeft} />
        <View style={styles.wheelRight} />
      </View>
    );
  }

  if (['nature', 'weather', 'nowruz', 'celebrations', 'iranart', 'poets', 'songs', 'culture'].includes(sectionId)) {
    return (
      <View style={[styles.illWrap, { backgroundColor: '#F1EEFF' }]}>
        <View style={[styles.sun, { backgroundColor: palette[2] }]} />
        <View style={[styles.hill, { backgroundColor: palette[1] }]} />
        <View style={[styles.book, { backgroundColor: palette[0] }]} />
        <View style={styles.bookLine} />
      </View>
    );
  }

  return (
    <View style={[styles.illWrap, { backgroundColor: '#F1EEFF' }]}>
      <View style={[styles.genericBlob, { backgroundColor: palette[0] }]} />
      <View style={[styles.genericBlobSmall, { backgroundColor: palette[1] }]} />
      <View style={[styles.genericSpark, { backgroundColor: palette[2] }]} />
    </View>
  );
}

export default function SectionScreen({ id }: { id: string }) {
  const { navigate } = useNav();
  const { lang, addStars, completeSection, addSticker } = useContext(AppContext);
  const { speakItem, speakFarsiOnly, speakInLang, stop } = useSpeech();
  const { width, height } = useWindowDimensions();
  const [learned, setLearned] = useState<string[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const ui = Math.min(width / 390, height / 844);

  const section = SECTIONS.find(s => s.id === id);
  const items = useMemo(() => ((CONTENT as any)[id] || []) as any[], [id]);
  const isCulture = CULTURE_IDS.has(id);
  const progress = items.length ? learned.length / items.length : 0;

  const handleCard = (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stop();
    setPlaying(item.fa);

    if (id === 'songs' && item.lyric_fa) {
      speakFarsiOnly(`${item.fa}. ${item.lyric_fa}`, () => {
        setTimeout(() => speakInLang(`${item.en}. ${item.lyric_en}`, 'en', () => setPlaying(null)), 500);
      });
    } else if (id === 'culture' && item.story_fa) {
      speakFarsiOnly(item.story_fa, () => {
        setTimeout(() => speakInLang(item.story_en ?? item.en, lang === 'fa' ? 'en' : lang, () => setPlaying(null)), 500);
      });
    } else if (isCulture) {
      speakFarsiOnly(item.fa, () => {
        setTimeout(() => speakInLang(item.en, 'en', () => setPlaying(null)), 350);
      });
    } else {
      speakItem(item, () => setPlaying(null));
    }

    if (!learned.includes(item.fa)) {
      setLearned(prev => [...prev, item.fa]);
      addStars(1);
    }
  };

  const handleFinish = () => {
    completeSection(id);
    addStars(5);
    addSticker('star');
    navigate({
      name: 'StickerReward',
      sticker: 'star',
      message: lang === 'fa' ? 'آفرین! این درس کامل شد.' : 'Great job! Lesson complete!',
    });
  };

  const title = section?.label ?? id;
  const allDone = learned.length === items.length && items.length > 0;

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#35217E' }]} />
      <TopBar title={title} titleFa={section?.labelFa} showBack dark />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.hero, { minHeight: Math.max(120, Math.round(126 * ui)), padding: Math.max(14, Math.round(18 * ui)), borderRadius: Math.max(24, Math.round(28 * ui)), gap: Math.max(10, Math.round(14 * ui)) }]}>
          <View style={styles.heroCopy}>
            <Text style={[styles.kicker, { fontFamily: ff(lang, 'bold'), fontSize: Math.max(12, Math.round(13 * ui)), marginBottom: Math.max(6, Math.round(8 * ui)) }, dir(lang)]}>
              {lang === 'fa' ? 'گوش کن، لمس کن، یاد بگیر' : 'Listen, tap, learn'}
            </Text>
            <Text style={[styles.heroTitle, { fontFamily: ff(lang, 'black'), fontSize: Math.max(24, Math.round(28 * ui)), lineHeight: Math.max(30, Math.round(34 * ui)) }, dir(lang)]}>
              {lang === 'fa' && section?.labelFa ? section.labelFa : title}
            </Text>
          </View>
          <View style={[styles.progressCard, { width: Math.max(84, Math.round(92 * ui)), height: Math.max(84, Math.round(92 * ui)), borderRadius: Math.max(24, Math.round(28 * ui)), padding: Math.max(8, Math.round(10 * ui)) }]}>
            <Text style={[styles.progressNumber, { fontSize: Math.max(17, Math.round(19 * ui)) }]}>{learned.length}/{items.length}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          {items.map((item, i) => {
            const done = learned.includes(item.fa);
            const isPlaying = playing === item.fa;
            return (
              <TouchableOpacity
                key={`${item.fa}-${i}`}
                style={[styles.card, done && styles.cardDone, isPlaying && styles.cardPlaying]}
                onPress={() => handleCard(item)}
                activeOpacity={0.86}
              >
                <Illustration sectionId={id} item={item} index={i} />
                <View style={styles.cardBody}>
                  <Text style={[styles.persian, { fontFamily: ff('fa', 'black') }]} numberOfLines={1}>
                    {item.fa}
                  </Text>
                  <Text style={styles.english} numberOfLines={1}>
                    {item.en}
                  </Text>
                  {(isPlaying && (item.lyric_fa || item.story_fa)) ? (
                    <Text style={[styles.storyText, { fontFamily: ff('fa', 'regular') }]} numberOfLines={3}>
                      {item.lyric_fa ?? item.story_fa}
                    </Text>
                  ) : null}
                  <View style={[styles.audioPill, isPlaying && styles.audioPillOn]}>
                    <Text style={styles.audioPillText}>
                      {isPlaying ? (lang === 'fa' ? 'در حال پخش' : 'Playing') : done ? (lang === 'fa' ? 'یاد گرفتم' : 'Learned') : (lang === 'fa' ? 'بشنو' : 'Hear')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {allDone ? (
        <TouchableOpacity style={styles.finishBtn} onPress={handleFinish} activeOpacity={0.9}>
          <Text style={[styles.finishTxt, { fontFamily: ff(lang, 'black') }]}>
            {lang === 'fa' ? 'جایزه را بگیر' : 'Collect reward'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0EEFF' },
  scroll: { padding: 16, paddingBottom: 120 },
  hero: { backgroundColor: 'rgba(255,255,255,0.94)', flexDirection: 'row', alignItems: 'center', shadowColor: '#20124D', shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  heroCopy: { flex: 1 },
  kicker: { color: C.purple, marginBottom: 8 },
  heroTitle: { color: C.textDark },
  progressCard: { backgroundColor: C.purpleLight, alignItems: 'center', justifyContent: 'center' },
  progressNumber: { fontFamily: ff('fa', 'black'), color: C.purpleDeep },
  progressTrack: { width: '100%', height: 8, borderRadius: 8, backgroundColor: '#D9D0FF', marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 8, backgroundColor: C.yellow },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  card: { width: '48%', backgroundColor: '#FFFFFF', overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.72)', shadowColor: '#20124D', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  cardDone: { borderColor: '#8BE39F', backgroundColor: '#F7FFF8' },
  cardPlaying: { borderColor: C.yellow, transform: [{ scale: 1.02 }] },
  illWrap: { height: 126, margin: 10, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  cardBody: { paddingHorizontal: 14, paddingBottom: 14, alignItems: 'center' },
  persian: { color: C.textDark, fontSize: 22, textAlign: 'center', maxWidth: '100%' },
  english: { fontFamily: ff('fa', 'bold'), color: C.textMid, fontSize: 13, marginTop: 2, textAlign: 'center' },
  storyText: { color: C.textMid, fontSize: 11, lineHeight: 17, marginTop: 8, textAlign: 'center' },
  audioPill: {
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: '#F0EEFF',
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  audioPillOn: { backgroundColor: '#FFF3BA' },
  audioPillText: { fontFamily: ff('fa', 'black'), color: C.purpleDeep, fontSize: 11 },
  finishBtn: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 24,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B48D00',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  finishTxt: { color: C.textDark, fontSize: 18 },

  bigLetterBubble: { width: 86, height: 86, borderRadius: 43, alignItems: 'center', justifyContent: 'center' },
  bigLetter: { fontFamily: ff('fa', 'black'), color: '#FFFFFF', fontSize: 42, lineHeight: 54 },
  dot: { position: 'absolute', width: 25, height: 25, borderRadius: 13 },
  dotA: { right: 18, top: 18 },
  dotB: { left: 22, bottom: 20 },
  numberPlate: { width: 84, height: 84, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  numberText: { fontFamily: ff('fa', 'black'), fontSize: 40 },
  countDot: { position: 'absolute', width: 18, height: 18, borderRadius: 9 },
  paintBlob: { width: 92, height: 92, borderRadius: 46 },
  paintDrop: { position: 'absolute', width: 34, height: 34, borderRadius: 17, right: 24, top: 20 },
  paintDropSmall: { position: 'absolute', width: 22, height: 22, borderRadius: 11, left: 28, bottom: 22 },
  circleShape: { width: 76, height: 76, borderRadius: 38 },
  squareShape: { width: 76, height: 76, borderRadius: 18 },
  rectShape: { width: 96, height: 58, borderRadius: 18 },
  diamond: { width: 70, height: 70, borderRadius: 16, transform: [{ rotate: '45deg' }] },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 44,
    borderRightWidth: 44,
    borderBottomWidth: 78,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  cleanSymbol: { fontFamily: ff('fa', 'black'), fontSize: 74, lineHeight: 78 },
  creatureBody: { position: 'absolute', width: 92, height: 62, borderRadius: 34, bottom: 20 },
  creatureHead: { width: 76, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', marginTop: -8 },
  eyeLeft: { position: 'absolute', left: 22, top: 25, width: 8, height: 8, borderRadius: 4, backgroundColor: '#1B1238' },
  eyeRight: { position: 'absolute', right: 22, top: 25, width: 8, height: 8, borderRadius: 4, backgroundColor: '#1B1238' },
  smile: { position: 'absolute', bottom: 18, width: 22, height: 12, borderBottomWidth: 3, borderBottomColor: '#1B1238', borderRadius: 12 },
  earLeft: { position: 'absolute', left: 40, top: 21, width: 24, height: 30, borderRadius: 14 },
  earRight: { position: 'absolute', right: 40, top: 21, width: 24, height: 30, borderRadius: 14 },
  plate: { width: 104, height: 86, borderRadius: 43, backgroundColor: '#FFFFFF', borderWidth: 8, borderColor: '#FFE2B8' },
  foodPiece: { position: 'absolute', width: 28, height: 28, borderRadius: 14 },
  foodPieceSmall: { position: 'absolute', width: 22, height: 22, borderRadius: 11 },
  vehicleBody: { position: 'absolute', width: 104, height: 46, borderRadius: 18, bottom: 34 },
  vehicleTop: { position: 'absolute', width: 58, height: 38, borderRadius: 17, top: 31 },
  wheelLeft: { position: 'absolute', left: 45, bottom: 25, width: 20, height: 20, borderRadius: 10, backgroundColor: '#1B1238' },
  wheelRight: { position: 'absolute', right: 45, bottom: 25, width: 20, height: 20, borderRadius: 10, backgroundColor: '#1B1238' },
  sun: { position: 'absolute', width: 42, height: 42, borderRadius: 21, top: 18, right: 26 },
  hill: { position: 'absolute', width: 160, height: 72, borderRadius: 72, bottom: -22 },
  book: { width: 72, height: 52, borderRadius: 12, transform: [{ rotate: '-6deg' }] },
  bookLine: { position: 'absolute', width: 44, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)' },
  genericBlob: { width: 88, height: 76, borderRadius: 34, transform: [{ rotate: '-10deg' }] },
  genericBlobSmall: { position: 'absolute', right: 26, top: 20, width: 36, height: 36, borderRadius: 18 },
  genericSpark: { position: 'absolute', left: 30, bottom: 22, width: 22, height: 22, borderRadius: 8, transform: [{ rotate: '45deg' }] },
});
