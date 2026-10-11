import { Calendar, IconButton } from '../design';
import { parseISODate, toISODate, todayISO } from '../lib/date';
import { formatMonthYear, t } from '../i18n';
import type { Assignment, ISODate } from '../types';

interface Props {
  month: ISODate; // first day of the visible month
  selected: ISODate;
  assignments: Assignment[];
  onSelect: (date: ISODate) => void;
  onMonthChange: (firstOfMonth: ISODate) => void;
}

/** First and last day shown for a month, for loading its assignments. */
export function monthRange(month: ISODate): { from: ISODate; to: ISODate } {
  const d = parseISODate(month);
  return { from: month, to: toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
}

export const shiftMonth = (month: ISODate, by: number): ISODate => {
  const d = parseISODate(month);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + by, 1));
};

/** The design calendar with working month navigation. */
export function CalendarView({ month, selected, assignments, onSelect, onMonthChange }: Props) {
  const data: Record<string, string[]> = {};
  for (const a of assignments) (data[a.date] ??= []).push(a.status);
  return (
    <div className="app-cal">
      <div className="app-cal-head">
        <h2 className="t-heading" aria-live="polite">
          {formatMonthYear(month)}
        </h2>
        <span className="app-cal-nav">
          <IconButton icon="chev-l" label={t('calendar.prev')} size={20} onClick={() => onMonthChange(shiftMonth(month, -1))} />
          <IconButton icon="chev-r" label={t('calendar.next')} size={20} onClick={() => onMonthChange(shiftMonth(month, 1))} />
        </span>
      </div>
      <Calendar mode="month" month={month} selected={selected} today={todayISO()} data={data} onSelect={onSelect} />
    </div>
  );
}

