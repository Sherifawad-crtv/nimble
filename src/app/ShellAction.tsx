import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface ShellActionConfig {
  icon: string;
  label: string;
  onClick: () => void;
}

interface Ctx {
  action: ShellActionConfig | null;
  setAction: (a: ShellActionConfig | null) => void;
}

const ShellActionContext = createContext<Ctx | null>(null);

export function ShellActionProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<ShellActionConfig | null>(null);
  const value = useMemo(() => ({ action, setAction }), [action]);
  return <ShellActionContext.Provider value={value}>{children}</ShellActionContext.Provider>;
}

export const useShellActionState = (): ShellActionConfig | null => useContext(ShellActionContext)?.action ?? null;

/** A screen registers the floating circular action next to the pill navigation. */
export function useShellAction(config: ShellActionConfig | null): void {
  const ctx = useContext(ShellActionContext);
  const setAction = ctx?.setAction;
  const icon = config?.icon;
  const label = config?.label;
  const onClick = config?.onClick;
  useEffect(() => {
    if (!setAction) return;
    setAction(icon && label && onClick ? { icon, label, onClick } : null);
    return () => setAction(null);
  }, [setAction, icon, label, onClick]);
}
