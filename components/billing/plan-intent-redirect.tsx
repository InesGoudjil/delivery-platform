"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { forgetPlanIntent, readPlanIntent } from "@/lib/billing/plan-intent";

/**
 * Someone who picked a paid plan on the landing page and then signed up lands in their
 * workspace on the free plan. This sends them on to the plan they picked, once.
 *
 * Mounted in the workspace layout, where every way of signing up ends.
 */
export function PlanIntentRedirect({ workspaceSlug }: { workspaceSlug: string }) {
  const router = useRouter();

  useEffect(() => {
    const planSlug = readPlanIntent();
    if (!planSlug) return;
    forgetPlanIntent();
    router.replace(`/${workspaceSlug}/subscription?plan=${encodeURIComponent(planSlug)}`);
  }, [router, workspaceSlug]);

  return null;
}
