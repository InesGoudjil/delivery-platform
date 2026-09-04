import React from "react";
import { PageHeader } from "@/components/ui/page-container";

interface SubscriptionHeaderProps {
  workspaceName: string;
}

export function SubscriptionHeader({ workspaceName }: SubscriptionHeaderProps) {
  return (
    <PageHeader
      badge="WORKSPACE DASHBOARD"
      title="Subscription & Billing"
      subtitle={
        <>
          Manage active plans, storage limits, payment methods, and tax receipts for{" "}
          <strong className="text-foreground">{workspaceName}</strong>.
        </>
      }
    />
  );
}
