import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/cron/notifications/route";
import * as serverModule from "@/core/server";
import { env } from "@/lib/env";

const SECRET = "c".repeat(40);
const URL_BASE = "http://localhost:3000/api/cron/notifications";

function request(headers: Record<string, string> = {}, method = "GET") {
  return new NextRequest(URL_BASE, { method, headers });
}

describe("/api/cron/notifications", () => {
  const saved = env.CRON_SECRET;
  let whatsapp: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    (env as { CRON_SECRET: string }).CRON_SECRET = SECRET;
    whatsapp = { isConfigured: vi.fn(() => true), flushQuietCommentBatches: vi.fn(async () => ({ sent: 2, failed: 0 })) };
    vi.spyOn(serverModule, "getServerAdminServices").mockResolvedValue({ whatsapp } as any);
  });

  afterEach(() => {
    (env as { CRON_SECRET: string }).CRON_SECRET = saved;
  });

  it("refuses to run without a long enough CRON_SECRET", async () => {
    (env as { CRON_SECRET: string }).CRON_SECRET = "short";
    const res = await GET(request({ authorization: "Bearer short" }));
    expect(res.status).toBe(503);
    expect(whatsapp.flushQuietCommentBatches).not.toHaveBeenCalled();
  });

  it("refuses callers without the secret", async () => {
    for (const headers of [{}, { authorization: `Bearer ${SECRET}x` }, { authorization: SECRET }, { "x-cron-secret": SECRET }]) {
      expect((await GET(request(headers))).status).toBe(401);
    }
    expect(whatsapp.flushQuietCommentBatches).not.toHaveBeenCalled();
  });

  it("sends the grouped comment alerts that are due", async () => {
    const res = await GET(request({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, comments: { sent: 2, failed: 0 } });
    expect(whatsapp.flushQuietCommentBatches).toHaveBeenCalledWith("http://localhost:3000");
    expect((await POST(request({ authorization: `Bearer ${SECRET}` }, "POST"))).status).toBe(200);
  });

  it("does nothing while WhatsApp isn't configured", async () => {
    whatsapp.isConfigured.mockReturnValue(false);
    const res = await GET(request({ authorization: `Bearer ${SECRET}` }));
    expect(await res.json()).toEqual({ ok: true, whatsapp: "not configured" });
    expect(whatsapp.flushQuietCommentBatches).not.toHaveBeenCalled();
  });

  it("reports a failure without details", async () => {
    whatsapp.flushQuietCommentBatches.mockRejectedValueOnce(new Error("relation does not exist"));
    const res = await GET(request({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("relation");
  });
});
