import { CommentThread, Skeleton } from '../design';
import { useToast } from '../app/Toast';
import { errorMessage, useAction, useData } from '../hooks/data';
import { keys } from '../hooks/keys';
import { formatTimeAgo, t } from '../i18n';
import type { Id, Role } from '../types';
import { DataBoundary } from './DataBoundary';

/** Workout comments, for both coach and client. */
export function Comments({ assignmentId, viewer }: { assignmentId: Id; viewer: Role }) {
  const toast = useToast();
  const comments = useData(keys.comments(assignmentId), (s) => s.listComments(assignmentId));
  const add = useAction((s, body: string) => s.addComment(assignmentId, body), { invalidate: [keys.comments(assignmentId)] });

  return (
    <section className="app-section" aria-label={t('comments.title')}>
      <h2 className="t-eyebrow app-h2">{t('comments.title')}</h2>
      {comments.isPending ? (
        <Skeleton variant="list" rows={2} />
      ) : (
        <DataBoundary query={comments} inline>
          {(list) => (
            <CommentThread
              viewer={viewer}
              sending={add.isPending}
              comments={list.map((c) => ({ author: c.authorName, role: c.authorRole, time: formatTimeAgo(c.createdAt), text: c.body }))}
              onSend={(text) => {
                if (!text.trim()) return;
                void add.run(text).catch((e: unknown) => toast.show(errorMessage(e), 'error'));
              }}
            />
          )}
        </DataBoundary>
      )}
    </section>
  );
}
