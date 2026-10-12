import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMe } from '../../app/auth';
import { useToast } from '../../app/Toast';
import { CalendarView, monthRange } from '../../components/CalendarView';
import { DataBoundary } from '../../components/DataBoundary';
import { ConfirmDialog, Sheet } from '../../components/Sheet';
import { Page } from '../../components/Page';
import { RecoveryBlock } from '../../components/WearableBlocks';
import { Button, DateField, EmptyState, ListRow, PackageCard, PersonalRecord, StatusChip } from '../../design';
import { errorMessage, useAction, useData } from '../../hooks/data';
import { keys } from '../../hooks/keys';
import { formatDateLong, formatDateShort, formatDay, t } from '../../i18n';
import { addDays, startOfMonth, todayISO } from '../../lib/date';
import type { Assignment, ISODate, Package, Profile } from '../../types';
import { AssignSheet } from './AssignSheet';
import { PackageSheet } from './PackageSheet';

export function ClientScreen() {
  const { clientId = '' } = useParams();
  const navigate = useNavigate();
  const clients = useData(keys.clients, (s) => s.listClients());
  return (
    <DataBoundary query={clients} skeleton="detail">
      {(list) => {
        const client = list.find((c) => c.id === clientId);
        return client ? (
          <ClientView client={client} />
        ) : (
          <Page title={t('client.notFound.title')} back="/coach/clients">
            <EmptyState icon="users" title={t('client.notFound.title')} body={t('client.notFound.body')} action={t('client.notFound.action')} onAction={() => navigate('/coach/clients')} />
          </Page>
        );
      }}
    </DataBoundary>
  );
}

function ClientView({ client }: { client: Profile }) {
  const [assignOpen, setAssignOpen] = useState(false);
  return (
    <Page
      title={client.name}
      subtitle={client.email}
      back="/coach/clients"
      trailing={<Button size="sm" icon="plus" onClick={() => setAssignOpen(true)}>{t('client.assign')}</Button>}
    >
      <div className="app-cols">
        <div className="app-col main">
          <CalendarSection client={client} />
          <RecentLogs client={client} />
        </div>
        <div className="app-col side">
          <PackageSection client={client} />
          <RecordsSection client={client} />
          <RecoveryBlock clientId={client.id} />
        </div>
      </div>
      <AssignSheet open={assignOpen} onClose={() => setAssignOpen(false)} clientId={client.id} />
    </Page>
  );
}

