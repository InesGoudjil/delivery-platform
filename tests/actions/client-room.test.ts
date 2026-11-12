import { describe, it, expect, vi, beforeEach } from "vitest";
import { cookies } from "next/headers";
import * as serverModule from "@/core/server";
import * as guards from "@/core/security/guards";
import { getClientRoom, requireClientRoom } from "@/core/security/client-room";
import {
  createRoomAccessToken,
  guestAuthorCookieName,
  hashGuestAuthorKey,
  roomAccessCookieName,
} from "@/lib/security/delivery-token";
import {
  addFeedbackAction,
  addFeedbackReplyAction,
  deleteFeedbackAction,
  toggleFeedbackResolvedAction,
  updateFeedbackAction,
  updateFeedbackReplyAction,
} from "@/app/actions/feedback";
import {
  approveAllAssetsAction,
  toggleAssetApprovalAction,
  getDeliveryDownloadManifestAction,
  recordClientDownloadAction,
} from "@/app/actions/deliveries";

/**
 * The client-room gate and the actions behind it, against an in-memory "database".
 * Two studios: A owns the room under test, B is someone else.
 */

const WS_A = "10000000-0000-4000-8000-00000000000a";
const WS_B = "10000000-0000-4000-8000-00000000000b";
const DEL_A = "30000000-0000-4000-8000-00000000000a";
const DEL_B = "30000000-0000-4000-8000-00000000000b";
const ASSET_A = "40000000-0000-4000-8000-0000000000a1";
const ASSET_A_TRASHED = "40000000-0000-4000-8000-0000000000a2";
const ASSET_B = "40000000-0000-4000-8000-0000000000b1";
const VERSION_A = "50000000-0000-4000-8000-0000000000a1";
const VERSION_A_TRASHED = "50000000-0000-4000-8000-0000000000a2";
const VERSION_B = "50000000-0000-4000-8000-0000000000b1";
const FB_MINE = "80000000-0000-4000-8000-0000000000a1";
const FB_OTHER_GUEST = "80000000-0000-4000-8000-0000000000a2";
const FB_STUDIO = "80000000-0000-4000-8000-0000000000a3";
const FB_B = "80000000-0000-4000-8000-0000000000b1";
const REPLY_B = "90000000-0000-4000-8000-0000000000b1";
const MEMBER = "00000000-0000-4000-8000-0000000000a1";

const TOKEN_A = "share_token_room_a_0001";
const GUEST_KEY = "guest-key-of-this-browser-0123456789abcdef";

const now = new Date().toISOString();

