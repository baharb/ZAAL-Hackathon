// Built-in level-1 quest generator (hackathon step 2).
// No AI yet: turns the child's 2 picked words into 3 stops on the map —
// 2 find_it stops plus the finale. The AI generator (spec step 3) will
// replace this while keeping the same shape.

import { ChildCategory, DisplayWord, wordsForGroup } from './questGroups';

export type Level1Surprise = 'gift_box' | 'shake_tree' | 'open_basket';

export type Level1Step =
  | {
      type: 'find_it';
      target: DisplayWord;
      // Exactly 2 pictures at level 1: the target + one distractor.
      choices: DisplayWord[];
      surprise: Level1Surprise;
    }
  | {
      type: 'finale';
      words: DisplayWord[];
      surprise: 'open_basket';
    };

export type Level1Quest = {
  group: ChildCategory;
  themeFa: string;
  themeEn: string;
  steps: Level1Step[];
};

const THEMES: Record<ChildCategory, { fa: string; en: string }> = {
  food: { fa: 'پیک‌نیک با مادربزرگ', en: "Grandma's picnic" },
  clothes: { fa: 'آماده شو بریم بیرون', en: 'Getting dressed' },
  colors: { fa: 'دنیای رنگارنگ', en: 'Colorful world' },
  letters: { fa: 'جشن حروف', en: 'Letter party' },
  space: { fa: 'سفر به فضا', en: 'Trip to space' },
  numbers: { fa: 'شمارش ستاره‌ها', en: 'Counting stars' },
};

const SURPRISES: Level1Surprise[] = ['gift_box', 'shake_tree'];

/**
 * Build a level-1 quest from exactly 2 picked words. Distractors come from
 * the same child category so the question stays fair; the finale gathers
 * both words to complete the theme.
 */
export function buildLevel1Quest(
  picked: DisplayWord[],
  group: ChildCategory,
): Level1Quest {
  const words = picked.slice(0, 2);
  const pool = wordsForGroup(group).filter(w => !words.some(p => p.id === w.id));
  const theme = THEMES[group];
  const steps: Level1Step[] = words.map((target, i) => {
    // A distractor from the same category; never the target itself.
    const distractor = pool[i % Math.max(1, pool.length)] ?? words[(i + 1) % words.length];
    return {
      type: 'find_it' as const,
      target,
      choices: [target, distractor],
      surprise: SURPRISES[i % SURPRISES.length],
    };
  });
  steps.push({ type: 'finale', words, surprise: 'open_basket' });
  return { group, themeFa: theme.fa, themeEn: theme.en, steps };
}
