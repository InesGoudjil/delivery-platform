# Admin panel

`/admin` is for CineSpace staff (platform admins). It shows every workspace and user on the
platform, and lets admins:

- change plans, storage and roles;
- invite waitlist cohorts;
- sign users out, ban them and reset their two-factor sign-in;
- suspend workspaces.

Every change asks for a reason and is recorded.

## Who can use it

A platform admin is a user whose `user_profiles.platform_role` is `admin`. The role is always
read from the database, never from user metadata.

Admins need **two-factor sign-in** (an authenticator app, TOTP):

- On the first visit, `/admin` sends them to `/mfa` to scan a QR code and enter a code.
- After that, each new session asks for a 6-digit code before the admin panel opens.

Two settings matter when developing locally:

- **`ADMIN_MFA_OPTIONAL=true`** in `.env` turns the requirement off when your local Supabase has
  TOTP disabled. Production builds ignore it, and Vercel previews and staging are production
  builds.
- **Or turn TOTP on locally:** in `supabase/config.toml` (not in git), set `enroll_enabled = true`
  and `verify_enabled = true` under `[auth.mfa.totp]`.

### Making someone an admin

1. Open **Users**, click **⋯** on the user's row, then **Make platform admin…**, and give a reason.
2. On their first visit they're asked to set up two-factor sign-in.

To remove someone's admin role, use the same menu. Nobody can remove their own admin role, so
there's always at least one admin left.

**The first admin**, or if no admin is left: the database only accepts role changes made from a
platform admin's own session (the `prevent_role_escalation` trigger). Run this in the Supabase SQL
editor instead:

```sql
begin;
alter table public.user_profiles disable trigger trg_prevent_role_escalation;
update public.user_profiles set platform_role = 'admin' where id = '<user id>';
alter table public.user_profiles enable trigger trg_prevent_role_escalation;
commit;
```

**An admin who lost their authenticator:** delete their factor with the service role key
(`supabase.auth.admin.mfa.deleteFactor({ userId, id })`). They then set up a new one at `/mfa`.

## What it shows

| Page | What's on it |
| --- | --- |
| Overview | Workspaces, paying subscriptions, MRR, storage, deliveries and users. What needs a look: past-due payments, trials ending, storage above 90%, failed notifications, overdue comment emails, a scheduler that has stopped. Trends over 30 days, 90 days or 12 months: sign-ups, new workspaces, deliveries, approvals, and MRR by plan. Recent admin changes |
| Workspaces | Every workspace with its owner's email, plan, subscription, storage, deliveries, members and last activity. Search, filters, sorting and pages; the URL keeps them, so a view can be shared |
| Workspace page | Plan and billing, with links to the Stripe customer and subscription. Storage by kind, deliveries (titles and counts only), members, feature overrides, recent notifications and this workspace's admin history |
| Users | Every account from Supabase Auth: email, confirmed or not, role, workspaces, last sign-in, two-factor, banned |
| User page | Their workspaces and roles, devices, two-factor methods and admin history |
| Plans & subscriptions | Plans (create, edit, archive) and every subscription |
| Waitlist | The pending queue in invite order; inviting the next cohort |
| Notifications | Every email and WhatsApp message with its status and error; recipients shortened (`cl•••@example.com`). Comments waiting to be sent, and when the scheduler last ran |
| Audit log | Every admin change: who, what, why, before and after |

**Search (⌘K or Ctrl+K, or the box in the sidebar)** finds:

- workspaces, by name, slug, owner email or ID;
- users, by email, name or ID;
- deliveries, by title or exact share token.

It also jumps to any admin page.

Things to know about the numbers:

- **They're real.** They're computed in the database, one query per page. When something can't
  load, the page says so instead of showing a made-up value.
- **MRR is the list price:** active subscriptions only, annual prices divided by 12, before any
  discount. Net revenue is in the Stripe dashboard.
- **Admins see metadata, not content:** titles, counts, sizes and statuses, never the client's
  films.

## Changing things

Every change asks for a reason, and every attempt is written to the audit log, including the ones
that fail. An entry records who made the change, the target, the reason, before and after, the
request ID and the IP address. Entries can't be edited or deleted. Each admin can make up to 60
changes per 10 minutes.

