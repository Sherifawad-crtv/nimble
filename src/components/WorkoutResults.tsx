import { blockTypeLabel, isTimerBlock, settingsSummary } from '../lib/workout';
import { formatSet, formatTimerResult } from '../lib/results';
import { t } from '../i18n';
import { VideoEmbed } from './VideoEmbed';
import type { Assignment, Exercise, WorkoutLog } from '../types';

/** Read-only account of what the client did, block by block, with each exercise's video still watchable. Used by both roles. */
export function WorkoutResults({ assignment, log, exercises }: { assignment: Assignment; log: WorkoutLog | null | undefined; exercises: Exercise[] }) {
  const exById = new Map(exercises.map((e) => [e.id, e]));
  return (
    <div className="app-results">
      {assignment.workout.blocks.map((b) => {
        const timer = isTimerBlock(b);
        const timerResult = log?.timerResults.find((r) => r.blockId === b.id)?.result;
        return (
          <section key={b.id} className="app-card" aria-label={b.title}>
            <header className="app-card-head">
              <h3 className="t-heading">{b.title}</h3>
              <span className="v-chip t-chip">{blockTypeLabel(b.settings.type)}</span>
            </header>
            {timer && <p className="t-label v-muted">{settingsSummary(b.settings)}</p>}
            {timer && (
              <p className="t-metric app-result-main">{timerResult ? formatTimerResult(timerResult) : t('results.noTimer')}</p>
            )}
            {b.items.length > 0 && (
              <ul className="app-result-items">
                {b.items.map((it) => {
                  const sets = log?.itemResults.find((r) => r.itemId === it.id)?.sets ?? [];
                  const ex = exById.get(it.exerciseId);
                  return (
                    <li key={it.id}>
                      <span className="t-body-strong">{it.exerciseName}</span>
                      {!timer && (
                        <span className="t-body v-muted app-sets">{sets.length ? sets.map((s, i) => <span key={i}>{formatSet(s)}</span>) : t('results.noSets')}</span>
                      )}
                      {ex && <VideoEmbed exercise={ex} />}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
      {log?.clientNote && (
        <section className="app-card" aria-label={t('results.note')}>
          <h3 className="t-heading">{t('results.note')}</h3>
          <p className="t-body">{log.clientNote}</p>
        </section>
      )}
    </div>
  );
}
