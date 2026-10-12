// POST { provider, redirectUri } -> { url }: where to send the client to approve sharing.
import { HttpError, json, serve } from '../_shared/http.ts';
import { authorizationUrl, ensureUser, isProvider } from '../_shared/openwearables.ts';
import { admin, caller } from '../_shared/supabase.ts';

serve(async (req) => {
  const me = await caller(req);
  if (me.role !== 'client') throw new HttpError(403, 'forbidden', 'Only the client can connect a device.');
  const { provider, redirectUri } = (await req.json().catch(() => ({}))) as { provider?: string; redirectUri?: string };
  if (!isProvider(provider)) throw new HttpError(400, 'invalid', 'Choose a supported brand.');
  if (!redirectUri || !/^https?:\/\//.test(redirectUri)) throw new HttpError(400, 'invalid', 'Missing return address.');

  const owUserId = await ensureUser(me);
  const db = admin();
  const { data: existing } = await db.from('wearable_connections').select('provider, status').eq('client_id', me.id).maybeSingle();
  const keep = existing && existing.provider === provider && existing.status === 'connected';
  await db.from('wearable_connections').upsert(
    {
      client_id: me.id,
      workspace_id: me.workspaceId,
      provider,
      status: keep ? 'connected' : 'disconnected',
      ow_user_id: owUserId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'client_id' },
  );
  return json({ url: await authorizationUrl(provider, owUserId, redirectUri) });
});
