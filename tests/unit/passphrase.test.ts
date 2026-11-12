import { describe, expect, it } from "vitest";
import { generatePassphrase, MIN_PASSCODE_LENGTH, passcodeProblem } from "@/lib/security/passphrase";
import { updateDeliverySecuritySchema } from "@/lib/validations/deliveries";

describe("generatePassphrase", () => {
  it("returns three words and four digits, long enough for the passcode rule", () => {
    for (let i = 0; i < 200; i++) {
      const passphrase = generatePassphrase();
      expect(passphrase).toMatch(/^[a-z]+-[a-z]+-[a-z]+-\d{4}$/);
      expect(passcodeProblem(passphrase)).toBeNull();
    }
  });

  it("doesn't repeat itself", () => {
    const seen = new Set(Array.from({ length: 2000 }, generatePassphrase));
    expect(seen.size).toBeGreaterThan(1990);
  });
});

describe("custom passcodes", () => {
  it(`need at least ${MIN_PASSCODE_LENGTH} characters, not counting surrounding spaces`, () => {
    expect(passcodeProblem("1234567")).toMatch(/at least 8/);
    expect(passcodeProblem("  1234567  ")).toMatch(/at least 8/);
    expect(passcodeProblem("12345678")).toBeNull();
    expect(passcodeProblem("x".repeat(129))).toMatch(/at most/);
  });

  it("are checked by the server-side schema, where an empty value removes the passcode", () => {
    expect(updateDeliverySecuritySchema.safeParse({ passphrase: "abc" }).success).toBe(false);
    expect(updateDeliverySecuritySchema.safeParse({ passphrase: "golden-reel" }).success).toBe(true);
    expect(updateDeliverySecuritySchema.safeParse({ passphrase: "" }).success).toBe(true);
    expect(updateDeliverySecuritySchema.safeParse({ passphrase: null }).success).toBe(true);
    expect(updateDeliverySecuritySchema.safeParse({}).success).toBe(true);
    expect(updateDeliverySecuritySchema.parse({ passphrase: "  golden-reel  " }).passphrase).toBe("golden-reel");
  });
});
