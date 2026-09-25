import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWindowDimensions } from '../../layout/PortraitFallback';
import { FA_AUDIO_KEYS, FALLBACK_LETTER_NAME_FA, makeAlphabetAudioKey, playFaAudio, playFaAudioOrSpeak, stopFaAudio } from '../../utils/faAudio';
import * as Haptics from 'expo-haptics';
import { AppContext } from '../../store/AppContext';
import { FA, ff } from '../../theme/fonts';
import { C } from '../../theme/colors';
import TopBar from '../../components/TopBar';
import PopperCelebration from '../../components/PopperCelebration';
import GameEndOverlay from '../../components/GameEndOverlay';
import { characterAssets } from '../../assets/characterAssets';
import { neliWorldAssets } from '../../assets/neliWorldAssets';
import { useNav } from '../../store/NavContext';

const LILA_THINKING = characterAssets.lila.poses.thinkingAlt;
const TOTAL_STEPS = 10;

type AgeGroupId = 'baby' | 'tiny' | 'little' | 'super' | 'star';

type LetterItem = {
  id: string;
  char: string;
  name: string;
  color: string;
};

const ALPHABET_POOL: LetterItem[] = [
  { id: 'alef', char: 'ا', name: 'الف', color: '#1FB6FF' },
  { id: 'be', char: 'ب', name: 'ب', color: '#6C4EFF' },
  { id: 'pe', char: 'پ', name: 'پ', color: '#22C55E' },
  { id: 'te', char: 'ت', name: 'ت', color: '#FACC15' },
  { id: 'se', char: 'ث', name: 'ث', color: '#FB923C' },
  { id: 'jim', char: 'ج', name: 'جیم', color: '#EC4899' },
  { id: 'che', char: 'چ', name: 'چ', color: '#A855F7' },
  { id: 'he', char: 'ح', name: 'ح', color: '#14B8A6' },
  { id: 'khe', char: 'خ', name: 'خ', color: '#F97316' },
  { id: 'dal', char: 'د', name: 'دال', color: '#38BDF8' },
  { id: 'zal', char: 'ذ', name: 'ذال', color: '#EAB308' },
  { id: 're', char: 'ر', name: 'ر', color: '#22C55E' },
  { id: 'ze', char: 'ز', name: 'ز', color: '#FACC15' },
  { id: 'zhe', char: 'ژ', name: 'ژه', color: '#F97316' },
  { id: 'sin', char: 'س', name: 'سین', color: '#EF4444' },
  { id: 'shin', char: 'ش', name: 'شین', color: '#7C3AED' },
  { id: 'sad', char: 'ص', name: 'صاد', color: '#06B6D4' },
  { id: 'zad', char: 'ض', name: 'ضاد', color: '#EC4899' },
  { id: 'ta', char: 'ط', name: 'طا', color: '#84CC16' },
  { id: 'za', char: 'ظ', name: 'ظا', color: '#8B5CF6' },
  { id: 'eyn', char: 'ع', name: 'عین', color: '#F97316' },
  { id: 'gheyn', char: 'غ', name: 'غین', color: '#06B6D4' },
  { id: 'fe', char: 'ف', name: 'فا', color: '#22C55E' },
  { id: 'qaf', char: 'ق', name: 'قاف', color: '#A855F7' },
  { id: 'kaf', char: 'ک', name: 'کاف', color: '#FACC15' },
  { id: 'gaf', char: 'گ', name: 'گاف', color: '#EC4899' },
  { id: 'lam', char: 'ل', name: 'لام', color: '#14B8A6' },
  { id: 'mim', char: 'م', name: 'میم', color: '#3B82F6' },
  { id: 'nun', char: 'ن', name: 'نون', color: '#F59E0B' },
  { id: 'vav', char: 'و', name: 'واو', color: '#EF4444' },
  { id: 'he2', char: 'ه', name: 'ها', color: '#8B5CF6' },
  { id: 'ye', char: 'ی', name: 'یا', color: '#0EA5E9' },
];

