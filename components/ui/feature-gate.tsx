"use client";

import React from "react";
import { useOptionalEntitlements } from "@/components/providers/entitlements-provider";
import type { PlanCapabilities } from "@/core/entities/workspace";

export interface FeatureGateProps {
  feature: keyof PlanCapabilities;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Declarative component that gates UI elements based on workspace plan capabilities.
 * Renders `fallback` if the feature is not included in the current plan.
 */
export function FeatureGate({
  feature,
  fallback = null,
  children,
}: FeatureGateProps) {
  const entitlements = useOptionalEntitlements();

  if (!entitlements) {
    // If not in workspace context (e.g. public page), render children as fallback
    return <>{children}</>;
  }

  const isAllowed = Boolean(entitlements.can[feature]);
  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
