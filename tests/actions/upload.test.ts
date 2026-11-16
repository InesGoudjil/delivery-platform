import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  requestAssetUploadAction,
  confirmUploadCompletedAction,
  requestDeliveryCoverUploadAction,
  confirmDeliveryCoverUploadAction,
} from "@/app/actions/upload";
import { updateDeliveryAppearanceAction } from "@/app/actions/deliveries";
import { POST as streamWebhook } from "@/app/api/webhooks/cloudflare-stream/route";
import * as guards from "@/core/security/guards";
import * as serverModule from "@/core/server";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const WS = "10000000-0000-4000-8000-00000000000a";
const ASSET = "40000000-0000-4000-8000-0000000000a1";
const VERSION = "50000000-0000-4000-8000-0000000000a1";
const UID = "0123456789abcdef0123456789abcdef";

describe("app/actions/upload", () => {
  let admin: any;
  let userServices: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    admin = {
      upload: {
        requestAssetUpload: vi.fn(async () => ({
          asset: { id: ASSET },
          assetVersion: { id: VERSION },
          directUpload: { uploadUrl: "https://r2.example/put", providerUid: "k", uploadType: "presigned_put" },
        })),
        confirmUploadCompleted: vi.fn(async () => ({ id: VERSION, isActiveVersion: true })),
      },
    };
    userServices = {
      asset: {
        getVersionById: vi.fn(async () => ({ id: VERSION, assetId: ASSET })),
        getAssetById: vi.fn(async () => ({ id: ASSET, workspaceId: WS, deliveryId: null })),
      },
      delivery: { getDeliveryById: vi.fn() },
    };
    vi.spyOn(serverModule, "getServerAdminServices").mockResolvedValue(admin);
    vi.spyOn(guards, "requireWorkspaceMember").mockResolvedValue({ workspace: { id: WS }, role: "editor" } as any);
    vi.spyOn(guards, "requireUser").mockResolvedValue({ user: { id: "user_1" }, services: userServices } as any);
  });

  const request = {
    workspaceId: WS,
    projectId: "",
    title: "Cut",
    filename: "cut.mp4",
    fileSizeBytes: 1024,
    contentType: "video/mp4",
    assetType: "video" as const,
    placement: "portfolio" as const,
  };

  it("checks the editor role, then lets the server decide the upload; client-chosen fields don't get through", async () => {
    const result = await requestAssetUploadAction({ ...request, metadata: { isPublic: "true", assetId: "x" }, isPublic: true } as any);

    expect(result.success).toBe(true);
    expect(guards.requireWorkspaceMember).toHaveBeenCalledWith(WS, "editor");
    const dto = admin.upload.requestAssetUpload.mock.calls[0][0];
    expect(dto).toMatchObject({ workspaceId: WS, placement: "portfolio", contentType: "video/mp4", fileSizeBytes: 1024 });
    expect(dto).not.toHaveProperty("metadata");
    expect(dto).not.toHaveProperty("isPublic");
  });

  it("does nothing for callers who aren't editors, or for invalid input", async () => {
    vi.mocked(guards.requireWorkspaceMember).mockRejectedValueOnce(new Error('Forbidden: Requires at least "editor" role permissions.'));
    expect(await requestAssetUploadAction(request)).toMatchObject({ success: false });

    expect(await requestAssetUploadAction({ ...request, assetId: "../../other" })).toMatchObject({ success: false });
    expect(await requestAssetUploadAction({ ...request, fileSizeBytes: 6 * 1024 ** 3 })).toMatchObject({ success: false });
    expect(admin.upload.requestAssetUpload).not.toHaveBeenCalled();
  });

  it("confirms with the version id only, after checking the editor role on the file's own workspace", async () => {
    const result = await confirmUploadCompletedAction({
      assetVersionId: VERSION,
      providerUid: "private/workspaces/10000000-0000-4000-8000-00000000000b/deliveries/x/secret.mp4",
      fileSizeBytes: 1,
    } as any);

    expect(result.success).toBe(true);
    expect(guards.requireWorkspaceMember).toHaveBeenCalledWith(WS, "editor");
    expect(admin.upload.confirmUploadCompleted).toHaveBeenCalledWith({ assetVersionId: VERSION });
  });

  it("doesn't confirm a version the caller can't see, or without the editor role", async () => {
    userServices.asset.getVersionById.mockResolvedValueOnce(null);
    expect(await confirmUploadCompletedAction({ assetVersionId: VERSION })).toMatchObject({ success: false });

    vi.mocked(guards.requireWorkspaceMember).mockRejectedValueOnce(new Error("Forbidden"));
    expect(await confirmUploadCompletedAction({ assetVersionId: VERSION })).toMatchObject({ success: false });

    expect(admin.upload.confirmUploadCompleted).not.toHaveBeenCalled();
  });
});

