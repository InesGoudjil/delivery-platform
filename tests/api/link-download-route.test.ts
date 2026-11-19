import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import * as serverModule from "@/core/server";
import { createDownloadTicket } from "@/lib/security/download-ticket";
import type { ShareLink } from "@/core/entities/share-link";

/**
 * GET /api/links/dl/<ticket>/<filename>: a guest's download through a share link, checked on
 * every use and counted on the link.
 */

const WS = "10000000-0000-4000-8000-00000000000a";
const DEL = "30000000-0000-4000-8000-00000000000a";
const ASSET = "40000000-0000-4000-8000-0000000000a1";
const VERSION = "50000000-0000-4000-8000-0000000000a1";
const KEY = `private/workspaces/${WS}/deliveries/${DEL}/assets/a/v1/1-master.mov`;
const now = new Date().toISOString();

const { GET } = await import("@/app/api/links/dl/[ticket]/[filename]/route");

function makeLink(overrides: Partial<ShareLink> = {}): ShareLink {
  return {
    id: "c0000000-0000-4000-8000-0000000000a1",
    workspaceId: WS,
    deliveryId: DEL,
    token: "masters-token-a-0001",
    label: "Final masters",
    recipientName: null,
    recipientEmail: null,
    isPrimary: false,
    passcodeHash: "scrypt$masters",
    passcodeSealed: null,
    expiresAt: null,
    revokedAt: null,
    deletedAt: null,
    canComment: true,
    canApprove: true,
    canDownload: true,
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

const delivery = { id: DEL, workspaceId: WS, title: "Wedding", status: "in_review", siloStatus: null, shareToken: "primary", createdAt: now, updatedAt: now };

let link: ShareLink;
let admin: any;

function call(ticket: string, filename = "Final_V1.mov") {
  const req = new NextRequest(`http://localhost/api/links/dl/${ticket}/${filename}`);
  return GET(req, { params: Promise.resolve({ ticket, filename }) });
}

beforeEach(() => {
  vi.restoreAllMocks();
  link = makeLink();
  admin = {
    shareLink: {
      findByIdWithDelivery: vi.fn(async (id: string) => (id === link.id ? { link, delivery } : null)),
      recordEvent: vi.fn(async () => ({ recorded: true, firstOpen: false })),
    },
    workspace: { getWorkspaceById: vi.fn(async () => ({ id: WS, suspendedAt: null })) },
    siteSettings: { get: vi.fn(async () => ({ deliveryId: null })) },
    asset: {
      getVersionById: vi.fn(async (id: string) => (id === VERSION ? { id: VERSION, assetId: ASSET, rawFileUrl: KEY, transcodingStatus: "ready" } : null)),
      getAssetById: vi.fn(async () => ({ id: ASSET, workspaceId: WS, deliveryId: DEL, isArchived: false })),
    },
    storage: {
      getSecureDownloadUrl: vi.fn(async (key: string, filename: string) => `https://r2.test/signed/${key}?dl=${encodeURIComponent(filename)}`),
    },
  };
  vi.spyOn(serverModule, "getServerAdminServices").mockResolvedValue(admin);
});

describe("link download tickets", () => {
  it("sends a valid ticket to a short-lived signed URL and counts the download", async () => {
    const res = await call(createDownloadTicket(link, VERSION));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain(`https://r2.test/signed/${KEY}`);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(admin.storage.getSecureDownloadUrl).toHaveBeenCalledWith(KEY, "Final_V1.mov", false, 600);
    await vi.waitFor(() => expect(admin.shareLink.recordEvent).toHaveBeenCalledWith(link, "download", { assetId: ASSET }));
  });

  it("stops working the moment the link is turned off or loses downloads", async () => {
    const ticket = createDownloadTicket(link, VERSION);
    link = makeLink({ revokedAt: now });
    expect((await call(ticket)).status).toBe(403);
    link = makeLink({ canDownload: false });
    expect((await call(ticket)).status).toBe(403);
    expect(admin.storage.getSecureDownloadUrl).not.toHaveBeenCalled();
  });

  it("stops working when the link gets a new URL or passcode", async () => {
    const ticket = createDownloadTicket(link, VERSION);
    link = makeLink({ token: "masters-token-a-0002" });
    expect((await call(ticket)).status).toBe(401);
    link = makeLink({ passcodeHash: "scrypt$changed" });
    expect((await call(ticket)).status).toBe(401);
  });

  it("refuses an expired link, an archived delivery, a suspended studio and the demo room", async () => {
    const ticket = createDownloadTicket(link, VERSION);

    link = makeLink({ expiresAt: new Date(Date.now() - 60_000).toISOString() });
    expect((await call(ticket)).status).toBe(403);
    link = makeLink();

    admin.shareLink.findByIdWithDelivery.mockResolvedValueOnce({ link, delivery: { ...delivery, status: "archived" } });
    expect((await call(ticket)).status).toBe(403);

    admin.workspace.getWorkspaceById.mockResolvedValueOnce({ id: WS, suspendedAt: now });
    expect((await call(ticket)).status).toBe(403);

    admin.siteSettings.get.mockResolvedValueOnce({ deliveryId: DEL });
    expect((await call(ticket)).status).toBe(403);
  });

  it("only serves this delivery's files", async () => {
    const other = createDownloadTicket(link, "50000000-0000-4000-8000-0000000000b1");
    expect((await call(other)).status).toBe(404);
    admin.asset.getAssetById.mockResolvedValueOnce({ id: ASSET, workspaceId: WS, deliveryId: "30000000-0000-4000-8000-00000000000b", isArchived: false });
    expect((await call(createDownloadTicket(link, VERSION))).status).toBe(404);
  });

  it("refuses forged and expired tickets", async () => {
    expect((await call("v1.garbage")).status).toBe(410);
    const past = createDownloadTicket(link, VERSION, Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect((await call(past)).status).toBe(410);
  });
});
