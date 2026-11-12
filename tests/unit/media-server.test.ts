import { describe, expect, it, vi } from "vitest";
import { presignDeliveryAssets, presignPrivateMediaUrl } from "@/lib/media-server";

const WS = "10000000-0000-4000-8000-00000000000a";
const OTHER_WS = "10000000-0000-4000-8000-00000000000b";
const DEL = "30000000-0000-4000-8000-00000000000a";
const OWN_KEY = `private/workspaces/${WS}/deliveries/${DEL}/assets/a/v1/1-cut.mov`;
const OWN_THUMB = `private/workspaces/${WS}/deliveries/${DEL}/assets/a/v1/1-thumb.jpg`;
const PLANTED_KEY = `private/workspaces/${OTHER_WS}/deliveries/${DEL}/assets/x/v1/1-their-master.mov`;
const HLS = "https://videodelivery.net/0123456789abcdef0123456789abcdef/manifest/video.m3u8";

function fakeStorage() {
  return {
    getSecurePlaybackUrl: vi.fn(async (key: string) => `https://r2.example/${key}?X-Amz-Signature=play`),
    getSecureDownloadUrl: vi.fn(async (key: string, filename: string) => `https://r2.example/${key}?X-Amz-Signature=dl&f=${filename}`),
  } as any;
}

describe("presignPrivateMediaUrl", () => {
  it("signs this workspace's private keys and refuses any other workspace's", async () => {
    const storage = fakeStorage();
    expect(await presignPrivateMediaUrl(OWN_KEY, storage, { workspaceId: WS })).toContain("X-Amz-Signature=play");
    expect(await presignPrivateMediaUrl(PLANTED_KEY, storage, { workspaceId: WS })).toBe("");
    expect(await presignPrivateMediaUrl(`/api/media/${PLANTED_KEY}`, storage, { workspaceId: WS })).toBe("");
    expect(storage.getSecurePlaybackUrl).toHaveBeenCalledTimes(1);
  });

  it("drops values it doesn't recognise instead of passing them to the browser", async () => {
    const storage = fakeStorage();
    expect(await presignPrivateMediaUrl("https://evil.example/tracker.gif", storage, { workspaceId: WS })).toBe("");
    expect(await presignPrivateMediaUrl("javascript:alert(1)", storage, { workspaceId: WS })).toBe("");
    expect(await presignPrivateMediaUrl(HLS, storage, { workspaceId: WS })).toBe(HLS);
  });
});

describe("presignDeliveryAssets", () => {
  const video = (rawFileUrl: string, hlsManifestUrl: string | null) => ({
    title: "Final cut",
    type: "video",
    versions: [{ rawFileUrl, thumbnailUrl: OWN_THUMB, hlsManifestUrl, versionNumber: 1, isActiveVersion: true }],
  });

  it("gives no download links and hides a video's master when downloads are off", async () => {
    const [asset] = await presignDeliveryAssets([video(OWN_KEY, HLS)], fakeStorage(), {
      workspaceId: WS,
      allowDownload: false,
      roomShareToken: "share_token_room_a_0001",
    });
    const v = asset.versions[0] as any;
    expect(v.rawFileUrl).toBe("");
    expect(v.downloadUrl).toBeNull();
    expect(v.proxyDownloadUrl).toBeNull();
    expect(v.hlsManifestUrl).toBe(HLS);
    expect(v.thumbnailUrl).toContain("X-Amz-Signature");
  });

  it("keeps a video without a streaming copy playable when downloads are off", async () => {
    const [asset] = await presignDeliveryAssets([video(OWN_KEY, null)], fakeStorage(), { workspaceId: WS, allowDownload: false });
    expect((asset.versions[0] as any).rawFileUrl).toContain("X-Amz-Signature=play");
    expect((asset.versions[0] as any).downloadUrl).toBeNull();
  });

  it("signs downloads when they're allowed, with the room token on the Stream download link", async () => {
    const [asset] = await presignDeliveryAssets([video(OWN_KEY, HLS)], fakeStorage(), {
      workspaceId: WS,
      allowDownload: true,
      roomShareToken: "share_token_room_a_0001",
    });
    const v = asset.versions[0] as any;
    expect(v.downloadUrl).toContain("X-Amz-Signature=dl");
    expect(v.proxyDownloadUrl).toContain("room=share_token_room_a_0001");
  });

  it("never signs a planted key from another workspace, even with downloads on", async () => {
    const [asset] = await presignDeliveryAssets([video(PLANTED_KEY, null)], fakeStorage(), { workspaceId: WS, allowDownload: true });
    const v = asset.versions[0] as any;
    expect(v.rawFileUrl).toBe("");
    expect(v.downloadUrl).toBe("");
  });
});
