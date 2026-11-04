// "My Daily Quest" screen (quest v2, sections 1-4).
// Flow: buddy picker → five quick picks → Neli's Drive (step 2) → finale
// (step 3). Closing returns to Home; nothing breaks if the child leaves.

import React, { useContext, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../store/AppContext';
import { useNav } from '../store/NavContext';
import { dir, ff } from '../theme/fonts';
import { stopFaAudio } from '../utils/faAudio';
import { FaTestAudioKey } from '../assets/faTestAudio.generated';
import { questPlay } from './questSound';
import { recordQuestResult } from '../store/questLevel';
import { BuddyId, loadBuddy, saveBuddy } from './buddyStore';
import { DisplayWord } from './questGroups';
import { PickKind, colorsFarApart, pickPool, sampleOptions } from './pickLists';
import { ensureTodayParentNote } from '../store/parentNotes';
import { askNeliPicks } from '../services/neliPicks';
import NeliPicksStrip from '../ui/NeliPicksStrip';
import ColorDot from './ColorDot';
import WordArt from './WordArt';
import { STORIES } from './stories';
import { buddyPose } from './questTheme';
import BuddyPicker from './BuddyPicker';
import PicksScreen from './PicksScreen';
import DriveGame, { DriveRound } from './DriveGame';
import Finale from './Finale';
import MyDaysScreen from './MyDaysScreen';
import QuestBackdrop, { QUEST_SKY, gardenDrawnSize, gardenSourceSize } from './QuestBackdrop';
import TopBar, { topBarHeight } from '../components/TopBar';
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
  const { width, height } = useWindowDimensions();
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
  // "Neli remembers": Muse Spark's 3 picks across the pick pools
  // (pictures on the strip; the queue nudges one into its step's options).
  const [neliPicks, setNeliPicks] = useState<{ word: DisplayWord; kind: PickKind }[]>([]);
  const neliQueue = useRef<string[]>([]);
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

  // Deal one step's options, nudging a queued Spark pick into its own
  // step when it fits (colors must stay far apart, like every deal).
  const dealOptions = (kind: PickKind, used: Set<string>): DisplayWord[] => {
    const pool = pickPool(kind);
    const opts = sampleOptions(pool, 3, used);
    const qi = neliQueue.current.findIndex(
      id => pool.some(w => w.id === id) && !used.has(id) && !opts.some(o => o.id === id),
    );
    if (qi >= 0) {
      const w = pool.find(p => p.id === neliQueue.current[qi])!;
      if (kind !== 'color' || opts.slice(0, 2).every(o => colorsFarApart(o.id, w.id))) {
        opts[opts.length - 1] = w;
        neliQueue.current.splice(qi, 1);
      }
    }
    return opts;
  };

  const startPicks = () => {
    picksRef.current = [];
    setPicks([]);
    usedRef.current = new Set();
    setStepIndex(0);
    setOptions(dealOptions(PICK_STEPS[0]!, usedRef.current));
    setPhase('picks');
  };

  // Every instruction is spoken: the buddy screen asks, the album greets.
  useEffect(() => {
    if (phase === 'buddy') void questPlay('quest/pick-buddy' as FaTestAudioKey);
    else if (phase === 'album') void questPlay('quest/my-days' as FaTestAudioKey);
  }, [phase]);

  // "Neli remembers" (background, never blocks play): Muse Spark picks
  // 3 words across the fruit/color/dish pools from recent results.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const pools = PICK_STEPS.map(kind => ({ kind, pool: pickPool(kind) }));
      const allowed = pools.flatMap(({ pool }) => pool).map(w => ({ id: w.id, audioKey: w.audioKey as string }));
      const ids = await askNeliPicks(allowed);
      if (!alive || !ids) return;
      neliQueue.current = ids;
      setNeliPicks(
        ids
          .map(id => {
            const hit = pools.find(({ pool }) => pool.some(w => w.id === id));
            const word = hit?.pool.find(w => w.id === id);
            return hit && word ? { word, kind: hit.kind } : null;
          })
          .filter((p): p is { word: DisplayWord; kind: PickKind } => p !== null),
      );
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // At the picnic, the session is done: make today's parent dinner note.
  useEffect(() => {
    if (phase === 'arrived') void ensureTodayParentNote();
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
      setOptions(dealOptions(PICK_STEPS[next]!, used));
    }, 600);
  };

  const buddyFace = Math.max(40, height * 0.07);
  // Garden drawn bottom-anchored with its pale cloud band cropped off
  // the top (see QuestBackdrop) — no strip along the top edge.
  const buddySrc = gardenSourceSize(BUDDY_BG);
  const buddyDrawn = gardenDrawnSize(buddySrc.w, buddySrc.h, width, height);
  // Buddy + picks are the garden scene with only the floating X; during
  // the drive and at the picnic the game owns the whole screen (only the
  // floating buddy chip stays).
  const fullBleed = phase === 'drive' || phase === 'arrived';

  return (
    <View style={styles.root}>
      {phase === 'loading' && <QuestBackdrop />}
      {(phase === 'buddy' || phase === 'picks') && (
        <Image
          source={BUDDY_BG}
          style={{
            position: 'absolute',
            width: buddyDrawn.w,
            height: buddyDrawn.h,
            left: (width - buddyDrawn.w) / 2,
            top: height - buddyDrawn.h,
          }}
          resizeMode="cover"
        />
      )}
      {(phase === 'buddy' || phase === 'picks' || phase === 'loading') && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 60, elevation: 60 }}>
          <TopBar title="Picnic with Grandma" titleFa="پیک‌نیک با مامان‌بزرگ" dark showClose onBack={goBack} />
        </View>
      )}
      {(phase === 'picks' || phase === 'drive' || phase === 'arrived') && (
        <TouchableOpacity
          onPress={() => setPhase('buddy')}
          activeOpacity={0.8}
          accessibilityLabel={isFa ? 'تغییر دوست' : 'Change buddy'}
          accessibilityRole="button"
          style={[styles.buddyChip, { top: topBarHeight(height, insets.top) + 6 }]}
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
              style={[styles.albumButton, { top: topBarHeight(height, insets.top) + 8, right: 12 }]}
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
        {/* "Neli remembers" strip on the first pick: Spark's 3 words. */}
        {phase === 'picks' && stepIndex === 0 && neliPicks.length === 3 ? (
          <View style={{ position: 'absolute', top: topBarHeight(height, insets.top) + 8, alignSelf: 'center', zIndex: 40, elevation: 40 }}>
            <NeliPicksStrip>
              {neliPicks.map(({ word, kind }) =>
                kind === 'color' ? (
                  <ColorDot key={word.id} id={word.id} size={26} />
                ) : (
                  <WordArt key={word.id} word={word} size={30} />
                ),
              )}
            </NeliPicksStrip>
          </View>
        ) : null}
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
  body: { flex: 1, paddingHorizontal: 12, paddingBottom: 12 },
  loading: { color: '#3A2A6B', fontSize: 44, textAlign: 'center', marginTop: 60 },
  startWrap: { flex: 1 },
  startBody: { flex: 1 },
  albumButton: {
    // Top-right corner: never near the close button (top-left).
    position: 'absolute',
    backgroundColor: 'rgba(255,253,245,0.92)',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    zIndex: 20,
    elevation: 20,
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
