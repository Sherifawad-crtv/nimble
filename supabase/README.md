# Origin backend

Supabase project `vvexpsqlmjrhrdxatifx` (eu-central-1). Everything here is already applied and deployed.

## Database

`migrations/` — schema, row-level security, sign-up and logging functions, private policy helpers.

- One workspace per coach. Every row carries `workspace_id`.
- A coach sees their whole workspace. A client sees only their own rows.
- Logging goes through `start_workout`, `save_log`, `complete_workout` (clients cannot write logs directly).
- Wearable tables are written only by the edge functions. The coach can read them only while the client's
  connection is `connected`; disconnecting removes access at once.

## Checks

Run each file in the SQL editor (both roll back):

- `tests/tenancy.sql` — a coach cannot read another workspace; a client cannot read another client.
- `tests/app_flow.sql` — invite, sign-up, assign, log, device match, comments, move/delete rules, revoke.

## Edge functions

| Function | Who | JWT |
| --- | --- | --- |
| `link-preview` | coach | on |
| `wearables-connect` | client | on |
| `wearables-sync` | client | on |
| `wearables-disconnect` | client | on |
| `wearables-webhook` | Open Wearables (Svix signature) | **off** |

## Auth settings (dashboard)

Authentication > URL Configuration:

- Site URL: the production domain (for example `https://origin-xxx.vercel.app`).
- Redirect URLs: the same domain, plus `http://localhost:5173` for development.

Email confirmation is on by default; sign-up then shows "Confirm your email". Use a custom SMTP
sender before launch (the built-in one is rate-limited).

## Open Wearables

Origin talks to a self-hosted [Open Wearables](https://github.com/the-momentum/open-wearables) server.

1. Deploy it with Docker on its own server (see its `docker-compose`), behind HTTPS.
   Set `API_BASE_URL` to its public URL (used for OAuth callbacks) and `OUTGOING_WEBHOOKS_ENABLED=true`.
2. Register OAuth apps with each brand (Garmin, Whoop, Oura, Fitbit, Polar, Strava) and add their
   client ids and secrets to the Open Wearables environment.
3. Create an API key in Open Wearables.
4. Add a webhook endpoint pointing to
   `https://vvexpsqlmjrhrdxatifx.supabase.co/functions/v1/wearables-webhook` and copy its signing secret.
5. Set the function secrets (Edge Functions > Secrets):
   - `OW_API_URL` — e.g. `https://wearables.example.com`
   - `OW_API_KEY`
   - `OW_WEBHOOK_SECRET` — the `whsec_…` value

Until these are set, connecting a wearable shows "Wearable connections are not set up yet."

Live heart rate is not built: no brand is verified for it, and nothing depends on it.
