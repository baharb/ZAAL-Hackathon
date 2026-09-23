import React, { useContext } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TopBar from '../components/TopBar';
import { AppContext } from '../store/AppContext';
import { useNav } from '../store/NavContext';
import { dir, ff } from '../theme/fonts';
import { useResponsive } from '../theme/responsive';
import { FARSI_LETTERS } from '../data/farsiLetters';

export default function AlphabetHubScreen() {
  const { navigate } = useNav();
  const { lang } = useContext(AppContext);
  const responsive = useResponsive();
  const ui = Math.min(responsive.contentWidth / 390, 1.3);
  const isFa = lang === 'fa' || lang === 'ar';
  const gap = Math.max(10, Math.round(12 * ui));
  const columns = 4;
  const usableWidth = responsive.contentWidth - responsive.horizontalPadding * 2 - gap * (columns - 1);
  const cardW = usableWidth / columns - Math.max(2, Math.round(4 * ui));

  return (
    <View style={styles.root}>
      <TopBar title="Alphabet" titleFa="الفبا" dark showClose onBack={() => navigate({ name: 'Home' })} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: responsive.horizontalPadding }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { fontFamily: ff(lang, 'black'), fontSize: Math.max(16, Math.round(18 * ui)), marginTop: Math.max(4, Math.round(6 * ui)), marginBottom: Math.max(8, Math.round(10 * ui)) }, dir(lang)]}>
          {isFa ? 'حرف‌ها را تمرین کن' : 'Practice letters'}
        </Text>

        <View style={[styles.grid, styles.gridRtl, { columnGap: gap, rowGap: gap }]}>
          {FARSI_LETTERS.map(letter => (
            <TouchableOpacity
              key={letter.id}
              style={[styles.card, { width: cardW, height: Math.max(96, Math.round(104 * ui)), borderRadius: Math.max(18, Math.round(20 * ui)) }]}
              onPress={() => navigate({ name: 'InteractiveFarsiTrace', letterId: letter.id })}
              activeOpacity={0.88}
            >
              <View style={[styles.thumb, { borderRadius: Math.max(18, Math.round(20 * ui)), backgroundColor: letter.color ?? '#6C4EFF' }]}>
                <Text style={[styles.letterGlyph, { fontSize: Math.max(30, Math.round(36 * ui)) }]}>{letter.letter}</Text>
                <View style={styles.letterTextBand}>
                  <Text style={styles.letterName} numberOfLines={1}>{letter.nameFa}</Text>
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
  scroll: { paddingBottom: 36 },
  sectionTitle: { color: '#FFFFFF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  // Alef starts at the right and the alphabet reads right-to-left, same as the
  // Persian letters it lists — independent of the app's own UI language.
  gridRtl: { flexDirection: 'row-reverse' },
  card: { backgroundColor: '#AEEBFF', overflow: 'hidden', borderWidth: 4, borderColor: '#FFFFFF', shadowColor: '#170736', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 5 },
  thumb: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  letterGlyph: { fontFamily: ff('fa', 'black'), color: '#FFFFFF' },
  letterTextBand: { position: 'absolute', left: 4, right: 4, bottom: 6, alignItems: 'center' },
  letterName: { fontFamily: ff('fa', 'bold'), color: 'rgba(255,255,255,0.92)', fontSize: 11, textAlign: 'center' },
});
