"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Info, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deletePlanAction } from "@/app/actions/admin";
import { planTier, yearlySavingsPercent } from "@/core/entities/plan";
import type { WorkspaceFeatureConfig } from "@/core/entities/workspace";
import { AdminPageHeader, AdminSection } from "../../_components/page-header";
import { Pill, SubscriptionStatusBadge } from "../../_components/badges";
import { KpiCard } from "../../_components/kpi-card";
import { ReasonDialog } from "../../_components/reason-dialog";
import { formatDate, formatGb, formatMoney, formatNumber, SUBSCRIPTION_STATUS_LABELS } from "../../_lib/format";
import { CAPABILITIES, featuresDraftFrom, PlanEditorDialog, type PlanTierItem } from "./plan-editor-dialog";

export interface AdminPlanItem {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  currency: string;
  billingInterval: string;
  sortOrder: number;
  isActive: boolean;
  activeSubscribersCount: number;
  stripePriceId?: string | null;
  features: WorkspaceFeatureConfig;
}

export interface AdminSubscriptionListItem {
  id: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  planId: string;
  planName: string;
  billingInterval: string;
  priceCents: number;
  status: "active" | "trialing" | "past_due" | "canceled";
  currency: string;
  priceFormatted: string;
  createdAt: string;
}

export interface SubscriptionsClientProps {
  plans: AdminPlanItem[];
  subscriptions: AdminSubscriptionListItem[];
}

const ALL = "__all";
const STATUSES = ["active", "trialing", "past_due", "canceled"] as const;

/**
 * Pairs each monthly plan with its yearly twin, in display order. A yearly plan whose monthly
 * plan is gone gets a row of its own, so it can still be seen and removed.
 */
function toTiers(plans: AdminPlanItem[]): PlanTierItem[] {
  const monthlySlugs = new Set(plans.filter((p) => p.billingInterval !== "year").map((p) => p.slug));
  const tiers: PlanTierItem[] = [];
  for (const plan of plans) {
    if (plan.billingInterval === "year") {
      if (!monthlySlugs.has(planTier(plan.slug))) tiers.push({ monthly: plan, yearly: null });
      continue;
    }
    const yearly = plans.find((p) => p.billingInterval === "year" && planTier(p.slug) === plan.slug) ?? null;
    tiers.push({ monthly: plan, yearly });
  }
  return tiers.sort((a, b) => a.monthly.sortOrder - b.monthly.sortOrder);
}

/** Sold yearly: the yearly plan is on sale, or hidden only because the whole tier is. */
const sellsYearly = ({ monthly, yearly }: PlanTierItem) => Boolean(yearly && (yearly.isActive || !monthly.isActive));
/** "Unlimited rooms", "1 room", "20 rooms". */
const limit = (value: number, one: string, many: string) =>
  value === -1 ? `Unlimited ${many}` : `${formatNumber(value)} ${value === 1 ? one : many}`;

