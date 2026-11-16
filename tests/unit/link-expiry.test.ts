import { describe, it, expect } from "vitest";
import {
  STANDARD_LINK_DAYS,
  defaultLinkDaysProblem,
  hasExtendedLinkExpiry,
  isExtendedDefaultLinkDays,
  isExtendedLinkExpiry,
  isSameLinkExpiry,
  linkExpiryProblem,
  newLinkExpiresAt,
} from "@/lib/security/link-expiry";

/**
 * The plan rule for client-link expiry: 30 days on every plan; longer, or never, with
 * extended link expiry (Pro and up).
 */

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-11-16T12:00:00.000Z");
const inDays = (days: number) => new Date(now + days * DAY).toISOString();

describe("lib/security/link-expiry", () => {
  describe("hasExtendedLinkExpiry", () => {
    it("follows the plan's flag, or passcode protection when the plan has no flag", () => {
      expect(hasExtendedLinkExpiry({ extended_link_expiry: true, password_protected: false })).toBe(true);
      expect(hasExtendedLinkExpiry({ extended_link_expiry: false, password_protected: true })).toBe(false);
      expect(hasExtendedLinkExpiry({ password_protected: true })).toBe(true);
      expect(hasExtendedLinkExpiry({ password_protected: false })).toBe(false);
      expect(hasExtendedLinkExpiry(null)).toBe(false);
      expect(hasExtendedLinkExpiry(undefined)).toBe(false);
    });
  });

  describe("linkExpiryProblem", () => {
    it("accepts never and dates in the next 10 years", () => {
      expect(linkExpiryProblem(null, now)).toBeNull();
      expect(linkExpiryProblem(inDays(1), now)).toBeNull();
      expect(linkExpiryProblem(inDays(3650), now)).toBeNull();
    });

    it("refuses dates that aren't dates, are past, or are too far out", () => {
      expect(linkExpiryProblem("next tuesday", now)).toContain("valid");
      expect(linkExpiryProblem(inDays(-1), now)).toContain("future");
      expect(linkExpiryProblem(new Date(now).toISOString(), now)).toContain("future");
      expect(linkExpiryProblem(inDays(3700), now)).toContain("10 years");
    });
  });

  describe("isExtendedLinkExpiry", () => {
    it("is true for never and for more than 30 days (with a day of clock slack)", () => {
      expect(isExtendedLinkExpiry(null, now)).toBe(true);
      expect(isExtendedLinkExpiry(inDays(90), now)).toBe(true);
      expect(isExtendedLinkExpiry(inDays(31.5), now)).toBe(true);
    });

    it("is false up to 30 days, including a browser clock running a little ahead", () => {
      expect(isExtendedLinkExpiry(inDays(1), now)).toBe(false);
      expect(isExtendedLinkExpiry(inDays(30), now)).toBe(false);
      expect(isExtendedLinkExpiry(inDays(30.5), now)).toBe(false);
    });
  });

  describe("isSameLinkExpiry", () => {
    it("compares moments, and treats null and undefined as never", () => {
      expect(isSameLinkExpiry(null, null)).toBe(true);
      expect(isSameLinkExpiry(null, undefined)).toBe(true);
      expect(isSameLinkExpiry("2026-11-20T00:00:00.000Z", "2026-11-20T00:00:00+00:00")).toBe(true);
      expect(isSameLinkExpiry("2026-11-20T00:00:00.000Z", null)).toBe(false);
      expect(isSameLinkExpiry("2026-11-20T00:00:00.000Z", "2026-11-21T00:00:00.000Z")).toBe(false);
    });
  });

  describe("workspace default lifetime", () => {
    it("accepts never and whole days from 1 to 3650", () => {
      expect(defaultLinkDaysProblem(null)).toBeNull();
      expect(defaultLinkDaysProblem(1)).toBeNull();
      expect(defaultLinkDaysProblem(3650)).toBeNull();
      expect(defaultLinkDaysProblem(0)).not.toBeNull();
      expect(defaultLinkDaysProblem(-7)).not.toBeNull();
      expect(defaultLinkDaysProblem(2.5)).not.toBeNull();
      expect(defaultLinkDaysProblem(3651)).not.toBeNull();
    });

    it("needs extended link expiry for never and for more than 30 days", () => {
      expect(isExtendedDefaultLinkDays(null)).toBe(true);
      expect(isExtendedDefaultLinkDays(90)).toBe(true);
      expect(isExtendedDefaultLinkDays(30)).toBe(false);
      expect(isExtendedDefaultLinkDays(7)).toBe(false);
    });
  });

  describe("newLinkExpiresAt", () => {
    it("uses the saved default when the plan allows it", () => {
      expect(newLinkExpiresAt(14, false, now)).toBe(inDays(14));
      expect(newLinkExpiresAt(90, true, now)).toBe(inDays(90));
      // Saved "never" really means never on plans that allow it.
      expect(newLinkExpiresAt(null, true, now)).toBeNull();
    });

    it("holds longer defaults to 30 days on plans without extended link expiry", () => {
      expect(newLinkExpiresAt(null, false, now)).toBe(inDays(STANDARD_LINK_DAYS));
      expect(newLinkExpiresAt(90, false, now)).toBe(inDays(STANDARD_LINK_DAYS));
    });

    it("gives 30 days when nothing is saved, or the saved value isn't a lifetime", () => {
      expect(newLinkExpiresAt(undefined, true, now)).toBe(inDays(STANDARD_LINK_DAYS));
      expect(newLinkExpiresAt(0, true, now)).toBe(inDays(STANDARD_LINK_DAYS));
      expect(newLinkExpiresAt(-3, false, now)).toBe(inDays(STANDARD_LINK_DAYS));
    });
  });
});
