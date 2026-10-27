// "My Daily Word Quest" level store (hackathon step 1).
// Difficulty is not fixed by age: age only picks the starting level, then
// the child moves by how they play. Stored locally, per device.

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'quest_level_v1';

export type QuestLevel = 1 | 2 | 3 | 4 | 5;

export type LevelConfig = {
  level: QuestLevel;
  // Words the child picks, steps in the quest, choices per question.
  words: number;
  steps: number;
  choicesMin: number;
  choicesMax: number;
  stepTypes: string[];
  // Extra rules for the quest builder (steps 3-4 interpret these).
  memoryPairs?: number;
  countMax?: number;
  similarLetters?: boolean;
};

export const LEVEL_CONFIGS: Record<QuestLevel, LevelConfig> = {
  1: { level: 1, words: 2, steps: 4, choicesMin: 2, choicesMax: 2, stepTypes: ['find_it', 'say_it', 'finale'] },
  2: { level: 2, words: 3, steps: 5, choicesMin: 2, choicesMax: 3, stepTypes: ['find_it', 'say_it', 'memory_pairs', 'count_it', 'finale'], memoryPairs: 2, countMax: 3 },
  3: { level: 3, words: 3, steps: 6, choicesMin: 3, choicesMax: 3, stepTypes: ['find_it', 'say_it', 'memory_pairs', 'count_it', 'first_letter', 'trace_letter', 'odd_one_out', 'color_it', 'finale'], memoryPairs: 2, countMax: 3 },
  4: { level: 4, words: 4, steps: 7, choicesMin: 3, choicesMax: 4, stepTypes: ['find_it', 'say_it', 'memory_pairs', 'count_it', 'first_letter', 'trace_letter', 'odd_one_out', 'color_it', 'finale'], memoryPairs: 3, countMax: 5 },
  5: { level: 5, words: 4, steps: 7, choicesMin: 4, choicesMax: 4, stepTypes: ['find_it', 'say_it', 'memory_pairs', 'count_it', 'first_letter', 'trace_letter', 'odd_one_out', 'color_it', 'finale'], memoryPairs: 3, countMax: 5, similarLetters: true },
};

/** Age 3-4 starts at 1, 5-6 at 2, 7+ at 3. Missing age starts at 1. */
export function startingLevelForAge(age: number | null | undefined): QuestLevel {
  if (age == null || Number.isNaN(age)) return 1;
  if (age >= 7) return 3;
  if (age >= 5) return 2;
  return 1;
}

export type QuestProgress = {
  version: 1;
  level: QuestLevel;
  // First-try accuracy of recent quests, newest last (say_it excluded).
  recent: number[];
  // True while the child is "stuck": next quest is an easier same-level one.
  relaxed: boolean;
};

const DEFAULT_PROGRESS: QuestProgress = { version: 1, level: 1, recent: [], relaxed: false };

/**
 * Pure level rules. Pass the first-try accuracy of the finished quest
 * (0-1, say_it steps excluded) plus the previous progress.
 * - Level up: two quests in a row at 80%+ (celebrate "Level X!").
 * - Stuck: two in a row under 50% -> relaxed stays on, level never drops.
 * - Anything else: normal play at the same level.
 */
export function applyQuestResult(
  prev: QuestProgress,
  accuracy: number,
): { progress: QuestProgress; leveledUp: boolean } {
  const recent = [...prev.recent, accuracy].slice(-2);
  const lastTwo = recent.length === 2 ? (recent as [number, number]) : null;
  if (lastTwo && lastTwo[0] >= 0.8 && lastTwo[1] >= 0.8) {
    const level = (Math.min(5, prev.level + 1) ) as QuestLevel;
    return {
      progress: { version: 1, level, recent: [], relaxed: false },
      leveledUp: level !== prev.level,
    };
  }
  if (lastTwo && lastTwo[0] < 0.5 && lastTwo[1] < 0.5) {
    return { progress: { version: 1, level: prev.level, recent, relaxed: true }, leveledUp: false };
  }
  return { progress: { version: 1, level: prev.level, recent, relaxed: false }, leveledUp: false };
}

/** Easier same-level variant: fewer choices, more find_it/say_it (step 3 reads this). */
export function effectiveConfig(progress: QuestProgress): LevelConfig {
  const base = LEVEL_CONFIGS[progress.level];
  if (!progress.relaxed) return base;
  return { ...base, choicesMax: Math.max(2, base.choicesMax - 1) };
}

export async function loadQuestProgress(): Promise<QuestProgress> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as QuestProgress;
      if (parsed && LEVEL_CONFIGS[parsed.level as QuestLevel]) {
        return {
          version: 1,
          level: parsed.level,
          recent: Array.isArray(parsed.recent) ? parsed.recent.slice(-2) : [],
          relaxed: parsed.relaxed === true,
        };
      }
    }
  } catch {
    // Corrupt storage starts fresh below.
  }
  return { ...DEFAULT_PROGRESS, recent: [] };
}

/** Record one finished quest and persist. Returns the new progress. */
export async function recordQuestResult(accuracy: number): Promise<{ progress: QuestProgress; leveledUp: boolean }> {
  const prev = await loadQuestProgress();
  const next = applyQuestResult(prev, accuracy);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next.progress));
  } catch {
    // Progress loss for one quest is harmless; memory copy is returned.
  }
  return next;
}