| Change | Rule |
| --- | --- |
| A workspace's plan | Only for workspaces that don't pay through Stripe, such as beta testers and comped accounts. For Stripe-billed workspaces, change the subscription in Stripe: the webhook would overwrite a change made here. |
| A plan's price | Not when Stripe charges the plan, because Stripe prices can't change. Create a plan with the new price, then archive the old one. |
| Deleting a plan | Plans with subscribers are archived instead. The starter plan can't be deleted. |
| Storage override | Added to the workspace's other overrides without touching them. Remove it to go back to the plan's limit. |
| Platform role | You can't remove your own. |
| Waitlist cohort | The invite emails go out at once and can't be called back. |
| Sign out everywhere | Every device is signed out at once and every Supabase login ends. They can sign in again. Not on yourself. |
| Ban | 24 hours, 7 days, 30 days or until lifted. They're signed out everywhere. Not on yourself or another platform admin: remove the role first. |
| Reset two-factor | Removes all their authenticators and signs them out. Their next sign-in is password only, and they can set up a new one. Check it's really them first. Not on yourself. |
| Suspend a workspace | Type its slug to confirm. Lift it from the same menu. |

Admins can't send a password-reset or confirmation email for a user yet. Sign-in links are only
accepted in the browser that asked for them, so a link an admin requested wouldn't work for the
user. This needs the sign-in emails to switch to one-time token links first.

## Suspension and reports

A suspended workspace:

- **its client links** show "This delivery is no longer available" to visitors, including media
  downloads;
- **its public portfolio** returns "not found";
- **its members** can sign in and look at their work, under a red banner. Changes are refused:
  uploads, edits, sending links, invites, role changes, and comments and approvals in the client
  room. Removing a member or revoking an invitation still works, since those only take access
  away;
- **the reason** stays internal (admin panel and audit log only).

Files on the public portfolio bucket are still reachable by anyone who has their exact address.

Every client room and portfolio has a **Report a problem** link in its footer. It opens an email
with the page's address to `NEXT_PUBLIC_ABUSE_EMAIL`, or, when that isn't set, to the address the
legal pages already publish. Set it to a monitored abuse@ inbox.

## Database

| Migration | Adds | Tests |
| --- | --- | --- |
| `20261113120000_admin_read_model_and_audit.sql` | `admin_audit_events` (append-only); `admin_workspace_overview()`, `admin_list_workspaces()`, `admin_list_users()`, `admin_platform_kpis()` | `tests/rls/admin-read-model.test.ts` |
| `20261113130000_admin_operations.sql` | `admin_end_all_auth_sessions()`; `system_heartbeats`, written by `/api/cron/notifications` on every run; `admin_daily_series()`; `admin_mrr_by_plan()` | `tests/rls/admin-operations.test.ts` |
| `20261113140000_workspace_suspension.sql` | `workspaces.suspended_at`, `suspended_reason` and `suspended_by` (tenants can't set them); the read-model functions again, with suspension | `tests/rls/workspace-suspension.test.ts` |

Only the service role can use the admin functions and tables, because they read `auth.users`.

Apply the migrations in order like the others (`npx supabase db push`, see
[database-migrations.md](database-migrations.md)). Until they're applied, the admin pages show
"Couldn't load…".

The admin panel needs `SUPABASE_SERVICE_ROLE_KEY`. It never falls back to the anon key.

## For developers

- **Access.**
  - Every admin page calls `requirePlatformAdminPage()` itself, because Next.js doesn't re-run a
    layout on every navigation.
  - Admin data comes from `getPlatformAdminServices()` (`core/admin/context.ts`). It checks the
    role and two-factor session first, then uses the service role.
  - Don't use `getServerAdminServices()` in admin code.
- **Changes.** Write them with `createPlatformAdminAction()` (`app/actions/safe-action.ts`), which
  handles the reason, the rate limit and the audit event. List each new action in
  `SERVICE_ROLE_ACTIONS` in `tests/security/server-actions-auth.test.ts`, with why it's safe.
- **A new section:**
  1. Add a folder under `app/(admin)/admin/`.
  2. Add an entry in `app/(admin)/_modules/registry.ts`; the sidebar and the attention badges
     come from it.
  3. Build lists with `AdminDataTable`, with their URL parsers in `app/(admin)/_lib/search-params.ts`.
  4. Put reads in `core/admin/read-model.ts`.
- **Slow pages.** Each admin query is timed. Over 300 ms it logs a warning with the request ID, so
  slow pages show up in the logs.

## When something looks wrong

| You see | Why | What to do |
| --- | --- | --- |
| "Couldn't load …" on admin pages | The migration isn't applied, or `SUPABASE_SERVICE_ROLE_KEY` isn't set | Apply the migration, or set the key |
| You're sent to `/mfa` | This session hasn't passed the two-factor check yet | Enter the code from your authenticator app |
| "Two-factor check unavailable" on `/mfa` | TOTP is off for the Supabase project, or the user has too many factors | Turn on TOTP in the project's MFA settings; delete old factors |
| "This workspace is billed through Stripe…" | Expected | Change the subscription in Stripe |
| "The scheduler has never run" on the overview | Nothing calls `/api/cron/notifications` yet | Set up the schedule ([notifications.md](notifications.md), step 3) |
