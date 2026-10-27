// "My Daily Word Quest" word log (hackathon step 1).
// Tracks which vocabulary words the child heard, on this device only.
// Privacy: only word ids and counts live here. Never write recordings,
// photos, names or prompts to this log. A later step saves the child's
// spoken answers as plain audio files on the device for the parent — that
// belongs in separate device-only files, never in this log, and nothing in
// this file deletes or blocks those future files.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const STORAGE_KEY = 'quest_word_log_v1';
// How often the in-memory changes reach storage at most. Sounds stay fast
// because noteWordSeen() never waits for a write.
const SAVE_DELAY_MS = 3000;
// Old day buckets are dropped on save so the log cannot grow forever.
const KEEP_DAYS = 30;

export type ParentVerdict = 'ok' | 'practice';

export type WordStat = {
  // Times the child heard this word's recording.
  seen: number;
  // Times answered right / wrong on the first try in a quest (say_it excluded).
  correct: number;
  wrong: number;
  // Set by the parent in the "Today's words" screen (step 5).
  verdict: ParentVerdict | null;
  lastSeenDay: string;
  days: Record<string, number>;
};

export type WordLogState = {
  version: 1;
  stats: Record<string, WordStat>;
};

function freshState(): WordLogState {
  return { version: 1, stats: {} };
}

// Vocabulary groups from the quest spec. Clips outside these groups
// (cheers, music, feedback, intros, conversation helpers) are never logged.
// Instructional clips inside vocabulary groups are blocked by name below.
const LOGGED_PREFIXES = [
  'ingredients/',
  'clothes/',
  'painting/color/',
  'counting/number/',
  'feed-animals/food/',
  'cooking/name/',
  'alphabet/example/',
  'solar-system/',
];

// Non-word clips that live under a vocabulary prefix.
const BLOCKED_TAILS = new Set(['info', 'info-cook']);

/** True when this audio key is a vocabulary word worth tracking. */
export function isQuestVocabularyKey(key: string): boolean {
  const prefix = LOGGED_PREFIXES.find(p => key.startsWith(p));
  if (!prefix) return false;
  const tail = key.slice(prefix.length);
  // Only direct word keys like 'ingredients/apple', no deeper nesting.
  if (!tail || tail.includes('/')) return false;
  return !BLOCKED_TAILS.has(tail);
}

/** Local day as YYYY-MM-DD, e.g. '2026-10-27'. */
export function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function blankStat(day: string): WordStat {
  return { seen: 0, correct: 0, wrong: 0, verdict: null, lastSeenDay: day, days: {} };
}

// --- In-memory cache + batched saves ---

let cache: WordLogState | null = null;
let loadPromise: Promise<WordLogState> | null = null;
// Changes that arrive before the saved log has loaded. They are applied on
// top of the loaded log, so a sound played right after launch can never
// overwrite (and erase) the saved history with an empty log.
const pendingChanges: ((state: WordLogState) => void)[] = [];
let dirty = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let appStateInstalled = false;

async function persist() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!dirty || !cache) return;
  dirty = false;
  try {
    // Prune old day buckets so storage stays small.
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - KEEP_DAYS);
    const cutoffKey = todayKey(cutoff);
    for (const stat of Object.values(cache.stats)) {
      for (const day of Object.keys(stat.days)) {
        if (day < cutoffKey) delete stat.days[day];
      }
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Logging must never break the app. The in-memory copy survives and a
    // later save will retry; worst case one session of counts is lost.
    dirty = true;
  }
}

function scheduleSave() {
  dirty = true;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void persist();
  }, SAVE_DELAY_MS);
}

function ensureAppStateFlush() {
  if (appStateInstalled) return;
  appStateInstalled = true;
  try {
    AppState.addEventListener('change', next => {
      if (next !== 'active') void persist();
    });
  } catch {
    // Listener is best-effort; the timer still saves every few seconds.
  }
}

