import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMe } from '../../app/auth';
import { useToast } from '../../app/Toast';
import { Comments } from '../../components/Comments';
import { DataBoundary } from '../../components/DataBoundary';
import { Page } from '../../components/Page';
import { SetLogger } from '../../components/SetLogger';
import { VideoEmbed } from '../../components/VideoEmbed';
import { WorkoutPlan } from '../../components/WorkoutPlan';
import { WorkoutResults } from '../../components/WorkoutResults';
import { WorkoutWearable } from '../../components/WearableBlocks';
import { Banner, Button, StatusChip, TextField } from '../../design';
import { errorMessage, useAction, useData } from '../../hooks/data';
import { keys } from '../../hooks/keys';
import { formatDateLong, t } from '../../i18n';
import { formatTimerResult } from '../../lib/results';
import { blockTypeLabel, isTimerBlock, settingsSummary, targetText } from '../../lib/workout';
import type { Assignment, Block, Exercise, SetResult, WorkoutLog } from '../../types';
import { RestOverlay } from './RestOverlay';

export function WorkoutScreen() {
  const { assignmentId = '' } = useParams();
  const assignment = useData(keys.assignment(assignmentId), (s) => s.getAssignment(assignmentId));
  return (
    <DataBoundary query={assignment} skeleton="detail">
      {(a) => <WorkoutView assignment={a} />}
    </DataBoundary>
  );
}

const refreshAfterWork = [keys.assignmentsAll, keys.logsAll, keys.recordsAll, keys.progressAll];

function WorkoutView({ assignment: a }: { assignment: Assignment }) {
  const exercises = useData(keys.exercises(), (s) => s.listExercises());
  const log = useData(keys.log(a.id), (s) => s.getLog(a.id));
  const toast = useToast();
  const start = useAction((s, _: void) => s.startWorkout(a.id), { invalidate: refreshAfterWork });

  const begin = () => void start.run().catch((e: unknown) => toast.show(errorMessage(e), 'error'));

  return (
    <Page title={a.workout.title} subtitle={formatDateLong(a.date)} back="/app/today" trailing={<StatusChip kind="assignment" value={a.status} />}>
      <div className="app-stack">
        <DataBoundary query={exercises} skeleton="detail">
          {(exList) => (
            <DataBoundary query={log} skeleton="detail">
              {(l) => {
                if (a.status === 'completed') return <Completed assignment={a} log={l} />;
                if (a.status === 'skipped') return <Banner message={t('workout.skipped')} />;
                if (!l || a.status === 'not_started') {
                  return (
                    <>
                      <Button fullWidth size="lg" loading={start.isPending} onClick={begin}>
                        {t('workout.start')}
                      </Button>
                      <WorkoutPlan assignment={a} exercises={exList} />
                    </>
                  );
                }
                return <Active assignment={a} log={l} exercises={exList} />;
              }}
            </DataBoundary>
          )}
        </DataBoundary>
        <Comments assignmentId={a.id} viewer="client" />
      </div>
    </Page>
  );
}

function Completed({ assignment, log }: { assignment: Assignment; log: WorkoutLog | null }) {
  return (
    <>
      <Banner message={t('workout.completed.body')} title={t('workout.completed.title')} />
      <WorkoutWearable log={log} />
      <WorkoutResults assignment={assignment} log={log} />
    </>
  );
}

const SAVE_DELAY_MS = 700;

