// Quest buddy choice (hackathon step 2). Saved on the device only.

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'quest_buddy_v1';

export type BuddyId = 'neli' | 'aidin' | 'mila' | 'lila' | 'dara' | 'roboBoombo';

export const BUDDIES: { id: BuddyId; fa: string; en: string }[] = [
  { id: 'neli', fa: 'نلی', en: 'Neli' },
  { id: 'aidin', fa: 'آیدین', en: 'Aidin' },
  { id: 'mila', fa: 'میلا', en: 'Mila' },
  { id: 'lila', fa: 'لیلا', en: 'Lila' },
  { id: 'dara', fa: 'دارا', en: 'Dara' },
  { id: 'roboBoombo', fa: 'ربو بومبو', en: 'Robo Boombo' },
];

export function isBuddyId(value: string | null | undefined): value is BuddyId {
  return BUDDIES.some(b => b.id === value);
}

export async function loadBuddy(): Promise<BuddyId | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return isBuddyId(raw) ? raw : null;
  } catch {
    return null;
  }
}

export async function saveBuddy(id: BuddyId): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Buddy choice must never break the quest.
  }
}
