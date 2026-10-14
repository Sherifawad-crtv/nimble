import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMe } from '../../app/auth';
import { DataBoundary } from '../../components/DataBoundary';
import { Page } from '../../components/Page';
import { ProgressHero } from '../../components/ProgressHero';
import { Avatar, Calendar, EmptyState, ListRow, StatusChip } from '../../design';
import { useData } from '../../hooks/data';
import { keys } from '../../hooks/keys';
import { formatDateShort, t } from '../../i18n';
import { addDays, startOfWeek, todayISO } from '../../lib/date';
import type { Assignment } from '../../types';

/** How far ahead the home screen looks, and how many workouts it lists. */
const LOOKAHEAD_DAYS = 14;
const MAX_ROWS = 8;
const WEEK_START = 1; // Monday

function WorkoutRow({ a, today, onOpen }: { a: Assignment; today: string; onOpen: () => void }) {
  return (
    <ListRow
      title={a.workout.title}
      subtitle={a.date === today ? t('today.rowToday') : formatDateShort(a.date)}
      trailing={a.date === today || a.status !== 'not_started' ? <StatusChip kind="assignment" value={a.status} /> : undefined}
      chevron
      onClick={onOpen}
    />
  );
}

/** Home: this week's calendar, the progress hero, then the workouts coming up. */
export function TodayScreen() {
  const me = useMe();
  const navigate = useNavigate();
  const today = todayISO();
  const [selected, setSelected] = useState(today);
  const from = startOfWeek(today, WEEK_START);
  const to = addDays(today, LOOKAHEAD_DAYS);
  const assignments = useData(keys.assignments(undefined, from, to), (s) => s.listAssignments({ from, to }));

  const data: Record<string, string[]> = {};
  for (const a of assignments.data ?? []) (data[a.date] ??= []).push(a.status);

  const open = (a: Assignment) => navigate(`/app/workout/${a.id}`);
  const first = me.name.split(' ')[0] ?? me.name;

  return (
    <Page title={t('home.greeting', { name: first })} subtitle={t('home.welcome')} trailing={<Avatar name={me.name} size="md" />}>
      <div className="app-stack">
        <div className="app-weekstrip">
          <Calendar mode="week" weekStart={WEEK_START} today={today} selected={selected} data={data} onSelect={setSelected} />
        </div>

        <ProgressHero quietWhenEmpty />

        <section className="app-section" aria-label={selected === today ? t('today.upNext') : formatDateShort(selected)}>
          <h2 className="t-eyebrow app-h2">{selected === today ? t('today.upNext') : formatDateShort(selected)}</h2>
          <DataBoundary query={assignments} skeleton="list" rows={3}>
            {(list) => {
              // Today shows what is coming up; any other day shows that day's own workouts.
              const rows = selected === today ? list.filter((a) => a.date >= today).slice(0, MAX_ROWS) : list.filter((a) => a.date === selected);
              if (!rows.length) {
                return <EmptyState icon="moon" title={t('today.rest.title')} body={selected === today ? t('today.rest.body') : t('home.day.none')} />;
              }
              return (
                <ul className="app-list">
                  {rows.map((a) => (
                    <li key={a.id}>
                      <WorkoutRow a={a} today={today} onOpen={() => open(a)} />
                    </li>
                  ))}
                </ul>
              );
            }}
          </DataBoundary>
        </section>
      </div>
    </Page>
  );
}
