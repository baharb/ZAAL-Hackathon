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
import { COLOR_HEX } from './pickLists';
import { buddyPose } from './questTheme';
import WordArt from './WordArt';
import Balloon from './Balloon';
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
  const castH = photoH * 0.52;
  return (
    <View style={[styles.card, { width: cardW, borderRadius: cardW * 0.05 }]}>
      <View
        style={[
          styles.photo,
          {
            height: photoH,
            borderRadius: cardW * 0.03,
          },
        ]}
      >
        {story && (
          <Image
            source={story.background}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        )}
        {balloonIds.length > 0 && (
          <View style={{ position: 'absolute', top: 2, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 2 }}>
            {balloonIds.map(id => (
              <Balloon key={id} color={COLOR_HEX[id] ?? '#CCCCCC'} size={photoH * 0.16} />
            ))}
          </View>
        )}
        {story && (
          <Image
            source={story.grandma}
            style={{ position: 'absolute', left: 4, bottom: 2, width: castH * 0.85, height: castH }}
            resizeMode="contain"
          />
        )}
        <Image
          source={buddyPose(entry.buddy, 'celebration')}
          style={{ position: 'absolute', right: 4, bottom: 2, width: castH * 0.85, height: castH }}
          resizeMode="contain"
        />
        <View
          style={{
            position: 'absolute',
            left: castH * 0.7,
            right: castH * 0.7,
            bottom: 2,
            height: photoH * 0.36,
            borderRadius: 6,
            overflow: 'hidden',
            backgroundColor: entry.colorHex,
            borderWidth: 1.5,
            borderColor: '#FFFFFF',
            flexDirection: 'row',
            flexWrap: 'wrap',
          }}
        >
          {Array.from({ length: 16 }).map((_, i) => (
            <View
              key={i}
              style={{
                width: '12.5%',
                height: '50%',
                backgroundColor: (Math.floor(i / 8) + i) % 2 === 0 ? entry.colorHex : 'rgba(255,255,255,0.88)',
              }}
            />
          ))}
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            {fruitWord &&
              Array.from({ length: fruitCount }).map((_, i) => (
                <WordArt key={i} word={fruitWord} size={photoH * 0.15} />
              ))}
            {dishWord && <WordArt word={dishWord} size={photoH * 0.24} />}
          </View>
        </View>
      </View>
      <Text
        style={[styles.caption, { fontFamily: ff(lang, 'black'), fontSize: Math.max(13, cardW * 0.055) }, dir(lang)]}
        numberOfLines={2}
      >
        {isFa
          ? `پیک‌نیک با ${buddyName?.fa ?? 'نلی'} 📸 ${entry.dateISO}`
          : `Picnic with ${buddyName?.en ?? 'Neli'} 📸 ${entry.dateISO}`}
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
      <View style={[styles.topRow, isFa && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.8}
          accessibilityLabel={isFa ? 'برگرد' : 'Back'}
          accessibilityRole="button"
          style={styles.back}
        >
          <Text style={[styles.backText, { fontFamily: ff(lang, 'black') }]}>
            {isFa ? '→ برگرد' : '← Back'}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, { fontFamily: ff(lang, 'black') }, dir(lang)]}>
          {isFa ? 'روزهای من 📸' : 'My Days 📸'}
        </Text>
        <View style={styles.back} />
      </View>
      {days === null ? (
        <Text style={[styles.empty, { fontFamily: ff(lang, 'black') }, dir(lang)]}>✨</Text>
      ) : days.length === 0 ? (
        <Text style={[styles.empty, { fontFamily: ff(lang, 'black'), fontSize: 17 }, dir(lang)]}>
          {isFa ? 'هنوز عکسی نداری! اول پیک‌نیک بگیر. 📷' : 'No photos yet! Have a picnic first. 📷'}
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
  backText: { color: '#FACC15', fontSize: 16 },
  title: { color: '#FFFFFF', fontSize: 20, textAlign: 'center' },
  empty: { color: '#FFFFFF', marginTop: 40, textAlign: 'center', paddingHorizontal: 24 },
  list: { alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingVertical: 12 },
  card: {
    backgroundColor: '#FFFDF5',
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
