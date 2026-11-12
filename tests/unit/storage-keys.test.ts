import { describe, expect, it } from "vitest";
import { isR2KeyInWorkspace, parseStoredMedia, r2KeyWorkspaceId, streamUidOf } from "@/lib/storage/keys";

const WS = "2f1a3dfe-1111-4222-8333-444455556666";
const OTHER = "9b9b9b9b-1111-4222-8333-444455556666";
const DEL = "3c3c3c3c-1111-4222-8333-444455556666";
const UID = "0123456789abcdef0123456789abcdef";

describe("parseStoredMedia", () => {
  it("reads private and public R2 keys, with their workspace and delivery", () => {
    expect(parseStoredMedia(`private/workspaces/${WS}/deliveries/${DEL}/assets/a/v1/1-cut.mp4`)).toEqual({
      kind: "r2",
      key: `private/workspaces/${WS}/deliveries/${DEL}/assets/a/v1/1-cut.mp4`,
      visibility: "private",
      workspaceId: WS,
      deliveryId: DEL,
    });
    expect(parseStoredMedia(`public/workspaces/${WS}/portfolio/covers/1-x.jpg`)).toMatchObject({
      kind: "r2",
      visibility: "public",
      workspaceId: WS,
      deliveryId: null,
    });
  });

  it("treats legacy keys under a delivery as private", () => {
    expect(parseStoredMedia(`workspaces/${WS}/deliveries/${DEL}/raw/1-x.mov`)).toMatchObject({ visibility: "private" });
    expect(parseStoredMedia(`workspaces/${WS}/branding/logo.png`)).toMatchObject({ visibility: "public" });
  });

  it("finds keys inside /api/media paths, public-bucket URLs and presigned URLs", () => {
    const key = `private/workspaces/${WS}/deliveries/${DEL}/raw/1-x.mov`;
    expect(parseStoredMedia(`/api/media/${key}?download=true`)).toMatchObject({ kind: "r2", key });
    expect(parseStoredMedia(`https://acct.r2.cloudflarestorage.com/bucket/${key}?X-Amz-Signature=abc`)).toMatchObject({
      kind: "r2",
      key,
    });
    expect(parseStoredMedia(`https://media.example.com/public/workspaces/${WS}/portfolio/a.jpg`)).toMatchObject({
      kind: "r2",
      workspaceId: WS,
    });
  });

  it("reads Cloudflare Stream UIDs and URLs", () => {
    expect(parseStoredMedia(UID)).toEqual({ kind: "stream", uid: UID });
    expect(parseStoredMedia(`/api/media/${UID}`)).toEqual({ kind: "stream", uid: UID });
    expect(streamUidOf(`https://videodelivery.net/${UID}/manifest/video.m3u8`)).toBe(UID);
    expect(streamUidOf(`https://customer-abc.cloudflarestream.com/${UID}/thumbnails/thumbnail.jpg`)).toBe(UID);
    expect(streamUidOf(`https://evil.example/${UID}/manifest/video.m3u8`)).toBeNull();
  });

  it("refuses keys that try to step outside their prefix", () => {
    expect(parseStoredMedia(`private/workspaces/${WS}/../${OTHER}/deliveries/x/a.mp4`)).toMatchObject({ kind: "other" });
    expect(parseStoredMedia(`private/workspaces/${WS}//a.mp4`)).toMatchObject({ kind: "other" });
    expect(parseStoredMedia(`private/workspaces/${WS}/%2e%2e/${OTHER}/a.mp4`)).toMatchObject({ kind: "other" });
  });

  it("returns null for empty values and 'other' for anything unrecognised", () => {
    expect(parseStoredMedia("")).toBeNull();
    expect(parseStoredMedia(null)).toBeNull();
    expect(parseStoredMedia("/images/demo.webp")).toEqual({ kind: "other", value: "/images/demo.webp" });
  });
});

describe("workspace ownership", () => {
  it("matches only keys under the workspace's own prefix", () => {
    const key = `private/workspaces/${WS}/deliveries/${DEL}/raw/1-x.mov`;
    expect(isR2KeyInWorkspace(key, WS)).toBe(true);
    expect(isR2KeyInWorkspace(key, WS.toUpperCase())).toBe(true);
    expect(isR2KeyInWorkspace(key, OTHER)).toBe(false);
    expect(isR2KeyInWorkspace(UID, WS)).toBe(false);
    expect(isR2KeyInWorkspace(`private/workspaces/not-a-uuid/x.mp4`, WS)).toBe(false);
    expect(isR2KeyInWorkspace(key, null)).toBe(false);
    expect(r2KeyWorkspaceId(key)).toBe(WS);
  });
});