const SIMPLE_LETTER_IDS = new Set(['alef', 'be', 'pe', 'te', 'dal', 're', 'sin', 'mim', 'nun', 'kaf', 'lam', 'vav']);
const MEMORY_LETTER_ROMANIZED: Record<string, string> = {
  alef: 'alef',
  be: 'be',
  pe: 'pe',
  te: 'te',
  se: 'se',
  jim: 'jim',
  che: 'che',
  he: 'he',
  khe: 'khe',
  dal: 'dal',
  zal: 'zal',
  re: 're',
  ze: 'ze',
  sin: 'sin',
  shin: 'shin',
  sad: 'sad',
  zad: 'zad',
  ta: 'ta',
  za: 'za',
  eyn: 'eyn',
  gheyn: 'gheyn',
  fe: 'fe',
  qaf: 'qaf',
  kaf: 'kaf',
  gaf: 'gaf',
  lam: 'lam',
  mim: 'mim',
  nun: 'nun',
  vav: 'vav',
  he2: 'he',
  ye: 'ye',
};


type Card = {
  id: string;
  pairId: string;
  item: LetterItem;
  flipped: boolean;
  matched: boolean;
};

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function getAgeGroupId(age: number): AgeGroupId {
  if (age <= 2) return 'baby';
  if (age <= 4) return 'tiny';
  if (age <= 6) return 'little';
  if (age <= 9) return 'super';
  return 'star';
}

/** 10 steps; step 1 = 2 pairs (4 cards), difficulty ramps by age. */
function buildLevelPlan(group: AgeGroupId): number[] {
  const caps: Record<AgeGroupId, { start: number; end: number }> = {
    baby: { start: 2, end: 3 },
    tiny: { start: 2, end: 4 },
    little: { start: 2, end: 5 },
    super: { start: 2, end: 6 },
    star: { start: 2, end: 8 },
  };
  const { start, end } = caps[group];
  return Array.from({ length: TOTAL_STEPS }, (_, step) => {
    const t = step / Math.max(1, TOTAL_STEPS - 1);
    return Math.round(start + (end - start) * t);
  });
}

function letterPoolForAge(group: AgeGroupId): LetterItem[] {
  if (group === 'baby' || group === 'tiny') {
    return ALPHABET_POOL.filter(item => SIMPLE_LETTER_IDS.has(item.id));
  }
  if (group === 'little') {
    return ALPHABET_POOL.slice(0, 20);
  }
  return ALPHABET_POOL;
}

// This app is landscape-only, so width is the dimension with room to
// spare — capping at 4 columns forced up to 4 rows at the higher levels
// (16 cards), and the cardSize floor below refused to shrink enough to
// fit 4 rows on a short phone, so cards overlapped instead. Favor more
// columns / fewer rows throughout; 2 rows at most keeps every level
// fitting a short landscape screen.
function gridColumns(cardCount: number) {
  if (cardCount <= 4) return 2;
  if (cardCount <= 6) return 3;
  if (cardCount <= 8) return 4;
  if (cardCount <= 12) return 6;
  return 8;
}

function makeDeck(pairCount: number, pool: LetterItem[]): Card[] {
  const pairs = Math.min(pairCount, pool.length);
  const picks = shuffle(pool).slice(0, pairs);
  return shuffle(
    picks.flatMap(item =>
      [0, 1].map(copy => ({
        id: `${item.id}-${copy}-${Math.random()}`,
        pairId: item.id,
        item,
        flipped: false,
        matched: false,
      })),
    ),
  );
}

function makeFoundOrder(deck: Card[]): LetterItem[] {
  return shuffle(
    deck.reduce<LetterItem[]>((items, card) => {
      if (!items.some(item => item.id === card.item.id)) items.push(card.item);
      return items;
    }, []),
  );
}

// Maps memory game IDs that differ from alphabet/name/ audio filenames
const MEMORY_ID_TO_AUDIO_ID: Record<string, string> = {
  he: 'haa',   // ح
  ta: 'taa',   // ط
  za: 'zaa',   // ظ
  qaf: 'ghaf', // ق
  he2: 'heh',  // ه
};

function speakLetter(item: LetterItem) {
  const audioId = MEMORY_ID_TO_AUDIO_ID[item.id] ?? item.id;
  const key = makeAlphabetAudioKey('name', audioId);
  return playFaAudioOrSpeak(key, FALLBACK_LETTER_NAME_FA[audioId] ?? item.name, { awaitFinish: true });
}

function CardBack() {
  return <View style={styles.cardBack} />;
}

function StepFlash({
  side,
  onPress,
  disabled,
  size,
}: {
  side: 'left' | 'right';
  onPress: () => void;
  disabled?: boolean;
  size: number;
}) {
  const icon = side === 'left' ? neliWorldAssets.ui.back : neliWorldAssets.ui.next;
  const hitSlop = Math.round(size * 0.14);
  return (
    <TouchableOpacity
      style={[
        styles.stepFlash,
        side === 'left' ? styles.stepFlashLeft : styles.stepFlashRight,
        { marginTop: -size / 2 },
        disabled ? styles.stepFlashDisabled : null,
      ]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.82}
      disabled={disabled}
      hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
    >
      <Image source={icon} style={{ width: size, height: size }} resizeMode="contain" />
    </TouchableOpacity>
  );
}

