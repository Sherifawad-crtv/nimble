# Origin backend

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

- Site URL: the production domain (for example `https://origin-xxx.vercel.app`).
- Redirect URLs: the same domain, plus `http://localhost:5173` for development.

Email confirmation is on by default; sign-up then shows "Confirm your email". Use a custom SMTP
sender before launch (the built-in one is rate-limited).

## Wearables

Removed for now. Migration `20261012000500_remove_wearables.sql` drops the tables; the previous
implementation is in git history (commit d75d942) if it comes back.
