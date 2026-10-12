import { useMe, useSessionActions } from '../../app/auth';
import { Page } from '../../components/Page';
import { Avatar, Button } from '../../design';
import { t } from '../../i18n';

export function CoachSettings() {
  const me = useMe();
  const { signOut } = useSessionActions();
  return (
    <Page title={t('settings.title')} subtitle={t('settings.subtitle')}>
      <div className="app-stack narrow">
        <section className="app-card profile-card">
          <Avatar name={me.name} size="lg" />
          <div>
            <div className="t-heading">{me.name}</div>
            <div className="t-label v-muted">{me.email}</div>
            <div className="t-caption v-muted">{t('role.coach')}</div>
          </div>
        </section>
        <Button variant="secondary" size="md" icon="logout" onClick={() => void signOut()}>
          {t('settings.signOut')}
        </Button>
      </div>
    </Page>
  );
}