/** Load the log into memory. Called automatically on first use (safe to call again). */
export function loadWordLog(): Promise<WordLogState> {
  if (cache) return Promise.resolve(cache);
  if (loadPromise) return loadPromise;
  ensureAppStateFlush();
  loadPromise = (async () => {
    let loaded = freshState();
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WordLogState;
        if (parsed && parsed.stats && typeof parsed.stats === 'object') {
          // Normalize: old or corrupt entries get defaults, never crash.
          const num = (v: unknown) => (typeof v === 'number' && v >= 0 ? v : 0);
          const stats: Record<string, WordStat> = {};
          for (const [id, s] of Object.entries(parsed.stats)) {
            const w = s as Partial<WordStat>;
            if (!w || typeof w !== 'object') continue;
            stats[id] = {
              seen: num(w.seen),
              correct: num(w.correct),
              wrong: num(w.wrong),
              verdict: w.verdict === 'ok' || w.verdict === 'practice' ? w.verdict : null,
              lastSeenDay: typeof w.lastSeenDay === 'string' ? w.lastSeenDay : '',
              days: w.days && typeof w.days === 'object' ? (w.days as Record<string, number>) : {},
            };
          }
          loaded = { version: 1, stats };
        }
      }
    } catch {
      // Corrupt or missing storage starts fresh.
    }
    cache = loaded;
    if (pendingChanges.length > 0) {
      for (const change of pendingChanges.splice(0)) {
        try { change(loaded); } catch { /* never break the app */ }
      }
      scheduleSave();
    }
    return loaded;
  })();
  return loadPromise;
}

/** Apply a change now if the log is loaded, otherwise right after it loads. */
function mutate(change: (state: WordLogState) => void): void {
  try {
    if (cache) {
      change(cache);
      scheduleSave();
      return;
    }
    pendingChanges.push(change);
    void loadWordLog();
  } catch {
    // Logging must never break the app (this runs inside the audio path).
  }
}

/**
 * Count one hearing of a vocabulary word. Sync and cheap: updates memory
 * and schedules a save at most every few seconds. Never await this from
 * the audio path.
 */
export function noteWordSeen(key: string, day = todayKey()): void {
  if (!isQuestVocabularyKey(key)) return;
  mutate(state => {
    const stat = state.stats[key] ?? blankStat(day);
    stat.seen += 1;
    stat.lastSeenDay = day;
    stat.days[day] = (stat.days[day] ?? 0) + 1;
    state.stats[key] = stat;
  });
}

/** Count one graded quest answer (say_it answers are not graded). */
export function recordQuestAnswer(key: string, firstTryRight: boolean, day = todayKey()): void {
  if (!isQuestVocabularyKey(key)) return;
  mutate(state => {
    const stat = state.stats[key] ?? blankStat(day);
    if (firstTryRight) stat.correct += 1;
    else stat.wrong += 1;
    stat.lastSeenDay = day;
    state.stats[key] = stat;
  });
}

/** Parent's verdict from the "Today's words" screen (step 5). */
export function setParentVerdict(key: string, verdict: ParentVerdict | null): void {
  mutate(state => {
    const stat = state.stats[key] ?? blankStat(todayKey());
    stat.verdict = verdict;
    state.stats[key] = stat;
  });
}

/** Write any pending changes now. Called on backgrounding and in tests. */
export async function flushWordLog(): Promise<void> {
  if (loadPromise) await loadPromise;
  await persist();
}

// --- Read helpers (pure: easy to test, no storage) ---

/** Word ids the child heard today. */
export function getTodayWordIds(state: WordLogState, day: string): string[] {
  return Object.keys(state.stats).filter(id => (state.stats[id]?.days[day] ?? 0) > 0);
}

/**
 * Top up today's words to at least 4: first words the parent marked
 * "practice again" (most recent first), then the words the child gets
 * wrong most, then easy starter words. Returns at most `target` ids.
 */
export function topUpWords(
  state: WordLogState,
  day: string,
  target: number,
  starterIds: string[],
): string[] {
  const today = getTodayWordIds(state, day);
  if (today.length >= target) return today.slice(0, target);
  const picked = [...today];
  const has = new Set(picked);
  const byRecency = Object.entries(state.stats).sort(
    (a, b) => (b[1].lastSeenDay < a[1].lastSeenDay ? -1 : 1),
  );
  for (const [id, stat] of byRecency) {
    if (picked.length >= target) break;
    if (!has.has(id) && stat.verdict === 'practice') {
      picked.push(id);
      has.add(id);
    }
  }
  const byWrongRate = Object.entries(state.stats)
    .filter(([id]) => !has.has(id))
    .map(([id, stat]) => {
      const total = stat.correct + stat.wrong;
      return { id, rate: total > 0 ? stat.wrong / total : 0, total };
    })
    .filter(w => w.total > 0)
    .sort((a, b) => b.rate - a.rate || b.total - a.total);
  for (const w of byWrongRate) {
    if (picked.length >= target) break;
    picked.push(w.id);
    has.add(w.id);
  }
  for (const id of starterIds) {
    if (picked.length >= target) break;
    if (!has.has(id)) {
      picked.push(id);
      has.add(id);
    }
  }
  return picked;
}
