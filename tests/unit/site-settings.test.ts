import { describe, it, expect, vi } from "vitest";
import { SiteSettingsService } from "@/core/services/site-settings.service";
import type { ISiteSettingsRepository, SiteSettingRow } from "@/core/repositories/site-settings.repository";
import { isDemoRoomLive, loadDemoRoom, shareTokenFromReviewLink } from "@/lib/client-room/demo-room";

/**
 * Site settings (lib/site-settings.ts) read through SiteSettingsService, and the demo room built
 * on the demo_room setting (lib/client-room/demo-room.ts).
 */

const DELIVERY = "30000000-0000-4000-8000-0000000000d1";
const WORKSPACE = "10000000-0000-4000-8000-0000000000d1";

function memoryRepo(initial: Record<string, unknown> = {}) {
  const rows = new Map<string, SiteSettingRow>(
    Object.entries(initial).map(([key, value]) => [key, { key, value, updatedBy: null, updatedAt: "2026-11-15T00:00:00Z" }])
  );
  const repo: ISiteSettingsRepository = {
    get: vi.fn(async (key: string) => rows.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown, updatedBy: string | null) => {
      const row = { key, value, updatedBy, updatedAt: "2026-11-15T12:00:00Z" };
      rows.set(key, row);
      return row;
    }),
  };
  return { repo, rows };
}

describe("site settings", () => {
  it("read as their default while they have never been saved", async () => {
    const service = new SiteSettingsService(memoryRepo().repo);
    expect(await service.getWithMeta("demo_room")).toEqual({
      value: { deliveryId: null, showOnLanding: false },
      updatedAt: null,
      updatedBy: null,
    });
  });

  it("read as their default when what's saved no longer fits the setting's shape", async () => {
    const service = new SiteSettingsService(memoryRepo({ demo_room: { deliveryId: "not-a-uuid", showOnLanding: "yes" } }).repo);
    expect(await service.get("demo_room")).toEqual({ deliveryId: null, showOnLanding: false });
  });

  it("hand out a fresh default each time, so one caller can't change it for the next", async () => {
    const service = new SiteSettingsService(memoryRepo().repo);
    const first = await service.get("demo_room");
    first.showOnLanding = true;
    expect((await service.get("demo_room")).showOnLanding).toBe(false);
  });

  it("save a value that fits, with who saved it, and refuse one that doesn't", async () => {
    const { repo, rows } = memoryRepo();
    const service = new SiteSettingsService(repo);

    const saved = await service.set("demo_room", { deliveryId: DELIVERY, showOnLanding: true }, "admin-1");
    expect(saved).toEqual({
      value: { deliveryId: DELIVERY, showOnLanding: true },
      updatedAt: "2026-11-15T12:00:00Z",
      updatedBy: "admin-1",
    });
    expect(await service.get("demo_room")).toEqual({ deliveryId: DELIVERY, showOnLanding: true });

    await expect(
      service.set("demo_room", { deliveryId: "nope", showOnLanding: true } as never, "admin-1")
    ).rejects.toThrow("isn't a valid value");
    expect(rows.get("demo_room")?.value).toEqual({ deliveryId: DELIVERY, showOnLanding: true });
  });
});

describe("review links", () => {
  it("give their share token, from a full link, a path or the bare token", () => {
    expect(shareTokenFromReviewLink("https://cinespace.app/deliver/abc123DEF_456?ref=x#top")).toBe("abc123DEF_456");
    expect(shareTokenFromReviewLink("/deliver/abc123DEF_456/")).toBe("abc123DEF_456");
    expect(shareTokenFromReviewLink("  abc123DEF_456  ")).toBe("abc123DEF_456");
  });

  it("give nothing for other links or text", () => {
    expect(shareTokenFromReviewLink("https://cinespace.app/p/studio")).toBeNull();
    expect(shareTokenFromReviewLink("short")).toBeNull();
    expect(shareTokenFromReviewLink("")).toBeNull();
  });
});

describe("the demo room", () => {
  const delivery = (overrides: Record<string, unknown> = {}) => ({
    id: DELIVERY,
    workspaceId: WORKSPACE,
    title: "Aisha & Omar",
    shareToken: "share_token_demo_room_01",
    status: "in_review",
    passcodeHash: null,
    expiresAt: null,
    siloStatus: null,
    ...overrides,
  });

  function servicesWith(options: {
    setting?: unknown;
    delivery?: ReturnType<typeof delivery> | null;
    suspendedAt?: string | null;
  }) {
    return {
      siteSettings: new SiteSettingsService(memoryRepo(options.setting ? { demo_room: options.setting } : {}).repo),
      delivery: { getDeliveryById: vi.fn(async (id: string) => (options.delivery?.id === id ? options.delivery : null)) },
      workspace: { getWorkspaceById: vi.fn(async () => ({ id: WORKSPACE, suspendedAt: options.suspendedAt ?? null })) },
    } as never;
  }

  it("is live on the landing page when switched on and open to anyone", async () => {
    const demo = await loadDemoRoom(servicesWith({ setting: { deliveryId: DELIVERY, showOnLanding: true }, delivery: delivery() }));
    expect(demo.state).toBe("open");
    expect(isDemoRoomLive(demo)).toBe(true);
  });

  it("isn't live while switched off, or while visitors can't open the room", async () => {
    const on = { deliveryId: DELIVERY, showOnLanding: true };
    const cases = [
      { setting: { deliveryId: DELIVERY, showOnLanding: false }, delivery: delivery(), state: "open" },
      { setting: on, delivery: delivery({ passcodeHash: "scrypt$v1" }), state: "locked" },
      { setting: on, delivery: delivery({ expiresAt: "2026-01-01T00:00:00Z" }), state: "expired" },
      { setting: on, delivery: delivery({ status: "archived" }), state: "unavailable" },
      { setting: on, delivery: delivery(), suspendedAt: "2026-11-14T00:00:00Z", state: "unavailable" },
    ];
    for (const { state, ...options } of cases) {
      const demo = await loadDemoRoom(servicesWith(options));
      expect(demo.state).toBe(state);
      expect(isDemoRoomLive(demo)).toBe(false);
    }
  });

  it("has no room while none is set, or when the saved delivery no longer exists", async () => {
    const none = await loadDemoRoom(servicesWith({}));
    expect(none).toMatchObject({ delivery: null, state: null });
    expect(isDemoRoomLive(none)).toBe(false);

    const gone = await loadDemoRoom(servicesWith({ setting: { deliveryId: DELIVERY, showOnLanding: true }, delivery: null }));
    expect(gone.setting.value.deliveryId).toBe(DELIVERY);
    expect(gone.delivery).toBeNull();
    expect(isDemoRoomLive(gone)).toBe(false);
  });
});
