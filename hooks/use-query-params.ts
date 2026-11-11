"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export interface SetQueryParamsOptions {
  set?: Record<string, string | number | boolean | string[] | null | undefined>;
  del?: string | string[];
  replace?: boolean;
  scroll?: boolean;
  getNewPath?: boolean;
  arrayDelimiter?: string;
}

export interface GetQueryStringOptions {
  include?: string[];
  exclude?: string[];
}

/**
 * Pure function to construct a merged query string.
 */
export function buildQueryString(
  currentParams: URLSearchParams | string | null | undefined,
  kv?: Record<string, any>,
  opts?: GetQueryStringOptions
): string {
  const newParams = new URLSearchParams(
    typeof currentParams === "string"
      ? currentParams
      : currentParams
      ? currentParams.toString()
      : ""
  );

  if (opts?.include && Array.isArray(opts.include)) {
    const filteredParams = new URLSearchParams();
    newParams.forEach((value, key) => {
      if (opts.include?.includes(key)) {
        filteredParams.set(key, value);
      }
    });
    return filteredParams.toString().length > 0 ? `?${filteredParams.toString()}` : "";
  }

  if (opts?.exclude && Array.isArray(opts.exclude)) {
    opts.exclude.forEach((k) => newParams.delete(k));
  }

  if (kv) {
    Object.entries(kv).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") {
        newParams.delete(k);
      } else if (Array.isArray(v)) {
        newParams.set(k, v.join(","));
      } else {
        newParams.set(k, String(v));
      }
    });
  }

  const queryString = newParams.toString();
  return queryString.length > 0 ? `?${queryString}` : "";
}

/**
 * Pure function to compute updated URL path when setting and deleting query parameters.
 */
export function computeUpdatedPath(
  pathname: string,
  currentParams: URLSearchParams | string | null | undefined,
  options: {
    set?: Record<string, string | number | boolean | string[] | null | undefined>;
    del?: string | string[];
    arrayDelimiter?: string;
  }
): string {
  const newParams = new URLSearchParams(
    typeof currentParams === "string"
      ? currentParams
      : currentParams
      ? currentParams.toString()
      : ""
  );

  const delimiter = options.arrayDelimiter || ",";

  if (options.set) {
    Object.entries(options.set).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") {
        newParams.delete(k);
      } else if (Array.isArray(v)) {
        newParams.set(k, v.join(delimiter));
      } else {
        newParams.set(k, String(v));
      }
    });
  }

  if (options.del) {
    if (Array.isArray(options.del)) {
      options.del.forEach((k) => newParams.delete(k));
    } else {
      newParams.delete(options.del);
    }
  }

  const queryString = newParams.toString();
  return `${pathname}${queryString.length > 0 ? `?${queryString}` : ""}`;
}

/**
 * URL-as-State Manager hook inspired by Dub.co.
 * Provides atomic, type-safe URL query parameter reads and updates
 * without unnecessary page re-renders or jumping scroll positions.
 */
export function useQueryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchParamsObj = useMemo(() => {
    if (!searchParams) return {};
    return Object.fromEntries(searchParams.entries());
  }, [searchParams]);

  const getQueryString = useCallback(
    (kv?: Record<string, any>, opts?: GetQueryStringOptions): string => {
      return buildQueryString(searchParams, kv, opts);
    },
    [searchParams]
  );

  const queryParams = useCallback(
    ({
      set,
      del,
      replace = true,
      scroll = false,
      getNewPath = false,
      arrayDelimiter = ",",
    }: SetQueryParamsOptions) => {
      const newPath = computeUpdatedPath(pathname, searchParams, {
        set,
        del,
        arrayDelimiter,
      });

      if (getNewPath) {
        return newPath;
      }

      if (replace) {
        router.replace(newPath, { scroll });
      } else {
        router.push(newPath, { scroll });
      }

      return newPath;
    },
    [pathname, router, searchParams]
  );

  const getParam = useCallback(
    (key: string): string | null => {
      return searchParams ? searchParams.get(key) : null;
    },
    [searchParams]
  );

  return {
    pathname,
    searchParams,
    searchParamsObj,
    queryParams,
    getQueryString,
    getParam,
  };
}
