import { describe, it, expect } from "vitest";
import { safeReturnPath } from "@/lib/security/return-path";
import { safeReturnPath as adminReturnPath } from "@/lib/security/admin-mfa";
import { hasVerifiedFactor, isAwaitingTwoFactor, twoFactorUrl } from "@/lib/security/two-factor";
import { clientIpFromHeaders } from "@/lib/security/client-ip";

describe("lib/security/return-path: safeReturnPath", () => {
  it("keeps same-site paths, with their query and hash", () => {
    expect(safeReturnPath("/invite/abc123")).toBe("/invite/abc123");
    expect(safeReturnPath("/studio/deliveries?tab=shared#top")).toBe("/studio/deliveries?tab=shared#top");
  });

  it("refuses anything that could leave the site", () => {
    for (const raw of [
      "https://evil.example/",
      "//evil.example",
      "/\\evil.example",
      "/\t/evil.example", // browsers drop the tab and read //evil.example
      "/\n/evil.example",
      "\\\\evil.example",
      "javascript:alert(1)",
      "evil.example",
      "",
    ]) {
      expect(safeReturnPath(raw, "/fallback"), JSON.stringify(raw)).toBe("/fallback");
    }
  });

  it("falls back for missing values, by default to /", () => {
    expect(safeReturnPath(null)).toBe("/");
    expect(safeReturnPath(undefined)).toBe("/");
  });

  it("keeps the admin-panel wrapper's /admin fallback", () => {
    expect(adminReturnPath(null)).toBe("/admin");
    expect(adminReturnPath("/admin/users")).toBe("/admin/users");
    expect(adminReturnPath("/\t/evil.example")).toBe("/admin");
  });
});

describe("lib/security/two-factor", () => {
  it("counts only verified factors", () => {
    expect(hasVerifiedFactor({ factors: [{ status: "verified" }] })).toBe(true);
    expect(hasVerifiedFactor({ factors: [{ status: "unverified" }] })).toBe(false);
    expect(hasVerifiedFactor({ factors: [] })).toBe(false);
    expect(hasVerifiedFactor({})).toBe(false);
    expect(hasVerifiedFactor(null)).toBe(false);
  });

  it("holds a session only when its token says the user has an authenticator and isn't aal2", () => {
    expect(isAwaitingTwoFactor({ mfa_enrolled: true, aal: "aal1" })).toBe(true);
    expect(isAwaitingTwoFactor({ mfa_enrolled: true })).toBe(true);
    expect(isAwaitingTwoFactor({ mfa_enrolled: true, aal: "aal2" })).toBe(false);
    expect(isAwaitingTwoFactor({ mfa_enrolled: false, aal: "aal1" })).toBe(false);
    // No claim: the access-token hook is off.
    expect(isAwaitingTwoFactor({ aal: "aal1" })).toBe(false);
    // Only a real boolean counts.
    expect(isAwaitingTwoFactor({ mfa_enrolled: "true", aal: "aal1" })).toBe(false);
    expect(isAwaitingTwoFactor(null)).toBe(false);
  });

  it("builds the /mfa link with the return path encoded", () => {
    expect(twoFactorUrl("/studio/deliveries?tab=shared")).toBe("/mfa?redirect=%2Fstudio%2Fdeliveries%3Ftab%3Dshared");
  });
});

describe("lib/security/client-ip: clientIpFromHeaders", () => {
  it("prefers Vercel's header, then x-real-ip, then the first x-forwarded-for entry", () => {
    const all = new Headers({
      "x-vercel-forwarded-for": "198.51.100.1",
      "x-real-ip": "198.51.100.2",
      "x-forwarded-for": "203.0.113.9, 10.0.0.1",
    });
    expect(clientIpFromHeaders(all)).toBe("198.51.100.1");
    expect(clientIpFromHeaders(new Headers({ "x-real-ip": "198.51.100.2", "x-forwarded-for": "203.0.113.9" }))).toBe(
      "198.51.100.2"
    );
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }))).toBe("203.0.113.9");
  });

  it("falls back when no header has an address", () => {
    expect(clientIpFromHeaders(new Headers())).toBe("127.0.0.1");
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": " " }), "")).toBe("");
  });
});
