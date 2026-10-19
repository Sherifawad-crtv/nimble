import { useEffect, useMemo, useState } from 'react';
import { DataBoundary } from '../../components/DataBoundary';
import { Page } from '../../components/Page';
import { Sheet } from '../../components/Sheet';
import { Thumb } from '../../components/VideoEmbed';
import { Banner, Button, Chip, IconButton, ListRow, SearchField, StatusChip } from '../../design';
import { useData } from '../../hooks/data';
import { useIsDesktop } from '../../hooks/media';
import { keys } from '../../hooks/keys';
import { t, tp } from '../../i18n';
import { measuredLabel } from '../../lib/workout';
import type { Exercise } from '../../types';
import { ExerciseForm } from './ExerciseForm';
import { LibraryDesktop } from './LibraryDesktop';

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function LibraryScreen() {
  const desktop = useIsDesktop();
  const [search, setSearch] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null);
  const debounced = useDebounced(search, 200);
  const filtered = tags.length > 0 || equipment.length > 0 || debounced.trim() !== '';

  const everything = useData(keys.exercises(), (s) => s.listExercises());
  const results = useData(keys.exercises({ search: debounced, tags, equipment }), (s) => s.listExercises({ search: debounced, tags, equipment }));
  const tagOptions = useMemo(() => [...new Set((everything.data ?? []).flatMap((e) => e.tags))].sort(), [everything.data]);
  const equipmentOptions = useMemo(() => [...new Set((everything.data ?? []).flatMap((e) => e.equipment))].sort(), [everything.data]);
  const broken = (everything.data ?? []).filter((e) => e.linkStatus === 'unavailable').length;

  return (
    <Page
      title={t('library.title')}
      subtitle={everything.data ? tp('library.count', everything.data.length) : t('library.subtitle')}
      trailing={desktop ? <Button icon="plus" size="md" onClick={() => setEditing('new')}>{t('library.add')}</Button> : <IconButton icon="plus" label={t('library.add')} onClick={() => setEditing('new')} />}
    >
      <div className="app-stack">
        {broken > 0 && <Banner kind="video" title={tp('library.broken.title', broken)} message={t('library.broken.body')} />}
        <SearchField placeholder={t('library.search')} value={search} onChange={setSearch} />
        {tagOptions.length > 0 && (
          <div className="app-filters scroll" role="group" aria-label={t('library.filter.tags')}>
            {tagOptions.map((tag) => (
              <Chip key={tag} label={tag} selected={tags.includes(tag)} onClick={() => setTags(toggle(tags, tag))} />
            ))}
            {equipmentOptions.map((eq) => (
              <Chip key={eq} label={eq} selected={equipment.includes(eq)} onClick={() => setEquipment(toggle(equipment, eq))} />
            ))}
          </div>
        )}
        <DataBoundary
          query={results}
          empty={
            filtered
              ? { icon: 'search', title: t('library.empty.filtered.title'), body: t('library.empty.filtered.body'), action: t('library.clearFilters'), onAction: () => { setSearch(''); setTags([]); setEquipment([]); } }
              : { icon: 'book', title: t('library.empty.title'), body: t('library.empty.body'), action: t('library.add'), onAction: () => setEditing('new') }
          }
        >
          {(list) =>
            desktop ? (
              <LibraryDesktop list={list} onEdit={setEditing} />
            ) : (
              <ul className="app-list">
                {list.map((e) => (
                  <li key={e.id}>
                    <ListRow
                      title={e.name}
                      subtitle={[...e.tags, measuredLabel(e.measuredAs)].join(' · ')}
                      leading={<Thumb url={e.thumbnailUrl} status={e.linkStatus} />}
                      trailing={e.linkStatus === 'unavailable' ? <StatusChip kind="link" value="unavailable" /> : undefined}
                      chevron
                      onClick={() => setEditing(e)}
                    />
                  </li>
                ))}
              </ul>
            )
          }
        </DataBoundary>
      </div>
      <Sheet open={editing !== null} title={editing && editing !== 'new' ? t('library.edit') : t('library.add')} onClose={() => setEditing(null)}>
        {editing !== null && (
          <ExerciseForm
            key={editing === 'new' ? 'new' : editing.id}
            exercise={editing === 'new' ? undefined : editing}
            onSaved={() => setEditing(null)}
            onDeleted={() => setEditing(null)}
          />
        )}
      </Sheet>
    </Page>
  );
}
