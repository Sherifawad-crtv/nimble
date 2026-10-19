import { useMe } from '../app/auth';
import { StatCard, Skeleton } from '../design';
import { useData } from '../hooks/data';
import { keys } from '../hooks/keys';
import { t } from '../i18n';
import { compact } from '../lib/chart';
import type { ProgressSummary } from '../types';
import { DataBoundary } from './DataBoundary';

/** Completion dots, as on the source "Goal completion" screen: one dot per assigned workout. */
export function CompletionDots({ summary }: { summary: ProgressSummary }) {
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

/** The four headline numbers for a client, all worked out by the service. */
export function SummaryStats({ summary: s }: { summary: ProgressSummary }) {
  return (
    <div className="app-stat-grid">
      <StatCard tone="brand" icon="weight-duo" value={s.weightLiftedKg < 100_000 ? s.weightLiftedKg.toLocaleString() : compact(s.weightLiftedKg)} label={t('progress.stat.weight')} />
      <StatCard tone="blue" icon="check-circle-duo" value={String(s.completed)} label={t('progress.stat.workouts')} />
      <StatCard tone="pink" icon="flame-duo" value={String(s.streakWeeks)} label={t('progress.stat.streak')} />
      <StatCard tone="green" icon="trophy-duo" value={String(s.personalRecords)} label={t('progress.stat.records')} />
    </div>
  );
}

/**
 * The top of the client's progress: completion dots and the four headline numbers over the last
 * four weeks. All values come from the service. `quietWhenEmpty` shows nothing, instead of an empty
 * state, for screens that have their own. The completion dots (the "streak") are hidden until their
 * redesign: pass `showDots` to bring them back.
 */
export function ProgressHero({ quietWhenEmpty = false, showDots = false }: { quietWhenEmpty?: boolean; showDots?: boolean }) {
  const me = useMe();
  const summary = useData(keys.summary(me.id), (s) => s.getProgressSummary(me.id));

  if (summary.isPending) return <Skeleton variant="card" />;
  if (quietWhenEmpty && (summary.isError || summary.data?.assigned === 0)) return null;

  return (
    <DataBoundary query={summary} skeleton="card" isEmpty={(s) => s.assigned === 0} empty={{ icon: 'calendar', title: t('progress.none.title'), body: t('progress.none.body') }}>
      {(s) => (
        <>
          {showDots && <CompletionDots summary={s} />}
          <SummaryStats summary={s} />
        </>
      )}
    </DataBoundary>
  );
}
