import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  MediaCard,
  MediaGrid,
  MediaGridItem,
  MASONRY_CARDS_PER_GRID,
  getMediaGridClasses,
  masonryRatio,
  masonrySpan,
} from "@/components/workspaces/media-card";

const RATIOS = ["16:9", "9:16", "2.39:1", "4:5"];

function masonryGrid(count: number) {
  return renderToStaticMarkup(
    <MediaGrid isMasonry cardSize="M">
      {Array.from({ length: count }, (_, i) => {
        const aspectRatio = RATIOS[i % RATIOS.length];
        return (
          <MediaGridItem key={i} ratio={masonryRatio({ aspectRatio, type: "film" })}>
            <MediaCard src={`/images/${i}.jpg`} title={`card-${i + 1}`} aspectRatio={aspectRatio} isMasonry />
          </MediaGridItem>
        );
      })}
    </MediaGrid>
  );
}

describe("masonrySpan", () => {
  it("spans the card's height in rows (50 per column width) plus a 3-row gutter", () => {
    expect(masonrySpan(16 / 9)).toBe(31); // round(28.1) + 3
    expect(masonrySpan(9 / 16)).toBe(92); // round(88.9) + 3
    expect(masonrySpan(2.39)).toBe(24); // round(20.9) + 3
    expect(masonrySpan(1)).toBe(53);
  });

  it("clamps bad ratios to the allowed shapes", () => {
    expect(masonrySpan(10)).toBe(23); // treated as 2.5:1
    expect(masonrySpan(0.1)).toBe(103); // treated as 1:2
    expect(masonrySpan(Number.NaN)).toBe(31); // treated as 16:9
  });
});

describe("masonryRatio", () => {
  it("prefers the explicit ratio, then the stored one", () => {
    expect(masonryRatio({ numericRatio: 0.8, aspectRatio: "16:9" })).toBe(0.8);
    expect(masonryRatio({ aspectRatio: "2.39:1" })).toBeCloseTo(2.39, 6);
    expect(masonryRatio({ aspectRatio: "1.234 / 1" })).toBeCloseTo(1.234, 6);
  });

  it("falls back to a shape for the card type, like MediaCard does", () => {
    expect(masonryRatio({ aspectRatio: null, type: "video" })).toBeCloseTo(16 / 9, 6);
    expect(masonryRatio({ type: "film" })).toBeCloseTo(16 / 9, 6);
    expect(masonryRatio({ type: "still" })).toBeCloseTo(3 / 4, 6);
    expect(masonryRatio({ type: "photo" })).toBeCloseTo(4 / 3, 6);
  });

  it("keeps shapes within 1:2 and 2.5:1", () => {
    expect(masonryRatio({ aspectRatio: "4:1" })).toBe(2.5);
    expect(masonryRatio({ aspectRatio: "1:4" })).toBe(0.5);
  });
});

describe("MediaGrid masonry", () => {
  it("renders a list of cells in the given order, each spanning rows from its ratio", () => {
    const html = masonryGrid(4);
    expect(html).toContain('class="media-masonry "');
    expect(html).toContain('<ul class="media-masonry__list" data-size="M">');
    expect(html.match(/<li class="media-masonry__item /g)).toHaveLength(4);
    expect(html).toContain("--masonry-span:31;--masonry-ratio:1.7777777777777777");
    expect(html).toContain("--masonry-span:92");
    expect(html).toContain("--masonry-span:24");

    const order = [...html.matchAll(/card-(\d+)/g)].map((m) => Number(m[1]));
    expect([...new Set(order)]).toEqual([1, 2, 3, 4]);
  });

  it("lets each card fill its cell instead of sizing itself", () => {
    const html = masonryGrid(1);
    expect(html).not.toContain("aspect-ratio:");
    expect(html).toContain("[container-type:size] size-full");
  });

  it("starts a new grid every MASONRY_CARDS_PER_GRID cards, keeping the order", () => {
    const html = masonryGrid(MASONRY_CARDS_PER_GRID + 10);
    expect(html.match(/<ul class="media-masonry__list"/g)).toHaveLength(2);
    expect(html.match(/<li class="media-masonry__item /g)).toHaveLength(MASONRY_CARDS_PER_GRID + 10);
    const secondList = html.split('<ul class="media-masonry__list"')[2];
    expect(secondList).toContain(`>card-${MASONRY_CARDS_PER_GRID + 1}<`);
    expect(secondList).not.toContain(`>card-${MASONRY_CARDS_PER_GRID}<`);
  });

  it("wraps children that aren't grid items in a default cell", () => {
    const html = renderToStaticMarkup(
      <MediaGrid isMasonry>
        <MediaCard src="/a.jpg" title="loose" isMasonry />
      </MediaGrid>
    );
    expect(html).toContain('<li class="media-masonry__item "');
    expect(html).toContain("--masonry-span:31");
  });
});

describe("MediaGrid regular", () => {
  it("renders a list with one item per card and the size's columns and gutter", () => {
    const html = renderToStaticMarkup(
      <MediaGrid cardSize="S">
        <MediaGridItem ratio={0.5}>
          <MediaCard src="/a.jpg" title="a" numericRatio={16 / 9} />
        </MediaGridItem>
        <MediaCard src="/b.jpg" title="b" numericRatio={16 / 9} />
      </MediaGrid>
    );
    expect(html.startsWith(`<ul class="${getMediaGridClasses("S")} "`)).toBe(true);
    expect(html.match(/<li class="min-w-0 "/g)).toHaveLength(2);
    expect(html).not.toContain("--masonry-span");
    expect(html).toContain(`aspect-ratio:${16 / 9}`);
  });

  it("uses one gutter variable per card size", () => {
    expect(getMediaGridClasses("S")).toContain("grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4");
    expect(getMediaGridClasses("S")).toContain("[--media-gap:1rem] sm:[--media-gap:1.25rem]");
    expect(getMediaGridClasses("M")).toContain("[--media-gap:1.25rem] sm:[--media-gap:1.5rem]");
    expect(getMediaGridClasses("L")).toContain("[--media-gap:1.5rem] sm:[--media-gap:2rem]");
    expect(getMediaGridClasses("L")).toContain("gap-(--media-gap)");
  });
});
