import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../app/Toast';
import { DataBoundary } from '../../components/DataBoundary';
import { Page } from '../../components/Page';
import { ConfirmDialog } from '../../components/Sheet';
import { Button, EmptyState, IconButton, NumberField, Select, TextField } from '../../design';
import { errorMessage, useAction, useData } from '../../hooks/data';
import { keys } from '../../hooks/keys';
import { t } from '../../i18n';
import { newId } from '../../lib/workout';
import type { Program, Workout } from '../../types';
import { AssignSheet } from './AssignSheet';

interface Day {
  key: string;
  day: number; // 1-based day number shown to the coach; stored as dayOffset = day - 1
  workoutId: string;
}

export function ProgramEditor() {
  const { programId = 'new' } = useParams();
  const navigate = useNavigate();
  const programs = useData(keys.programs, (s) => s.listPrograms());
  const templates = useData(keys.templates, (s) => s.listTemplates());
  return (
    <DataBoundary query={programs} skeleton="detail">
      {(plist) => (
        <DataBoundary query={templates} skeleton="detail" empty={<Page title={t('program.new')} back="/coach/workouts"><EmptyState icon="dumbbell" title={t('program.noTemplates.title')} body={t('program.noTemplates.body')} action={t('program.noTemplates.action')} onAction={() => navigate('/coach/workouts/new')} /></Page>}>
          {(tlist) => {
            const found = programId === 'new' ? undefined : plist.find((p) => p.id === programId);
            if (programId !== 'new' && !found) {
              return (
                <Page title={t('program.notFound.title')} back="/coach/workouts">
                  <EmptyState icon="list" title={t('program.notFound.title')} body={t('program.notFound.body')} action={t('program.notFound.action')} onAction={() => navigate('/coach/workouts')} />
                </Page>
              );
            }
            return <ProgramForm key={found?.id ?? 'new'} initial={found} templates={tlist} />;
          }}
        </DataBoundary>
      )}
    </DataBoundary>
  );
}

const toDays = (p?: Program): Day[] => (p?.days ?? []).map((d) => ({ key: newId('d'), day: d.dayOffset + 1, workoutId: d.workoutId }));

function ProgramForm({ initial, templates }: { initial?: Program; templates: Workout[] }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [days, setDays] = useState<Day[]>(() => toDays(initial));
  const [savedId, setSavedId] = useState(initial?.id);
  const snapshot = useRef(JSON.stringify({ title: initial?.title ?? '', days: initial?.days ?? [] }));
  const payload = { title, days: days.map((d) => ({ dayOffset: d.day - 1, workoutId: d.workoutId })).sort((a, b) => a.dayOffset - b.dayOffset) };
  const dirty = JSON.stringify({ title, days: payload.days }) !== snapshot.current;
  const [leaving, setLeaving] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [error, setError] = useState<string>();
  const save = useAction((s, p: Parameters<typeof s.saveProgram>[0]) => s.saveProgram(p), { invalidate: [keys.programs] });

  const submit = async () => {
    if (!title.trim()) return setError(t('program.error.title'));
    if (!days.length || days.some((d) => !d.workoutId)) return setError(t('program.error.days'));
    setError(undefined);
    try {
      const saved = await save.run({ ...(savedId && { id: savedId }), ...payload });
      snapshot.current = JSON.stringify({ title: saved.title, days: saved.days });
      setSavedId(saved.id);
      setTitle(saved.title);
      toast.show(t('program.saved', { title: saved.title }));
      if (!initial) navigate(`/coach/programs/${saved.id}`, { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const addDay = () => setDays([...days, { key: newId('d'), day: (days.reduce((m, d) => Math.max(m, d.day), 0) || 0) + 1, workoutId: '' }]);
  const patch = (key: string, p: Partial<Day>) => setDays(days.map((d) => (d.key === key ? { ...d, ...p } : d)));

  return (
    <Page
      title={initial ? t('program.edit') : t('program.new')}
      back="/coach/workouts"
      onBack={() => (dirty ? setLeaving(true) : navigate('/coach/workouts'))}
      trailing={<Button size="sm" loading={save.isPending} disabled={!dirty && !!savedId} onClick={() => void submit()}>{t('builder.save')}</Button>}
    >
      <div className="app-stack builder">
        <TextField label={t('program.title.label')} required placeholder={t('program.title.placeholder')} value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} />
        <p className="t-body v-muted">{t('program.hint')}</p>
        {days.length === 0 && <EmptyState icon="calendar" title={t('program.empty.title')} body={t('program.empty.body')} />}
        {[...days].sort((a, b) => a.day - b.day).map((d) => (
          <section key={d.key} className="app-card" aria-label={t('program.day', { n: d.day })}>
            <div className="app-target-grid">
              <NumberField label={t('program.dayLabel')} min={1} max={365} value={d.day} onChange={(n) => patch(d.key, { day: n })} />
              <Select label={t('program.workout')} placeholder={t('assign.choose')} options={templates.map((w) => ({ id: w.id, label: w.title }))} value={d.workoutId || undefined} onChange={(id) => patch(d.key, { workoutId: id })} />
            </div>
            <div className="app-card-foot">
              <span className="t-label v-muted">{t('program.week', { week: Math.floor((d.day - 1) / 7) + 1, day: ((d.day - 1) % 7) + 1 })}</span>
              <IconButton icon="trash" label={t('program.removeDay', { n: d.day })} size={20} onClick={() => setDays(days.filter((x) => x.key !== d.key))} />
            </div>
          </section>
        ))}
        <Button variant="secondary" size="md" icon="plus" onClick={addDay}>{t('program.addDay')}</Button>
        {error && <p className="t-label app-error" role="alert">{error}</p>}
        {savedId && !dirty && <Button size="md" icon="calendar" onClick={() => setAssignOpen(true)}>{t('builder.assign')}</Button>}
      </div>
      <ConfirmDialog open={leaving} destructive title={t('builder.discard.title')} body={t('builder.discard.body')} confirmLabel={t('builder.discard.confirm')} onCancel={() => setLeaving(false)} onConfirm={() => navigate('/coach/workouts')} />
      {savedId && <AssignSheet open={assignOpen} onClose={() => setAssignOpen(false)} programId={savedId} />}
    </Page>
  );
}
