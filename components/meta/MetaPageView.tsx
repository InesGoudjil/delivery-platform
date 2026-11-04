"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { pageview } from "@/lib/meta/pixel";

/**
 * Fires a PageView on every client-side route change. The bootstrap
 * script in `MetaPixel` already fires one PageView on the initial
 * server-rendered load, so we skip the first run here.
 */
export function MetaPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    pageview();
  }, [pathname, searchParams]);

  return null;
}
