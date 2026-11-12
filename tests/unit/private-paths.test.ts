import { describe, expect, it } from "vitest";
import { isPrivateAnalyticsPath, isPrivateAnalyticsUrl } from "@/lib/analytics/private-paths";

describe("analytics private pages", () => {
  it("cover client rooms, invitations and every sign-in page", () => {
    for (const path of [
      "/deliver/0f3c9a",
      "/deliver",
      "/invite/abc123",
      "/login",
      "/signup",
      "/forgot-password",
      "/reset-password",
      "/auth/confirm",
      "/api/auth/callback",
    ]) {
      expect(isPrivateAnalyticsPath(path), path).toBe(true);
    }
  });

  it("leave marketing, portfolio and workspace pages alone", () => {
    for (const path of ["/", "/pricing", "/p/studio-a", "/delivery-view", "/studio-a/deliveries", "/loginhelp"]) {
      expect(isPrivateAnalyticsPath(path), path).toBe(false);
    }
  });

  it("fail closed when the path is unknown", () => {
    expect(isPrivateAnalyticsPath(undefined)).toBe(true);
    expect(isPrivateAnalyticsUrl(undefined)).toBe(true);
    expect(isPrivateAnalyticsUrl("")).toBe(true);
  });

  it("check full and relative event URLs", () => {
    expect(isPrivateAnalyticsUrl("https://cut.example/deliver/0f3c9a?x=1")).toBe(true);
    expect(isPrivateAnalyticsUrl("/invite/abc")).toBe(true);
    expect(isPrivateAnalyticsUrl("https://cut.example/p/studio-a")).toBe(false);
  });
});
