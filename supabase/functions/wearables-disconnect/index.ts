// POST -> revokes the caller's device connection. The coach loses access straight away.
import { HttpError, json, serve } from '../_shared/http.ts';
import { disconnect } from '../_shared/openwearables.ts';
import { admin, caller } from '../_shared/supabase.ts';

serve(async (req) => {
  const me = await caller(req);
  if (me.role !== 'client') throw new HttpError(403, 'forbidden', 'Only the client can disconnect a device.');
  const db = admin();
  const { data: conn } = await db.from('wearable_connections').select('provider, ow_user_id').eq('client_id', me.id).maybeSingle();
  if (conn?.ow_user_id) await disconnect(conn.ow_user_id, conn.provider);
  await db
    .from('wearable_connections')
    .update({ status: 'disconnected', capabilities: [], updated_at: new Date().toISOString() })
    .eq('client_id', me.id);
  return json({ ok: true });
});
