# PostHog Integration — CUTGRID

EU region, product analytics + session replay, with a `/ingest` reverse proxy so ad-blockers don't strip the SDK. The Meta Pixel integration from the previous step stays intact; the two systems are independent (PostHog owns product analytics + session replay, Meta owns ad attribution).

---

## 1. Architecture

**Two SDKs, two clients, one shared `lib/posthog/`:**

| Surface | Library | Init location | What it does |
|---|---|---|---|
| Browser | `posthog-js` (already bundles React helpers) | `PostHogProvider` client component in the root layout | Auto pageviews on client-side navigation, session replay (with input masking), `posthog.identify()` / `posthog.reset()` on auth state changes, click/event capture from existing conversion components. |
| Server | `posthog-node` | `getPostHogServer()` lazy singleton, called from server actions + webhooks | Capture Lead, CompleteRegistration, Login, InitiateCheckout, Purchase from server contexts (server actions, Stripe webhook) where `window.posthog` doesn't exist. |

**Reverse proxy via Next.js rewrite.** `next.config.js` gets a single rewrite:

```js
async rewrites() {
  return [
    {
      source: "/ingest/static/:path*",
      destination: "https://eu-assets.i.posthog.com/static/:path*",
    },
    {
      source: "/ingest/:path*",
      destination: "https://eu.i.posthog.com/:path*",
    },
  ];
}
```

The browser SDK is then initialized with `api_host: "/ingest"` so requests stay on your own domain. This:
- Bypasses most ad-blockers (the path is too generic to filter without false positives).
- Avoids third-party cookies in Safari ITP.
- Lets you later add auth/rate-limiting on `/ingest` if you want.
- Is the pattern PostHog officially recommends and is what their `npx @posthog/wizard` produces.

**Session replay** is enabled with `maskAllInputs: true` (the default). All `<input>` values are masked in the recording. The public delivery page's passcode input is a normal `<input>` and will be redacted automatically. No additional config needed for v1.

**Feature flags and experiments** are out of scope. The plan deliberately keeps the server-side helper future-proof (a `getFeatureFlag(flag, distinctId)` stub) but doesn't wire any flags.

---

## 2. New files

### `lib/posthog/server.ts` (~120 lines)
Singleton initializer for `posthog-node`. Exposes:

- `getPostHogServer()` — returns the cached `PostHog` client or `null` if disabled. Lazily initialized so dev mode without keys is a no-op.
- `captureServerEvent({ distinctId, event, properties, groups })` — thin wrapper that swallows errors and never throws.
- `identifyServerUser({ distinctId, userId, email, name, workspaceId, workspaceSlug, plan })` — calls `posthog.identify` + `$set` with the standard person properties.
- High-level helpers matching the conversion funnel: `captureWaitlistLead`, `captureSignup`, `captureLogin`, `captureCheckoutInitiated`, `capturePurchase`. Each takes the minimal typed input and fills in event properties consistently.
- The client is `shutdown()`-friendly: a `flushServerEvents()` exported for use in route handlers' `try/finally` so events are flushed before the response returns. Default PostHog Node batching is fine for our volume.

All helpers guard on `env.isPostHogServerEnabled` and silently no-op when disabled, matching the pattern from `lib/meta/capi.ts`.

### `lib/posthog/client.tsx` (~80 lines)
Browser client + React provider glue. The file is `.tsx` because it exports a React component.

- `getPostHogClient()` — returns the cached `posthog-js` instance (or `null`). The SDK self-bootstraps on `posthog.init(...)`; subsequent calls return the same instance.
- `<PostHogProvider>` — wraps the app. Calls `posthog.init` exactly once with the right config:
  - `api_host: '/ingest'`
  - `ui_host: 'https://eu.posthog.com'` (so the "View in PostHog" links land in the EU dashboard)
  - `capture_pageview: true` (default)
  - `capture_pageleave: true`
  - `session_recording: { maskAllInputs: true }`
  - `person_profiles: 'identified_only'` (avoids creating person profiles for anonymous visitors until they sign up — saves quota)
  - `autocapture: true` (catches clicks on common CTAs without explicit calls)
  - `disable_session_recording: !env.isPostHogSessionReplayEnabled`

### `components/posthog/PostHogIdentify.tsx` (~50 lines)
Client component that:
- Reads the Supabase session via `createBrowserClient` (the existing helper at `lib/supabase/client.ts`).
- On session change: if signed in, call `posthog.identify(user.id, { email, name, workspaceId, workspaceSlug })` and `posthog.group('workspace', workspaceId, { name, slug, plan })`. If signed out, call `posthog.reset()`.
- Mounted once in the root layout. Uses a Supabase `onAuthStateChange` subscription to stay in sync with login/logout.

