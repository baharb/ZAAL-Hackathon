// "My Daily Quest" screen (quest v2, sections 1-4).
// Flow: buddy picker → five quick picks → Neli's Drive (step 2) → finale
// (step 3). Closing returns to Home; nothing breaks if the child leaves.

import React, { useContext, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopBar, { topBarHeight } from '../components/TopBar';
import { AppContext } from '../store/AppContext';
import { useNav } from '../store/NavContext';
import { dir, ff } from '../theme/fonts';
import { stopFaAudio } from '../utils/faAudio';
import { neliWorldAssets } from '../assets/neliWorldAssets';
import { recordQuestResult } from '../store/questLevel';
import { BuddyId, loadBuddy, saveBuddy } from './buddyStore';
import { DisplayWord } from './questGroups';
import { PickKind, pickPool, sampleOptions } from './pickLists';
import { STORIES } from './stories';
import { buddyPose } from './questTheme';
import BuddyPicker from './BuddyPicker';
import PicksScreen from './PicksScreen';
import DriveGame, { DriveRound } from './DriveGame';
import Finale from './Finale';
import MyDaysScreen from './MyDaysScreen';

// The five picks, in order: fruit, ingredient, color, ingredient (new ones),
// food. None of the options shown earlier may appear again in the same quest.
const PICK_STEPS: PickKind[] = ['fruit', 'ingredient', 'color', 'ingredient', 'dish'];

type Phase = 'loading' | 'buddy' | 'picks' | 'drive' | 'arrived' | 'album';

export default function DailyQuestScreen() {
  const { lang } = useContext(AppContext);
  const { goBack } = useNav();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isFa = lang === 'fa' || lang === 'ar';

  const [phase, setPhase] = useState<Phase>('loading');
  const [buddy, setBuddy] = useState<BuddyId>('neli');
  const [stepIndex, setStepIndex] = useState(0);
  const [options, setOptions] = useState<DisplayWord[]>([]);
  const [picks, setPicks] = useState<DisplayWord[]>([]);
  const [rounds, setRounds] = useState<DriveRound[]>([]);
  const [collected, setCollected] = useState<DisplayWord[]>([]);
  const [finalLevel, setFinalLevel] = useState(1);
  const [albumReturn, setAlbumReturn] = useState<'buddy' | 'arrived'>('buddy');
  const [leveledUp, setLeveledUp] = useState(false);
  const picksRef = useRef<DisplayWord[]>([]);
  const usedRef = useRef<Set<string>>(new Set());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    void loadBuddy().then(saved => {
      if (!alive) return;
      if (saved) {
        setBuddy(saved);
        startPicks();
      } else {
        setPhase('buddy');
      }
    });
    return () => {
      alive = false;
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      void stopFaAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPicks = () => {
    picksRef.current = [];
    setPicks([]);
    usedRef.current = new Set();
    setStepIndex(0);
    setOptions(sampleOptions(pickPool(PICK_STEPS[0]!), 3, usedRef.current));
    setPhase('picks');
  };

  const chooseBuddy = (id: BuddyId) => {
    setBuddy(id);
    void saveBuddy(id);
    startPicks();
  };

  const handlePick = (word: DisplayWord) => {
    const nextPicks = [...picksRef.current, word];
    picksRef.current = nextPicks;
    setPicks(nextPicks);
    // Nothing shown earlier may repeat within this quest.
    options.forEach(o => usedRef.current.add(o.id));
    const used = new Set(usedRef.current);
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      if (stepIndex >= PICK_STEPS.length - 1) {
        setRounds(nextPicks.map((answer, i) => ({ kind: PICK_STEPS[i]!, answer })));
        setPhase('drive');
        return;
      }
      const next = stepIndex + 1;
      setStepIndex(next);
      setOptions(sampleOptions(pickPool(PICK_STEPS[next]!), 3, used));
    }, 600);
  };

  const buddyFace = Math.max(40, height * 0.07);

  // The drive and the picnic are full screen: no purple title bar, just a
  // floating close button. The buddy picker and the picks keep the bar.
  const fullScreen =
    phase === 'drive' ||
    phase === 'arrived' ||
    (phase === 'album' && albumReturn === 'arrived');
  const closeSize = Math.max(44, Math.min(height * 0.12, 64));

  return (
    <View style={styles.root}>
      {!fullScreen && (
        <TopBar
          title="My Daily Quest"
          titleFa="بازی امروز من"
          dark
          showClose
          onBack={goBack}
        />
      )}
      {fullScreen && (
        <TouchableOpacity
          onPress={goBack}
          activeOpacity={0.8}
          accessibilityLabel={isFa ? 'بستن' : 'Close'}
          accessibilityRole="button"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={[styles.closeFloat, { top: insets.top + 8, width: closeSize, height: closeSize }]}
        >
          <Image
            source={neliWorldAssets.ui.close}
            style={{ width: closeSize * 0.62, height: closeSize * 0.62 }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}
      {(phase === 'picks' || phase === 'drive' || phase === 'arrived') && (
        <TouchableOpacity
          onPress={() => setPhase('buddy')}
          activeOpacity={0.8}
          accessibilityLabel={isFa ? 'تغییر دوست' : 'Change buddy'}
          accessibilityRole="button"
          style={[styles.buddyChip, { top: fullScreen ? insets.top + 8 : topBarHeight(height, insets.top, {}) + 4 }]}
        >
          <Image source={buddyPose(buddy, 'base')} style={{ width: buddyFace, height: buddyFace }} resizeMode="contain" />
        </TouchableOpacity>
      )}
      <View style={styles.body}>
        {phase === 'loading' && (
          <Text style={[styles.loading, { fontFamily: ff(lang, 'black') }, dir(lang)]}>✨</Text>
        )}
        {phase === 'buddy' && (
          <View style={styles.startWrap}>
            <TouchableOpacity
              onPress={() => { setAlbumReturn('buddy'); setPhase('album'); }}
              activeOpacity={0.8}
              accessibilityLabel={isFa ? 'روزهای من' : 'My Days'}
              accessibilityRole="button"
              style={styles.albumButton}
            >
              <Text style={[styles.albumButtonText, { fontFamily: ff(lang, 'black') }, dir(lang)]}>
                {isFa ? 'روزهای من 📸' : 'My Days 📸'}
              </Text>
            </TouchableOpacity>
            <View style={styles.startBody}>
              <BuddyPicker initial={buddy} onPick={chooseBuddy} />
            </View>
          </View>
        )}
        {phase === 'picks' && options.length === 3 && (
          <PicksScreen
            key={stepIndex}
            stepIndex={stepIndex}
            stepCount={PICK_STEPS.length}
            kind={PICK_STEPS[stepIndex]!}
            options={options}
            onPick={handlePick}
          />
        )}
        {phase === 'drive' && rounds.length === PICK_STEPS.length && (
          <DriveGame
            buddy={buddy}
            story={STORIES[0]!}
            rounds={rounds}
            onDone={(items, accuracy) => {
              setCollected(items);
              // Level progress must never block the finale.
              recordQuestResult(accuracy)
                .then(({ progress, leveledUp: up }) => {
                  setFinalLevel(progress.level);
                  setLeveledUp(up);
                })
                .catch(() => {});
              setPhase('arrived');
            }}
          />
        )}
        {(phase === 'arrived' || (phase === 'album' && albumReturn === 'arrived')) && (
          <Finale
            words={collected.length > 0 ? collected : picks}
            buddy={buddy}
            story={STORIES[0]!}
            leveledUp={leveledUp}
            level={finalLevel}
            onDone={goBack}
            onOpenAlbum={() => { setAlbumReturn('arrived'); setPhase('album'); }}
          />
        )}
        {/* Rendered last so it always sits on top of the finale. */}
        {phase === 'album' && (
          <View style={styles.albumOverlay}>
            <MyDaysScreen onBack={() => setPhase(albumReturn)} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2D1B69' },
  body: { flex: 1, paddingHorizontal: 12, paddingBottom: 12 },
  loading: { color: '#FFFFFF', fontSize: 44, textAlign: 'center', marginTop: 60 },
  startWrap: { flex: 1 },
  startBody: { flex: 1 },
  albumButton: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,253,245,0.92)',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginTop: 2,
  },
  albumButtonText: { color: '#3A2A6B', fontSize: 15 },
  albumOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2D1B69',
    zIndex: 50,
    elevation: 50,
  },
  closeFloat: {
    position: 'absolute',
    left: 12,
    zIndex: 60,
    elevation: 60,
    backgroundColor: 'rgba(45,27,105,0.55)',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buddyChip: {
    position: 'absolute',
    right: 14,
    zIndex: 10,
    backgroundColor: 'rgba(255,253,245,0.92)',
    borderRadius: 999,
    padding: 4,
  },
});
