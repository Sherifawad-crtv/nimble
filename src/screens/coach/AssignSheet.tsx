import { useState } from 'react';
import { useToast } from '../../app/Toast';
import { DataBoundary } from '../../components/DataBoundary';
import { Sheet } from '../../components/Sheet';
import { Button, Checkbox, Chip, DateField, IconButton, Segmented, Select } from '../../design';
import { errorMessage, useAction, useData } from '../../hooks/data';
import { keys } from '../../hooks/keys';
import { t, tp } from '../../i18n';
import { todayISO } from '../../lib/date';
import type { Id, ISODate } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Fixes the client (assigning from a client page). */
  clientId?: Id;
  /** Fixes the workout (assigning from the template list). */
  workoutId?: Id;
  /** Fixes the program (assigning from the program list). */
  programId?: Id;
}

/** Assign a workout to clients on dates, or start a program for a client. */
export function AssignSheet(props: Props) {
  return (
    <Sheet open={props.open} title={t('assign.title')} onClose={props.onClose}>
      <AssignForm {...props} />
    </Sheet>
  );
}

function AssignForm({ onClose, clientId, workoutId, programId }: Props) {
  const toast = useToast();
  const needsPick = !workoutId && !programId;
  const clients = useData(keys.clients, (s) => s.listClients(), { enabled: !clientId });
  const templates = useData(keys.templates, (s) => s.listTemplates(), { enabled: needsPick });
  const programs = useData(keys.programs, (s) => s.listPrograms(), { enabled: needsPick });

  const [mode, setMode] = useState<'workout' | 'program'>(programId ? 'program' : 'workout');
  const [pickedWorkout, setPickedWorkout] = useState<Id | undefined>(workoutId);
  const [pickedProgram, setPickedProgram] = useState<Id | undefined>(programId);
  const [selected, setSelected] = useState<Id[]>(clientId ? [clientId] : []);
  const [dates, setDates] = useState<ISODate[]>([todayISO()]);
  const [startDate, setStartDate] = useState<ISODate>(todayISO());
  const [error, setError] = useState<string>();

  const assignWorkout = useAction((s, a: { clientIds: Id[]; workoutId: Id; dates: ISODate[] }) => s.assignWorkout(a), { invalidate: [keys.assignmentsAll] });
  const assignProgram = useAction(
    async (s, a: { clientIds: Id[]; programId: Id; startDate: ISODate }) => (await Promise.all(a.clientIds.map((c) => s.assignProgram({ clientId: c, programId: a.programId, startDate: a.startDate })))).flat(),
    { invalidate: [keys.assignmentsAll] },
  );

  const isProgram = programId ? true : workoutId ? false : mode === 'program';
  const workout = workoutId ?? pickedWorkout;
  const program = programId ?? pickedProgram;
  const busy = assignWorkout.isPending || assignProgram.isPending;

  const submit = async () => {
    if (!selected.length) return setError(t('assign.error.client'));
    if (isProgram ? !program : !workout) return setError(t(isProgram ? 'assign.error.program' : 'assign.error.workout'));
    const unique = [...new Set(dates.filter(Boolean))];
    if (!isProgram && !unique.length) return setError(t('assign.error.date'));
    setError(undefined);
    try {
      const made = isProgram
        ? await assignProgram.run({ clientIds: selected, programId: program as Id, startDate })
        : await assignWorkout.run({ clientIds: selected, workoutId: workout as Id, dates: unique });
      toast.show(tp('assign.done', made.length));
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <div className="app-form">
      {needsPick && (
        <>
          <Segmented
            options={[
              { id: 'workout', label: t('assign.mode.workout') },
              { id: 'program', label: t('assign.mode.program') },
            ]}
            value={mode}
            onChange={(id) => setMode(id as 'workout' | 'program')}
          />
          {mode === 'workout' ? (
            <DataBoundary query={templates} skeleton="list" rows={2} inline empty={{ icon: 'dumbbell', title: t('assign.empty.templates') }}>
              {(list) => <Select label={t('assign.workout')} options={list.map((w) => ({ id: w.id, label: w.title }))} value={pickedWorkout} onChange={setPickedWorkout} placeholder={t('assign.choose')} />}
            </DataBoundary>
          ) : (
            <DataBoundary query={programs} skeleton="list" rows={2} inline empty={{ icon: 'list', title: t('assign.empty.programs') }}>
              {(list) => <Select label={t('assign.program')} options={list.map((p) => ({ id: p.id, label: p.title }))} value={pickedProgram} onChange={setPickedProgram} placeholder={t('assign.choose')} />}
            </DataBoundary>
          )}
        </>
      )}

      {!clientId && (
        <div className="app-fieldset v-field" role="group" aria-labelledby="assign-clients-label">
          <span className="v-label t-label" id="assign-clients-label">
            {t('assign.clients')}
          </span>
          <DataBoundary query={clients} skeleton="list" rows={3} inline empty={{ icon: 'users', title: t('clients.empty.title') }}>
            {(list) =>
              list.map((c) => (
                <Checkbox
                  key={c.id}
                  label={c.name}
                  checked={selected.includes(c.id)}
                  onChange={(on) => setSelected(on ? [...selected, c.id] : selected.filter((x) => x !== c.id))}
                />
              ))
            }
          </DataBoundary>
        </div>
      )}

      {isProgram ? (
        <DateField label={t('assign.startDate')} value={startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)} />
      ) : (
        <div className="app-fieldset" role="group" aria-label={t('assign.dates')}>
          {dates.map((d, i) => (
            <div key={i} className="app-date-row">
              <DateField
                label={dates.length > 1 ? t('assign.dateN', { n: i + 1 }) : t('assign.date')}
                value={d}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDates(dates.map((x, j) => (j === i ? e.target.value : x)))}
              />
              {dates.length > 1 && <IconButton icon="close" label={t('assign.removeDate', { n: i + 1 })} onClick={() => setDates(dates.filter((_, j) => j !== i))} />}
            </div>
          ))}
          <Chip add label={t('assign.addDate')} onClick={() => setDates([...dates, dates.at(-1) ?? todayISO()])} />
        </div>
      )}

      {error && (
        <p className="t-label app-error" role="alert">
          {error}
        </p>
      )}
      <div className="app-form-actions">
        <Button fullWidth size="md" loading={busy} onClick={() => void submit()}>
          {t('assign.submit')}
        </Button>
      </div>
    </div>
  );
}
