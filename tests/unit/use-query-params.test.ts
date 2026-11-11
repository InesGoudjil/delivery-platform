import { describe, it, expect } from "vitest";
import {
  useQueryParams,
  buildQueryString,
  computeUpdatedPath,
} from "@/hooks/use-query-params";

describe("hooks/use-query-params", () => {
  it("exports useQueryParams, buildQueryString, and computeUpdatedPath", () => {
    expect(typeof useQueryParams).toBe("function");
    expect(typeof buildQueryString).toBe("function");
    expect(typeof computeUpdatedPath).toBe("function");
  });

  describe("buildQueryString", () => {
    it("handles null and empty input safely", () => {
      expect(buildQueryString(null)).toBe("");
      expect(buildQueryString("")).toBe("");
    });

    it("appends new key-value pairs to existing query parameters", () => {
      const current = new URLSearchParams("status=in_review&search=summer");
      const res = buildQueryString(current, { page: 2 });
      expect(res).toBe("?status=in_review&search=summer&page=2");
    });

    it("removes keys when assigned null, undefined, or empty string", () => {
      const current = new URLSearchParams("status=in_review&search=summer");
      const res = buildQueryString(current, { status: null, search: "" });
      expect(res).toBe("");
    });

    it("filters query parameters using include option", () => {
      const current = new URLSearchParams("status=in_review&search=summer&page=3");
      const res = buildQueryString(current, undefined, { include: ["status", "page"] });
      expect(res).toBe("?status=in_review&page=3");
    });

    it("filters query parameters using exclude option", () => {
      const current = new URLSearchParams("status=in_review&search=summer&page=3");
      const res = buildQueryString(current, undefined, { exclude: ["search"] });
      expect(res).toBe("?status=in_review&page=3");
    });

    it("formats array values as comma-separated lists", () => {
      const res = buildQueryString("", { tags: ["commercial", "color-grade"] });
      expect(res).toBe("?tags=commercial%2Ccolor-grade");
    });
  });

  describe("computeUpdatedPath", () => {
    it("updates query parameters and preserves base pathname", () => {
      const pathname = "/acme-media/deliveries";
      const current = "status=in_review&page=2";

      const updated = computeUpdatedPath(pathname, current, {
        set: { status: "approved" },
        del: "page",
      });

      expect(updated).toBe("/acme-media/deliveries?status=approved");
    });

    it("deletes multiple parameters when array is provided to del", () => {
      const pathname = "/acme-media/deliveries";
      const current = "status=in_review&search=commercial&page=2";

      const updated = computeUpdatedPath(pathname, current, {
        del: ["search", "page"],
      });

      expect(updated).toBe("/acme-media/deliveries?status=in_review");
    });

    it("handles arrayDelimiter options", () => {
      const pathname = "/acme-media/deliveries";
      const updated = computeUpdatedPath(pathname, "", {
        set: { filter: ["v1", "v2"] },
        arrayDelimiter: ";",
      });

      expect(updated).toBe("/acme-media/deliveries?filter=v1%3Bv2");
    });

    it("returns clean pathname when all query parameters are deleted", () => {
      const pathname = "/acme-media/deliveries";
      const current = "status=in_review";

      const updated = computeUpdatedPath(pathname, current, {
        del: "status",
      });

      expect(updated).toBe("/acme-media/deliveries");
    });
  });
});
