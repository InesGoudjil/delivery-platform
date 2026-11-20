"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useOptionalEntitlements } from "@/components/providers/entitlements-provider";
import { deleteDeliveryAction } from "@/app/actions/deliveries";
import { DeleteConfirmDialog } from "@/components/workspaces/delete-confirm-dialog";
import { useQueryParams } from "@/hooks/use-query-params";
import { mutatePrefix } from "@/lib/swr/mutate";
import {
  DEFAULT_DELIVERY_SORT,
  countByTab,
  inTab,
  parseDeliverySort,
  parseDeliveryTab,
  selectDeliveries,
  type DeliveryProjectItem,
  type DeliverySort,
  type DeliveryTab,
} from "@/lib/deliveries/list-view";
import { DeliveriesHeader } from "./_components/deliveries-header";
import { DeliveryFilterBar } from "./_components/delivery-filter-bar";
import { DeliveryCardGrid, type DeliveryGridEmptyState } from "./_components/delivery-card-grid";

export type { DeliveryProjectItem } from "@/lib/deliveries/list-view";

/** How long typing pauses before the search goes into the URL. Browsers throttle history updates. */
const SEARCH_URL_DELAY_MS = 300;

/** What a tab says when it has no rooms and no search or client filter is on. */
const EMPTY_TABS: Record<Exclude<DeliveryTab, "all">, DeliveryGridEmptyState> = {
  needs_reply: {
    title: "Nothing waiting on you",
    description: "No client notes are open. New ones show up here.",
  },
  in_review: {
    title: "No rooms in review",
    description: "Rooms you've shared that aren't approved yet show up here.",
  },
  approved: {
    title: "No approved rooms yet",
    description: "Rooms move here once the client approves them.",
  },
  archived: {
    title: "No archived rooms",
    description: "Rooms you archive show up here.",
  },
};

export interface DeliveriesClientProps {
  workspace: {
    id: string;
    brandName: string;
    slug: string;
  };
  deliveries: DeliveryProjectItem[];
  features?: Record<string, any>;
  /** When the server rendered the list. Relative times count from here on both sides. */
  renderedAt: number;
}

export function DeliveriesClient({
  workspace,
  deliveries,
  features,
  renderedAt,
}: DeliveriesClientProps) {
  const [items, setItems] = useState<DeliveryProjectItem[]>(deliveries);
  const [deliveryToConfirmDelete, setDeliveryToConfirmDelete] =
    useState<DeliveryProjectItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { queryParams, getParam } = useQueryParams();

  // The list's state lives in the URL (?status, ?search, ?sort, ?client), so a reload or a
  // shared link keeps it. Changes go through the History API only: every room is already
  // loaded, so the server has nothing new to send.
  const tab = parseDeliveryTab(getParam("status"));
  const sort = parseDeliverySort(getParam("sort"));
  const urlSearch = (getParam("search") || "").trim();
  const clientParam = getParam("client");

  // The box shows what's typed at once; the URL follows once typing pauses.
  const [search, setSearch] = useState(urlSearch);
  const writtenSearch = useRef(urlSearch);

  // ?search= changed from elsewhere (a link, the sidebar's bare /deliveries): the box follows.
  useEffect(() => {
    if (urlSearch === writtenSearch.current) return;
    writtenSearch.current = urlSearch;
    setSearch(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    const value = search.trim();
    if (value === writtenSearch.current) return;
    const timer = setTimeout(() => {
      writtenSearch.current = value;
      queryParams({ set: { search: value || null }, del: "page", shallow: true });
    }, SEARCH_URL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search, queryParams]);

  useEffect(() => {
    setItems(deliveries);
  }, [deliveries]);

  const entitlements = useOptionalEntitlements();
  const canSendWhatsApp = entitlements
    ? entitlements.can.sendWhatsApp
    : Boolean(features?.whatsapp_delivery);

  // ?client= only counts when that client has rooms here; any other id is ignored.
  const clientName = clientParam
    ? items.find((item) => item.clientId === clientParam)?.clientName
    : undefined;
  const clientId = clientName !== undefined ? clientParam : null;

  const visible = useMemo(
    () => selectDeliveries(items, { tab, search, sort, clientId }),
    [items, tab, search, sort, clientId]
  );
  const counts = useMemo(() => countByTab(items, { search, clientId }), [items, search, clientId]);
  const tabCount = useMemo(() => items.filter((item) => inTab(item, tab)).length, [items, tab]);
  const refining = search.trim() !== "" || clientId !== null;

  const setParams = useCallback(
    (set: Record<string, string | null>) => {
      queryParams({ set, del: "page", shallow: true });
    },
    [queryParams]
  );

  const handleTabChange = (next: DeliveryTab) => setParams({ status: next === "all" ? null : next });
  const handleSortChange = (next: DeliverySort) =>
    setParams({ sort: next === DEFAULT_DELIVERY_SORT ? null : next });
  // Clicking the filtered client's name again shows every client.
  const handleClientFilter = (id: string) => setParams({ client: id === clientId ? null : id });
  const handleClearClient = () => setParams({ client: null });
  const handleClearAll = () => {
    writtenSearch.current = "";
    setSearch("");
    setParams({ search: null, client: null });
  };

  const executeDeleteDelivery = async (target: DeliveryProjectItem) => {
    const previousItems = items;
    setDeletingId(target.id);
    // Optimistic UI update: immediately remove from view
    setItems((prev) => prev.filter((d) => d.id !== target.id));

    try {
      const res = await deleteDeliveryAction(target.id, workspace.slug);
      if (res.success) {
        toast.success(`Delivery "${target.title}" deleted`);
        setDeliveryToConfirmDelete(null);
        // Wildcard revalidation for active queries
        await mutatePrefix([
          `/api/workspaces/${workspace.id}/deliveries`,
          `/${workspace.slug}/deliveries`,
        ]);
      } else {
        // Rollback on server error
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

  // Rooms exist but none is shown: say why, and how to get them back.
  let empty: DeliveryGridEmptyState | undefined;
  if (items.length > 0 && visible.length === 0) {
    if (refining) {
      empty = {
        title: "No rooms match",
        description: "Try another search, or clear the filters.",
        action: { label: "Clear filters", onClick: handleClearAll },
      };
    } else if (tab === "all") {
      empty = {
        title: "Every room is archived",
        description: "Archived rooms have their own tab.",
        action: { label: "Show archived", onClick: () => handleTabChange("archived") },
      };
    } else {
      empty = EMPTY_TABS[tab];
    }
  }

  const activeDeliveriesCount = items.filter((d) => d.status !== "archived").length;

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-200">
      {/* 1. Header & New Delivery Room Modal */}
      <DeliveriesHeader
        workspace={workspace}
        features={features}
        activeCount={activeDeliveriesCount}
      />

      {/* 2. Status tabs, search and sort (synced to the URL) */}
      <DeliveryFilterBar
        tab={tab}
        counts={counts}
        onTabChange={handleTabChange}
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={handleSortChange}
        shownCount={visible.length}
        tabCount={tabCount}
        client={clientId && clientName !== undefined ? { id: clientId, name: clientName } : null}
        onClearClient={handleClearClient}
        onClearAll={handleClearAll}
      />

      {/* 3. Deliveries Cards Grid */}
      <DeliveryCardGrid
        workspaceSlug={workspace.slug}
        deliveries={visible}
        now={renderedAt}
        canSendWhatsApp={canSendWhatsApp}
        deletingId={deletingId}
        onDeleteDelivery={handleRequestDelete}
        empty={empty}
        activeClientId={clientId}
        onClientFilter={handleClientFilter}
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
