import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMe } from '../app/auth';
import { useToast } from '../app/Toast';
import { Button } from '../design';
import { t } from '../i18n';
import { enablePush, getPushState, optedOut, type PushState } from '../lib/push';
import { readPref, writePref } from '../lib/prefs';
import { overlayRoot } from '../lib/viewport';
import { dataService, sessionService } from '../services';

const AGAIN_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Asks once, with a preview of what a notification looks like, when a signed-in person has not
 * turned notifications on: first visit, or after they were blocked. Skipping waits a week; a person
 * who switched notifications off in Settings is never asked. Real accounts on a device that can
 * receive push only.
 */
export function NotifyPrompt() {
  const me = useMe();
  const toast = useToast();
  const [state, setState] = useState<PushState | null>(null);
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const key = `nimble.notify.asked.${me.id}`;

  useEffect(() => {
    if (sessionService.kind !== 'account' || optedOut(me.id)) return;
    const asked = Number(readPref(key) ?? 0);
    if (asked && Date.now() - asked < AGAIN_AFTER_MS) return;
    let live = true;
    let timer = 0;
    void getPushState(me.id).then((s) => {
      if (!live || (s !== 'off' && s !== 'denied')) return;
      setState(s);
      timer = window.setTimeout(() => live && setOpen(true), 1200); // let the home screen settle first
    });
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [me.id, key]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && skip();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => setLeaving(true);
  const skip = () => {
    writePref(key, String(Date.now()));
    close();
  };

  const enable = async () => {
    if (state === 'denied') return skip();
    setBusy(true);
    try {
      const next = await enablePush(me.id, (d) => dataService.savePushDevice(d));
      writePref(key, String(Date.now()));
      if (next === 'denied') setState('denied');
      else close();
    } catch {
      toast.show(t('notif.error'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;
  const role = me.role === 'coach' ? 'coach' : 'client';
  return createPortal(
    <div className={leaving ? 'notify-overlay leaving' : 'notify-overlay'} onMouseDown={(e) => e.target === e.currentTarget && skip()} onAnimationEnd={(e) => e.currentTarget === e.target && leaving && setOpen(false)}>
      <div className="notify-sheet" role="dialog" aria-modal="true" aria-labelledby="notify-title">
        <span className="notify-handle" aria-hidden="true" />
        <div className="notify-art" aria-hidden="true">
          <img className="notify-phone" src="/brand/notify-phone.webp" width="720" height="500" alt="" decoding="async" />
          <div className="notify-card">
            <img src="/brand/notify-icon.webp" width="60" height="60" alt="" />
            <div className="notify-card-text">
              <div className="notify-card-head">
                <strong>{t('notifyPrompt.app')}</strong>
                <span>{t('notifyPrompt.now')}</span>
              </div>
              <p>{t(`notifyPrompt.sample.${role}`)}</p>
            </div>
          </div>
        </div>
        <h2 className="notify-title" id="notify-title">
          {t('notifyPrompt.title')}
        </h2>
        <p className="notify-body">{state === 'denied' ? t('notifyPrompt.blocked') : t(`notifyPrompt.body.${role}`)}</p>
        <Button variant="primary" size="lg" fullWidth loading={busy} onClick={() => void enable()}>
          {state === 'denied' ? t('notifyPrompt.gotIt') : t('notifyPrompt.enable')}
        </Button>
        {state !== 'denied' && (
          <button type="button" className="notify-skip" onClick={skip}>
            {t('notifyPrompt.skip')}
          </button>
        )}
      </div>
    </div>,
    overlayRoot(),
  );
}
