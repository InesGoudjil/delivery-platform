"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { pauseReplayOnPrivatePage, resumeReplayAfterPrivatePage, withPostHog } from "@/lib/posthog/client";
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

    resumeReplayAfterPrivatePage();

    // The URL is read now; the event is sent once PostHog has loaded (it's started when idle).
    const qs = searchParams?.toString();
    const url = `${window.location.origin}${pathname}${qs ? `?${qs}` : ""}`;
    withPostHog((client) => client.capture("$pageview", { $current_url: url }));
  }, [pathname, searchParams]);

  return null;
}
