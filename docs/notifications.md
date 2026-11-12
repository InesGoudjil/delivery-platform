# Notifications: email and WhatsApp

CineSpace tells studios about client activity, and sends review links to clients, through
Zoho: **ZeptoMail** for email and **Zoho CPaaS** for WhatsApp. (Zoho renamed ZeptoMail to
Zoho CPaaS in September 2026; email keeps working on the ZeptoMail API.)

| What happens | Email | WhatsApp |
| --- | --- | --- |
| A client approves a cut, or every file | Owners and admins | The studio's verified number |
| A client comments or replies | Owners and admins, one email per comment | The studio's number, grouped (below) |
| A client downloads files (delivery has download alerts on, Pro plan) | Owners and admins | The studio's number |
| A studio member sends the review link | The client's email | The client's number, with their consent |
| Workspace invitations, waitlist, Silo restores | As before | – |

Each alert has its own email and WhatsApp switch under **Settings → Notifications**. Only
admins and owners can change them. WhatsApp needs a plan with WhatsApp (Basic and up).

Every message is logged in `notification_logs` and shown on the Notifications page with its
status. A failed WhatsApp message shows Zoho's reason (for example a template that isn't
approved yet).

## Email (ZeptoMail)

Unchanged: `ZEPTOMAIL_API_TOKEN`, `ZEPTOMAIL_FROM_EMAIL`, `ZEPTOMAIL_FROM_NAME`,
`ZEPTOMAIL_API_URL` (see `.env.example`). Set `NEXT_PUBLIC_APP_URL` to the app's public URL:
links in emails and WhatsApp messages are built from it.

## WhatsApp (Zoho CPaaS)

All messages go out from **one CineSpace WhatsApp Business number**. WhatsApp only lets a
business start a conversation with a template that Meta has approved, so every message is a
template plus a few merge fields. Nothing is sent until the token, the sender number and the
template keys are set; until then the app says WhatsApp isn't available (it never pretends).

### Before launch, check with Zoho

WhatsApp is in **beta** on Zoho CPaaS. Before relying on it, confirm with Zoho
(support@zohocpaas.com):

- that WhatsApp sending works for a UAE sender number and UAE recipients, and from which data
  center (`ZOHO_CPAAS_API_URL`);
- the send endpoint and body. The app sends `POST {ZOHO_CPAAS_API_URL}/v1.1/whatsapp` with
  `Authorization: Zoho-encztoken <token>` and
  `{ "from": "<sender>", "to": "<number>", "template_key": "<key>", "merge_info": { "<field>": "<value>" } }`.
  If Zoho's final API differs, only `core/providers/whatsapp/index.ts` needs to change;
- pricing: Meta's per-message rate plus Zoho's margin. Authentication (codes) and utility
  messages are billed per message delivered.

### 1. Set up the sender

1. Verify the business in Meta Business Manager.
2. In the Zoho CPaaS console, connect a WhatsApp Business Account and register the sender
   number (a number not already used in the WhatsApp app). Get the display name "CineSpace"
   approved.
3. Create a send token for the WhatsApp channel. Put it in `ZOHO_CPAAS_WHATSAPP_TOKEN` and the
   sender number in `ZOHO_CPAAS_WHATSAPP_FROM` (with its country code).

### 2. Create the templates

Create each template in the Zoho CPaaS console, in English and, if you want Arabic messages
for Arabic workspaces, in Arabic. Use exactly these variable names. Meta reviews each one;
approval usually takes minutes to a day. Then copy each template's key into its environment
variable. A missing `_AR` key falls back to the English template (with English wording).

The wording below is also in `core/notifications/whatsapp-templates.ts` (a test checks every
template uses exactly its variables). If the console only offers numbered variables
(`{{1}}`, `{{2}}`…), use them in the order listed and tell a developer: the provider would
then send the values in that order.

