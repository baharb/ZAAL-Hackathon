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
import { FaTestAudioKey } from '../assets/faTestAudio.generated';
import { questPlay } from './questSound';
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
import QuestBackdrop, { QUEST_SKY } from './QuestBackdrop';
import { neliWorldAssets } from '../assets/neliWorldAssets';

// The drive's own garden: the buddy picker happens on the same grass.
const BUDDY_BG = require('../../assets/neli-world/quest/garden-background.png');

// The three picks, in order: fruit, color, food. None of the options shown
// earlier may appear again in the same quest.
const PICK_STEPS: PickKind[] = ['fruit', 'color', 'dish'];

type Phase = 'loading' | 'buddy' | 'picks' | 'drive' | 'arrived' | 'album';

export default function DailyQuestScreen() {
  const { lang } = useContext(AppContext);
  const { goBack, navigate } = useNav();
  // تمام! always lands on the one Magic menu, never on history.
  const backToMagic = () => navigate({ name: 'MagicGames' });
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
      // Always ask first: the child picks their character every day, with
      // the saved one pre-selected.
      if (saved) setBuddy(saved);
      setPhase('buddy');
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

  // Every instruction is spoken: the buddy screen asks, the album greets.
  useEffect(() => {
    if (phase === 'buddy') void questPlay('quest/pick-buddy' as FaTestAudioKey);
    else if (phase === 'album') void questPlay('quest/my-days' as FaTestAudioKey);
  }, [phase]);

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
  const closeS = Math.max(48, height * 0.13);
  // The purple bar shows only on loading. Buddy + picks are the same
  // garden scene with only the floating X; during the drive and at the
  // picnic the game owns the whole screen (only the floating buddy
  // chip stays).
  const showBar = phase === 'loading';
  const fullBleed = phase === 'drive' || phase === 'arrived';

  return (
    <View style={styles.root}>
      {phase === 'loading' && <QuestBackdrop />}
      {(phase === 'buddy' || phase === 'picks') && (
        <Image source={BUDDY_BG} style={styles.buddyBg} resizeMode="cover" />
      )}
      {(phase === 'buddy' || phase === 'picks') && (
        <TouchableOpacity
          onPress={goBack}
          activeOpacity={0.8}
          accessibilityRole="button"
          style={[styles.closeBtn, { top: insets.top + 8, left: 12, width: closeS, height: closeS, borderRadius: closeS / 2 }]}
        >
          <Image source={neliWorldAssets.ui.close} style={{ width: closeS * 0.55, height: closeS * 0.55 }} resizeMode="contain" />
        </TouchableOpacity>
      )}
      {showBar && (
        <View style={styles.topWrap}>
          <TopBar
            title="My Daily Quest"
            titleFa="بازی امروز من"
            dark
            showClose
            onBack={goBack}
          />
        </View>
      )}
      {(phase === 'picks' || phase === 'drive' || phase === 'arrived') && (
        <TouchableOpacity
          onPress={() => setPhase('buddy')}
          activeOpacity={0.8}
          accessibilityLabel={isFa ? 'تغییر دوست' : 'Change buddy'}
          accessibilityRole="button"
          style={[styles.buddyChip, { top: (showBar ? topBarHeight(height, insets.top, {}) : insets.top) + 4 }]}
        >
          <Image source={buddyPose(buddy, 'base')} style={{ width: buddyFace, height: buddyFace }} resizeMode="contain" />
        </TouchableOpacity>
      )}
      <View style={[styles.body, fullBleed && { paddingHorizontal: 0, paddingBottom: 0 }]}>
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
              <View style={{ flexDirection: isFa ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                <Image source={neliWorldAssets.ui.camera} style={{ width: 20, height: 20 }} resizeMode="contain" />
                <Text style={[styles.albumButtonText, { fontFamily: ff(lang, 'black') }, dir(lang)]}>
                  {isFa ? 'روزهای من' : 'My Days'}
                </Text>
              </View>
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
            onDone={backToMagic}
            onAlbum={() => {
              setAlbumReturn('arrived');
              setPhase('album');
            }}
            albumActive={phase === 'album'}
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
  root: { flex: 1, backgroundColor: QUEST_SKY },
  topWrap: { position: 'relative', zIndex: 10, elevation: 10 },
  buddyBg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  closeBtn: {
    position: 'absolute',
    backgroundColor: 'rgba(20,16,60,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  body: { flex: 1, paddingHorizontal: 12, paddingBottom: 12 },
  loading: { color: '#3A2A6B', fontSize: 44, textAlign: 'center', marginTop: 60 },
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
  buddyChip: {
    position: 'absolute',
    right: 14,
    zIndex: 10,
    backgroundColor: 'rgba(255,253,245,0.92)',
    borderRadius: 999,
    padding: 4,
  },
});
