/**
 * The CineSpace email library (CineSpace Email Library.pdf, 11 Nov 2026): the client's copy,
 * with {{variables}} filled in when an email is sent.
 *
 * Only the emails wired to a trigger are here. The rest are added as they're built (see
 * plans/email-library-analysis-2026-11-13.md). Copy changes come from the client: change the
 * wording here and nowhere else. Lines marked "not in the library" are ours; confirm them.
 *
 * Placeholders: `{{name}}`. A `required` value must be filled or the send stops, so a raw
 * placeholder never reaches an inbox. A block with `when` is left out when that value is empty.
 */

export type LibraryEmailId =
  | "second-client-link"
  | "cut-approved"
  | "team-invite"
  | "client-review-link"
  | "client-new-version"
  | "client-reply"
  | "client-approval"
  | "client-comment";

export type EmailBlock =
  | { kind: "p"; text: string; when?: string }
  /** Several lines, kept as typed (a filmmaker's own note). */
  | { kind: "text"; text: string; when?: string }
  | { kind: "quote"; text: string; when?: string }
  /** A line that is only a link; shown as a button, with the address printed below it. */
  | { kind: "link"; variable: string; when?: string };

export interface LibraryEmail {
  /** Its number in the library. */
  number: number;
  title: string;
  /**
   * "pedro": Pedro writes to a filmmaker. "client": the filmmaker writes to their client,
   * "via CineSpace" under the filmmaker's name.
   */
  from: "pedro" | "client";
  stream: "transactional" | "marketing";
  subject: string;
  required: readonly string[];
  optional?: readonly string[];
  body: readonly EmailBlock[];
  /** Button label. The library has none, so these are ours: confirm with the client. */
  button?: string;
}

