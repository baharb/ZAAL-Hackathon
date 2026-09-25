import React, { useContext } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import DailyLimitCard from '../components/DailyLimitCard';
import { AppContext } from '../store/AppContext';
import { useNav } from '../store/NavContext';
import { dir, ff } from '../theme/fonts';

// Getting here already required the account password (either via the
// Settings password screen, or by entering it on the daily-limit lock
// screen), so this screen doesn't ask for anything again. It stays a
// separate, focused screen because it's also the fast "add more time"
// destination a parent lands on when a child hits the daily limit
// mid-play (see TimeUpScreen) — a full trip through Settings would be
// the wrong UX in that moment.
export default function ParentScreen() {
  const { navigate } = useNav();
  const goHome = () => navigate({ name: 'Main', tab: 'Games' });
  const {
    settingsLang: lang, stars, streak, completedSections, badges, setAge, age,
    dailyLimitEnabled, setDailyLimitEnabled, dailyLimitMinutes, setDailyLimitMinutes,
    usedTodayMs, bonusMinutesToday, addBonusMinutes, remainingMs,
  } = useContext(AppContext);
  const { width, height } = useWindowDimensions();
  const ui = Math.min(width / 390, height / 844);
  const isFa = lang === 'fa';

  return (
    <View style={styles.root}>
      <TouchableOpacity onPress={goHome} style={[styles.back, { paddingTop: Math.max(44, Math.round(56 * ui)), paddingHorizontal: Math.max(12, Math.round(16 * ui)), paddingBottom: Math.max(6, Math.round(8 * ui)) }]}>
        <Text style={styles.backTxt}>‹ {isFa ? 'بازگشت' : 'Back'}</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: Math.max(12, Math.round(14 * ui)), paddingBottom: Math.max(28, Math.round(34 * ui)) }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { fontFamily: ff(lang, 'black'), fontSize: Math.max(24, Math.round(28 * ui)), marginBottom: Math.max(12, Math.round(14 * ui)) }, dir(lang)]}>
          {isFa ? 'گزارش کودک' : "Child's Progress"}
        </Text>
        <View style={styles.statsRow}>
          {[
            ['★', stars, isFa ? 'ستاره' : 'Stars'],
            ['🔥', streak, isFa ? 'رکورد' : 'Streak'],
            ['✓', completedSections.length, isFa ? 'درس' : 'Lessons'],
            ['🏆', badges.length, isFa ? 'نشان' : 'Badges'],
          ].map(([e, v, l]) => (
            <View key={String(l)} style={styles.statCard}>
              <Text style={styles.statEmoji}>{e}</Text>
              <Text style={[styles.statVal, { fontFamily: ff(lang, 'black') }]}>{v}</Text>
              <Text style={[styles.statLbl, { fontFamily: ff(lang, 'regular') }]}>{l}</Text>
            </View>
          ))}
        </View>

        <View style={styles.panel}>
          <Text style={[styles.sectionTitle, { fontFamily: ff(lang, 'black') }, dir(lang)]}>{isFa ? 'سن کودک' : 'Child Age'}</Text>
          <View style={styles.ageRow}>
            {([{ label: '2-3', value: 2 }, { label: '4-5', value: 4 }, { label: '6-8', value: 6 }] as const).map(({ label, value }) => (
              <TouchableOpacity key={label} style={[styles.ageBtn, age === value && styles.ageBtnActive]} onPress={() => setAge(value)}>
                <Text style={[styles.ageTxt, age === value && styles.ageTxtActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <DailyLimitCard
          lang={lang}
          enabled={dailyLimitEnabled}
          onToggleEnabled={setDailyLimitEnabled}
          minutes={dailyLimitMinutes}
          onChangeMinutes={setDailyLimitMinutes}
          usedTodayMs={usedTodayMs}
          remainingMs={remainingMs}
          bonusMinutesToday={bonusMinutesToday}
          onAddBonus={addBonusMinutes}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1B124F' },
  back: { },
  backTxt: { fontFamily: ff('fa', 'bold'), color: '#fff', fontSize: 18, fontWeight: '900' },
  scroll: { paddingBottom: 34 },
  pageTitle: { color: '#fff', fontWeight: '900' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: { flexGrow: 1, flexBasis: '45%', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 24, padding: 14, alignItems: 'center' },
  statEmoji: { fontSize: 24 },
  statVal: { color: '#221044', fontSize: 24, fontWeight: '900' },
  statLbl: { color: '#6B5A89', fontSize: 12 },
  panel: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 26, padding: 16, marginBottom: 14 },
  sectionTitle: { color: '#221044', fontSize: 18, fontWeight: '900', marginBottom: 12 },
  ageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ageBtn: { minWidth: 72, height: 46, borderRadius: 17, backgroundColor: '#F0EBFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  ageBtnActive: { backgroundColor: '#7C3AED' },
  ageTxt: { fontFamily: ff('fa', 'bold'), color: '#221044', fontSize: 16, fontWeight: '900' },
  ageTxtActive: { color: '#fff' },
});
