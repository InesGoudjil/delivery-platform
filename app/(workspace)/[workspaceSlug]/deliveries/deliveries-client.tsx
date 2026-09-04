"use client";

import React, { useState } from "react";
import { DeliveriesHeader } from "./_components/deliveries-header";
import { DeliveryFilterBar } from "./_components/delivery-filter-bar";
import { DeliveryCardGrid } from "./_components/delivery-card-grid";

export interface DeliveryProjectItem {
  id: string;
  title: string;
  clientName: string;
  version: string;
  duration: string;
  status: "draft" | "in_review" | "approved" | "archived";
  shareToken: string;
  passcodeProtected: boolean;
  downloadsAllowed: boolean;
  commentsCount: number;
  lastActivity: string;
}

export interface DeliveriesClientProps {
  workspace: {
    id: string;
    brandName: string;
    slug: string;
  };
  deliveries: DeliveryProjectItem[];
}

export function DeliveriesClient({
  workspace,
  deliveries,
}: DeliveriesClientProps) {
  const [filter, setFilter] = useState<"all" | "in_review" | "approved">("all");

  const filteredDeliveries = deliveries.filter((d) => {
    if (filter === "all") return true;
    if (filter === "in_review") return d.status === "in_review" || d.status === "draft";
    if (filter === "approved") return d.status === "approved";
    return true;
  });

  const inReviewCount = deliveries.filter(
    (d) => d.status === "in_review" || d.status === "draft"
  ).length;
  const approvedCount = deliveries.filter((d) => d.status === "approved").length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* 1. Header & New Delivery Room Modal */}
      <DeliveriesHeader workspace={workspace} />

      {/* 2. Filter Tab Bar */}
      <DeliveryFilterBar
        totalCount={deliveries.length}
        inReviewCount={inReviewCount}
        approvedCount={approvedCount}
        activeFilter={filter}
        onFilterChange={setFilter}
      />

      {/* 3. Deliveries Cards Grid */}
      <DeliveryCardGrid
        workspaceSlug={workspace.slug}
        deliveries={filteredDeliveries}
      />
    </div>
  );
}
