# Security Remediation Plan — CineSpace Delivery Platform

> Goal: take the platform from "exploitable today" to production-ready.
> Execute phases **in order** — each phase assumes the previous one is done.
> Work on a fresh `fix/security` branch, one PR per phase.

---

## Phase 0 — Containment & prep (before any code change)

- [ ] **Rotate every secret**, assuming they were exposed while the platform was live:
  - Supabase: rotate `SUPABASE_SERVICE_ROLE_KEY`, rotate the anon key (Dashboard → Settings → API), invalidate all existing sessions (Auth → Sessions → revoke), force password reset for all users.
  - Stripe: roll `STRIPE_WEBHOOK_SECRET` (new secret, update both endpoint and env), check Stripe logs for unexpected portal sessions / checkouts created by users who aren't workspace owners.
  - Cloudflare: roll the Stream API token and R2 API token; review R2 access logs for bulk downloads.
  - Resend: roll `RESEND_API_KEY`; check `notification_logs` for emails sent outside normal flows.
- [ ] **Snapshot the database**: `supabase db dump -f backup-$(date +%F).sql`.
- [ ] **Capture the live schema drift**: `supabase db pull` — bring the untracked `deliveries` and `project_assets` tables plus their live RLS policies under version control in a new migration. Commit this *before* changing any policy so there's a rollback point.
- [ ] Create branch `fix/security`.

**Exit criteria:** secrets rotated, dump exists, drift captured in git.

---

## Phase 1 — Identity & admin integrity (blocks the privilege-escalation chain)

### 1.1 Migration: stop trusting client metadata for `platform_role`
New migration file, e.g. `supabase/migrations/2026xxxx_lock_platform_role.sql`:

```sql
-- 1. Trigger seeds 'user' unconditionally; never read client metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, avatar_url, platform_role)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    'user'                                  -- ← hardcoded, was: metadata platform_role
  );
  RETURN new;
END $$;

-- 2. Reset anyone who self-promoted via signup metadata.
UPDATE public.user_profiles SET platform_role = 'user'
WHERE platform_role = 'admin'
  AND id NOT IN (<list of real admin user ids you control>);

-- 3. Column-level guard: only platform admins may change platform_role.
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.platform_role <> OLD.platform_role
     AND (coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000')::text IS NULL
          OR NOT public.is_platform_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Only platform admins can change platform_role';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();
```

### 1.2 Middleware: read admin from the DB, not user metadata
`middleware.ts` / `lib/supabase/middleware.ts:68-71` — replace
`user.user_metadata?.platform_role === 'admin'` with a lookup of `user_profiles.platform_role`
for `user.id` (one cheap RLS-scoped query, cached per request). Keep the redirect logic unchanged.

**Exit criteria:** signing up with `options.data.platform_role='admin'` yields a normal user; a logged-in
user cannot `PATCH user_profiles.platform_role`; `/admin` still works for the real admin.

---

## Phase 2 — Authorization refactor (fixes the 19 unprotected actions)

### 2.1 Create one guard module — `core/security/guards.ts`

```ts
import { redirect } from 'next/navigation';
import { getServerServices } from '@/core/server';

export async function requireUser() { /* getCurrentUser() or throw UnauthorizedError */ }

export type MinRole = 'viewer' | 'member' | 'admin' | 'owner';

export async function requireWorkspaceMember(workspaceId: string, minRole: MinRole = 'member') {
  const user = await requireUser();
  const services = await getServerServices();
  const member = await services.member.getMember(workspaceId, user.id);
  const isOwner = (await services.workspace.getWorkspaceById(workspaceId))?.ownerId === user.id;
  const rank: Record<string, number> = { viewer: 1, member: 2, admin: 3, owner: 4 };
  const actual = isOwner ? 'owner' : member?.role ?? null;
  if (!actual || rank[actual] < rank[minRole]) throw new Error('Forbidden');
  return { user, services, role: actual };
}
```

### 2.2 Apply the guard everywhere (mechanical sweep)

