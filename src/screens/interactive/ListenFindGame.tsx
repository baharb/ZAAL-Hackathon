// Listen & Find — Meta hackathon game. Neli SAYS a Farsi word (a shipped
// recording, never synthesized speech) and the child taps the matching
// picture. Pure listening practice: the prompt is audio-only. Wrong taps
// get the recorded try-again clip, never a scolding. Five rounds per game.

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useWindowDimensions } from '../../layout/PortraitFallback';
import { useNav } from '../../store/NavContext';
import TopBar from '../../components/TopBar';
import QuestBackdrop, { QUEST_SKY } from '../../quest/QuestBackdrop';
import { dir, ff } from '../../theme/fonts';
import { FA_TEST_AUDIO, FaTestAudioKey } from '../../assets/faTestAudio.generated';
import { playFaAudio, stopFaAudio } from '../../utils/faAudio';
import { PHOTO_FARSI_WORDS, PhotoFarsiWord } from '../../data/photoFarsiWords';

// Everything scales from a 400pt-tall reference (a landscape phone is
// 360–440pt tall). k multiplies every size AND offset — see CLAUDE.md.
const REFERENCE_H = 400;
const ROUNDS = 5;
const CHOICES = 3;

const VOICED_WORDS = PHOTO_FARSI_WORDS.filter(w => w.audioKey != null && w.audioKey in FA_TEST_AUDIO);

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

