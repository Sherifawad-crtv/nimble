import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { BottomSheet, Button, Dialog } from '../design';
import { useIsDesktop } from '../hooks/media';
import { t } from '../i18n';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function useOverlayBehavior(open: boolean, onClose: () => void) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    document.body.classList.add('app-locked');
    host.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Tab' && host.current) {
        const items = [...host.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('app-locked');
      previous?.focus?.();
    };
  }, [open, onClose]);
  return host;
}

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

/** A bottom sheet on phones, a centred dialog from 1024px up. */
export function Sheet({ open, title, onClose, footer, children }: SheetProps) {
  const desktop = useIsDesktop();
  const host = useOverlayBehavior(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className={`app-overlay ${desktop ? 'mid' : 'end'}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="app-sheet-host" ref={host} tabIndex={-1} data-sheet>
        <BottomSheet title={title} height="full" onClose={onClose} footer={footer}>
          {children}
        </BottomSheet>
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  /** Keep the dialog dark, for the always-dark timer screens. */
  dark?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, body, confirmLabel, destructive, dark, busy, onConfirm, onCancel }: ConfirmProps) {
  const host = useOverlayBehavior(open, onCancel);
  if (!open) return null;
  return createPortal(
    <div className="app-overlay mid" data-theme={dark ? 'dark' : undefined} onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="app-dialog-host" ref={host} tabIndex={-1}>
        <Dialog
          title={title}
          tone={destructive ? 'destructive' : undefined}
          actions={
            <>
              <Button variant="secondary" size="md" onClick={onCancel}>
                {t('common.cancel')}
              </Button>
              <Button variant={destructive ? 'destructive' : 'primary'} size="md" loading={busy} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </>
          }
        >
          {body}
        </Dialog>
      </div>
    </div>,
    document.body,
  );
}
