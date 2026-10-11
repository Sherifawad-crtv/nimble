import { blockTypeLabel, isTimerBlock, settingsSummary, targetText } from '../lib/workout';
import { t } from '../i18n';
import type { Assignment, Exercise, MeasuredAs } from '../types';

/** The prescribed workout, read-only. */
export function WorkoutPlan({ assignment, exercises }: { assignment: Assignment; exercises: Exercise[] }) {
  const measured = new Map<string, MeasuredAs>(exercises.map((e) => [e.id, e.measuredAs]));
  return (
    <div className="app-results">
      {assignment.workout.blocks.map((b) => {
        const timer = isTimerBlock(b);
        return (
          <section key={b.id} className="app-card" aria-label={b.title}>
            <header className="app-card-head">
              <h3 className="t-heading">{b.title}</h3>
              <span className="v-chip t-chip">{blockTypeLabel(b.settings.type)}</span>
            </header>
            {timer && <p className="t-label v-muted">{settingsSummary(b.settings)}</p>}
            {b.items.length === 0 && b.settings.type !== 'custom' && <p className="t-body v-muted">{t('plan.noItems')}</p>}
            <ul className="app-result-items">
              {b.items.map((it) => (
                <li key={it.id}>
                  <span className="t-body-strong">{it.exerciseName}</span>
                  <span className="t-body v-muted">{targetText(it.target, measured.get(it.exerciseId) ?? 'reps', timer)}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
