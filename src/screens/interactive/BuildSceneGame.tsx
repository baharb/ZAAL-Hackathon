import React, { useContext, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AppContext } from '../../store/AppContext';
import { useNav } from '../../store/NavContext';
import { useSpeech } from '../../hooks/useSpeech';
import TopBar from '../../components/TopBar';
import { C } from '../../theme/colors';
import { dir, ff } from '../../theme/fonts';
import { neliWorldAssets } from '../../assets/neliWorldAssets';

type RoomId = 'bedroom' | 'kitchen' | 'bathroom';
type ObjectKind = 'bed' | 'lamp' | 'pot' | 'plate' | 'towel' | 'soap';
type ObjectItem = { id: ObjectKind; fa: string; en: string; room: RoomId; color: string; image?: any };

const ROOMS: Record<RoomId, { fa: string; en: string; color: string; accent: string; image: any }> = {
  bedroom: { fa: 'اتاق خواب', en: 'Bedroom', color: '#A855F7', accent: '#FDE68A', image: neliWorldAssets.rooms.bedroomWide },
  kitchen: { fa: 'آشپزخانه', en: 'Kitchen', color: '#FB923C', accent: '#22C55E', image: neliWorldAssets.rooms.kitchenWide },
  bathroom: { fa: 'حمام', en: 'Bathroom', color: '#38BDF8', accent: '#6C4EFF', image: neliWorldAssets.rooms.bathroomWide },
};

const OBJECTS: ObjectItem[] = [
  { id: 'bed', fa: 'تخت', en: 'Bed', room: 'bedroom', color: '#6C4EFF' },
  { id: 'lamp', fa: 'چراغ', en: 'Lamp', room: 'bedroom', color: '#FACC15' },
  { id: 'pot', fa: 'قابلمه', en: 'Pot', room: 'kitchen', color: '#FB923C', image: neliWorldAssets.kitchen.pot },
  { id: 'plate', fa: 'بشقاب', en: 'Plate', room: 'kitchen', color: '#FFFFFF', image: neliWorldAssets.kitchen.plate },
  { id: 'towel', fa: 'حوله', en: 'Towel', room: 'bathroom', color: '#38BDF8', image: neliWorldAssets.bathroom.towel },
  { id: 'soap', fa: 'صابون', en: 'Soap', room: 'bathroom', color: '#A7F3D0', image: neliWorldAssets.bathroom.soap },
];

function RoomScene({ room, placed }: { room: RoomId; placed: ObjectItem[] }) {
  const info = ROOMS[room];
  return (
    <View style={styles.scene}>
      <Image source={info.image} style={styles.roomImage} resizeMode="cover" />
      {placed.map((item, i) => <PlacedObject key={item.id} item={item} index={i} />)}
    </View>
  );
}

function PlacedObject({ item, index }: { item: ObjectItem; index: number }) {
  const left = 45 + (index % 3) * 78;
  const bottom = 38 + Math.floor(index / 3) * 54;
  if (item.image) return <Image source={item.image} style={[styles.placedImage, { left, bottom }]} resizeMode="contain" />;
  if (item.id === 'bed') return <View style={[styles.bed, { left, bottom, backgroundColor: item.color }]}><View style={styles.pillow} /></View>;
  if (item.id === 'lamp') return <View style={[styles.lamp, { left, bottom }]}><View style={[styles.lampShade, { backgroundColor: item.color }]} /><View style={styles.lampStand} /></View>;
  if (item.id === 'pot') return <View style={[styles.pot, { left, bottom, backgroundColor: item.color }]} />;
  if (item.id === 'plate') return <View style={[styles.plate, { left, bottom }]} />;
  if (item.id === 'towel') return <View style={[styles.towel, { left, bottom, backgroundColor: item.color }]} />;
  return <View style={[styles.soap, { left, bottom, backgroundColor: item.color }]} />;
}

function ObjectArt({ item }: { item: ObjectItem }) {
  if (item.image) return <Image source={item.image} style={styles.objectImage} resizeMode="contain" />;
  return <View style={styles.objectArt}><PlacedObject item={item} index={0} /></View>;
}

