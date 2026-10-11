import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Toast } from '../design';

type Tone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  tone: Tone;
  message: string;
  action?: { label: string; run: () => void };
}
interface ToastApi {
  show: (message: string, tone?: Tone, action?: ToastItem['action']) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<ToastItem | null>(null);
  const timer = useRef<number>();
  const next = useRef(0);

  const show = useCallback<ToastApi['show']>((message, tone = 'success', action) => {
    window.clearTimeout(timer.current);
    setItem({ id: ++next.current, tone, message, action });
    timer.current = window.setTimeout(() => setItem(null), tone === 'error' ? 6000 : 4000);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  const api = useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="app-toast" aria-live="polite">
        {item && (
          <Toast
            key={item.id}
            tone={item.tone}
            message={item.message}
            action={item.action?.label}
            onAction={() => {
              item.action?.run();
              setItem(null);
            }}
          />
        )}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(Ctx);
  if (!api) throw new Error('useToast must be used inside ToastProvider');
  return api;
}
