import { useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProgramBar } from '../../components/CoachOverview';
import { Avatar, Button, Chip, IconButton, StatusChip } from '../../design';
import { formatDateShort, t } from '../../i18n';
import { daysBetween, todayISO } from '../../lib/date';
import type { Assignment, ClientOverview, Profile } from '../../types';
import { AssignSheet } from './AssignSheet';

type Filter = 'all' | 'attention' | 'noProgram';
type SortKey = 'name' | 'program' | 'last';

const lastActive = (iso: string | null): string => {
  if (!iso) return t('clients.last.never');
  const n = daysBetween(iso, todayISO());
  return n <= 0 ? t('clients.last.today') : n === 1 ? t('clients.last.yesterday') : t('clients.last.days', { n });
};

function PackageCell({ o }: { o: ClientOverview | undefined }) {
  const p = o?.package;
  if (!p) return <span className="v-muted">{t('clients.pkg.none')}</span>;
  const flag = p.state === 'expired' ? t('clients.pkg.expired') : p.state === 'expiring' ? t('clients.pkg.expiring') : o?.needsRenewal ? t('clients.pkg.low') : null;
  return (
    <span className="app-pkg">
      <span>{t('clients.pkg.left', { left: p.sessionsRemaining, total: p.sessionsIncluded })}</span>
      {flag && <span className={`app-flag ${p.state === 'expired' ? 'bad' : 'warn'}`}>{flag}</span>}
    </span>
  );
}

interface Props {
  clients: Profile[];
  overview: Map<string, ClientOverview>;
  today: Map<string, Assignment>;
}