export function SubscriptionsClient({ plans, subscriptions }: SubscriptionsClientProps) {
  const router = useRouter();
  const tiers = useMemo(() => toTiers(plans), [plans]);
  const nextSortOrder = Math.max(0, ...plans.map((p) => p.sortOrder)) + 1;

  const [editing, setEditing] = useState<PlanTierItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<PlanTierItem | null>(null);

  // Revenue at today's prices: yearly subscriptions count as a twelfth of their price.
  const active = subscriptions.filter((s) => s.status === "active");
  const mrrCents = active.reduce(
    (sum, s) => sum + (s.billingInterval === "year" ? Math.round(s.priceCents / 12) : s.priceCents),
    0
  );
  const payingCount = active.filter((s) => s.priceCents > 0).length;
  const trialingCount = subscriptions.filter((s) => s.status === "trialing").length;
  const pastDueCount = subscriptions.filter((s) => s.status === "past_due").length;

  const paidOnSale = tiers.filter(
    (t) => t.monthly.billingInterval !== "year" && t.monthly.isActive && t.monthly.priceCents > 0
  );
  const yearlyOnSale = paidOnSale.filter((t) => t.yearly?.isActive);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        title="Plans & subscriptions"
        description="Every plan's prices, limits and features. The landing and subscription pages show what's set here."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" /> New plan
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Estimated MRR" value={formatMoney(mrrCents, "USD")} hint="Active subscriptions at current prices" />
        <KpiCard
          label="Paying subscribers"
          value={formatNumber(payingCount)}
          hint={`${formatNumber(active.length)} active in all`}
        />
        <KpiCard label="Trialing" value={formatNumber(trialingCount)} />
        <KpiCard
          label="Past due"
          value={formatNumber(pastDueCount)}
          hint={pastDueCount > 0 ? "Payment failed; Stripe is retrying" : "No failed payments"}
          tone={pastDueCount > 0 ? "warning" : "default"}
        />
      </div>

      {paidOnSale.length > 0 && yearlyOnSale.length === 0 && (
        <div role="status" className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="font-medium">Yearly billing is off</p>
            <p className="text-muted-foreground">
              The pricing pages show the Monthly / Yearly switch once a paid plan has a yearly price. Edit a plan and
              turn on <span className="font-medium text-foreground">Also sell yearly</span>.
            </p>
          </div>
        </div>
      )}

      <AdminSection
        title="Plans"
        description={`In the order the pricing pages show them. ${yearlyOnSale.length} of ${paidOnSale.length} paid plans sold yearly.`}
      >
        <div className="-m-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4 text-xs">Plan</TableHead>
                <TableHead className="text-xs">Price</TableHead>
                <TableHead className="text-xs">Subscribers</TableHead>
                <TableHead className="text-xs">Limits</TableHead>
                <TableHead className="text-xs">Features</TableHead>
                <TableHead className="sticky right-0 bg-card pr-4 text-right text-xs">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((tier) => (
                <PlanRow
                  key={tier.monthly.id}
                  tier={tier}
                  onEdit={() => setEditing(tier)}
                  onDelete={() => setDeleting(tier)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </AdminSection>

      <SubscriptionsSection subscriptions={subscriptions} />

      <PlanEditorDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        tier={editing === "new" ? null : editing}
        nextSortOrder={nextSortOrder}
        onSaved={(message) => {
          toast.success(message);
          router.refresh();
        }}
      />

      <DeletePlanDialog
        tier={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onDeleted={(message) => {
          toast.success(message);
          router.refresh();
        }}
      />
    </div>
  );
}

function PlanRow({ tier, onEdit, onDelete }: { tier: PlanTierItem; onEdit: () => void; onDelete: () => void }) {
  const { monthly, yearly } = tier;
  const orphanYearly = monthly.billingInterval === "year";
  const f = featuresDraftFrom(monthly.features, planTier(monthly.slug));
  const subscribers = monthly.activeSubscribersCount + (yearly?.activeSubscribersCount ?? 0);
  const saving = yearly ? yearlySavingsPercent(monthly.priceCents, yearly.priceCents) : 0;
  const enabled = CAPABILITIES.filter((cap) => f[cap.key]);

  return (
    <TableRow className={monthly.isActive ? undefined : "text-muted-foreground"}>
      <TableCell className="pl-4 align-top">
        <div className="flex flex-wrap items-center gap-1.5">
          {orphanYearly ? (
            <span className="font-medium text-foreground">{monthly.name}</span>
          ) : (
            <button type="button" onClick={onEdit} className="font-medium text-foreground hover:text-primary hover:underline">
              {monthly.name}
            </button>
          )}
          {!monthly.isActive && <Pill tone="warning">Hidden</Pill>}
          {orphanYearly && <Pill tone="danger">No monthly plan</Pill>}
        </div>
        <p className="font-mono text-xs text-muted-foreground">{monthly.slug}</p>
      </TableCell>

      <TableCell className="align-top">
        <p className="font-medium text-foreground">
          {monthly.priceCents === 0
            ? "Free"
            : `${formatMoney(monthly.priceCents, monthly.currency)}/${orphanYearly ? "yr" : "mo"}`}
        </p>
        {!orphanYearly && monthly.priceCents > 0 && (
          <p className="text-xs text-muted-foreground">
            {yearly && sellsYearly(tier) ? (
              <>
                {formatMoney(yearly.priceCents, yearly.currency)}/yr
                {saving > 0 && <span className="text-primary"> · save {saving}%</span>}
              </>
            ) : (
              "Monthly only"
            )}
          </p>
        )}
      </TableCell>

      <TableCell className="align-top">
        <p className="text-foreground">{formatNumber(subscribers)}</p>
        {yearly && subscribers > 0 && (
          <p className="text-xs text-muted-foreground">
            {formatNumber(monthly.activeSubscribersCount)} monthly · {formatNumber(yearly.activeSubscribersCount)} yearly
          </p>
        )}
      </TableCell>

      <TableCell className="min-w-56 align-top text-xs whitespace-normal text-muted-foreground">
        <p>
          <span className="text-foreground">{formatGb(f.storage_gb)}</span> storage · {f.team_seats} seat
          {f.team_seats === 1 ? "" : "s"}
        </p>
        <p>
          {limit(f.client_links, "room", "rooms")} · {limit(f.share_links_per_delivery, "link", "links")} per room
        </p>
        <p>
          {limit(f.portfolio_videos, "portfolio video", "portfolio videos")} ·{" "}
          {f.languages.map((l) => (l === "ar" ? "AR" : "EN")).join(" + ")}
        </p>
      </TableCell>

      <TableCell className="min-w-48 align-top whitespace-normal">
        <p className="text-xs">
          <span className="font-medium text-foreground">
            {enabled.length} of {CAPABILITIES.length}
          </span>{" "}
          <span className="text-muted-foreground">features</span>
        </p>
        <p
          className="min-w-48 max-w-64 text-xs text-muted-foreground"
          title={CAPABILITIES.map((cap) => `${f[cap.key] ? "✓" : "✗"} ${cap.label}`).join("\n")}
        >
          {enabled.length === 0 ? "None" : enabled.map((cap) => cap.short).join(" · ")}
        </p>
      </TableCell>

      <TableCell className="sticky right-0 bg-card pr-4 text-right align-top">
        <div className="flex justify-end gap-1">
          {!orphanYearly && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="size-3.5" /> Edit
            </Button>
          )}
          {monthly.slug !== "starter" && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive"
              aria-label={`Delete ${monthly.name}`}
              title="Delete or archive"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function SubscriptionsSection({ subscriptions }: { subscriptions: AdminSubscriptionListItem[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>(ALL);

  const q = query.trim().toLowerCase();
  const rows = subscriptions.filter(
    (s) =>
      (status === ALL || s.status === status) &&
      (!q ||
        s.workspaceName.toLowerCase().includes(q) ||
        s.workspaceSlug.toLowerCase().includes(q) ||
        s.planName.toLowerCase().includes(q))
  );
  const statusItems = [
    { value: ALL, label: "Status: all" },
    ...STATUSES.map((value) => ({ value, label: `Status: ${SUBSCRIPTION_STATUS_LABELS[value] ?? value}` })),
  ];
  const filtered = q !== "" || status !== ALL;

  return (
    <AdminSection
      title="Subscriptions"
      description={`${formatNumber(rows.length)} of ${formatNumber(subscriptions.length)} workspaces with a subscription.`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workspace or plan"
            aria-label="Search workspace or plan"
            className="h-8 pl-8"
          />
        </div>
        <Select items={statusItems} value={status} onValueChange={(value) => setStatus(value ? String(value) : ALL)}>
          <SelectTrigger size="sm" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              setStatus(ALL);
            }}
          >
            <X className="size-3.5" /> Clear
          </Button>
        )}
      </div>

      <div className="-mx-4 -mb-4 overflow-x-auto border-t border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4 text-xs">Workspace</TableHead>
              <TableHead className="text-xs">Plan</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Price</TableHead>
              <TableHead className="pr-4 text-xs">Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                  {filtered ? "Nothing matches these filters." : "No subscriptions yet."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="pl-4">
                    <Link href={`/admin/workspaces/${sub.workspaceId}`} className="font-medium hover:text-primary">
                      {sub.workspaceName}
                    </Link>
                    {sub.workspaceSlug && <p className="font-mono text-xs text-muted-foreground">{sub.workspaceSlug}</p>}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      {sub.planName}
                      {sub.billingInterval === "year" && <Pill tone="primary">Yearly</Pill>}
                    </span>
                  </TableCell>
                  <TableCell>
                    <SubscriptionStatusBadge status={sub.status} />
                  </TableCell>
                  <TableCell>{sub.priceFormatted}</TableCell>
                  <TableCell className="pr-4 text-muted-foreground">{formatDate(sub.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminSection>
  );
}

/** Deletes a tier: its yearly plan, then its monthly plan. A plan someone pays for is archived instead. */
function DeletePlanDialog({
  tier,
  onOpenChange,
  onDeleted,
}: {
  tier: PlanTierItem | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: (message: string) => void;
}) {
  const subscribers = tier ? tier.monthly.activeSubscribersCount + (tier.yearly?.activeSubscribersCount ?? 0) : 0;

  return (
    <ReasonDialog
      open={tier !== null}
      onOpenChange={onOpenChange}
      title={`Delete ${tier?.monthly.name ?? "plan"}`}
      description={
        tier?.yearly
          ? "Removes the monthly and the yearly plan, and archives their Stripe prices."
          : "Removes the plan and archives its Stripe price."
      }
      confirmLabel={subscribers > 0 ? "Archive plan" : "Delete permanently"}
      destructive
      onConfirm={async (reason) => {
        if (!tier) return;
        let changed = false;
        for (const plan of [tier.yearly, tier.monthly]) {
          if (!plan) continue;
          const res = await deletePlanAction({ planId: plan.id, reason });
          if (!res.success) {
            if (changed) onDeleted(`Part of ${tier.monthly.name} was removed.`);
            return res.error || `${plan.slug} couldn't be deleted.`;
          }
          changed = true;
        }
        onDeleted(subscribers > 0 ? `${tier.monthly.name} archived.` : `${tier.monthly.name} deleted.`);
      }}
    >
      {subscribers > 0 ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          {formatNumber(subscribers)} workspace{subscribers === 1 ? " is" : "s are"} subscribed, so the plan is{" "}
          <span className="font-medium">archived</span>, not deleted: they keep their access and price, and nobody new
          can choose it.
        </div>
      ) : (
        <p className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
          Nobody is subscribed, so the plan is permanently deleted. This can&apos;t be undone.
        </p>
      )}
    </ReasonDialog>
  );
}