function CalendarSection({ client }: { client: Profile }) {
  const navigate = useNavigate();
  const toast = useToast();
  const today = todayISO();
  const [month, setMonth] = useState(startOfMonth(today));
  const [selected, setSelected] = useState<ISODate>(today);
  const { from, to } = monthRange(month);
  const assignments = useData(keys.assignments(client.id, from, to), (s) => s.listAssignments({ clientId: client.id, from, to }));
  const [moving, setMoving] = useState<Assignment | null>(null);
  const [moveDate, setMoveDate] = useState<ISODate>(today);
  const [deleting, setDeleting] = useState<Assignment | null>(null);

  const move = useAction((s, a: { id: string; date: ISODate }) => s.updateAssignment(a.id, { date: a.date }), { invalidate: [keys.assignmentsAll] });
  const remove = useAction((s, id: string) => s.deleteAssignment(id), { invalidate: [keys.assignmentsAll] });
  const day = (assignments.data ?? []).filter((a) => a.date === selected);

  return (
    <section className="app-section" aria-label={t('client.calendar')}>
      <h2 className="t-eyebrow app-h2">{t('client.calendar')}</h2>
      <CalendarView
        month={month}
        selected={selected}
        assignments={assignments.data ?? []}
        onSelect={setSelected}
        onMonthChange={(m) => {
          setMonth(m);
          setSelected(m);
        }}
      />
      <h3 className="t-body-strong app-day-title">{formatDateLong(selected)}</h3>
      <DataBoundary query={assignments} rows={2} isEmpty={() => day.length === 0} empty={<p className="t-body v-muted">{t('client.day.empty')}</p>}>
        {() => (
          <ul className="app-list">
            {day.map((a) => (
              <li key={a.id} className="app-day-item">
                <ListRow
                  title={a.workout.title}
                  subtitle={a.workout.blocks.map((b) => b.title).join(' · ')}
                  trailing={<StatusChip kind="assignment" value={a.status} />}
                  chevron
                  onClick={() => navigate(`/coach/review/${a.id}`)}
                />
                {a.status === 'not_started' && (
                  <div className="app-day-actions">
                    <Button
                      size="sm"
                      variant="tertiary"
                      icon="calendar"
                      onClick={() => {
                        setMoveDate(a.date);
                        setMoving(a);
                      }}
                    >
                      {t('assignment.move.submit')}
                    </Button>
                    <Button size="sm" variant="tertiary" icon="trash" onClick={() => setDeleting(a)}>
                      {t('common.delete')}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </DataBoundary>

      <Sheet
        open={moving !== null}
        title={t('assignment.move.title')}
        onClose={() => setMoving(null)}
        footer={
          <Button
            fullWidth
            size="md"
            loading={move.isPending}
            onClick={() =>
              moving &&
              void move
                .run({ id: moving.id, date: moveDate })
                .then(() => {
                  toast.show(t('assignment.moved', { date: formatDateShort(moveDate) }));
                  setMoving(null);
                  setSelected(moveDate);
                  setMonth(startOfMonth(moveDate));
                })
                .catch((e: unknown) => toast.show(errorMessage(e), 'error'))
            }
          >
            {t('assignment.move.submit')}
          </Button>
        }
      >
        <DateField label={t('assignment.move.date')} value={moveDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMoveDate(e.target.value)} />
      </Sheet>
      <ConfirmDialog
        open={deleting !== null}
        destructive
        title={t('assignment.delete.title')}
        body={t('assignment.delete.body', { title: deleting?.workout.title ?? '', date: deleting ? formatDay(deleting.date) : '' })}
        confirmLabel={t('common.delete')}
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          void remove
            .run(deleting.id)
            .then(() => {
              toast.show(t('assignment.deleted'));
              setDeleting(null);
            })
            .catch((e: unknown) => toast.show(errorMessage(e), 'error'))
        }
      />
    </section>
  );
}

function RecentLogs({ client }: { client: Profile }) {
  const navigate = useNavigate();
  const today = todayISO();
  const from = addDays(today, -45);
  const recent = useData(keys.assignments(client.id, from, today), (s) => s.listAssignments({ clientId: client.id, from, to: today }));
  return (
    <section className="app-section" aria-label={t('client.logs')}>
      <h2 className="t-eyebrow app-h2">{t('client.logs')}</h2>
      <DataBoundary
        query={recent}
        rows={3}
        isEmpty={(d) => d.every((a) => a.status !== 'completed')}
        empty={{ icon: 'list', title: t('client.logs.empty.title'), body: t('client.logs.empty.body') }}
      >
        {(list) => (
          <ul className="app-list">
            {list
              .filter((a) => a.status === 'completed')
              .reverse()
              .slice(0, 5)
              .map((a) => (
                <li key={a.id}>
                  <ListRow
                    title={a.workout.title}
                    subtitle={formatDateShort(a.date)}
                    trailing={<StatusChip kind="assignment" value="completed" />}
                    chevron
                    onClick={() => navigate(`/coach/review/${a.id}`)}
                  />
                </li>
              ))}
          </ul>
        )}
      </DataBoundary>
    </section>
  );
}

function RecordsSection({ client }: { client: Profile }) {
  const records = useData(keys.records(client.id), (s) => s.listPersonalRecords(client.id));
  return (
    <section className="app-section" aria-label={t('client.records')}>
      <h2 className="t-eyebrow app-h2">{t('client.records')}</h2>
      <DataBoundary query={records} rows={2} empty={{ icon: 'trophy', title: t('records.empty.title'), body: t('records.empty.coach') }}>
        {(list) => (
          <ul className="app-list tight">
            {list.slice(0, 6).map((r) => (
              <li key={r.exerciseId}>
                <PersonalRecord exercise={r.exerciseName} label={r.label} date={formatDay(r.achievedOn)} />
              </li>
            ))}
          </ul>
        )}
      </DataBoundary>
    </section>
  );
}

function PackageSection({ client }: { client: Profile }) {
  const me = useMe();
  const toast = useToast();
  const packages = useData(keys.packages(client.id), (s) => s.listPackages(client.id));
  const [editing, setEditing] = useState<Package | 'new' | null>(null);
  const markUsed = useAction((s, p: Package) => s.savePackage({ ...p, sessionsUsed: p.sessionsUsed + 1 }), { invalidate: [keys.packages(client.id)] });

  return (
    <section className="app-section" aria-label={t('client.package')}>
      <div className="app-section-head">
        <h2 className="t-eyebrow app-h2">{t('client.package')}</h2>
        <Button size="sm" variant="secondary" icon="plus" onClick={() => setEditing('new')}>
          {t('package.new')}
        </Button>
      </div>
      <DataBoundary query={packages} skeleton="card" empty={<PackageCard state="none" />}>
        {(list) => {
          const current = list.find((p) => p.state !== 'expired') ?? list[0];
          if (!current) return <PackageCard state="none" />;
          return (
            <>
              <PackageCard
                name={current.name}
                used={current.sessionsUsed}
                total={current.sessionsIncluded}
                expires={t('package.expiresOn', { date: formatDay(current.expiresOn) })}
                paid={current.paymentReceived}
                state={current.state}
              />
              <div className="app-row-buttons">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={current.sessionsRemaining === 0}
                  loading={markUsed.isPending}
                  onClick={() =>
                    void markUsed
                      .run(current)
                      .then(() => toast.show(t('package.marked')))
                      .catch((e: unknown) => toast.show(errorMessage(e), 'error'))
                  }
                >
                  {t('package.markUsed')}
                </Button>
                <Button size="sm" variant="tertiary" icon="edit" onClick={() => setEditing(current)}>
                  {t('common.edit')}
                </Button>
              </div>
            </>
          );
        }}
      </DataBoundary>
      <PackageSheet open={editing !== null} onClose={() => setEditing(null)} clientId={client.id} workspaceId={me.workspaceId} pkg={editing && editing !== 'new' ? editing : undefined} />
    </section>
  );
}
