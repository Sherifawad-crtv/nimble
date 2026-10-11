import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../app/Toast';
import { DataBoundary } from '../../components/DataBoundary';
import { Page } from '../../components/Page';
import { ConfirmDialog, Sheet } from '../../components/Sheet';
import { Button, EmptyState, ExerciseRow, IconButton, ListRow, TextField } from '../../design';
import { errorMessage, useAction, useData } from '../../hooks/data';
import { keys } from '../../hooks/keys';
import { t } from '../../i18n';
import { BLOCK_TYPES, blockTypeLabel, defaultSettings, newId, settingsSummary, targetText } from '../../lib/workout';
import type { Block, BlockItem, BlockType, Exercise, ItemTarget, MeasuredAs, Workout } from '../../types';
import { AddExerciseSheet } from './AddExerciseSheet';
import { AssignSheet } from './AssignSheet';
import { BlockSettingsEditor } from './BlockSettingsEditor';
import { TargetSheet } from './TargetSheet';

export function WorkoutBuilder() {
  const { workoutId = 'new' } = useParams();
  const navigate = useNavigate();
  const templates = useData(keys.templates, (s) => s.listTemplates());
  return (
    <DataBoundary query={templates} skeleton="detail">
      {(list) => {
        const found = workoutId === 'new' ? undefined : list.find((w) => w.id === workoutId);
        if (workoutId !== 'new' && !found) {
          return (
            <Page title={t('builder.notFound.title')} back="/coach/workouts">
              <EmptyState icon="dumbbell" title={t('builder.notFound.title')} body={t('builder.notFound.body')} action={t('builder.notFound.action')} onAction={() => navigate('/coach/workouts')} />
            </Page>
          );
        }
        return <BuilderForm key={found?.id ?? 'new'} initial={found} />;
      }}
    </DataBoundary>
  );
}

function defaultTarget(blockType: BlockType, measured: MeasuredAs): ItemTarget {
  if (blockType === 'tabata') return {};
  const timer = blockType !== 'standard';
  const amount: ItemTarget = measured === 'time' ? { durationSec: 30 } : measured === 'distance' ? { distanceM: 200 } : { reps: timer ? 10 : 8 };
  return timer ? amount : { sets: 3, ...amount, restSec: 60 };
}

const hasTargetFields = (b: BlockType) => b !== 'tabata' && b !== 'custom';

