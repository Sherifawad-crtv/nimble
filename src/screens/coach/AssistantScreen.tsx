import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../app/Toast';
import { Page } from '../../components/Page';
import { Button, Chip, Icon } from '../../design';
import { errorMessage, useAction, useData } from '../../hooks/data';
import { keys } from '../../hooks/keys';
import { formatDay, t } from '../../i18n';
import { dataService } from '../../services';
import { blockTypeLabel, isTimerBlock, settingsSummary, targetText } from '../../lib/workout';
import type { AssistantMessage, AssistantProposal, MeasuredAs } from '../../types';

interface Turn extends AssistantMessage {
  proposal?: AssistantProposal;
  resolved?: boolean;
}

const STARTERS = [
  { label: t('assistant.starter.workout'), prompt: t('assistant.starter.workout.prompt') },
  { label: t('assistant.starter.assign'), prompt: t('assistant.starter.assign.prompt') },
  { label: t('assistant.starter.find'), prompt: t('assistant.starter.find.prompt') },
];

/** A guided assistant: it looks things up and proposes one change at a time. Nothing is saved until the coach confirms. */
export function AssistantScreen() {
  const toast = useToast();
  const navigate = useNavigate();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const exercises = useData(keys.exercises(), (s) => s.listExercises());
  const measured = new Map<string, MeasuredAs>((exercises.data ?? []).map((e) => [e.id, e.measuredAs]));

  const saveWorkout = useAction((s, a: { workout: Extract<AssistantProposal, { kind: 'workout' }> }) => s.saveWorkout({ ...a.workout.workout, ...(a.workout.replaceId ? { id: a.workout.replaceId } : {}) }), { invalidate: [keys.templates] });
  const assignWorkout = useAction((s, a: { clientId: string; workoutId: string; date: string }) => s.assignWorkout({ clientIds: [a.clientId], workoutId: a.workoutId, dates: [a.date] }), { invalidate: [keys.assignmentsAll] });
  const assignProgram = useAction((s, a: { clientId: string; programId: string; startDate: string }) => s.assignProgram(a), { invalidate: [keys.assignmentsAll] });

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [turns, busy]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const next: Turn[] = [...turns, { role: 'user', content }];
    setTurns(next);
    setDraft('');
    setBusy(true);
    try {
      const reply = await dataService.askAssistant(next.map(({ role, content: c }) => ({ role, content: c })));
      setTurns([...next, { role: 'assistant', content: reply.text, ...(reply.proposal ? { proposal: reply.proposal } : {}) }]);
    } catch (e) {
      toast.show(errorMessage(e), 'error');
      setTurns(next.slice(0, -1));
      setDraft(content);
    } finally {
      setBusy(false);
    }
  };

  const settle = (index: number, message: string) =>
    setTurns((list) => [...list.map((x, i) => (i === index ? { ...x, resolved: true } : x)), { role: 'assistant' as const, content: message }]);

  const confirm = async (index: number, p: AssistantProposal) => {
    setBusy(true);
    try {
      if (p.kind === 'workout') {
        const saved = await saveWorkout.run({ workout: p });
        settle(index, t('assistant.done.workout', { title: saved.title }));
        toast.show(t('assistant.done.workout', { title: saved.title }));
        navigate(`/coach/workouts/${saved.id}`);
      } else if (p.kind === 'assign_workout') {
        await assignWorkout.run({ clientId: p.clientId, workoutId: p.workoutId, date: p.date });
        settle(index, t('assistant.done.assign', { client: p.clientName }));
        toast.show(t('assistant.done.assign', { client: p.clientName }));
      } else {
        await assignProgram.run({ clientId: p.clientId, programId: p.programId, startDate: p.startDate });
        settle(index, t('assistant.done.assign', { client: p.clientName }));
        toast.show(t('assistant.done.assign', { client: p.clientName }));
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

  return (
    <Page title={t('assistant.title')} subtitle={t('assistant.subtitle')}>
      <div className="app-assist">
        {turns.length === 0 && (
          <div className="app-assist-start">
            <p className="t-label v-muted">{t('assistant.intro')}</p>
            <div className="app-filters" role="group" aria-label={t('assistant.starters')}>
              {STARTERS.map((s) => (
                <Chip key={s.label} label={s.label} onClick={() => void send(s.prompt)} />
              ))}
            </div>
          </div>
        )}

        <ol className="app-assist-thread" aria-live="polite">
          {turns.map((turn, i) => (
            <li key={i} className={turn.role === 'user' ? 'app-bubble me' : 'app-bubble'}>
              <p className="t-body">{turn.content}</p>
              {turn.proposal && <ProposalCard proposal={turn.proposal} measured={measured} resolved={!!turn.resolved} busy={busy} onConfirm={() => void confirm(i, turn.proposal as AssistantProposal)} onCancel={() => settle(i, t('assistant.cancelled'))} />}
            </li>
          ))}
          {busy && (
            <li className="app-bubble working" aria-label={t('assistant.working')}>
              <span className="v-spin" aria-hidden="true" />
              <span className="t-label v-muted">{t('assistant.working')}</span>
            </li>
          )}
        </ol>
        <div ref={end} />

        <form className="app-assist-composer" onSubmit={onSubmit}>
          <input
            className="app-assist-input"
            value={draft}
            maxLength={1000}
            placeholder={t('assistant.placeholder')}
            aria-label={t('assistant.placeholder')}
            enterKeyHint="send"
            autoComplete="off"
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className="app-assist-send" aria-label={t('assistant.send')} disabled={busy || !draft.trim()}>
            <Icon name="arrow-up" size={22} />
          </button>
        </form>
      </div>
    </Page>
  );
}

function ProposalCard({ proposal, measured, resolved, busy, onConfirm, onCancel }: { proposal: AssistantProposal; measured: Map<string, MeasuredAs>; resolved: boolean; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  const heading =
    proposal.kind === 'workout' ? (proposal.replaceId ? t('assistant.proposal.update') : t('assistant.proposal.create')) : proposal.kind === 'assign_workout' ? t('assistant.proposal.assignWorkout') : t('assistant.proposal.assignProgram');
  return (
    <div className="app-proposal" data-resolved={resolved || undefined}>
      <div className="t-eyebrow v-muted">{heading}</div>
      {proposal.kind === 'workout' && (
        <>
          <div className="t-heading">{proposal.workout.title}</div>
          {proposal.workout.blocks.map((b) => (
            <div key={b.id} className="app-proposal-block">
              <div className="t-body-strong">
                {b.title} <span className="v-muted t-label">· {isTimerBlock(b) ? `${blockTypeLabel(b.settings.type)} ${settingsSummary(b.settings)}` : blockTypeLabel(b.settings.type)}</span>
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
      {!resolved && (
        <div className="app-proposal-actions">
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
