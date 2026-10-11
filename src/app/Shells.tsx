import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Banner, Sidebar, Skeleton, PillNav } from '../design';
import { useIsDesktop } from '../hooks/media';
import { t } from '../i18n';
import { useMe } from './auth';
import { ShellActionProvider, useShellActionState } from './ShellAction';

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="app-banner">
      <Banner kind="offline" title={t('offline.title')} message={t('offline.body')} />
    </div>
  );
}

function Content() {
  return (
    <Suspense fallback={<div className="app-page"><Skeleton variant="detail" /></div>}>
      <Outlet />
    </Suspense>
  );
}

function FloatingNav({ items, active, onChange }: { items: { id: string; icon: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  const action = useShellActionState();
  return (
    <div className="app-nav">
      <PillNav items={items} active={active} onChange={onChange} action={action ?? undefined} />
    </div>
  );
}

const segment = (pathname: string, index: number) => pathname.split('/')[index] ?? '';

export function CoachShell() {
  const desktop = useIsDesktop();
  const me = useMe();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const items = [
    { id: 'clients', icon: 'users', label: t('nav.clients') },
    { id: 'library', icon: 'book', label: t('nav.library') },
    { id: 'workouts', icon: 'dumbbell', label: t('nav.workouts') },
    { id: 'settings', icon: 'gear', label: t('nav.settings') },
  ];
  const seg = segment(pathname, 2);
  const active = seg === 'review' ? 'clients' : seg === 'programs' ? 'workouts' : seg;
  const go = (id: string) => navigate(`/coach/${id}`);

  return (
    <ShellActionProvider>
      <div className={desktop ? 'app-shell desktop' : 'app-shell'}>
        {desktop && (
          <div className="app-side">
            <Sidebar workspace={t('workspace.name', { name: me.name.split(' ')[0] ?? me.name })} items={items} active={active} onChange={go} user={{ name: me.name, role: t('role.coach') }} />
          </div>
        )}
        <main className="app-main" id="main">
          <OfflineBanner />
          <Content />
        </main>
        {!desktop && <FloatingNav items={items} active={active} onChange={go} />}
      </div>
    </ShellActionProvider>
  );
}

export function ClientShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const items = [
    { id: 'today', icon: 'home', label: t('nav.today') },
    { id: 'calendar', icon: 'calendar', label: t('nav.calendar') },
    { id: 'progress', icon: 'trophy', label: t('nav.progress') },
    { id: 'settings', icon: 'user', label: t('nav.settings') },
  ];
  const seg = segment(pathname, 2);
  const active = seg === 'workout' || seg === 'wearable' ? (seg === 'wearable' ? 'settings' : 'today') : seg;
  return (
    <ShellActionProvider>
      <div className="app-shell client">
        <main className="app-main" id="main">
          <OfflineBanner />
          <Content />
        </main>
        <FloatingNav items={items} active={active} onChange={(id) => navigate(`/app/${id}`)} />
      </div>
    </ShellActionProvider>
  );
}
