import { useMe } from '../../app/auth';
import { DataBoundary } from '../../components/DataBoundary';
import { Page } from '../../components/Page';
import { ExerciseChart } from '../../components/ExerciseChart';
import { ProgressHero } from '../../components/ProgressHero';
import { PersonalRecord } from '../../design';
import { useIsDesktop } from '../../hooks/media';
import { useData } from '../../hooks/data';
import { keys } from '../../hooks/keys';
import { formatDay, t } from '../../i18n';

export function ProgressScreen() {
  const me = useMe();
  const desktop = useIsDesktop();
  const summary = useData(keys.summary(me.id), (s) => s.getProgressSummary(me.id));
  const records = useData(keys.records(me.id), (s) => s.listPersonalRecords(me.id));
  const progress = useData(keys.progress(me.id), (s) => s.listExerciseProgress(me.id));

  return (
    <Page title={t('progress.title')} accent={summary.data ? `${summary.data.completionPct}%` : undefined} subtitle={t('progress.subtitle')}>
      {desktop && (
        <div className="app-clients-gap">
          <ProgressHero quietWhenEmpty />
        </div>
      )}
      <div className={desktop ? 'app-prog-split' : 'app-stack'}>
        <section className="app-section app-records" aria-label={t('progress.records')}>
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
                    <ExerciseChart key={p.exerciseId} progress={p} />
                  ))}
              </div>
            )}
          </DataBoundary>
        </section>
      </div>
    </Page>
  );
}
