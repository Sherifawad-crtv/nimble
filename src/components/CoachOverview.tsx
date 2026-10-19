import { StatCard } from '../design';
import { formatDateShort, t } from '../i18n';
import type { CoachOverview, ProgramProgress } from '../types';

/** The coach's headline numbers: everything here is worked out by the service. */
export function CoachStats({ overview }: { overview: CoachOverview }) {
  return (
    <div className="app-stat-grid app-clients-gap">
      <StatCard tone="brand" icon="users-duo" value={String(overview.clients)} label={t('clients.stat.clients')} />
      <StatCard tone="green" icon="active-duo" value={String(overview.activeThisWeek)} label={t('clients.stat.active')} />
      <StatCard tone="blue" icon="today-duo" value={`${overview.todayDone}/${overview.todayPlanned}`} label={t('clients.stat.today')} />
      <StatCard tone="pink" icon="renew-duo" value={String(overview.packagesToRenew)} label={t('clients.stat.renew')} />
    </div>
  );
}

/** How far a client is through their program: the program and week, over a thin bar. */
export function ProgramBar({ progress }: { progress: ProgramProgress | null }) {
  if (!progress) return <span className="app-prog none">{t('clients.prog.none')}</span>;
  const caption =
    progress.state === 'upcoming' ? t('clients.prog.upcoming', { date: formatDateShort(progress.startsOn) }) : progress.state === 'finished' ? t('clients.prog.finished') : t('clients.prog.week', { week: progress.week, weeks: progress.weeks });
  return (
    <span className={`app-prog ${progress.state}`} role="img" aria-label={t('clients.prog.aria', { title: progress.title, percent: progress.percent })}>
      <span className="app-prog-text">
        <span className="app-prog-title">{progress.title}</span>
        <span className="app-prog-cap">{caption}</span>
      </span>
      <span className="app-prog-track">
        <span className="app-prog-fill" style={{ inlineSize: `${progress.percent}%` }} />
      </span>
    </span>
  );
}
