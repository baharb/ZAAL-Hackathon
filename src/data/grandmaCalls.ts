// Grandma's Call (زنگ مامان‌بزرگ): the content of each call, as data.
// A call is a list of steps the game plays in order. To add a call, record its lines into
// assets/audio/fa-test/grandma-call/ (Grandma = Zephyr young-mother prompt, Neli = the
// Grandma-reel Neli prompt; check every clip for silent tails), add them to
// src/assets/faTestAudio.generated.ts, then add a GrandmaCall below. No game code changes.
import type { FaTestAudioKey } from '../assets/faTestAudio.generated';
import { neliWorldAssets } from '../assets/neliWorldAssets';

export type Line = {
  fa: string;
  en: string;
  /** shown instead of the sentence: the things the line names, as picture + word */
  pics?: Pick[];
  /** shown instead of the sentence: one big symbol (for lines a pre-reader can't read anyway) */
  icon?: string;
};

/** A picture the child taps: a food, a feeling, a colour... `art` is images, an emoji, or a colour swatch. */
export type Pick = Line & {
  id: string;
  /** `scale` enlarges art that has a lot of empty space around it, so every picture looks the same size. */
  art: { images?: any[]; emoji?: string; swatch?: string; scale?: number };
  /** Neli says this when it is picked (or, for a word card, the word itself). */
  clip: FaTestAudioKey;
  /** Shown under the Farsi on word cards. */
  translit?: string;
  /** What Neli's clip actually says, when it is more than the label (shown as the subtitle). */
  said?: Line;
};

export type CallStep =
  /** Grandma says a line on the call. */
  | ({ kind: 'grandma'; clip: FaTestAudioKey } & Line)
  /** Neli says a line on the call. */
  | ({ kind: 'neli'; clip: FaTestAudioKey } & Line)
  /** The child answers by tapping one of the options; Neli says the chosen one. Any option is fine. */
  | { kind: 'reply'; options: Pick[] }
  /** New words: each card is shown and spoken, then the call goes on by itself (a card can be tapped to hear it again). */
  | { kind: 'words'; words: Pick[] }
  /** Grandma asks; the child taps the right picture; then Neli says the answer. */
  | ({ kind: 'quiz'; clip: FaTestAudioKey; answer: string; options: Pick[] } & Line);

export type GrandmaCall = {
  id: string;
  title: Line;
  steps: CallStep[];
};

const A = (k: string) => `grandma-call/${k}` as FaTestAudioKey;

// --- picks shared by the steps below -----------------------------------------
const W = {
  khoobam: { id: 'khoobam', fa: 'خوبم', en: "I'm good", translit: 'khoobam', art: { emoji: '😊' }, clip: A('word/khoobam') },
  noon: { id: 'noon', fa: 'نون', en: 'bread', translit: 'noon', art: { images: [neliWorldAssets.persianFoods.lavash] }, clip: A('word/noon') },
  panir: { id: 'panir', fa: 'پنیر', en: 'cheese', translit: 'panir', art: { images: [neliWorldAssets.foods.cheese] }, clip: A('word/panir') },
  berenj: { id: 'berenj', fa: 'برنج', en: 'rice', translit: 'berenj', art: { images: [neliWorldAssets.foods.rice], scale: 1.12 }, clip: A('word/berenj') },
  morgh: { id: 'morgh', fa: 'مرغ', en: 'chicken', translit: 'morgh', art: { emoji: '🍗', scale: 1.25 }, clip: A('word/morgh') },
  sib: { id: 'sib', fa: 'سیب', en: 'apple', translit: 'sib', art: { images: [neliWorldAssets.foods.apple] }, clip: A('word/sib') },
  berenjMorgh: { id: 'berenj-morgh', fa: 'برنج و مرغ', en: 'rice and chicken', translit: 'berenj o morgh', art: { images: [neliWorldAssets.persianFoods.zereshkPoloBaMorgh], scale: 1.45 }, clip: A('neli/berenj-morgh') },
  ghermez: { id: 'ghermez', fa: 'قرمز', en: 'red', translit: 'ghermez', art: { swatch: '#E8322E' }, clip: A('word/ghermez') },
} satisfies Record<string, Pick>;

