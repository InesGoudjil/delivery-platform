import { describe, it, expect, vi, beforeEach } from "vitest";
import { cookies } from "next/headers";
import * as serverModule from "@/core/server";
import { getClientRoom, requireClientRoom } from "@/core/security/client-room";
import { createRoomAccessToken, roomAccessCookieName } from "@/lib/security/delivery-token";
import { addFeedbackAction } from "@/app/actions/feedback";
import { approveAllAssetsAction, loadMoreDeliveryAssetsAction } from "@/app/actions/deliveries";
import type { ShareLink } from "@/core/entities/share-link";

/**
 * The client-room gate with several links per delivery (share_links): the visitor gets the
 * rules of the link they came in by, never the delivery's primary link, and a link can be
 * turned off on its own.
 */

const WS = "10000000-0000-4000-8000-00000000000a";
const DEL = "30000000-0000-4000-8000-00000000000a";
const ASSET = "40000000-0000-4000-8000-0000000000a1";
const VERSION = "50000000-0000-4000-8000-0000000000a1";
const PRIMARY_TOKEN = "primary_token_room_a_0001";
const AGENCY_TOKEN = "agency_token_room_a_00001";
const now = new Date().toISOString();

// The delivery's own columns mirror its primary link: downloads on, comments on.
const delivery = {
  id: DEL,
  workspaceId: WS,
  title: "Wedding film",
  shareToken: PRIMARY_TOKEN,
  passcodeHash: null as string | null,
  status: "in_review",
  isDownloadAllowed: true,
  isCommentAllowed: true,
  notifyOnDownload: false,
  isWatermarked: false,
  expiresAt: null as string | null,
  siloStatus: null,
  createdAt: now,
  updatedAt: now,
};

