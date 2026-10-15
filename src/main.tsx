import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource-variable/urbanist/wght.css';
import '@fontsource-variable/red-hat-display/wght.css';
import '@fontsource-variable/cairo/wght.css';
import './design';
import './app.css';
import { App } from './App';
import { AppErrorBoundary } from './app/AppErrorBoundary';
import { ToastProvider } from './app/Toast';
import { DIR, LOCALE } from './i18n';
import { ServiceError } from './services';

document.documentElement.lang = LOCALE;
document.documentElement.dir = DIR;

// iOS Safari ignores user-scalable=no for pinch gestures, so stop them directly.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}
// No long-press or right-click menu outside fields (copy, share, look up).
document.addEventListener('contextmenu', (e) => {
  if (!(e.target instanceof HTMLElement) || !e.target.closest('input, textarea')) e.preventDefault();
});

// Native apps show no focus rings for touch or mouse; only a keyboard user gets them.
const root = document.documentElement;
document.addEventListener('keydown', (e) => e.key !== 'Escape' && root.setAttribute('data-input', 'key'), true);
for (const type of ['pointerdown', 'touchstart']) document.addEventListener(type, () => root.removeAttribute('data-input'), true);

// The app has one theme: dark.
document.documentElement.setAttribute('data-theme', 'dark');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: (count, error) => !(error instanceof ServiceError) && count < 2,
    },
  },
});

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
);

// The app-shell service worker is retired until it can be verified on iOS; drop any copy a device
// still has (public/sw.js also removes itself when the browser checks it for updates).
if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((list) => list.forEach((r) => void r.unregister()));
}

// Tells the boot check in index.html that the app started.
(window as Window & { __nimbleBooted?: boolean }).__nimbleBooted = true;
