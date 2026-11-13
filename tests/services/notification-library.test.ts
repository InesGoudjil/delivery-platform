import { describe, expect, it, vi } from "vitest";
import { NotificationService } from "@/core/services/notification.service";

/** The library emails, sent through NotificationService with fake repositories. */

const WS = "10000000-0000-4000-8000-00000000000a";
const DEL = "30000000-0000-4000-8000-00000000000a";
const CLIENT = "70000000-0000-4000-8000-00000000000c";
const OWNER = "00000000-0000-4000-8000-0000000000a1";
const PASSCODE_HASH = "scrypt$v1$secret-hash-value";

function build(options: { plan?: string; passcode?: boolean; clientEmail?: string | null } = {}) {
  const sent: Array<{ to: unknown; subject: string; html: string; text?: string; fromName?: string; replyTo?: string }> = [];
  const logs: Array<Record<string, unknown>> = [];
  const workspace = {
    id: WS,
    slug: "syncopy",
    brandName: "Syncopy Films",
    ownerId: OWNER,
    logoUrl: "https://cdn.test/logo.png",
    accentColor: "#123456",
  };
  const delivery: Record<string, unknown> = {
    id: DEL,
    workspaceId: WS,
    title: "Omakase Counter Launch Film",
    shareToken: "share-1",
    clientId: CLIENT,
    status: "in_review",
    approvedAt: "2026-11-13T10:05:00.000Z",
    passcodeHash: options.passcode ? PASSCODE_HASH : null,
  };
  const clientEmail = options.clientEmail === undefined ? "client@studio.test" : options.clientEmail;
  const clients = {
    findById: vi.fn(async (id: string) => (id === CLIENT ? { id: CLIENT, name: "Lost in Tokyo Group", email: clientEmail } : null)),
  };
  const notificationRepo = {
    create: vi.fn(async (dto: Record<string, unknown>) => {
      logs.push(dto);
      return { id: "log-1", ...dto };
    }),
    hasSentEmailForDelivery: vi.fn(async () => false),
  };
  const deliveryRepo = {
    findById: vi.fn(async (id: string) => (id === DEL ? delivery : null)),
    listByWorkspaceId: vi.fn(async () => [delivery]),
  };
  const workspaceRepo = { findById: vi.fn(async () => workspace) };
  const emailProvider = {
    sendEmail: vi.fn(async (params: (typeof sent)[number]): Promise<{ success: boolean; messageId?: string; error?: string }> => {
      sent.push(params);
      return { success: true, messageId: `m-${sent.length}` };
    }),
  };
  const subscriptions = {
    getCurrentPlan: vi.fn(async () => ({ slug: options.plan ?? "starter" })),
    getPlanBySlug: vi.fn(async () => ({ slug: "basic", priceCents: 1200 })),
  };
  const authEmails = {
    emailsByUserId: vi.fn(async (ids: string[]) => new Map(ids.map((id) => [id, `${id}@studio.test`]))),
  };
  const service = new NotificationService(
    notificationRepo as never,
    deliveryRepo as never,
    workspaceRepo as never,
    emailProvider as never,
    { clients, subscriptions, authEmails } as never
  );
  return { service, sent, logs, delivery, notificationRepo, emailProvider, deliveryRepo, subscriptions, authEmails };
}

