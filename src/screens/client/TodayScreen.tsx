import { Navigate, useNavigate } from 'react-router-dom';
import { useMe } from '../../app/auth';
import { DataBoundary } from '../../components/DataBoundary';
import { Page } from '../../components/Page';
import { ReadinessHint } from '../../components/WearableBlocks';
import { Button, EmptyState, ListRow, StatusChip } from '../../design';
import { useData } from '../../hooks/data';
import { keys } from '../../hooks/keys';
import { formatDateLong, formatDateShort, t, tp } from '../../i18n';
import { addDays, todayISO } from '../../lib/date';
import { readPref, wearablePromptKey } from '../../lib/prefs';
import { blockTypeLabel } from '../../lib/workout';
import type { Assignment } from '../../types';

const overview = (a: Assignment) =>
  `${tp('workouts.blocks', a.workout.blocks.length)} · ${[...new Set(a.workout.blocks.map((b) => blockTypeLabel(b.settings.type)))].join(', ')}`;

const ctaLabel = (a: Assignment) =>
  a.status === 'completed' ? t('today.cta.results') : a.status === 'in_progress' ? t('today.cta.continue') : t('today.cta.start');

export function TodayScreen() {
  const me = useMe();
  const navigate = useNavigate();
  const today = todayISO();
  const until = addDays(today, 7);
  const assignments = useData(keys.assignments(undefined, today, until), (s) => s.listAssignments({ from: today, to: until }));
  const wearable = useData(keys.wearable(me.id), (s) => s.getWearableConnection(me.id));

  // First visit without a device: ask once, at sign-up time. Skipping is fine.
  if (wearable.data === null && readPref(wearablePromptKey(me.id)) === null) return <Navigate to="/app/wearable?first=1" replace />;

  return (
    <Page title={t('today.title')} eyebrow={formatDateLong(today)}>
      <div className="app-stack">
        <ReadinessHint clientId={me.id} />
        <DataBoundary query={assignments} skeleton="card" rows={2}>
          {(list) => {
            const todays = list.filter((a) => a.date === today);
            const upcoming = list.filter((a) => a.date > today).slice(0, 3);
            return (
              <>
                {todays.length === 0 ? (
                  <EmptyState icon="moon" title={t('today.rest.title')} body={upcoming.length ? t('today.rest.bodyNext') : t('today.rest.body')} />
                ) : (
                  todays.map((a) => (
                    <section key={a.id} className="app-card today-card" aria-label={a.workout.title}>
                      <div className="app-card-head">
                        <h2 className="t-heading">{a.workout.title}</h2>
                        <StatusChip kind="assignment" value={a.status} />
                      </div>
                      <p className="t-label v-muted">{overview(a)}</p>
                      <Button fullWidth size="lg" variant={a.status === 'completed' ? 'secondary' : 'primary'} onClick={() => navigate(`/app/workout/${a.id}`)}>
                        {ctaLabel(a)}
                      </Button>
                    </section>
                  ))
                )}
                {upcoming.length > 0 && (
                  <section className="app-section" aria-label={t('today.upNext')}>
                    <h2 className="t-heading">{t('today.upNext')}</h2>
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

