import { useParams } from 'react-router-dom';
import { Banner, Button, StatusChip } from '../../design';
import { useToast } from '../../app/Toast';
import { Comments } from '../../components/Comments';
import { DataBoundary } from '../../components/DataBoundary';
import { Page } from '../../components/Page';
import { WorkoutPlan } from '../../components/WorkoutPlan';
import { WorkoutResults } from '../../components/WorkoutResults';
import { WorkoutWearable } from '../../components/WearableBlocks';
import { errorMessage, useAction, useData } from '../../hooks/data';
import { keys } from '../../hooks/keys';
import { formatDateLong, t } from '../../i18n';
import type { Assignment } from '../../types';

export function ReviewScreen() {
  const { assignmentId = '' } = useParams();
  const assignment = useData(keys.assignment(assignmentId), (s) => s.getAssignment(assignmentId));
  return (
    <DataBoundary query={assignment} skeleton="detail">
      {(a) => <ReviewView assignment={a} />}
    </DataBoundary>
  );
}

function ReviewView({ assignment: a }: { assignment: Assignment }) {
  const toast = useToast();
  const clients = useData(keys.clients, (s) => s.listClients());
  const log = useData(keys.log(a.id), (s) => s.getLog(a.id), { enabled: a.status !== 'not_started' });
  const exercises = useData(keys.exercises(), (s) => s.listExercises());
  const packages = useData(keys.packages(a.clientId), (s) => s.listPackages(a.clientId), { enabled: a.status === 'completed' });
  const markUsed = useAction((s, p: NonNullable<typeof packages.data>[number]) => s.savePackage({ ...p, sessionsUsed: p.sessionsUsed + 1 }), { invalidate: [keys.packages(a.clientId)] });

  const client = clients.data?.find((c) => c.id === a.clientId);
  const current = packages.data?.find((p) => p.state !== 'expired');

  return (
    <Page
      title={a.workout.title}
      subtitle={`${client?.name ?? ''} · ${formatDateLong(a.date)}`}
      back={`/coach/clients/${a.clientId}`}
      trailing={<StatusChip kind="assignment" value={a.status} />}
    >
      <div className="app-cols">
        <div className="app-col main">
          {a.status === 'not_started' && (
            <>
              <Banner message={t("review.notStarted")} />
              <DataBoundary query={exercises} skeleton="card">{(list) => <WorkoutPlan assignment={a} exercises={list} />}</DataBoundary>
            </>
          )}
          {a.status === 'skipped' && <Banner message={t("review.skipped")} />}
          {a.status === 'in_progress' && <Banner title={t("review.inProgress.title")} message={t('review.inProgress.body')} />}
          {(a.status === 'completed' || a.status === 'in_progress') && (
            <DataBoundary query={log} skeleton="card">
              {(l) => (
                <>
                  <WorkoutWearable log={l} />
                  <WorkoutResults assignment={a} log={l} />
                </>
              )}
            </DataBoundary>
          )}
        </div>
        <div className="app-col side">
          {a.status === 'completed' && current && (
            <section className="app-section" aria-label={t('review.package')}>
              <h2 className="t-eyebrow app-h2">{t('review.package')}</h2>
              <p className="t-body v-muted">{t('review.package.body', { name: current.name, left: current.sessionsRemaining })}</p>
              <Button
                size="md"
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
            </section>
          )}
          <Comments assignmentId={a.id} viewer="coach" />
        </div>
      </div>
    </Page>
  );
}