function Active({ assignment: a, log, exercises }: { assignment: Assignment; log: WorkoutLog; exercises: Exercise[] }) {
  const me = useMe();
  const navigate = useNavigate();
  const toast = useToast();
  const exById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  const [results, setResults] = useState<Record<string, SetResult[]>>(() => Object.fromEntries(log.itemResults.map((r) => [r.itemId, r.sets])));
  const [note, setNote] = useState(log.clientNote ?? '');
  const [rest, setRest] = useState<{ seconds: number; next?: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const latest = useRef({ results, note, log });
  latest.current = { results, note, log };

  const save = useAction((s, l: WorkoutLog) => s.saveLog(l), { invalidate: [keys.logsAll] });
  const complete = useAction((s, _: void) => s.completeWorkout(a.id), { invalidate: [...refreshAfterWork, keys.packages(me.id)] });
  const { run: saveRun } = save;

  const flush = useCallback(async () => {
    const { results: r, note: n, log: base } = latest.current;
    await saveRun({
      ...base,
      itemResults: Object.entries(r).map(([itemId, sets]) => ({ itemId, sets })),
      ...(n.trim() ? { clientNote: n } : { clientNote: undefined }),
    });
    setDirty(false);
  }, [saveRun]);

  // Autosave shortly after the last change, so closing the app never loses a set.
  useEffect(() => {
    if (!dirty) return;
    const id = window.setTimeout(() => void flush().catch(() => undefined), SAVE_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [dirty, results, note, flush]);

  // Flush on the way out: leaving the screen or backgrounding the app must never drop a logged set.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && dirtyRef.current) void flush().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      if (dirtyRef.current) void flush().catch(() => undefined);
    };
  }, [flush]);

  const setItemSets = (itemId: string, sets: SetResult[]) => {
    setResults((r) => ({ ...r, [itemId]: sets }));
    setDirty(true);
  };

  const openTimer = async (block: Block) => {
    try {
      if (dirty) await flush();
      navigate(`/app/timer/${a.id}/${block.id}`);
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    }
  };

  const finish = async () => {
    try {
      await flush();
      await complete.run();
      toast.show(t('workout.finished'));
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    }
  };

  return (
    <>
      {a.workout.blocks.map((block) => {
        const timer = isTimerBlock(block);
        const result = log.timerResults.find((r) => r.blockId === block.id)?.result;
        return (
          <section key={block.id} className="app-card" aria-label={block.title}>
            <header className="app-card-head">
              <h2 className="t-heading">{block.title}</h2>
              <span className="v-chip t-chip">{blockTypeLabel(block.settings.type)}</span>
            </header>
            {timer && <p className="t-label v-muted">{settingsSummary(block.settings)}</p>}

            {block.items.map((it, i) => {
              const ex = exById.get(it.exerciseId);
              const measured = ex?.measuredAs ?? 'reps';
              const next = block.items[i + 1]?.exerciseName ?? block.items[0]?.exerciseName;
              return (
                <article key={it.id} className="app-exercise" aria-label={it.exerciseName}>
                  <h3 className="t-body-strong">{it.exerciseName}</h3>
                  <p className="t-label v-muted">{targetText(it.target, measured, timer)}</p>
                  {ex ? (
                    <VideoEmbed exercise={ex} />
                  ) : (
                    <p className="t-label v-muted">{t('workout.exerciseMissing')}</p>
                  )}
                  {!timer && (
                    <SetLogger
                      name={it.exerciseName}
                      measuredAs={measured}
                      target={it.target}
                      saved={results[it.id] ?? []}
                      onChange={(sets) => setItemSets(it.id, sets)}
                      onSetDone={(seconds) => setRest({ seconds, next })}
                    />
                  )}
                </article>
              );
            })}

            {timer && (
              <div className="app-timer-launch">
                {result && <p className="t-metric app-result-main">{formatTimerResult(result)}</p>}
                <Button fullWidth size="lg" icon="clock" variant={result ? 'secondary' : 'primary'} onClick={() => void openTimer(block)}>
                  {t(result ? 'workout.timer.again' : 'workout.timer.open')}
                </Button>
              </div>
            )}
          </section>
        );
      })}

      <TextField
        label={t('workout.note')}
        placeholder={t('workout.note.placeholder')}
        multiline
        value={note}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          setNote(e.target.value);
          setDirty(true);
        }}
      />
      <p className="t-caption v-muted" role="status">
        {save.isPending ? t('workout.saving') : save.error ? t('workout.saveFailed') : dirty ? '' : t('workout.saved')}
      </p>
      <Button fullWidth size="lg" loading={complete.isPending} onClick={() => void finish()}>
        {t('workout.finish')}
      </Button>
      {rest && <RestOverlay seconds={rest.seconds} next={rest.next} onClose={() => setRest(null)} />}
    </>
  );
}
