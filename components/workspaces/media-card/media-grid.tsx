"use client";

import React, { createContext, useContext, useMemo } from "react";
import { numericAspectRatio } from "@/lib/media-ratios";
import type { MediaCardType, MediaGridItemProps, MediaGridProps } from "./types";
import "./media-masonry.css";

type CardSize = "S" | "M" | "L";

/** Masonry grid rows per column width: a card spans round(rows / ratio) rows plus the gutter. */
export const MASONRY_ROWS_PER_COLUMN = 50;
/** The masonry gutter in rows: 6% of a column, the same as the gap between columns. */
export const MASONRY_GUTTER_ROWS = 3;
/** Masonry cards keep the file's own shape within these bounds; anything outside is bad data. */
export const MIN_MASONRY_RATIO = 0.5;
export const MAX_MASONRY_RATIO = 2.5;
/**
 * Cards per masonry grid. Firefox lays out at most 10,000 grid rows; 160 cards in two columns
 * stay below that even if every card has the tallest allowed shape (about 8,300 rows).
 */
export const MASONRY_CARDS_PER_GRID = 160;

export function clampMasonryRatio(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 16 / 9;
  return Math.min(Math.max(ratio, MIN_MASONRY_RATIO), MAX_MASONRY_RATIO);
}

/** The shape a card shows in masonry: the explicit ratio, else the stored one, else a default for its type. */
export function masonryRatio({
  numericRatio,
  aspectRatio,
  type,
}: {
  numericRatio?: number | null;
  aspectRatio?: unknown;
  type?: MediaCardType;
}): number {
  const fallback = type === "film" || type === "video" ? 16 / 9 : type === "still" ? 3 / 4 : 4 / 3;
  return clampMasonryRatio(numericRatio || numericAspectRatio(aspectRatio) || fallback);
}

/** Grid rows a masonry card spans: its height in rows plus the gutter below it. */
export function masonrySpan(ratio: number): number {
  return Math.round(MASONRY_ROWS_PER_COLUMN / clampMasonryRatio(ratio)) + MASONRY_GUTTER_ROWS;
}

/** One gutter per card size for the regular grid (masonry uses its own, 6% of a column). */
const GUTTER_BY_SIZE: Record<CardSize, string> = {
  S: "[--media-gap:1rem] sm:[--media-gap:1.25rem]",
  M: "[--media-gap:1.25rem] sm:[--media-gap:1.5rem]",
  L: "[--media-gap:1.5rem] sm:[--media-gap:2rem]",
};

const GRID_COLUMNS_BY_SIZE: Record<CardSize, string> = {
  S: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4",
  M: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3",
  L: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2",
};

function sizeOf(cardSize: CardSize | undefined): CardSize {
  return cardSize === "S" || cardSize === "L" ? cardSize : "M";
}

/** Classes for the regular grid (every card at the same ratio). */
export function getMediaGridClasses(cardSize: CardSize = "M"): string {
  const size = sizeOf(cardSize);
  return `${GRID_COLUMNS_BY_SIZE[size]} ${GUTTER_BY_SIZE[size]} gap-(--media-gap)`;
}

/**
 * Rough rendered width of a card per size, for responsive images (srcset). Viewport-based, so
 * a little generous inside the narrower editor.
 */
const IMAGE_SIZES_BY_SIZE: Record<CardSize, string> = {
  S: "(max-width: 639px) 100vw, (max-width: 1279px) 33vw, 25vw",
  M: "(max-width: 639px) 100vw, (max-width: 767px) 50vw, 33vw",
  L: "(max-width: 639px) 100vw, 50vw",
};

interface MediaGridContextValue {
  isMasonry: boolean;
  imageSizes?: string;
}

const MediaGridContext = createContext<MediaGridContextValue>({ isMasonry: false });
const MasonryCellContext = createContext(false);

/** The `sizes` for card images in the surrounding MediaGrid; undefined outside one. */
export function useMediaGridImageSizes(): string | undefined {
  return useContext(MediaGridContext).imageSizes;
}

/** True inside a masonry cell, where the cell already has the card's shape and the card fills it. */
export function useMasonryCell(): boolean {
  return useContext(MasonryCellContext);
}

/**
 * One card's place in a MediaGrid (a list item). In masonry, `ratio` sets how many rows the
 * card spans; work it out with masonryRatio().
 */
export function MediaGridItem({ ratio = 16 / 9, className = "", style, children, ...props }: MediaGridItemProps) {
  const { isMasonry } = useContext(MediaGridContext);

  if (!isMasonry) {
    return (
      <li className={`min-w-0 ${className}`} style={style} {...props}>
        {children}
      </li>
    );
  }

  const shape = clampMasonryRatio(ratio);
  const cellStyle = {
    ...style,
    "--masonry-span": masonrySpan(shape),
    "--masonry-ratio": shape,
  } as React.CSSProperties;

  return (
    <li className={`media-masonry__item ${className}`} style={cellStyle} {...props}>
      <MasonryCellContext.Provider value={true}>{children}</MasonryCellContext.Provider>
    </li>
  );
}

/** Children that aren't MediaGridItems get one (default ratio), so every child is a list item. */
function asGridItem(child: React.ReactNode): React.ReactNode {
  if (React.isValidElement(child) && child.type === MediaGridItem) return child;
  return <MediaGridItem key={React.isValidElement(child) ? child.key : undefined}>{child}</MediaGridItem>;
}

/**
 * The card grid used by the delivery room, the portfolio and their editors. Regular mode puts
 * every card at one ratio; masonry shows each card at its own shape, in order across the top
 * row (see media-masonry.css).
 */
export function MediaGrid({ children, isMasonry = false, cardSize = "M", className = "", ...props }: MediaGridProps) {
  const size = sizeOf(cardSize);
  const items = React.Children.toArray(children).map(asGridItem);
  const context = useMemo(() => ({ isMasonry, imageSizes: IMAGE_SIZES_BY_SIZE[size] }), [isMasonry, size]);

  if (!isMasonry) {
    return (
      <MediaGridContext.Provider value={context}>
        <ul className={`${getMediaGridClasses(size)} ${className}`} {...props}>
          {items}
        </ul>
      </MediaGridContext.Provider>
    );
  }

  const lists: React.ReactNode[][] = [];
  for (let start = 0; start < items.length; start += MASONRY_CARDS_PER_GRID) {
    lists.push(items.slice(start, start + MASONRY_CARDS_PER_GRID));
  }

  return (
    <MediaGridContext.Provider value={context}>
      <div className={`media-masonry ${className}`} {...props}>
        {lists.map((list, index) => (
          <ul key={index} className="media-masonry__list" data-size={size}>
            {list}
          </ul>
        ))}
      </div>
    </MediaGridContext.Provider>
  );
}