/** The coach's client table on desktop: search, filters, sortable columns and a details panel. */
export function ClientsDesktop({ clients, overview, today }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = clients.filter((c) => {
      const o = overview.get(c.id);
      if (q && !`${c.name} ${c.email}`.toLowerCase().includes(q)) return false;
      if (filter === 'attention') return !!o?.needsRenewal;
      if (filter === 'noProgram') return !o?.program;
      return true;
    });
    const value = (c: Profile): string | number => {
      const o = overview.get(c.id);
      return sort.key === 'name' ? c.name.toLowerCase() : sort.key === 'program' ? (o?.program?.percent ?? -1) : (o?.lastActiveOn ?? '');
    };
    return [...list].sort((a, b) => (value(a) < value(b) ? -1 : value(a) > value(b) ? 1 : 0) * sort.dir);
  }, [clients, overview, query, filter, sort]);

  const selected = clients.find((c) => c.id === selectedId) ?? null;
  const so = selected ? overview.get(selected.id) : undefined;
  const sa = selected ? today.get(selected.id) : undefined;

  const toggle = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  const th = (key: SortKey, label: string) => (
    <th aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="app-th" onClick={() => toggle(key)}>
        {label}
        {sort.key === key && <span aria-hidden="true">{sort.dir === 1 ? '↑' : '↓'}</span>}
      </button>
    </th>
  );

  const onKey = (e: KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedId(id);
    } else if (e.key === 'Escape') setSelectedId(null);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = e.key === 'ArrowDown' ? e.currentTarget.nextElementSibling : e.currentTarget.previousElementSibling;
      (next as HTMLElement | null)?.focus();
    }
  };

  return (
    <div className={selected ? 'app-split open' : 'app-split'}>
      <div className="app-split-main">
        <div className="app-toolbar">
          <input className="app-search" type="search" value={query} placeholder={t('clients.search')} aria-label={t('clients.search')} onChange={(e) => setQuery(e.target.value)} />
          <div className="app-filters">
            <Chip label={t('clients.filter.all')} selected={filter === 'all'} onClick={() => setFilter('all')} />
            <Chip label={t('clients.filter.attention')} selected={filter === 'attention'} onClick={() => setFilter('attention')} />
            <Chip label={t('clients.filter.noProgram')} selected={filter === 'noProgram'} onClick={() => setFilter('noProgram')} />
          </div>
        </div>
        <div className="app-table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                {th('name', t('clients.col.name'))}
                {th('program', t('clients.col.program'))}
                <th className="app-hide-open">{t('clients.col.today')}</th>
                {th('last', t('clients.col.last'))}
                <th className="app-hide-open">{t('clients.col.package')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const o = overview.get(c.id);
                const a = today.get(c.id);
                return (
                  <tr key={c.id} tabIndex={0} aria-selected={c.id === selectedId} className={c.id === selectedId ? 'on' : undefined} onClick={() => setSelectedId(c.id)} onDoubleClick={() => navigate(`/coach/clients/${c.id}`)} onKeyDown={(e) => onKey(e, c.id)}>
                    <td>
                      <span className="app-cell-person">
                        <Avatar name={c.name} size="sm" />
                        <span className="app-cell-stack">
                          <span className="t-body-strong">{c.name}</span>
                          <span className="t-caption v-muted">{c.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className="app-col-prog">
                      <ProgramBar progress={o?.program ?? null} />
                    </td>
                    <td className="app-hide-open">
                      {a ? (
                        <span className="app-cell-person">
                          <StatusChip kind="assignment" value={a.status} />
                          <span>{a.workout.title}</span>
                        </span>
                      ) : (
                        <span className="v-muted">{t('clients.today.none')}</span>
                      )}
                    </td>
                    <td>{lastActive(o?.lastActiveOn ?? null)}</td>
                    <td className="app-hide-open">
                      <PackageCell o={o} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="app-table-empty v-muted">{t('clients.none.match')}</p>}
        </div>
      </div>

      {selected && (
        <aside className="app-panel" aria-label={selected.name}>
          <div className="app-panel-head">
            <Avatar name={selected.name} size="lg" />
            <div className="app-panel-id">
              <h2 className="t-heading">{selected.name}</h2>
              <span className="t-caption v-muted">{selected.email}</span>
            </div>
            <IconButton icon="close" label={t('clients.panel.close')} variant="ghost" onClick={() => setSelectedId(null)} />
          </div>

          <section className="app-panel-sec">
            <h3 className="t-eyebrow">{t('clients.panel.program')}</h3>
            <ProgramBar progress={so?.program ?? null} />
            {so?.program && <span className="t-caption v-muted">{t('clients.panel.sessions', { done: so.program.sessionsDone, total: so.program.sessionsTotal })}</span>}
          </section>
          <section className="app-panel-sec">
            <h3 className="t-eyebrow">{t('clients.panel.today')}</h3>
            {sa ? (
              <span className="app-cell-person">
                <StatusChip kind="assignment" value={sa.status} />
                <span>{sa.workout.title}</span>
              </span>
            ) : (
              <span className="v-muted">{t('clients.today.none')}</span>
            )}
          </section>
          <section className="app-panel-sec">
            <h3 className="t-eyebrow">{t('clients.panel.package')}</h3>
            <PackageCell o={so} />
            {so?.package && <span className="t-caption v-muted">{t('package.expiresOn', { date: formatDateShort(so.package.expiresOn) })}</span>}
          </section>
          <section className="app-panel-sec">
            <h3 className="t-eyebrow">{t('clients.col.last')}</h3>
            <span>{lastActive(so?.lastActiveOn ?? null)}</span>
          </section>

          <div className="app-panel-actions">
            <Button size="md" fullWidth onClick={() => navigate(`/coach/clients/${selected.id}`)}>
              {t('clients.panel.open')}
            </Button>
            <Button size="md" variant="secondary" fullWidth icon="plus" onClick={() => setAssigning(true)}>
              {t('client.assign')}
            </Button>
          </div>
          <AssignSheet open={assigning} onClose={() => setAssigning(false)} clientId={selected.id} />
        </aside>
      )}
    </div>
  );
}
