import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMe } from '../app/auth';
import { useToast } from '../app/Toast';
import { Button, Icon } from '../design';
import { Md } from './Md';
import { ParticleOrb } from './ParticleOrb';
import { errorMessage, useAction, useData } from '../hooks/data';
import { keys } from '../hooks/keys';
import { formatDay, t } from '../i18n';
import { blockTypeLabel, isTimerBlock, measuredLabel, settingsSummary, targetText } from '../lib/workout';
import { dataService } from '../services';
import type { AssistantMessage, AssistantProposal, ExerciseInput, Id, MeasuredAs } from '../types';

interface Turn extends AssistantMessage {
  proposal?: AssistantProposal;
  resolved?: boolean;
  /** A reply that just arrived: its text is still being revealed. */
  fresh?: boolean;
}

const STARTERS = [
  { label: t('assistant.starter.workout'), prompt: t('assistant.starter.workout.prompt') },
  { label: t('assistant.starter.assign'), prompt: t('assistant.starter.assign.prompt') },
  { label: t('assistant.starter.find'), prompt: t('assistant.starter.find.prompt') },
];

const STATUS = [t('assistant.status.1'), t('assistant.status.2'), t('assistant.status.3')];

/** Reveals text word by word, quickly, the way a reply streams in. Skipped for older messages. */
function useReveal(text: string, fresh: boolean, onDone: () => void, onGrow: () => void): string {
  const [n, setN] = useState(fresh ? 0 : text.length);
  useEffect(() => {
    if (!fresh) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(text.length);
      onDone();
      return;
    }
    const parts = text.split(/(\s+)/);
    const per = Math.max(1, Math.ceil(parts.length / (1800 / 24))); // never longer than ~1.8 s
    let i = 0;
    const id = window.setInterval(() => {
      i = Math.min(parts.length, i + per);
      setN(parts.slice(0, i).join('').length);
      if (i >= parts.length) {
        window.clearInterval(id);
        onDone();
      }
    }, 24);
    return () => window.clearInterval(id);
  }, [text, fresh]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(onGrow, [n]); // eslint-disable-line react-hooks/exhaustive-deps
  return text.slice(0, n);
}

function Reply({ text, fresh, onDone, onGrow, children }: { text: string; fresh: boolean; onDone: () => void; onGrow: () => void; children?: React.ReactNode }) {
  const shown = useReveal(text, fresh, onDone, onGrow);
  const finished = shown.length >= text.length;
  return (
    <>
      <div className="assist-bubble md">
        <Md text={shown} />
        {!finished && <span className="assist-caret" aria-hidden="true" />}
      </div>
      {finished && children}
    </>
  );
}

/** While the assistant works: the particle sphere speeds up and a line of status text shimmers. */
function Thinking() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % STATUS.length), 2300);
    return () => window.clearInterval(id);
  }, []);
  return (
    <li className="assist-thinking" role="status" aria-label={t('assistant.working')}>
      <ParticleOrb size={64} energy={1} particles={120} />
      <span key={i} className="assist-shimmer t-label">
        {STATUS[i]}
      </span>
    </li>
  );
}

const Orb = ({ size = 'lg' }: { size?: 'sm' | 'lg' }) => <span className={size === 'lg' ? 'assist-orb' : 'assist-orb sm'} aria-hidden="true" />;

/**
 * The coach assistant: a full-screen layer that slides up over the app, with no navigation bar.
 * It looks things up and proposes one change at a time. Nothing is saved until the coach confirms.
 */