function BuilderForm({ initial }: { initial?: Workout }) {
  const navigate = useNavigate();
  const toast = useToast();
  const exercises = useData(keys.exercises(), (s) => s.listExercises());
  const measuredOf = useMemo(() => {
    const m = new Map<string, MeasuredAs>();
    for (const e of exercises.data ?? []) m.set(e.id, e.measuredAs);
    return (id: string): MeasuredAs => m.get(id) ?? 'reps';
  }, [exercises.data]);

  const [title, setTitle] = useState(initial?.title ?? '');
  const [blocks, setBlocks] = useState<Block[]>(initial?.blocks ?? []);
  const [savedId, setSavedId] = useState(initial?.id);
  const snapshot = useRef(JSON.stringify({ title: initial?.title ?? '', blocks: initial?.blocks ?? [] }));
  const dirty = JSON.stringify({ title, blocks }) !== snapshot.current;

  const [titleError, setTitleError] = useState<string>();
  const [addingBlock, setAddingBlock] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ blockId: string; itemId: string } | null>(null);
  const [removing, setRemoving] = useState<Block | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const save = useAction((s, w: Parameters<typeof s.saveWorkout>[0]) => s.saveWorkout(w), { invalidate: [keys.templates] });

  const patchBlock = (id: string, patch: Partial<Block>) => setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const moveBlock = (i: number, by: number) =>
    setBlocks((bs) => {
      const next = [...bs];
      const [b] = next.splice(i, 1);
      if (b) next.splice(i + by, 0, b);
      return next;
    });
  const moveItem = (block: Block, i: number, by: number) => {
    const items = [...block.items];
    const [it] = items.splice(i, 1);
    if (it) items.splice(i + by, 0, it);
    patchBlock(block.id, { items });
  };

  const addBlock = (type: BlockType) => {
    const n = blocks.length + 1;
    setBlocks([...blocks, { id: newId('bl'), title: type === 'standard' ? t('builder.block.defaultTitle', { n }) : blockTypeLabel(type), settings: defaultSettings(type), items: [] }]);
    setAddingBlock(false);
  };

  const addExercises = (list: Exercise[]) => {
    const block = blocks.find((b) => b.id === addingTo);
    if (!block) return;
    const items: BlockItem[] = list.map((e) => ({ id: newId('it'), exerciseId: e.id, exerciseName: e.name, target: defaultTarget(block.settings.type, e.measuredAs) }));
    patchBlock(block.id, { items: [...block.items, ...items] });
  };

  const submit = async () => {
    if (!title.trim()) return setTitleError(t('builder.title.required'));
    setTitleError(undefined);
    if (!blocks.length) return toast.show(t('builder.blocks.required'), 'error');
    try {
      const saved = await save.run({ ...(savedId && { id: savedId }), title, blocks });
      snapshot.current = JSON.stringify({ title: saved.title, blocks: saved.blocks });
      setTitle(saved.title);
      setBlocks(saved.blocks);
      setSavedId(saved.id);
      toast.show(t('builder.saved', { title: saved.title }));
      if (!initial) navigate(`/coach/workouts/${saved.id}`, { replace: true });
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    }
  };

  const editingBlock = blocks.find((b) => b.id === editing?.blockId);
  const editingItem = editingBlock?.items.find((i) => i.id === editing?.itemId);

  return (
    <Page
      title={initial ? t('builder.edit') : t('builder.new')}
      back="/coach/workouts"
      onBack={() => (dirty ? setLeaving(true) : navigate('/coach/workouts'))}
      trailing={
        <Button size="sm" loading={save.isPending} disabled={!dirty && !!savedId} onClick={() => void submit()}>
          {t('builder.save')}
        </Button>
      }
    >
      <div className="app-stack builder">
        <TextField
          label={t('builder.title.label')}
          required
          placeholder={t('builder.title.placeholder')}
          value={title}
          error={titleError}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
        />

        {blocks.length === 0 && <EmptyState icon="list" title={t('builder.empty.title')} body={t('builder.empty.body')} />}

        {blocks.map((block, bi) => {
          const timer = block.settings.type !== 'standard';
          return (
            <section key={block.id} className="app-card builder-block" aria-label={block.title}>
              <div className="app-block-head">
                <TextField
                  label={t('builder.block.title')}
                  value={block.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => patchBlock(block.id, { title: e.target.value })}
                />
                <div className="app-row-actions">
                  <IconButton icon="arrow-up" label={t('builder.block.up', { title: block.title })} size={20} disabled={bi === 0} onClick={() => moveBlock(bi, -1)} />
                  <IconButton icon="arrow-down" label={t('builder.block.down', { title: block.title })} size={20} disabled={bi === blocks.length - 1} onClick={() => moveBlock(bi, 1)} />
                  <IconButton icon="trash" label={t('builder.block.remove', { title: block.title })} size={20} onClick={() => (block.items.length ? setRemoving(block) : setBlocks(blocks.filter((b) => b.id !== block.id)))} />
                </div>
              </div>
              <div className="app-block-meta">
                <span className="v-chip t-chip">{blockTypeLabel(block.settings.type)}</span>
                <span className="t-label v-muted">{settingsSummary(block.settings)}</span>
              </div>
              <BlockSettingsEditor value={block.settings} onChange={(settings) => patchBlock(block.id, { settings })} />

              {block.settings.type !== 'custom' && (
                <>
                  {block.items.length === 0 && <p className="t-body v-muted">{t('builder.items.empty')}</p>}
                  <ul className="app-list tight">
                    {block.items.map((it, i) => {
                      const measured = measuredOf(it.exerciseId);
                      return (
                        <li key={it.id}>
                          <ExerciseRow
                            variant="block"
                            drag={false}
                            name={it.exerciseName}
                            target={targetText(it.target, measured, timer) || t('builder.target.none')}
                            log={
                              <div className="app-row-actions">
                                {hasTargetFields(block.settings.type) && (
                                  <IconButton icon="edit" label={t('builder.item.edit', { name: it.exerciseName })} size={20} onClick={() => setEditing({ blockId: block.id, itemId: it.id })} />
                                )}
                                <IconButton icon="arrow-up" label={t('builder.item.up', { name: it.exerciseName })} size={20} disabled={i === 0} onClick={() => moveItem(block, i, -1)} />
                                <IconButton icon="arrow-down" label={t('builder.item.down', { name: it.exerciseName })} size={20} disabled={i === block.items.length - 1} onClick={() => moveItem(block, i, 1)} />
                                <IconButton icon="close" label={t('builder.item.remove', { name: it.exerciseName })} size={20} onClick={() => patchBlock(block.id, { items: block.items.filter((x) => x.id !== it.id) })} />
                              </div>
                            }
                          />
                        </li>
                      );
                    })}
                  </ul>
                  <Button size="md" variant="secondary" icon="plus" onClick={() => setAddingTo(block.id)}>
                    {t('builder.addExercise')}
                  </Button>
                </>
              )}
            </section>
          );
        })}

        <Button variant="secondary" size="md" icon="plus" onClick={() => setAddingBlock(true)}>
          {t('builder.addBlock')}
        </Button>
        {savedId && !dirty && (
          <Button size="md" icon="calendar" onClick={() => setAssignOpen(true)}>
            {t('builder.assign')}
          </Button>
        )}
      </div>

      <Sheet open={addingBlock} title={t('builder.addBlock')} onClose={() => setAddingBlock(false)}>
        <ul className="app-list">
          {BLOCK_TYPES.map((type) => (
            <li key={type}>
              <ListRow title={blockTypeLabel(type)} subtitle={t(`blockType.${type}.hint`)} chevron onClick={() => addBlock(type)} />
            </li>
          ))}
        </ul>
      </Sheet>
      <AddExerciseSheet open={addingTo !== null} onClose={() => setAddingTo(null)} onAdd={addExercises} />
      {editingBlock && editingItem && (
        <TargetSheet
          open
          name={editingItem.exerciseName}
          blockType={editingBlock.settings.type}
          measuredAs={measuredOf(editingItem.exerciseId)}
          target={editingItem.target}
          onClose={() => setEditing(null)}
          onSave={(target) => {
            patchBlock(editingBlock.id, { items: editingBlock.items.map((x) => (x.id === editingItem.id ? { ...x, target } : x)) });
            setEditing(null);
          }}
        />
      )}
      <ConfirmDialog
        open={removing !== null}
        destructive
        title={t('builder.block.remove.title', { title: removing?.title ?? '' })}
        body={t('builder.block.remove.body')}
        confirmLabel={t('common.remove')}
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          setBlocks(blocks.filter((b) => b.id !== removing?.id));
          setRemoving(null);
        }}
      />
      <ConfirmDialog
        open={leaving}
        destructive
        title={t('builder.discard.title')}
        body={t('builder.discard.body')}
        confirmLabel={t('builder.discard.confirm')}
        onCancel={() => setLeaving(false)}
        onConfirm={() => navigate('/coach/workouts')}
      />
      {savedId && <AssignSheet open={assignOpen} onClose={() => setAssignOpen(false)} workoutId={savedId} />}
    </Page>
  );
}