describe("client emails from a filmmaker (library 30)", () => {
  it("sends the review link from the studio 'via CineSpace', with the owner as reply-to", async () => {
    const { service, sent, logs } = build();
    const result = await service.sendDeliveryEmail({
      deliveryId: DEL,
      recipientEmail: "Client@Studio.test",
      origin: "https://app.test",
    });

    expect(result.success).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      to: "client@studio.test",
      fromName: "Syncopy Films via CineSpace",
      replyTo: `${OWNER}@studio.test`,
      subject: "Omakase Counter Launch Film is ready for you to review",
    });
    expect(sent[0].html).toContain("https://app.test/deliver/share-1");
    expect(sent[0].text).toContain("Hi Lost in Tokyo Group,");
    expect(logs[0]).toMatchObject({ workspaceId: WS, projectId: DEL, channel: "email", recipientEmail: "client@studio.test" });
  });

  it("uses the reply-to the filmmaker gave, when they gave one", async () => {
    const { service, sent } = build();
    await service.sendDeliveryEmail({ deliveryId: DEL, recipientEmail: "client@studio.test", replyTo: "sender@studio.test" });
    expect(sent[0].replyTo).toBe("sender@studio.test");
  });

  it("gives Starter clients the Delivered with CineSpace line", async () => {
    const { service, sent } = build({ plan: "starter" });
    await service.sendDeliveryEmail({ deliveryId: DEL, recipientEmail: "client@studio.test" });
    expect(sent[0].html).toContain("Delivered with CineSpace");
  });

  it("gives Studio clients the filmmaker's logo and colour instead of the footer", async () => {
    const { service, sent } = build({ plan: "studio" });
    await service.sendDeliveryEmail({ deliveryId: DEL, recipientEmail: "client@studio.test" });
    expect(sent[0].html).toContain("https://cdn.test/logo.png");
    expect(sent[0].html).toContain("#123456");
    expect(sent[0].html).not.toContain("Delivered with CineSpace");
  });

  it("says a passcode is needed without ever putting the passcode in the email", async () => {
    const { service, sent } = build({ passcode: true });
    await service.sendDeliveryEmail({ deliveryId: DEL, recipientEmail: "client@studio.test" });
    expect(sent[0].text).toContain("This page needs a passcode.");
    expect(sent[0].html).not.toContain(PASSCODE_HASH);
    expect(sent[0].text).not.toContain(PASSCODE_HASH);
  });
});

describe("the studio's approval alert (library 27)", () => {
  it("sends one email to each recipient, greeted by first name, from Pedro", async () => {
    const { service, sent } = build();
    await service.notifyCutApproved({
      deliveryId: DEL,
      approvedByName: "Lost in Tokyo Group",
      recipients: [
        { userId: "u1", email: "nolan@studio.test", firstName: "Christopher" },
        { userId: "u2", email: "admin@studio.test", firstName: null },
      ],
      versionNumber: 3,
      origin: "https://app.test",
    });

    expect(sent).toHaveLength(2);
    expect(sent[0]).toMatchObject({
      to: "nolan@studio.test",
      fromName: "Pedro from CineSpace",
      subject: "Lost in Tokyo Group approved Omakase Counter Launch Film",
    });
    expect(sent[0].text).toContain("Hi Christopher,");
    expect(sent[1].text).toContain("Hi there,");
    expect(sent[0].text).toContain("version 3 of Omakase Counter Launch Film");
    expect(sent[0].text).toContain("https://app.test/syncopy/deliveries/" + DEL);
  });
});

describe("the client's own emails (library 31, 32, 33)", () => {
  it("confirms an approval to the client, with the owner as reply-to", async () => {
    const { service, sent } = build();
    const outcome = await service.notifyClientOfApproval({ deliveryId: DEL, versionNumber: 2, origin: "https://app.test" });

    expect(outcome.sent).toBe(true);
    expect(sent[0]).toMatchObject({
      to: "client@studio.test",
      subject: "You approved Omakase Counter Launch Film",
      replyTo: `${OWNER}@studio.test`,
      fromName: "Syncopy Films via CineSpace",
    });
    expect(sent[0].text).toContain("This confirms you approved version 2 of Omakase Counter Launch Film");
  });

  it("sends a studio reply to the client who commented", async () => {
    const { service, sent } = build();
    const outcome = await service.notifyClientOfReply({ deliveryId: DEL, replyPreview: "Trim the intro\nplease" });

    expect(outcome.sent).toBe(true);
    expect(sent[0].subject).toBe("Syncopy Films replied to your comment");
    expect(sent[0].text).toContain('"Trim the intro please"');
  });

  it("sends nothing when the client has no email address", async () => {
    const { service, sent } = build({ clientEmail: null });
    const outcome = await service.notifyClientOfReply({ deliveryId: DEL, replyPreview: "Hi" });

    expect(outcome).toEqual({ sent: false, reason: "The client has no email address on file." });
    expect(sent).toHaveLength(0);
  });

  it("announces a new version only to a client who already has the link", async () => {
    const { service, sent, notificationRepo } = build();

    const before = await service.notifyClientOfNewVersion({ deliveryId: DEL, versionNumber: 2 });
    expect(before).toEqual({ sent: false, reason: "The client hasn't been sent the link by email yet." });
    expect(sent).toHaveLength(0);

    notificationRepo.hasSentEmailForDelivery.mockResolvedValueOnce(true);
    const after = await service.notifyClientOfNewVersion({ deliveryId: DEL, versionNumber: 2 });
    expect(after.sent).toBe(true);
    expect(sent[0].subject).toBe("Version 2 of Omakase Counter Launch Film is ready");
    expect(notificationRepo.hasSentEmailForDelivery).toHaveBeenCalledWith(DEL, "client@studio.test");
  });
});

