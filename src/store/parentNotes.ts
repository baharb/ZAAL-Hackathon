// "Tonight at home" parent notes — device only (AsyncStorage), never
// synced. One note per day, newest first. Generated after a game session
// from today's practiced word ids + counts only; offline it falls back
// to a template built from the same words.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { todayKey } from './wordLog';
import { askParentNote, getTodayPractice, templateParentNote } from '../services/neliPicks';
import { PHOTO_FARSI_WORDS } from '../data/photoFarsiWords';
import { QUEST_WORDS } from '../data/questWords';
import type { Lang } from './AppContext';

const STORAGE_KEY = 'parent_notes_v1';
const KEEP_NOTES = 14;

export type ParentNote = { day: string; text: string; lang?: Lang };

export async function loadParentNotes(): Promise<ParentNote[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ParentNote[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(n => n && typeof n.day === 'string' && typeof n.text === 'string');
  } catch {
    return [];
  }
}

async function saveParentNotes(notes: ParentNote[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes.slice(0, KEEP_NOTES)));
  } catch {
    // Notes are a bonus; never break a game over storage.
  }
}

function faNameOf(id: string): string | null {
  return (
    PHOTO_FARSI_WORDS.find(w => w.audioKey === id)?.fa ??
    QUEST_WORDS.find(w => w.id === id)?.fa ??
    null
  );
}

const LANG_CODES: Lang[] = ['en', 'fa', 'fr', 'es', 'zh', 'ko', 'ar'];

/** The parent's Settings language, read from the app state AppProvider
 * saves — so every caller (games included) gets it without extra wiring. */
async function readParentLang(): Promise<Lang> {
  try {
    const raw = await AsyncStorage.getItem('lz_state_v2');
    const s = raw ? (JSON.parse(raw) as { settingsLang?: unknown }) : null;
    return LANG_CODES.includes(s?.settingsLang as Lang) ? (s?.settingsLang as Lang) : 'en';
  } catch {
    return 'en';
  }
}

let making = false;

/** Make today's note once (after a session). Safe to call often: it does
 * nothing when today has no practiced words or already has a note. */
export async function ensureTodayParentNote(preferredLang?: Lang): Promise<void> {
  if (making) return;
  making = true;
  try {
    const day = todayKey();
    const notes = await loadParentNotes();
    const lang = preferredLang ?? (await readParentLang());
    const existing = notes.find(n => n.day === day);
    // Same language as the settings: today's note is already right.
    if (existing && existing.lang === lang) return;
    const words = await getTodayPractice();
    if (words.length === 0) return;
    const text = (await askParentNote(words, lang)) ?? templateParentNote(words, faNameOf, lang);
    if (existing) {
      // Language changed since this note was written: rewrite it.
      await saveParentNotes(notes.map(n => (n.day === day ? { day, text, lang } : n)));
    } else {
      await saveParentNotes([{ day, text, lang }, ...notes]);
    }
  } catch {
    // Offline / storage failure: no note today, never an error.
  } finally {
    making = false;
  }
}
