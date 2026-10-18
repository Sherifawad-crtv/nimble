// POST { users: uuid[], title, body, url } -> sends a web push to every device of those users.
// Called only by the database (private.notify), which proves itself with the shared x-push-secret.
// The secret and the VAPID signing keys live in private.push_config, read through push_settings().
import webpush from 'npm:web-push@3.6.7';
import { HttpError, json, serve } from '../_shared/http.ts';
import { admin } from '../_shared/supabase.ts';

serve(async (req) => {
  const db = admin();
  const { data: cfg } = await db.rpc('push_settings');
  if (!cfg?.secret || req.headers.get('x-push-secret') !== cfg.secret) throw new HttpError(401, 'unauthenticated', 'Not allowed.');
  webpush.setVapidDetails(cfg.vapid_subject, cfg.vapid_public, cfg.vapid_private);

  const { users, title, body, url } = (await req.json().catch(() => ({}))) as { users?: string[]; title?: string; body?: string; url?: string };
  if (!Array.isArray(users) || !users.length || !title) throw new HttpError(400, 'invalid', 'Who and what to send are required.');

  const { data: subs } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth').in('user_id', users);
  const payload = JSON.stringify({ title, body: body ?? '', url: url ?? '/' });

  let sent = 0;
  const gone: string[] = [];
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
        sent++;
      } catch (e) {
        // 404/410: the device unsubscribed or the app was removed. Forget it.
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(s.id);
        else console.error('push failed', status);
      }
    }),
  );
  if (gone.length) await db.from('push_subscriptions').delete().in('id', gone);
  return json({ sent, removed: gone.length });
});
