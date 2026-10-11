import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSessionActions } from '../app/auth';
import { Avatar, ErrorState, Lockup, Skeleton } from '../design';
import { errorMessage } from '../hooks/data';
import { t } from '../i18n';
import { sessionService } from '../services';
import type { Profile } from '../types';

/** Demo sign-in against the mock backend. Phase 2 replaces this with Supabase Auth. */
export function SignInScreen() {
  const { signIn } = useSessionActions();
  const accounts = useQuery({ queryKey: ['demo-accounts'], queryFn: () => sessionService.listDemoAccounts() });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (p: Profile) => {
    setBusy(p.id);
    setError(null);
    try {
      await signIn(p.id);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  };

  const coaches = accounts.data?.filter((p) => p.role === 'coach') ?? [];
  const clients = accounts.data?.filter((p) => p.role === 'client') ?? [];

  return (
    <main className="app-signin" data-theme="dark">
      <div className="app-signin-card">
        <Lockup size={72} />
        <h1 className="t-title app-title">{t('signin.title')}</h1>
        <p className="t-label v-muted">{t('signin.subtitle')}</p>
        {accounts.isPending && <Skeleton variant="list" rows={3} />}
        {accounts.isError && <ErrorState title={t('error.generic.title')} body={accounts.error.message} onRetry={() => void accounts.refetch()} />}
        {error && <ErrorState inline title={t('error.generic.title')} body={error} />}
        {accounts.data && (
          <>
            <AccountGroup label={t('signin.coach')} accounts={coaches} busy={busy} onPick={pick} />
            <AccountGroup label={t('signin.clients')} accounts={clients} busy={busy} onPick={pick} />
          </>
        )}
      </div>
    </main>
  );
}

function AccountGroup({ label, accounts, busy, onPick }: { label: string; accounts: Profile[]; busy: string | null; onPick: (p: Profile) => void }) {
  return (
    <section aria-label={label} className="app-signin-group">
      <h2 className="t-caption v-muted">{label}</h2>
      {accounts.map((p) => (
        <button key={p.id} type="button" className="app-account" disabled={busy !== null} onClick={() => onPick(p)} aria-busy={busy === p.id}>
          <Avatar name={p.name} size="md" />
          <span className="app-account-b">
            <span className="t-body-strong">{p.name}</span>
            <span className="t-label v-muted">{p.email}</span>
          </span>
        </button>
      ))}
    </section>
  );
}
