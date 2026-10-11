import { useEffect, useRef, useState } from 'react';
import { Banner, Button, Segmented, TextField } from '../../design';
import { TagPicker } from '../../components/TagPicker';
import { Thumb } from '../../components/VideoEmbed';
import { ConfirmDialog } from '../../components/Sheet';
import { useToast } from '../../app/Toast';
import { errorMessage, useAction } from '../../hooks/data';
import { keys } from '../../hooks/keys';
import { t } from '../../i18n';
import { MEASURED_AS, measuredLabel } from '../../lib/workout';
import { ServiceError } from '../../services';
import type { Exercise, ExerciseInput, LinkPreview, MeasuredAs } from '../../types';

export const MOVEMENT_TAGS = ['push', 'pull', 'legs', 'core', 'full body'];
export const EQUIPMENT_TAGS = ['bodyweight', 'barbell', 'dumbbell', 'kettlebell', 'bands', 'machine', 'other'];

type LinkState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'ok'; preview: LinkPreview }
  | { kind: 'blocked'; preview: LinkPreview }
  | { kind: 'error'; message: string };

interface Props {
  /** Present when editing; absent when creating. */
  exercise?: Exercise;
  /** Called with the saved exercise (created or updated). */
  onSaved: (exercise: Exercise) => void;
  /** Called after a delete. Only shown when editing. */
  onDeleted?: () => void;
  submitLabel?: string;
}

