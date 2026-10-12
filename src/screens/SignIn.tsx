import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSessionActions } from '../app/auth';
import { Avatar, Button, EmptyState, ErrorState, Lockup, Segmented, Skeleton, TextField } from '../design';
import { errorMessage } from '../hooks/data';
import { t } from '../i18n';
import { sessionService, type AccountSession, type DemoSession } from '../services';
import type { Profile, Role } from '../types';

type Change = React.ChangeEvent<HTMLInputElement>;

/** Sign-in for whichever backend is configured. */
export function SignInScreen() {
  return (
    <main className="app-signin" data-theme="dark">
      <div className="app-signin-card">
        <Lockup size={72} />
        {sessionService.kind === 'demo' ? <DemoSignIn session={sessionService} /> : <AccountSignIn session={sessionService} />}
      </div>
    </main>
  );
}

// ---------- real accounts ----------

type Mode = 'signin' | 'signup' | 'reset';

function AccountSignIn({ session }: { session: AccountSession }) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null);
  const { refresh } = useSessionActions();

  // Sign-up fields
  const [role, setRole] = useState<Role>('coach');
  const [name, setName] = useState('');
  const [workspace, setWorkspace] = useState('');
  const [code, setCode] = useState(() => new URLSearchParams(window.location.search).get('invite') ?? '');
  const invite = useInviteCheck(session, role === 'client' ? code : '');

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('invite')) {
      setMode('signup');
      setRole('client');
    }
  }, []);

  const go = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signin') {
        await session.signIn(email, password);
        await refresh();
      } else if (mode === 'reset') {
        await session.requestPasswordReset(email);
        setNotice({ title: t('auth.reset.sent.title'), body: t('auth.reset.sent.body', { email: email.trim() }) });
      } else {
        const input =
          role === 'coach'
            ? { role, name, email, password, workspaceName: workspace }
            : { role, name, email, password, inviteCode: code };
        const result = await session.signUp(input);
        if (result === 'confirm_email') setNotice({ title: t('auth.confirm.title'), body: t('auth.confirm.body', { email: email.trim() }) });
        else await refresh();
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (notice) {
    return (
      <div className="app-stack">
        <EmptyState icon="mail" title={notice.title} body={notice.body} />
        <Button
          fullWidth
          size="lg"
          variant="secondary"
          onClick={() => {
            setNotice(null);
            go('signin');
          }}
        >
          {t('auth.backToSignIn')}
        </Button>
      </div>
    );
  }

  const title = mode === 'signin' ? t('auth.signin.title') : mode === 'signup' ? t('auth.signup.title') : t('auth.reset.title');
  const subtitle = mode === 'signin' ? t('auth.signin.subtitle') : mode === 'signup' ? t('auth.signup.subtitle') : t('auth.reset.subtitle');

  return (
    <form className="app-signin-form" onSubmit={(e) => void submit(e)} noValidate>
      <h1 className="t-title app-title">{title}</h1>
      <p className="t-label v-muted">{subtitle}</p>

      {mode === 'signup' && (
        <>
          <Segmented
            options={[
              { id: 'coach', label: t('auth.role.coach') },
              { id: 'client', label: t('auth.role.client') },
            ]}
            value={role}
            onChange={(id: string) => setRole(id as Role)}
          />
          <TextField label={t('auth.name')} required name="name" autoComplete="name" autoCapitalize="words" value={name} onChange={(e: Change) => setName(e.target.value)} />
          {role === 'coach' ? (
            <TextField
              label={t('auth.workspace')}
              required
              name="organization"
              autoComplete="organization"
              placeholder={t('auth.workspace.placeholder')}
              value={workspace}
              onChange={(e: Change) => setWorkspace(e.target.value)}
            />
          ) : (
            <TextField
              label={t('auth.invite')}
              required
              name="invite"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="A1B2C3D4"
              value={code}
              onChange={(e: Change) => setCode(e.target.value.toUpperCase())}
              hint={invite.state === 'idle' ? t('auth.invite.hint') : undefined}
              success={invite.state === 'valid' ? t('auth.invite.valid', { workspace: invite.workspace }) : undefined}
              error={invite.state === 'invalid' ? t('auth.invite.invalid') : undefined}
            />
          )}
        </>
      )}

      <TextField label={t('auth.email')} required type="email" name="email" autoComplete="email" inputMode="email" autoCapitalize="off" value={email} onChange={(e: Change) => setEmail(e.target.value)} />
      {mode !== 'reset' && (
        <TextField
          label={t('auth.password')}
          required
          type="password"
          name="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e: Change) => setPassword(e.target.value)}
          hint={mode === 'signup' ? t('auth.password.hint') : undefined}
        />
      )}

      {error && <ErrorState inline title={t('auth.error.title')} body={error} />}

      <Button type="submit" fullWidth size="lg" loading={busy} disabled={busy || (mode === 'signup' && role === 'client' && invite.state === 'invalid')}>
        {mode === 'signin' ? t('auth.signin.action') : mode === 'signup' ? t('auth.signup.action') : t('auth.reset.action')}
      </Button>

      <div className="app-signin-links">
        {mode === 'signin' && (
          <>
            <Button variant="tertiary" size="md" onClick={() => go('reset')}>
              {t('auth.forgot')}
            </Button>
            <Button variant="secondary" size="md" fullWidth onClick={() => go('signup')}>
              {t('auth.toSignup')}
            </Button>
          </>
        )}
        {mode !== 'signin' && (
          <Button variant="tertiary" size="md" onClick={() => go('signin')}>
            {mode === 'signup' ? t('auth.toSignin') : t('auth.backToSignIn')}
          </Button>
        )}
      </div>
    </form>
  );
}

