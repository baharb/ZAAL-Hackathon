// Quest v2 pick lists (section 2). Fruit and Ingredient are separate lists:
// cucumber counts as a Fruit (served with fruit in Iranian homes). Dishes
// come from cooking/name/*, colors from painting/color/*. Every entry below
// resolves through the catalog, so each option has both art and a recording.

import { QUEST_WORDS } from '../data/questWords';
import { DisplayWord, displayWordById } from './questGroups';

export type PickKind = 'fruit' | 'ingredient' | 'color' | 'dish';

// Words small kids would not meet as simple everyday foods: raw cuts, ground
// meat and dried herbs. (The info-cook instruction clip has no catalog art,
// so it can never appear in a pool in the first place.)
const INGREDIENT_EXCLUDE = new Set([
  'ingredients/filletChickenRaw',
  'ingredients/groundBeefRaw',
  'ingredients/cutRawBeefForStew',
  'ingredients/driedMint',
]);

const FRUIT_IDS = new Set([
  'ingredients/apple',
  'ingredients/orange',
  'ingredients/lemon',
  'ingredients/cucumber',
  'feed-animals/food/banana',
]);

// Flat fill for the color circles drawn in code (crayon art is not used).
export const COLOR_HEX: Record<string, string> = {
  'painting/color/red': '#E53935',
  'painting/color/orange': '#FB8C00',
  'painting/color/amber': '#FFB300',
  'painting/color/yellow': '#FFEB3B',
  'painting/color/lime': '#CDDC39',
  'painting/color/green': '#43A047',
  'painting/color/teal': '#00897B',
  'painting/color/aqua': '#00ACC1',
  'painting/color/blue': '#1E88E5',
  'painting/color/indigo': '#3949AB',
  'painting/color/purple': '#8E24AA',
  'painting/color/rose': '#EC407A',
  'painting/color/pink': '#F48FB1',
  'painting/color/brown': '#795548',
  'painting/color/gray': '#9E9E9E',
  'painting/color/black': '#212121',
};

/** Full pool for one pick kind (all catalog words with art + recording). */
export function pickPool(kind: PickKind): DisplayWord[] {
  if (kind === 'fruit') {
    return QUEST_WORDS.filter(w => FRUIT_IDS.has(w.id))
      .map(w => displayWordById(w.id))
      .filter((w): w is DisplayWord => w !== null);
  }
  if (kind === 'ingredient') {
    return QUEST_WORDS.filter(w => w.category === 'ingredients' && !FRUIT_IDS.has(w.id) && !INGREDIENT_EXCLUDE.has(w.id))
      .map(w => displayWordById(w.id))
      .filter((w): w is DisplayWord => w !== null);
  }
  if (kind === 'color') {
    return QUEST_WORDS.filter(w => w.category === 'painting/color')
      .map(w => displayWordById(w.id))
      .filter((w): w is DisplayWord => w !== null);
  }
  return QUEST_WORDS.filter(w => w.category === 'cooking/name')
    .map(w => displayWordById(w.id))
    .filter((w): w is DisplayWord => w !== null);
}

export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = a;
  }
  return arr;
}

/** 3 random options from the whole pool, skipping ids already shown. */
export function sampleOptions(
  pool: DisplayWord[],
  count: number,
  excludeIds: Set<string>,
): DisplayWord[] {
  const avail = pool.filter(w => !excludeIds.has(w.id));
  return shuffle(avail).slice(0, count);
}
