import { useNavigate } from 'react-router-dom';
import { DataBoundary } from '../../components/DataBoundary';
import { Page } from '../../components/Page';
import { Avatar, DataTable, ListRow, StatusChip } from '../../design';
import { useData } from '../../hooks/data';
import { useIsDesktop } from '../../hooks/media';
import { keys } from '../../hooks/keys';
import { t } from '../../i18n';
import { todayISO } from '../../lib/date';
import type { Assignment, Profile } from '../../types';

export function ClientsScreen() {
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const today = todayISO();
  const clients = useData(keys.clients, (s) => s.listClients());
  const todays = useData(keys.assignments(undefined, today, today), (s) => s.listAssignments({ from: today, to: today }));
  const byClient = new Map<string, Assignment>();
  for (const a of todays.data ?? []) byClient.set(a.clientId, a);
  const open = (c: Profile) => navigate(`/coach/clients/${c.id}`);

  return (
    <Page title={t('clients.title')} subtitle={t('clients.subtitle')}>
      <DataBoundary query={clients} empty={{ icon: 'users', title: t('clients.empty.title'), body: t('clients.empty.body') }}>
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
                { key: 'email', label: t('clients.col.email') },
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
                    <ListRow
                      title={c.name}
                      subtitle={todays.isPending ? '…' : a ? a.workout.title : t('clients.today.none')}
                      leading={<Avatar name={c.name} size="md" />}
                      trailing={a ? <StatusChip kind="assignment" value={a.status} /> : undefined}
                      chevron
                      onClick={() => open(c)}
                    />
                  </li>
                );
              })}
            </ul>
          )
        }
      </DataBoundary>
    </Page>
  );
}
