"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  getPostHogClient,
  pauseReplayOnPrivatePage,
  resumeReplayAfterPrivatePage,
} from "@/lib/posthog/client";
import { isPrivateAnalyticsPath } from "@/lib/analytics/private-paths";

/**
 * Captures `$pageview` on the first load and on every client-side route change
 * (the SDK's own pageview capture is off, so there are no duplicates).
 *
 * Private pages (client rooms, invitations, sign-in) are skipped, and session
 * replay is paused while one is open.
 */
export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isPrivateAnalyticsPath(pathname)) {
      pauseReplayOnPrivatePage();
      return;
    }

    const client = getPostHogClient();
    if (!client) return;
    resumeReplayAfterPrivatePage();

    const qs = searchParams?.toString();
    client.capture("$pageview", { $current_url: `${window.location.origin}${pathname}${qs ? `?${qs}` : ""}` });
  }, [pathname, searchParams]);

  return null;
}
