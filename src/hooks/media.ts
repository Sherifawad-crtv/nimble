import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', notify);
      return () => m.removeEventListener('change', notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** The coach app swaps layouts at 1024px. */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
export const useIsLandscape = () => useMediaQuery('(orientation: landscape) and (max-height: 520px)');
