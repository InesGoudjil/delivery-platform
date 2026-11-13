import { wrapEmailTemplate } from "@/core/providers/email/templates";
import { escapeHtml, oneLine, safeHref } from "@/lib/security/html";
import { LIBRARY_EMAILS, type EmailBlock, type LibraryEmailId } from "./email-library";

export type EmailValues = Record<string, string | number | null | undefined>;

/**
 * "cinespace": emails from Pedro, in the CineSpace look.
 * "client": emails from a filmmaker to their client. Pro, Studio and Enterprise show the
 * filmmaker's logo and colours; Starter and Basic show a small "Delivered with CineSpace" line.
 */
export type EmailLayout =
  | { kind: "cinespace" }
  | {
      kind: "client";
      brandName: string;
      logoUrl?: string | null;
      accentColor?: string | null;
      footer: "delivered-with-cinespace" | "none";
    };

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const PLACEHOLDER = /\{\{\s*([a-z_]+)\s*\}\}/g;
const CINESPACE_ACCENT = "#f5551d";
const SUBJECT_MAX = 150;
const QUOTE_MAX = 400;

function valueOf(values: EmailValues, name: string): string {
  const raw = values[name];
  return raw === null || raw === undefined ? "" : String(raw).trim();
}

/** Replaces each placeholder with `format(value)`. The copy around it is trusted library text. */
function fill(template: string, values: EmailValues, format: (value: string) => string): string {
  return template.replace(PLACEHOLDER, (_match, name: string) => format(valueOf(values, name)));
}

function isShown(block: EmailBlock, values: EmailValues): boolean {
  return !block.when || valueOf(values, block.when) !== "";
}

function safeAccent(color: string | null | undefined): string {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : CINESPACE_ACCENT;
}

function absoluteLink(url: string): string {
  if (!/^https?:\/\//i.test(url)) throw new Error("An email link must be an absolute http or https address.");
  return url;
}

function blockHtml(block: EmailBlock, values: EmailValues, accent: string, buttonLabel: string): string {
  switch (block.kind) {
    case "p":
      return `<p style="margin:0 0 16px;">${fill(block.text, values, escapeHtml)}</p>`;
    case "text":
      return `<p style="margin:0 0 16px;">${fill(block.text, values, (v) => escapeHtml(v).replace(/\n/g, "<br/>"))}</p>`;
    case "quote":
      return `<blockquote style="margin:0 0 16px;padding:12px 16px;border-left:3px solid ${accent};color:#3f3f46;">${fill(
        block.text,
        values,
        (v) => escapeHtml(oneLine(v, QUOTE_MAX))
      )}</blockquote>`;
    case "link": {
      const href = escapeHtml(safeHref(absoluteLink(valueOf(values, block.variable))));
      return (
        `<p style="margin:24px 0 8px;"><a href="${href}" style="display:inline-block;padding:12px 22px;border-radius:999px;` +
        `background:${accent};color:#ffffff;text-decoration:none;font-weight:700;">${escapeHtml(buttonLabel)}</a></p>` +
        `<p style="margin:0 0 16px;font-size:12px;color:#71717a;word-break:break-all;">${href}</p>`
      );
    }
  }
}

function blockText(block: EmailBlock, values: EmailValues, buttonLabel: string): string {
  switch (block.kind) {
    case "p":
    case "text":
      return fill(block.text, values, (v) => v);
    case "quote":
      return `"${fill(block.text, values, (v) => oneLine(v, QUOTE_MAX))}"`;
    case "link":
      return `${buttonLabel}: ${absoluteLink(valueOf(values, block.variable))}`;
  }
}

function clientFooter(layout: Extract<EmailLayout, { kind: "client" }>): string {
  return layout.footer === "delivered-with-cinespace" ? "Delivered with CineSpace" : "";
}

/** Fills one library email and returns its subject, HTML and plain-text versions. Throws when a required value is missing. */
export function renderLibraryEmail(id: LibraryEmailId, values: EmailValues, layout: EmailLayout): RenderedEmail {
  const email = LIBRARY_EMAILS[id];
  for (const name of email.required) {
    if (valueOf(values, name) === "") throw new Error(`The email "${id}" needs a value for "${name}".`);
  }

  const blocks = email.body.filter((block) => isShown(block, values));
  const buttonLabel = email.button ?? "Open";
  const subject = fill(email.subject, values, (v) => oneLine(v, SUBJECT_MAX));

  if (layout.kind === "cinespace") {
    const contentHtml = blocks.map((block) => blockHtml(block, values, CINESPACE_ACCENT, buttonLabel)).join("");
    return {
      subject,
      html: wrapEmailTemplate({
        title: subject,
        previewText: "",
        brandName: "CineSpace",
        contentHtml,
        footerText: "CineSpace",
      }),
      text: blocks.map((block) => blockText(block, values, buttonLabel)).join("\n\n"),
    };
  }

  const accent = safeAccent(layout.accentColor);
  const logoUrl = layout.logoUrl ? safeHref(layout.logoUrl) : "#";
  const logo =
    logoUrl.startsWith("https://") || logoUrl.startsWith("http://")
      ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(layout.brandName)}" height="40" style="display:block;height:40px;max-width:220px;margin:0 0 24px;border:0;"/>`
      : "";
  const footer = clientFooter(layout);
  const footerHtml = footer ? `<p style="margin:32px 0 0;font-size:12px;color:#71717a;">${escapeHtml(footer)}</p>` : "";
  const contentHtml = blocks.map((block) => blockHtml(block, values, accent, buttonLabel)).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;padding:32px;font-size:16px;line-height:1.55;">
<tr><td>${logo}${contentHtml}${footerHtml}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [...blocks.map((block) => blockText(block, values, buttonLabel)), footer].filter(Boolean).join("\n\n");
  return { subject, html, text };
}
