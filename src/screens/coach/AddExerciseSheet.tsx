import { useState } from 'react';
import { DataBoundary } from '../../components/DataBoundary';
import { Sheet } from '../../components/Sheet';
import { Button, ExerciseRow, SearchField } from '../../design';
import { useData } from '../../hooks/data';
import { keys } from '../../hooks/keys';
import { t, tp } from '../../i18n';
import type { Exercise } from '../../types';
import { ExerciseForm } from './ExerciseForm';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Receives the chosen library exercises, or the one just created. */
  onAdd: (exercises: Exercise[]) => void;
}

/**
 * Pick from the library, or create a new exercise without leaving the builder.
 * Free-text one-off exercises are not possible: everything comes from the library.
 */
export function AddExerciseSheet({ open, onClose, onAdd }: Props) {
  const [creating, setCreating] = useState(false);
  const close = () => {
    setCreating(false);
    onClose();
  };
  return (
    <Sheet open={open} title={t(creating ? 'addExercise.createTitle' : 'addExercise.title')} onClose={close}>
      {creating ? (
        <>
          <button type="button" className="app-textbtn t-body-strong app-back-link" onClick={() => setCreating(false)}>
            {t('addExercise.backToLibrary')}
          </button>
          <ExerciseForm
            submitLabel={t('addExercise.createAndAdd')}
            onSaved={(ex) => {
              onAdd([ex]);
              close();
            }}
          />
        </>
      ) : (
        <PickList onCreate={() => setCreating(true)} onAdd={(list) => { onAdd(list); close(); }} />
      )}
    </Sheet>
  );
}

function PickList({ onCreate, onAdd }: { onCreate: () => void; onAdd: (list: Exercise[]) => void }) {
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Exercise[]>([]);
  const results = useData(keys.exercises({ search }), (s) => s.listExercises({ search }));
  const toggle = (e: Exercise) => setPicked(picked.some((p) => p.id === e.id) ? picked.filter((p) => p.id !== e.id) : [...picked, e]);

  return (
    <div className="app-stack">
      <SearchField placeholder={t('addExercise.search')} value={search} onChange={setSearch} />
      <Button variant="secondary" size="md" icon="plus" fullWidth onClick={onCreate}>
        {t('addExercise.create')}
      </Button>
      <DataBoundary
        query={results}
        empty={{ icon: 'search', title: t('addExercise.empty.title'), body: t('addExercise.empty.body'), action: t('addExercise.create'), onAction: onCreate }}
      >
        {(list) => (
          <ul className="app-list tight">
            {list.map((e) => {
              const on = picked.some((p) => p.id === e.id);
              return (
                <li key={e.id}>
                  <button type="button" className="app-pick" aria-pressed={on} onClick={() => toggle(e)}>
                    <ExerciseRow variant="add" name={e.name} tags={e.tags} measuredAs={e.measuredAs} link={e.linkStatus} selected={on} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DataBoundary>
      {picked.length > 0 && (
        <div className="app-sticky-action">
          <Button fullWidth size="md" onClick={() => onAdd(picked)}>
            {tp('addExercise.add', picked.length)}
          </Button>
        </div>
      )}
    </div>
  );
}
