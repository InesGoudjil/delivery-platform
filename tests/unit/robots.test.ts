import { describe, it, expect } from "vitest";
import robots from "@/app/robots";

describe("robots.txt", () => {
  const rules = [robots().rules].flat();
  const disallowed = rules.flatMap((rule) => [rule.disallow ?? []].flat());

  it("keeps crawlers out of the admin panel, the API and the two-factor page", () => {
    expect(disallowed).toEqual(expect.arrayContaining(["/admin", "/api/", "/mfa"]));
  });

  it("doesn't block private-link pages, so crawlers can read their noindex instead of listing the bare link", () => {
    expect(disallowed.some((path) => path.startsWith("/deliver") || path.startsWith("/invite"))).toBe(false);
  });
});
