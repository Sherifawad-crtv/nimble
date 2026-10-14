import { useNavigate } from 'react-router-dom';
import { DataBoundary } from '../../components/DataBoundary';
import { Page } from '../../components/Page';
import { ProgressHero } from '../../components/ProgressHero';
import { EmptyState, ListRow, StatusChip } from '../../design';
import { useData } from '../../hooks/data';
import { keys } from '../../hooks/keys';
import { formatDateShort, t } from '../../i18n';
import { addDays, todayISO } from '../../lib/date';

/** How far ahead the home screen looks, and how many workouts it lists. */
const LOOKAHEAD_DAYS = 14;
const MAX_ROWS = 8;

/** Home: the progress hero, then the workouts coming up, today's first. */
export function TodayScreen() {
  const navigate = useNavigate();
  const today = todayISO();
  const assignments = useData(keys.assignments(undefined, today, addDays(today, LOOKAHEAD_DAYS)), (s) =>
    s.listAssignments({ from: today, to: addDays(today, LOOKAHEAD_DAYS) }),
  );

  return (
    <Page title={t('today.title')} accent={formatDateShort(today)} subtitle={t('progress.subtitle')}>
      <div className="app-stack">
        <ProgressHero quietWhenEmpty />

        <section className="app-section" aria-label={t('today.upNext')}>
          <h2 className="t-eyebrow app-h2">{t('today.upNext')}</h2>
          <DataBoundary query={assignments} skeleton="list" rows={3} empty={<EmptyState icon="moon" title={t('today.rest.title')} body={t('today.rest.body')} />}>
            {(list) => (
              <ul className="app-list">
                {list.slice(0, MAX_ROWS).map((a) => (
                  <li key={a.id}>
                    <ListRow
                      title={a.workout.title}
                      subtitle={a.date === today ? t('today.rowToday') : formatDateShort(a.date)}
                      trailing={a.date === today || a.status !== 'not_started' ? <StatusChip kind="assignment" value={a.status} /> : undefined}
                      chevron
                      onClick={() => navigate(`/app/workout/${a.id}`)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </DataBoundary>
        </section>
      </div>
    </Page>
  );
}
