import { Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Banner, Icon, Sidebar, Skeleton } from '../design';
import { useIsDesktop } from '../hooks/media';
import { t } from '../i18n';
import { useMe } from './auth';

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

interface NavItem {
  id: string;
  icon: string;
  label: string;
}

/**
 * Bottom navigation from the source screens: icons only, evenly spaced, the current tab sits in a
 * raised pill. No bar background, just a fade so content scrolls away under it. Labels stay
 * available to assistive tech.
 */
function TabNav({ items, active, onChange }: { items: NavItem[]; active: string; onChange: (id: string) => void }) {
  return (
    <nav className="app-tabbar" aria-label={t('nav.label')}>
      <div className="v-tabs">
        {items.map((it) => (
          <button key={it.id} type="button" className="v-tab" aria-current={it.id === active ? 'page' : undefined} onClick={() => onChange(it.id)}>
            <Icon name={it.icon} size={24} />
            <span className="app-tab-label">{it.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

/** The shell's scroll area. Each new screen starts at the top, as in a native navigation stack. */
function Main() {
  const ref = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    ref.current?.scrollTo({ top: 0 });
  }, [pathname]);
  return (
    <main className="app-main" id="main" ref={ref}>
      <OfflineBanner />
      <Content />
    </main>
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
    <div className={desktop ? 'app-shell desktop' : 'app-shell'}>
        {desktop && (
          <div className="app-side">
            <Sidebar workspace={t('workspace.name', { name: me.name.split(' ')[0] ?? me.name })} items={items} active={active} onChange={go} user={{ name: me.name, role: t('role.coach') }} />
          </div>
        )}
        <Main />
      {!desktop && <TabNav items={items} active={active} onChange={go} />}
    </div>
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
  const active = seg === 'workout' ? 'today' : seg;
  return (
    <div className="app-shell client">
        <Main />
      <TabNav items={items} active={active} onChange={(id) => navigate(`/app/${id}`)} />
    </div>
  );
}