const MEALS = {
  noonPanir: { id: 'noon-panir', fa: 'نون و پنیر', en: 'bread and cheese', art: { images: [neliWorldAssets.persianFoods.lavash, neliWorldAssets.foods.cheese] }, clip: A('neli/noon-panir'), said: { fa: 'نون و پنیر خوردم!', en: 'I had bread and cheese!', pics: [W.noon, W.panir] } },
  berenjMorgh: { id: 'berenj-morgh', fa: 'برنج و مرغ', en: 'rice and chicken', art: { images: [neliWorldAssets.persianFoods.zereshkPoloBaMorgh], scale: 1.45 }, clip: A('neli/berenj-morgh'), said: { fa: 'برنج و مرغ خوردم!', en: 'I had rice and chicken!', pics: [W.berenjMorgh] } },
  sib: { id: 'sib', fa: 'سیب', en: 'an apple', art: { images: [neliWorldAssets.foods.apple] }, clip: A('neli/sib'), said: { fa: 'سیب! سیب قرمز!', en: 'Apple! A red apple!', pics: [W.sib, W.ghermez] } },
} satisfies Record<string, Pick>;
const MEAL_OPTIONS = [MEALS.noonPanir, MEALS.berenjMorgh, MEALS.sib];

// --- the calls ---------------------------------------------------------------
export const GRANDMA_CALLS: GrandmaCall[] = [
  {
    // Same story as the YouTube episode "Grandma's Call, Ep 1". The first part plays as a
    // conversation with no taps and no word-by-word stops (the words show as pictures beside
    // Neli's lines); the child taps only in the quiz part.
    id: 'what-did-you-eat',
    title: { fa: 'امروز چی خوردی؟', en: 'What did you eat today?' },
    steps: [
      { kind: 'grandma', clip: A('grandma/salam'), fa: 'سلام عزیزم! خوبی؟', en: 'Hi sweetheart! How are you?' },
      { kind: 'neli', clip: A('neli/salam'), fa: 'سلام مامان‌جون! خوبم، مرسی!', en: "Hi Grandma! I'm good, thanks!", pics: [W.khoobam] },

      { kind: 'grandma', clip: A('grandma/sobhoone'), fa: 'صبحونه چی خوردی؟', en: 'What did you have for breakfast?' },
      { kind: 'neli', clip: A('neli/noon-panir'), fa: 'نون و پنیر خوردم!', en: 'I had bread and cheese!', pics: [W.noon, W.panir] },

      { kind: 'grandma', clip: A('grandma/mive'), fa: 'چه میوه‌ای دوست داری؟', en: 'Which fruit do you like?' },
      { kind: 'neli', clip: A('neli/sib'), fa: 'سیب! سیب قرمز!', en: 'Apple! A red apple!', pics: [W.sib, W.ghermez] },
      { kind: 'grandma', clip: A('grandma/nahar'), fa: 'ناهار چی خوردی؟', en: 'What did you have for lunch?' },
      { kind: 'neli', clip: A('neli/berenj-morgh'), fa: 'برنج و مرغ خوردم!', en: 'I had rice and chicken!', pics: [W.berenjMorgh] },

      { kind: 'grandma', clip: A('grandma/afarin'), fa: 'آفرین! نوش جان!', en: 'Well done! Enjoy!' },

      // the child's turn: Grandma asks again, the child taps what Neli ate
      { kind: 'neli', clip: A('neli/now'), fa: 'حالا تو جواب بده!', en: 'Now you answer Grandma!', icon: '🎤' },
      { kind: 'quiz', clip: A('grandma/sobhoone'), fa: 'صبحونه چی خوردی؟', en: 'What did you have for breakfast?', answer: 'noon-panir', options: MEAL_OPTIONS },
      { kind: 'quiz', clip: A('grandma/mive'), fa: 'چه میوه‌ای دوست داری؟', en: 'Which fruit do you like?', answer: 'sib', options: MEAL_OPTIONS },
      { kind: 'quiz', clip: A('grandma/nahar'), fa: 'ناهار چی خوردی؟', en: 'What did you have for lunch?', answer: 'berenj-morgh', options: MEAL_OPTIONS },
      { kind: 'grandma', clip: A('grandma/afarin'), fa: 'آفرین! نوش جان!', en: 'Well done! Enjoy!' },

      { kind: 'neli', clip: A('neli/dooset'), fa: 'دوستت دارم مامان‌جون!', en: 'I love you, Grandma!' },
      { kind: 'grandma', clip: A('grandma/bye'), fa: 'منم دوستت دارم عزیزم! خداحافظ!', en: 'I love you too, sweetheart! Bye!' },
      { kind: 'neli', clip: A('neli/bye'), fa: 'خداحافظ!', en: 'Bye!' },
    ],
  },
];

/** The adult prompt before the first quiz question of a call («نوبت توئه! تو بگو!»). */
export const YOUR_TURN_CLIP = A('prompt/your-turn');
