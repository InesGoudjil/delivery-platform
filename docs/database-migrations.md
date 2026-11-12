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

Tests marked `it.fails` are known gaps: they pass while the gap exists, and when you close one the test reports it and you remove the `.fails`. There are none left; don't add new ones without a plan to close them.

**New tables and functions.** The anon role gets nothing by default, and Postgres still grants EXECUTE on new functions to PUBLIC: add `REVOKE EXECUTE ON FUNCTION … FROM PUBLIC, anon, authenticated` and grant only what's needed. The RLS tests fail on a new table or function anon can reach, a function signed-in users can call that RLS doesn't need, or a SECURITY DEFINER function without a fixed `search_path`.

`supabase/schema.sql` is a git-ignored local dump. Don't edit it and don't rely on it; the migrations are the source of truth.

## Security migrations of 2026-11-11 (Phase 1)

| Migration | What it does |
|---|---|
| `20261111120000_role_aware_rls.sql` | Workspace roles in the database: viewers read and comment, editors create and edit, admins delete and change client-room access (passcode, share link, downloads, comments, expiry). Files can only go into a delivery of the same workspace. Rows can't move to another workspace, file or thread. Owner protection. `owner_id` and `storage_used_bytes` aren't writable through the API. Invitations are admin-only. Users see their own sessions (revoked ones too) and only the server writes them. |
| `20261111120100_revoke_unused_api_access.sql` | The anon key gets no table, view or function access at all. Signed-in users lose TRUNCATE/REFERENCES/TRIGGER and can only call the four helpers RLS uses. The membership helpers only answer for the caller. Every SECURITY DEFINER function has a fixed `search_path`. Public forms (waitlist, inquiries) go through the server. |
| `20261111120200_storage_counter_follows_trash.sql` | The storage counter is maintained by triggers only, including moves to and from Trash and deletes, and existing counters are recomputed. |
| `20261111120300_protect_file_locations.sql` | File locations (`raw_file_url`, `hls_manifest_url`, `thumbnail_url`, sizes, Silo keys) are written by the server only. |
| `20261111120400_guest_comment_ownership.sql` | Client-room comments record which browser wrote them, so guests can only change their own. Members can't post as a guest. |
| `20261111120500_explicit_portfolio_pieces.sql` | `assets.is_portfolio`: only explicitly marked files appear on the public portfolio (not every file outside a delivery). Backfills existing standalone pieces from their storage path. |

**Rollout.** These migrations and the code that ships with them depend on each other:
the new code writes the new columns, and the old code breaks under the new policies
(direct file-location writes, the storage counter, anonymous reads). Ship them together:

1. Test on a staging project first: `npm run test:db` locally, then the app against staging.
2. Deploy the app code.
3. Right away, `npx supabase db push`. Between steps 2 and 3, comments and the public
   portfolio fail; between 3 and a rollback of the code, uploads fail. Keep the gap short.
4. Probe with the real anon key: every table and RPC should answer "permission denied"
   (`tests/rls/access-control.test.ts` → "anonymous visitors" lists what must hold).

Existing client-room unlock cookies stop working (new format): clients enter the passcode once more.

## One-time: align an existing project with the baseline

Done on staging on 2026-11-12 (all 17 migrations in sync, anon probe clean). With Supabase CLI 3.x, add `--remote` (the linked project) to each command below, and `--yes` to confirm hosted changes. Staging had applied `20261111000000` by hand and lacked three baseline indexes, which `20261111120800` adds; check production the same way before marking the baseline applied (compare its schema with a fresh database built from the migrations up to `20261110000000`).

### Production

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