export const LIBRARY_EMAILS: Record<LibraryEmailId, LibraryEmail> = {
  "second-client-link": {
    number: 14,
    title: "Delivery link limit reached",
    from: "pedro",
    stream: "transactional",
    subject: "Need a second client link?",
    required: ["first_name", "client_name", "basic_price", "upgrade_link"],
    body: [
      { kind: "p", text: "Hi {{first_name}}," },
      { kind: "p", text: "The Free plan includes one client delivery link, and yours is in use with {{client_name}}." },
      {
        kind: "p",
        text: "Basic gives you 20 client links for {{basic_price}} a month, and Pro makes them unlimited. Each client gets their own page and version history.",
      },
      { kind: "link", variable: "upgrade_link" },
      { kind: "p", text: "Pedro" },
    ],
    button: "See the plans",
  },

  "cut-approved": {
    number: 27,
    title: "Client approved",
    from: "pedro",
    stream: "transactional",
    subject: "{{client_name}} approved {{project_name}}",
    required: ["first_name", "client_name", "version_number", "project_name", "approval_timestamp", "project_link"],
    body: [
      { kind: "p", text: "Hi {{first_name}}," },
      {
        kind: "p",
        text: "{{client_name}} approved version {{version_number}} of {{project_name}} on {{approval_timestamp}}.",
      },
      { kind: "p", text: "That version is now locked as the final. You'll find the approval record on the project page." },
      { kind: "link", variable: "project_link" },
    ],
    button: "Open the project",
  },

  "team-invite": {
    number: 29,
    title: "Team invite (Studio)",
    from: "pedro",
    stream: "transactional",
    subject: "{{inviter_name}} invited you to {{studio_name}} on CineSpace",
    required: ["inviter_name", "studio_name", "accept_invite_link"],
    body: [
      { kind: "p", text: "Hi," },
      {
        kind: "p",
        text: "{{inviter_name}} has invited you to join {{studio_name}} on CineSpace, where the team manages client projects, deliveries, and approvals.",
      },
      { kind: "link", variable: "accept_invite_link" },
      { kind: "p", text: "The invite works for 7 days. If you weren't expecting it, ignore this email." },
    ],
    button: "Accept the invite",
  },

  "client-review-link": {
    number: 30,
    title: "Your video is ready to review",
    from: "client",
    stream: "transactional",
    subject: "{{project_name}} is ready for you to review",
    required: ["client_name", "project_name", "delivery_link", "filmmaker_name"],
    optional: ["custom_message", "passcode_required"],
    body: [
      { kind: "p", text: "Hi {{client_name}}," },
      {
        kind: "p",
        text: "{{project_name}} is ready. You can watch it here on any device, with no account or download needed:",
      },
      { kind: "link", variable: "delivery_link" },
      // Not in the library: the filmmaker's own note, and the passcode notice (never the passcode itself).
      { kind: "text", text: "{{custom_message}}", when: "custom_message" },
      {
        kind: "p",
        text: "This page needs a passcode. {{filmmaker_name}} will share it with you separately.",
        when: "passcode_required",
      },
      { kind: "p", text: "Leave comments on the page if you'd like changes, or tap Approve when you're happy with it." },
      { kind: "p", text: "{{filmmaker_name}}" },
    ],
    button: "Watch and review",
  },

  "client-new-version": {
    number: 31,
    title: "New version uploaded",
    from: "client",
    stream: "transactional",
    subject: "Version {{version_number}} of {{project_name}} is ready",
    required: ["client_name", "version_number", "project_name", "delivery_link", "filmmaker_name"],
    optional: ["filmmaker_note"],
    body: [
      { kind: "p", text: "Hi {{client_name}}," },
      { kind: "p", text: "I've uploaded version {{version_number}} of {{project_name}} with your changes." },
      { kind: "text", text: "{{filmmaker_note}}", when: "filmmaker_note" },
      { kind: "p", text: "It's on the same link as before:" },
      { kind: "link", variable: "delivery_link" },
      { kind: "p", text: "{{filmmaker_name}}" },
    ],
    button: "Watch and review",
  },

  "client-reply": {
    number: 32,
    title: "Reply to your comment",
    from: "client",
    stream: "transactional",
    subject: "{{filmmaker_name}} replied to your comment",
    required: ["client_name", "filmmaker_name", "project_name", "reply_preview", "delivery_link"],
    body: [
      { kind: "p", text: "Hi {{client_name}}," },
      { kind: "p", text: "{{filmmaker_name}} replied to your comment on {{project_name}}:" },
      { kind: "quote", text: "{{reply_preview}}" },
      { kind: "link", variable: "delivery_link" },
    ],
    button: "Open the delivery",
  },

  "client-approval": {
    number: 33,
    title: "Approval confirmation",
    from: "client",
    stream: "transactional",
    subject: "You approved {{project_name}}",
    required: ["client_name", "version_number", "project_name", "approval_timestamp", "filmmaker_name", "delivery_link"],
    body: [
      { kind: "p", text: "Hi {{client_name}}," },
      {
        kind: "p",
        text: "This confirms you approved version {{version_number}} of {{project_name}} on {{approval_timestamp}}.",
      },
      { kind: "p", text: "{{filmmaker_name}} has been notified. You can still watch the approved version here:" },
      { kind: "link", variable: "delivery_link" },
    ],
    button: "Watch the approved version",
  },

  "client-comment": {
    number: 26,
    title: "Client left a comment",
    from: "pedro",
    stream: "transactional",
    subject: "{{client_name}} commented on {{project_name}}",
    required: [
      "first_name",
      "client_name",
      "comment_count",
      "project_name",
      "version_number",
      "comment_preview",
      "project_link",
    ],
    body: [
      { kind: "p", text: "Hi {{first_name}}," },
      {
        kind: "p",
        text: "{{client_name}} left {{comment_count}} comment(s) on {{project_name}}, version {{version_number}}:",
      },
      { kind: "quote", text: "{{comment_preview}}" },
      { kind: "link", variable: "project_link" },
    ],
    button: "Open the project",
  },
};

const PLACEHOLDER = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** Every placeholder the email uses, in its subject and body (for tests and checks). */
export function placeholdersOf(email: LibraryEmail): string[] {
  const names = new Set<string>();
  const scan = (text: string) => {
    for (const match of text.matchAll(PLACEHOLDER)) names.add(match[1]);
  };
  scan(email.subject);
  for (const block of email.body) {
    if (block.kind !== "link") scan(block.text);
    if (block.kind === "link") names.add(block.variable);
    if (block.when) names.add(block.when);
  }
  return [...names];
}
