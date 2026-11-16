import { describe, it, expect, vi, beforeEach } from "vitest";
import * as serverModule from "@/core/server";
import * as guards from "@/core/security/guards";
import {
  bulkUpdateShareLinksAction,
  createShareLinkAction,
  revealShareLinkPasscodeAction,
  updateShareLinkAction,
} from "@/app/actions/share-links";
import { ShareLinkService, PRIMARY_LINK_REFUSAL } from "@/core/services/share-link.service";
import { sealPasscode } from "@/lib/security/passcode-seal";
import { verifyDeliveryPasscode } from "@/lib/security/passcode";
import { shareLinksPerDelivery } from "@/core/services/subscription.service";
import type { ShareLink } from "@/core/entities/share-link";

/** The studio's share-link actions: plan rules, passcodes, and the main-link rule. */

const WS = "10000000-0000-4000-8000-00000000000a";
const DEL = "30000000-0000-4000-8000-00000000000a";
const LINK = "c0000000-0000-4000-8000-0000000000a1";
const DAY = 24 * 60 * 60 * 1000;
const now = new Date().toISOString();
const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString();

function makeLink(overrides: Partial<ShareLink> = {}): ShareLink {
  return {
    id: LINK,
    workspaceId: WS,
    deliveryId: DEL,
    token: "agency-token-a-0001",
    label: "Agency",
    recipientName: null,
    recipientEmail: null,
    isPrimary: false,
    passcodeHash: null,
    passcodeSealed: null,
    expiresAt: inDays(7),
    revokedAt: null,
    canComment: true,
    canApprove: true,
    canDownload: false,
    notifyOnOpen: false,
    notifyOnDownload: false,
    notifyOnComment: true,
    openCount: 0,
    downloadCount: 0,
    firstOpenedAt: null,
    lastOpenedAt: null,
    lastDownloadedAt: null,
    createdBy: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const settings = {
  label: "Agency review",
  expiresAt: inDays(7),
  canComment: true,
  canApprove: false,
  canDownload: false,
  notifyOnOpen: false,
  notifyOnDownload: false,
  notifyOnComment: true,
};

let services: any;
let plan: { linksPerDelivery: number; passcode: boolean; extended: boolean; alerts: boolean };
let stored: ShareLink;

beforeEach(() => {
  vi.restoreAllMocks();
  plan = { linksPerDelivery: 3, passcode: false, extended: false, alerts: false };
  stored = makeLink();
  services = {
    shareLink: {
      isInstalled: vi.fn(async () => true),
      findById: vi.fn(async () => stored),
      countUnrevoked: vi.fn(async () => 1),
      create: vi.fn(async (dto: any) => makeLink({ ...dto, id: "c0000000-0000-4000-8000-0000000000ff" })),
      update: vi.fn(async (link: ShareLink, patch: any) => ({ ...link, ...patch })),
      listForWorkspace: vi.fn(async () => [stored]),
      updateMany: vi.fn(async (_ws: string, links: ShareLink[]) => links.length),
    },
    subscription: {
      getShareLinksPerDeliveryLimit: vi.fn(async () => plan.linksPerDelivery),
      isPasswordProtectionAllowed: vi.fn(async () => plan.passcode),
      isExtendedLinkExpiryAllowed: vi.fn(async () => plan.extended),
      isDownloadNotificationAllowed: vi.fn(async () => plan.alerts),
    },
    workspace: { getWorkspaceBySlug: vi.fn(async () => ({ id: WS, slug: "studio-a" })) },
  };
  vi.spyOn(serverModule, "getServerServices").mockResolvedValue(services);
  vi.spyOn(guards, "requireDeliveryAccess").mockResolvedValue({
    services,
    delivery: { id: DEL, workspaceId: WS } as any,
    workspace: { id: WS } as any,
    role: "admin",
    user: { id: "user_1" } as any,
  });
  vi.spyOn(guards, "requireWorkspaceMember").mockResolvedValue({ services, role: "admin" } as any);
});

describe("createShareLinkAction", () => {
  it("creates a link with the given rules", async () => {
    const result = await createShareLinkAction(DEL, settings);
    expect(result.success).toBe(true);
    expect(services.shareLink.create).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryId: DEL, label: "Agency review", canApprove: false, createdBy: "user_1" })
    );
  });

  it("stops at the plan's links per delivery", async () => {
    plan.linksPerDelivery = 1;
    const result = await createShareLinkAction(DEL, settings);
    expect(result.success).toBe(false);
    expect((result as any).error).toContain("one link per delivery");
    expect(services.shareLink.create).not.toHaveBeenCalled();
  });

  it("keeps passcodes, alerts and long links to the plans that include them", async () => {
    for (const extra of [
      { passcode: "velvet-falcon-lens-4821" },
      { expiresAt: null },
      { expiresAt: inDays(90) },
      { notifyOnOpen: true },
    ]) {
      const result = await createShareLinkAction(DEL, { ...settings, ...extra });
      expect(result.success, JSON.stringify(extra)).toBe(false);
    }
    expect(services.shareLink.create).not.toHaveBeenCalled();
  });

  it("hashes every passcode, and keeps an encrypted copy only of a generated one", async () => {
    plan.passcode = true;
    await createShareLinkAction(DEL, { ...settings, passcode: "velvet-falcon-lens-4821" });
    const generated = services.shareLink.create.mock.calls[0][0];
    expect(await verifyDeliveryPasscode("velvet-falcon-lens-4821", generated.passcodeHash)).toBe(true);
    expect(generated.passcodeSealed).toMatch(/^v1\./);

    const typed = await createShareLinkAction(DEL, { ...settings, passcode: "MyOwnPassword!" });
    const dto = services.shareLink.create.mock.calls[1][0];
    expect(dto.passcodeSealed).toBeNull();
    // The plain passcode comes back this once, for the studio to copy.
    expect((typed as any).passcode).toBe("MyOwnPassword!");
  });
});

