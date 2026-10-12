/** Overlays render inside the app container so they share its bottom edge. */
export const overlayRoot = (): HTMLElement => document.getElementById('overlays') ?? document.body;
