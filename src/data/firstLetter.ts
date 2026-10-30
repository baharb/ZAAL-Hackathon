// First Letter content (Meta hackathon backlog).
// Maps Photo Farsi words to their first-letter id and builds a pool of
// letter cards from the repo's own letter table — never hand-copied glyphs.
// Every letter in the pool is verified at runtime to have BOTH a tracing
// entry (for the exact glyph) and a shipped name recording.

import { FARSI_LETTER_BY_ID } from './farsiLetters';
import { FA_TEST_AUDIO } from '../assets/faTestAudio.generated';
import { ALPHABET_AUDIO_ID_OVERRIDE, makeAlphabetAudioKey } from '../utils/faAudio';

export const WORD_FIRST_LETTER: Record<string, string> = {
  book: 'kaf',
  backpack: 'kaf',
  hat: 'kaf',
  shoe: 'kaf',
  apple: 'sin',
  orange: 'pe',
  bread: 'nun',
  fish: 'mim',
  water: 'alef',
};

export type FirstLetter = { id: string; glyph: string; audioKey: string };

const LETTER_POOL_IDS = [
  'alef', 'be', 'pe', 'te', 'jim', 'shin',
  'sin', 'mim', 'kaf', 'nun', 'fe', 'lam',
];

function letterAudioKey(letterId: string): string | null {
  const audioId = ALPHABET_AUDIO_ID_OVERRIDE[letterId] ?? letterId;
  const key = makeAlphabetAudioKey('name', audioId);
  return key in FA_TEST_AUDIO ? key : null;
}

export const FIRST_LETTERS: FirstLetter[] = LETTER_POOL_IDS.flatMap(id => {
  const entry = (FARSI_LETTER_BY_ID as Record<string, { letter?: string }>)[id];
  const audioKey = letterAudioKey(id);
  if (!entry?.letter || !audioKey) return [];
  return [{ id, glyph: entry.letter, audioKey }];
});

export function findFirstLetter(id: string | null | undefined): FirstLetter | null {
  if (!id) return null;
  return FIRST_LETTERS.find(l => l.id === id) ?? null;
}
