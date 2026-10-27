// Quest sound switch (hackathon step 2). One parent mute button silences
// every quest word clip. Wraps faAudio so the mute never touches the
// shared player's interrupt rules.

import { FaTestAudioKey } from '../assets/faTestAudio.generated';
import { playFaAudio } from '../utils/faAudio';

let muted = false;

export function setQuestMuted(value: boolean) {
  muted = value;
}

export function isQuestMuted() {
  return muted;
}

/** playFaAudio that respects the parent mute button. */
export function questPlay(key: FaTestAudioKey) {
  if (muted) return Promise.resolve(false);
  return playFaAudio(key);
}
