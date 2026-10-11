import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarView, monthRange } from '../../components/CalendarView';
import { DataBoundary } from '../../components/DataBoundary';
import { Page } from '../../components/Page';
import { ListRow, StatusChip } from '../../design';
import { useData } from '../../hooks/data';
import { keys } from '../../hooks/keys';
import { formatDateLong, t } from '../../i18n';
import { startOfMonth, todayISO } from '../../lib/date';
import type { ISODate } from '../../types';

export function CalendarScreen() {
  const navigate = useNavigate();
  const today = todayISO();
  const [month, setMonth] = useState(startOfMonth(today));
  const [selected, setSelected] = useState<ISODate>(today);
  const { from, to } = monthRange(month);
  const assignments = useData(keys.assignments(undefined, from, to), (s) => s.listAssignments({ from, to }));
  const day = (assignments.data ?? []).filter((a) => a.date === selected);

  return (
    <Page title={t('calendar.title')} eyebrow={t('calendar.eyebrow')}>
      <div className="app-stack">
        <CalendarView
          month={month}
          selected={selected}
          assignments={assignments.data ?? []}
          onSelect={setSelected}
          onMonthChange={(m) => {
            setMonth(m);
            setSelected(m);
          }}
        />
        <h2 className="t-heading">{formatDateLong(selected)}</h2>
        <DataBoundary query={assignments} rows={2} isEmpty={() => day.length === 0} empty={<p className="t-body v-muted">{t('calendar.day.empty')}</p>}>
          {() => (
            <ul className="app-list">
              {day.map((a) => (
                <li key={a.id}>
                  <ListRow title={a.workout.title} subtitle={a.workout.blocks.map((b) => b.title).join(' · ')} trailing={<StatusChip kind="assignment" value={a.status} />} chevron onClick={() => navigate(`/app/workout/${a.id}`)} />
                </li>
              ))}
            </ul>
          )}
        </DataBoundary>
      </div>
    </Page>
  );
}
