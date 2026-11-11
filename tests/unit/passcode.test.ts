import { describe, it, expect } from "vitest";
import { createHash } from "crypto";
import { hashDeliveryPasscode, verifyDeliveryPasscode } from "@/lib/security/passcode";

const sha256Hex = (value: string) => createHash("sha256").update(value).digest("hex");

describe("lib/security/passcode", () => {
  it("hashes with a random salt and verifies only the right passcode", async () => {
    const first = await hashDeliveryPasscode("secret123");
    const second = await hashDeliveryPasscode("secret123");

    expect(first).toMatch(/^scrypt\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    expect(first).not.toBe(second);
    expect(await verifyDeliveryPasscode("secret123", first)).toBe(true);
    expect(await verifyDeliveryPasscode("secret124", first)).toBe(false);
  });

  it("never accepts a stored hash as the passcode", async () => {
    const scryptHash = await hashDeliveryPasscode("secret123");
    const legacyHash = sha256Hex("secret123");

    expect(await verifyDeliveryPasscode(scryptHash, scryptHash)).toBe(false);
    expect(await verifyDeliveryPasscode(legacyHash, legacyHash)).toBe(false);
  });

  it("still verifies legacy SHA-256 and plaintext passcodes", async () => {
    const legacyHash = sha256Hex("secret123");

    expect(await verifyDeliveryPasscode("secret123", legacyHash)).toBe(true);
    expect(await verifyDeliveryPasscode("secret124", legacyHash)).toBe(false);
    expect(await verifyDeliveryPasscode("plain-code", "plain-code")).toBe(true);
    expect(await verifyDeliveryPasscode("plain-cod", "plain-code")).toBe(false);
  });

  it("rejects empty and malformed values", async () => {
    expect(await verifyDeliveryPasscode("", "anything")).toBe(false);
    expect(await verifyDeliveryPasscode("secret", null)).toBe(false);
    expect(await verifyDeliveryPasscode("secret", undefined)).toBe(false);
    expect(await verifyDeliveryPasscode("secret", "scrypt$")).toBe(false);
    expect(await verifyDeliveryPasscode("secret", "scrypt$c2FsdA==$")).toBe(false);
  });
});
