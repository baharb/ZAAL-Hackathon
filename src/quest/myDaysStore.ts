// روزهای من (My Days) album store (quest v2, section 3).
// One entry per pretend photo in the picnic finale. Saved on the device
// only (AsyncStorage): date, buddy, picks and story id. No real camera,
// no uploads, no server. A child's photos never leave this device.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BuddyId, isBuddyId } from './buddyStore';
import { StoryId } from './stories';

const STORAGE_KEY = 'quest_my_days_v1';

export type MyDayPick = {
  id: string;
  fa: string;
  /** How many of the fruit were counted (fruit pick only). */
  count?: number;
};

export type MyDayEntry = {
  /** Unique id: Date.now() at save time. */
  id: string;
  /** ISO date string, e.g. '2026-10-29'. */
  dateISO: string;
  buddy: BuddyId;
  storyId: StoryId;
  /** The 3 picks in quest order: fruit, color, dish. */
  picks: MyDayPick[];
  /** The child's chosen blanket color (hex), for the polaroid frame. */
  colorHex: string;
  /** The tied balloon color ids, so the album card shows the same bunch. */
  balloonIds?: string[];
};

function isMyDayEntry(value: unknown): value is MyDayEntry {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || typeof v.dateISO !== 'string') return false;
  if (!isBuddyId(typeof v.buddy === 'string' ? v.buddy : null)) return false;
  if (v.storyId !== 'picnic_grandma') return false;
  if (!Array.isArray(v.picks)) return false;
  if (typeof v.colorHex !== 'string') return false;
  if (v.balloonIds !== undefined && (!Array.isArray(v.balloonIds) || !v.balloonIds.every(b => typeof b === 'string'))) return false;
  return v.picks.every(
    p =>
      !!p &&
      typeof p === 'object' &&
      typeof (p as MyDayPick).id === 'string' &&
      typeof (p as MyDayPick).fa === 'string' &&
      ((p as MyDayPick).count === undefined || typeof (p as MyDayPick).count === 'number'),
  );
}

/** All saved days, newest first. Never throws. */
export async function loadMyDays(): Promise<MyDayEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const entries = parsed.filter(isMyDayEntry);
    entries.sort((a, b) => (a.dateISO < b.dateISO ? 1 : a.dateISO > b.dateISO ? -1 : 0));
    return entries;
  } catch {
    return [];
  }
}

/** Saves one pretend photo. Never throws, never blocks the finale. */
export async function saveMyDay(entry: MyDayEntry): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const entries = Array.isArray(parsed) ? parsed.filter(isMyDayEntry) : [];
    if (!entries.some(e => e.id === entry.id)) entries.push(entry);
    entries.sort((a, b) => (a.dateISO < b.dateISO ? 1 : a.dateISO > b.dateISO ? -1 : 0));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 60)));
  } catch {
    // A full or broken store must never break the quest.
  }
}
