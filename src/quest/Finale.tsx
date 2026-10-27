// Finale (hackathon step 2, level 1). The theme completes with every
// collected item together, the app says each word once more, the buddy
// celebrates, and the quest ends while it is still fun.

import React, { useContext, useEffect } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { AppContext } from '../store/AppContext';
import { dir, ff } from '../theme/fonts';
import { FaTestAudioKey } from '../assets/faTestAudio.generated';
import { playFaAudioSequence } from '../utils/faAudio';
import { isQuestMuted } from './questSound';
import { BuddyId } from './buddyStore';
import { DisplayWord } from './questGroups';
import { buddyPose } from './questTheme';
import WordArt from './WordArt';

export default function Finale({
  words,
  buddy,
  themeFa,
  themeEn,
  leveledUp,
  level,
  onDone,
}: {
  words: DisplayWord[];
  buddy: BuddyId;
  themeFa: string;
  themeEn: string;
  leveledUp: boolean;
  level: number;
  onDone: () => void;
}) {
  const { lang } = useContext(AppContext);
  const { width, height } = useWindowDimensions();
  const isFa = lang === 'fa' || lang === 'ar';

  const itemSize = Math.min(width * 0.14, height * 0.22);
  const buddySize = Math.min(width * 0.22, height * 0.4);

  // All collected items appear together and the app says each word once more.
  useEffect(() => {
    if (!isQuestMuted()) void playFaAudioSequence(words.map(w => w.audioKey as FaTestAudioKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <Text style={[styles.theme, { fontFamily: ff(lang, 'black'), fontSize: Math.max(20, height * 0.07) }, dir(lang)]}>
        {isFa ? themeFa : themeEn} 🎉
      </Text>
      {leveledUp && (
        <Text style={[styles.level, { fontFamily: ff(lang, 'black'), fontSize: Math.max(16, height * 0.05) }, dir(lang)]}>
          {isFa ? `سطح ${level}! 🌟` : `Level ${level}! 🌟`}
        </Text>
      )}
      <View style={[styles.blanket, { borderRadius: itemSize * 0.2, gap: itemSize * 0.15, padding: itemSize * 0.2 }]}>
        {words.map(w => (
          <WordArt key={w.id} word={w} size={itemSize} />
        ))}
      </View>
      <Image source={buddyPose(buddy, 'celebration')} style={{ width: buddySize, height: buddySize }} resizeMode="contain" />
      <Text style={[styles.bye, { fontFamily: ff(lang, 'black'), fontSize: Math.max(15, height * 0.045) }, dir(lang)]}>
        {isFa ? 'فردا می‌بینمت! 🌙' : 'See you tomorrow! 🌙'}
      </Text>
      <TouchableOpacity
        style={[styles.home, { borderRadius: 999, paddingHorizontal: 26, height: Math.max(48, height * 0.1) }]}
        onPress={onDone}
        activeOpacity={0.85}
        accessibilityLabel={isFa ? 'تمام' : 'Done'}
        accessibilityRole="button"
      >
        <Text style={[styles.homeText, { fontFamily: ff(lang, 'black'), fontSize: Math.max(16, height * 0.045) }, dir(lang)]}>
          {isFa ? 'تمام! ⭐' : 'Done! ⭐'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  theme: { color: '#FFFFFF', textAlign: 'center' },
  level: { color: '#FACC15', marginTop: 4 },
  blanket: {
    flexDirection: 'row',
    backgroundColor: '#FF8FA3',
    marginVertical: 12,
    shadowColor: '#170736',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  bye: { color: '#FFFFFF', marginTop: 6 },
  home: { backgroundColor: '#22C55E', justifyContent: 'center', marginTop: 12 },
  homeText: { color: '#FFFFFF' },
});