function CardFace({ item, fontSize, cardSize }: { item: LetterItem; fontSize: number; cardSize: number }) {
  return (
    <View style={[styles.cardFaceInner, { width: cardSize, height: cardSize }]}>
      <Text style={[styles.cardLetter, { color: item.color, fontSize }]}>
        {item.char}
      </Text>
    </View>
  );
}

export default function MemoryGame() {
  const { lang, addStars, age } = useContext(AppContext);
  const { reset } = useNav();
  const { width, height } = useWindowDimensions();
  const ageGroup = getAgeGroupId(age || 5);
  const levelPlan = buildLevelPlan(ageGroup);
  const letterPool = letterPoolForAge(ageGroup);
  const initialDeck = useMemo(() => makeDeck(levelPlan[0], letterPool), []);

  const [levelIndex, setLevelIndex] = useState(0);
  const pairCount = levelPlan[levelIndex] ?? 2;
  const [cards, setCards] = useState<Card[]>(() => initialDeck);
  const [selected, setSelected] = useState<number[]>([]);
  const [lastMatched, setLastMatched] = useState<LetterItem | null>(null);
  const [foundLetters, setFoundLetters] = useState<LetterItem[]>([]);
  const [foundOrder, setFoundOrder] = useState<LetterItem[]>(() => makeFoundOrder(initialDeck));
  const [allComplete, setAllComplete] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showEndOverlay, setShowEndOverlay] = useState(false);

  const cardsRef = useRef(cards);
  const levelIndexRef = useRef(0);
  const levelPlanRef = useRef(levelPlan);
  const letterPoolRef = useRef(letterPool);
  const awardedRef = useRef(false);
  const isFa = lang === 'fa' || lang === 'ar';

  levelIndexRef.current = levelIndex;
  levelPlanRef.current = levelPlan;
  letterPoolRef.current = letterPool;

  const cardCount = cards.length;
  const cols = gridColumns(cardCount);
  const rows = Math.ceil(cardCount / cols);
  const matchedCount = cards.filter(card => card.matched).length / 2;
  const totalLevels = levelPlan.length;
  const activePairGoal = Math.min(pairCount, Math.floor(cardCount / 2));

  // TABLET_MIN_EDGE (600) is the reference size the step-flash art and prompt
  // text were authored against; short phone landscape heights (360-440) scale
  // both down so the buttons don't sit on top of the mascot art.
  const screenScale = Math.min(1, height / 600);
  const stepFlashSize = Math.max(60, Math.round(112 * screenScale));
  const promptFontSize = Math.max(15, Math.round(22 * screenScale));
  const promptLineHeight = Math.max(20, Math.round(30 * screenScale));

  const compactHeight = Math.max(0, height - 118);
  const mascotWidth = Math.min(312, Math.max(216, Math.floor(width * 0.24)));
  const mascotHeight = Math.min(408, Math.max(288, mascotWidth * 1.28));
  const stageWidth = Math.min(width - 48, 720);
  const gridInnerWidth = stageWidth - mascotWidth - 16;
  const cardGap = 10;
  const cardSize = Math.min(
    92,
    Math.max(
      44,
      Math.floor(
        Math.min(
          (gridInnerWidth - cardGap * (cols - 1)) / cols,
          (compactHeight - 150 - cardGap * (rows - 1)) / rows,
        ),
      ),
    ),
  );
  const letterFontSize = Math.max(26, Math.floor(cardSize * 0.5));

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  useEffect(() => {
    void stopFaAudio();
    const id = setTimeout(() => {
      void playFaAudio('memory/info', { awaitFinish: true });
    }, 450);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!allComplete) return;
    setShowCelebration(true);
    setTimeout(async () => {
      await playFaAudio(FA_AUDIO_KEYS.feedback.afarin, { awaitFinish: true });
    }, 400);
  }, [allComplete]);

  const loadLevel = (index: number) => {
    const pairs = levelPlanRef.current[index] ?? 2;
    const deck = makeDeck(pairs, letterPoolRef.current);
    levelIndexRef.current = index;
    setLevelIndex(index);
    setCards(deck);
    cardsRef.current = deck;
    setSelected([]);
    setLastMatched(null);
    setFoundLetters([]);
    setFoundOrder(makeFoundOrder(deck));
    setLevelComplete(false);
    setAllComplete(false);
    setShowCelebration(false);
    setShowEndOverlay(false);
    setBusy(false);
  };

  const goNextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const current = levelIndexRef.current;
    if (current >= levelPlanRef.current.length - 1) return;
    loadLevel(current + 1);
  };

  const goPrevStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const current = levelIndexRef.current;
    if (current <= 0) return;
    loadLevel(current - 1);
  };

  useEffect(() => {
    if (selected.length !== 2) return;
    const [a, b] = selected;
    const first = cardsRef.current[a];
    const second = cardsRef.current[b];

    if (!first || !second) {
      setSelected([]);
      return;
    }

    if (first.pairId === second.pairId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLastMatched(first.item);
      setFoundLetters(prev => (prev.some(item => item.id === first.item.id) ? prev : [...prev, first.item]));
      const matchedItem = first.item;

      const next = cardsRef.current.map((card, i) => (i === a || i === b ? { ...card, matched: true, flipped: true } : card));
      const levelDone = next.every(card => card.matched);
      cardsRef.current = next;
      setCards(next);
      setSelected([]);

      if (levelDone) {
        setBusy(true);
        addStars(3);
      }

      // Marking the level/game complete (below) triggers a separate effect
      // that plays "آفرین" on its own timer — if that fires while this
      // match's own letter name is still playing, its interrupt:true default
      // replace()s the shared player and cuts the name off entirely. Waiting
      // for speakLetter's own awaitFinish here, before setting either
      // completion flag, sequences the two instead of racing them.
      setTimeout(async () => {
        await speakLetter(matchedItem);
        if (!levelDone) return;
        const current = levelIndexRef.current;
        if (current >= levelPlanRef.current.length - 1) {
          if (!awardedRef.current) {
            awardedRef.current = true;
            addStars(6);
          }
          setAllComplete(true);
          setLevelComplete(false);
        } else {
          setLevelComplete(true);
        }
      }, 180);
      return;
    }

    setBusy(true);
    const timeout = setTimeout(() => {
      setCards(prev =>
        prev.map((card, i) =>
          i === a || i === b ? { ...card, flipped: false } : card,
        ),
      );
      setSelected([]);
      setBusy(false);
    }, 850);

    return () => clearTimeout(timeout);
  }, [addStars, selected]);

  const flip = (idx: number) => {
    if (busy || levelComplete || allComplete || selected.length === 2 || cards[idx].flipped || cards[idx].matched) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCards(prev => prev.map((card, i) => (i === idx ? { ...card, flipped: true } : card)));
    setSelected(prev => [...prev, idx]);
  };

  const restart = () => {
    setAllComplete(false);
    awardedRef.current = false;
    loadLevel(0);
  };

  const closeGame = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    reset({ name: 'Main', tab: 'Games' });
  };

  const showStepNav = !allComplete;
  const showPrevFlash = showStepNav;
  const showNextFlash = showStepNav;
  const showRestartFlash = allComplete;

  return (
    <View style={styles.root}>
      <TopBar
        title="Memory Match"
        titleFa="بازی فکر"
        dark
        showClose
        onBack={closeGame}
      />

      <View style={styles.content}>
        {showPrevFlash ? (
          <StepFlash side="left" onPress={goPrevStep} disabled={levelIndex === 0} size={stepFlashSize} />
        ) : null}
        {showNextFlash ? (
          <StepFlash side="right" onPress={goNextStep} disabled={!levelComplete} size={stepFlashSize} />
        ) : null}
        {showRestartFlash ? <StepFlash side="right" onPress={restart} size={stepFlashSize} /> : null}

        <View style={styles.topProgressWrap}>
          <View style={styles.progressRow}>
            {levelPlan.map((_, i) => (
              <View key={`dash-${i}`} style={[styles.stepDash, i <= levelIndex ? styles.stepDashActive : null]} />
            ))}
          </View>
          <Text
            style={[
              styles.prompt,
              { fontFamily: ff(lang, 'black'), fontSize: promptFontSize, lineHeight: promptLineHeight },
            ]}
          >
            {isFa ? 'حروف شبیه را پیدا کن' : 'Find the matching letters'}
          </Text>
        </View>

        <View style={styles.mainArea}>
        <View style={[styles.stage, { maxWidth: stageWidth }]}>
          <Image
            source={LILA_THINKING}
            style={{ width: mascotWidth, height: mascotHeight, transform: [{ scale: 1.3 }] }}
            resizeMode="contain"
          />

          <View style={styles.gameColumn}>
            <View style={styles.foundRow}>
              {foundOrder.map(letter => {
                const found = foundLetters.some(item => item.id === letter.id);
                return (
                  <View
                    key={letter.id}
                    style={[
                      styles.foundChip,
                      { borderColor: '#FACC15' },
                      found ? styles.foundChipFound : styles.foundChipHidden,
                    ]}
                  >
                    {found ? (
                      <Text
                        style={[
                          styles.foundChipText,
                          letter.id === 'alef' ? styles.foundChipAlef : null,
                          { color: letter.color },
                        ]}
                      >
                        {letter.char}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>

            <View style={[styles.grid, { width: cols * cardSize + cardGap * (cols - 1) }]}>
              {cards.map((card, i) => {
                const showFace = card.flipped || card.matched;
                return (
                  <TouchableOpacity
                    key={card.id}
                    style={[
                      styles.card,
                      { width: cardSize, height: cardSize },
                      showFace ? styles.cardFront : styles.cardRear,
                      card.matched && styles.cardMatched,
                    ]}
                    onPress={() => flip(i)}
                    activeOpacity={0.9}
                    disabled={levelComplete || allComplete}
                  >
                    {showFace ? (
                      <CardFace item={card.item} fontSize={letterFontSize} cardSize={cardSize} />
                    ) : (
                      <CardBack />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {allComplete ? (
              <Text style={[styles.winCaption, { fontFamily: ff(lang, 'black') }]}>
                {isFa ? 'همه ۱۰ مرحله تمام شد!' : 'You finished all 10 steps!'}
              </Text>
            ) : null}
          </View>
        </View>
        </View>
      </View>

      <PopperCelebration
        visible={showCelebration}
        onComplete={() => { setShowCelebration(false); setShowEndOverlay(true); }}
      />
      {showEndOverlay && (
        <GameEndOverlay onGo={() => { setShowEndOverlay(false); reset({ name: 'Main', tab: 'Games' }); }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.purple, overflow: 'hidden' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    position: 'relative',
  },
  stepFlash: {
    position: 'absolute',
    top: '50%',
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepFlashDisabled: {
    opacity: 0.35,
  },
  stepFlashLeft: {
    left: 20,
  },
  stepFlashRight: {
    right: 20,
  },
  stage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginTop: -36,
  },
  topProgressWrap: {
    position: 'absolute',
    top: 6,
    left: 16,
    right: 16,
    width: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  mainArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 0,
  },
  gameColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 280,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  stepDash: {
    width: 28,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  stepDashActive: {
    width: 42,
    backgroundColor: C.yellow,
  },
  foundRow: {
    minHeight: 52,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  foundChip: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.90)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  foundChipHidden: {
    opacity: 0.18,
  },
  foundChipFound: {
    opacity: 1,
  },
  foundChipText: {
    fontFamily: FA.black,
    fontSize: 20,
    lineHeight: 30,
    marginTop: 0,
    transform: [{ translateY: -1 }],
    includeFontPadding: true,
    textAlign: 'center',
  },
  foundChipAlef: {
    transform: [{ translateY: -2 }],
  },
  levelLine: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
  prompt: {
    color: C.white,
    fontSize: 22,
    lineHeight: 30,
    textAlign: 'center',
    marginBottom: 4,
  },
  matchedBanner: {
    minHeight: 116,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  matchedBannerPlaceholder: {
    height: 116,
    marginBottom: 12,
  },
  matchedLabel: {
    color: C.yellow,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 2,
  },
  matchedLetter: {
    fontFamily: FA.black,
    fontSize: 48,
    lineHeight: 72,
    textAlign: 'center',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  matchedName: {
    color: C.white,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 18,
    backgroundColor: C.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#1A0050',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  cardRear: {
    backgroundColor: C.yellow,
  },
  cardFront: {
    backgroundColor: C.white,
  },
  cardMatched: {
    backgroundColor: C.white,
    opacity: 0.85,
  },
  cardBack: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    backgroundColor: C.yellow,
  },
  cardFaceInner: {
    borderRadius: 18,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    paddingTop: 4,
  },
  cardLetter: {
    fontFamily: FA.black,
    textAlign: 'center',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
    transform: [{ translateY: 2 }],
  },
  winCaption: {
    color: C.white,
    fontSize: 22,
    lineHeight: 30,
    textAlign: 'center',
    marginTop: 14,
  },
});