| File | Actions to fix | Guard |
|---|---|---|
| `app/actions/deliveries.ts` | `createDeliveryAction` (member), `approveCutAction` (member), `toggleAssetApprovalAction` (member), `approveAllAssetsAction` (member), `publishDeliveryToPortfolioAction` (member), `updateDeliveryDetailsAction` (member), `archiveDeliveryAction` (member), `updateDeliverySecurityAction` (admin), `sendDeliveryEmailAction` (member) — all **first resolve the delivery by id, then guard on `delivery.workspaceId`** | `requireWorkspaceMember` |
| `app/actions/projects.ts` | `createWorkspaceProjectAction` (member), `approveCutAction`, `updateProjectDetailsAction`, `archiveProjectAction`, `createShowcaseProjectAction` | same pattern |
| `app/actions/upload.ts` | `requestAssetUploadAction`, `requestVideoUploadAction`, `confirmUploadCompletedAction` — **remove `getServerAdminServices()`, use the user-scoped client** so RLS enforces again; keep the guard in code too | `requireWorkspaceMember(workspaceId)` / resolve workspace from the asset version |
| `app/actions/workspaces.ts` | **Delete `switchWorkspacePlanAction`** (and its call in `app/new-workspace/new-workspace-client.tsx:108`) — plan changes must only ever originate from Stripe checkout/webhook | delete |
| `app/actions/waitlist.ts` | `inviteWaitlistCohortAction` — add `requirePlatformAdmin()` (reuse the `profile.platformRole === 'admin'` pattern from `app/actions/admin.ts:15`) | admin gate |
| `app/actions/feedback.ts` | `addFeedbackAction` — require either the share-token passcode check (as today) **or** workspace membership, in both code paths (not just when `shareToken` is present); `toggleFeedbackResolvedAction` / `deleteFeedbackAction` — require workspace membership resolved via the feedback's asset version → asset → delivery | member |
| `app/api/stripe/portal/route.ts` | Add owner/admin check — mirror `core/services/stripe.service.ts:94-106` (extract that check into a shared `assertWorkspaceBillingAdmin(workspaceId, userId)` used by both checkout and portal) | owner/admin |

**Rules going forward** (add to CLAUDE.md / README):
1. No server action may accept a `workspaceId`/`deliveryId` without resolving the resource and guarding on it.
2. `getServerAdminServices()` is allowed **only** inside webhook routes and cron jobs — never in actions.
3. Every action starts with `requireUser()` / `requireWorkspaceMember()`.

**Exit criteria:** a second test account cannot: approve a cut on your delivery, strip your passcode,
upload into your workspace, invite a waitlist cohort, open your Stripe portal, or create a delivery in
your workspace. (Write these as a quick playwright/vitest smoke script — see Phase 7.)

---

## Phase 3 — RLS remediation (lock the data layer)

> All in one migration `supabase/migrations/2026xxxx_fix_rls.sql`. Test with the Supabase SQL editor
> using `SET LOCAL role anon;` / `SET LOCAL request.jwt.claims` to simulate.

### 3.1 Kill the fake "share token" policies
The policies `USING (share_token is not null)` match every row. Strategy: **member-only RLS + a
service-role read path on the public page** (the page already enforces passcode/expiry in code, and the
share token itself is the capability — it's checked by exact-match lookup, not by RLS).

```sql
-- Drop the anon-readable policies on projects, assets, asset_versions, portfolio_projects
DROP POLICY IF EXISTS "Anyone with share_token can view project" ON public.projects;
DROP POLICY IF EXISTS "Anyone with share_token can view assets" ON public.assets;
DROP POLICY IF EXISTS "Anyone with share_token can view asset versions" ON public.asset_versions;
DROP POLICY IF EXISTS "Public can view featured portfolio projects" ON public.portfolio_projects;

-- Member-only read/write (same predicate as the manage policies)
CREATE POLICY "Members can view projects" ON public.projects
  FOR SELECT USING (is_workspace_member(workspace_id, auth.uid()));
-- repeat for assets, asset_versions; portfolio_projects uses owner_id = auth.uid() OR member.
```

Then in `app/(public)/deliver/[shareToken]/page.tsx` (and the portfolio public pages): fetch via a
dedicated server-only function that uses `createAdminClient()` **but only** performs the exact-token
lookup and returns a whitelisted shape (no `passcode_hash` leaves the server). Add the lookup in
`core/services/delivery.service.ts` as `getPublicDeliveryByShareToken(token)` that:
- looks up by exact share token,
- throws on `expiresAt` in the past (fix the expiry gap — `getDeliveryWithFullDetails` currently skips it),
- refuses `status = 'archived'`,
- never returns `passcodeHash` to the client component.

Also: `deliveries` (once captured via `db pull`) gets the same member-only policies plus, if any anon
access is needed, an exact-token policy: `USING (share_token = <the token from the query>)` — never
`IS NOT NULL`.

### 3.2 Feedback
```sql
DROP POLICY IF EXISTS "Guests can view feedback" ON public.feedback;
DROP POLICY IF EXISTS "Guests can post feedback" ON public.feedback;
-- Feedback is read/written server-side only (service-role via the action after the passcode check),
-- or, if you want client-side reads for the review room, scope to versions of shared deliveries
-- via a SECURITY DEFINER function can_access_version(version_id uuid) that checks the passcode
-- cookie equivalent — simplest: keep it server-only (deny-all client policies).
```

### 3.3 Waitlist
```sql
DROP POLICY IF EXISTS "Allow reading waitlist entry" ON public.waitlist_entries;
-- anon keeps INSERT only (pending/priority 0/token null as today).
-- Status checks go through the server action, which already runs on the service-role repo.
```
Also fix `get_waitlist_position`: add `SET search_path = public` and keep it SECURITY DEFINER but
callable only where needed (it currently lets anon probe the queue by id).

### 3.4 Sanity grants
`anon`/`authenticated` currently hold DML grants on every table (`remote_schema.sql:777-805`). RLS is
the only barrier — that's acceptable, but REVOKE direct `DELETE` on `waitlist_entries`, `invoices`,
`notification_logs` from `anon` for defense in depth.

**Exit criteria:** with only the anon key you cannot SELECT from `projects`, `assets`,
`asset_versions`, `feedback`, `waitlist_entries` via the REST API; the public delivery link still works
with and without a passcode; expired/archived links 404.

---

## Phase 4 — Public-surface hardening

### 4.1 Real Cloudflare webhook verification
`core/providers/storage/cloudflare-stream.provider.ts:184-189` — replace the `Boolean(signatureHeader)`
stub with actual Svix-style HMAC verification (Cloudflare uses `Webhook-Signature: t=<ts>,v1=<hmac>`
over `"{t}.{rawBody}"`):

```ts
import { createHmac, timingSafeEqual } from 'crypto';

verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean {
  if (!this.webhookSecret) return false;          // fail closed in production, not open
  const header = headers['webhook-signature'];
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map(p => p.split('=')));
  const ts = Number(parts['t']); const sig = parts['v1'] ?? parts['sig1'];
  if (!ts || !sig) return false;
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;   // replay window
  const expected = createHmac('sha256', this.webhookSecret)
    .update(`${ts}.${rawBody}`).digest('hex');
  return sig.length === expected.length &&
         timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
```
Also validate the payload shape with zod in `app/api/webhooks/cloudflare-stream/route.ts` before
calling `handleTranscodeWebhook`.

### 4.2 Kill the mock upload route in production
`app/api/mock-upload/[uid]/route.ts` — first line of every exported handler:
```ts
if (process.env.NODE_ENV === 'production') return new NextResponse(null, { status: 404 });
```
Also sanitize `uid` (`if (!/^[a-zA-Z0-9_-]{8,64}$/.test(uid)) return 400;`) even in dev.

### 4.3 Passcode hashing + migration path
- New hash: Node's built-in `scrypt` (`crypto.scryptSync(password, randomBytes(16), 64)`, store as
  `scrypt$<salt>$<hash>`) — no new dependency needed.