export default function BuildSceneGame() {
  const { lang, addStars } = useContext(AppContext);
  const { reset } = useNav();
  const { speakFarsiOnly, speakInLang, stop } = useSpeech();
  const [room, setRoom] = useState<RoomId>('bedroom');
  const [placed, setPlaced] = useState<ObjectItem[]>([]);
  const [wrong, setWrong] = useState<ObjectKind | null>(null);
  const isFa = lang === 'fa' || lang === 'ar';

  const placedInRoom = placed.filter(item => item.room === room);
  const complete = placed.length === OBJECTS.length;

  const say = (fa: string, en: string) => {
    stop();
    speakFarsiOnly(fa, () => {
      if (!isFa) setTimeout(() => speakInLang(en, lang), 220);
    });
  };

  const place = (item: ObjectItem) => {
    if (placed.some(x => x.id === item.id)) return;
    if (item.room !== room) {
      setWrong(item.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      say('این وسیله برای این اتاق نیست.', 'This item belongs in another room.');
      setTimeout(() => setWrong(null), 500);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPlaced(prev => [...prev, item]);
    addStars(1);
    say(`${item.fa} در ${ROOMS[room].fa}`, `${item.en} in the ${ROOMS[room].en}`);
  };

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#E9F7FF' }]} />
      <TopBar title="Build a Room" titleFa="اتاق بساز" showClose dark={false} topInset={10} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.roomTabs}>
          {(Object.keys(ROOMS) as RoomId[]).map(id => (
            <TouchableOpacity key={id} style={[styles.roomTab, room === id && { backgroundColor: ROOMS[id].color }]} onPress={() => setRoom(id)}>
              <Text style={[styles.roomTabText, room === id && styles.roomTabOn]}>{isFa ? ROOMS[id].fa : ROOMS[id].en}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.hero}>
          <Text style={[styles.title, { fontFamily: ff(lang, 'black') }, dir(lang)]}>{isFa ? ROOMS[room].fa : ROOMS[room].en}</Text>
          <Text style={[styles.subtitle, { fontFamily: ff(lang, 'regular') }, dir(lang)]}>{isFa ? 'وسیله درست را انتخاب کن' : 'Choose the right item'}</Text>
          <RoomScene room={room} placed={placedInRoom} />
        </View>

        <View style={styles.objects}>
          {OBJECTS.map(item => {
            const isPlaced = placed.some(x => x.id === item.id);
            return (
              <TouchableOpacity key={item.id} disabled={isPlaced} style={[styles.objectCard, isPlaced && styles.objectPlaced, wrong === item.id && styles.objectWrong]} onPress={() => place(item)}>
                <ObjectArt item={item} />
                <Text style={[styles.objectFa, { fontFamily: ff('fa', 'black') }]}>{item.fa}</Text>
                <Text style={styles.objectEn}>{item.en}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {complete ? (
          <TouchableOpacity style={styles.doneBtn} onPress={() => reset({ name: 'Main', tab: 'Games' })}>
            <Text style={styles.doneText}>{isFa ? 'همه اتاق‌ها کامل شد' : 'All rooms complete'}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E9F7FF' },
  scroll: { padding: 16, paddingBottom: 34 },
  roomTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  roomTab: { flex: 1, borderRadius: 20, backgroundColor: '#FFFFFF', paddingVertical: 11, alignItems: 'center' },
  roomTabText: { fontFamily: ff('fa', 'black'), color: C.textDark, fontSize: 11 },
  roomTabOn: { color: '#FFFFFF' },
  hero: { borderRadius: 32, backgroundColor: '#FFFFFF', padding: 18, alignItems: 'center' },
  title: { color: C.textDark, fontSize: 30, lineHeight: 38, textAlign: 'center' },
  subtitle: { color: C.textMid, fontSize: 15, marginTop: 4, textAlign: 'center' },
  scene: { width: '100%', height: 270, borderRadius: 28, overflow: 'hidden', marginTop: 16 },
  roomImage: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%' },
  wall: { position: 'absolute', top: 0, left: 0, right: 0, height: '65%' },
  floor: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '35%' },
  window: { position: 'absolute', top: 28, right: 30, width: 74, height: 64, borderRadius: 15, backgroundColor: '#FFFFFF', borderWidth: 5 },
  objects: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  objectCard: { width: '31%', minHeight: 126, borderRadius: 24, backgroundColor: '#FFFFFF', padding: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 4.5, borderColor: 'transparent' },
  objectPlaced: { opacity: 0.38 },
  objectWrong: { borderColor: '#EF4444', backgroundColor: '#FFF1F2' },
  objectArt: { width: 72, height: 54, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  objectImage: { width: 72, height: 62 },
  objectFa: { color: C.textDark, fontSize: 14, textAlign: 'center', marginTop: 4 },
  objectEn: { fontFamily: ff('fa', 'bold'), color: C.textMid, fontSize: 10, textAlign: 'center' },
  placedImage: { position: 'absolute', width: 70, height: 58 },
  bed: { position: 'absolute', width: 72, height: 36, borderRadius: 11 },
  pillow: { position: 'absolute', left: 8, top: 7, width: 22, height: 14, borderRadius: 7, backgroundColor: '#FFFFFF' },
  lamp: { position: 'absolute', width: 54, height: 54, alignItems: 'center' },
  lampShade: { width: 42, height: 24, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  lampStand: { width: 8, height: 26, borderRadius: 4, backgroundColor: '#6B7280' },
  pot: { position: 'absolute', width: 60, height: 40, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  plate: { position: 'absolute', width: 58, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 4, borderColor: '#E5E7EB' },
  towel: { position: 'absolute', width: 54, height: 44, borderRadius: 10 },
  soap: { position: 'absolute', width: 54, height: 34, borderRadius: 17 },
  doneBtn: { height: 58, borderRadius: 29, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  doneText: { fontFamily: ff('fa', 'black'), color: '#FFFFFF', fontSize: 15 },
});
