import { NextRequest, NextResponse } from "next/server";
import { ResendEmailProvider } from "@/core/providers/email";
import {
  renderWaitlistWelcomeEmail,
  renderWaitlistInviteEmail,
  renderResetPasswordEmail,
  renderMemberInvitationEmail,
  renderDeliveryReviewEmail,
  renderCutApprovedEmail,
  renderNewFeedbackEmail,
  renderConfirmSignupEmail,
} from "@/core/providers/email/templates";

/**
 * Dev-only email template preview & test dispatch route.
 * URL: http://localhost:3000/api/dev/emails
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not available in production", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "index";
  const sendTo = searchParams.get("sendTo");

  const templates: Record<string, { subject: string; html: string }> = {
    "waitlist-welcome": renderWaitlistWelcomeEmail({
      position: 14,
      referralCode: "PROMO2026",
      referralLink: "http://localhost:3000?ref=PROMO2026",
      totalWaiting: 1240,
    }),
    "waitlist-invite": renderWaitlistInviteEmail({
      inviteLink: "http://localhost:3000/invite/dev-test-token",
      expiresInDays: 7,
    }),
    "password-reset": renderResetPasswordEmail({
      resetLink: "http://localhost:3000/reset-password?token=dev-test-token",
      userEmail: "creator@cinespace.film",
    }),
    "confirm-signup": renderConfirmSignupEmail({
      confirmLink: "http://localhost:3000/api/auth/callback?token=dev-confirm-token",
    }),
    "member-invite": renderMemberInvitationEmail({
      inviterName: "Christopher Nolan",
      workspaceName: "Syncopy Films",
      role: "Editor",
      inviteLink: "http://localhost:3000/invite/collab-invite-token",
    }),
    "delivery-review": renderDeliveryReviewEmail({
      brandName: "Apex Cine Studio",
      projectTitle: "Nike - 'Never Stop' Campaign Cut v3",
      projectDescription: "Latest 4K color grade and sound mix ready for client review and approval.",
      reviewUrl: "http://localhost:3000/deliver/demo-share-token",
      customMessage: "Hey team, please review the color balance at 00:45. Let us know if this cut is good for final master export.",
      isPasscodeProtected: true,
    }),
    "cut-approved": renderCutApprovedEmail({
      brandName: "Apex Cine Studio",
      projectTitle: "Nike - 'Never Stop' Campaign Cut v3",
      approvedByName: "Sarah Jenkins (Creative Director)",
      dashboardUrl: "http://localhost:3000/studio/deliveries/demo-id",
    }),
    feedback: renderNewFeedbackEmail({
      brandName: "Apex Cine Studio",
      projectTitle: "Nike - 'Never Stop' Campaign Cut v3",
      authorName: "Sarah Jenkins",
      commentText: "Love the cut transition here! Can we increase the dialogue audio by +2dB over the music bed?",
      timecode: "01:24",
      reviewUrl: "http://localhost:3000/deliver/demo-share-token",
    }),
  };

  // If a live send was requested: ?sendTo=user@example.com&type=waitlist-welcome
  if (sendTo) {
    const selectedTemplate = templates[type] || templates["waitlist-welcome"];
    const emailProvider = new ResendEmailProvider();

    const result = await emailProvider.sendEmail({
      to: sendTo,
      subject: `[TEST] ${selectedTemplate.subject}`,
      html: selectedTemplate.html,
    });

    return NextResponse.json({
      type,
      recipient: sendTo,
      result,
      note: result.messageId?.startsWith("mock_")
        ? "Mock mode active. No RESEND_API_KEY in .env. Output was logged to server terminal."
        : "Dispatched through Resend API.",
    });
  }

  // Gallery of all templates
  if (type === "index" || !templates[type]) {
    const listHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Email Previews & Testing (Dev)</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #09090b; color: #f4f4f5; padding: 40px 20px; margin: 0; }
          .container { max-width: 900px; margin: 0 auto; }
          h1 { font-size: 26px; margin: 0 0 8px 0; color: #fff; }
          p { color: #a1a1aa; margin: 0 0 24px 0; font-size: 14px; line-height: 1.5; }
          .test-send-card { background: #121214; border: 1px solid #27272a; border-radius: 10px; padding: 20px 24px; margin-bottom: 32px; }
          .test-send-card h3 { margin: 0 0 8px 0; font-size: 15px; color: #ff8a45; }
          .test-form { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
          input, select, button { padding: 10px 14px; border-radius: 6px; font-size: 14px; }
          input { background: #18181b; border: 1px solid #3f3f46; color: #fff; flex: 1; min-width: 240px; }
          select { background: #18181b; border: 1px solid #3f3f46; color: #fff; }
          button { background: #f5551d; border: none; color: #fff; font-weight: 600; cursor: pointer; }
          button:hover { background: #e0440f; }
          .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
          a.card { display: block; background: #121214; border: 1px solid #27272a; border-radius: 10px; padding: 18px 20px; color: #fff; text-decoration: none; transition: border-color 0.2s; }
          a.card:hover { border-color: #f5551d; }
          .tag { font-size: 11px; text-transform: uppercase; font-family: monospace; color: #f5551d; font-weight: bold; margin-bottom: 6px; }
          .title { font-size: 16px; font-weight: 600; }
          .subject { font-size: 12px; color: #71717a; margin-top: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📬 CineSpace Email Testing & Previews</h1>
          <p>Inspect responsive templates in the browser or trigger an instant test send to your inbox.</p>

          <div class="test-send-card">
            <h3>⚡ Test Send Live Email to Your Inbox</h3>
            <span style="font-size: 12px; color: #71717a;">Works immediately. If RESEND_API_KEY is not set, it simulates mock delivery and logs to your terminal.</span>
            <form action="/api/dev/emails" method="GET" class="test-form">
              <input type="email" name="sendTo" placeholder="your-email@example.com" required />
              <select name="type">
                ${Object.keys(templates)
                  .map((k) => `<option value="${k}">${k}</option>`)
                  .join("")}
              </select>
              <button type="submit">Send Test Email &rarr;</button>
            </form>
          </div>

          <h3 style="margin-bottom: 14px; font-size: 16px;">Rendered HTML Previews (Click to inspect):</h3>
          <div class="grid">
            ${Object.entries(templates)
              .map(
                ([key, val]) => `
              <a href="/api/dev/emails?type=${key}" class="card" target="_blank">
                <div class="tag">${key}</div>
                <div class="title">${key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</div>
                <div class="subject">${val.subject}</div>
              </a>
            `
              )
              .join("")}
          </div>
        </div>
      </body>
      </html>
    `;
    return new NextResponse(listHtml, {
      headers: { "Content-Type": "text/html" },
    });
  }

  const selected = templates[type];
  return new NextResponse(selected.html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
