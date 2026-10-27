// "My Daily Quest" screen (hackathon step 2, level 1 end to end).
// Flow: buddy picker → category → favourites → say it to pack it (each
// word) → quest map (3 stops) → finale. No AI yet: the quest comes from
// the built-in level-1 generator.

import React, { useContext, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopBar, { topBarHeight } from '../components/TopBar';
import { AppContext } from '../store/AppContext';
import { useNav } from '../store/NavContext';
import { dir, ff } from '../theme/fonts';
import { recordQuestResult } from '../store/questLevel';
import { BuddyId, loadBuddy, saveBuddy } from './buddyStore';
import { ChildCategory, DisplayWord } from './questGroups';
import { Level1Quest, buildLevel1Quest } from './buildLevel1Quest';
import { buddyPose } from './questTheme';
import BuddyPicker from './BuddyPicker';
import CategoryPicker from './CategoryPicker';
import FavouritesPicker from './FavouritesPicker';
import PackWord from './PackWord';
import QuestMap from './QuestMap';
import Finale from './Finale';

type Phase = 'loading' | 'buddy' | 'category' | 'favourites' | 'pack' | 'map' | 'finale';

export default function DailyQuestScreen() {
  const { lang } = useContext(AppContext);
  const { goBack } = useNav();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isFa = lang === 'fa' || lang === 'ar';

  const [phase, setPhase] = useState<Phase>('loading');
  const [buddy, setBuddy] = useState<BuddyId>('neli');
  const [group, setGroup] = useState<ChildCategory>('food');
  const [picked, setPicked] = useState<DisplayWord[]>([]);
  const [packIndex, setPackIndex] = useState(0);
  const [quest, setQuest] = useState<Level1Quest | null>(null);
  const [collected, setCollected] = useState<DisplayWord[]>([]);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [finalLevel, setFinalLevel] = useState(1);
  const [leveledUp, setLeveledUp] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadBuddy().then(saved => {
      if (!alive) return;
      if (saved) {
        setBuddy(saved);
        setPhase('category');
      } else {
        setPhase('buddy');
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const chooseBuddy = (id: BuddyId) => {
    setBuddy(id);
    void saveBuddy(id);
    setPhase('category');
  };

  const chooseGroup = (g: ChildCategory) => {
    setGroup(g);
    setPicked([]);
    setPackIndex(0);
    setPhase('favourites');
  };

  const finishFavourites = (words: DisplayWord[]) => {
    setPicked(words);
    setPackIndex(0);
    setQuest(buildLevel1Quest(words, group));
    setCollected([]);
    setAnswers([]);
    setPhase('pack');
  };

  const finishPack = () => {
    if (packIndex + 1 < picked.length) setPackIndex(packIndex + 1);
    else setPhase('map');
  };

  const finishGoal = async () => {
    const accuracy = answers.length === 0 ? 1 : answers.filter(Boolean).length / answers.length;
    try {
      const { progress, leveledUp: up } = await recordQuestResult(accuracy);
      setFinalLevel(progress.level);
      setLeveledUp(up);
    } catch {
      // Level progress must never block the finale.
    }
    setPhase('finale');
  };

  const buddyFace = Math.max(40, height * 0.07);

  return (
    <View style={styles.root}>
      <TopBar
        title="My Daily Quest"
        titleFa="بازی امروز من"
        dark
        showBack
        onBack={goBack}
      />
      {/* Small buddy button before the quest starts (spec 3b). */}
      {(phase === 'category' || phase === 'favourites') && (
        <TouchableOpacity
          onPress={() => setPhase('buddy')}
          activeOpacity={0.8}
          accessibilityLabel={isFa ? 'تغییر دوست' : 'Change buddy'}
          accessibilityRole="button"
          style={[styles.buddyChip, { top: topBarHeight(height, insets.top, {}) + 4 }]}
        >
          <Image source={buddyPose(buddy, 'base')} style={{ width: buddyFace, height: buddyFace }} resizeMode="contain" />
        </TouchableOpacity>
      )}
      <View style={styles.body}>
        {phase === 'loading' && (
          <Text style={[styles.loading, { fontFamily: ff(lang, 'black') }, dir(lang)]}>✨</Text>
        )}
        {phase === 'buddy' && <BuddyPicker initial={buddy} onPick={chooseBuddy} />}
        {phase === 'category' && <CategoryPicker onPick={chooseGroup} />}
        {phase === 'favourites' && <FavouritesPicker group={group} onDone={finishFavourites} />}
        {phase === 'pack' && picked[packIndex] && (
          <PackWord key={picked[packIndex].id} word={picked[packIndex]} onPacked={finishPack} />
        )}
        {phase === 'map' && quest && (
          <QuestMap
            quest={quest}
            buddy={buddy}
            collected={collected}
            onCollect={word => setCollected(prev => [...prev, word])}
            onAnswer={firstTry => setAnswers(prev => [...prev, firstTry])}
            onGoal={() => void finishGoal()}
          />
        )}
        {phase === 'finale' && quest && (
          <Finale
            words={collected.length > 0 ? collected : picked}
            buddy={buddy}
            themeFa={quest.themeFa}
            themeEn={quest.themeEn}
            leveledUp={leveledUp}
            level={finalLevel}
            onDone={goBack}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2D1B69' },
  body: { flex: 1, paddingHorizontal: 12, paddingBottom: 12 },
  loading: { color: '#FFFFFF', fontSize: 44, textAlign: 'center', marginTop: 60 },
  buddyChip: {
    position: 'absolute',
    right: 14,
    zIndex: 10,
    backgroundColor: 'rgba(255,253,245,0.92)',
    borderRadius: 999,
    padding: 4,
  },
});
