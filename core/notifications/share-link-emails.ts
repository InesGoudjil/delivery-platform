import { wrapEmailTemplate } from "@/core/providers/email/templates";
import { escapeHtml, oneLine, safeHref } from "@/lib/security/html";

/** Emails about share links: the studio hears when a client first opens a link. */

export interface LinkOpenedEmailProps {
  brandName: string;
  deliveryTitle: string;
  linkLabel: string;
  recipientName?: string | null;
  dashboardUrl: string;
}

export function renderLinkOpenedEmail({
  brandName,
  deliveryTitle,
  linkLabel,
  recipientName,
  dashboardUrl,
}: LinkOpenedEmailProps): { subject: string; html: string } {
  const who = recipientName ? oneLine(recipientName, 80) : "Your client";
  const subject = `👀 ${who} opened “${oneLine(deliveryTitle, 100)}”`;
  const href = safeHref(dashboardUrl);

  const contentHtml = `
    <div style="display: inline-block; background-color: #18181b; border: 1px solid #27272a; color: #f5551d; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; margin-bottom: 16px;">
      Link opened
    </div>
    <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 700; color: #ffffff;">
      ${escapeHtml(who)} opened the delivery
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #a1a1aa; line-height: 1.5;">
      The link <strong style="color: #ffffff;">${escapeHtml(oneLine(linkLabel, 80))}</strong> to
      <strong style="color: #ffffff;">${escapeHtml(oneLine(deliveryTitle, 100))}</strong> was opened for the first time.
    </p>
    ${
      href !== "#"
        ? `<div style="text-align: center; margin: 32px 0 20px 0;">
      <a href="${escapeHtml(href)}" class="btn" style="background-color: #f5551d; color: #000000; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; display: inline-block;">
        See the delivery's links &rarr;
      </a>
    </div>`
        : ""
    }
    <p style="font-size: 12px; color: #71717a; text-align: center; margin: 0;">
      Sent once per link, because &ldquo;First open&rdquo; alerts are on for it.
    </p>
  `;

  return {
    subject,
    html: wrapEmailTemplate({
      title: subject,
      previewText: `${who} opened ${oneLine(deliveryTitle, 100)} through the link “${oneLine(linkLabel, 80)}”.`,
      brandName,
      contentHtml,
    }),
  };
}
