// Receives Open Wearables outgoing webhooks (Svix-signed). Deployed without JWT verification:
// every request is authenticated by its signature instead.
import { json } from '../_shared/http.ts';
import { syncClient } from '../_shared/openwearables.ts';
import { admin } from '../_shared/supabase.ts';

const TOLERANCE_SEC = 300;

async function verify(req: Request, body: string): Promise<boolean> {
  const secret = Deno.env.get('OW_WEBHOOK_SECRET');
  const id = req.headers.get('svix-id');
  const ts = req.headers.get('svix-timestamp');
  const sigs = req.headers.get('svix-signature');
  if (!secret || !id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > TOLERANCE_SEC) return false;
  const keyBytes = Uint8Array.from(atob(secret.replace(/^whsec_/, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${body}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return sigs.split(' ').some((s) => s.split(',')[1] === expected);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: { code: 'invalid', message: 'POST only' } }, 405);
  const body = await req.text();
  if (!(await verify(req, body))) return json({ error: { code: 'forbidden', message: 'Bad signature' } }, 401);

  const event = JSON.parse(body) as { type: string; data: { user_id?: string; provider?: string; reason?: string } };
  const owUser = event.data?.user_id;
  if (!owUser) return json({ ok: true });

  const db = admin();
  const { data: conn } = await db.from('wearable_connections').select('client_id, provider').eq('ow_user_id', owUser).maybeSingle();
  if (!conn) return json({ ok: true });

  if (event.type === 'connection.revoked' && event.data.provider === conn.provider) {
    const status = event.data.reason === 'user_disconnected' ? 'disconnected' : 'error';
    await db.from('wearable_connections').update({ status, updated_at: new Date().toISOString() }).eq('client_id', conn.client_id);
    return json({ ok: true });
  }

  // connection.created and any new data: refresh this client's summaries.
  try {
    await syncClient(db, conn.client_id);
  } catch (e) {
    console.error('webhook sync failed', e);
    return json({ error: { code: 'unavailable', message: 'Sync failed' } }, 502);
  }
  return json({ ok: true });
});
