import { useEffect, useState } from 'react';
import { useMe } from '../app/auth';
import { useToast } from '../app/Toast';
import { Switch } from '../design';
import { t } from '../i18n';
import { disablePush, enablePush, getPushState, type PushState } from '../lib/push';
import { dataService, sessionService } from '../services';

/** Turns push notifications on or off for this device. Hidden on the demo backend, which sends none. */
export function NotificationsSetting() {
  const me = useMe();
  const toast = useToast();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (sessionService.kind === 'account') void getPushState().then(setState);
  }, []);

  if (sessionService.kind !== 'account' || state === null) return null;

  const description =
    state === 'needs-install'
      ? t('notif.install')
      : state === 'denied'
        ? t('notif.denied')
        : state === 'unsupported'
          ? t('notif.unsupported')
          : state === 'on'
            ? t('notif.on')
            : t(me.role === 'coach' ? 'notif.desc.coach' : 'notif.desc.client');

  const change = async (on: boolean) => {
    setBusy(true);
    try {
      if (on) setState(await enablePush((d) => dataService.savePushDevice(d)));
      else {
        await disablePush((endpoint) => dataService.removePushDevice(endpoint));
        setState('off');
      }
    } catch {
      toast.show(t('notif.error'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="app-card">
      <Switch label={t('notif.label')} description={description} checked={state === 'on'} disabled={busy || state === 'unsupported' || state === 'needs-install' || state === 'denied'} onChange={(v: boolean) => void change(v)} />
    </section>
  );
}
