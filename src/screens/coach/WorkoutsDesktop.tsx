import { useState, type ReactNode } from 'react';
import { Button, IconButton } from '../../design';
import { t, tp } from '../../i18n';
import { blockTypeLabel, isTimerBlock, targetText } from '../../lib/workout';
import type { MeasuredAs, Program, Workout } from '../../types';

const WEEKDAY = (offset: number) => new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(2026, 9, 12 + (offset % 7), 12));

interface Row {
  id: string;
  title: string;
  meta: string;
}

/** A selectable table with a preview panel beside it, shared by workout templates and programs. */
function Split({ rows, heading, selected, onSelect, panel, actions }: { rows: Row[]; heading: [string, string]; selected: string | null; onSelect: (id: string | null) => void; panel: (id: string) => ReactNode; actions: (id: string) => ReactNode }) {
  const current = rows.find((r) => r.id === selected) ?? null;
  return (
    <div className={current ? 'app-split open' : 'app-split'}>
      <div className="app-table-wrap">
        <table className="app-table">
          <thead>
            <tr>
              <th>{heading[0]}</th>
              <th>{heading[1]}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                tabIndex={0}
                className={r.id === selected ? 'on' : undefined}
                aria-selected={r.id === selected}
                onClick={() => onSelect(r.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(r.id);
                  } else if (e.key === 'Escape') onSelect(null);
                  else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    ((e.key === 'ArrowDown' ? e.currentTarget.nextElementSibling : e.currentTarget.previousElementSibling) as HTMLElement | null)?.focus();
                  }
                }}
              >
                <td>
                  <span className="t-body-strong">{r.title}</span>
                </td>
                <td className="v-muted">{r.meta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {current && (
        <aside className="app-panel" aria-label={current.title}>
          <div className="app-panel-head">
            <div className="app-panel-id">
              <h2 className="t-heading">{current.title}</h2>
              <span className="t-caption v-muted">{current.meta}</span>
            </div>
            <IconButton icon="close" label={t('workouts.panel.close')} variant="ghost" onClick={() => onSelect(null)} />
          </div>
          {panel(current.id)}
          <div className="app-panel-actions">{actions(current.id)}</div>
        </aside>
      )}
    </div>
  );
}

interface TemplatesProps {
  list: Workout[];
  measured: Map<string, MeasuredAs>;
  summary: (w: Workout) => string;
  onOpen: (id: string) => void;
  onAssign: (id: string) => void;
  onDuplicate: (w: Workout) => void;
}

export function TemplatesDesktop({ list, measured, summary, onOpen, onAssign, onDuplicate }: TemplatesProps) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <Split
      rows={list.map((w) => ({ id: w.id, title: w.title, meta: summary(w) }))}
      heading={[t('workouts.col.title'), t('workouts.col.blocks')]}
      selected={selected}
      onSelect={setSelected}
      panel={(id) => {
        const w = list.find((x) => x.id === id);
        if (!w) return null;
        return (
          <div className="app-panel-blocks">
            {w.blocks.map((b) => {
              const timer = isTimerBlock(b);
              return (
                <section key={b.id} className="app-panel-sec">
                  <h3 className="t-eyebrow">
                    {b.title} · {blockTypeLabel(b.settings.type)}
                  </h3>
                  {b.items.length === 0 ? (
                    <span className="v-muted">{t('workouts.panel.noItems')}</span>
                  ) : (
                    <ul className="app-result-items">
                      {b.items.map((it) => (
                        <li key={it.id}>
                          <span className="t-body-strong">{it.exerciseName}</span>
                          <span className="v-muted">{targetText(it.target, measured.get(it.exerciseId) ?? 'reps', timer)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        );
      }}
      actions={(id) => {
        const w = list.find((x) => x.id === id);
        return w ? (
          <>
            <Button size="md" fullWidth onClick={() => onOpen(id)}>
              {t('workouts.panel.edit')}
            </Button>
            <Button size="md" variant="secondary" fullWidth icon="calendar" onClick={() => onAssign(id)}>
              {t('workouts.assign', { title: w.title })}
            </Button>
            <Button size="md" variant="tertiary" fullWidth icon="copy" onClick={() => onDuplicate(w)}>
              {t('workouts.duplicate', { title: w.title })}
            </Button>
          </>
        ) : null;
      }}
    />
  );
}

export function ProgramsDesktop({ list, templates, onOpen, onAssign }: { list: Program[]; templates: Workout[]; onOpen: (id: string) => void; onAssign: (id: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const title = new Map(templates.map((w) => [w.id, w.title]));
  return (
    <Split
      rows={list.map((p) => ({ id: p.id, title: p.title, meta: tp('programs.days', p.days.length) }))}
      heading={[t('workouts.col.title'), t('workouts.col.blocks')]}
      selected={selected}
      onSelect={setSelected}
      panel={(id) => {
        const p = list.find((x) => x.id === id);
        if (!p) return null;
        const weeks = new Map<number, Program['days']>();
        for (const d of p.days) weeks.set(Math.floor(d.dayOffset / 7), [...(weeks.get(Math.floor(d.dayOffset / 7)) ?? []), d]);
        return (
          <div className="app-panel-blocks">
            {[...weeks].map(([w, days]) => (
              <section key={w} className="app-panel-sec">
                <h3 className="t-eyebrow">{t('workouts.panel.week', { n: w + 1 })}</h3>
                <ul className="app-result-items">
                  {days.map((d) => (
                    <li key={`${d.dayOffset}${d.workoutId}`}>
                      <span className="t-body-strong">{title.get(d.workoutId) ?? ''}</span>
                      <span className="v-muted">{WEEKDAY(d.dayOffset)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        );
      }}
      actions={(id) => (
        <>
          <Button size="md" fullWidth onClick={() => onOpen(id)}>
            {t('workouts.panel.edit')}
          </Button>
          <Button size="md" variant="secondary" fullWidth icon="calendar" onClick={() => onAssign(id)}>
            {t('workouts.assign', { title: list.find((x) => x.id === id)?.title ?? '' })}
          </Button>
        </>
      )}
    />
  );
}
