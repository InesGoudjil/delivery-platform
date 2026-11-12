import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CloudflareR2StorageProvider, safeObjectName } from "@/core/providers/storage/cloudflare-r2.provider";
import { CloudflareStreamStorageProvider, toStreamUid } from "@/core/providers/storage/cloudflare-stream.provider";
import { MockStorageProvider } from "@/core/providers/storage/mock-storage.provider";
import { StorageProviderFactory, routeStorageLocation } from "@/core/providers/storage/storage-provider.factory";
import type { CreateUploadUrlParams } from "@/core/providers/storage/storage.provider";

const WS = "2f1a3dfe-1111-4222-8333-444455556666";
const OTHER_WS = "9b9b9b9b-1111-4222-8333-444455556666";
const DEL = "3c3c3c3c-1111-4222-8333-444455556666";
const ASSET = "4d4d4d4d-1111-4222-8333-444455556666";
const UID = "0123456789abcdef0123456789abcdef";

function r2Provider() {
  return new CloudflareR2StorageProvider({
    publicBucket: "media-public",
    privateBucket: "media-private",
    accessKeyId: "AKIDEXAMPLE",
    secretAccessKey: "test-secret",
    endpoint: "https://account.r2.cloudflarestorage.com",
  });
}

function uploadParams(overrides: Partial<CreateUploadUrlParams> = {}): CreateUploadUrlParams {
  return {
    workspaceId: WS,
    deliveryId: DEL,
    assetId: ASSET,
    versionNumber: 2,
    assetTitle: "Director's cut",
    assetType: "video",
    fileSizeBytes: 12345,
    filename: "My Cut #1 (final).mov",
    contentType: "video/quicktime",
    isPublic: false,
    ...overrides,
  };
}

describe("Cloudflare R2: presigned uploads", () => {
  it("signs the content type and exact length into a 15-minute PUT for a server-chosen key", async () => {
    const result = await r2Provider().createDirectUploadUrl(uploadParams());
    const url = new URL(result.uploadUrl);

    expect(url.searchParams.get("X-Amz-SignedHeaders")).toBe("content-length;content-type;host");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("900");
    expect(result.uploadType).toBe("presigned_put");
    expect(result.headers).toEqual({ "Content-Type": "video/quicktime" });
    expect(result.providerUid).toMatch(
      new RegExp(`^private/workspaces/${WS}/deliveries/${DEL}/assets/${ASSET}/v2/\\d+-My_Cut_1_final\\.mov$`)
    );
    expect(url.pathname).toBe(`/media-private/${result.providerUid}`);
  });

  it("keeps private uploads in a delivery of the workspace, and refuses ids that aren't UUIDs", async () => {
    const r2 = r2Provider();
    await expect(r2.createDirectUploadUrl(uploadParams({ deliveryId: undefined }))).rejects.toThrow("Private uploads need a delivery");
    await expect(r2.createDirectUploadUrl(uploadParams({ deliveryId: "../../other" }))).rejects.toThrow();
    await expect(r2.createDirectUploadUrl(uploadParams({ assetId: "asset/../../x" }))).rejects.toThrow("file id");
    await expect(r2.createDirectUploadUrl(uploadParams({ workspaceId: "studio-a" }))).rejects.toThrow("workspace id");
    await expect(r2.createDirectUploadUrl(uploadParams({ fileSizeBytes: 0 }))).rejects.toThrow("exact file size");
  });

  it("files public uploads by placement; only the portfolio flow goes under portfolio/standalone/", async () => {
    const r2 = r2Provider();
    const keyFor = async (placement?: CreateUploadUrlParams["placement"]) =>
      (await r2.createDirectUploadUrl(uploadParams({ isPublic: true, deliveryId: undefined, placement }))).providerUid;

    expect(await keyFor("portfolio")).toMatch(new RegExp(`^public/workspaces/${WS}/portfolio/standalone/films/${ASSET}/v2/`));
    expect(await keyFor("project")).toMatch(new RegExp(`^public/workspaces/${WS}/portfolio/projects/films/${ASSET}/v2/`));
    expect(await keyFor("cover")).toMatch(new RegExp(`^public/workspaces/${WS}/portfolio/covers/${ASSET}/`));
    expect(await keyFor("hero")).toMatch(new RegExp(`^public/workspaces/${WS}/portfolio/hero/${ASSET}/`));
    expect(await keyFor("branding")).toMatch(new RegExp(`^public/workspaces/${WS}/branding/${ASSET}/`));
    expect(await keyFor(undefined)).toMatch(new RegExp(`^public/workspaces/${WS}/portfolio/media/films/${ASSET}/v2/`));
    for (const placement of ["project", "cover", "hero", "branding", undefined] as const) {
      expect(await keyFor(placement)).not.toContain("/standalone/");
    }
  });

  it("makes file names safe for keys and URLs", () => {
    expect(safeObjectName("My Cut #1 (final).mov")).toBe("My_Cut_1_final.mov");
    expect(safeObjectName("../../secret?.mp4")).toBe("secret.mp4");
    expect(safeObjectName("Café crème.JPG")).toBe("Cafe_creme.jpg");
    expect(safeObjectName("%2e%2e%2f.png")).toBe("2e_2e_2f.png");
  });
});

