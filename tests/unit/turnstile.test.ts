import { describe, it, expect, vi, afterEach } from "vitest";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

/** lib/security/turnstile.ts: our own check of Turnstile tokens (waitlist, contact, inquiries). */

function cloudflareAnswers(body: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body)));
}

describe("verifyTurnstileToken", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("lets everything through while TURNSTILE_SECRET_KEY isn't set (development)", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(verifyTurnstileToken(undefined)).resolves.toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses a missing token once the key is set, without asking Cloudflare", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(verifyTurnstileToken(null)).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("asks Cloudflare with the secret, the token and the visitor's IP", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    const fetchSpy = cloudflareAnswers({ success: true });

    await expect(verifyTurnstileToken("token-1", "203.0.113.7")).resolves.toBe(true);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const body = new URLSearchParams(init?.body as URLSearchParams);
    expect(Object.fromEntries(body)).toEqual({ secret: "secret", response: "token-1", remoteip: "203.0.113.7" });
  });

  it("refuses what Cloudflare refuses, and fails closed when Cloudflare can't be reached", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.spyOn(console, "warn").mockImplementation(() => {});

    cloudflareAnswers({ success: false, "error-codes": ["timeout-or-duplicate"] });
    await expect(verifyTurnstileToken("used-token")).resolves.toBe(false);

    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    await expect(verifyTurnstileToken("token-2")).resolves.toBe(false);
  });
});
