import { describe, it, expect } from "vitest";
import { generatePassphrase } from "@/lib/security/passphrase";
import { isGeneratedPassphrase, sealPasscode, unsealPasscode } from "@/lib/security/passcode-seal";

/** Generated passcodes are kept encrypted so the studio can see them again; typed ones aren't. */

describe("lib/security/passcode-seal", () => {
  it("opens what it sealed, with a different ciphertext each time", () => {
    const sealed = sealPasscode("velvet-falcon-lens-4821");
    expect(sealed).toMatch(/^v1\./);
    expect(sealed).not.toContain("velvet");
    expect(unsealPasscode(sealed)).toBe("velvet-falcon-lens-4821");
    expect(sealPasscode("velvet-falcon-lens-4821")).not.toBe(sealed);
  });

  it("gives nothing back for a tampered, foreign or missing value", () => {
    const sealed = sealPasscode("amber-reel-shadow-0042");
    const [v, iv, ct, tag] = sealed.split(".");
    expect(unsealPasscode([v, iv, ct.slice(0, -2) + (ct.endsWith("A") ? "B" : "A"), tag].join("."))).toBeNull();
    expect(unsealPasscode("v2.a.b.c")).toBeNull();
    expect(unsealPasscode("not sealed")).toBeNull();
    expect(unsealPasscode(null)).toBeNull();
  });

  it("recognises the generator's passcodes, not ones people type", () => {
    for (let i = 0; i < 20; i += 1) expect(isGeneratedPassphrase(generatePassphrase())).toBe(true);
    expect(isGeneratedPassphrase("MySecret2024!")).toBe(false);
    expect(isGeneratedPassphrase("correct horse battery staple")).toBe(false);
    expect(isGeneratedPassphrase("letmein123")).toBe(false);
  });
});