describe("app/actions/upload: delivery covers", () => {
  const DEL = "30000000-0000-4000-8000-00000000000a";
  const OTHER_WS = "10000000-0000-4000-8000-00000000000b";
  const COVER = `private/workspaces/${WS}/deliveries/${DEL}/cover/60000000-0000-4000-8000-0000000000c1/1-Banner.jpg`;
  const OLD_COVER = `private/workspaces/${WS}/deliveries/${DEL}/cover/60000000-0000-4000-8000-0000000000c0/1-Old.jpg`;
  const coverRequest = { deliveryId: DEL, filename: "Banner.jpg", fileSizeBytes: 2048, contentType: "image/jpeg" };

  let services: any;
  let delivery: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    delivery = { id: DEL, workspaceId: WS, shareToken: "tok", appearance: { cardSize: "L", coverThumbnailUrl: OLD_COVER } };
    services = {
      upload: {
        requestDeliveryCoverUpload: vi.fn(async () => ({
          directUpload: { uploadUrl: "https://r2.example/put", providerUid: COVER, uploadType: "presigned_put" },
          location: COVER,
        })),
        confirmDeliveryCoverUpload: vi.fn(async () => COVER),
        deleteDeliveryCover: vi.fn(async () => true),
      },
      delivery: { updateDelivery: vi.fn(async (_id: string, data: any) => ({ ...delivery, ...data })) },
      storage: { getSecurePlaybackUrl: vi.fn(async (key: string) => `https://r2.example/${key}?X-Amz-Signature=x`) },
      subscription: { isWatermarkAllowed: vi.fn(async () => true) },
    };
    vi.spyOn(guards, "requireDeliveryAccess").mockResolvedValue({
      services,
      delivery,
      workspace: { id: WS },
      role: "editor",
      user: { id: "user_1" },
    } as any);
  });

  it("checks the editor role on the delivery and uploads into the delivery's own workspace", async () => {
    const result = await requestDeliveryCoverUploadAction({ ...coverRequest, workspaceId: OTHER_WS, isPublic: true } as any);

    expect(result).toMatchObject({ success: true, location: COVER });
    expect(guards.requireDeliveryAccess).toHaveBeenCalledWith(DEL, "editor");
    expect(services.upload.requestDeliveryCoverUpload).toHaveBeenCalledWith({
      workspaceId: WS,
      deliveryId: DEL,
      filename: "Banner.jpg",
      fileSizeBytes: 2048,
      contentType: "image/jpeg",
    });
  });

  it("does nothing for callers who aren't editors, or for invalid input", async () => {
    vi.mocked(guards.requireDeliveryAccess).mockRejectedValueOnce(new Error("Forbidden"));
    expect(await requestDeliveryCoverUploadAction(coverRequest)).toMatchObject({ success: false });
    vi.mocked(guards.requireDeliveryAccess).mockRejectedValueOnce(new Error("Forbidden"));
    expect(await confirmDeliveryCoverUploadAction({ deliveryId: DEL, location: COVER })).toMatchObject({ success: false });

    expect(await requestDeliveryCoverUploadAction({ ...coverRequest, deliveryId: "del_1" })).toMatchObject({ success: false });
    expect(await requestDeliveryCoverUploadAction({ ...coverRequest, fileSizeBytes: 11 * 1024 * 1024 })).toMatchObject({
      success: false,
    });
    expect(await confirmDeliveryCoverUploadAction({ deliveryId: DEL, location: "  " })).toMatchObject({ success: false });

    expect(services.upload.requestDeliveryCoverUpload).not.toHaveBeenCalled();
    expect(services.upload.confirmDeliveryCoverUpload).not.toHaveBeenCalled();
    expect(services.delivery.updateDelivery).not.toHaveBeenCalled();
  });

  it("stores the checked cover, keeps the other settings, deletes the cover it replaces and returns a signed URL", async () => {
    const result = await confirmDeliveryCoverUploadAction({ deliveryId: DEL, location: COVER });

    expect(result).toEqual({ success: true, coverUrl: `https://r2.example/${COVER}?X-Amz-Signature=x` });
    expect(services.upload.confirmDeliveryCoverUpload).toHaveBeenCalledWith({ workspaceId: WS, deliveryId: DEL, location: COVER });
    expect(services.delivery.updateDelivery).toHaveBeenCalledWith(DEL, {
      appearance: { cardSize: "L", coverThumbnailUrl: COVER },
    });
    expect(services.upload.deleteDeliveryCover).toHaveBeenCalledWith(WS, DEL, OLD_COVER);
  });

  it("adds a cover to a delivery without appearance settings, leaving the others unset", async () => {
    delivery.appearance = null;
    expect(await confirmDeliveryCoverUploadAction({ deliveryId: DEL, location: COVER })).toMatchObject({ success: true });
    expect(services.delivery.updateDelivery).toHaveBeenCalledWith(DEL, { appearance: { coverThumbnailUrl: COVER } });
    expect(services.upload.deleteDeliveryCover).not.toHaveBeenCalled();
  });

  it("saves nothing when the uploaded cover is refused", async () => {
    services.upload.confirmDeliveryCoverUpload.mockRejectedValueOnce(new Error("This file isn't a valid image."));

    expect(await confirmDeliveryCoverUploadAction({ deliveryId: DEL, location: COVER })).toEqual({
      success: false,
      error: "This file isn't a valid image.",
    });
    expect(services.delivery.updateDelivery).not.toHaveBeenCalled();
    expect(services.upload.deleteDeliveryCover).not.toHaveBeenCalled();
  });

  it("doesn't let the appearance settings set a cover (no more data URLs in the delivery row)", async () => {
    const result = await updateDeliveryAppearanceAction(DEL, {
      cardSize: "S",
      coverThumbnailUrl: "data:image/jpeg;base64,/9j/4AAQ",
    });

    expect(result).toMatchObject({ success: true });
    expect(services.delivery.updateDelivery.mock.calls[0][1].appearance).toMatchObject({
      cardSize: "S",
      coverThumbnailUrl: OLD_COVER,
    });
  });
});

