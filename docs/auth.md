# Auth setup (Supabase)

What the app expects from each Supabase project (staging and production). The code lives in:
- `app/actions/auth.ts`;
- `app/api/auth/*`;
- `core/security/finish-sign-in.ts`;
- `lib/supabase/middleware.ts`;
- `lib/security/two-factor.ts`.

## Ways in

| Path | Where | Notes |
|---|---|---|
| Email and password | `loginAction` | Follows `?redirect=` (checked by `safeReturnPath`). Rate limit `authLogin`: per IP and email. |
| Sign-up | `signupAction` | Rate limit `authSignup`: per IP. Claims the waitlist invite straight away. Keeps the page to return to in the user's metadata (`signup_redirect`) for the confirmation link. |
| Google | `/api/auth/callback` | Takes a PKCE code. |
| Email links | `/api/auth/confirm` | Takes a `token_hash`. Handles the sign-up confirmation and the password reset (`emails/supabase/README.md`). |
| Two-factor code | `/mfa` | For everyone with an authenticator, after any of the above. |

After each of these, `finishSignIn()` records the device, finds the workspace, and sends users with
an authenticator to `/mfa`. Password resets sign out every other device, as password changes do.

## Two-factor sign-in

Anyone can turn on an authenticator on the Security page. To make sign-in ask for the code:

1. Apply migration `20261116150000_two_factor_sign_in.sql`.
2. In the dashboard, go to Authentication → Auth Hooks, add the Custom Access Token hook, and choose the
   Postgres function `public.custom_access_token_hook`. Locally, in `supabase/config.toml`:

   ```toml
   [auth.hook.custom_access_token]
   enabled = true
   uri = "pg-functions://postgres/public/custom_access_token_hook"
   ```

3. Tokens get the new `mfa_enrolled` claim the next time they're issued: at sign-in, or at the
   hourly refresh.

With the hook on, a session awaiting its code is held at `/mfa` in three places:
- the middleware sends it there from any page that needs a signed-in user;
- `AuthService.getCurrentUser()` treats it as signed out;
- a restrictive RLS policy on every table refuses it, so the Data API is closed to it too.

Without the hook, sign-in still sends these users to `/mfa`, but nothing keeps them there.

Every new table with RLS needs the policy "Two-factor sign-in finished".
`tests/rls/two-factor.test.ts` fails until a new table has it.

To check it: sign in with a test account that has an authenticator. You should land on `/mfa`, and a
workspace URL opened directly should send you back there.

## Rate limits

- **App (Upstash, `lib/upstash/ratelimit-policies.ts`):**
  - `authLogin`: 5 per 15 minutes per IP and email.
  - `authSignup`: 5 per 15 minutes per IP.
  - `passwordReset`: 3 per 15 minutes per IP, and the same per email.
  - If the limiter fails, sign-in still goes through.
  - Production needs the Upstash keys: the in-memory fallback doesn't work on serverless.
- **Supabase:** these calls come from the app's server, so Supabase counts them against the server's
  IP, which all users share. Either raise "sign-ups and sign-ins" and "token refreshes" under
  Authentication → Rate Limits to fit, or turn on IP address forwarding there. Forwarding needs
  the new secret API key on the server; check that RLS still applies before you rely on it.

## Settings checklist

- **SMTP:** Zoho, sending from `contact@cinespace.pro`. Set it up before turning on "Confirm email": the
  built-in sender allows 2 emails an hour.
- **Email templates:** paste them from `emails/supabase`.
- **Email provider:** "Confirm email" and "Secure email change" on.
- **URL configuration:**
  - Site URL `https://cinespace.pro`, with no trailing slash.
  - Redirect URLs: `https://cinespace.pro/**`, plus the staging host.
- **Auth Hooks:** Customize Access Token, set as described above.
- **JWT keys:** the ES256 key is the current one, so the server verifies tokens without calling Supabase.