describe("the second-client-link email (library 14)", () => {
  it("names the client on the active link and prices the Basic plan from the plan table", async () => {
    const { service, sent } = build();
    const outcome = await service.notifyFilmmakerOfDeliveryLimit({
      workspaceId: WS,
      recipientEmail: "owner@studio.test",
      firstName: "Aymen",
      origin: "https://app.test",
    });

    expect(outcome.sent).toBe(true);
    expect(sent[0]).toMatchObject({ to: "owner@studio.test", subject: "Need a second client link?", fromName: "Pedro from CineSpace" });
    expect(sent[0].text).toContain("Hi Aymen,");
    expect(sent[0].text).toContain("yours is in use with Lost in Tokyo Group.");
    expect(sent[0].text).toContain("Basic gives you 20 client links for $12 a month");
    expect(sent[0].text).toContain("https://app.test/syncopy/subscription");
  });
});

describe("the team invite (library 29)", () => {
  it("names the inviter and the studio, and carries the join link", async () => {
    const { service, sent } = build();
    await service.sendMemberInvitationEmail({
      workspaceId: WS,
      recipientEmail: "editor@studio.test",
      inviterName: "Christopher Nolan",
      inviteToken: "token-1",
      role: "editor",
      origin: "https://app.test",
    });

    expect(sent[0].subject).toBe("Christopher Nolan invited you to Syncopy Films on CineSpace");
    expect(sent[0].text).toContain("https://app.test/invite/token-1");
    expect(sent[0].text).toContain("The invite works for 7 days.");
  });
});

describe("the studio's comment email (library 26)", () => {
  const TWO = [
    { userId: "u1", email: "nolan@studio.test", firstName: "Christopher" },
    { userId: "u2", email: "admin@studio.test", firstName: null },
  ];

  it("sends one email per recipient, from Pedro, with the count and the latest comment", async () => {
    const { service, sent } = build();
    const outcomes = await service.sendClientCommentsEmail({
      deliveryId: DEL,
      recipients: TWO,
      clientName: "Lost in Tokyo Group",
      commentCount: 3,
      preview: "Trim the intro\nplease",
      versionNumber: 2,
      origin: "https://app.test",
    });

    expect(outcomes).toEqual([{ sent: true }, { sent: true }]);
    expect(sent).toHaveLength(2);
    expect(sent[0]).toMatchObject({
      to: "nolan@studio.test",
      fromName: "Pedro from CineSpace",
      subject: "Lost in Tokyo Group commented on Omakase Counter Launch Film",
    });
    expect(sent[0].text).toContain("Hi Christopher,");
    expect(sent[0].text).toContain("Lost in Tokyo Group left 3 comment(s) on Omakase Counter Launch Film, version 2:");
    expect(sent[0].text).toContain('"Trim the intro please"');
    expect(sent[0].text).toContain("https://app.test/syncopy/deliveries/" + DEL);
    expect(sent[1].text).toContain("Hi there,");
  });

  it("reports a recipient whose email failed, without stopping the others", async () => {
    const { service, emailProvider } = build();
    emailProvider.sendEmail.mockResolvedValueOnce({ success: false, error: "Mailbox full" });

    const outcomes = await service.sendClientCommentsEmail({
      deliveryId: DEL,
      recipients: TWO,
      clientName: "Lost in Tokyo Group",
      commentCount: 1,
      preview: "Hi",
      versionNumber: 1,
    });

    expect(outcomes[0]).toEqual({ sent: false, error: "Mailbox full" });
    expect(outcomes[1].sent).toBe(true);
  });
});