| Environment variable (`_EN` / `_AR`) | Category | Variables, in order | English wording |
| --- | --- | --- | --- |
| `ZOHO_CPAAS_WA_VERIFICATION_CODE_*` | Authentication | `code` | {{code}} is your CineSpace verification code. For your security, do not share this code. |
| `ZOHO_CPAAS_WA_STUDIO_CUT_APPROVED_*` | Utility | `client_name`, `delivery_title`, `link` | {{client_name}} approved “{{delivery_title}}”. Open the delivery: {{link}} |
| `ZOHO_CPAAS_WA_STUDIO_NEW_COMMENTS_*` | Utility | `client_name`, `comment_count`, `delivery_title`, `excerpt`, `link` | {{client_name}} left {{comment_count}} new comment(s) on “{{delivery_title}}”. Latest: “{{excerpt}}”. Review them: {{link}} |
| `ZOHO_CPAAS_WA_STUDIO_CLIENT_DOWNLOAD_*` | Utility | `item_description`, `delivery_title`, `link` | Your client downloaded {{item_description}} from “{{delivery_title}}”. Open the delivery: {{link}} |
| `ZOHO_CPAAS_WA_CLIENT_DELIVERY_READY_*` | Utility | `studio_name`, `delivery_title`, `link` | {{studio_name}} shared “{{delivery_title}}” with you for review. Watch it and leave your notes here: {{link}} |

For authentication templates Meta fixes most of the wording and may add a copy-code button;
keep the `code` variable. The Arabic wording is in the same file.

### 3. Schedule the comment alerts

Comments are grouped so a client leaving 20 notes doesn't send 20 messages:

- the first comment on a delivery alerts the studio right away;
- later comments are counted; the studio gets one message with the count and the latest
  comment once the client has been quiet for 10 minutes, or at the next comment once 15
  minutes have passed since the last alert.

The "quiet for 10 minutes" part needs a scheduler to call
`GET /api/cron/notifications` every 5 minutes with `Authorization: Bearer <CRON_SECRET>`.
Set `CRON_SECRET` to at least 32 random characters (`openssl rand -hex 32`); the route
refuses to run without it. Any scheduler works:

- **Vercel Cron** (sends the bearer header itself; schedules more often than daily need a
  Pro plan): add to `vercel.json`
  `{ "crons": [{ "path": "/api/cron/notifications", "schedule": "*/5 * * * *" }] }`.
- **Supabase** `pg_cron` + `pg_net`, an external cron service, or Upstash QStash, calling:

  ```bash
  curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://YOUR-APP/api/cron/notifications
  ```

Without a scheduler, the counted comments are still announced, but only when the client
comments again after the 15-minute gap.

### How the studio number is verified

An admin enters the number on the Notifications page; CineSpace sends a 6-digit code to it on
WhatsApp. The code is valid for 10 minutes and allows 5 wrong tries; a workspace can request 5
codes an hour. Only a keyed hash of the code is stored. Only after the right code does the
number become the studio's WhatsApp number. Numbers saved before verification existed are
treated as unverified and get nothing until verified.

The number and its verification can only be written by the server: the database rejects
changes to them through the API, even from the workspace owner
(`20261112100000_whatsapp_notifications.sql`).

### How review links go to clients

In a delivery's share dialog, **WhatsApp Review Link to Client** sends the link from the
CineSpace number. The studio member must tick that the client agreed to WhatsApp messages;
that's recorded on the client (`clients.whatsapp_consent_at`, `whatsapp_consent_by`). The
passphrase is never included: share it separately. A delivery's link can be sent 5 times an
hour, and a workspace can send 100 a day.

**Open WhatsApp** still opens the studio's own WhatsApp with the link (and passphrase) filled
in, for studios that prefer to send it themselves.

## Database

`supabase/migrations/20261112100000_whatsapp_notifications.sql` adds the verification columns
and per-alert switches to `workspace_settings`, the consent columns to `clients`, and the
`whatsapp_comment_batches` table with its two functions (service role only). Apply it with the
usual flow in `docs/database-migrations.md`. The RLS tests are in
`tests/rls/whatsapp-notifications.test.ts` (`npm run test:db`).

## Developing locally

Set `WHATSAPP_PROVIDER=mock` (ignored in production) to log WhatsApp messages instead of
sending them. Verification codes then appear in the server log. Tests:
`npx vitest run tests/services/whatsapp-* tests/actions/whatsapp.test.ts tests/api/cron-notifications.test.ts`.
