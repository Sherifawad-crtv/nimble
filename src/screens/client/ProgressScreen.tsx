import { useMe } from '../../app/auth';
import { DataBoundary } from '../../components/DataBoundary';
import { Page } from '../../components/Page';
import { PersonalRecord, ProgressChart, Skeleton, StatCard } from '../../design';
import { useData } from '../../hooks/data';
import { keys } from '../../hooks/keys';
import { formatDay, t } from '../../i18n';
import type { ProgressSummary } from '../../types';

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

export function ProgressScreen() {
  const me = useMe();
  const summary = useData(keys.summary(me.id), (s) => s.getProgressSummary(me.id));
  const records = useData(keys.records(me.id), (s) => s.listPersonalRecords(me.id));
  const progress = useData(keys.progress(me.id), (s) => s.listExerciseProgress(me.id));

  return (
    <Page title={t('progress.title')} accent={summary.data ? `${summary.data.completionPct}%` : undefined} subtitle={t('progress.subtitle')}>
      <div className="app-stack">
        {summary.isPending ? (
          <Skeleton variant="card" />
        ) : (
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
        )}

        <section className="app-section" aria-label={t('progress.records')}>
          <h2 className="t-eyebrow app-h2">{t('progress.records')}</h2>
          <DataBoundary query={records} rows={3} empty={{ icon: 'trophy', title: t('records.empty.title'), body: t('records.empty.client') }}>
            {(list) => (
              <ul className="app-list tight">
                {list.map((r) => (
                  <li key={r.exerciseId}>
                    <PersonalRecord exercise={r.exerciseName} label={r.label} date={formatDay(r.achievedOn)} />
                  </li>
                ))}
              </ul>
            )}
          </DataBoundary>
        </section>

        <section className="app-section" aria-label={t('progress.history')}>
          <h2 className="t-eyebrow app-h2">{t('progress.history')}</h2>
          <DataBoundary
            query={progress}
            skeleton="chart"
            isEmpty={(d) => d.every((p) => p.points.length < 2)}
            empty={{ icon: 'pulse', title: t('progress.empty.title'), body: t('progress.empty.body') }}
          >
            {(list) => (
              <div className="app-charts">
                {list
                  .filter((p) => p.points.length >= 2)
                  .slice(0, 6)
                  .map((p) => (
                    <ProgressChart key={p.exerciseId} title={`${p.exerciseName} (${p.unit})`} unit={p.unit} points={p.points.map((q) => ({ x: formatDay(q.date), y: q.value }))} />
                  ))}
              </div>
            )}
          </DataBoundary>
        </section>
      </div>
    </Page>
  );
}
