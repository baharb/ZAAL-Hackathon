// First Letter — Meta hackathon backlog game. Neli SAYS a Farsi word the
// child knows (a shipped recording), shows its picture, and the child taps
// the letter the word STARTS with. Every tap teaches: the tapped letter's
// own name recording plays first, then afarin or try-again. Letters come
// from the repo's tracing table with verified name recordings — Farsi is
// never synthesized (iPhones have no Persian voice).

import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useWindowDimensions } from '../../layout/PortraitFallback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNav } from '../../store/NavContext';
import { BuddyGuide, GameBg, SoftShadow, WORD_ART, WordArt } from '../../ui/playKit';
import TopBar, { topBarHeight } from '../../components/TopBar';
import { neliWorldAssets, roomBackgroundPickers } from '../../assets/neliWorldAssets';
import { IdleHand, useIdleHint } from '../../quest/IdleHand';
import { dir, ff } from '../../theme/fonts';
import { FA_TEST_AUDIO, FaTestAudioKey } from '../../assets/faTestAudio.generated';
import { playFaAudio, stopFaAudio } from '../../utils/faAudio';
import { PHOTO_FARSI_WORDS, PhotoFarsiWord } from '../../data/photoFarsiWords';
import { FIRST_LETTERS, WORD_FIRST_LETTER, FirstLetter, findFirstLetter } from '../../data/firstLetter';

// Everything scales from a 400pt-tall reference (a landscape phone is
// 360–440pt tall). k multiplies every size AND offset — see CLAUDE.md.
const REFERENCE_H = 400;
const ROUNDS = 5;
const CHOICES = 3;

const PROMPT_WORDS = PHOTO_FARSI_WORDS.filter(
  w => w.audioKey != null && w.audioKey in FA_TEST_AUDIO && WORD_FIRST_LETTER[w.id] && findFirstLetter(WORD_FIRST_LETTER[w.id]),
);

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function tap() {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // haptics are best-effort (web has none)
  }
}

type Deal = { word: PhotoFarsiWord; answer: FirstLetter; choices: FirstLetter[] };

const BLOCK_COLORS = ['#E63B3B', '#FFB800', '#2B7FFF'];
const BLOCK_EDGES = ['#B91C1C', '#D99A00', '#1D4ED8'];

