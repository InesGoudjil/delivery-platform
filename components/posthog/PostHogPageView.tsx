"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getPostHogClient } from "@/lib/posthog/client";

/**
 * Fires a `$pageview` event on every client-side route change. The
 * SDK also auto-captures pageviews with `capture_pageview: true`, but
 * App Router's client-side navigation can race the SDK's history
 * listener; explicit capture is more reliable.
 */
export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const client = getPostHogClient();
    if (!client) return;
    let url = pathname;
    const qs = searchParams?.toString();
    if (qs) url += `?${qs}`;
    client.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}