describe("Cloudflare R2: only workspace keys are ever touched", () => {
  it("refuses to sign, read or delete anything outside a workspace prefix, before calling R2", async () => {
    const r2 = r2Provider();
    const send = vi.fn();
    (r2 as any).s3Client.send = send;

    for (const value of [
      "../../etc/passwd",
      "silo/workspaces/x/a.mp4",
      `private/workspaces/${WS}/../${OTHER_WS}/deliveries/x/a.mp4`,
      "private/workspaces/not-a-uuid/a.mp4",
      UID,
      "https://evil.example/file.mp4",
    ]) {
      await expect(r2.deleteAsset(value), value).rejects.toThrow("Not a workspace storage key");
      await expect(r2.getSecurePlaybackUrl(value), value).rejects.toThrow("Not a workspace storage key");
      await expect(r2.headObject(value), value).rejects.toThrow("Not a workspace storage key");
      await expect(r2.readObjectStart(value, 16), value).rejects.toThrow("Not a workspace storage key");
    }
    expect(send).not.toHaveBeenCalled();
  });

  it("reads an object's real size and type with HeadObject, and its first bytes with a ranged GET", async () => {
    const r2 = r2Provider();
    const key = `private/workspaces/${WS}/deliveries/${DEL}/assets/${ASSET}/v1/1-cut.mp4`;
    const send = vi.fn(async (command: any) => {
      if (command.constructor.name === "HeadObjectCommand") return { ContentLength: 2048, ContentType: "video/mp4" };
      return { Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3, 4]) } };
    });
    (r2 as any).s3Client.send = send;

    expect(await r2.headObject(`/api/media/${key}`)).toEqual({ sizeBytes: 2048, contentType: "video/mp4" });
    expect(await r2.readObjectStart(key, 8192)).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(send.mock.calls[0][0].input).toMatchObject({ Bucket: "media-private", Key: key });
    expect(send.mock.calls[1][0].input).toMatchObject({ Bucket: "media-private", Key: key, Range: "bytes=0-8191" });

    send.mockRejectedValueOnce(Object.assign(new Error("NotFound"), { name: "NotFound", $metadata: { httpStatusCode: 404 } }));
    expect(await r2.headObject(key)).toBeNull();
  });
});

