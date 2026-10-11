import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMe, useSessionActions } from '../../app/auth';
import { useToast } from '../../app/Toast';
import { DataBoundary } from '../../components/DataBoundary';
import { Page } from '../../components/Page';
import { ConfirmDialog } from '../../components/Sheet';
import { BRAND, ConnectionSummary } from '../../components/WearableBlocks';
import { Avatar, Banner, Button, EmptyState } from '../../design';
import { errorMessage, useAction, useData } from '../../hooks/data';
import { keys } from '../../hooks/keys';
import { t } from '../../i18n';

export function ClientSettings() {
  const me = useMe();
  const navigate = useNavigate();
  const toast = useToast();
  const { signOut } = useSessionActions();
  const conn = useData(keys.wearable(me.id), (s) => s.getWearableConnection(me.id));
  const [confirm, setConfirm] = useState(false);
  const disconnect = useAction((s, _: void) => s.disconnectWearable(), { invalidate: [keys.wearable(me.id), keys.readiness(me.id)] });

  return (
    <Page title={t('settings.title')} eyebrow={t('settings.eyebrow')}>
      <div className="app-stack">
        <section className="app-card profile-card">
          <Avatar name={me.name} size="lg" />
          <div>
            <div className="t-heading">{me.name}</div>
            <div className="t-label v-muted">{me.email}</div>
          </div>
        </section>

        <section className="app-section" aria-label={t('settings.wearable')}>
          <h2 className="t-heading">{t('settings.wearable')}</h2>
          <DataBoundary
            query={conn}
            skeleton="card"
            isEmpty={(c) => c === null || c.status === 'disconnected'}
            empty={
              <EmptyState icon="watch" title={t('settings.wearable.none.title')} body={t('settings.wearable.none.body')} action={t('settings.wearable.connect')} onAction={() => navigate('/app/wearable')} />
            }
          >
            {(c) =>
              c && (
                <div className="app-stack">
                  {c.status === 'error' && <Banner kind="error" title={t('settings.wearable.error.title')} message={t('settings.wearable.error.body', { brand: BRAND[c.provider] })} action={t('settings.wearable.reconnect')} onAction={() => navigate('/app/wearable')} />}
                  <ConnectionSummary conn={c} />
                  <Button variant="secondary" size="md" icon="close" onClick={() => setConfirm(true)}>
                    {t('settings.wearable.disconnect')}
                  </Button>
                </div>
              )
            }
          </DataBoundary>
        </section>

        <Button variant="secondary" size="md" icon="logout" onClick={() => void signOut()}>
          {t('settings.signOut')}
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        destructive
        title={t('settings.wearable.disconnect.title')}
        body={t('settings.wearable.disconnect.body')}
        confirmLabel={t('settings.wearable.disconnect')}
        busy={disconnect.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() =>
          void disconnect
            .run()
            .then(() => {
              setConfirm(false);
              toast.show(t('settings.wearable.disconnected'));
            })
            .catch((e: unknown) => toast.show(errorMessage(e), 'error'))
        }
      />
    </Page>
  );
}
