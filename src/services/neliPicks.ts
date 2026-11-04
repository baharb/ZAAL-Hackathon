// "Neli remembers" + parent dinner note (Meta hackathon).
//
// Privacy: the ONLY child data that ever leaves the device here is word
// ids plus correct/wrong counts, sent through askMeta (the meta-ai Edge
// Function, muse-spark-1.3). No names, no photos, no audio, no prompts
// about the child. Every reply is validated against the game's own word
// list; anything odd, slow (>4s) or offline falls back silently to the
// game's normal random choice — the child never waits and never sees an
// error.

import { askMeta } from './metaAI';
import { FA_TEST_AUDIO } from '../assets/faTestAudio.generated';
import { getTodayWordIds, loadWordLog, todayKey } from '../store/wordLog';

export type NeliAllowedWord = { id: string; audioKey: string };

const PICK_TIMEOUT_MS = 4000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('neli timeout')), ms)),
  ]);
}

/** Ask Muse Spark which 3 allowed words to practice next, based on the
 * child's recent wordLog results (missed / rarely practiced first).
 * Returns exactly 3 validated word ids, or null to use the random pick. */
export async function askNeliPicks(allowed: NeliAllowedWord[]): Promise<string[] | null> {
  try {
    const valid = allowed.filter(w => w.audioKey && w.audioKey in FA_TEST_AUDIO);
    const byId = new Map(valid.map(w => [w.id, w]));
    if (byId.size < 3) return null;

    const state = await loadWordLog();
    // Recent results for THIS game's words only: ids + counts, nothing else.
    const recent = valid
      .map(w => {
        const s = state.stats[w.audioKey];
        return s ? { id: w.id, correct: s.correct, wrong: s.wrong, heard: s.seen } : null;
      })
      .filter((r): r is { id: string; correct: number; wrong: number; heard: number } => r !== null);
    // Nothing practiced yet -> nothing personal to choose from.
    if (recent.length === 0) return null;

    const prompt =
      `A young child is learning Farsi words in a game. ` +
      `Recent practice results (word id, times correct, times wrong, times heard): ${JSON.stringify(recent)}. ` +
      `Allowed word ids for this game: ${JSON.stringify([...byId.keys()])}. ` +
      `Choose exactly 3 allowed word ids to practice next: prefer words with more wrong than correct, ` +
      `then words heard least. Reply with ONLY this JSON and no other text: {"ids":["...","...","..."]}`;
    const res = await withTimeout(
      askMeta({ prompt, system: 'Reply with JSON only: {"ids":["id1","id2","id3"]}. No other text.', maxTokens: 120, temperature: 0.3 }, 0),
      PICK_TIMEOUT_MS,
    );
    if ('error' in res || !res.text) return null;

    const clean = res.text.replace(/```json|```/g, '');
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    const parsed = JSON.parse(clean.slice(start, end + 1)) as { ids?: unknown };
    if (!Array.isArray(parsed.ids) || parsed.ids.length !== 3) return null;
    const ids = parsed.ids.map(v => String(v));
    // Every id must be one of this game's words and have a recording.
    if (ids.some(id => !byId.has(id))) return null;
    if (new Set(ids).size !== 3) return null;
    return ids;
  } catch {
    return null;
  }
}

export type TodayWordPractice = { id: string; correct: number; wrong: number };

/** Today's practiced words (ids + counts only) for the parent note. */
export async function getTodayPractice(): Promise<TodayWordPractice[]> {
  const state = await loadWordLog();
  return getTodayWordIds(state, todayKey()).map(id => {
    const s = state.stats[id];
    return { id, correct: s?.correct ?? 0, wrong: s?.wrong ?? 0 };
  });
}

/** Offline template note, built only from today's word ids. */
export function templateParentNote(words: TodayWordPractice[], faNameOf: (id: string) => string | null): string {
  const enNames = words.map(w => w.id.split('/').pop() ?? w.id).slice(0, 5);
  const fa = words.map(w => faNameOf(w.id)).find(Boolean) ?? 'سیب';
  return (
    `Tonight at home: today your child practiced ${enNames.join(', ')}. ` +
    `At dinner, point at one and ask together: «این چیه؟ ${fa}!»`
  );
}

/** Ask Muse Spark for a 2-3 line parent note (English + one simple Farsi
 * dinner phrase using today's words). Returns null when offline/invalid,
 * so the caller uses templateParentNote instead. Sends ids + counts only. */
export async function askParentNote(words: TodayWordPractice[]): Promise<string | null> {
  if (words.length === 0) return null;
  try {
    const prompt =
      `A young child practiced these Farsi words today in a learning app ` +
      `(word id, times correct, times wrong): ${JSON.stringify(words)}. ` +
      `Write a note for the PARENT: 2 or 3 short lines in English, warm and concrete, saying what to try at dinner tonight. ` +
      `Include exactly ONE simple Farsi phrase in «» that uses one of today's words, with its English meaning in brackets. ` +
      `No hype, no medical or developmental claims. Reply with the note text only.`;
    const res = await withTimeout(
      askMeta({ prompt, system: 'Write only a short parent note (2-3 lines). No other text.', maxTokens: 220, temperature: 0.5 }, 0),
      PICK_TIMEOUT_MS,
    );
    if ('error' in res || !res.text) return null;
    const text = res.text.trim();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 1 || lines.length > 4 || text.length > 600) return null;
    if (!text.includes('«')) return null;
    return lines.join('\n');
  } catch {
    return null;
  }
}