- Store format prefix in `passcode_hash`. On verification (`app/actions/deliveries.ts:35`):
  1. if stored hash starts with `scrypt$` → verify with scrypt,
  2. else (legacy sha256/plaintext) → compare, and if it matches **immediately re-hash with scrypt and
     update the row** (progressive upgrade).
- Remove the plaintext-equality branch (`delivery.passcodeHash === cleanPasscode`).
- Never select `passcode_hash` into any client-visible payload.

### 4.4 Rate limiting — `lib/rate-limit.ts`
Use `@upstash/ratelimit` + Redis (works on serverless) with an in-memory fallback for local dev.
Apply, per IP + per account where applicable:
- login/signup/password-reset: 5 req / 15 min
- passcode verification (`verifyDeliveryPasscodeAction`, `verifyPassphraseWithTokenAction`): 10 / 15 min
- waitlist join / status: 5 / hour
- feedback insert: 20 / hour
- `/api/mock-upload` and `/api/media`: 60 / min
Return a generic "Too many attempts" — never leak whether the account/passcode exists.

### 4.5 Expiry & status enforcement
In `core/services/delivery.service.ts`, move the `expiresAt` check from `getDeliveryByShareToken`
into `getDeliveryWithFullDetails` (or better: into the shared `getPublicDeliveryByShareToken` from 3.1)
so the page and every consumer enforce it.

### 4.6 Email HTML injection
`sendDeliveryEmailAction` / `core/services/notification.service.ts:132-193` — escape `customMessage`,
`title`, `approvedByName` (or render them as plain text nodes); validate the recipient is a real email
via zod; add the membership guard from Phase 2.

### 4.7 Host-header trust
`app/actions/auth.ts:33-35` — build the reset URL from `env.NEXT_PUBLIC_APP_URL` (validate it against an
allowlist in prod) instead of `x-forwarded-host`. Same for the auth callback's `forwardedHost` usage
(`app/api/auth/callback/route.ts:83-84`).

### 4.8 Stripe webhook robustness — `app/api/webhooks/stripe/route.ts`
- **Idempotency**: table `webhook_events (id text primary key, processed_at timestamptz)`; insert
  `event.id` first, skip if already present (unique violation = already processed).
