// First Letter — Meta hackathon backlog game. Neli SAYS a Farsi word the
// child knows (a shipped recording), shows its picture, and the child taps
// the letter the word STARTS with. Every tap teaches: the tapped letter's
// own name recording plays first, then afarin or try-again. Letters come
// from the repo's tracing table with verified name recordings — Farsi is
// never synthesized (iPhones have no Persian voice).

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useWindowDimensions } from '../../layout/PortraitFallback';
import TopBar from '../../components/TopBar';
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

export default function FirstLetterGame() {
  const { height } = useWindowDimensions();
  const k = height / REFERENCE_H;
  const [round, setRound] = useState(0);
  // One deal per round: the answer is always among the shown letters.
  const freshDeal = (): Deal => {
    const word = shuffle(PROMPT_WORDS)[0];
    const answer = findFirstLetter(WORD_FIRST_LETTER[word.id])!;
    const others = shuffle(FIRST_LETTERS.filter(l => l.id !== answer.id)).slice(0, CHOICES - 1);
    return { word, answer, choices: shuffle([answer, ...others]) };
  };
  const [deal, setDeal] = useState<Deal>(freshDeal);
  const [prompting, setPrompting] = useState(true);
  const [stars, setStars] = useState(0);
  const [done, setDone] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);
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

  // Speak the first prompt after mount (user already tapped into the game).
  useEffect(() => {
    void speakPrompt(deal.word);
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
    setRound(next);
    void speakPrompt(nextDeal.word);
  };

  const choose = async (letter: FirstLetter) => {
    if (prompting || done) return;
    tap();
    setPrompting(true);
    // Every tap teaches the tapped letter's name first.
    await playFaAudio(letter.audioKey as FaTestAudioKey, { awaitFinish: true });
    if (!alive.current) return;
    if (letter.id === deal.answer.id) {
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
    void speakPrompt(nextDeal.word);
  };

  const s = styles(k);
  return (
    <View style={s.root}>
      <TopBar title="First Letter" titleFa="حرف اول" showBack />
      <View style={s.body}>
        {done ? (
          <View style={s.endCard}>
            <Text style={s.endEmoji}>🎉</Text>
            <Text style={[s.endFa, dir('fa'), { textAlign: 'center' }]}>آفرین! حرف‌ها را بلدی</Text>
            <Text style={s.endStars}>⭐ {stars}/{ROUNDS}</Text>
            <TouchableOpacity style={s.againBtn} onPress={restart} activeOpacity={0.85}>
              <Text style={s.againText}>🔁 Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={s.promptCard}>
              <Text style={s.wordEmoji}>{deal.word.emoji}</Text>
              <TouchableOpacity style={s.speaker} onPress={replay} disabled={prompting} activeOpacity={0.85}>
                <Text style={s.speakerText}>🔊</Text>
              </TouchableOpacity>
              <Text style={[s.askFa, dir('fa'), { textAlign: 'center' }]}>اولش کدام حرف است؟</Text>
              <Text style={s.roundText}>Round {round + 1}/{ROUNDS}</Text>
              <View style={s.starChip}>
                <Text style={s.starText}>⭐ {stars}</Text>
              </View>
            </View>
            <View style={s.choiceRow}>
              {deal.choices.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.card, c.id === wrongId && s.cardWrong]}
                  onPress={() => void choose(c)}
                  disabled={prompting}
                  activeOpacity={0.85}
                >
                  <Text style={[s.cardGlyph, dir('fa'), { textAlign: 'center' }]}>{c.glyph}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = (k: number) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: '#164E63' },
    body: { flex: 1, paddingHorizontal: 16 * k, paddingBottom: 12 * k, rowGap: 10 * k, justifyContent: 'center' },
    promptCard: {
      borderRadius: 20 * k,
      backgroundColor: '#FFF6E5',
      paddingVertical: 8 * k,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      columnGap: 12 * k,
    },
    wordEmoji: { fontSize: 44 * k },
    speaker: {
      width: 60 * k,
      height: 60 * k,
      borderRadius: 30 * k,
      backgroundColor: '#6C4EFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    speakerText: { fontSize: 28 * k },
    askFa: { fontFamily: ff('fa', 'black'), color: '#2D1B69', fontSize: 20 * k },
    roundText: { color: '#8A7BB8', fontSize: 13 * k, fontFamily: ff('en', 'black') },
    starChip: { position: 'absolute', top: 8 * k, right: 10 * k, backgroundColor: '#FACC15', borderRadius: 10 * k, paddingHorizontal: 8 * k, paddingVertical: 2 * k },
    starText: { fontSize: 12 * k, fontFamily: ff('en', 'black'), color: '#2D1B69' },
    choiceRow: { flexDirection: 'row', columnGap: 10 * k },
    card: {
      flex: 1,
      borderRadius: 20 * k,
      backgroundColor: '#FFF6E5',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10 * k,
      borderWidth: 3 * k,
      borderColor: 'transparent',
    },
    cardWrong: { borderColor: '#EF4444' },
    cardGlyph: { fontFamily: ff('fa', 'black'), color: '#164E63', fontSize: 64 * k },
    endCard: { alignItems: 'center', rowGap: 8 * k, backgroundColor: '#FFF6E5', borderRadius: 24 * k, paddingVertical: 20 * k, marginHorizontal: 60 * k },
    endEmoji: { fontSize: 56 * k },
    endFa: { fontFamily: ff('fa', 'black'), color: '#2D1B69', fontSize: 24 * k },
    endStars: { fontSize: 20 * k, fontFamily: ff('en', 'black'), color: '#2D1B69' },
    againBtn: { backgroundColor: '#22C55E', borderRadius: 14 * k, paddingHorizontal: 22 * k, paddingVertical: 8 * k },
    againText: { color: '#FFFFFF', fontSize: 16 * k, fontFamily: ff('en', 'black') },
  });
