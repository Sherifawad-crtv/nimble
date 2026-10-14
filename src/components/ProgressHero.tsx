import { useMe } from '../app/auth';
import { StatCard, Skeleton } from '../design';
import { useData } from '../hooks/data';
import { keys } from '../hooks/keys';
import { t } from '../i18n';
import type { ProgressSummary } from '../types';
import { DataBoundary } from './DataBoundary';

/** Completion dots, as on the source "Goal completion" screen: one dot per assigned workout. */
function CompletionDots({ summary }: { summary: ProgressSummary }) {
  return (
    <div role="img" aria-label={t('progress.dots', { done: summary.completed, total: summary.assigned })}>
      <div className="v-dots-cap t-caption">{t('progress.dots', { done: summary.completed, total: summary.assigned })}</div>
      <div className="v-dots app-dots">
        {Array.from({ length: summary.assigned }, (_, i) => (
          <span key={i} className={i < summary.completed ? 'v-dot on' : 'v-dot'} />
        ))}
      </div>
    </div>
  );
}

/**
 * The top of the client's progress: completion dots and the four headline numbers over the last
 * four weeks. All values come from the service. `quietWhenEmpty` shows nothing, instead of an empty
 * state, for screens that have their own.
 */
export function ProgressHero({ quietWhenEmpty = false }: { quietWhenEmpty?: boolean }) {
  const me = useMe();
  const summary = useData(keys.summary(me.id), (s) => s.getProgressSummary(me.id));

  if (summary.isPending) return <Skeleton variant="card" />;
  if (quietWhenEmpty && (summary.isError || summary.data?.assigned === 0)) return null;

  return (
    <DataBoundary query={summary} skeleton="card" isEmpty={(s) => s.assigned === 0} empty={{ icon: 'calendar', title: t('progress.none.title'), body: t('progress.none.body') }}>
      {(s) => (
        <>
          <CompletionDots summary={s} />
          <div className="app-stat-grid">
            <StatCard tone="pink" icon="calendar" value={String(s.assigned)} label={t('progress.stat.assigned')} />
            <StatCard tone="blue" icon="run" value={String(s.completed)} label={t('progress.stat.workouts')} />
            <StatCard tone="brand" icon="flame" value={String(s.setsLogged)} label={t('progress.stat.sets')} />
            <StatCard tone="green" icon="trophy" value={String(s.personalRecords)} label={t('progress.stat.records')} />
          </div>
        </>
      )}
    </DataBoundary>
  );
}
