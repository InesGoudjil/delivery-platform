import { describe, it, expect } from "vitest";
import { escapeHtml, oneLine, safeHref } from "@/lib/security/html";

describe("lib/security/html", () => {
  describe("escapeHtml", () => {
    it("escapes the five HTML-significant characters", () => {
      expect(escapeHtml(`<a href="x" title='y'>Tom & Jerry</a>`)).toBe(
        "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;Tom &amp; Jerry&lt;/a&gt;"
      );
    });

    it("escapes existing entities again instead of passing them through", () => {
      expect(escapeHtml("&lt;script&gt;")).toBe("&amp;lt;script&amp;gt;");
    });

    it("stringifies other values and drops null and undefined", () => {
      expect(escapeHtml(42)).toBe("42");
      expect(escapeHtml(0)).toBe("0");
      expect(escapeHtml(false)).toBe("false");
      expect(escapeHtml(null)).toBe("");
      expect(escapeHtml(undefined)).toBe("");
    });
  });

  describe("oneLine", () => {
    it("turns line breaks, tabs and control characters into single spaces", () => {
      expect(oneLine("  Hello\r\n\tworld\u0000! end  ")).toBe("Hello world ! end");
      expect(oneLine("Approved\r\nBcc: attacker@example.com")).toBe(
        "Approved Bcc: attacker@example.com"
      );
    });

    it("truncates to max code points without splitting emoji", () => {
      expect(oneLine("abcdef", 3)).toBe("abc");
      expect(oneLine("🎬🎬🎬", 2)).toBe("🎬🎬");
      expect(oneLine("word   next", 5)).toBe("word");
      expect(oneLine("a".repeat(300))).toHaveLength(200);
    });

    it("leaves HTML alone, since subjects are plain text", () => {
      expect(oneLine("Tom & Jerry <b>")).toBe("Tom & Jerry <b>");
    });

    it("stringifies other values and drops null and undefined", () => {
      expect(oneLine(14)).toBe("14");
      expect(oneLine(null)).toBe("");
      expect(oneLine(undefined)).toBe("");
    });
  });

  describe("safeHref", () => {
    it("keeps http(s) and relative URLs as they are", () => {
      for (const url of [
        "https://cut.app/deliver/abc?x=1&y=2",
        "http://localhost:3000/invite/token",
        "HTTPS://CUT.APP/",
        "/studio/deliveries/1",
        "deliveries/1",
        "?tab=files",
        "#top",
      ]) {
        expect(safeHref(url)).toBe(url);
      }
    });

    it("rejects every other scheme, including forms browsers would still run", () => {
      for (const url of [
        "javascript:alert(1)",
        "JaVaScRiPt:alert(1)",
        "  javascript:alert(1)",
        "\u0001javascript:alert(1)",
        "java\tscript:alert(1)",
        "java\nscript:alert(1)",
        "data:text/html;base64,PHNjcmlwdD4=",
        "vbscript:msgbox(1)",
        "mailto:someone@example.com",
        "file:///etc/passwd",
      ]) {
        expect(safeHref(url)).toBe("#");
      }
    });

    it("rejects protocol-relative URLs, empty values and non-strings", () => {
      for (const url of ["//evil.example/x", "/\\evil.example", "\\\\evil.example", "", "   ", null, undefined, 42, {}]) {
        expect(safeHref(url)).toBe("#");
      }
    });

    it("drops the characters browsers ignore", () => {
      expect(safeHref("  https://cut.app/x\n ")).toBe("https://cut.app/x");
    });
  });
});
