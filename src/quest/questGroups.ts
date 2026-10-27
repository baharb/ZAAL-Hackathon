// "My Daily Quest" child-friendly groups (hackathon step 2).
// Groups the step-1 catalog (src/data/questWords.ts) into the big buttons
// a child picks from. Numbers have no pictures: they are shown as big Farsi
// digits drawn by the app, with the existing counting recordings.

import { QUEST_WORDS, QuestWord } from '../data/questWords';
import { FaTestAudioKey } from '../assets/faTestAudio.generated';

export type ChildCategory =
  | 'food'
  | 'clothes'
  | 'colors'
  | 'letters'
  | 'space'
  | 'numbers';

// What the pickers and the map render. Real catalog words carry art;
// number words carry a digit string instead (art is null).
export type DisplayWord = {
  id: string;
  fa: string;
  audioKey: FaTestAudioKey;
  art: QuestWord['art'] | null;
  digit?: string;
  firstLetterId: string;
};

export type ChildCategoryInfo = {
  id: ChildCategory;
  fa: string;
  en: string;
  // Art for the big category button (null only for numbers).
  previewArt: QuestWord['art'] | null;
};

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

const GROUP_OF_CATALOG: Record<string, ChildCategory> = {
  ingredients: 'food',
  'cooking/name': 'food',
  'feed-animals/food': 'food',
  clothes: 'clothes',
  'painting/color': 'colors',
  'alphabet/example': 'letters',
  'solar-system': 'space',
};

const GROUP_LABELS: Record<ChildCategory, { fa: string; en: string }> = {
  food: { fa: 'غذا', en: 'Food' },
  clothes: { fa: 'لباس', en: 'Clothes' },
  colors: { fa: 'رنگ‌ها', en: 'Colors' },
  letters: { fa: 'حروف', en: 'Letters' },
  space: { fa: 'فضا', en: 'Space' },
  numbers: { fa: 'عددها', en: 'Numbers' },
};

function toDisplay(w: QuestWord): DisplayWord {
  return {
    id: w.id,
    fa: w.fa,
    audioKey: w.audioKey,
    art: w.art,
    firstLetterId: w.firstLetterId,
  };
}

// Number words 1–9: big Farsi digits + existing counting recordings.
function numberWords(): DisplayWord[] {
  const words: DisplayWord[] = [];
  for (let n = 1; n <= 9; n += 1) {
    words.push({
      id: `counting/number/${n}`,
      fa: FA_DIGITS[n],
      audioKey: `counting/number/${n}` as FaTestAudioKey,
      art: null,
      digit: FA_DIGITS[n],
      firstLetterId: '',
    });
  }
  return words;
}

/** All playable words of one child category. */
export function wordsForGroup(group: ChildCategory): DisplayWord[] {
  if (group === 'numbers') return numberWords();
  return QUEST_WORDS.filter(w => GROUP_OF_CATALOG[w.category] === group).map(toDisplay);
}

/** DisplayWord lookup by id (catalog words and number words). */
export function displayWordById(id: string): DisplayWord | null {
  if (id.startsWith('counting/number/')) {
    return numberWords().find(w => w.id === id) ?? null;
  }
  const found = QUEST_WORDS.find(w => w.id === id);
  return found ? toDisplay(found) : null;
}

/**
 * Categories ready to play: at least `min` words with art-or-digit and a
 * recording. Numbers always qualify (9 digits + 9 recordings).
 */
export function readyGroups(min = 4): ChildCategoryInfo[] {
  const groups: ChildCategory[] = ['food', 'clothes', 'colors', 'letters', 'space', 'numbers'];
  const ready: ChildCategoryInfo[] = [];
  for (const group of groups) {
    const words = wordsForGroup(group);
    if (words.length < min) continue;
    ready.push({
      id: group,
      fa: GROUP_LABELS[group].fa,
      en: GROUP_LABELS[group].en,
      previewArt: words[0]?.art ?? null,
    });
  }
  return ready;
}
