import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../app/Toast';
import { DataBoundary } from '../../components/DataBoundary';
import { ConfirmDialog } from '../../components/Sheet';
import { Button, ErrorState, IconButton, NumberField, RoundCounter, TimerControls, TimerDisplay } from '../../design';
import { errorMessage, useAction, useData } from '../../hooks/data';
import { useIsLandscape } from '../../hooks/media';
import { keys } from '../../hooks/keys';
import { t } from '../../i18n';
import { formatTimerResult } from '../../lib/results';
import { settingsSummary } from '../../lib/workout';
import { buildPlan, buildResult, formatClock, type TimerPlan } from '../../timer/engine';
import { useTimer } from '../../timer/useTimer';
import type { Assignment, Block, BlockSettings, WorkoutLog } from '../../types';

export function TimerScreen() {
  const { assignmentId = '', blockId = '' } = useParams();
  const navigate = useNavigate();
  const assignment = useData(keys.assignment(assignmentId), (s) => s.getAssignment(assignmentId));
  const log = useData(keys.log(assignmentId), (s) => s.getLog(assignmentId));
  const back = `/app/workout/${assignmentId}`;

  return (
    <div className="app-timer" data-theme="dark">
      <DataBoundary query={assignment} skeleton="detail">
        {(a) => (
          <DataBoundary query={log} skeleton="detail">
            {(l) => {
              const block = a.workout.blocks.find((b) => b.id === blockId);
              if (!block || block.settings.type === 'standard' || !l) {
                return <ErrorState title={t('timer.unavailable.title')} body={t('timer.unavailable.body')} icon="clock" onRetry={() => navigate(back)} />;
              }
              return <TimerView assignment={a} block={block} settings={block.settings} log={l} back={back} />;
            }}
          </DataBoundary>
        )}
      </DataBoundary>
    </div>
  );
}

interface ViewProps {
  assignment: Assignment;
  block: Block;
  settings: Exclude<BlockSettings, { type: 'standard' }>;
  log: WorkoutLog;
  back: string;
}

function TimerView({ assignment, block, settings, log, back }: ViewProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const landscape = useIsLandscape();
  const plan = useMemo<TimerPlan>(() => buildPlan(settings), [settings]);
  const timer = useTimer(plan);
  const { snap } = timer;
  const [rounds, setRounds] = useState(0);
  const [extraReps, setExtraReps] = useState(0);
  const [quit, setQuit] = useState(false);
  const save = useAction(
    (s, w: WorkoutLog) => s.saveLog(w),
    { invalidate: [keys.logsAll] },
  );

  const counts = plan.format === 'amrap' || plan.format === 'for_time';
  const running = snap.status === 'running' || snap.status === 'paused';
  const result = buildResult(plan, snap, { rounds, extraReps });

  const saveResult = async () => {
    if (!result) return;
    try {
      await save.run({ ...log, timerResults: [...log.timerResults.filter((r) => r.blockId !== block.id), { blockId: block.id, result }] });
      toast.show(t('timer.saved'));
      navigate(back, { replace: true });
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    }
  };

  const seg = snap.segment;
  const sub =
    snap.status === 'ready'
      ? settingsSummary(settings)
      : seg.kind === 'ready'
        ? undefined
        : plan.format === 'emom' && seg.round
          ? t('timer.minuteOf', { n: seg.round, total: plan.rounds ?? seg.round })
          : plan.format === 'tabata' && seg.round
            ? t('timer.roundOf', { n: seg.round, total: plan.rounds ?? seg.round })
            : plan.format === 'for_time'
              ? t('timer.roundsTarget', { done: rounds, total: plan.rounds ?? rounds })
              : undefined;
  const phase = snap.status === 'ready' ? block.title : seg.label || t(`timer.phase.${seg.kind}`);
  const time = snap.status === 'ready' ? formatClock(plan.direction === 'up' ? 0 : (plan.segments.find((s) => s.kind !== 'ready')?.durationSec ?? 0)) : formatClock(snap.displaySec);

  return (
    <div className={landscape ? 'app-timer-body landscape' : 'app-timer-body'}>
      <header className="app-timer-head">
        <IconButton icon="close" label={t('timer.quit')} onClick={() => (snap.status === 'ready' || snap.status === 'finished' ? navigate(back) : setQuit(true))} />
        <div>
          <h1 className="t-heading">{block.title}</h1>
          <p className="t-caption v-muted">{assignment.workout.title}</p>
        </div>
      </header>

      <div className="app-timer-main">
        <TimerDisplay
          time={time}
          phase={phase}
          sub={sub}
          progress={snap.status === 'ready' ? 0 : snap.progress}
          tone={seg.kind === 'rest' ? 'rest' : seg.kind === 'ready' ? 'ready' : 'work'}
          final={snap.final}
          paused={snap.status === 'paused'}
          size={landscape ? 'xl' : 'md'}
        />
      </div>

      <div className="app-timer-side">
        {counts && (snap.status !== 'ready') && snap.status !== 'finished' && (
          <RoundCounter count={rounds} onChange={setRounds} />
        )}

        {snap.status === 'finished' && result ? (
          <section className="app-timer-result" aria-label={t('timer.result')}>
            <h2 className="t-eyebrow">{t('timer.result')}</h2>
            {plan.format === 'amrap' && (
              <div className="app-timer-fields">
                <RoundCounter count={rounds} onChange={setRounds} />
                <NumberField label={t('timer.extraReps')} value={extraReps} min={0} max={999} onChange={setExtraReps} />
              </div>
            )}
            <p className="t-metric app-result-main">{formatTimerResult(result)}</p>
            <Button fullWidth size="lg" loading={save.isPending} onClick={() => void saveResult()}>
              {t('timer.save')}
            </Button>
            <Button fullWidth size="md" variant="secondary" onClick={() => navigate(back)}>
              {t('timer.discard')}
            </Button>
          </section>
        ) : (
          <>
            <TimerControls
              state={snap.status === 'finished' ? 'finished' : snap.status}
              sound={timer.sound}
              voice={timer.voice}
              keepAwake={timer.keepAwake}
              onStart={timer.start}
              onPause={timer.pause}
              onResume={timer.resume}
              onStop={timer.stop}
              onFinish={timer.stop}
              onSound={timer.toggleSound}
              onVoice={timer.toggleVoice}
            />
            {plan.format === 'for_time' && running && (
              <Button fullWidth size="lg" icon="flag" onClick={timer.stop}>
                {t('timer.finishNow')}
              </Button>
            )}
          </>
        )}

        {block.items.length > 0 && snap.status !== 'finished' && (
          <ul className="app-timer-items" aria-label={t('timer.exercises')}>
            {block.items.map((it) => (
              <li key={it.id} className="t-body-strong">
                {it.target.reps ? <span className="v-num">{it.target.reps} </span> : null}
                {it.exerciseName}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={quit}
        destructive
        dark
        title={t('timer.quit.title')}
        body={t('timer.quit.body')}
        confirmLabel={t('timer.quit.confirm')}
        onCancel={() => setQuit(false)}
        onConfirm={() => navigate(back)}
      />
    </div>
  );
}
