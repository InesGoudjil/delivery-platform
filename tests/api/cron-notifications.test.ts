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
  let whatsapp: { isConfigured: ReturnType<typeof vi.fn>; flushQuietCommentBatches: ReturnType<typeof vi.fn> };
  let commentEmail: { flushDue: ReturnType<typeof vi.fn> };
  let heartbeat: { started: ReturnType<typeof vi.fn>; finished: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.restoreAllMocks();
    (env as { CRON_SECRET: string }).CRON_SECRET = SECRET;
    whatsapp = {
      isConfigured: vi.fn(() => true),
      flushQuietCommentBatches: vi.fn(async () => ({ sent: 2, failed: 0 })),
    };
    commentEmail = { flushDue: vi.fn(async () => ({ sent: 1, skipped: 0, failed: 0 })) };
    heartbeat = { started: vi.fn(async () => undefined), finished: vi.fn(async () => undefined) };
    vi.spyOn(serverModule, "getServerAdminServices").mockResolvedValue({ whatsapp, commentEmail, heartbeat } as never);
  });

  afterEach(() => {
    (env as { CRON_SECRET: string }).CRON_SECRET = saved;
  });

  it("refuses to run without a long enough CRON_SECRET", async () => {
    (env as { CRON_SECRET: string }).CRON_SECRET = "short";
    const res = await GET(request({ authorization: "Bearer short" }));
    expect(res.status).toBe(503);
    expect(commentEmail.flushDue).not.toHaveBeenCalled();
    expect(whatsapp.flushQuietCommentBatches).not.toHaveBeenCalled();
  });

  it("refuses callers without the secret", async () => {
    for (const headers of [{}, { authorization: `Bearer ${SECRET}x` }, { authorization: SECRET }, { "x-cron-secret": SECRET }]) {
      expect((await GET(request(headers))).status).toBe(401);
    }
    expect(commentEmail.flushDue).not.toHaveBeenCalled();
  });

  it("sends the studio's comment emails and the WhatsApp alerts that are due", async () => {
    const res = await GET(request({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      commentEmails: { sent: 1, skipped: 0, failed: 0 },
      whatsapp: { sent: 2, failed: 0 },
    });
    expect(commentEmail.flushDue).toHaveBeenCalledWith("http://localhost:3000");
    expect(whatsapp.flushQuietCommentBatches).toHaveBeenCalledWith("http://localhost:3000");
    expect((await POST(request({ authorization: `Bearer ${SECRET}` }, "POST"))).status).toBe(200);
  });

  it("still sends the studio's comment emails while WhatsApp isn't configured", async () => {
    whatsapp.isConfigured.mockReturnValue(false);
    const res = await GET(request({ authorization: `Bearer ${SECRET}` }));
    expect(await res.json()).toEqual({
      ok: true,
      commentEmails: { sent: 1, skipped: 0, failed: 0 },
      whatsapp: "not configured",
    });
    expect(commentEmail.flushDue).toHaveBeenCalled();
    expect(whatsapp.flushQuietCommentBatches).not.toHaveBeenCalled();
  });

  it("reports a failed WhatsApp run without its details, and the comment emails still go out", async () => {
    whatsapp.flushQuietCommentBatches.mockRejectedValueOnce(new Error("relation does not exist"));
    const res = await GET(request({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toMatchObject({ ok: false, commentEmails: { sent: 1, skipped: 0, failed: 0 }, whatsapp: null });
    expect(JSON.stringify(body)).not.toContain("relation");
  });

  it("reports a failed comment email run without its details, and WhatsApp still runs", async () => {
    commentEmail.flushDue.mockRejectedValueOnce(new Error("rpc failed: internal detail"));
    const res = await GET(request({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toMatchObject({ ok: false, commentEmails: null, whatsapp: { sent: 2, failed: 0 } });
    expect(JSON.stringify(body)).not.toContain("internal detail");
    expect(whatsapp.flushQuietCommentBatches).toHaveBeenCalled();
  });

  it("records each run, so the admin panel can show when the scheduler last ran", async () => {
    await GET(request({ authorization: `Bearer ${SECRET}` }));
    expect(heartbeat.started).toHaveBeenCalledWith("notifications");
    expect(heartbeat.finished).toHaveBeenCalledWith(
      "notifications",
      "ok",
      { commentEmails: { sent: 1, skipped: 0, failed: 0 }, whatsapp: { sent: 2, failed: 0 } },
      null
    );

    commentEmail.flushDue.mockRejectedValueOnce(new Error("boom"));
    await GET(request({ authorization: `Bearer ${SECRET}` }));
    expect(heartbeat.finished).toHaveBeenLastCalledWith("notifications", "failed", expect.anything(), expect.any(String));
  });

  it("still runs the jobs when the heartbeat can't be written", async () => {
    heartbeat.started.mockRejectedValue(new Error("table missing"));
    heartbeat.finished.mockRejectedValue(new Error("table missing"));
    const res = await GET(request({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    expect(commentEmail.flushDue).toHaveBeenCalled();
  });
});
