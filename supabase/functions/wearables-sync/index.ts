// POST -> pulls the caller's latest wearable summaries from Open Wearables into Origin.
import { HttpError, json, serve } from '../_shared/http.ts';
import { syncClient } from '../_shared/openwearables.ts';
import { admin, caller } from '../_shared/supabase.ts';

serve(async (req) => {
  const me = await caller(req);
  if (me.role !== 'client') throw new HttpError(403, 'forbidden', 'Only the client can sync their device.');
  const db = admin();
  await syncClient(db, me.id);
  const { data } = await db.from('wearable_connections').select('provider, status, capabilities, last_synced_at').eq('client_id', me.id).maybeSingle();
  return json({ connection: data });
});
