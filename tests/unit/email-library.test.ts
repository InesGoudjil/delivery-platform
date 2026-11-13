import { describe, expect, it } from "vitest";
import { LIBRARY_EMAILS, placeholdersOf, type LibraryEmailId } from "@/core/notifications/email-library";
import { renderLibraryEmail, type EmailLayout, type EmailValues } from "@/core/notifications/render-email";

const IDS = Object.keys(LIBRARY_EMAILS) as LibraryEmailId[];

const VALUES: EmailValues = {
  first_name: "Sara",
  client_name: "Lost in Tokyo Group",
  basic_price: "$12",
  upgrade_link: "https://app.test/syncopy/subscription",
  inviter_name: "Christopher Nolan",
  studio_name: "Syncopy Films",
  accept_invite_link: "https://app.test/invite/token-1",
  project_name: "Omakase Counter Launch Film",
  version_number: 3,
  approval_timestamp: "13 Nov 2026, 14:05",
  project_link: "https://app.test/syncopy/deliveries/d1",
  delivery_link: "https://app.test/deliver/share-1",
  filmmaker_name: "Syncopy Films",
  reply_preview: "Trim the intro",
  custom_message: "",
  passcode_required: "",
  filmmaker_note: "",
};

const PEDRO: EmailLayout = { kind: "cinespace" };
const CLIENT_STARTER: EmailLayout = {
  kind: "client",
  brandName: "Syncopy Films",
  logoUrl: null,
  accentColor: null,
  footer: "delivered-with-cinespace",
};

describe("the library copy", () => {
  it.each(IDS)("%s uses only placeholders it declares", (id) => {
    const email = LIBRARY_EMAILS[id];
    const declared = new Set([...email.required, ...(email.optional ?? [])]);
    for (const name of placeholdersOf(email)) {
      expect(declared.has(name), `${id} uses {{${name}}} without declaring it`).toBe(true);
    }
  });

  it.each(IDS)("%s declares its required values and no others as required", (id) => {
    const email = LIBRARY_EMAILS[id];
    expect(new Set(email.required).size).toBe(email.required.length);
    for (const name of email.optional ?? []) expect(email.required).not.toContain(name);
  });

  it("keeps the library numbers for the emails wired so far", () => {
    expect(LIBRARY_EMAILS["second-client-link"].number).toBe(14);
    expect(LIBRARY_EMAILS["cut-approved"].number).toBe(27);
    expect(LIBRARY_EMAILS["team-invite"].number).toBe(29);
    expect(LIBRARY_EMAILS["client-review-link"].number).toBe(30);
    expect(LIBRARY_EMAILS["client-new-version"].number).toBe(31);
    expect(LIBRARY_EMAILS["client-reply"].number).toBe(32);
    expect(LIBRARY_EMAILS["client-approval"].number).toBe(33);
    expect(LIBRARY_EMAILS["client-comment"].number).toBe(26);
  });

  it("renders the comment email with the count, the version and the latest comment", () => {
    const { subject, text } = renderLibraryEmail(
      "client-comment",
      {
        first_name: "Sara",
        client_name: "Lost in Tokyo Group",
        comment_count: 2,
        project_name: "Omakase",
        version_number: 3,
        comment_preview: "Cut the intro",
        project_link: "https://app.test/syncopy/deliveries/d1",
      },
      PEDRO
    );
    expect(subject).toBe("Lost in Tokyo Group commented on Omakase");
    expect(text).toContain("Lost in Tokyo Group left 2 comment(s) on Omakase, version 3:");
    expect(text).toContain('"Cut the intro"');
  });
});

describe("renderLibraryEmail", () => {
  it("fills the subject and the body from the library", () => {
    const { subject, html, text } = renderLibraryEmail("cut-approved", VALUES, PEDRO);
    expect(subject).toBe("Lost in Tokyo Group approved Omakase Counter Launch Film");
    expect(html).toContain("version 3 of Omakase Counter Launch Film on 13 Nov 2026, 14:05");
    expect(text).toContain("Hi Sara,");
    expect(text).toContain("https://app.test/syncopy/deliveries/d1");
  });

  it("escapes what people typed, so a comment can't inject markup", () => {
    const { html } = renderLibraryEmail("client-reply", { ...VALUES, reply_preview: "<img src=x onerror=alert(1)>" }, CLIENT_STARTER);
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("refuses to send when a required value is missing", () => {
    expect(() => renderLibraryEmail("cut-approved", { ...VALUES, first_name: "" }, PEDRO)).toThrow(/first_name/);
  });

  it("leaves out a line whose optional value is empty, and keeps it when the value is there", () => {
    const without = renderLibraryEmail("client-review-link", VALUES, CLIENT_STARTER);
    expect(without.text).not.toMatch(/passcode/i);
    const withPasscode = renderLibraryEmail("client-review-link", { ...VALUES, passcode_required: "yes" }, CLIENT_STARTER);
    expect(withPasscode.text).toContain("This page needs a passcode. Syncopy Films will share it with you separately.");
  });

  it("keeps the line breaks of a filmmaker's note", () => {
    const { html } = renderLibraryEmail("client-new-version", { ...VALUES, filmmaker_note: "Line one\nLine two" }, CLIENT_STARTER);
    expect(html).toContain("Line one<br/>Line two");
  });

  it("only links to http or https addresses", () => {
    expect(() =>
      renderLibraryEmail("client-approval", { ...VALUES, delivery_link: "javascript:alert(1)" }, CLIENT_STARTER)
    ).toThrow(/absolute http/);
  });

  it("keeps the subject on one line", () => {
    const { subject } = renderLibraryEmail("client-approval", { ...VALUES, client_name: "Sara\nSmith" }, CLIENT_STARTER);
    expect(subject).toBe("You approved Omakase Counter Launch Film");
    const { subject: subject2 } = renderLibraryEmail("cut-approved", { ...VALUES, client_name: "Sara\n\nSmith" }, PEDRO);
    expect(subject2).not.toContain("\n");
  });

  it("gives Starter and Basic clients the Delivered with CineSpace line", () => {
    const { html, text } = renderLibraryEmail("client-approval", VALUES, CLIENT_STARTER);
    expect(html).toContain("Delivered with CineSpace");
    expect(text).toContain("Delivered with CineSpace");
  });

  it("gives Pro and Studio clients the filmmaker's logo and colour, and no footer", () => {
    const { html } = renderLibraryEmail(
      "client-approval",
      VALUES,
      { kind: "client", brandName: "Syncopy Films", logoUrl: "https://cdn.test/logo.png", accentColor: "#123456", footer: "none" }
    );
    expect(html).toContain('src="https://cdn.test/logo.png"');
    expect(html).toContain("background:#123456");
    expect(html).not.toContain("Delivered with CineSpace");
  });

  it("uses the default colour when a studio's colour isn't a hex colour", () => {
    const { html } = renderLibraryEmail(
      "client-approval",
      VALUES,
      { kind: "client", brandName: "Syncopy Films", accentColor: "red; background:url(x)", footer: "none" }
    );
    expect(html).not.toContain("background:url(x)");
    expect(html).toContain("background:#f5551d");
  });

  it("leaves out a logo that isn't an https or http address", () => {
    const { html } = renderLibraryEmail(
      "client-approval",
      VALUES,
      { kind: "client", brandName: "Syncopy Films", logoUrl: "javascript:alert(1)", footer: "none" }
    );
    expect(html).not.toContain("<img");
  });
});
