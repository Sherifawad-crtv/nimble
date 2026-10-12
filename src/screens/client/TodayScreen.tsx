import { useNavigate } from 'react-router-dom';
import { DataBoundary } from '../../components/DataBoundary';
import { Page } from '../../components/Page';
import { Button, EmptyState, ListRow, MetricPill, StatusChip } from '../../design';
import { useData } from '../../hooks/data';
import { keys } from '../../hooks/keys';
import { formatDateShort, t } from '../../i18n';
import { addDays, todayISO } from '../../lib/date';
import { blockTypeLabel, isTimerBlock } from '../../lib/workout';
import type { Assignment } from '../../types';

const ctaLabel = (a: Assignment) =>
  a.status === 'completed' ? t('today.cta.results') : a.status === 'in_progress' ? t('today.cta.continue') : t('today.cta.start');

function TodayCard({ a, onOpen }: { a: Assignment; onOpen: () => void }) {
  const exercises = a.workout.blocks.reduce((n, b) => n + b.items.length, 0);
  const timed = a.workout.blocks.filter(isTimerBlock).length;
  return (
    <section className="app-today" aria-label={a.workout.title}>
      <div className="app-today-head">
        <div>
          <p className="t-caption app-overline">{t('today.workout')}</p>
          <h2 className="t-title app-today-title">{a.workout.title}</h2>
        </div>
        <StatusChip kind="assignment" value={a.status} />
      </div>
      <div className="app-pills">
        <MetricPill tone="brand" icon="dumbbell" value={String(a.workout.blocks.length)} label={t('today.pill.blocks')} />
        <MetricPill tone="blue" icon="run" value={String(exercises)} label={t('today.pill.exercises')} />
        <MetricPill tone="pink" icon="clock" value={String(timed)} label={t('today.pill.timed')} />
      </div>
      <p className="t-label v-muted">{[...new Set(a.workout.blocks.map((b) => blockTypeLabel(b.settings.type)))].join(' · ')}</p>
      <Button fullWidth size="lg" variant={a.status === 'completed' ? 'secondary' : 'primary'} onClick={onOpen}>
        {ctaLabel(a)}
      </Button>
    </section>
  );
}

export function TodayScreen() {
  const navigate = useNavigate();
  const today = todayISO();
  const until = addDays(today, 7);
  const assignments = useData(keys.assignments(undefined, today, until), (s) => s.listAssignments({ from: today, to: until }));

  return (
    <Page title={t('today.title')} accent={formatDateShort(today)}>
      <div className="app-stack">
        <DataBoundary query={assignments} skeleton="card" rows={2}>
          {(list) => {
            const todays = list.filter((a) => a.date === today);
            const upcoming = list.filter((a) => a.date > today).slice(0, 3);
            return (
              <>
                {todays.length === 0 ? (
                  <EmptyState icon="moon" title={t('today.rest.title')} body={upcoming.length ? t('today.rest.bodyNext') : t('today.rest.body')} />
                ) : (
                  todays.map((a) => <TodayCard key={a.id} a={a} onOpen={() => navigate(`/app/workout/${a.id}`)} />)
                )}
                {upcoming.length > 0 && (
                  <section className="app-section" aria-label={t('today.upNext')}>
                    <h2 className="t-eyebrow app-h2">{t('today.upNext')}</h2>
                    <ul className="app-list">
                      {upcoming.map((a) => (
                        <li key={a.id}>
                          <ListRow title={a.workout.title} subtitle={formatDateShort(a.date)} chevron onClick={() => navigate(`/app/workout/${a.id}`)} />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            );
          }}
        </DataBoundary>
      </div>
    </Page>
  );
}