function makeDelivery(overrides: Record<string, unknown> = {}) {
  return {
    id: DEL_A,
    workspaceId: WS_A,
    title: "Wedding film",
    description: "Private notes",
    shareToken: TOKEN_A,
    passcodeHash: null as string | null,
    status: "in_review",
    isDownloadAllowed: false,
    isCommentAllowed: true,
    notifyOnDownload: true,
    isWatermarked: false,
    expiresAt: null as string | null,
    siloStatus: null as string | null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const assets: Record<string, any> = {
  [ASSET_A]: { id: ASSET_A, workspaceId: WS_A, deliveryId: DEL_A, title: "Final cut", type: "video", isArchived: false },
  [ASSET_A_TRASHED]: { id: ASSET_A_TRASHED, workspaceId: WS_A, deliveryId: DEL_A, title: "Old", type: "video", isArchived: true },
  [ASSET_B]: { id: ASSET_B, workspaceId: WS_B, deliveryId: DEL_B, title: "Studio B film", type: "video", isArchived: false },
};
const versions: Record<string, any> = {
  [VERSION_A]: { id: VERSION_A, assetId: ASSET_A },
  [VERSION_A_TRASHED]: { id: VERSION_A_TRASHED, assetId: ASSET_A_TRASHED },
  [VERSION_B]: { id: VERSION_B, assetId: ASSET_B },
};
const comments: Record<string, any> = {
  [FB_MINE]: { id: FB_MINE, assetVersionId: VERSION_A, authorUserId: null, guestAuthorKeyHash: hashGuestAuthorKey(GUEST_KEY) },
  [FB_OTHER_GUEST]: { id: FB_OTHER_GUEST, assetVersionId: VERSION_A, authorUserId: null, guestAuthorKeyHash: hashGuestAuthorKey("someone-else-entirely-0123456789abcdef") },
  [FB_STUDIO]: { id: FB_STUDIO, assetVersionId: VERSION_A, authorUserId: MEMBER, guestAuthorKeyHash: null },
  [FB_B]: { id: FB_B, assetVersionId: VERSION_B, authorUserId: null, guestAuthorKeyHash: hashGuestAuthorKey(GUEST_KEY) },
};
const replies: Record<string, any> = {
  [REPLY_B]: { id: REPLY_B, feedbackId: FB_B, authorUserId: null, guestAuthorKeyHash: hashGuestAuthorKey(GUEST_KEY) },
};

let delivery: ReturnType<typeof makeDelivery>;
let admin: any;
let user: any;

function feedbackRow(dto: any) {
  return { id: "80000000-0000-4000-8000-0000000000ff", isResolved: false, replies: [], createdAt: now, updatedAt: now, ...dto };
}

function servicesFor(kind: "admin" | "user") {
  return {
    delivery: {
      getDeliveryByShareToken: vi.fn(async (token: string) => (token === delivery.shareToken ? delivery : null)),
      getDeliveryById: vi.fn(async (id: string) => (id === delivery.id ? delivery : null)),
      toggleAssetApproval: vi.fn(async (_d: any, assetId: string, isApproved: boolean) => ({ id: assetId, isApproved })),
      approveAllAssets: vi.fn(async () => undefined),
      getDeliveryWithFullDetails: vi.fn(async () => ({ ...delivery, assets: [], totalAssetsCount: 0 })),
    },
    asset: {
      getAssetById: vi.fn(async (id: string) => assets[id] ?? null),
      getVersionById: vi.fn(async (id: string) => versions[id] ?? null),
    },
    feedback: {
      getFeedback: vi.fn(async (id: string) => comments[id] ?? null),
      getReply: vi.fn(async (id: string) => replies[id] ?? null),
      addFeedback: vi.fn(async (dto: any) => feedbackRow(dto)),
      addReply: vi.fn(async (dto: any) => ({ id: "90000000-0000-4000-8000-0000000000ff", createdAt: now, updatedAt: now, ...dto })),
      deleteFeedback: vi.fn(async () => undefined),
      deleteReply: vi.fn(async () => undefined),
      updateFeedback: vi.fn(async (id: string, commentText: string) => feedbackRow({ ...comments[id], commentText })),
      updateReply: vi.fn(async (id: string, commentText: string) => ({ ...replies[id], commentText, createdAt: now, updatedAt: now })),
      toggleResolved: vi.fn(async (id: string, isResolved: boolean) => feedbackRow({ ...comments[id], isResolved })),
    },
    settings: { findByWorkspaceId: vi.fn(async () => ({ notifyComments: false, notifyDownloads: true })) },
    member: {
      listMembers: vi.fn(async () => [{ userId: MEMBER, role: "owner", email: "owner@studio.test" }]),
      getMember: vi.fn(async () => null),
    },
    notification: { notifyNewFeedback: vi.fn(async () => undefined), notifyClientDownload: vi.fn(async () => undefined) },
    whatsapp: {
      notifyCutApproved: vi.fn(async () => null),
      recordClientComment: vi.fn(async () => null),
      notifyClientDownload: vi.fn(async () => null),
    },
    subscription: { isDownloadNotificationAllowed: vi.fn(async () => true) },
    profile: { getProfile: vi.fn(async () => null) },
    auth: { getCurrentUser: vi.fn(async () => null) },
    storage: {},
    kind,
  };
}

async function cookieStore() {
  return (await cookies()) as any;
}

async function setCookie(name: string, value: string) {
  (await cookieStore()).set(name, value);
}

beforeEach(async () => {
  vi.restoreAllMocks();
  (await cookieStore()).clear();
  delivery = makeDelivery();
  admin = servicesFor("admin");
  user = servicesFor("user");
  vi.spyOn(serverModule, "getServerAdminServices").mockResolvedValue(admin);
  vi.spyOn(serverModule, "getServerServices").mockResolvedValue(user);
});

describe("the client-room gate", () => {
  it("opens only with the share token, never with the delivery id", async () => {
    expect(await getClientRoom(TOKEN_A)).not.toBeNull();
    expect(await getClientRoom(DEL_A)).toBeNull();
    await expect(requireClientRoom(DEL_A)).rejects.toThrow("isn't valid");
  });

  it("stays locked without the unlock cookie, and the cookie is tied to the current passcode", async () => {
    delivery = makeDelivery({ passcodeHash: "scrypt$v1" });
    expect((await getClientRoom(TOKEN_A))?.state).toBe("locked");
    await expect(requireClientRoom(TOKEN_A)).rejects.toThrow("passcode");

    await setCookie(roomAccessCookieName(TOKEN_A), createRoomAccessToken(delivery));
    expect((await getClientRoom(TOKEN_A))?.state).toBe("open");

    delivery = makeDelivery({ passcodeHash: "scrypt$v2" }); // the studio changed the passcode
    expect((await getClientRoom(TOKEN_A))?.state).toBe("locked");
  });

  it("closes expired and archived rooms to guests, but lets the studio preview them", async () => {
    delivery = makeDelivery({ expiresAt: new Date(Date.now() - 60_000).toISOString() });
    await expect(requireClientRoom(TOKEN_A)).rejects.toThrow("expired");

    delivery = makeDelivery({ status: "archived" });
    await expect(requireClientRoom(TOKEN_A)).rejects.toThrow("no longer available");

    user.auth.getCurrentUser.mockResolvedValue({ id: MEMBER, email: "owner@studio.test" });
    user.member.getMember.mockResolvedValue({ role: "owner" });
    expect((await requireClientRoom(TOKEN_A)).canView).toBe(true);
  });
});

describe("comments in the client room", () => {
  it("lets a guest comment on a file of this delivery, as a guest (not as anyone's account)", async () => {
    const result = await addFeedbackAction({ assetVersionId: VERSION_A, commentText: "Trim the intro", shareToken: TOKEN_A });
    expect(result.error).toBeUndefined();
    const dto = admin.feedback.addFeedback.mock.calls[0][0];
    expect(dto).toMatchObject({ assetVersionId: VERSION_A, authorUserId: null, authorName: "Client" });
    expect(dto.guestAuthorKeyHash).toMatch(/^[a-f0-9]{64}$/);
    expect((await cookieStore()).set).toHaveBeenCalledWith(guestAuthorCookieName(TOKEN_A), expect.any(String), expect.any(Object));
    expect(result.feedback).not.toHaveProperty("guestAuthorKeyHash");
  });

  it("counts a guest's comments and replies toward the studio's grouped WhatsApp alert", async () => {
    await addFeedbackAction({ assetVersionId: VERSION_A, commentText: "Trim the intro", shareToken: TOKEN_A });
    await vi.waitFor(() =>
      expect(admin.whatsapp.recordClientComment).toHaveBeenCalledWith(
        expect.objectContaining({ deliveryId: DEL_A, authorName: "Client", commentText: "Trim the intro" })
      )
    );
    await addFeedbackReplyAction({ feedbackId: FB_MINE, commentText: "And the outro", shareToken: TOKEN_A });
    await vi.waitFor(() => expect(admin.whatsapp.recordClientComment).toHaveBeenCalledTimes(2));
  });

  it("refuses comments on another studio's file, or on a file in Trash", async () => {
    for (const assetVersionId of [VERSION_B, VERSION_A_TRASHED]) {
      const result = await addFeedbackAction({ assetVersionId, commentText: "x", shareToken: TOKEN_A });
      expect(result.error).toContain("isn't part of this delivery");
    }
    expect(admin.feedback.addFeedback).not.toHaveBeenCalled();
  });

  it("refuses comments when they're off, when the room is locked, and after the link expired", async () => {
    delivery = makeDelivery({ isCommentAllowed: false });
    expect((await addFeedbackAction({ assetVersionId: VERSION_A, commentText: "x", shareToken: TOKEN_A })).error).toContain(
      "turned off"
    );
    delivery = makeDelivery({ passcodeHash: "scrypt$v1" });
    expect((await addFeedbackAction({ assetVersionId: VERSION_A, commentText: "x", shareToken: TOKEN_A })).error).toContain(
      "passcode"
    );
    delivery = makeDelivery({ expiresAt: new Date(Date.now() - 1000).toISOString() });
    expect((await addFeedbackAction({ assetVersionId: VERSION_A, commentText: "x", shareToken: TOKEN_A })).error).toContain(
      "expired"
    );
    expect(admin.feedback.addFeedback).not.toHaveBeenCalled();
  });

  it("needs the share link or a studio session: a delivery id alone opens nothing", async () => {
    expect((await addFeedbackAction({ assetVersionId: VERSION_A, commentText: "x" })).error).toBeTruthy();
    const byId = await addFeedbackAction({ assetVersionId: VERSION_A, commentText: "x", deliveryId: DEL_A });
    expect(byId.error).toMatch(/Unauthorized/);
    expect(admin.feedback.addFeedback).not.toHaveBeenCalled();
  });

  it("lets a guest change only the comments written from their own browser", async () => {
    await setCookie(guestAuthorCookieName(TOKEN_A), GUEST_KEY);

    expect((await deleteFeedbackAction(FB_MINE, TOKEN_A)).success).toBe(true);
    expect(admin.feedback.deleteFeedback).toHaveBeenCalledWith(FB_MINE);

    for (const id of [FB_OTHER_GUEST, FB_STUDIO]) {
      expect((await deleteFeedbackAction(id, TOKEN_A)).error).toContain("your own comments");
      expect((await updateFeedbackAction({ feedbackId: id, commentText: "edited", shareToken: TOKEN_A })).error).toContain(
        "your own comments"
      );
      expect((await toggleFeedbackResolvedAction(id, true, TOKEN_A)).error).toContain("your own comments");
    }
    expect(admin.feedback.deleteFeedback).toHaveBeenCalledTimes(1);
    expect(admin.feedback.updateFeedback).not.toHaveBeenCalled();
  });

  it("never reaches comments or replies of another delivery, even the guest's own", async () => {
    await setCookie(guestAuthorCookieName(TOKEN_A), GUEST_KEY);
    expect((await deleteFeedbackAction(FB_B, TOKEN_A)).error).toContain("isn't part of this delivery");
    expect((await updateFeedbackReplyAction({ replyId: REPLY_B, commentText: "x", shareToken: TOKEN_A })).error).toContain(
      "isn't part of this delivery"
    );
    expect((await addFeedbackReplyAction({ feedbackId: FB_B, commentText: "x", shareToken: TOKEN_A })).error).toContain(
      "isn't part of this delivery"
    );
    expect(admin.feedback.deleteFeedback).not.toHaveBeenCalled();
    expect(admin.feedback.addReply).not.toHaveBeenCalled();
  });

  it("lets studio members moderate by role, through their own session", async () => {
    const memberContext = (role: string) =>
      vi.spyOn(guards, "requireDeliveryAccess").mockResolvedValue({
        user: { id: "00000000-0000-4000-8000-0000000000a9" } as any,
        services: user,
        delivery: delivery as any,
        workspace: { id: WS_A } as any,
        role: role as any,
      });

    memberContext("viewer");
    expect((await deleteFeedbackAction(FB_STUDIO, undefined, DEL_A)).error).toContain("your own comments");

    memberContext("editor");
    expect((await deleteFeedbackAction(FB_STUDIO, undefined, DEL_A)).success).toBe(true);
    expect(user.feedback.deleteFeedback).toHaveBeenCalledWith(FB_STUDIO);
    expect(admin.feedback.deleteFeedback).not.toHaveBeenCalled();
  });
});

describe("approvals and downloads in the client room", () => {
  it("lets a guest approve a file of this delivery, and returns no secrets", async () => {
    const result = await toggleAssetApprovalAction({ shareToken: TOKEN_A }, ASSET_A, true);
    expect(result.error).toBeUndefined();
    expect(admin.delivery.toggleAssetApproval).toHaveBeenCalledWith(delivery, ASSET_A, true);
    expect(JSON.stringify(result)).not.toContain(TOKEN_A);
    expect(result.delivery).not.toHaveProperty("passcodeHash");
  });

  it("refuses approvals by delivery id from anyone who isn't signed in to the studio", async () => {
    const result = await approveAllAssetsAction(DEL_A, "Client");
    expect(result.error).toMatch(/Unauthorized/);
    expect(admin.delivery.approveAllAssets).not.toHaveBeenCalled();
  });

  it("gives guests download links only when the studio turned downloads on", async () => {
    expect((await getDeliveryDownloadManifestAction({ shareToken: TOKEN_A })).error).toContain("Downloads are turned off");
    delivery = makeDelivery({ isDownloadAllowed: true });
    expect((await getDeliveryDownloadManifestAction({ shareToken: TOKEN_A })).success).toBe(true);
  });

  it("alerts the studio on WhatsApp when a guest approves everything", async () => {
    const result = await approveAllAssetsAction({ shareToken: TOKEN_A }, "Sara");
    expect(result.error).toBeUndefined();
    await vi.waitFor(() =>
      expect(admin.whatsapp.notifyCutApproved).toHaveBeenCalledWith(expect.objectContaining({ deliveryId: DEL_A, approvedByName: "Sara" }))
    );
  });

  it("tells the studio about a download on WhatsApp even when download emails are off", async () => {
    delivery = makeDelivery({ isDownloadAllowed: true });
    admin.settings.findByWorkspaceId.mockResolvedValue({ notifyComments: false, notifyDownloads: false });
    const result = await recordClientDownloadAction({ shareToken: TOKEN_A, assetId: ASSET_A, downloadedCount: 1 });
    expect(result).toMatchObject({ success: true, notified: false });
    expect(admin.notification.notifyClientDownload).not.toHaveBeenCalled();
    await vi.waitFor(() =>
      expect(admin.whatsapp.notifyClientDownload).toHaveBeenCalledWith(
        expect.objectContaining({ deliveryId: DEL_A, downloadedCount: 1, assetTitle: "Final cut" })
      )
    );
  });

  it("emails the studio about a download with the file's real title, not one the browser sent", async () => {
    delivery = makeDelivery({ isDownloadAllowed: true });
    const result = await recordClientDownloadAction({ shareToken: TOKEN_A, assetId: ASSET_A, downloadedCount: 1 });
    expect(result).toMatchObject({ success: true, notified: true });
    expect(admin.notification.notifyClientDownload).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryId: DEL_A, itemDescription: '"Final cut"' })
    );

    admin.notification.notifyClientDownload.mockClear();
    await recordClientDownloadAction({ shareToken: TOKEN_A, assetId: ASSET_B, downloadedCount: 1 });
    expect(admin.notification.notifyClientDownload).toHaveBeenCalledWith(
      expect.objectContaining({ itemDescription: "master deliverables" })
    );
  });
});
