import { readPref, writePref } from './prefs';

const KEY = 'nimble.chunkReload';
const COOLDOWN_MS = 15_000;

/**
 * After a new version goes live, a screen that was open still points at the previous build's
 * files, which no longer exist. That surfaces as a failed dynamic import.
 */
export const isChunkError = (e: unknown): boolean =>
  /dynamically imported module|importing a module script failed|unable to preload|error loading dynamically/i.test(e instanceof Error ? e.message : String(e));

/** Reloads once to pick up the new version. Returns false if it already did so a moment ago (so a real fault still shows). */
export function reloadForNewVersion(): boolean {
  const last = Number(readPref(KEY) ?? 0);
  if (Date.now() - last < COOLDOWN_MS) return false;
  writePref(KEY, String(Date.now()));
  window.location.reload();
  return true;
}
