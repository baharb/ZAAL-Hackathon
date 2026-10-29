// Quest v2 pick lists (section 2). Fruit and Ingredient are separate lists:
// cucumber counts as a Fruit (served with fruit in Iranian homes). Dishes
// come from cooking/name/*, colors from painting/color/*. Every entry below
// resolves through the catalog, so each option has both art and a recording.

import { QUEST_WORDS } from '../data/questWords';
import { DisplayWord, displayWordById } from './questGroups';

export type PickKind = 'fruit' | 'ingredient' | 'color' | 'dish';

// Words small kids would not meet as simple everyday foods: raw cuts, ground
// meat and dried herbs, plus non-food items a child would never pick to eat
// (water, cooking oil, salt). (The info-cook instruction clip has no catalog
// art, so it can never appear in a pool in the first place.)
const INGREDIENT_EXCLUDE = new Set([
  'ingredients/filletChickenRaw',
  'ingredients/groundBeefRaw',
  'ingredients/cutRawBeefForStew',
  'ingredients/driedMint',
  'ingredients/water',
  'ingredients/oil',
  'ingredients/salt',
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

// Colors that look close to each other: a wrong option must never come from
// the answer's close list, so e.g. teal never appears with aqua (cyan) and
// pink never appears with purple. Neutrals avoid each other too, so brown
// never appears with gray or black.
function colorsFarApart(a: string, b: string): boolean {
  if (a === b) return false;
  return !(COLOR_CLOSE[a] ?? []).includes(b) && !(COLOR_CLOSE[b] ?? []).includes(a);
}

const COLOR_CLOSE: Record<string, string[]> = {

  'painting/color/red': ['painting/color/orange', 'painting/color/rose', 'painting/color/pink'],
  'painting/color/orange': ['painting/color/red', 'painting/color/amber', 'painting/color/yellow'],
  'painting/color/amber': ['painting/color/orange', 'painting/color/yellow'],
  'painting/color/yellow': ['painting/color/amber', 'painting/color/lime'],
  'painting/color/lime': ['painting/color/yellow', 'painting/color/green'],
  'painting/color/green': ['painting/color/lime', 'painting/color/teal'],
  'painting/color/teal': ['painting/color/green', 'painting/color/aqua'],
  'painting/color/aqua': ['painting/color/teal', 'painting/color/blue'],
  'painting/color/blue': ['painting/color/aqua', 'painting/color/indigo'],
  'painting/color/indigo': ['painting/color/blue', 'painting/color/purple'],
  'painting/color/purple': ['painting/color/indigo', 'painting/color/rose', 'painting/color/pink'],
  'painting/color/rose': ['painting/color/purple', 'painting/color/pink', 'painting/color/red'],
  'painting/color/pink': ['painting/color/rose', 'painting/color/purple', 'painting/color/red'],
  'painting/color/brown': ['painting/color/gray', 'painting/color/black', 'painting/color/orange'],
  'painting/color/gray': ['painting/color/brown', 'painting/color/black'],
  'painting/color/black': ['painting/color/brown', 'painting/color/gray'],
};

/** 3 random options from the whole pool, skipping ids already shown. */
export function sampleOptions(
  pool: DisplayWord[],
  count: number,
  excludeIds: Set<string>,
): DisplayWord[] {
  const isColorPool = pool.length > 0 && pool.every(w => w.id.startsWith('painting/color/'));
  if (isColorPool) {
    if (excludeIds.size === 1) {
      // A distractor pick: the one excluded id is the answer.
      const answerId = [...excludeIds][0]!;
      const banned = new Set([answerId, ...(COLOR_CLOSE[answerId] ?? [])]);
      const avail = pool.filter(w => !banned.has(w.id));
      if (avail.length >= count) return shuffle(avail).slice(0, count);
      // Fall back to anything but the answer if the pool ever shrinks.
      return shuffle(pool.filter(w => w.id !== answerId)).slice(0, count);
    }
    // A free pick (no single right answer): the shown colors must still be
    // far apart from each other, so e.g. red never sits next to pink.
    const availFree = shuffle(pool.filter(w => !excludeIds.has(w.id)));
    const pickedFree: DisplayWord[] = [];
    for (const w of availFree) {
      if (pickedFree.length >= count) break;
      if (pickedFree.every(p => colorsFarApart(p.id, w.id))) pickedFree.push(w);
    }
    for (const w of availFree) {
      if (pickedFree.length >= count) break;
      if (!pickedFree.some(p => p.id === w.id)) pickedFree.push(w);
    }
    return pickedFree.slice(0, count);
  }

  const avail = pool.filter(w => !excludeIds.has(w.id));
  return shuffle(avail).slice(0, count);
}
