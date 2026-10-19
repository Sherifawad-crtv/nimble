import { useState } from 'react';
import { VideoEmbed, Thumb } from '../../components/VideoEmbed';
import { Button, Chip, IconButton, StatusChip } from '../../design';
import { t } from '../../i18n';
import { measuredLabel } from '../../lib/workout';
import type { Exercise } from '../../types';

/** The exercise library on desktop: a table beside a preview with the video. */
export function LibraryDesktop({ list, onEdit }: { list: Exercise[]; onEdit: (e: Exercise) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = list.find((e) => e.id === selectedId) ?? null;

  return (
    <div className={selected ? 'app-split open' : 'app-split'}>
      <div className="app-table-wrap">
        <table className="app-table">
          <thead>
            <tr>
              <th>{t('library.col.name')}</th>
              <th className="app-hide-open">{t('library.col.tags')}</th>
              <th className="app-hide-open">{t('library.col.equipment')}</th>
              <th>{t('library.col.measured')}</th>
              <th>{t('library.col.link')}</th>
            </tr>
          </thead>
          <tbody
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSelectedId(null);
            }}
          >
            {list.map((r) => (
              <tr
                key={r.id}
                tabIndex={0}
                aria-selected={r.id === selectedId}
                className={r.id === selectedId ? 'on' : undefined}
                onClick={() => setSelectedId(r.id)}
                onDoubleClick={() => onEdit(r)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedId(r.id);
                  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    ((e.key === 'ArrowDown' ? e.currentTarget.nextElementSibling : e.currentTarget.previousElementSibling) as HTMLElement | null)?.focus();
                  }
                }}
              >
                <td>
                  <span className="app-cell-person">
                    <Thumb url={r.thumbnailUrl} status={r.linkStatus} />
                    <span className="t-body-strong">{r.name}</span>
                  </span>
                </td>
                <td className="app-hide-open">{r.tags.join(' · ')}</td>
                <td className="app-hide-open">{r.equipment.join(' · ')}</td>
                <td>{measuredLabel(r.measuredAs)}</td>
                <td>{r.videoUrl ? <StatusChip kind="link" value={r.linkStatus} /> : <span className="v-muted">{t('library.noVideo')}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <aside className="app-panel" aria-label={selected.name}>
          <div className="app-panel-head">
            <div className="app-panel-id">
              <h2 className="t-heading">{selected.name}</h2>
              <span className="t-caption v-muted">{measuredLabel(selected.measuredAs)}</span>
            </div>
            <IconButton icon="close" label={t('library.panel.close')} variant="ghost" onClick={() => setSelectedId(null)} />
          </div>
          {selected.videoUrl ? <VideoEmbed key={selected.id} exercise={selected} hideCues /> : <p className="v-muted">{t('library.noVideo')}</p>}
          {(selected.tags.length > 0 || selected.equipment.length > 0) && (
            <div className="app-filters wrap">
              {[...selected.tags, ...selected.equipment].map((x) => (
                <Chip key={x} label={x} />
              ))}
            </div>
          )}
          {selected.cues && (
            <section className="app-panel-sec">
              <h3 className="t-eyebrow">{t('library.cues')}</h3>
              <p className="app-panel-text">{selected.cues}</p>
            </section>
          )}
          <div className="app-panel-actions">
            <Button size="md" variant="secondary" icon="edit" fullWidth onClick={() => onEdit(selected)}>
              {t('library.edit')}
            </Button>
          </div>
        </aside>
      )}
    </div>
  );
}
