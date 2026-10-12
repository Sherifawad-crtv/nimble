import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../app/Toast';
import { DataBoundary } from '../../components/DataBoundary';
import { Page } from '../../components/Page';
import { Button, DataTable, IconButton, ListRow, Segmented } from '../../design';
import { errorMessage, useAction, useData } from '../../hooks/data';
import { useIsDesktop } from '../../hooks/media';
import { keys } from '../../hooks/keys';
import { t, tp } from '../../i18n';
import { blockTypeLabel, newId } from '../../lib/workout';
import type { Program, Workout } from '../../types';
import { AssignSheet } from './AssignSheet';

type Tab = 'templates' | 'programs';

const summary = (w: Workout) => `${tp('workouts.blocks', w.blocks.length)} · ${[...new Set(w.blocks.map((b) => blockTypeLabel(b.settings.type)))].join(', ')}`;

export function WorkoutsScreen() {
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('templates');
  const [assigning, setAssigning] = useState<{ workoutId?: string; programId?: string } | null>(null);
  const templates = useData(keys.templates, (s) => s.listTemplates());
  const programs = useData(keys.programs, (s) => s.listPrograms());
  const create = () => navigate(tab === 'templates' ? '/coach/workouts/new' : '/coach/programs/new');

  const duplicate = useAction(
    (s, w: Workout) =>
      s.saveWorkout({
        title: t('workouts.copyOf', { title: w.title }),
        blocks: w.blocks.map((b) => ({ ...b, id: newId('bl'), items: b.items.map((i) => ({ ...i, id: newId('it') })) })),
      }),
    { invalidate: [keys.templates] },
  );
  const onDuplicate = (w: Workout) =>
    void duplicate
      .run(w)
      .then((copy) => toast.show(t('workouts.duplicated', { title: copy.title })))
      .catch((e: unknown) => toast.show(errorMessage(e), 'error'));

  const rowTools = (w: Workout) => (
    <span className="app-row-actions" onClick={(e) => e.stopPropagation()}>
      <IconButton icon="calendar" label={t('workouts.assign', { title: w.title })} size={20} onClick={() => setAssigning({ workoutId: w.id })} />
      <IconButton icon="copy" label={t('workouts.duplicate', { title: w.title })} size={20} onClick={() => onDuplicate(w)} />
    </span>
  );

  return (
    <Page
      title={t('workouts.title')}
      subtitle={t('workouts.subtitle')}
      trailing={desktop ? <Button icon="plus" size="md" onClick={create}>{t(tab === 'templates' ? 'workouts.new' : 'programs.new')}</Button> : <IconButton icon="plus" label={t(tab === 'templates' ? 'workouts.new' : 'programs.new')} onClick={create} />}
    >
      <div className="app-stack">
        <Segmented
          options={[
            { id: 'templates', label: t('workouts.tab.templates') },
            { id: 'programs', label: t('workouts.tab.programs') },
          ]}
          value={tab}
          onChange={(id) => setTab(id as Tab)}
        />
        {tab === 'templates' ? (
          <DataBoundary query={templates} empty={{ icon: 'dumbbell', title: t('workouts.empty.title'), body: t('workouts.empty.body'), action: t('workouts.new'), onAction: create }}>
            {(list) =>
              desktop ? (
                <DataTable
                  columns={[
                    { key: 'title', label: t('workouts.col.title'), render: (r: Workout) => <span className="t-body-strong">{r.title}</span> },
                    { key: 'blocks', label: t('workouts.col.blocks'), render: (r: Workout) => summary(r) },
                    { key: 'actions', label: '', align: 'end', render: (r: Workout) => rowTools(r) },
                  ]}
                  rows={list}
                  onRowClick={(id: string) => navigate(`/coach/workouts/${id}`)}
                />
              ) : (
                <ul className="app-list">
                  {list.map((w) => (
                    <li key={w.id}>
                      <ListRow title={w.title} subtitle={summary(w)} trailing={rowTools(w)} onClick={() => navigate(`/coach/workouts/${w.id}`)} />
                    </li>
                  ))}
                </ul>
              )
            }
          </DataBoundary>
        ) : (
          <DataBoundary query={programs} empty={{ icon: 'list', title: t('programs.empty.title'), body: t('programs.empty.body'), action: t('programs.new'), onAction: create }}>
            {(list) => (
              <ul className="app-list">
                {list.map((p: Program) => (
                  <li key={p.id}>
                    <ListRow
                      title={p.title}
                      subtitle={tp('programs.days', p.days.length)}
                      trailing={
                        <span className="app-row-actions" onClick={(e) => e.stopPropagation()}>
                          <IconButton icon="calendar" label={t('workouts.assign', { title: p.title })} size={20} onClick={() => setAssigning({ programId: p.id })} />
                        </span>
                      }
                      onClick={() => navigate(`/coach/programs/${p.id}`)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </DataBoundary>
        )}
      </div>
      {assigning && <AssignSheet open onClose={() => setAssigning(null)} {...assigning} />}
    </Page>
  );
}
