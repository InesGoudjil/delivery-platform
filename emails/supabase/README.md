# Supabase auth emails

Supabase sends the sign-up confirmation and the password reset itself. These two templates
carry the client's copy from the CineSpace Email Library (emails 8 and 34). Paste them into the
dashboard; the files here are the source of truth.

## Paste the templates (hosted project)

1. Supabase dashboard → Authentication → Email Templates.
2. **Confirm signup**: subject `Confirm your email for CineSpace`; body from `confirm-signup.html`.
3. **Reset password**: subject `Reset your CineSpace password`; body from `reset-password.html`.

Both use `{{ .ConfirmationURL }}`, which Supabase fills with the link.

## Sender (SMTP)

Authentication → SMTP Settings → enable custom SMTP, with ZeptoMail:

- Sender name: `CineSpace`. Sender address: a verified address on the sending domain (`noreply@cinespace.film` today).
- Host, port and credentials: ZeptoMail's SMTP settings for the region the account uses. The user is
  `emailapikey` and the password is the Send Mail Token; check both against the ZeptoMail console.
- The domain needs SPF, DKIM and DMARC before these emails reach Gmail reliably (roadmap 3.4).

## Known gaps

- **Link lifetime.** The library says the confirmation link works for 24 hours and the reset link for
  1 hour. Supabase doesn't document separate lifetimes for these links, so check the real expiry in
  Mailpit (local) or in a staging test before launch. If it can't be split, one of the two copies is wrong.
- **First names.** Auth emails greet with "Hi there," because Supabase doesn't pass the first name
  to these templates.
- **Email change (email 35).** Supabase's notice to the old address gives `{{ .OldEmail }}`, but
  the new address isn't documented for it and the library's date has no variable. Not built here: it
  needs our own send (a Send Email hook) or a shorter copy.
- **Config file.** `supabase/config.toml` is git-ignored, so the template paths aren't committed
  there. Use the dashboard, or un-ignore the config when roadmap 6.1 lands.