function makeLink(overrides: Partial<ShareLink> = {}): ShareLink {
  return {
    id: "c0000000-0000-4000-8000-0000000000a1",
    workspaceId: WS,
    deliveryId: DEL,
    token: AGENCY_TOKEN,
    label: "Agency",
    recipientName: null,
    recipientEmail: null,
    isPrimary: false,
    passcodeHash: null,
    passcodeSealed: null,
    expiresAt: null,
    revokedAt: null,
    deletedAt: null,
    canComment: true,
    canApprove: false,
    canDownload: false,
    notifyOnOpen: false,
    notifyOnDownload: false,
    notifyOnComment: false,
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

let link: ShareLink;
let shareLinksReadable: boolean;
let admin: any;
let user: any;

function services() {
  return {
    shareLink: {
      findByToken: vi.fn(async (token: string) => {
        if (!shareLinksReadable) throw new Error('relation "share_links" does not exist');
        return token === link.token ? { link, delivery } : null;
      }),
      recordEvent: vi.fn(async () => ({ recorded: true, firstOpen: false })),
    },
    delivery: {
      getDeliveryByShareToken: vi.fn(async (token: string) => (token === delivery.shareToken ? delivery : null)),
      getDeliveryById: vi.fn(async () => delivery),
      approveAllAssets: vi.fn(async () => undefined),
      getDeliveryAssetsPage: vi.fn(async () => ({
        assets: [
          {
            id: ASSET,
            title: "Final cut",
            type: "video",
            isApproved: false,
            versions: [{ id: VERSION, versionNumber: 1, rawFileUrl: `private/workspaces/${WS}/deliveries/${DEL}/final.mp4`, isActiveVersion: true, transcodingStatus: "ready" }],
            feedback: [],
          },
        ],
        hasMore: false,
        totalCount: 1,
        approvedCount: 0,
      })),
    },
    asset: {
      getVersionById: vi.fn(async () => ({ id: VERSION, assetId: ASSET, versionNumber: 1 })),
      getAssetById: vi.fn(async () => ({ id: ASSET, workspaceId: WS, deliveryId: DEL, title: "Final cut", isArchived: false })),
    },
    feedback: {
      addFeedback: vi.fn(async (dto: any) => ({ id: "80000000-0000-4000-8000-0000000000ff", isResolved: false, replies: [], createdAt: now, updatedAt: now, ...dto })),
    },
    workspace: { getWorkspaceById: vi.fn(async () => ({ id: WS, suspendedAt: null })) },
    member: { getMember: vi.fn(async () => null), listNotificationRecipients: vi.fn(async () => []) },
    auth: { getCurrentUser: vi.fn(async () => null) },
    siteSettings: { get: vi.fn(async () => ({ deliveryId: null })) },
    settings: { findByWorkspaceId: vi.fn(async () => ({ notifyComments: true, notifyApprovals: true })) },
    commentEmail: { record: vi.fn(async () => undefined) },
    whatsapp: { recordClientComment: vi.fn(async () => null), notifyCutApproved: vi.fn(async () => null) },
    notification: { notifyClientOfApproval: vi.fn(async () => ({ sent: true })) },
    storage: {
      getSecurePlaybackUrl: vi.fn(async (key: string) => `https://r2.example/${key}?X-Amz-Signature=play`),
      getSecureDownloadUrl: vi.fn(async (key: string) => `https://r2.example/${key}?X-Amz-Signature=dl&response-content-disposition=attachment`),
    },
  };
}

beforeEach(async () => {
  vi.restoreAllMocks();
  ((await cookies()) as any).clear();
  link = makeLink();
  shareLinksReadable = true;
  admin = services();
  user = services();
  vi.spyOn(serverModule, "getServerAdminServices").mockResolvedValue(admin);
  vi.spyOn(serverModule, "getServerServices").mockResolvedValue(user);
});

describe("the client room through a share link", () => {
  it("applies the link's rules, not the delivery's primary link's", async () => {
    const room = await getClientRoom(AGENCY_TOKEN);
    expect(room?.state).toBe("open");
    expect(room?.canDownload).toBe(false); // the delivery's primary link allows downloads; this link doesn't
    expect(room?.canApprove).toBe(false);
    expect(room?.canComment).toBe(true);
    expect(room?.linkSource).toBe("table");
  });

  it("never hands a guest the delivery's primary token", async () => {
    const room = await getClientRoom(AGENCY_TOKEN);
    expect(room?.delivery.shareToken).toBe(AGENCY_TOKEN);
    expect(room?.delivery.isDownloadAllowed).toBe(false);
  });

  it("closes a link that's turned off, while the delivery's other links keep working", async () => {
    link = makeLink({ revokedAt: now });
    expect((await getClientRoom(AGENCY_TOKEN))?.state).toBe("revoked");
    await expect(requireClientRoom(AGENCY_TOKEN)).rejects.toThrow("turned off");

    link = makeLink({ token: PRIMARY_TOKEN, isPrimary: true, canDownload: true, canApprove: true });
    expect((await requireClientRoom(PRIMARY_TOKEN)).canDownload).toBe(true);
  });

  it("closes a link past its own expiry", async () => {
    link = makeLink({ expiresAt: new Date(Date.now() - 60_000).toISOString() });
    await expect(requireClientRoom(AGENCY_TOKEN)).rejects.toThrow("expired");
  });

  it("locks a link with its own passcode, and its unlock cookie opens only that link", async () => {
    link = makeLink({ passcodeHash: "scrypt$agency" });
    expect((await getClientRoom(AGENCY_TOKEN))?.state).toBe("locked");

    const subject = { id: DEL, shareToken: AGENCY_TOKEN, passcodeHash: "scrypt$agency" };
    ((await cookies()) as any).set(roomAccessCookieName(AGENCY_TOKEN), createRoomAccessToken(subject));
    expect((await getClientRoom(AGENCY_TOKEN))?.state).toBe("open");

    link = makeLink({ passcodeHash: "scrypt$changed" });
    expect((await getClientRoom(AGENCY_TOKEN))?.state).toBe("locked");
  });

  it("refuses approvals through a link that can't approve", async () => {
    const result = await approveAllAssetsAction({ shareToken: AGENCY_TOKEN }, "Agency person");
    expect(result.error).toContain("Approvals are turned off for this link");
    expect(admin.delivery.approveAllAssets).not.toHaveBeenCalled();
  });

  it("records which link a guest comment came through, and skips the studio alert when the link's comment alerts are off", async () => {
    const result = await addFeedbackAction({ assetVersionId: VERSION, commentText: "Love it", shareToken: AGENCY_TOKEN });
    expect(result.error).toBeUndefined();
    expect(admin.feedback.addFeedback.mock.calls[0][0]).toMatchObject({ shareLinkId: link.id });
    await vi.waitFor(() => expect(admin.shareLink.recordEvent).toHaveBeenCalledWith(link, "comment", expect.anything()));
    expect(admin.commentEmail.record).not.toHaveBeenCalled();
    expect(admin.whatsapp.recordClientComment).not.toHaveBeenCalled();
  });

  it("gives a guest on a link with downloads ticket URLs, not storage URLs", async () => {
    link = makeLink({ canDownload: true });
    const page = await loadMoreDeliveryAssetsAction({ shareToken: AGENCY_TOKEN, page: 1 });
    expect(page.success).toBe(true);
    expect(page.items?.[0].downloadUrl).toMatch(/^\/api\/links\/dl\/v1\./);
    expect(page.items?.[0].downloadUrl).not.toContain("X-Amz");
  });

  it("falls back to the delivery's own columns (its primary link) when share_links can't be read", async () => {
    shareLinksReadable = false;
    const room = await getClientRoom(PRIMARY_TOKEN);
    expect(room?.linkSource).toBe("delivery");
    expect(room?.canDownload).toBe(true);
    expect(await getClientRoom(AGENCY_TOKEN)).toBeNull(); // other links only open once the table is readable

    const result = await addFeedbackAction({ assetVersionId: VERSION, commentText: "Hi", shareToken: PRIMARY_TOKEN });
    expect(result.error).toBeUndefined();
    expect(admin.feedback.addFeedback.mock.calls[0][0].shareLinkId).toBeNull();
  });
});
