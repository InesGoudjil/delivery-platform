import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  handleWaitlistMiddleware,
  isWaitlistMode,
  isWaitlistBypassed,
  isAllowedWaitlistPath,
  WAITLIST_BYPASS_COOKIE_NAME,
} from "@/lib/middleware/waitlist";

describe("lib/middleware/waitlist", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("isWaitlistMode", () => {
    it("returns false when neither WAITLIST_ONLY nor NEXT_PUBLIC_WAITLIST_ONLY is true", () => {
      delete process.env.WAITLIST_ONLY;
      delete process.env.NEXT_PUBLIC_WAITLIST_ONLY;
      expect(isWaitlistMode()).toBe(false);
    });

    it("returns true when WAITLIST_ONLY is 'true'", () => {
      process.env.WAITLIST_ONLY = "true";
      expect(isWaitlistMode()).toBe(true);
    });

    it("returns true when NEXT_PUBLIC_WAITLIST_ONLY is 'true'", () => {
      process.env.NEXT_PUBLIC_WAITLIST_ONLY = "true";
      expect(isWaitlistMode()).toBe(true);
    });
  });

  describe("isAllowedWaitlistPath", () => {
    it("permits waitlist, demo, and delivery-view paths", () => {
      expect(isAllowedWaitlistPath("/waitlist")).toBe(true);
      expect(isAllowedWaitlistPath("/delivery-view")).toBe(true);
      expect(isAllowedWaitlistPath("/demo")).toBe(true);
    });

    it("permits Next.js internals, API, and PWA assets", () => {
      expect(isAllowedWaitlistPath("/_next/data/test.json")).toBe(true);
      expect(isAllowedWaitlistPath("/api/auth/callback")).toBe(true);
      expect(isAllowedWaitlistPath("/favicon.ico")).toBe(true);
      expect(isAllowedWaitlistPath("/sw.js")).toBe(true);
      expect(isAllowedWaitlistPath("/manifest.webmanifest")).toBe(true);
      expect(isAllowedWaitlistPath("/robots.txt")).toBe(true);
    });

    it("blocks standard user and creator paths", () => {
      expect(isAllowedWaitlistPath("/")).toBe(false);
      expect(isAllowedWaitlistPath("/login")).toBe(false);
      expect(isAllowedWaitlistPath("/signup")).toBe(false);
      expect(isAllowedWaitlistPath("/admin")).toBe(false);
      expect(isAllowedWaitlistPath("/my-workspace/deliveries")).toBe(false);
    });
  });

  describe("isWaitlistBypassed", () => {
    it("returns false if WAITLIST_BYPASS_SECRET is not set", () => {
      delete process.env.WAITLIST_BYPASS_SECRET;
      const req = new NextRequest("http://localhost:3000/login", {
        headers: { cookie: `${WAITLIST_BYPASS_COOKIE_NAME}=secret123` },
      });
      expect(isWaitlistBypassed(req)).toBe(false);
    });

    it("returns true if cookie matches WAITLIST_BYPASS_SECRET", () => {
      process.env.WAITLIST_BYPASS_SECRET = "secret123";
      const req = new NextRequest("http://localhost:3000/login", {
        headers: { cookie: `${WAITLIST_BYPASS_COOKIE_NAME}=secret123` },
      });
      expect(isWaitlistBypassed(req)).toBe(true);
    });

    it("returns false if cookie does not match secret", () => {
      process.env.WAITLIST_BYPASS_SECRET = "secret123";
      const req = new NextRequest("http://localhost:3000/login", {
        headers: { cookie: `${WAITLIST_BYPASS_COOKIE_NAME}=wrong` },
      });
      expect(isWaitlistBypassed(req)).toBe(false);
    });
  });

  describe("handleWaitlistMiddleware", () => {
    it("returns null when waitlist mode is inactive", () => {
      process.env.WAITLIST_ONLY = "false";
      const req = new NextRequest("http://localhost:3000/login");
      const res = handleWaitlistMiddleware(req);
      expect(res).toBeNull();
    });

    it("clears bypass cookie when preview=clear is passed", () => {
      process.env.WAITLIST_ONLY = "true";
      const req = new NextRequest("http://localhost:3000/waitlist?preview=clear", {
        headers: { cookie: `${WAITLIST_BYPASS_COOKIE_NAME}=old_secret` },
      });
      const res = handleWaitlistMiddleware(req, { requestId: "req-1" });
      expect(res).not.toBeNull();
      expect(res?.status).toBe(307);
      expect(res?.headers.get("location")).toBe("http://localhost:3000/waitlist");
      expect(res?.headers.get("x-request-id")).toBe("req-1");
      const cookieHeader = res?.headers.get("set-cookie") || "";
      expect(cookieHeader).toContain(`${WAITLIST_BYPASS_COOKIE_NAME}=;`);
    });

    it("sets bypass cookie and redirects when valid bypass param is passed", () => {
      process.env.WAITLIST_ONLY = "true";
      process.env.WAITLIST_BYPASS_SECRET = "team_secret";
      const req = new NextRequest("http://localhost:3000/login?preview=team_secret");
      const res = handleWaitlistMiddleware(req, { requestId: "req-2" });
      expect(res).not.toBeNull();
      expect(res?.status).toBe(307);
      expect(res?.headers.get("location")).toBe("http://localhost:3000/login");
      expect(res?.headers.get("x-request-id")).toBe("req-2");
      const cookieHeader = res?.headers.get("set-cookie") || "";
      expect(cookieHeader).toContain(`${WAITLIST_BYPASS_COOKIE_NAME}=team_secret`);
    });

    it("returns null (permitting pass-through) when already holding valid bypass cookie", () => {
      process.env.WAITLIST_ONLY = "true";
      process.env.WAITLIST_BYPASS_SECRET = "team_secret";
      const req = new NextRequest("http://localhost:3000/login", {
        headers: { cookie: `${WAITLIST_BYPASS_COOKIE_NAME}=team_secret` },
      });
      const res = handleWaitlistMiddleware(req);
      expect(res).toBeNull();
    });

    it("returns null for whitelisted public path without bypass cookie", () => {
      process.env.WAITLIST_ONLY = "true";
      const req = new NextRequest("http://localhost:3000/waitlist");
      const res = handleWaitlistMiddleware(req);
      expect(res).toBeNull();
    });

    it("redirects blocked paths to /waitlist", () => {
      process.env.WAITLIST_ONLY = "true";
      const req = new NextRequest("http://localhost:3000/dashboard");
      const res = handleWaitlistMiddleware(req, { requestId: "req-blocked" });
      expect(res).not.toBeNull();
      expect(res?.status).toBe(307);
      expect(res?.headers.get("location")).toBe("http://localhost:3000/waitlist");
      expect(res?.headers.get("x-request-id")).toBe("req-blocked");
    });
  });
});
