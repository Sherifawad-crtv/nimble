import { Sheet } from '../../components/Sheet';
import { useToast } from '../../app/Toast';
import { DataBoundary } from '../../components/DataBoundary';
import { Button, IconButton, ListRow } from '../../design';
import { errorMessage, useAction, useData } from '../../hooks/data';
import { keys } from '../../hooks/keys';
import { formatTimeAgo, t } from '../../i18n';
import type { Invite } from '../../types';

/** The link a client opens to sign up with the code already filled in. */
export const inviteLink = (code: string) => `${window.location.origin}/?invite=${encodeURIComponent(code)}`;

/** Invite codes for the workspace: create, share, revoke. */
export function InviteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const invites = useData(keys.invites, (s) => s.listInvites(), { enabled: open });
  const create = useAction((s, _: void) => s.createInvite(), { invalidate: [keys.invites] });
  const revoke = useAction((s, code: string) => s.revokeInvite(code), { invalidate: [keys.invites] });

  const share = async (invite: Invite) => {
    const link = inviteLink(invite.code);
    const text = t('invites.shareText', { code: invite.code, link });
    try {
      if (navigator.share) {
        await navigator.share({ title: t('invites.title'), text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.show(t('invites.copied'));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      toast.show(errorMessage(e), 'error');
    }
  };

  return (
    <Sheet
      open={open}
      title={t('invites.title')}
      onClose={onClose}
      footer={
        <Button fullWidth size="md" icon="plus" loading={create.isPending} onClick={() => void create.run().catch((e: unknown) => toast.show(errorMessage(e), 'error'))}>
          {t('invites.create')}
        </Button>
      }
    >
      <div className="app-stack">
        <p className="t-body v-muted">{t('invites.body')}</p>
        <DataBoundary query={invites} rows={2} empty={<p className="t-body v-muted">{t('invites.empty')}</p>}>
          {(list) => (
            <ul className="app-list">
              {list.map((i) => (
                <li key={i.code}>
                  <ListRow
                    title={i.code}
                    subtitle={t('invites.created', { date: formatTimeAgo(i.createdAt) })}
                    trailing={
                      <span className="app-row-actions">
                        <IconButton icon="share" label={t('invites.share')} onClick={() => void share(i)} />
                        <IconButton
                          icon="trash"
                          label={t('invites.revoke')}
                          onClick={() =>
                            void revoke
                              .run(i.code)
                              .then(() => toast.show(t('invites.revoked')))
                              .catch((e: unknown) => toast.show(errorMessage(e), 'error'))
                          }
                        />
                      </span>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </DataBoundary>
      </div>
    </Sheet>
  );
}