describe("Cloudflare Stream: API paths are built from validated UIDs only", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("extracts a UID only from a bare UID, /api/media/<uid> or a Stream delivery URL", () => {
    expect(toStreamUid(UID.toUpperCase())).toBe(UID);
    expect(toStreamUid(`/api/media/${UID}`)).toBe(UID);
    expect(toStreamUid(`https://videodelivery.net/${UID}/manifest/video.m3u8`)).toBe(UID);
    expect(toStreamUid(`https://customer-abc.cloudflarestream.com/${UID}/thumbnails/thumbnail.jpg`)).toBe(UID);
    expect(toStreamUid(`https://evil.example/${UID}/manifest/video.m3u8`)).toBeNull();
    expect(toStreamUid(`private/workspaces/${WS}/deliveries/${DEL}/${UID}.mp4`)).toBeNull();
    expect(toStreamUid("../../zones/abc")).toBeNull();
  });

  it("refuses path injection in status, lookup and delete calls before anything is sent", async () => {
    const stream = new CloudflareStreamStorageProvider({ accountId: "acc", apiToken: "tok" });
    for (const value of ["../../zones/abc/dns_records", `${UID}/../../other`, `?${UID}`, "", `https://evil.example/${UID}`]) {
      await expect(stream.deleteAsset(value), value).rejects.toThrow("Invalid Cloudflare Stream video id");
      await expect(stream.getAssetStatus(value), value).rejects.toThrow("Invalid Cloudflare Stream video id");
      await expect(stream.getStreamVideo(value), value).rejects.toThrow("Invalid Cloudflare Stream video id");
      await expect(stream.getSecureDownloadUrl(value, "a.mp4"), value).rejects.toThrow("Invalid Cloudflare Stream video id");
    }
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await stream.deleteAsset(`https://videodelivery.net/${UID}/manifest/video.m3u8`);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.cloudflare.com/client/v4/accounts/acc/stream/${UID}`,
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("reports a video's creator, size and state, and null when Stream doesn't have it", async () => {
    const stream = new CloudflareStreamStorageProvider({ accountId: "acc", apiToken: "tok" });
    fetchMock.mockResolvedValueOnce(
      Response.json({
        result: { uid: UID, creator: WS, meta: { workspaceId: WS }, size: 4096, duration: 12.5, status: { state: "inprogress" } },
      })
    );
    expect(await stream.getStreamVideo(UID)).toEqual({
      uid: UID,
      creator: WS,
      workspaceId: WS,
      sizeBytes: 4096,
      durationSeconds: 12.5,
      status: "processing",
    });

    fetchMock.mockResolvedValueOnce(new Response("not found", { status: 404 }));
    expect(await stream.getStreamVideo(UID)).toBeNull();
  });

  it("puts only server-decided values into a direct upload's metadata", async () => {
    const stream = new CloudflareStreamStorageProvider({ accountId: "acc", apiToken: "tok" });
    fetchMock.mockResolvedValueOnce(Response.json({ success: true, result: { uid: UID, uploadURL: "https://upload.example/x" } }));

    const result = await stream.createDirectUploadUrl({ ...uploadParams(), maxDurationSeconds: 999999 });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.creator).toBe(WS);
    expect(body.maxDurationSeconds).toBe(21600);
    expect(body.meta).toEqual({ name: "Director's cut", workspaceId: WS, assetId: ASSET, deliveryId: DEL, filename: "My Cut #1 (final).mov" });
    expect(result.providerUid).toBe(UID);
  });

  it("accepts only webhooks signed with the configured secret", () => {
    const body = JSON.stringify({ uid: UID, readyToStream: true });
    const time = String(Math.floor(Date.now() / 1000));
    const sign = (secret: string, t = time) =>
      `time=${t},sig1=${crypto.createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;

    const unsignedProvider = new CloudflareStreamStorageProvider({ accountId: "acc", apiToken: "tok" });
    expect(unsignedProvider.verifyWebhookSignature(body, { "webhook-signature": sign("anything") })).toBe(false);

    const stream = new CloudflareStreamStorageProvider({ accountId: "acc", apiToken: "tok", webhookSecret: "whsec" });
    expect(stream.verifyWebhookSignature(body, { "webhook-signature": sign("whsec") })).toBe(true);
    expect(stream.verifyWebhookSignature(body, { "webhook-signature": sign("wrong") })).toBe(false);
    expect(stream.verifyWebhookSignature(body, {})).toBe(false);
    expect(stream.verifyWebhookSignature(body, { "webhook-signature": sign("whsec", String(Number(time) - 3600)) })).toBe(false);
  });
});

describe("storage routing", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("classifies stored locations strictly", () => {
    expect(routeStorageLocation(UID)).toEqual({ kind: "stream", uid: UID });
    expect(routeStorageLocation(`https://videodelivery.net/${UID}/manifest/video.m3u8`)).toEqual({ kind: "stream", uid: UID });
    expect(routeStorageLocation(`https://pub.example.com/public/workspaces/${WS}/portfolio/a.jpg`)).toEqual({
      kind: "r2",
      key: `public/workspaces/${WS}/portfolio/a.jpg`,
    });
    expect(routeStorageLocation("/api/mock-upload/mock_stream_123_abc")).toEqual({
      kind: "mock",
      value: "/api/mock-upload/mock_stream_123_abc",
    });
    for (const value of ["https://videodelivery.net.evil.example/x", `https://evil.example/${UID}`, "../../x", "silo://a", "", null]) {
      expect(routeStorageLocation(value as any), String(value)).toBeNull();
    }
  });

  it("never guesses: unknown locations are refused, Stream gets only the UID", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const composite = StorageProviderFactory.createProvider({
      providerType: "cloudflare",
      cloudflare: { accountId: "acc", apiToken: "tok", webhookSecret: "whsec" },
    });

    await expect(composite.deleteAsset("../../zones/abc")).rejects.toThrow("Unrecognised storage location");
    await expect(composite.deleteAsset(`https://evil.example/${UID}/x`)).rejects.toThrow("Unrecognised storage location");
    expect(fetchMock).not.toHaveBeenCalled();

    await composite.deleteAsset(`/api/media/${UID}`);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.cloudflare.com/client/v4/accounts/acc/stream/${UID}`,
      expect.objectContaining({ method: "DELETE" })
    );
    expect(typeof composite.getStreamVideo).toBe("function");
    expect(typeof composite.copyFromUrl).toBe("function");
  });

  it("refuses webhooks when Stream isn't configured", () => {
    expect(new MockStorageProvider().verifyWebhookSignature()).toBe(false);
    const composite = StorageProviderFactory.createProvider({
      providerType: "cloudflare",
      cloudflare: { accountId: "acc", apiToken: "tok" },
    });
    expect(composite.verifyWebhookSignature?.("{}", {})).toBe(false);
  });
});
