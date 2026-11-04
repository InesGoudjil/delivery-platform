import { describe, it, expect } from "vitest";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";

describe("useInfiniteScroll hook", () => {
  it("exports useInfiniteScroll as a callable function", () => {
    expect(typeof useInfiniteScroll).toBe("function");
  });
});
