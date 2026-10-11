import { useMe } from '../../app/auth';
import { DataBoundary } from '../../components/DataBoundary';
import { Page } from '../../components/Page';
import { PersonalRecord, ProgressChart } from '../../design';
import { useData } from '../../hooks/data';
import { keys } from '../../hooks/keys';
import { formatDay, t } from '../../i18n';

export function ProgressScreen() {
  const me = useMe();
  const records = useData(keys.records(me.id), (s) => s.listPersonalRecords(me.id));
  const progress = useData(keys.progress(me.id), (s) => s.listExerciseProgress(me.id));
  return (
    <Page title={t('progress.title')} eyebrow={t('progress.eyebrow')}>
      <div className="app-stack">
        <section className="app-section" aria-label={t('progress.records')}>
          <h2 className="t-heading">{t('progress.records')}</h2>
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
          <h2 className="t-heading">{t('progress.history')}</h2>
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
