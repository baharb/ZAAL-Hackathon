import React, { useContext, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import CharacterAvatar from '../components/CharacterAvatar';
import TopBar from '../components/TopBar';
import { CHARACTERS } from '../data/characters';
import { AppContext } from '../store/AppContext';
import { dir, ff } from '../theme/fonts';

const COLORS = [
  ['#B88CFF', '#7C3AED'],
  ['#FF9A6A', '#F25F3A'],
  ['#FF86B7', '#E5487B'],
  ['#52D6A4', '#16A36A'],
  ['#FFD764', '#FF9F2E'],
  ['#62D4FF', '#2D8CFF'],
] as const;

export default function CharactersScreen() {
  const { lang, selectedCharacterId, setSelectedCharacter } = useContext(AppContext);
  const { width, height } = useWindowDimensions();
  const [selected, setSelected] = useState(selectedCharacterId);
  const isFa = lang === 'fa' || lang === 'ar';
  const scale = Math.min(width / 390, height / 844);
  const cols = width >= 700 ? 3 : 2;
  const gap = Math.max(8, Math.round(12 * scale));
  const pad = Math.max(12, Math.round(14 * scale));
  const cardW = (width - pad * 2 - gap * (cols - 1)) / cols;
  const titleSize = Math.max(22, Math.round(27 * scale));
  const cardMinH = Math.max(176, Math.round(206 * scale));
  const stageH = Math.max(100, Math.round(118 * scale));
  const avatarSize = cardW * 0.58;

  return (
    <View style={styles.root}>
      <TopBar title="Characters" titleFa="دوستان نلی" showClose dark />
      <ScrollView contentContainerStyle={[styles.grid, { padding: pad, gap }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { fontFamily: ff(lang, 'black'), fontSize: titleSize }, dir(lang)]}>
          {isFa ? 'دوستت را انتخاب کن' : 'Choose a friend'}
        </Text>
        {CHARACTERS.map((char, i) => {
          const isActive = char.id === selected;
          const colors = COLORS[i % COLORS.length];
          return (
            <TouchableOpacity
              key={char.id}
              style={[styles.card, { width: cardW, minHeight: cardMinH }]}
              onPress={() => {
                setSelected(char.id);
                setSelectedCharacter(char.id);
              }}
              activeOpacity={0.86}
            >
              <View style={[styles.cardFill, { backgroundColor: colors[0] }, isActive && styles.cardActive]}>
                {isActive && <View style={styles.checkBadge}><Text style={styles.checkTxt}>✓</Text></View>}
                <View style={[styles.characterStage, { height: stageH }]}>
                  <CharacterAvatar characterId={char.id} size={avatarSize} />
                </View>
                <Text style={[styles.name, { fontFamily: ff('en', 'bold') }]} numberOfLines={1}>{char.nameEn}</Text>
                <Text style={[styles.nameFa, { fontFamily: ff('fa', 'bold') }]} numberOfLines={1}>{char.nameFa}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#32105F' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  pageTitle: { width: '100%', color: '#fff', fontSize: 27, fontWeight: '900', marginBottom: 2 },
  card: { minHeight: 206 },
  cardFill: { flex: 1, borderRadius: 28, padding: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#12052E', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 7 },
  cardActive: { borderWidth: 4.5, borderColor: '#fff' },
  characterStage: { height: 118, alignItems: 'center', justifyContent: 'center' },
  checkBadge: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkTxt: { fontFamily: ff('fa', 'bold'), color: '#7C3AED', fontSize: 14, fontWeight: '900' },
  name: { color: '#fff', fontSize: 15, fontWeight: '900', textAlign: 'center' },
  nameFa: { color: 'rgba(255,255,255,0.78)', fontSize: 13, fontWeight: '800', textAlign: 'center' },
});