### `components/posthog/PostHogPageView.tsx` (~25 lines)
Thin wrapper around `usePathname` + `useSearchParams` that calls `posthog.capture('$pageview', { $current_url: ... })` on every route change. The SDK does this automatically with `capture_pageview: true`, but the App Router's client-side navigation can be missed; explicit is more reliable.

(Same pattern as `components/meta/MetaPageView.tsx`.)

### `lib/posthog/index.ts`
Barrel re-export.

---

## 3. Modified files

### `package.json`
Add dependencies (run `npm install`):
- `posthog-js` (latest stable)
- `posthog-node` (latest stable)

No build tooling changes — both are plain ESM/CJS.

### `lib/env.ts`
Add to the schema:
- `NEXT_PUBLIC_POSTHOG_KEY` — project key, public. Required for browser SDK.
- `NEXT_PUBLIC_POSTHOG_HOST` — defaults to `/ingest` (the reverse proxy).
- `NEXT_PUBLIC_POSTHOG_UI_HOST` — defaults to `https://eu.posthog.com`.
- `POSTHOG_PROJECT_API_KEY` — server-side project key. Same value as `NEXT_PUBLIC_POSTHOG_KEY` for project API auth; the EU Cloud console exposes it separately if you want to keep them different.
- `POSTHOG_HOST` — server-side API host, default `https://eu.i.posthog.com`.
- `POSTHOG_ENABLED` — boolean toggle, default `true` when keys are set.
- `POSTHOG_SESSION_REPLAY_ENABLED` — boolean toggle, default `true`.
- Derived: `isPostHogClientEnabled`, `isPostHogServerEnabled`, `isPostHogSessionReplayEnabled`.

### `next.config.js`
Add the `rewrites()` block documented above. Required so the SDK can call `/ingest` and have it transparently proxy to `eu.i.posthog.com`.

### `.env.example`
Add the new variables with placeholder values and a comment pointing to the EU Cloud dashboard.

### `app/layout.tsx`
- Wrap children in `<PostHogProvider>`.
- Mount `<PostHogPageView />` (in a `<Suspense>` boundary, same pattern as `<MetaPageView>`).
- Mount `<PostHogIdentify />` once.

