import { describe, it, expect } from "vitest";
import {
  wrapEmailTemplate,
  renderWaitlistWelcomeEmail,
  renderWaitlistInviteEmail,
  renderResetPasswordEmail,
  renderMemberInvitationEmail,
  renderDeliveryReviewEmail,
  renderCutApprovedEmail,
  renderNewFeedbackEmail,
  renderConfirmSignupEmail,
  renderSiloRestoreCompletedEmail,
  renderPortfolioLeadEmail,
  renderContactFormEmail,
  renderClientDownloadEmail,
} from "@/core/providers/email";

type Rendered = { subject: string; html: string };

const PAYLOADS = [
  { raw: "<script>alert(1)</script>", escaped: "&lt;script&gt;alert(1)&lt;/script&gt;" },
  { raw: '"><img src=x onerror=alert(1)>', escaped: "&quot;&gt;&lt;img src=x onerror=alert(1)&gt;" },
  { raw: "Tom & Jerry", escaped: "Tom &amp; Jerry" },
];

const LINK = "https://cut.app/x";

function hrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
}

function expectPlainSubject(subject: string) {
  expect(subject).not.toMatch(/&(?:amp|lt|gt|quot|#39);/);
  expect(subject).not.toMatch(/[\r\n]/);
}

// Each case puts the same untrusted text into every text field of one template.
const TEXT_CASES: { name: string; inSubject: boolean; render: (text: string) => Rendered }[] = [
  {
    name: "delivery review",
    inSubject: true,
    render: (text) =>
      renderDeliveryReviewEmail({
        brandName: text,
        projectTitle: text,
        projectDescription: text,
        customMessage: text,
        reviewUrl: LINK,
        isPasscodeProtected: true,
      }),
  },
  {
    name: "cut approved",
    inSubject: true,
    render: (text) =>
      renderCutApprovedEmail({ brandName: text, projectTitle: text, approvedByName: text, dashboardUrl: LINK }),
  },
  {
    name: "new feedback",
    inSubject: true,
    render: (text) =>
      renderNewFeedbackEmail({
        brandName: text,
        projectTitle: text,
        authorName: text,
        commentText: text,
        timecode: text,
        reviewUrl: LINK,
      }),
  },
  {
    name: "member invitation",
    inSubject: true,
    render: (text) =>
      renderMemberInvitationEmail({ inviterName: text, workspaceName: text, role: text, inviteLink: LINK }),
  },
  {
    name: "silo restore",
    inSubject: true,
    render: (text) => renderSiloRestoreCompletedEmail({ projectTitle: text, brandName: text, manageUrl: LINK }),
  },
  {
    name: "portfolio lead",
    inSubject: true,
    render: (text) =>
      renderPortfolioLeadEmail({
        clientName: text,
        clientContact: text,
        projectDetails: text,
        filmmakerName: text,
        portfolioHandle: text,
        brandName: text,
      }),
  },
  {
    name: "contact form",
    inSubject: true,
    render: (text) =>
      renderContactFormEmail({ fullName: text, email: text, reason: text, message: text, brandName: text }),
  },
  {
    name: "client download",
    inSubject: true,
    render: (text) =>
      renderClientDownloadEmail({
        brandName: text,
        accentColor: "#123abc",
        deliveryTitle: text,
        itemDescription: text,
        dashboardUrl: LINK,
      }),
  },
  {
    name: "waitlist welcome",
    inSubject: false,
    render: (text) => renderWaitlistWelcomeEmail({ position: 3, referralCode: text, referralLink: LINK }),
  },
  {
    name: "reset password",
    inSubject: false,
    render: (text) => renderResetPasswordEmail({ resetLink: LINK, userEmail: text }),
  },
];

describe.each(TEXT_CASES)("$name email: user text", ({ render, inSubject }) => {
  it.each(PAYLOADS)("escapes $raw in the HTML and keeps the subject plain", ({ raw, escaped }) => {
    const { subject, html } = render(raw);

    expect(html).toContain(escaped);
    expect(html).not.toContain(raw);
    expect(html).not.toMatch(/<script|<img/i);

    expectPlainSubject(subject);
    if (inSubject) expect(subject).toContain(raw);
  });

  it("keeps the subject on one line", () => {
    const { subject } = render("Sarah\r\nBcc: attacker@example.com");
    expect(subject).not.toMatch(/[\r\n]/);
    if (inSubject) expect(subject).toContain("Sarah Bcc: attacker@example.com");
  });

  it("caps long values in the subject", () => {
    const { subject } = render("x".repeat(5000));
    expect(Array.from(subject).length).toBeLessThan(300);
  });
});

// Each case puts the same URL into the template's link.
const URL_CASES: { name: string; render: (url: string) => Rendered }[] = [
  {
    name: "waitlist welcome",
    render: (url) => renderWaitlistWelcomeEmail({ position: 1, referralCode: "R", referralLink: url }),
  },
  { name: "waitlist invite", render: (url) => renderWaitlistInviteEmail({ inviteLink: url }) },
  { name: "reset password", render: (url) => renderResetPasswordEmail({ resetLink: url }) },
  {
    name: "member invitation",
    render: (url) =>
      renderMemberInvitationEmail({ inviterName: "A", workspaceName: "W", role: "editor", inviteLink: url }),
  },
  {
    name: "delivery review",
    render: (url) => renderDeliveryReviewEmail({ brandName: "B", projectTitle: "T", reviewUrl: url }),
  },
  {
    name: "cut approved",
    render: (url) =>
      renderCutApprovedEmail({ brandName: "B", projectTitle: "T", approvedByName: "N", dashboardUrl: url }),
  },
  {
    name: "new feedback",
    render: (url) =>
      renderNewFeedbackEmail({
        brandName: "B",
        projectTitle: "T",
        authorName: "A",
        commentText: "C",
        timecode: "00:01",
        reviewUrl: url,
      }),
  },
  { name: "confirm signup", render: (url) => renderConfirmSignupEmail({ confirmLink: url }) },
  { name: "silo restore", render: (url) => renderSiloRestoreCompletedEmail({ projectTitle: "T", manageUrl: url }) },
  {
    name: "portfolio lead",
    render: (url) =>
      renderPortfolioLeadEmail({
        clientName: "C",
        clientContact: "+1 555 0100",
        projectDetails: "D",
        portfolioHandle: "handle",
        portfolioUrl: url,
      }),
  },
  {
    name: "client download",
    render: (url) =>
      renderClientDownloadEmail({ brandName: "B", deliveryTitle: "T", itemDescription: "I", dashboardUrl: url }),
  },
];

const BAD_URLS = [
  "javascript:alert(1)",
  "JaVaScRiPt:alert(1)",
  " java\tscript:alert(1)",
  "data:text/html;base64,PHNjcmlwdD4=",
  "vbscript:msgbox(1)",
  "//evil.example/x",
];

describe.each(URL_CASES)("$name email: links", ({ render }) => {
  it.each(BAD_URLS)("renders %j as #", (url) => {
    const { html } = render(url);
    const links = hrefs(html).filter((h) => !h.startsWith("mailto:"));

    expect(links.length).toBeGreaterThan(0);
    expect(links.every((h) => h === "#")).toBe(true);
    expect(html).not.toMatch(/javascript|vbscript|data:text|evil\.example/i);
  });

  it("keeps an https link, escaped for the attribute", () => {
    const { html } = render("https://cut.app/deliver/abc?x=1&y=2");
    expect(html).toContain('href="https://cut.app/deliver/abc?x=1&amp;y=2"');
    expect(html).not.toContain("x=1&y=2");
  });
});

describe("wrapEmailTemplate", () => {
  it("escapes its text options and keeps contentHtml as HTML", () => {
    const html = wrapEmailTemplate({
      title: "<script>alert(1)</script>",
      previewText: '"><img src=x onerror=alert(1)>',
      brandName: "Tom & Jerry",
      footerText: "</p><a href=javascript:alert(1)>x</a>",
      contentHtml: "<p>Trusted body</p>",
    });

    expect(html).toContain("<title>&lt;script&gt;alert(1)&lt;/script&gt;</title>");
    expect(html).toContain("&quot;&gt;&lt;img src=x onerror=alert(1)&gt;&nbsp;");
    expect(html).toContain("</span>Tom &amp; Jerry");
    expect(html).toContain("&lt;/p&gt;&lt;a href=javascript:alert(1)&gt;x&lt;/a&gt;");
    expect(html).toContain("<p>Trusted body</p>");
    expect(html).not.toMatch(/<script|<img|<a /i);
  });
});

describe("renderDeliveryReviewEmail", () => {
  it("turns custom-message line breaks into <br/> after escaping", () => {
    const { html } = renderDeliveryReviewEmail({
      brandName: "B",
      projectTitle: "T",
      reviewUrl: LINK,
      customMessage: "Line 1\r\n<b>Line 2</b>\nLine 3",
    });
    expect(html).toContain("Line 1<br/>&lt;b&gt;Line 2&lt;/b&gt;<br/>Line 3");
  });
});

describe("mailto links", () => {
  it("links a plain address", () => {
    const { html } = renderContactFormEmail({ fullName: "Jane", email: "jane.o'neil+films@example.com", message: "Hi" });
    expect(hrefs(html)).toEqual(["mailto:jane.o&#39;neil+films@example.com", "mailto:jane.o&#39;neil+films@example.com"]);
  });

  it.each([
    "jane@example.com?cc=attacker@example.com",
    "jane@example.com&body=hi",
    "jane@example.com\r\nBcc: attacker@example.com",
    'jane@example.com" onclick="alert(1)',
    "not an email",
  ])("does not link %j", (email) => {
    const { html } = renderContactFormEmail({ fullName: "Jane", email, message: "Hi" });
    expect(hrefs(html)).toEqual(["mailto:", "mailto:"]);
    expect(html).not.toContain(' onclick="');
  });

  it("links portfolio-lead contacts only when they are email addresses", () => {
    const lead = { clientName: "C", projectDetails: "D", portfolioHandle: "apex" };
    expect(hrefs(renderPortfolioLeadEmail({ ...lead, clientContact: "jane@example.com" }).html)).toContain(
      "mailto:jane@example.com"
    );
    expect(hrefs(renderPortfolioLeadEmail({ ...lead, clientContact: "+1 555 0100" }).html)).toContain("mailto:");
  });
});

describe("renderClientDownloadEmail", () => {
  const base = {
    brandName: "Apex Cine Studio",
    deliveryTitle: "Spring Campaign",
    itemDescription: '"Final Master.mov"',
    dashboardUrl: "https://cut.app/apex/deliveries/1",
  };

  it("builds a plain-text subject and an escaped body", () => {
    const { subject, html } = renderClientDownloadEmail(base);
    expect(subject).toBe('📥 Client downloaded "Final Master.mov" — Spring Campaign');
    expect(html).toContain("<title>📥 Client downloaded &quot;Final Master.mov&quot; — Spring Campaign</title>");
    expect(html).toContain(
      "Your client just downloaded <strong style=\"color: #ffffff;\">&quot;Final Master.mov&quot;</strong>"
    );
    expect(hrefs(html)).toEqual(["https://cut.app/apex/deliveries/1"]);
  });

  it("uses a valid studio accent color", () => {
    const { html } = renderClientDownloadEmail({ ...base, accentColor: "#123ABC" });
    expect(html).toContain("background-color: #123ABC; color: #ffffff; font-size: 15px");
    expect(html).toContain("color: #123ABC; font-size: 11px");
  });

  it.each([
    "red; background-image: url(https://evil.example/x)",
    '#fff" onmouseover="alert(1)',
    "#12345g",
    "expression(alert(1))",
    "",
    null,
    undefined,
  ])("falls back to the default accent for %j", (accentColor) => {
    const { html } = renderClientDownloadEmail({ ...base, accentColor });
    expect(html).toContain("background-color: #f5551d; color: #ffffff; font-size: 15px");
    expect(html).not.toMatch(/evil\.example|onmouseover|expression|#12345g/);
  });

  it("keeps the button label readable on light accents", () => {
    const { html } = renderClientDownloadEmail({ ...base, accentColor: "#fff" });
    expect(html).toContain("background-color: #fff; color: #09090b;");
  });

  it("leaves out the dashboard button without a URL", () => {
    const { html } = renderClientDownloadEmail({ ...base, dashboardUrl: null });
    expect(html).not.toContain("View Delivery in Dashboard");
    expect(hrefs(html)).toEqual([]);
  });
});

describe("normal input", () => {
  it("renders the cut-approved email as before", () => {
    const { subject, html } = renderCutApprovedEmail({
      brandName: "Apex Cine Studio",
      projectTitle: "Spring Campaign v3",
      approvedByName: "Sarah Jenkins",
      dashboardUrl: "https://cut.app/apex/deliveries/1",
    });
    expect(subject).toBe('✅ Cut Approved: "Spring Campaign v3" by Sarah Jenkins');
    expect(html).toContain('Sarah Jenkins approved "Spring Campaign v3"!');
    expect(html).toContain("Approved by: <strong>Sarah Jenkins</strong>");
    expect(hrefs(html)).toEqual(["https://cut.app/apex/deliveries/1"]);
  });
});