describe("updateShareLinkAction", () => {
  it("lets a link keep an expiry the plan couldn't set today", async () => {
    stored = makeLink({ expiresAt: null });
    const result = await updateShareLinkAction(LINK, { expiresAt: null, label: "Agency team" });
    expect(result.success).toBe(true);
    expect(services.subscription.isExtendedLinkExpiryAllowed).not.toHaveBeenCalled();
  });

  it("checks a new expiry against the plan", async () => {
    const result = await updateShareLinkAction(LINK, { expiresAt: inDays(60) });
    expect(result.success).toBe(false);
    expect(services.shareLink.update).not.toHaveBeenCalled();
  });
});

describe("revealShareLinkPasscodeAction", () => {
  it("shows a generated passcode again, never a typed one", async () => {
    stored = makeLink({ passcodeHash: "scrypt$x", passcodeSealed: sealPasscode("amber-reel-shadow-0042") });
    expect(await revealShareLinkPasscodeAction(LINK)).toEqual({ success: true, passcode: "amber-reel-shadow-0042" });

    stored = makeLink({ passcodeHash: "scrypt$x", passcodeSealed: null });
    const typed = await revealShareLinkPasscodeAction(LINK);
    expect(typed.success).toBe(false);
  });
});

describe("bulkUpdateShareLinksAction", () => {
  it("extends by 7 days, held to 30 days from now without extended link expiry, and skips links that never expire", async () => {
    stored = makeLink({ expiresAt: inDays(28) });
    const never = makeLink({ id: "c0000000-0000-4000-8000-0000000000a2", expiresAt: null });
    services.shareLink.listForWorkspace.mockResolvedValue([stored, never]);

    const result = await bulkUpdateShareLinksAction("studio-a", { linkIds: [stored.id, never.id], action: "extend" });
    expect(result).toEqual({ success: true, changed: 1 });
    const patch = services.shareLink.update.mock.calls[0][1];
    const days = (Date.parse(patch.expiresAt) - Date.now()) / DAY;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThanOrEqual(30);
  });
});

describe("ShareLinkService rules", () => {
  const repo = () => ({
    update: vi.fn(async (_id: string, patch: any) => ({ ...makeLink(), ...patch })),
    delete: vi.fn(async () => undefined),
    setPrimary: vi.fn(async () => undefined),
    updateMany: vi.fn(async (_ws: string, ids: string[]) => ids.length),
  });

  it("never turns off or deletes the main link", async () => {
    const writer = repo();
    const service = new ShareLinkService(repo() as any, writer as any);
    const primary = makeLink({ isPrimary: true });
    expect(() => service.revoke(primary)).toThrow(PRIMARY_LINK_REFUSAL);
    await expect(service.remove(primary)).rejects.toThrow(PRIMARY_LINK_REFUSAL);
    expect(() => service.update(primary, { revokedAt: now })).toThrow(PRIMARY_LINK_REFUSAL);
    expect(writer.update).not.toHaveBeenCalled();

    await service.updateMany(WS, [primary, makeLink({ id: "c0000000-0000-4000-8000-0000000000a2" })], { revokedAt: now });
    expect(writer.updateMany).toHaveBeenCalledWith(WS, ["c0000000-0000-4000-8000-0000000000a2"], { revokedAt: now });
  });

  it("won't make a turned-off link the main one", async () => {
    const service = new ShareLinkService(repo() as any, repo() as any);
    await expect(service.makePrimary(makeLink({ revokedAt: now }))).rejects.toThrow("turned off");
  });
});

describe("links per delivery by plan", () => {
  it("is 1 on Starter, 3 on Basic, unlimited from Pro, unless the plan says otherwise", () => {
    expect(shareLinksPerDelivery({}, "starter")).toBe(1);
    expect(shareLinksPerDelivery({}, undefined)).toBe(1);
    expect(shareLinksPerDelivery({}, "basic")).toBe(3);
    expect(shareLinksPerDelivery({}, "pro")).toBe(-1);
    expect(shareLinksPerDelivery({}, "studio")).toBe(-1);
    expect(shareLinksPerDelivery({ share_links_per_delivery: 5 }, "basic")).toBe(5);
  });
});
