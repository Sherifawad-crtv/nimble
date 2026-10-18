# Nimble backend

Supabase project `vvexpsqlmjrhrdxatifx` (eu-central-1). Everything here is already applied and deployed.

## Database

`migrations/` — schema, row-level security, sign-up and logging functions, private policy helpers.

- One workspace per coach. Every row carries `workspace_id`.
- A coach sees their whole workspace. A client sees only their own rows.
- Logging goes through `start_workout`, `save_log`, `complete_workout` (clients cannot write logs directly).

## Checks

Run each file in the SQL editor (both roll back):

- `tests/tenancy.sql` — a coach cannot read another workspace; a client cannot read another client.
- `tests/app_flow.sql` — invite, sign-up, assign, log, comments, move/delete rules, revoke.

## Edge functions

| Function | Who | JWT |
| --- | --- | --- |
| `link-preview` | coach | on |

## Auth settings (dashboard)

Authentication > URL Configuration:

- Site URL: the production domain (for example `https://your-app.vercel.app`).
- Redirect URLs: the same domain, plus `http://localhost:5173` for development.

Email confirmation is on by default; sign-up then shows "Confirm your email". Use a custom SMTP
sender before launch (the built-in one is rate-limited).

## Wearables

Removed for now. Migration `20261012000500_remove_wearables.sql` drops the tables; the previous
implementation is in git history (commit d75d942) if it comes back.


## Push notifications

`20261018000100_push_notifications.sql` and `20261018000200_push_settings.sql` add device subscriptions and
database triggers (new or moved workout, finished workout, comments, package running out or expiring) that call
the `send-push` edge function through `pg_net`. A daily `pg_cron` job reminds clients of packages ending within a
week. After applying the migrations, store the function URL, a shared secret and a VAPID key pair once:

```sql
insert into private.push_config (id, url, secret, vapid_public, vapid_private, vapid_subject)
values (1, 'https://<ref>.supabase.co/functions/v1/send-push', '<random secret>', '<VAPID public>', '<VAPID private>', 'mailto:you@example.com');
```

Deploy `functions/send-push` with JWT verification off (it authenticates with the shared secret). The public key is
also in `src/lib/push.ts` (override with `VITE_VAPID_PUBLIC_KEY`). On iPhone, notifications need Nimble added to the Home Screen.
