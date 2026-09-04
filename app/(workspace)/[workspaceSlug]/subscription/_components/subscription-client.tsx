"use client";

import React, { useState } from "react";
import { ActiveSubscriptionCard } from "./active-subscription-card";
import { PlanComparisonGrid, PlanItem } from "./plan-comparison-grid";
import { InvoicesHistoryCard } from "./invoices-history-card";
import { Invoice } from "@/core/entities/invoice";

interface SubscriptionClientProps {
  workspaceId: string;
  currentPlanSlug: string;
  currentPlanName: string;
  subStatus: string;
  periodEnd?: string | null;
  plans: PlanItem[];
  invoices: Invoice[];
  currentPlanFeatures: Record<string, any>;
}

export function SubscriptionClient({
  workspaceId,
  currentPlanSlug,
  currentPlanName,
  subStatus,
  periodEnd,
  plans,
  invoices,
  currentPlanFeatures,
}: SubscriptionClientProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleCheckout = async (plan: PlanItem) => {
    if (!plan.stripePriceId) {
      showToast(`Plan '${plan.name}' has no Stripe Price ID configured.`);
      return;
    }

    try {
      setLoadingPlanId(plan.id);
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
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
      showToast(`Checkout Error: ${err.message}`);
      setLoadingPlanId(null);
    }
  };

  const handleOpenPortal = async () => {
    try {
      setIsLoadingPortal(true);
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to open Stripe billing portal");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      showToast(`Portal Error: ${err.message}`);
      setIsLoadingPortal(false);
    }
  };

  const storageGb = currentPlanFeatures?.storage_gb || 2;
  const clientLinksLimit = currentPlanFeatures?.client_links ?? 1;
  const whatsappDelivery = Boolean(currentPlanFeatures?.whatsapp_delivery);
  const whiteLabel = Boolean(currentPlanFeatures?.white_label);

  return (
    <div className="flex flex-col gap-8">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground font-semibold text-xs px-4 py-2.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}

      {/* 1. Active Subscription Hero Card */}
      <ActiveSubscriptionCard
        workspaceId={workspaceId}
        currentPlanName={currentPlanName}
        currentPlanSlug={currentPlanSlug}
        subStatus={subStatus}
        periodEnd={periodEnd}
        storageGb={storageGb}
        clientLinksLimit={clientLinksLimit}
        whatsappDelivery={whatsappDelivery}
        whiteLabel={whiteLabel}
        onOpenPortal={handleOpenPortal}
        isLoadingPortal={isLoadingPortal}
      />

      {/* 2. Compare & Upgrade Plans Grid */}
      <PlanComparisonGrid
        currentPlanSlug={currentPlanSlug}
        plans={plans}
        onCheckout={handleCheckout}
        loadingPlanId={loadingPlanId}
      />

      {/* 3. Invoices History Card */}
      <InvoicesHistoryCard invoices={invoices} />
    </div>
  );
}
