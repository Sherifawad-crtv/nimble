import { useState } from 'react';
import { Button, Icon } from '../design';
import { t } from '../i18n';
import { formatClock } from '../timer/engine';
import type { ItemTarget, MeasuredAs, SetResult } from '../types';

interface Row {
  values: string[];
  done: boolean;
}

const COLUMNS: Record<MeasuredAs, string[]> = {
  reps: [t('log.col.reps')],
  weight_reps: [t('log.col.kg'), t('log.col.reps')],
  time: [t('log.col.time')],
  distance: [t('log.col.meters')],
  rounds: [t('log.col.rounds')],
};

/** Unit shown inside each field, so the row reads "80 kg · 6x" without column captions. */
const UNITS: Record<MeasuredAs, string[]> = {
  reps: [t('log.unit.reps')],
  weight_reps: [t('log.unit.kg'), t('log.unit.reps')],
  time: [''],
  distance: [t('log.unit.meters')],
  rounds: [t('log.unit.rounds')],
};

const parseSeconds = (s: string): number => {
  const [m, sec] = s.includes(':') ? s.split(':') : ['0', s];
  return (parseInt(m ?? '0', 10) || 0) * 60 + (parseInt(sec ?? '0', 10) || 0);
};
const num = (s: string) => parseFloat(s.replace(',', '.'));

function toResult(measured: MeasuredAs, v: string[]): SetResult | null {
  const [a = '', b = ''] = v;
  switch (measured) {
    case 'weight_reps': {
      const kg = num(a);
      const reps = parseInt(b, 10);
      return Number.isNaN(kg) && Number.isNaN(reps) ? null : { ...(Number.isNaN(kg) ? {} : { load: `${kg} kg` }), ...(Number.isNaN(reps) ? {} : { reps }) };
    }
    case 'time':
      return a.trim() ? { durationSec: parseSeconds(a) } : null;
    case 'distance':
      return a.trim() ? { distanceM: num(a) } : null;
    case 'reps':
    case 'rounds':
      return a.trim() ? { reps: parseInt(a, 10) } : null;
  }
}

function fromResult(measured: MeasuredAs, r: SetResult): string[] {
  switch (measured) {
    case 'weight_reps':
      return [String(parseFloat(r.load ?? '') || ''), r.reps === undefined ? '' : String(r.reps)];
    case 'time':
      return [r.durationSec === undefined ? '' : formatClock(r.durationSec)];
    case 'distance':
      return [r.distanceM === undefined ? '' : String(r.distanceM)];
    case 'reps':
    case 'rounds':
      return [r.reps === undefined ? '' : String(r.reps)];
  }
}

/** Placeholder values taken from the coach's target so a tap on "done" can log it as planned. */
function targetValues(measured: MeasuredAs, target: ItemTarget): string[] {
  switch (measured) {
    case 'weight_reps':
      return [String(parseFloat(target.loadNote ?? '') || ''), target.reps ? String(target.reps) : ''];
    case 'time':
      return [target.durationSec ? formatClock(target.durationSec) : ''];
    case 'distance':
      return [target.distanceM ? String(target.distanceM) : ''];
    case 'reps':
    case 'rounds':
      return [target.reps ? String(target.reps) : ''];
  }
}

interface Props {
  name: string;
  measuredAs: MeasuredAs;
  target: ItemTarget;
  saved: SetResult[];
  disabled?: boolean;
  onChange: (sets: SetResult[]) => void;
  onSetDone?: (restSec: number) => void;
}

/** Log inputs for one exercise, matching how the coach measures it. */
export function SetLogger({ name, measuredAs, target, saved, disabled, onChange, onSetDone }: Props) {
  const planned = Math.max(target.sets ?? 1, saved.length);
  const [rows, setRows] = useState<Row[]>(() =>
    Array.from({ length: planned }, (_, i) => {
      const s = saved[i];
      return s ? { values: fromResult(measuredAs, s), done: true } : { values: [], done: false };
    }),
  );
  const hints = targetValues(measuredAs, target);
  const cols = COLUMNS[measuredAs];
  const units = UNITS[measuredAs];
  const current = rows.findIndex((r) => !r.done);

  const commit = (next: Row[]) => {
    setRows(next);
    onChange(next.filter((r) => r.done).flatMap((r) => toResult(measuredAs, r.values) ?? []));
  };

  const edit = (i: number, k: number, value: string) =>
    commit(rows.map((r, j) => (j === i ? { ...r, values: Object.assign([...r.values], { [k]: value }) } : r)));

  const toggle = (i: number) => {
    const row = rows[i];
    if (!row) return;
    const done = !row.done;
    const values = done ? cols.map((_, k) => (row.values[k]?.trim() ? (row.values[k] as string) : (hints[k] ?? ''))) : row.values;
    commit(rows.map((r, j) => (j === i ? { values, done } : r)));
    if (done && target.restSec && i < rows.length - 1) onSetDone?.(target.restSec);
  };

  return (
    <div className="v-log app-log">
      {rows.map((row, i) => (
        <div key={i} className={row.done ? 'v-set done' : 'v-set'}>
          <span className={i === current && !disabled ? 'app-set-n now' : 'app-set-n'} aria-hidden="true">
            {i === current && !disabled ? '' : i + 1}
          </span>
          {cols.map((c, k) => (
            <label key={c} className="app-set-pill">
              <input
                className="app-set-in"
                inputMode={measuredAs === 'time' ? 'text' : 'decimal'}
                value={row.values[k] ?? ''}
                placeholder={hints[k] || '0'}
                disabled={disabled}
                onChange={(e) => edit(i, k, e.target.value)}
                aria-label={t('log.setField', { name, set: i + 1, field: c })}
              />
              {units[k] && <span className="app-set-unit">{units[k]}</span>}
            </label>
          ))}
          <button
            type="button"
            className={row.done ? 'app-set-check on' : 'app-set-check'}
            aria-pressed={row.done}
            aria-label={t('log.setDone', { name, set: i + 1 })}
            disabled={disabled}
            onClick={() => toggle(i)}
          >
            <Icon name="check" size={26} />
          </button>
        </div>
      ))}
      {!disabled && (
        <div className="app-set-actions">
          <Button size="md" variant="secondary" icon="plus" onClick={() => setRows([...rows, { values: [], done: false }])}>
            {t('log.addSet')}
          </Button>
          {rows.length > 1 && (
            <Button size="md" variant="tertiary" onClick={() => commit(rows.slice(0, -1))}>
              {t('log.removeLast')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