describe("Cloudflare Stream webhook route", () => {
  const post = (body: unknown) =>
    streamWebhook(
      new NextRequest("http://localhost/api/webhooks/cloudflare-stream", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "webhook-signature": "time=1,sig1=00" },
      })
    );

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("refuses requests it can't verify, without touching any version", async () => {
    for (const storage of [{ verifyWebhookSignature: () => false }, {}]) {
      const handleTranscodeWebhook = vi.fn();
      vi.spyOn(serverModule, "getServerAdminServices").mockResolvedValue({
        storage,
        upload: { handleTranscodeWebhook },
      } as any);
      const response = await post({ uid: UID, meta: { assetVersionId: VERSION } });
      expect(response.status).toBe(401);
      expect(handleTranscodeWebhook).not.toHaveBeenCalled();
    }
  });

  it("hands a signed payload to the upload service running with the service role", async () => {
    const verifyWebhookSignature = vi.fn(() => true);
    const handleTranscodeWebhook = vi.fn(async () => ({ updated: 1 }));
    vi.spyOn(serverModule, "getServerAdminServices").mockResolvedValue({
      storage: { verifyWebhookSignature },
      upload: { handleTranscodeWebhook },
    } as any);

    const response = await post({ uid: UID, readyToStream: true });
    expect(response.status).toBe(200);
    expect(verifyWebhookSignature).toHaveBeenCalledWith(
      JSON.stringify({ uid: UID, readyToStream: true }),
      expect.objectContaining({ "webhook-signature": "time=1,sig1=00" })
    );
    expect(handleTranscodeWebhook).toHaveBeenCalledWith({ uid: UID, readyToStream: true });
  });
});
