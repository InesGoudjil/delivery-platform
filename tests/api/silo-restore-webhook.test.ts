import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/silo/restore-webhook/route";
import * as serverModule from "@/core/server";
import { env } from "@/lib/env";

const WS = "11111111-1111-4111-8111-111111111111";
const OTHER_WS = "22222222-2222-4222-8222-222222222222";
const DELIVERY = "33333333-3333-4333-8333-333333333333";
const SECRET = "s".repeat(24) + "-0123456789abcdef";
const URL_BASE = "http://localhost:3000/api/silo/restore-webhook";

function restoreEvent(key: string, bucket = "silo-test-bucket") {
  return {
    Records: [
      {
        eventName: "ObjectRestore:Completed",
        s3: { bucket: { name: bucket }, object: { key: encodeURIComponent(key) } },
      },
    ],
  };
}

const archiveKey = (workspaceId = WS) =>
  `silo/workspaces/${workspaceId}/deliveries/${DELIVERY}/assets/a/v1/1700000000000-master.mov`;

function request(body: unknown, headers: Record<string, string> = {}, url = URL_BASE) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/silo/restore-webhook", () => {
  const saved = {
    isSiloEnabled: env.isSiloEnabled,
    SILO_WEBHOOK_SECRET: env.SILO_WEBHOOK_SECRET,
    AWS_S3_SILO_BUCKET: env.AWS_S3_SILO_BUCKET,
  };
  let adminServices: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    env.isSiloEnabled = true;
    env.SILO_WEBHOOK_SECRET = SECRET;
    env.AWS_S3_SILO_BUCKET = "silo-test-bucket";

    adminServices = {
      delivery: {
        getDeliveryById: vi.fn().mockResolvedValue({ id: DELIVERY, workspaceId: WS, siloStatus: "restoring" }),
      },
      silo: {
        checkAndFinalizeRestore: vi.fn().mockResolvedValue({ deliveryId: DELIVERY, isReady: true, status: "ready" }),
      },
    };
    vi.spyOn(serverModule, "getServerAdminServices").mockResolvedValue(adminServices);
  });

  afterEach(() => {
    Object.assign(env, saved);
  });

  it("does not exist while The Silo is switched off", async () => {
    env.isSiloEnabled = false;

    const res = await POST(request(restoreEvent(archiveKey()), { authorization: `Bearer ${SECRET}` }));

    expect(res.status).toBe(404);
    expect(serverModule.getServerAdminServices).not.toHaveBeenCalled();
  });

  it("refuses to run without a strong secret, in every environment", async () => {
    for (const configured of ["", "your-silo-webhook-secret", "too-short"]) {
      env.SILO_WEBHOOK_SECRET = configured;
      const res = await POST(request(restoreEvent(archiveKey()), { authorization: `Bearer ${configured}` }));
      expect(res.status).toBe(503);
    }
    expect(adminServices.silo.checkAndFinalizeRestore).not.toHaveBeenCalled();
  });

  it("rejects a missing or wrong secret, and a secret in the query string", async () => {
    const cases: [Record<string, string>, string][] = [
      [{}, URL_BASE],
      [{ authorization: "Bearer wrong-secret-wrong-secret-wrong-secret" }, URL_BASE],
      [{ "x-silo-secret": `${SECRET}x` }, URL_BASE],
      [{}, `${URL_BASE}?secret=${encodeURIComponent(SECRET)}`],
    ];
    for (const [headers, url] of cases) {
      const res = await POST(request(restoreEvent(archiveKey()), headers, url));
      expect(res.status).toBe(401);
    }
    expect(adminServices.silo.checkAndFinalizeRestore).not.toHaveBeenCalled();
  });

  it("finalizes the delivery named by an archive object key (Bearer, X-Silo-Secret or Basic auth)", async () => {
    const basic = `Basic ${Buffer.from(`sns:${SECRET}`).toString("base64")}`;
    for (const headers of [{ authorization: `Bearer ${SECRET}` }, { "x-silo-secret": SECRET }, { authorization: basic }]) {
      const res = await POST(request(restoreEvent(archiveKey()), headers));
      expect(res.status).toBe(200);
    }

    expect(adminServices.delivery.getDeliveryById).toHaveBeenCalledWith(DELIVERY);
    expect(adminServices.silo.checkAndFinalizeRestore).toHaveBeenCalledTimes(3);
    expect(adminServices.silo.checkAndFinalizeRestore).toHaveBeenCalledWith(DELIVERY);
  });

  it("ignores a free-form deliveryId, other buckets, and keys that do not match the delivery's workspace", async () => {
    const auth = { authorization: `Bearer ${SECRET}` };

    expect((await POST(request({ deliveryId: DELIVERY }, auth))).status).toBe(200);
    expect((await POST(request(restoreEvent(archiveKey(), "someone-elses-bucket"), auth))).status).toBe(200);
    expect(adminServices.delivery.getDeliveryById).not.toHaveBeenCalled();

    const res = await POST(request(restoreEvent(archiveKey(OTHER_WS)), auth));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ processed: [{ deliveryId: DELIVERY, status: "unknown_delivery" }] });

    expect(adminServices.silo.checkAndFinalizeRestore).not.toHaveBeenCalled();
  });

  it("leaves deliveries that are not restoring alone", async () => {
    adminServices.delivery.getDeliveryById.mockResolvedValue({ id: DELIVERY, workspaceId: WS, siloStatus: "archived" });

    const res = await POST(request(restoreEvent(archiveKey()), { authorization: `Bearer ${SECRET}` }));

    expect(res.status).toBe(200);
    expect(adminServices.silo.checkAndFinalizeRestore).not.toHaveBeenCalled();
  });
});
