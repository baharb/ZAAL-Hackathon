// Device-only store for the child's "say it to pack it" recordings.
// Privacy: plain audio files referenced by uri, Word ids and days only.
// Never uploaded anywhere; entries older than 7 days are pruned on save.
// The parent "Today's words" screen (spec step 5) will read this later.

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'quest_recordings_v1';
const KEEP_DAYS = 7;

export type QuestRecording = {
  wordId: string;
  uri: string;
  day: string; // YYYY-MM-DD
};

function dayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function cutoffKey(): string {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - KEEP_DAYS);
  return dayKey(cutoff);
}

export async function loadRecordings(): Promise<QuestRecording[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QuestRecording[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(r => r && typeof r.uri === 'string' && typeof r.wordId === 'string');
  } catch {
    return [];
  }
}

/** Remember one recording, dropping entries older than 7 days. */
export async function saveRecording(wordId: string, uri: string): Promise<void> {
  try {
    const current = await loadRecordings();
    const cutoff = cutoffKey();
    const kept = current.filter(r => (r.day ?? '') >= cutoff);
    kept.push({ wordId, uri, day: dayKey() });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
  } catch {
    // Recordings must never break the quest.
  }
}
