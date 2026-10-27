// Microphone permission for "say it to pack it" (hackathon step 2).
// Asked only when the child first reaches the mic step — never earlier.
// Denied/unavailable mic is not an error: the caller skips recording and
// the item still goes into the backpack.

import { AudioModule } from 'expo-audio';

export type MicStatus = 'granted' | 'denied';

/**
 * Returns 'granted' when the app may record, 'denied' otherwise (including
 * on any failure — recording is always optional).
 */
export async function ensureMicPermission(): Promise<MicStatus> {
  try {
    const current = await AudioModule.getRecordingPermissionsAsync();
    if (current.granted) return 'granted';
    // `canAskAgain === false` means the OS will not show a dialog.
    if (current.canAskAgain === false && current.status !== 'undetermined') return 'denied';
    const next = await AudioModule.requestRecordingPermissionsAsync();
    return next.granted ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}