- **Status gating**: on `customer.subscription.updated/deleted`, only apply when
  `['active','trialing'].includes(stripeSub.status)`; explicitly map `past_due`/`canceled` to a
  downgraded/past-due workspace state.
- **Workspace resolution**: use only `stripeSub.metadata.workspace_id` / `session.client_reference_id`
  (both set by your own server) — delete the `listAllSubscriptions().find(s => paymentProviderCustId === customerId)`
  fallbacks (ambiguous with multi-workspace customers).

**Exit criteria:** forged Cloudflare webhook with a random header is rejected (curl test); mock route
404s in prod build; old passcode still works but gets re-hashed; 6 rapid passcode attempts get
rate-limited; duplicate Stripe deliveries don't create duplicate invoices; a `canceled` subscription
event downgrades instead of upgrading.

---

## Phase 5 — Media access control

1. **R2 images**: stop proxying everything through `/api/media`. The R2 provider already has the
   presigner (`@aws-sdk/s3-request-presigner` is installed): generate **short-lived presigned GET URLs**
   server-side after the passcode/membership check, and hand those to the client. Public portfolio
   images can keep using the configured `CLOUDFLARE_R2_PUBLIC_DOMAIN` (public-by-design content only).
2. **If you keep `/api/media`** for any private content: require a short-lived signed token in the query
   (`?exp=...&sig=...`, HMAC with a server secret) or check the `delivery_access_<token>` cookie;
   never cache with `immutable` on private objects (`Cache-Control: private, max-age=300`).
3. **Cloudflare Stream video**: use Stream's signed playback tokens (`requireSignedURLs` on the video +
   token generated server-side after unlock) instead of the unsigned iframe URL.
4. Ensure upload object keys stay workspace-prefixed (`workspaces/<workspaceId>/...`) — the R2 provider
   already does this; add a regression test so `raw_file_url` can never point outside the workspace's
   prefix.

**Exit criteria:** copying a delivery's media URL into an incognito window fails after expiry;
unlocked clients can still stream/download as allowed.

---

## Phase 6 — Config, headers, validation

- [ ] **Fail-fast env**: in `lib/env.ts`, when `NODE_ENV === 'production'`, throw on missing
  `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY` instead of `.catch()`
  fallbacks; remove the anon-key fallback inside `createAdminClient` (`lib/supabase/server.ts:60-64`) —
  throw instead.
- [ ] **Security headers** in `next.config.js` `headers()`: HSTS, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY` (or frame-ancestors if you embed players elsewhere), `Referrer-Policy:
  strict-origin-when-cross-origin`, `Permissions-Policy`, and a CSP starting in report-only mode.
- [ ] **Image domains**: replace `remotePatterns: hostname: "**"` with an explicit allowlist
  (your R2 domain, Stream subdomain, Supabase avatar host, `lh3.googleusercontent.com`).
- [ ] **Zod on route bodies**: `/api/stripe/checkout`, `/api/stripe/portal`, webhook payloads.
- [ ] **Error hygiene**: API routes return generic messages; log details server-side only.
- [ ] Remove `console.log` of webhook/workspace internals before GA.

---

## Phase 7 — Verification & monitoring

- [ ] **Authz smoke tests** (vitest or a scripted curl suite): for each fixed action, call it as a
  second account and assert `Forbidden`. Cover: approve/strip-passcode/upload cross-tenant/waitlist
  invite/portal/plan-switch.
- [ ] **Anon REST probe**: with only URL + anon key, assert every table from Phase 3 returns empty/401.
- [ ] **Webhook replay tests**: replay captured Stripe events → no duplicate invoices; forged Cloudflare
  signature → 400.
- [ ] **Public flow regression**: passcode link (wrong → rate limited, right → re-hashed), expired link
  → 404, unlocked client can view/comment/approve as intended.
- [ ] Enable Supabase Auth rate-limit protections in the dashboard; add logging/alerts on
  webhook failures and 403 spikes (Vercel/Logflare or Supabase logs).

---

## Suggested commit sequence (one PR per phase)

| PR | Content | Effort |
|---|---|---|
| #1 | Phase 0 + Phase 1 (secrets, snapshot, role-lock migration, middleware) | ~2–3 h |
| #2 | Phase 2 (guards + 19 actions + portal + plan-switch removal) | ~1 day |
| #3 | Phase 3 (RLS migration + public-page service read) | ~1–2 days |
| #4 | Phase 4 (webhooks, mock route, passcodes, rate limit, expiry, email, Stripe idempotency) | ~2 days |
| #5 | Phase 5 (signed media) | ~1–2 days |
| #6 | Phase 6 (env, headers, zod) | ~half day |
| #7 | Phase 7 (tests + probes) | ~1 day |

**Definition of done:** every checkbox above ticked, smoke suite green, and a re-run of the original
audit queries (anon REST probe + action sweep) shows zero findings.
