import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { requestAssetUploadAction, confirmUploadCompletedAction } from "@/app/actions/upload";
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