type InviteState = { state: 'idle' } | { state: 'checking' } | { state: 'valid'; workspace: string } | { state: 'invalid' };

/** Confirms an invite code as it is typed, so the client knows which coach they are joining. */
function useInviteCheck(session: AccountSession, code: string): InviteState {
  const [result, setResult] = useState<InviteState>({ state: 'idle' });
  useEffect(() => {
    const clean = code.trim();
    if (clean.length < 8) {
      setResult({ state: 'idle' });
      return;
    }
    let live = true;
    setResult({ state: 'checking' });
    const timer = setTimeout(() => {
      session
        .checkInvite(clean)
        .then((workspace) => live && setResult(workspace ? { state: 'valid', workspace } : { state: 'invalid' }))
        .catch(() => live && setResult({ state: 'idle' }));
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [session, code]);
  return result;
}

/** Shown after opening a password-reset link. */
export function NewPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useSessionActions();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (sessionService.kind !== 'account') return;
    setBusy(true);
    setError(null);
    try {
      await sessionService.updatePassword(password);
      await refresh();
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <main className="app-signin" data-theme="dark">
      <div className="app-signin-card">
        <Lockup size={72} />
        <form className="app-signin-form" onSubmit={(e) => void submit(e)} noValidate>
          <h1 className="t-title app-title">{t('auth.newPassword.title')}</h1>
          <p className="t-label v-muted">{t('auth.newPassword.subtitle')}</p>
          <TextField
            label={t('auth.password')}
            required
            type="password"
            name="new-password"
            autoComplete="new-password"
            value={password}
            onChange={(e: Change) => setPassword(e.target.value)}
            hint={t('auth.password.hint')}
          />
          {error && <ErrorState inline title={t('auth.error.title')} body={error} />}
          <Button type="submit" fullWidth size="lg" loading={busy} disabled={busy}>
            {t('auth.newPassword.action')}
          </Button>
        </form>
      </div>
    </main>
  );
}

// ---------- demo backend ----------

function DemoSignIn({ session }: { session: DemoSession }) {
  const { signInAs } = useSessionActions();
  const accounts = useQuery({ queryKey: ['demo-accounts'], queryFn: () => session.listDemoAccounts() });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (p: Profile) => {
    setBusy(p.id);
    setError(null);
    try {
      await signInAs(p.id);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  };

  const coaches = accounts.data?.filter((p) => p.role === 'coach') ?? [];
  const clients = accounts.data?.filter((p) => p.role === 'client') ?? [];

  return (
    <>
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
    </>
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