/** Create or edit a library exercise. Used by the library screen and inside the workout builder. */
export function ExerciseForm({ exercise, onSaved, onDeleted, submitLabel }: Props) {
  const toast = useToast();
  const [url, setUrl] = useState(exercise?.videoUrl ?? '');
  const [name, setName] = useState(exercise?.name ?? '');
  const [measuredAs, setMeasuredAs] = useState<MeasuredAs>(exercise?.measuredAs ?? 'reps');
  const [tags, setTags] = useState(exercise?.tags ?? []);
  const [equipment, setEquipment] = useState(exercise?.equipment ?? []);
  const [cues, setCues] = useState(exercise?.cues ?? '');
  const [link, setLink] = useState<LinkState>({ kind: 'idle' });
  const [nameError, setNameError] = useState<string | undefined>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const checked = useRef(exercise?.videoUrl ?? '');
  const nameTouched = useRef(!!exercise);

  const preview = useAction((s, u: string) => s.previewVideoLink(u));
  const create = useAction((s, input: ExerciseInput) => s.createExercise(input), { invalidate: [keys.exercisesAll] });
  const update = useAction((s, a: { id: string; patch: Partial<Exercise> }) => s.updateExercise(a.id, a.patch), {
    invalidate: [keys.exercisesAll],
  });
  const remove = useAction((s, id: string) => s.deleteExercise(id), { invalidate: [keys.exercisesAll] });

  const checkLink = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === checked.current) return;
    checked.current = trimmed;
    setLink({ kind: 'checking' });
    try {
      const p = await preview.run(trimmed);
      setLink(p.embeddable ? { kind: 'ok', preview: p } : { kind: 'blocked', preview: p });
      if (!nameTouched.current && !name.trim()) setName(p.title);
    } catch (e) {
      setLink({ kind: 'error', message: errorMessage(e) });
    }
  };

  useEffect(() => {
    if (exercise?.videoUrl && exercise.linkStatus === 'unavailable') {
      setLink({ kind: 'error', message: t('exercise.link.unavailable') });
    }
  }, [exercise]);

  const busy = create.isPending || update.isPending;

  const submit = async () => {
    if (!name.trim()) {
      setNameError(t('exercise.name.required'));
      return;
    }
    setNameError(undefined);
    const videoUrl = url.trim();
    try {
      const saved = exercise
        ? await update.run({
            id: exercise.id,
            patch: { name, measuredAs, tags, equipment, cues: cues.trim() || undefined, videoUrl: videoUrl || undefined },
          })
        : await create.run({ name, measuredAs, tags, equipment, ...(cues.trim() && { cues }), ...(videoUrl && { videoUrl }) });
      toast.show(t(exercise ? 'exercise.saved' : 'exercise.created', { name: saved.name }));
      onSaved(saved);
    } catch (e) {
      if (e instanceof ServiceError && e.code === 'invalid_link') setLink({ kind: 'error', message: e.message });
      else toast.show(errorMessage(e), 'error');
    }
  };

  return (
    <form
      className="app-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div
        onPaste={(e) => void checkLink(e.clipboardData.getData('text'))}
        onBlur={() => void checkLink(url)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void checkLink(url);
          }
        }}
      >
        <TextField
          label={t('exercise.link.label')}
          placeholder={t('exercise.link.placeholder')}
          icon="link"
          type="url"
          value={url}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setUrl(e.target.value);
            if (link.kind !== 'idle') setLink({ kind: 'idle' });
            checked.current = '';
          }}
          {...(link.kind === 'error' && { error: link.message })}
          {...(link.kind === 'ok' && { success: t('exercise.link.ok') })}
          hint={link.kind === 'checking' ? t('exercise.link.checking') : link.kind === 'idle' ? t('exercise.link.hint') : undefined}
        />
      </div>
      {(link.kind === 'ok' || link.kind === 'blocked') && (
        <div className="app-link-preview">
          <Thumb url={link.preview.thumbnailUrl} />
          <div>
            <div className="t-body-strong">{link.preview.title}</div>
            <div className="t-caption v-muted">{link.preview.provider === 'youtube' ? 'YouTube' : 'Vimeo'}</div>
          </div>
        </div>
      )}
      {link.kind === 'blocked' && <Banner kind="video" message={t('exercise.link.blocked')} />}
      {link.kind === 'error' && url.trim() && <p className="t-label v-muted">{t('exercise.link.saveWithout')}</p>}

      <TextField
        label={t('exercise.name.label')}
        required
        value={name}
        error={nameError}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          nameTouched.current = true;
          setName(e.target.value);
        }}
      />
      <div className="v-field">
        <span className="v-label t-label" id="measured-label">
          {t('exercise.measuredAs')}
        </span>
        <div className="app-seg-scroll" aria-labelledby="measured-label">
          <Segmented options={MEASURED_AS.map((m) => ({ id: m, label: measuredLabel(m) }))} value={measuredAs} onChange={(id) => setMeasuredAs(id as MeasuredAs)} />
        </div>
      </div>
      <TagPicker label={t('exercise.tags')} value={tags} options={MOVEMENT_TAGS} onChange={setTags} custom />
      <TagPicker label={t('exercise.equipment')} value={equipment} options={EQUIPMENT_TAGS} onChange={setEquipment} custom />
      <TextField
        label={t('exercise.cues.label')}
        placeholder={t('exercise.cues.placeholder')}
        multiline
        value={cues}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCues(e.target.value)}
      />
      <div className="app-form-actions">
        <Button fullWidth loading={busy} onClick={() => void submit()} size="md">
          {submitLabel ?? t(exercise ? 'common.save' : 'exercise.create.save')}
        </Button>
        {exercise && onDeleted && (
          <Button fullWidth variant="tertiary" size="md" icon="trash" onClick={() => setConfirmDelete(true)}>
            {t('exercise.delete')}
          </Button>
        )}
      </div>
      {exercise && onDeleted && (
        <ConfirmDialog
          open={confirmDelete}
          destructive
          title={t('exercise.delete.title', { name: exercise.name })}
          body={t('exercise.delete.body')}
          confirmLabel={t('exercise.delete')}
          busy={remove.isPending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() =>
            void remove
              .run(exercise.id)
              .then(() => {
                setConfirmDelete(false);
                toast.show(t('exercise.deleted', { name: exercise.name }));
                onDeleted();
              })
              .catch((e: unknown) => toast.show(errorMessage(e), 'error'))
          }
        />
      )}
    </form>
  );
}
