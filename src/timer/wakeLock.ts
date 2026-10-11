import { useEffect, useState } from 'react';

type Status = 'on' | 'unavailable';

/**
 * Keeps the screen awake while `active`. Best effort: where the Screen Wake Lock API is missing
 * or refuses, the timer keeps working from the clock and the UI says the screen may turn off.
 */
export function useWakeLock(active: boolean): Status {
  const [status, setStatus] = useState<Status>('on');

  useEffect(() => {
    if (!active) return;
    if (!('wakeLock' in navigator)) {
      setStatus('unavailable');
      return;
    }
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
        setStatus('on');
        lock.addEventListener('release', () => {
          if (sentinel === lock) sentinel = null;
        });
      } catch {
        setStatus('unavailable');
      }
    };
    void acquire();

    // The browser drops the lock when the page is hidden; take it again on return.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !sentinel) void acquire();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void sentinel?.release();
      sentinel = null;
    };
  }, [active]);

  return status;
}
