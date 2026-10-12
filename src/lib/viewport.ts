/**
 * The installed iOS app (standalone, translucent status bar) reports a viewport shorter than the
 * screen by about the status bar's height until the first scroll, which lifts anything anchored
 * to the bottom. There the app is sized from the screen itself; everywhere else the visible
 * viewport is already right and CSS falls back to 100%.
 */
export function fitAppToScreen(): void {
  const standaloneIOS = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (!standaloneIOS) return;
  const apply = () => {
    const portrait = window.matchMedia('(orientation: portrait)').matches;
    const long = Math.max(screen.width, screen.height);
    const short = Math.min(screen.width, screen.height);
    document.documentElement.style.setProperty('--app-height', `${portrait ? long : short}px`);
  };
  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
}

/** Overlays render inside the sized app container so they share its bottom edge. */
export const overlayRoot = (): HTMLElement => document.getElementById('overlays') ?? document.body;
