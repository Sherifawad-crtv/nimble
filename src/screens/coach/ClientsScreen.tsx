import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataBoundary } from '../../components/DataBoundary';
import { CoachStats, ProgramBar } from '../../components/CoachOverview';
import { Page } from '../../components/Page';
import { Avatar, DataTable, IconButton, Skeleton, StatusChip } from '../../design';
import { useData } from '../../hooks/data';
import { useIsDesktop } from '../../hooks/media';
import { keys } from '../../hooks/keys';
import { t } from '../../i18n';
import { todayISO } from '../../lib/date';
import type { Assignment, Profile } from '../../types';
import { InviteSheet } from './InviteSheet';

export function ClientsScreen() {
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const today = todayISO();
  const clients = useData(keys.clients, (s) => s.listClients());
  const overview = useData(keys.overview, (s) => s.getCoachOverview());
  const progress = new Map((overview.data?.perClient ?? []).map((c) => [c.clientId, c.program]));
  const todays = useData(keys.assignments(undefined, today, today), (s) => s.listAssignments({ from: today, to: today }));
  const byClient = new Map<string, Assignment>();
  for (const a of todays.data ?? []) byClient.set(a.clientId, a);
  const open = (c: Profile) => navigate(`/coach/clients/${c.id}`);
  const [inviting, setInviting] = useState(false);

  return (
    <Page
      title={t('clients.title')}
      subtitle={t('clients.subtitle')}
      trailing={<IconButton icon="plus" label={t('clients.invite')} onClick={() => setInviting(true)} />}
    >
      {overview.isPending ? <Skeleton variant="card" /> : overview.data && overview.data.clients > 0 && <CoachStats overview={overview.data} />}
      <DataBoundary
        query={clients}
        empty={{ icon: 'users', title: t('clients.empty.title'), body: t('clients.empty.body'), action: t('clients.invite'), onAction: () => setInviting(true) }}
      >
        {(list) =>
          desktop ? (
            <DataTable
              loading={todays.isPending}
              columns={[
                {
                  key: 'name',
                  label: t('clients.col.name'),
                  render: (r: Profile) => (
                    <span className="app-cell-person">
                      <Avatar name={r.name} size="sm" />
                      <span className="t-body-strong">{r.name}</span>
                    </span>
                  ),
                },
                {
                  key: 'program',
                  label: t('clients.col.program'),
                  render: (r: Profile) => <ProgramBar progress={progress.get(r.id) ?? null} />,
                },
                {
                  key: 'today',
                  label: t('clients.col.today'),
                  render: (r: Profile) => {
                    const a = byClient.get(r.id);
                    return a ? (
                      <span className="app-cell-person">
                        <StatusChip kind="assignment" value={a.status} />
                        <span>{a.workout.title}</span>
                      </span>
                    ) : (
                      <span className="v-muted">{t('clients.today.none')}</span>
                    );
                  },
                },
              ]}
              rows={list}
              onRowClick={(id: string) => navigate(`/coach/clients/${id}`)}
              emptyText={t('clients.empty.title')}
            />
          ) : (
            <ul className="app-list">
              {list.map((c) => {
                const a = byClient.get(c.id);
                return (
                  <li key={c.id}>
                    <button type="button" className="app-client" onClick={() => open(c)}>
                      <Avatar name={c.name} size="md" />
                      <span className="app-client-body">
                        <span className="app-client-top">
                          <span className="t-body-strong app-client-name">{c.name}</span>
                          {a && <StatusChip kind="assignment" value={a.status} />}
                        </span>
                        <span className="t-caption v-muted">{todays.isPending ? '…' : a ? a.workout.title : t('clients.today.none')}</span>
                        {overview.data && <ProgramBar progress={progress.get(c.id) ?? null} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )
        }
      </DataBoundary>
      <InviteSheet open={inviting} onClose={() => setInviting(false)} />
    </Page>
  );
}