export function AssistantOverlay({ onClose }: { onClose: () => void }) {
  const me = useMe();
  const toast = useToast();
  const navigate = useNavigate();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [typing, setTyping] = useState(false);
  const typer = useRef<number>();
  const [closing, setClosing] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const exercises = useData(keys.exercises(), (s) => s.listExercises());
  const measured = new Map<string, MeasuredAs>((exercises.data ?? []).map((e) => [e.id, e.measuredAs]));

  const saveWorkout = useAction((s, a: { workout: Extract<AssistantProposal, { kind: 'workout' }> }) => s.saveWorkout({ ...a.workout.workout, ...(a.workout.replaceId ? { id: a.workout.replaceId } : {}) }), { invalidate: [keys.templates] });
  const assignWorkout = useAction((s, a: { clientId: string; workoutId: string; date: string }) => s.assignWorkout({ clientIds: [a.clientId], workoutId: a.workoutId, dates: [a.date] }), { invalidate: [keys.assignmentsAll] });
  const assignProgram = useAction((s, a: { clientId: string; programId: string; startDate: string }) => s.assignProgram(a), { invalidate: [keys.assignmentsAll] });

  const addExercise = useAction((s, a: ExerciseInput) => s.createExercise(a), { invalidate: [keys.exercisesAll] });
  const attachVideo = useAction((s, a: { id: Id; videoUrl: string }) => s.updateExercise(a.id, { videoUrl: a.videoUrl }), { invalidate: [keys.exercisesAll] });
  const saveProgram = useAction((s, a: { title: string; days: { dayOffset: number; workoutId: Id }[] }) => s.saveProgram(a), { invalidate: [keys.programs, keys.templates] });

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [turns, busy]);

  const close = () => setClosing(true);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const next: Turn[] = [...turns.map((x) => ({ ...x, fresh: false })), { role: 'user', content }];
    setTurns(next);
    setDraft('');
    setBusy(true);
    setThinking(true);
    try {
      const reply = await dataService.askAssistant(next.map(({ role, content: c }) => ({ role, content: c })));
      setThinking(false);
      setTurns([...next, { role: 'assistant', content: reply.text, fresh: true, ...(reply.proposal ? { proposal: reply.proposal } : {}) }]);
    } catch (e) {
      toast.show(errorMessage(e), 'error');
      setTurns(next.slice(0, -1));
      setDraft(content);
    } finally {
      setThinking(false);
      setBusy(false);
    }
  };

  const settle = (index: number, message: string) =>
    setTurns((list) => [...list.map((x, i) => (i === index ? { ...x, resolved: true } : x)), { role: 'assistant' as const, content: message, fresh: true }]);

  const confirm = async (index: number, p: AssistantProposal) => {
    setBusy(true);
    try {
      if (p.kind === 'workout') {
        const saved = await saveWorkout.run({ workout: p });
        toast.show(t('assistant.done.workout', { title: saved.title }));
        setClosing(true);
        navigate(`/coach/workouts/${saved.id}`);
      } else if (p.kind === 'assign_workout') {
        await assignWorkout.run({ clientId: p.clientId, workoutId: p.workoutId, date: p.date });
        settle(index, t('assistant.done.assign', { client: p.clientName }));
      } else if (p.kind === 'assign_program') {
        await assignProgram.run({ clientId: p.clientId, programId: p.programId, startDate: p.startDate });
        settle(index, t('assistant.done.assign', { client: p.clientName }));
      } else if (p.kind === 'exercises') {
        let done = 0;
        const failed: string[] = [];
        for (const it of p.items) {
          try {
            if (it.existingId) await attachVideo.run({ id: it.existingId, videoUrl: it.videoUrl ?? '' });
            else await addExercise.run({ name: it.name, equipment: it.equipment, tags: it.tags, measuredAs: it.measuredAs, ...(it.cues ? { cues: it.cues } : {}), ...(it.videoUrl ? { videoUrl: it.videoUrl } : {}) });
            done++;
          } catch {
            failed.push(it.name);
          }
        }
        settle(index, failed.length ? t('assistant.done.exercisesSome', { n: done, failed: failed.join(', ') }) : t('assistant.done.exercises', { n: done }));
      } else {
        const ids = new Map<string, Id>();
        for (const n of p.newWorkouts) ids.set(n.key, (await saveWorkout.run({ workout: { kind: 'workout', workout: n.workout } })).id);
        const days = p.sessions.map((x) => ({ dayOffset: x.dayOffset, workoutId: (x.workoutId ?? ids.get(x.workoutKey ?? '')) as Id }));
        const saved = await saveProgram.run({ title: p.title, days });
        toast.show(t('assistant.done.program', { title: saved.title }));
        setClosing(true);
        navigate(`/coach/programs/${saved.id}`);
      }
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(draft);
  };

  const empty = turns.length === 0;

  return (
    <div className={closing ? 'assist closing' : 'assist'} role="dialog" aria-modal="true" aria-label={t('assistant.title')} onAnimationEnd={(e) => e.currentTarget === e.target && closing && onClose()}>
      <header className="assist-bar">
        <button type="button" className="assist-round" aria-label={t('assistant.close')} onClick={close}>
          <Icon name="chev-d" size={22} />
        </button>
        {!empty && <h2 className="t-heading assist-bar-title">{t('assistant.title')}</h2>}
        {!empty ? (
          <button type="button" className="assist-round" aria-label={t('assistant.new')} disabled={busy} onClick={() => setTurns([])}>
            <Icon name="refresh" size={20} />
          </button>
        ) : (
          <span className="assist-round ghost" aria-hidden="true" />
        )}
      </header>

      {empty ? (
        <div className="assist-hero">
          <ParticleOrb size={210} energy={typing ? 0.55 : 0.08} />
          <p className="t-label assist-hello">{t('assistant.hello', { name: me.name.split(' ')[0] ?? me.name })}</p>
          <h1 className="t-title assist-headline">{t('assistant.headline')}</h1>
          <div className="assist-chips" role="group" aria-label={t('assistant.starters')}>
            {STARTERS.map((s, k) => (
              <button key={s.label} type="button" className="assist-chip" style={{ '--i': k } as React.CSSProperties} onClick={() => void send(s.prompt)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ol className="assist-thread" aria-live="polite">
          {turns.map((turn, i) =>
            turn.role === 'user' ? (
              <li key={i} className="assist-msg me">
                <p className="assist-bubble me">{turn.content}</p>
              </li>
            ) : (
              <li key={i} className="assist-msg">
                <Orb size="sm" />
                <div className="assist-col">
                  <Reply
                    text={turn.content}
                    fresh={!!turn.fresh}
                    onDone={() => setTurns((list) => list.map((x, k) => (k === i ? { ...x, fresh: false } : x)))}
                    onGrow={() => end.current?.scrollIntoView({ block: 'end' })}
                  >
                    {turn.proposal && <ProposalCard proposal={turn.proposal} measured={measured} resolved={!!turn.resolved} busy={busy} onConfirm={() => void confirm(i, turn.proposal as AssistantProposal)} onCancel={() => settle(i, t('assistant.cancelled'))} />}
                  </Reply>
                </div>
              </li>
            ),
          )}
          {thinking && <Thinking />}
          <div ref={end} />
        </ol>
      )}

      <form className="assist-composer" onSubmit={onSubmit}>
        <input
          className="assist-input"
          value={draft}
          maxLength={1000}
          placeholder={t('assistant.placeholder')}
          aria-label={t('assistant.placeholder')}
          enterKeyHint="send"
          autoComplete="off"
          onChange={(e) => {
            setDraft(e.target.value);
            setTyping(true);
            window.clearTimeout(typer.current);
            typer.current = window.setTimeout(() => setTyping(false), 700);
          }}
        />
        <button type="submit" className="assist-send" aria-label={t('assistant.send')} disabled={busy || !draft.trim()}>
          <Icon name="arrow-up" size={22} />
        </button>
      </form>
    </div>
  );
}

const weekday = (offset: number): string => new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(2026, 9, 12 + (offset % 7), 12));

function ProposalCard({ proposal, measured, resolved, busy, onConfirm, onCancel }: { proposal: AssistantProposal; measured: Map<string, MeasuredAs>; resolved: boolean; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  const heading =
    proposal.kind === 'workout'
      ? proposal.replaceId
        ? t('assistant.proposal.update')
        : t('assistant.proposal.create')
      : proposal.kind === 'assign_workout'
        ? t('assistant.proposal.assignWorkout')
        : proposal.kind === 'assign_program'
          ? t('assistant.proposal.assignProgram')
          : proposal.kind === 'exercises'
            ? t('assistant.proposal.exercises')
            : t('assistant.proposal.program');
  return (
    <div className="assist-proposal" data-resolved={resolved || undefined}>
      <div className="t-eyebrow v-muted">{heading}</div>
      {proposal.kind === 'workout' && (
        <>
          <div className="t-heading">{proposal.workout.title}</div>
          {proposal.workout.blocks.map((b) => (
            <div key={b.id} className="assist-proposal-block">
              <div className="t-body-strong">
                {b.title} <span className="v-muted t-label">· {isTimerBlock(b) ? settingsSummary(b.settings) : blockTypeLabel(b.settings.type)}</span>
              </div>
              <ul>
                {b.items.map((it) => (
                  <li key={it.id} className="t-label">
                    <span className="t-body">{it.exerciseName}</span>
                    {targetText(it.target, measured.get(it.exerciseId) ?? 'reps', isTimerBlock(b)) && <span className="v-muted"> · {targetText(it.target, measured.get(it.exerciseId) ?? 'reps', isTimerBlock(b))}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
      {proposal.kind === 'assign_workout' && <p className="t-body">{t('assistant.proposal.assignWorkout.body', { title: proposal.workoutTitle, client: proposal.clientName, date: formatDay(proposal.date) })}</p>}
      {proposal.kind === 'assign_program' && <p className="t-body">{t('assistant.proposal.assignProgram.body', { title: proposal.programTitle, client: proposal.clientName, date: formatDay(proposal.startDate) })}</p>}
      {proposal.kind === 'exercises' && (
        <>
          {proposal.items.map((it) => (
            <div key={it.name} className="assist-proposal-block">
              <div className="t-body-strong">
                {it.name} <span className="v-muted t-label">· {measuredLabel(it.measuredAs)}{it.tags.length ? ` · ${it.tags.join(', ')}` : ''}</span>
              </div>
              <div className="t-label v-muted">{it.videoUrl ? t('assistant.exercise.video', { title: it.videoTitle || it.videoUrl }) : (it.note ?? t('assistant.exercise.noVideo'))}</div>
            </div>
          ))}
          {proposal.skipped && <p className="t-label v-muted">{t('assistant.exercise.skipped', { names: proposal.skipped.join(', ') })}</p>}
        </>
      )}
      {proposal.kind === 'program' && (
        <>
          <div className="t-heading">{proposal.title}</div>
          <p className="t-label v-muted">{t('assistant.program.summary', { weeks: Math.floor(Math.max(...proposal.sessions.map((x) => x.dayOffset)) / 7) + 1, sessions: proposal.sessions.length })}</p>
          {proposal.newWorkouts.length > 0 && (
            <div className="assist-proposal-block">
              <div className="t-body-strong">{t('assistant.program.newWorkouts', { n: proposal.newWorkouts.length })}</div>
              <ul>
                {proposal.newWorkouts.map((n) => (
                  <li key={n.key} className="t-body">
                    {n.workout.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="assist-proposal-block">
            <div className="t-body-strong">{t('assistant.program.week1')}</div>
            <ul>
              {proposal.sessions.filter((x) => x.dayOffset < 7).map((x) => (
                <li key={x.dayOffset} className="t-label">
                  <span className="v-muted">{weekday(x.dayOffset)} · </span>
                  <span className="t-body">{x.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      {!resolved && (
        <div className="assist-proposal-actions">
          <Button fullWidth size="md" loading={busy} disabled={busy} onClick={onConfirm}>
            {t('assistant.confirm')}
          </Button>
          <Button fullWidth size="md" variant="secondary" disabled={busy} onClick={onCancel}>
            {t('assistant.cancel')}
          </Button>
        </div>
      )}
    </div>
  );
}
