// Small shared helpers for the quest screens (hackathon step 2).

import { characterAssets } from '../assets/characterAssets';
import { BuddyId } from './buddyStore';

// Every size below is scaled by the caller: k = box / QUEST_REFERENCE.
export const QUEST_REFERENCE = 230;

export const QUEST_COLORS = {
  sky: '#7ED6F2',
  grass: '#8FD694',
  sand: '#F2D492',
  sandDark: '#D9A85E',
  card: '#FFFDF5',
  ink: '#3A2A6B',
  accent: '#6C4EFF',
  gold: '#FACC15',
};

type Pose = 'base' | 'waving' | 'walking' | 'jumping' | 'celebration' | 'thinking';

/** Buddy art for a pose, falling back to the base pose when missing. */
export function buddyPose(buddy: BuddyId, pose: Pose) {
  const pack = (characterAssets as Record<string, { poses: Record<string, unknown>; base: unknown }>)[
    buddy
  ];
  if (!pack) return characterAssets.neli.poses.base;
  return (pack.poses[pose] as unknown) ?? pack.base;
}