export default function ListenFindGame() {
  const { height } = useWindowDimensions();
  const { reset } = useNav();
  const k = height / REFERENCE_H;
  const [round, setRound] = useState(0);
  // One deal per round: the answer is always among the shown cards, and
  // the word never repeats twice in a row.
  const lastWordId = useRef<string | null>(null);
  const freshCards = (): { answer: PhotoFarsiWord; choices: PhotoFarsiWord[] } => {
    let pool = VOICED_WORDS.filter(w => w.id !== lastWordId.current);
    if (pool.length === 0) pool = VOICED_WORDS;
    const picked = shuffle(pool);
    const first = picked[0]!;
    lastWordId.current = first.id;
    return { answer: first, choices: shuffle(picked.filter(w => w.id !== first.id).slice(0, CHOICES - 1).concat(first)) };
  };
  const [cards, setCards] = useState(freshCards);
  const [prompting, setPrompting] = useState(true);
  const [stars, setStars] = useState(0);
  const [done, setDone] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
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
    void speakPrompt(cards.answer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextRound = (next: number) => {
    if (next >= ROUNDS) {
      setDone(true);
      return;
    }
    const deal = freshCards();
    setCards(deal);
    setWrongId(null);
    setRightId(null);
    setRound(next);
    void speakPrompt(deal.answer);
  };

  const choose = async (word: PhotoFarsiWord) => {
    if (prompting || done) return;
    tap();
    if (word.id === cards.answer.id) {
      setPrompting(true);
      setRightId(word.id);
      await playFaAudio('feedback/afarin');
      if (!alive.current) return;
      setStars(s => s + 1);
      setTimeout(() => alive.current && nextRound(round + 1), 450);
    } else {
      setWrongId(word.id);
      await playFaAudio('feedback/try-again');
      if (alive.current) setWrongId(null);
    }
  };

  const replay = () => {
    if (done) return;
    tap();
    void speakPrompt(cards.answer);
  };

  const restart = () => {
    tap();
    const deal = freshCards();
    setRound(0);
    setStars(0);
    setDone(false);
    setCards(deal);
    setWrongId(null);
    setRightId(null);
    void speakPrompt(deal.answer);
  };

  const s = styles(k);
  return (
    <View style={s.root}>
      <QuestBackdrop />
      <View style={s.topWrap}>
        <TopBar title="Listen & Find" titleFa="بشنو و پیدا کن" showClose dark topInset={10} onBack={() => reset({ name: 'Main', tab: 'Games' })} />
      </View>
      <View style={s.body}>
        {done ? (
          <View style={s.endCard}>
            <Text style={s.endEmoji}>🎉</Text>
            <Text style={[s.endFa, dir('fa'), { textAlign: 'center' }]}>آفرین! همه را پیدا کردی</Text>
            <Text style={s.endStars}>⭐ {stars}/{ROUNDS}</Text>
            <TouchableOpacity style={s.againBtn} onPress={restart} activeOpacity={0.85}>
              <Text style={s.againText}>🔁 Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={s.promptCard}>
              <TouchableOpacity style={s.speaker} onPress={replay} disabled={prompting} activeOpacity={0.85}>
                <Text style={s.speakerText}>🔊</Text>
              </TouchableOpacity>
              <Text style={s.roundText}>Round {round + 1}/{ROUNDS}</Text>
              <View style={s.starChip}>
                <Text style={s.starText}>⭐ {stars}</Text>
              </View>
            </View>
            <View style={s.choiceRow}>
              {cards.choices.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.card, c.id === wrongId && s.cardWrong, c.id === rightId && s.cardRight]}
                  onPress={() => void choose(c)}
                  disabled={prompting}
                  activeOpacity={0.85}
                >
                  <Text style={s.cardEmoji}>{c.emoji}</Text>
                  <Text style={[s.cardFa, dir('fa'), { textAlign: 'center' }]} numberOfLines={1}>{c.fa}</Text>
                  <Text style={s.cardEn} numberOfLines={1}>{c.en}</Text>
                </TouchableOpacity>
              ))}
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
    root: { flex: 1, backgroundColor: QUEST_SKY },
    topWrap: { position: 'relative', zIndex: 10, elevation: 10 },
    body: { flex: 1, paddingHorizontal: 16 * k, paddingBottom: 12 * k, rowGap: 10 * k, justifyContent: 'center' },
    promptCard: {
      borderRadius: 22 * k,
      backgroundColor: '#FFFFFF',
      paddingVertical: 10 * k,
      alignItems: 'center',
      justifyContent: 'center',
      ...CARD_SHADOW,
    },
    speaker: {
      width: 72 * k,
      height: 72 * k,
      borderRadius: 36 * k,
      backgroundColor: '#FFB800',
      alignItems: 'center',
      justifyContent: 'center',
    },
    speakerText: { fontSize: 34 * k },
    roundText: { marginTop: 4 * k, color: '#6B5CA5', fontSize: 13 * k, fontFamily: ff('en', 'black') },
    starChip: { position: 'absolute', top: 8 * k, right: 10 * k, backgroundColor: '#FACC15', borderRadius: 10 * k, paddingHorizontal: 8 * k, paddingVertical: 2 * k },
    starText: { fontSize: 12 * k, fontFamily: ff('en', 'black'), color: '#3A2A6B' },
    choiceRow: { flexDirection: 'row', columnGap: 10 * k },
    card: {
      flex: 1,
      borderRadius: 22 * k,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      paddingVertical: 14 * k,
      borderWidth: 3 * k,
      borderColor: 'transparent',
      ...CARD_SHADOW,
    },
    cardWrong: { borderColor: '#EF4444' },
    cardRight: { borderColor: '#22C55E' },
    cardEmoji: { fontSize: 52 * k },
    cardFa: { fontFamily: ff('fa', 'black'), color: '#3A2A6B', fontSize: 22 * k },
    cardEn: { color: '#6B5CA5', fontSize: 14 * k },
    endCard: { alignItems: 'center', rowGap: 8 * k, backgroundColor: '#FFFFFF', borderRadius: 26 * k, paddingVertical: 20 * k, marginHorizontal: 60 * k, ...CARD_SHADOW },
    endEmoji: { fontSize: 56 * k },
    endFa: { fontFamily: ff('fa', 'black'), color: '#3A2A6B', fontSize: 24 * k },
    endStars: { fontSize: 20 * k, fontFamily: ff('en', 'black'), color: '#3A2A6B' },
    againBtn: { backgroundColor: '#22C55E', borderRadius: 14 * k, paddingHorizontal: 22 * k, paddingVertical: 8 * k },
    againText: { color: '#FFFFFF', fontSize: 16 * k, fontFamily: ff('en', 'black') },
  });
