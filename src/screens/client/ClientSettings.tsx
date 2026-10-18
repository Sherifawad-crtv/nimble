import { useMe, useSessionActions } from '../../app/auth';
import { NotificationsSetting } from '../../components/NotificationsSetting';
import { Page } from '../../components/Page';
import { Avatar, Button } from '../../design';
import { t } from '../../i18n';

export function ClientSettings() {
  const me = useMe();
  const { signOut } = useSessionActions();

  return (
    <Page title={t('settings.title')} subtitle={t('settings.subtitle')}>
      <div className="app-stack">
        <section className="app-card profile-card">
          <Avatar name={me.name} size="lg" />
          <div>
            <div className="t-heading">{me.name}</div>
            <div className="t-label v-muted">{me.email}</div>
          </div>
        </section>

        <NotificationsSetting />
        <Button variant="secondary" size="md" icon="logout" onClick={() => void signOut()}>
          {t('settings.signOut')}
        </Button>
      </div>
    </Page>
  );
}
