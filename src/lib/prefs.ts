/** Per-device conveniences. Always safe to lose: every read falls back and every write is best effort. */
export function readPref(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the preference simply is not remembered */
  }
}

export const wearablePromptKey = (profileId: string) => `origin.wearablePrompt.${profileId}`;
