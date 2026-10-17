"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { deleteDeliveryAction } from "@/app/actions/deliveries";
import { DeleteConfirmDialog } from "@/components/workspaces/delete-confirm-dialog";
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
  assetsCount?: number;
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
  features?: Record<string, any>;
}

export function DeliveriesClient({
  workspace,
  deliveries,
  features,
}: DeliveriesClientProps) {
  const [items, setItems] = useState<DeliveryProjectItem[]>(deliveries);
  const [filter, setFilter] = useState<"all" | "in_review" | "approved">("all");
  const [deliveryToConfirmDelete, setDeliveryToConfirmDelete] =
    useState<DeliveryProjectItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setItems(deliveries);
  }, [deliveries]);

  const canSendWhatsApp = features ? Boolean(features.whatsapp_delivery) : true;

  const executeDeleteDelivery = async (target: DeliveryProjectItem) => {
    const previousItems = items;
    setDeletingId(target.id);
    setItems((prev) => prev.filter((d) => d.id !== target.id));

    try {
      const res = await deleteDeliveryAction(target.id, workspace.slug);
      if (res.success) {
        toast.success(`Delivery "${target.title}" deleted`);
        setDeliveryToConfirmDelete(null);
      } else {
        setItems(previousItems);
        toast.error(res.error || "Failed to delete delivery");
      }
    } catch (err: any) {
      setItems(previousItems);
      toast.error(err?.message || "Failed to delete delivery");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRequestDelete = (item: DeliveryProjectItem) => {
    const count = item.assetsCount ?? 0;
    if (count > 0) {
      setDeliveryToConfirmDelete(item);
    } else {
      void executeDeleteDelivery(item);
    }
  };

  const filteredDeliveries = items.filter((d) => {
    if (filter === "all") return true;
    if (filter === "in_review") return d.status === "in_review" || d.status === "draft";
    if (filter === "approved") return d.status === "approved";
    return true;
  });

  const inReviewCount = items.filter(
    (d) => d.status === "in_review" || d.status === "draft"
  ).length;
  const approvedCount = items.filter((d) => d.status === "approved").length;
  const activeDeliveriesCount = items.filter((d) => d.status !== "archived").length;

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-200">
      {/* 1. Header & New Delivery Room Modal */}
      <DeliveriesHeader
        workspace={workspace}
        features={features}
        activeCount={activeDeliveriesCount}
      />

      {/* 2. Filter Tab Bar */}
      <DeliveryFilterBar
        totalCount={items.length}
        inReviewCount={inReviewCount}
        approvedCount={approvedCount}
        activeFilter={filter}
        onFilterChange={setFilter}
      />

      {/* 3. Deliveries Cards Grid */}
      <DeliveryCardGrid
        workspaceSlug={workspace.slug}
        deliveries={filteredDeliveries}
        canSendWhatsApp={canSendWhatsApp}
        deletingId={deletingId}
        onDeleteDelivery={handleRequestDelete}
      />

      {/* 4. Conditional Confirmation Dialog (only shown when delivery has assets) */}
      <DeleteConfirmDialog
        isOpen={Boolean(deliveryToConfirmDelete)}
        onOpenChange={(open) => {
          if (!open) setDeliveryToConfirmDelete(null);
        }}
        title="Delete Delivery Project"
        itemName={deliveryToConfirmDelete?.title}
        description={
          deliveryToConfirmDelete
            ? `This delivery contains ${deliveryToConfirmDelete.assetsCount} ${
                deliveryToConfirmDelete.assetsCount === 1 ? "asset" : "assets"
              }. Deleting this delivery project will move its assets to your workspace Trash (retained for 30 days) and permanently remove the delivery room.`
            : undefined
        }
        isDeleting={Boolean(
          deliveryToConfirmDelete && deletingId === deliveryToConfirmDelete.id
        )}
        isPermanent={true}
        confirmText="Delete Delivery"
        onConfirm={async () => {
          if (deliveryToConfirmDelete) {
            await executeDeleteDelivery(deliveryToConfirmDelete);
          }
        }}
      />
    </div>
  );
}