### `app/actions/waitlist.ts`
After the existing Meta CAPI `Lead` call, add `captureWaitlistLead({ email, role, companySize, referralCode, status })`. The helper internally uses a generated `distinctId` (PostHog's `$anon_id` cookie will be set on the client; on the server we pass the email and let the SDK attach it as a property).

### `app/actions/auth.ts`
- In `signupAction` (auto-login branch): call `identifyServerUser({ distinctId: data.user.id, userId, email, name, workspaceId, workspaceSlug })` then `captureSignup({ userId, email, status: 'signed_in' })`. In the email-pending branch: call `captureSignup({ email, status: 'pending_email_confirmation' })`.
- In `loginAction`: call `identifyServerUser` + `captureLogin({ userId, email })`.

### `app/(workspace)/[workspaceSlug]/subscription/_components/subscription-client.tsx`
After the existing `trackInitiateCheckout` call, add `posthog.capture('initiate_checkout', { plan_id, plan_name, value, currency })`.

### `app/api/webhooks/stripe/route.ts`
- In `checkout.session.completed` after the existing Meta `Purchase`: call `capturePurchase({ userId, email, planName, value, currency, source: 'checkout' })`.
- In `invoice.payment_succeeded` after the existing Meta `Purchase`: call `capturePurchase({ email, planName, value, currency, source: 'invoice' })`.
- Webhook will also call `posthog.group('workspace', workspaceId, { plan: planName })` so the workspace's events group correctly in PostHog.

---

## 4. Event taxonomy

| PostHog event | Trigger | Person/group properties |
|---|---|---|
| `$pageview` (auto) | Every route change | `$current_url` |
| `waitlist_joined` | `Lead` from waitlist | email, role, company_size, referral_code, status |
| `signup_completed` | Signup success | email, status (signed_in / pending_email) |
| `logged_in` | Login success | email |
| `initiate_checkout` | "Upgrade" click | plan_id, plan_name, value, currency |
| `purchase_completed` | Stripe webhook (both events) | email, plan_name, value, currency, source |

Auto-captured events (`$autocapture`, `$rageclick`, `$pageleave`) come for free with `autocapture: true`.

Group analytics: every identified user is added to a `workspace` group keyed by `workspaceId` with properties `{ name, slug, plan }`. This lets you filter funnels by workspace tier.

---

## 5. Verification

1. Set `NEXT_PUBLIC_POSTHOG_KEY` and `POSTHOG_PROJECT_API_KEY` from the EU Cloud project settings (same value is fine; project API key is documented in the EU dashboard under Project → Settings → Project → API Keys).
2. `npm run dev`. In the EU PostHog dashboard → Activity, confirm `$pageview` events stream in as you click around.
3. Submit the waitlist form. Confirm `waitlist_joined` arrives, the person profile has `email` set, and the `$anon_id` cookie is set in DevTools.
4. Sign up, confirm `signup_completed` arrives and the person profile gets the auth user ID merged in.
5. In PostHog → Recordings, start a session on the public delivery page, enter a passcode, scrub the recording — passcode input value should be `***`.
6. Run `npm run build` to confirm types.

---

## 6. Out of scope (explicitly)

- **Feature flags / experiments.** Not requested. `getPostHogServer()` is built to be extended if you want to add `isFeatureEnabled('flag', distinctId)` later.
- **A/B testing framework.** Same.
- **Reverse proxy auth.** The rewrite is open to the world, which matches the standard PostHog setup. If you want auth/rate-limiting, add it as middleware on `/ingest/*`.
- **Server-side session replay import.** PostHog Cloud does not support importing replays server-side; replay is a browser feature only.
- **EU data residency configuration beyond the host URL.** PostHog EU Cloud handles this.

---

## 7. Sequencing

1. `npm install posthog-js posthog-node`.
2. Add env schema + `.env.example` + `next.config.js` rewrites.
3. Add `lib/posthog/{server,client,index}.ts` and the three components in `components/posthog/`.
4. Mount in `app/layout.tsx`. At this point $pageview + auto-capture + session replay work.
5. Wire the conversion events in `waitlist.ts`, `auth.ts`, `subscription-client.tsx`, and the Stripe webhook.
6. Verify in the EU dashboard.

Each step is independently testable.

---

## 8. How to use it day-to-day

A short primer so the team can use PostHog once it's in:

**Dashboard tour (eu.posthog.com):**
- **Activity** — live event stream. Filter by event name, person, or group. Useful for confirming events arrive during dev.
- **Insights** — trends, funnels, retention. The default landing. Build a funnel for `waitlist_joined → signup_completed → purchase_completed` to see conversion.
- **Recordings** — session replays. Filter by URL, person, or by the events they fired.
- **Persons** — searchable list of identified users with all their properties. Each person shows their full event timeline.
- **Groups** — the `workspace` group we set. Shows workspace-level rollups (total events, distinct users, plan).

**Common queries you'll want to build:**
- *How many waitlist signups came from the `ref=...` param?* — Insight → `waitlist_joined` → break down by `referral_code`.
- *What % of Pro-plan users actually upload a video?* — Insight → Funnel → `purchase_completed` (filter by `plan_name = "Pro"`) → `upload_initiated`.
- *Which pages have the highest rage-click rate?* — Insights → Trends → `$rageclick` → break down by `$current_url`.
- *Show me every session on `/waitlist` in the last 7 days that didn't complete the form.* — Recordings → filter URL contains `/waitlist`, exclude events = `waitlist_joined`.

**For debugging a specific user:**
- Persons → search by email → click into the profile → see full event history. If the issue is visual, jump to their latest recording.

**Group analytics (workspaces):**
- Insights → filter by Group `workspace` = `<id>` to see a single workspace's activity. Compare workspaces side by side by adding the group as a breakdown.

**Creating a feature flag later (when you're ready):**
- PostHog dashboard → Feature Flags → New. Choose rollout %, target by `workspace.plan = "pro"`, etc.
- Server-side check: `await posthog.isFeatureEnabled('flag-key', distinctId)`.
- Client-side: `useFeatureFlagEnabled('flag-key')` from `posthog-js/react` (already available with the SDK we install).

**Local dev tip:** PostHog in dev can pollute your production data. Either:
- Use a separate dev project in PostHog and put its key in `.env.local`, or
- Set `POSTHOG_ENABLED=false` in `.env.local` and only enable for staging/prod.

The implementation defaults to "enabled when keys are present" which is the right call for staging/prod but you'll want to be explicit about local dev.