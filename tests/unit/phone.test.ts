import { describe, expect, it } from "vitest";
import { formatPhone, maskPhone, normalizePhone } from "@/lib/phone";

describe("normalizePhone", () => {
  it.each([
    ["+971 50 123 4567", "971501234567"],
    ["00971 50 123 4567", "971501234567"],
    ["050 123 4567", "971501234567"],
    ["50 123 4567", "971501234567"],
    ["04 123 4567", "97141234567"],
    ["971501234567", "971501234567"],
    ["+44 7911 123456", "447911123456"],
    ["+1 (415) 555-0100", "14155550100"],
  ])("reads %s as %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "   ", "abc", "+971 50 123 4567 ext 2", "12345", "050 12", "0501234567890", "+0 1234 5678", "+1234567890123456", "++971501234567"])(
    "rejects %j",
    (input) => {
      expect(normalizePhone(input)).toBeNull();
    }
  );

  it("rejects anything that isn't a string", () => {
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(971501234567 as unknown as string)).toBeNull();
  });
});

describe("formatPhone and maskPhone", () => {
  it("formats and masks a number", () => {
    expect(formatPhone("971501234567")).toBe("+971501234567");
    expect(maskPhone("971501234567")).toBe("+971 ••• ••4567");
    expect(maskPhone(null)).toBe("");
  });

  it("never shows more than the last four digits of the subscriber number", () => {
    expect(maskPhone("447911123456")).not.toContain("7911");
    expect(maskPhone("447911123456").endsWith("3456")).toBe(true);
  });
});
