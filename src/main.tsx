import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource-variable/archivo/wght.css';
import '@fontsource-variable/archivo/wght-italic.css';
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

// Follow the device's light or dark setting. Timer screens pin themselves to dark.
const scheme = window.matchMedia('(prefers-color-scheme: light)');
const applyTheme = () => document.documentElement.setAttribute('data-theme', scheme.matches ? 'light' : 'dark');
applyTheme();
scheme.addEventListener('change', applyTheme);

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
(window as Window & { __originBooted?: boolean }).__originBooted = true;
