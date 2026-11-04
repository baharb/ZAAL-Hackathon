// روزهای من (My Days) screen (quest v2, section 3).
// The child's saved pretend photos, newest first. Device only, no server.
// No Modal here on purpose: every Modal needs a landscape prop on iPhone.

import React, { useContext, useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { AppContext } from '../store/AppContext';
import { dir, ff } from '../theme/fonts';
import { BUDDIES } from './buddyStore';
import { MyDayEntry, loadMyDays } from './myDaysStore';
import { STORIES } from './stories';
import WordArt from './WordArt';
import { neliWorldAssets } from '../assets/neliWorldAssets';
import { WordArt as PlayWordArt, WORD_ART } from '../ui/playKit';
import TopBar from '../components/TopBar';
import PicnicPhoto from './PicnicPhoto';
import { grandmaArtFor } from './grandmaArt';
import { displayWordById } from './questGroups';

// The album card shows the same picnic scene at a small size: garden
// background, the counted fruit in a row, the dish, the tied balloons,
// Grandma and the buddy at the blanket's edges. Nothing may overflow.
function DayCard({ entry, cardW }: { entry: MyDayEntry; cardW: number }) {
  const { lang } = useContext(AppContext);
  const isFa = lang === 'fa' || lang === 'ar';
  const buddyName = BUDDIES.find(b => b.id === entry.buddy);
  const story = STORIES.find(s => s.id === entry.storyId);
  const photoH = cardW * 0.52;
  const fruitPick = entry.picks[0];
  const dishPick = entry.picks[2];
  const fruitWord = fruitPick ? displayWordById(fruitPick.id) : null;
  const dishWord = dishPick ? displayWordById(dishPick.id) : null;
  const fruitCount = Math.min(Math.max(fruitPick?.count ?? 1, 1), 5);
  const balloonIds = (entry.balloonIds ?? []).slice(0, 3);
  // Game recap entries (Listen & Find, First Letter): a little paper note
  // with the found words' pictures.
  if (entry.game) {
    return (
      <View style={[styles.card, { width: cardW, borderRadius: cardW * 0.05 }]}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, paddingVertical: 6 }}>
          {entry.game.words.map(w => (
            <View key={w.id} style={{ alignItems: 'center', width: cardW * 0.26 }}>
              <PlayWordArt art={WORD_ART[w.id] ?? null} emoji={w.emoji} size={cardW * 0.2} />
              <Text style={{ fontFamily: ff(lang, 'black'), fontSize: Math.max(11, cardW * 0.05), color: '#3A2A6B' }} numberOfLines={1}>
                {w.fa}
              </Text>
            </View>
          ))}
        </View>
        <Text
          style={[styles.caption, { fontFamily: ff(lang, 'black'), fontSize: Math.max(13, cardW * 0.055) }, dir(lang)]}
          numberOfLines={2}
        >
          {(isFa ? entry.game.fa : entry.game.en) + ` • ${entry.dateISO}`}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.card, { width: cardW, borderRadius: cardW * 0.05 }]}>
      <PicnicPhoto
        background={story?.background}
        grandma={grandmaArtFor(entry.buddy)}
        buddy={entry.buddy}
        fruitWord={fruitWord}
        fruitCount={fruitCount}
        dishWord={dishWord}
        balloonIds={balloonIds}
        colorHex={entry.colorHex}
        w={cardW}
        h={photoH}
        radius={cardW * 0.03}
      />
      <Text
        style={[styles.caption, { fontFamily: ff(lang, 'black'), fontSize: Math.max(13, cardW * 0.055) }, dir(lang)]}
        numberOfLines={2}
      >
        {isFa
          ? `پیک‌نیک با ${buddyName?.fa ?? 'نلی'} • ${entry.dateISO}`
          : `Picnic with ${buddyName?.en ?? 'Neli'} • ${entry.dateISO}`}
      </Text>
      <Text
        style={[styles.picks, { fontFamily: ff(lang, 'bold'), fontSize: Math.max(11, cardW * 0.045) }, dir(lang)]}
        numberOfLines={1}
      >
        {entry.picks.map(p => p.fa).join(isFa ? '، ' : ', ')}
      </Text>
    </View>
  );
}

export default function MyDaysScreen({ onBack }: { onBack: () => void }) {
  const { lang } = useContext(AppContext);
  const { width } = useWindowDimensions();
  const isFa = lang === 'fa' || lang === 'ar';
  const [days, setDays] = useState<MyDayEntry[] | null>(null);

  useEffect(() => {
    let alive = true;
    void loadMyDays().then(entries => {
      if (alive) setDays(entries);
    });
    return () => {
      alive = false;
    };
  }, []);

  const cardW = Math.min(width * 0.42, 300);

  return (
    <View style={styles.root}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 60, elevation: 60 }}>
        <TopBar title="روزهای من" titleFa="روزهای من" dark showClose onBack={onBack} />
      </View>
      <View style={[styles.topRow, isFa && { flexDirection: 'row-reverse' }]}>
        <View style={styles.back} />
        <View style={{ flexDirection: isFa ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
          <Image source={neliWorldAssets.ui.camera} style={{ width: 30, height: 30 }} resizeMode="contain" />
          <Text style={[styles.title, { fontFamily: ff(lang, 'black') }, dir(lang)]}>
            {isFa ? 'روزهای من' : 'My Days'}
          </Text>
        </View>
        <View style={styles.back} />
      </View>
      {days === null ? (
        <Image source={neliWorldAssets.ui.sparkle} style={{ width: 44, height: 44, alignSelf: 'center' }} resizeMode="contain" />
      ) : days.length === 0 ? (
        <Text style={[styles.empty, { fontFamily: ff(lang, 'black'), fontSize: 17 }, dir(lang)]}>
          {isFa ? 'هنوز عکسی نداری! اول پیک‌نیک بگیر.' : 'No photos yet! Have a picnic first.'}
        </Text>
      ) : (
        <FlatList
          data={days}
          keyExtractor={item => item.id}
          horizontal
          contentContainerStyle={styles.list}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => <DayCard entry={item} cardW={cardW} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  back: { minWidth: 90, alignItems: 'center' },

  title: { color: '#FFFFFF', fontSize: 20, textAlign: 'center' },
  empty: { color: '#FFFFFF', marginTop: 40, textAlign: 'center', paddingHorizontal: 24 },
  list: { alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingVertical: 12 },
  card: {
    backgroundColor: '#FFC93C',
    padding: 10,
    shadowColor: '#170736',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  photo: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  caption: { color: '#3A2A6B', marginTop: 8, textAlign: 'center' },
  picks: { color: '#6C4EFF', marginTop: 2, textAlign: 'center' },
});
