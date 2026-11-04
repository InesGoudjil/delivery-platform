"use client";

import { useEffect } from "react";
import { trackCompleteRegistration } from "@/lib/meta/pixel";

const COOKIE_NAME = "meta_event_complreg";

/**
 * Reads the `meta_event_complreg` cookie (set by `signupAction` on
 * the auto-login branch) and echoes the CompleteRegistration event
 * to the browser pixel with the same eventId the server-side CAPI
 * used. Then clears the cookie so it doesn't re-fire on next visit.
 *
 * Mounted in the workspace layout so it runs once per session after
 * a successful signup-redirect.
 */
export function MetaComplregEcho() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const match = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${COOKIE_NAME}=`));
    if (!match) return;
    const eventId = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
    if (!eventId) return;
    trackCompleteRegistration({ eventId, status: "signed_in" });
    // Clear so we don't re-fire on subsequent renders.
    document.cookie = `${COOKIE_NAME}=; Max-Age=0; path=/`;
  }, []);

  return null;
}
