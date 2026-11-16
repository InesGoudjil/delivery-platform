# Supabase auth emails

Supabase sends the sign-up confirmation and the password reset itself. These two templates
carry the client's copy from the CineSpace Email Library (emails 8 and 34). Paste them into the
dashboard; the files here are the source of truth.

## Paste the templates (hosted project)

1. Supabase dashboard → Authentication → Email Templates.
2. **Confirm signup**: subject `Confirm your email for CineSpace`; body from `confirm-signup.html`.
3. **Reset password**: subject `Reset your CineSpace password`; body from `reset-password.html`.

Both link to the app's `/api/auth/confirm` with `{{ .TokenHash }}` (`type=email` for sign-up,
`type=recovery` for reset), not to Supabase's `{{ .ConfirmationURL }}`:

- Supabase's link carries a PKCE code, which only works in the browser that asked for it. A reset
  requested on a laptop and opened on a phone fails with it. The token-hash link works anywhere.
- The confirm route sends a reset to `/reset-password`. It sends a sign-up to the page the person
  signed up from (an invite, say), and users with two-factor sign-in to `/mfa` first.
- `{{ .SiteURL }}` must have no trailing slash (`https://cinespace.pro`).
- Supabase inserts template values unescaped, so the templates use no user-controlled values: no
  `{{ .RedirectTo }}` and no `{{ .Data }}`. Those could put someone else's HTML into a real
  CineSpace email.

## Sender (SMTP)

Authentication → SMTP Settings → enable custom SMTP, with Zoho CPaaS (formerly ZeptoMail):

- Sender name: `CineSpace`. Sender address: an address on the domain verified in Zoho (`cinespace.pro`),
  like `ZEPTOMAIL_FROM_EMAIL`.
- Host, port and credentials: the SMTP settings on the same console page as the API key (Mail Agents →
  your agent → SMTP/API). The user is usually `emailapikey` and the password the API key; copy both from there.
- The domain needs SPF, DKIM and DMARC before these emails reach Gmail reliably (roadmap 3.4).

## Known gaps

- **Link lifetime.** The library says the confirmation link works for 24 hours and the reset link for
  1 hour. Supabase doesn't document separate lifetimes for these links, so check the real expiry in
  Mailpit (local) or in a staging test before launch. If it can't be split, one of the two copies is wrong.
- **First names.** Auth emails greet with "Hi there,". `{{ .Data.full_name }}` would work, but the
  person signing up types that name, and Supabase doesn't escape it: anyone could sign up with
  someone else's address and a name full of HTML. Use the name only from our own send (a Send Email
  hook), escaped.
- **Email scanners.** Some company mail filters open every link in an email to check it. That uses
  up a one-time link before the person clicks it, and they then see "This link has expired or was
  already used". If that happens, the confirm route can show a page with a button that checks the
  link only when clicked.
- **Email change (email 35).** Supabase's notice to the old address gives `{{ .OldEmail }}`, but
  the new address isn't documented for it and the library's date has no variable. Not built here: it
  needs our own send (a Send Email hook) or a shorter copy.
- **Config file.** `supabase/config.toml` is git-ignored, so the template paths aren't committed
  there. Use the dashboard, or un-ignore the config when roadmap 6.1 lands.
