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
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'));
}
