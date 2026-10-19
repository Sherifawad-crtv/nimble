import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../design';
import { useData } from '../hooks/data';
import { keys } from '../hooks/keys';
import { t } from '../i18n';
import { overlayRoot } from '../lib/viewport';
import { sessionService } from '../services';

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: string;
  run: () => void;
}

const PER_GROUP = 6;

/** A quick jump to any page, client, workout, program or exercise. Opened from the sidebar or with ⌘K / Ctrl+K. */
export function CommandPalette({ onClose, onAssistant }: { onClose: () => void; onAssistant: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const clients = useData(keys.clients, (s) => s.listClients());
  const templates = useData(keys.templates, (s) => s.listTemplates());
  const programs = useData(keys.programs, (s) => s.listPrograms());
  const exercises = useData(keys.exercises(), (s) => s.listExercises());

  useEffect(() => input.current?.focus(), []);

  const go = (path: string) => () => {
    onClose();
    navigate(path);
  };

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (s: string) => !q || s.toLowerCase().includes(q);
    const pages: Item[] = [
      { id: 'p-clients', group: t('cmd.group.pages'), label: t('nav.clients'), icon: 'users', run: go('/coach/clients') },
      { id: 'p-library', group: t('cmd.group.pages'), label: t('nav.library'), icon: 'book', run: go('/coach/library') },
      { id: 'p-workouts', group: t('cmd.group.pages'), label: t('nav.workouts'), icon: 'dumbbell', run: go('/coach/workouts') },
      { id: 'p-settings', group: t('cmd.group.pages'), label: t('nav.settings'), icon: 'gear', run: go('/coach/settings') },
      ...(sessionService.kind === 'account' ? [{ id: 'p-assistant', group: t('cmd.group.pages'), label: t('cmd.assistant'), icon: 'sparkle', run: () => { onClose(); onAssistant(); } }] : []),
    ].filter((i) => match(i.label));
    const take = <T,>(list: T[] | undefined, text: (x: T) => string) => (list ?? []).filter((x) => match(text(x))).slice(0, PER_GROUP);
    return [
      ...pages,
      ...take(clients.data, (c) => `${c.name} ${c.email}`).map((c): Item => ({ id: `c-${c.id}`, group: t('cmd.group.clients'), label: c.name, hint: c.email, icon: 'user', run: go(`/coach/clients/${c.id}`) })),
      ...take(templates.data, (w) => w.title).map((w): Item => ({ id: `w-${w.id}`, group: t('cmd.group.workouts'), label: w.title, icon: 'dumbbell', run: go(`/coach/workouts/${w.id}`) })),
      ...take(programs.data, (p) => p.title).map((p): Item => ({ id: `g-${p.id}`, group: t('cmd.group.programs'), label: p.title, icon: 'list', run: go(`/coach/programs/${p.id}`) })),
      ...take(exercises.data, (x) => x.name).map((x): Item => ({ id: `x-${x.id}`, group: t('cmd.group.exercises'), label: x.name, icon: 'run', run: go('/coach/library') })),
    ];
  }, [query, clients.data, templates.data, programs.data, exercises.data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setActive(0), [query]);
  useEffect(() => document.getElementById(`cmd-${active}`)?.scrollIntoView({ block: 'nearest' }), [active]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      items[active]?.run();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  let last = '';
  return createPortal(
    <div className="cmd-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cmd" role="dialog" aria-modal="true" aria-label={t('cmd.open')} onKeyDown={onKey}>
        <div className="cmd-field">
          <Icon name="search" size={20} />
          <input ref={input} value={query} placeholder={t('cmd.placeholder')} aria-label={t('cmd.placeholder')} role="combobox" aria-expanded="true" aria-controls="cmd-list" aria-activedescendant={`cmd-${active}`} onChange={(e) => setQuery(e.target.value)} />
          <kbd>esc</kbd>
        </div>
        <ul className="cmd-list" id="cmd-list" role="listbox">
          {items.length === 0 && <li className="cmd-none v-muted">{t('cmd.none')}</li>}
          {items.map((it, i) => {
            const header = it.group !== last ? it.group : null;
            last = it.group;
            return (
              <li key={it.id} role="presentation">
                {header && <div className="cmd-group">{header}</div>}
                <button type="button" id={`cmd-${i}`} role="option" aria-selected={i === active} className={i === active ? 'cmd-item on' : 'cmd-item'} onMouseMove={() => setActive(i)} onClick={it.run}>
                  <Icon name={it.icon} size={20} />
                  <span className="cmd-label">{it.label}</span>
                  {it.hint && <span className="cmd-hint v-muted">{it.hint}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    overlayRoot(),
  );
}
