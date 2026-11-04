"use client";

import React, { createContext, useContext } from "react";
import type { WorkspaceEntitlements } from "@/core/entities/workspace";

const EntitlementsContext = createContext<WorkspaceEntitlements | null>(null);

export interface EntitlementsProviderProps {
  entitlements: WorkspaceEntitlements;
  children: React.ReactNode;
}

/**
 * Provides strongly-typed workspace plan entitlements, capabilities, and quotas
 * to all child components in the workspace layout tree.
 */
export function EntitlementsProvider({
  entitlements,
  children,
}: EntitlementsProviderProps) {
  return (
    <EntitlementsContext.Provider value={entitlements}>
      {children}
    </EntitlementsContext.Provider>
  );
}

/**
 * Accesses current workspace entitlements, limits, and boolean feature flags.
 * Throws if called outside an EntitlementsProvider.
 */
export function useEntitlements(): WorkspaceEntitlements {
  const context = useContext(EntitlementsContext);
  if (!context) {
    throw new Error("useEntitlements must be used within an EntitlementsProvider");
  }
  return context;
}

/**
 * Optional hook variant that returns null instead of throwing when outside provider.
 */
export function useOptionalEntitlements(): WorkspaceEntitlements | null {
  return useContext(EntitlementsContext);
}
