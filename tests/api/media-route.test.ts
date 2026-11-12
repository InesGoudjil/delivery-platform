import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import * as serverModule from "@/core/server";

const WS = "10000000-0000-4000-8000-00000000000a";
const OTHER_WS = "10000000-0000-4000-8000-00000000000b";
const DEL = "30000000-0000-4000-8000-00000000000a";
const OTHER_DEL = "30000000-0000-4000-8000-00000000000b";
const KEY = `private/workspaces/${WS}/deliveries/${DEL}/assets/a/v1/1-master.mov`;
const UID = "0123456789abcdef0123456789abcdef";
const ROOM = "share_token_room_a_0001";

vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return {
    ...actual,
    env: {
      ...actual.env,
      isCloudflareR2Configured: true,
      CLOUDFLARE_R2_ENDPOINT: "https://r2.test",
      CLOUDFLARE_R2_ACCESS_KEY_ID: "key",
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: "secret",
      CLOUDFLARE_R2_PRIVATE_BUCKET: "private-bucket",
      CLOUDFLARE_R2_PUBLIC_BUCKET: "public-bucket",
      CLOUDFLARE_R2_PUBLIC_DOMAIN: "https://media.test",
      CLOUDFLARE_STREAM_SUBDOMAIN: "videodelivery.net",
      CLOUDFLARE_ACCOUNT_ID: "",
      CLOUDFLARE_API_TOKEN: "",
    },
  };
});
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(async (_client: unknown, command: { input: { Key: string } }) => `https://r2.test/signed/${command.input.Key}`),
}));
const getClientRoom = vi.fn();
vi.mock("@/core/security/client-room", () => ({ getClientRoom: (token: string) => getClientRoom(token) }));

const { GET } = await import("@/app/api/media/[...path]/route");

let user: any;
let admin: any;

function call(path: string, query = "") {
  const req = new NextRequest(`http://localhost/api/media/${path}${query}`);
  return GET(req, { params: Promise.resolve({ path: path.split("/") }) });
}

function room(overrides: Record<string, unknown> = {}) {
  return { canView: true, canDownload: false, delivery: { id: DEL, workspaceId: WS }, ...overrides };
}

beforeEach(() => {
  vi.restoreAllMocks();
  getClientRoom.mockReset().mockResolvedValue(null);
  user = { auth: { getCurrentUser: vi.fn(async () => null) }, member: { getMember: vi.fn(async () => null) } };
  admin = { asset: { findAssetByStreamUid: vi.fn(async () => null) } };
  vi.spyOn(serverModule, "getServerServices").mockResolvedValue(user);
  vi.spyOn(serverModule, "getServerAdminServices").mockResolvedValue(admin);
});

describe("private files", () => {
  it("are refused to anonymous visitors, whatever the URL says", async () => {
    expect((await call(KEY)).status).toBe(401);
    expect((await call(KEY, "?passphrase=secret123&code=secret123")).status).toBe(401);
  });

  it("are signed for members of the file's own workspace only", async () => {
    user.auth.getCurrentUser.mockResolvedValue({ id: "u1" });
    user.member.getMember.mockImplementation(async (workspaceId: string) => (workspaceId === WS ? { role: "viewer" } : null));
    const own = await call(KEY);
    expect(own.status).toBe(307);
    expect(own.headers.get("location")).toContain("/signed/");
    expect(own.headers.get("cache-control")).toContain("no-store");

    const foreign = await call(`private/workspaces/${OTHER_WS}/deliveries/${OTHER_DEL}/x.mov`);
    expect(foreign.status).toBe(401);
  });

  it("are signed for a client room only when downloads are on, and only that delivery's files", async () => {
    getClientRoom.mockResolvedValue(room({ canDownload: false }));
    expect((await call(KEY, `?download=true&room=${ROOM}`)).status).toBe(401);

    getClientRoom.mockResolvedValue(room({ canDownload: true }));
    expect((await call(KEY, `?download=true&room=${ROOM}`)).status).toBe(307);

    getClientRoom.mockResolvedValue(room({ canDownload: true, delivery: { id: OTHER_DEL, workspaceId: WS } }));
    expect((await call(KEY, `?download=true&room=${ROOM}`)).status).toBe(401);
  });
});

describe("Stream videos", () => {
  it("redirect thumbnails, but refuse MP4 downloads without access", async () => {
    const thumb = await call(UID);
    expect(thumb.status).toBe(307);
    expect(thumb.headers.get("location")).toContain(`${UID}/thumbnails/`);

    expect((await call(UID, "?download=true")).status).toBe(401);
    admin.asset.findAssetByStreamUid.mockResolvedValue({ id: "a", workspaceId: WS, deliveryId: DEL, isArchived: false });
    expect((await call(UID, "?download=true")).status).toBe(401);
  });

  it("allow downloads to the file's workspace members and its client room (downloads on)", async () => {
    admin.asset.findAssetByStreamUid.mockResolvedValue({ id: "a", workspaceId: WS, deliveryId: DEL, isArchived: false });
    getClientRoom.mockResolvedValue(room({ canDownload: true }));
    const viaRoom = await call(UID, `?download=true&room=${ROOM}`);
    expect(viaRoom.status).toBe(307);
    expect(viaRoom.headers.get("location")).toContain(`${UID}/downloads/default.mp4`);

    getClientRoom.mockResolvedValue(null);
    user.auth.getCurrentUser.mockResolvedValue({ id: "u1" });
    user.member.getMember.mockResolvedValue({ role: "viewer" });
    expect((await call(UID, "?download=true")).status).toBe(307);
  });

  it("refuse downloads of a file in Trash", async () => {
    admin.asset.findAssetByStreamUid.mockResolvedValue({ id: "a", workspaceId: WS, deliveryId: DEL, isArchived: true });
    user.auth.getCurrentUser.mockResolvedValue({ id: "u1" });
    user.member.getMember.mockResolvedValue({ role: "owner" });
    expect((await call(UID, "?download=true")).status).toBe(401);
  });
});
