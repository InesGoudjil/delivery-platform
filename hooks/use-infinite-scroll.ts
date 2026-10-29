"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface UseInfiniteScrollOptions {
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Whether a page load is currently in flight */
  isLoading: boolean;
  /** Callback invoked when sentinel comes into view */
  onLoadMore: () => void | Promise<void>;
  /** Intersection rootMargin, defaults to "300px" */
  rootMargin?: string;
  /** Intersection threshold, defaults to 0 */
  threshold?: number;
  /** Optional flag to disable the observer */
  disabled?: boolean;
}

export function useInfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  rootMargin = "300px",
  threshold = 0,
  disabled = false,
}: UseInfiniteScrollOptions) {
  const [sentinelNode, setSentinelNode] = useState<HTMLDivElement | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    if (!isLoading) {
      isFetchingRef.current = false;
    }
  }, [isLoading]);

  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    setSentinelNode(node);
  }, []);

  useEffect(() => {
    if (!sentinelNode || !hasMore || isLoading || disabled) {
      return;
    }

    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          entry?.isIntersecting &&
          hasMore &&
          !isLoading &&
          !isFetchingRef.current &&
          !disabled
        ) {
          isFetchingRef.current = true;
          onLoadMoreRef.current();
        }
      },
      {
        root: null,
        rootMargin,
        threshold,
      }
    );

    observer.observe(sentinelNode);

    return () => {
      observer.disconnect();
    };
  }, [sentinelNode, hasMore, isLoading, disabled, rootMargin, threshold]);

  return { sentinelRef };
}
