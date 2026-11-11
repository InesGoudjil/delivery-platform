# Database migrations

## How the schema is managed

- **Every schema change is a file in `supabase/migrations/`.** Don't change tables, columns or policies in the Supabase dashboard. That's how production drifted away from the migrations: the `projects → deliveries` rename and the portfolio `projects` tables were made by hand, and the leftover open `deliveries` policy went unnoticed for weeks.
- **`20261101000002_baseline_schema.sql` is the starting point.** It's a squashed copy of the production schema (dump of 2026-11-06) plus the `auth.users` signup trigger. Everything older is kept in `supabase/migrations-archive/` for reference only; the Supabase CLI never reads that folder.
- **Write migrations so they can be re-run safely**: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`, `CREATE OR REPLACE FUNCTION/VIEW`. Every migration after the baseline follows this.
- **Every new table gets RLS and policies in the same migration**, plus cases in `tests/rls/access-control.test.ts`.

## Testing

```bash
npm run test:db
```

This builds a fresh database from `supabase/migrations` in memory (PGlite, no Docker needed) and checks who can read and write what, as the same roles the app uses: anonymous visitors, signed-in users from another workspace, viewers, admins, owners, platform admins and the service role. CI runs it on every pull request, so:

- a migration that no longer applies on a fresh database fails CI;
- a public table without row-level security fails CI;
- a policy that leaks data across workspaces, or lets someone edit billing or limits, fails CI.

Tests marked `it.fails` are known gaps (for example, viewers can still delete deliveries through the API because roles are only enforced in app code). They pass while the gap exists. When you close one, the test reports it, and you remove the `.fails`.

`supabase/schema.sql` is a git-ignored local dump. Don't edit it and don't rely on it; the migrations are the source of truth.

## One-time: align production with the baseline

Production already has everything in the baseline, so mark it as applied rather than running it. You need the Supabase CLI linked to the production project (`npx supabase link --project-ref <ref>`).

1. Check what production thinks it has applied:

   ```bash
   npx supabase migration list
   ```

2. For each **archived** version listed under *Remote* (anything older than `20261101000002`), mark it reverted so the CLI stops looking for the file:

   ```bash
   npx supabase migration repair --status reverted <version> [<version> ...]
   ```

3. Mark the baseline as applied:

   ```bash
   npx supabase migration repair --status applied 20261101000002
   ```

4. `20261102000000` to `20261110000000`: if they show as applied on *Remote*, nothing to do. If not, `db push` will run them; they're all safe to re-run.

5. **Deploy the app code first**, then apply the remaining migrations (this includes `20261111000000_close_critical_rls_holes.sql`):

   ```bash
   npx supabase db push
   ```

   If you'd rather run `20261111000000` in the SQL editor, mark it applied afterwards with `npx supabase migration repair --status applied 20261111000000`.

6. Run `npx supabase migration list` again: *Local* and *Remote* should match.

To check for new drift later, `npx supabase db diff --linked` (needs Docker) should report no changes.

### Known differences from the snapshot

- The production dump contained an index, `idx_user_sessions_token_id` (partial, on `user_sessions.session_token_id`), that no migration creates. It duplicates the column's unique index, so it's harmless; drop it in production or add it to a migration.
- A fresh database has no rows in `plans`. Create plans through the admin panel (or a local seed file) when setting up a new environment.
