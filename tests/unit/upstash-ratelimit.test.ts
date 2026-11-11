import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatRetryAfter,
  parseDurationMs,
  InMemoryRatelimit,
  checkRateLimit,
  assertRateLimit,
  getClientIp,
  RateLimitError,
  RATELIMIT_POLICIES,
} from "@/lib/upstash";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

describe("lib/upstash (Rate Limiting)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    InMemoryRatelimit.reset();
  });

  describe("formatRetryAfter", () => {
    it("formats durations under 60 seconds", () => {
      const resetAt = Date.now() + 45 * 1000;
      expect(formatRetryAfter(resetAt)).toBe("45 seconds");

      const singleSec = Date.now() + 1000;
      expect(formatRetryAfter(singleSec)).toBe("1 second");
    });

    it("formats durations under 60 minutes", () => {
      const resetAt = Date.now() + 15 * 60 * 1000;
      expect(formatRetryAfter(resetAt)).toBe("15 minutes");

      const singleMin = Date.now() + 60 * 1000;
      expect(formatRetryAfter(singleMin)).toBe("1 minute");
    });

    it("formats durations in hours", () => {
      const resetAt = Date.now() + 2 * 60 * 60 * 1000;
      expect(formatRetryAfter(resetAt)).toBe("2 hours");

      const singleHour = Date.now() + 60 * 60 * 1000;
      expect(formatRetryAfter(singleHour)).toBe("1 hour");
    });
  });

  describe("parseDurationMs", () => {
    it("correctly converts duration strings to milliseconds", () => {
      expect(parseDurationMs("500 ms")).toBe(500);
      expect(parseDurationMs("10 s")).toBe(10_000);
      expect(parseDurationMs("15 m")).toBe(900_000);
      expect(parseDurationMs("1 h")).toBe(3_600_000);
      expect(parseDurationMs("24 h")).toBe(86_400_000);
      expect(parseDurationMs("7 d")).toBe(604_800_000);
    });
  });

  describe("InMemoryRatelimit", () => {
    it("permits allowed attempts and denies when exceeded", async () => {
      const limiter = new InMemoryRatelimit(3, 10_000, "test");

      const r1 = await limiter.limit("user_1");
      expect(r1.success).toBe(true);
      expect(r1.remaining).toBe(2);

      const r2 = await limiter.limit("user_1");
      expect(r2.success).toBe(true);
      expect(r2.remaining).toBe(1);

      const r3 = await limiter.limit("user_1");
      expect(r3.success).toBe(true);
      expect(r3.remaining).toBe(0);

      const r4 = await limiter.limit("user_1");
      expect(r4.success).toBe(false);
      expect(r4.remaining).toBe(0);
      expect(r4.reset).toBeGreaterThan(Date.now());
    });

    it("isolates rate limits by identifier", async () => {
      const limiter = new InMemoryRatelimit(1, 10_000, "test");

      const r1 = await limiter.limit("user_A");
      expect(r1.success).toBe(true);

      const r2 = await limiter.limit("user_A");
      expect(r2.success).toBe(false);

      // user_B should still be permitted
      const r3 = await limiter.limit("user_B");
      expect(r3.success).toBe(true);
    });
  });

  describe("checkRateLimit & assertRateLimit", () => {
    it("returns formatted error message when policy limit is exceeded", async () => {
      const testPolicy = {
        attempts: 2,
        window: "1 m" as const,
        keyPrefix: "test:policy",
        message: ({ retryAfter }: any) => `Slow down! Wait ${retryAfter}.`,
      };

      const res1 = await checkRateLimit({ policy: testPolicy, identifier: "client_123" });
      expect(res1.success).toBe(true);

      const res2 = await checkRateLimit({ policy: testPolicy, identifier: "client_123" });
      expect(res2.success).toBe(true);

      const res3 = await checkRateLimit({ policy: testPolicy, identifier: "client_123" });
      expect(res3.success).toBe(false);
      expect(res3.error).toContain("Slow down! Wait");
    });

    it("assertRateLimit throws RateLimitError when exceeded", async () => {
      const testPolicy = {
        attempts: 1,
        window: "1 m" as const,
        keyPrefix: "test:assert",
      };

      await expect(
        assertRateLimit({ policy: testPolicy, identifier: "caller_1" })
      ).resolves.not.toThrow();

      await expect(
        assertRateLimit({ policy: testPolicy, identifier: "caller_1" })
      ).rejects.toThrow(RateLimitError);
    });
  });

  describe("getClientIp", () => {
    it("extracts the first IP from x-forwarded-for header", async () => {
      const { headers } = await import("next/headers");
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn().mockImplementation((name: string) => {
          if (name === "x-forwarded-for") return "203.0.113.195, 70.41.3.18";
          return null;
        }),
      } as any);

      const ip = await getClientIp();
      expect(ip).toBe("203.0.113.195");
    });

    it("falls back to x-real-ip when x-forwarded-for is missing", async () => {
      const { headers } = await import("next/headers");
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn().mockImplementation((name: string) => {
          if (name === "x-real-ip") return "198.51.100.42";
          return null;
        }),
      } as any);

      const ip = await getClientIp();
      expect(ip).toBe("198.51.100.42");
    });

    it("defaults to 127.0.0.1 when no headers are found", async () => {
      const { headers } = await import("next/headers");
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn().mockReturnValue(null),
      } as any);

      const ip = await getClientIp();
      expect(ip).toBe("127.0.0.1");
    });
  });

  describe("RATELIMIT_POLICIES specification", () => {
    it("defines proper security policies matching the remediation plan", () => {
      expect(RATELIMIT_POLICIES.deliveryPasscode.attempts).toBe(10);
      expect(RATELIMIT_POLICIES.deliveryPasscode.window).toBe("15 m");

      expect(RATELIMIT_POLICIES.authLogin.attempts).toBe(5);
      expect(RATELIMIT_POLICIES.authLogin.window).toBe("15 m");

      expect(RATELIMIT_POLICIES.waitlistJoin.attempts).toBe(5);
      expect(RATELIMIT_POLICIES.waitlistJoin.window).toBe("1 h");

      expect(RATELIMIT_POLICIES.feedbackAdd.attempts).toBe(20);
      expect(RATELIMIT_POLICIES.feedbackAdd.window).toBe("1 h");
    });
  });
});
