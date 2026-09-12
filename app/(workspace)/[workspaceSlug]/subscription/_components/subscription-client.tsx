"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { ActiveSubscriptionCard } from "./active-subscription-card";
import { PlanComparisonGrid, PlanItem } from "./plan-comparison-grid";
import { InvoicesHistoryCard } from "./invoices-history-card";
import { Invoice } from "@/core/entities/invoice";
import { WorkspaceFeatureConfig } from "@/core/entities/workspace";

interface SubscriptionClientProps {
  workspaceId: string;
  workspaceSlug: string;
  currentPlanSlug: string;
  currentPlanName: string;
  subStatus: string;
  periodEnd?: string | null;
  plans: PlanItem[];
  invoices: Invoice[];
  workspaceFeatures: WorkspaceFeatureConfig;
  storageUsedBytes?: number;
  canManageBilling?: boolean;
  hasBillingHistory?: boolean;
  initialBillingStatus?: "success" | "cancel" | null;
}

export function SubscriptionClient({
  workspaceId,
  workspaceSlug,
  currentPlanSlug,
  currentPlanName,
  subStatus,
  periodEnd,
  plans,
  invoices,
  workspaceFeatures,
  storageUsedBytes = 0,
  canManageBilling = true,
  hasBillingHistory = false,
  initialBillingStatus = null,
}: SubscriptionClientProps) {
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "info" } | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [billingBanner, setBillingBanner] = useState<"success" | "cancel" | null>(initialBillingStatus);

  useEffect(() => {
    if (initialBillingStatus === "success") {
      setToast({
        message: "🎉 Payment confirmed! Your workspace subscription and feature limits have been upgraded.",
        type: "success",
      });
      // Clean query params from URL without triggering a full page refresh
      window.history.replaceState({}, "", window.location.pathname);
    } else if (initialBillingStatus === "cancel") {
      setToast({
        message: "Checkout canceled. Your current workspace plan remains active.",
        type: "info",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [initialBillingStatus]);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCheckout = async (plan: PlanItem) => {
    if (!canManageBilling) {
      showToast("Only workspace owners or administrators can change subscriptions.", "error");
      return;
    }

    if (!plan.stripePriceId) {
      showToast(`Plan '${plan.name}' has no Stripe Price ID configured.`, "error");
      return;
    }

    try {
      setLoadingPlanId(plan.id);
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          workspaceSlug,
          planId: plan.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate Stripe checkout");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      showToast(`Checkout Error: ${err.message}`, "error");
      setLoadingPlanId(null);
    }
  };

  const handleOpenPortal = async () => {
    if (!canManageBilling) {
      showToast("Only workspace owners or administrators can access the billing portal.", "error");
      return;
    }

    try {
      setIsLoadingPortal(true);
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          workspaceSlug,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to open Stripe billing portal");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      showToast(`Portal Error: ${err.message}`, "error");
      setIsLoadingPortal(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 font-semibold text-xs px-4 py-3 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2.5 ${
            toast.type === "error"
              ? "bg-destructive text-destructive-foreground"
              : toast.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-primary text-primary-foreground"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : toast.type === "error" ? (
            <AlertCircle className="size-4 shrink-0" />
          ) : null}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Success banner if upgraded */}
      {billingBanner === "success" && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
            <span>
              <strong>Success!</strong> Your subscription has been successfully synchronized and upgraded.
            </span>
          </div>
          <button
            onClick={() => setBillingBanner(null)}
            className="text-xs font-mono font-semibold underline hover:opacity-80 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Active Subscription Hero Card */}
      <ActiveSubscriptionCard
        workspaceId={workspaceId}
        currentPlanName={currentPlanName}
        currentPlanSlug={currentPlanSlug}
        subStatus={subStatus}
        periodEnd={periodEnd}
        features={workspaceFeatures}
        storageUsedBytes={storageUsedBytes}
        canManageBilling={canManageBilling}
        hasBillingHistory={hasBillingHistory}
        onOpenPortal={handleOpenPortal}
        isLoadingPortal={isLoadingPortal}
      />

      {/* 2. Compare & Upgrade Plans Grid */}
      <PlanComparisonGrid
        currentPlanSlug={currentPlanSlug}
        plans={plans}
        onCheckout={handleCheckout}
        loadingPlanId={loadingPlanId}
        canManageBilling={canManageBilling}
      />

      {/* 3. Invoices History Card */}
      <InvoicesHistoryCard invoices={invoices} />
    </div>
  );
}