export default function FirstLetterGame() {
  const { width: W, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { navigate } = useNav();
  const k = height / REFERENCE_H;
  const [round, setRound] = useState(0);
  // One deal per round: the answer is always among the shown letters, and
  // the word never repeats twice in a row.
  const lastWordId = useRef<string | null>(null);
  const freshDeal = (): Deal => {
    let pool = PROMPT_WORDS.filter(w => w.id !== lastWordId.current);
    if (pool.length === 0) pool = PROMPT_WORDS;
    const word = shuffle(pool)[0]!;
    lastWordId.current = word.id;
    const answer = findFirstLetter(WORD_FIRST_LETTER[word.id])!;
    const others = shuffle(FIRST_LETTERS.filter(l => l.id !== answer.id)).slice(0, CHOICES - 1);
    return { word, answer, choices: shuffle([answer, ...others]) };
  };
  const [deal, setDeal] = useState<Deal>(freshDeal);
  const [prompting, setPrompting] = useState(true);
  const [stars, setStars] = useState(0);
  const [done, setDone] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  // Skill memory for the whole session: after 5 correct answers the Farsi
  // name hides at first sight, and only appears when she taps the right
  // letter. Never reset on restart — earned skill stays earned.
  const [totalRight, setTotalRight] = useState(0);
  const [taps, setTaps] = useState(0);
  const showHand = useIdleHint(!done && !prompting, 7000, round * 1000 + taps);
  const showName = totalRight < 5 || rightId !== null;
  const alive = useRef(true);

  // Recorded clips and TTS must never overlap — silence both on exit.
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      void stopFaAudio();
    };
  }, []);

  const speakPrompt = async (word: PhotoFarsiWord) => {
    setPrompting(true);
    await playFaAudio(word.audioKey as FaTestAudioKey, { awaitFinish: true });
    if (alive.current) setPrompting(false);
  };

  // Speak the first prompt after mount (user already tapped into the
  // game): the instruction first when its recording ships, then the word.
  useEffect(() => {
    void (async () => {
      await playFaAudio('letter/which-letter', { awaitFinish: true });
      if (alive.current) void speakPrompt(deal.word);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextRound = (next: number) => {
    if (next >= ROUNDS) {
      setDone(true);
      return;
    }
    const nextDeal = freshDeal();
    setDeal(nextDeal);
    setWrongId(null);
    setRightId(null);
    setRound(next);
    void speakPrompt(nextDeal.word);
  };

  const choose = async (letter: FirstLetter) => {
    if (prompting || done) return;
    tap();
    setTaps(t => t + 1);
    setPrompting(true);
    // Every tap teaches the tapped letter's name first.
    await playFaAudio(letter.audioKey as FaTestAudioKey, { awaitFinish: true });
    if (!alive.current) return;
    if (letter.id === deal.answer.id) {
      setRightId(letter.id);
      setTotalRight(t => t + 1);
      await playFaAudio('feedback/afarin');
      if (!alive.current) return;
      setStars(s => s + 1);
      setTimeout(() => alive.current && nextRound(round + 1), 450);
    } else {
      setPrompting(false);
      setWrongId(letter.id);
      await playFaAudio('feedback/try-again');
      if (alive.current) setWrongId(null);
    }
  };

  const replay = () => {
    if (done) return;
    tap();
    setTaps(t => t + 1);
    void speakPrompt(deal.word);
  };

  const restart = () => {
    tap();
    const nextDeal = freshDeal();
    setRound(0);
    setStars(0);
    setDone(false);
    setDeal(nextDeal);
    setWrongId(null);
    setRightId(null);
    void speakPrompt(nextDeal.word);
  };

  // Playground scene: stars on top, the word's real picture big in the
  // middle on the grass, the buddy big beside it, 3 chunky toy blocks
  // below (smaller than the picture). No cards, no English, no question
  // text — the spoken word is the question.
  const picS = Math.min(height * 0.28, W * 0.22);
  const blockS = Math.min(height * 0.16, W * 0.1);
  const buddyS = Math.min(height * 0.55, W * 0.2);
  const answerIdx = deal.choices.findIndex(c => c.id === deal.answer.id);
  const s = styles(k);
  return (
    <View style={s.root}>
      <GameBg pick={roomBackgroundPickers.playground} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 60, elevation: 60 }}>
        <TopBar title="حرف اول" titleFa="حرف اول" dark showClose onBack={() => navigate({ name: 'MagicGames' })} />
      </View>
      {/* Gold progress stars, top-center. */}
      {!done ? (
        <View style={[s.starsWrap, { top: topBarHeight(height, insets.top) + 8 }]} pointerEvents="none">
          <View style={{ flexDirection: 'row', gap: 6 * k }}>
            {Array.from({ length: ROUNDS }).map((_, i) => (
              <Text
                key={i}
                style={{
                  fontSize: Math.max(22, 26 * k),
                  color: i < stars ? '#FFB800' : 'rgba(255,255,255,0.92)',
                  textShadowColor: 'rgba(30,20,60,0.65)',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 5,
                }}
              >
                ★
              </Text>
            ))}
          </View>
        </View>
      ) : null}
      <View style={s.body}>
        {done ? (
          <View style={s.endCard}>
            <Image source={neliWorldAssets.ui.star} style={{ width: 56 * k, height: 56 * k }} resizeMode="contain" />
            <Text style={[s.endFa, dir('fa'), { textAlign: 'center' }]}>آفرین! حرف‌ها را بلدی</Text>
            <Text style={s.endStars}>★ {stars}/{ROUNDS}</Text>
            <TouchableOpacity style={s.againBtn} onPress={restart} activeOpacity={0.85}>
              <Text style={[s.againText, dir('fa'), { textAlign: 'center' }]}>دوباره</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={s.buddyCol}>
              <BuddyGuide mood={prompting ? 'thinking' : rightId ? 'happy' : 'idle'} size={buddyS} />
              <SoftShadow width={buddyS} />
            </View>
            {/* Object stands straight on the grass (bottom ~88%), blocks
                in a row to its right, word pill above the blocks. The
                swing is background only. Tap the object to hear the word. */}
            <View style={[s.midCol, { paddingBottom: height * 0.12 }]}>
              <View style={s.objSide}>
                <TouchableOpacity onPress={replay} disabled={prompting || done} activeOpacity={0.85} accessibilityRole="button">
                  <WordArt art={WORD_ART[deal.word.id] ?? null} emoji={deal.word.emoji} size={picS} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.speakerBadge, { width: 46 * k, height: 46 * k, borderRadius: 23 * k }]}
                  onPress={replay}
                  disabled={prompting || done}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <Image source={neliWorldAssets.ui.voice} style={{ width: 24 * k, height: 24 * k }} resizeMode="contain" />
                </TouchableOpacity>
                <SoftShadow width={picS} />
              </View>
              <View style={s.blockSide}>
                {showName ? (
                  <View style={s.namePill}>
                    <Text style={[s.nameFa, dir('fa'), { textAlign: 'center' }]} numberOfLines={1}>{deal.word.fa}</Text>
                  </View>
                ) : null}
                <View style={s.choiceRow}>
                  {deal.choices.map((c, i) => (
                    <View key={c.id} style={s.blockWrap}>
                      {showHand && i === answerIdx ? (
                        <View pointerEvents="none" style={[s.hand, { top: -blockS * 0.75 }]}>
                          <IdleHand size={blockS * 0.8} />
                        </View>
                      ) : null}
                      <TouchableOpacity
                        style={[
                          s.card,
                          { backgroundColor: BLOCK_COLORS[i % BLOCK_COLORS.length], borderBottomColor: BLOCK_EDGES[i % BLOCK_EDGES.length], width: blockS, height: blockS, borderRadius: 18 * k },
                          c.id === wrongId && s.cardWrong,
                          c.id === rightId && s.cardRight,
                        ]}
                        onPress={() => void choose(c)}
                        disabled={prompting}
                        activeOpacity={0.85}
                      >
                        <Text style={[s.cardGlyph, dir('fa'), { textAlign: 'center' }]}>{c.glyph}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const CARD_SHADOW = {
  shadowColor: 'rgba(58,42,107,0.30)',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 6,
  elevation: 5,
};

const styles = (k: number) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: '#7FCDFF' },
    starsWrap: { position: 'absolute', alignSelf: 'center', zIndex: 30, elevation: 30 },
    body: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 * k, columnGap: 12 * k },
    buddyCol: { width: '28%', alignItems: 'center', justifyContent: 'flex-end', alignSelf: 'stretch', paddingBottom: 10 * k },
    midCol: { flex: 1, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', columnGap: 14 * k },
    objSide: { position: 'relative', alignItems: 'center' },
    blockSide: { alignItems: 'center', justifyContent: 'flex-end', rowGap: 6 * k },
    speakerBadge: {
      position: 'absolute',
      right: 6 * k,
      bottom: 10 * k,
      backgroundColor: '#FFB800',
      borderWidth: 2,
      borderColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      ...CARD_SHADOW,
    },
    namePill: {
      backgroundColor: 'rgba(255,253,245,0.95)',
      borderRadius: 999,
      paddingHorizontal: 16 * k,
      paddingVertical: 3 * k,
    },
    nameFa: { fontFamily: ff('fa', 'black'), color: '#3A2A6B', fontSize: 22 * k },
    choiceRow: { flexDirection: 'row', columnGap: 12 * k, marginTop: 4 * k },
    blockWrap: { position: 'relative', alignItems: 'center' },
    hand: { position: 'absolute', alignSelf: 'center', zIndex: 15, elevation: 15 },
    card: {
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: 6 * k,
      borderWidth: 3 * k,
      borderColor: 'transparent',
      ...CARD_SHADOW,
    },
    cardWrong: { borderColor: '#EF4444' },
    cardRight: { borderColor: '#22C55E' },
    cardGlyph: { fontFamily: ff('fa', 'black'), color: '#FFFFFF', fontSize: 40 * k, textShadowColor: 'rgba(30,20,60,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3 },
    endCard: { alignItems: 'center', rowGap: 8 * k, backgroundColor: '#FFFFFF', borderRadius: 26 * k, paddingVertical: 20 * k, marginHorizontal: 60 * k, ...CARD_SHADOW },
    endFa: { fontFamily: ff('fa', 'black'), color: '#3A2A6B', fontSize: 24 * k },
    endStars: { fontSize: 20 * k, fontFamily: ff('en', 'black'), color: '#B45309' },
    againBtn: { backgroundColor: '#22C55E', borderRadius: 14 * k, paddingHorizontal: 22 * k, paddingVertical: 8 * k },
    againText: { color: '#FFFFFF', fontSize: 18 * k, fontFamily: ff('fa', 'black') },
  });
