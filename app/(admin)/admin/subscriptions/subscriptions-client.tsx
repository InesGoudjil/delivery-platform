"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  CreditCard,
  TrendingUp,
  Sliders,
  Check,
  Building2,
  Users,
  Search,
  ExternalLink,
  Edit2,
  DollarSign,
  Plus,
  Trash2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { updatePlanAction, createPlanAction, deletePlanAction } from "@/app/actions/admin";

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
  featuresSummary: string;
  storageGB: number;
  stripePriceId?: string | null;
}

export interface AdminSubscriptionListItem {
  id: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  planName: string;
  status: "active" | "trialing" | "past_due" | "canceled";
  currency: string;
  priceFormatted: string;
  createdAt: string;
}

export interface SubscriptionsClientProps {
  plans: AdminPlanItem[];
  subscriptions: AdminSubscriptionListItem[];
}

export function SubscriptionsClient({ plans: initialPlans, subscriptions }: SubscriptionsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [plansList, setPlansList] = useState(initialPlans);
  const [searchQuery, setSearchQuery] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  // Edit Plan Dialog
  const [selectedPlan, setSelectedPlan] = useState<AdminPlanItem | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPriceUsd, setEditPriceUsd] = useState(0);
  const [editName, setEditName] = useState("");
  const [editSuccess, setEditSuccess] = useState(false);

  // Create Plan Dialog
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createPriceUsd, setCreatePriceUsd] = useState(29);
  const [createStorageGb, setCreateStorageGb] = useState(500);
  const [createClientLinks, setCreateClientLinks] = useState(-1);
  const [createWhatsApp, setCreateWhatsApp] = useState(true);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Delete Plan Dialog
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  const filteredSubscriptions = subscriptions.filter(
    (s) =>
      s.workspaceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.workspaceSlug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.planName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenEditPlan = (plan: AdminPlanItem) => {
    setSelectedPlan(plan);
    setEditName(plan.name);
    setEditPriceUsd(Math.round(plan.priceCents / 100));
    setEditSuccess(false);
    setServerError(null);
    setEditModalOpen(true);
  };

  const handleOpenDeletePlan = (plan: AdminPlanItem) => {
    setSelectedPlan(plan);
    setDeleteSuccessMsg(null);
    setServerError(null);
    setDeleteModalOpen(true);
  };

  const handleSavePlanEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    startTransition(async () => {
      const res = await updatePlanAction(selectedPlan.id, {
        name: editName,
        priceCents: editPriceUsd * 100,
      });

      if (res.success) {
        setPlansList((prev) =>
          prev.map((p) =>
            p.id === selectedPlan.id
              ? { ...p, name: editName, priceCents: editPriceUsd * 100 }
              : p
          )
        );
        setEditSuccess(true);
        setTimeout(() => {
          setEditModalOpen(false);
          setEditSuccess(false);
        }, 1000);
      } else {
        setServerError(res.error || "Failed to update plan.");
      }
    });
  };

  const handleCreatePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createSlug.trim()) return;

    const formData = new FormData();
    formData.set("name", createName.trim());
    formData.set("slug", createSlug.trim());
    formData.set("priceUsd", createPriceUsd.toString());
    formData.set("storageGb", createStorageGb.toString());
    formData.set("clientLinks", createClientLinks.toString());
    formData.set("whatsappDelivery", createWhatsApp ? "true" : "false");

    startTransition(async () => {
      const res = await createPlanAction(formData);
      if (res.success && res.plan) {
        const newPlanItem: AdminPlanItem = {
          id: res.plan.id,
          name: res.plan.name,
          slug: res.plan.slug,
          priceCents: res.plan.priceCents,
          currency: res.plan.currency,
          billingInterval: res.plan.billingInterval,
          sortOrder: res.plan.sortOrder,
          isActive: res.plan.isActive,
          activeSubscribersCount: 0,
          featuresSummary: `${createStorageGb} GB Storage · ${createClientLinks === -1 ? 'Unlimited Links' : createClientLinks + ' Links'}`,
          storageGB: createStorageGb,
          stripePriceId: res.plan.stripePriceId,
        };

        setPlansList([...plansList, newPlanItem]);
        setCreateSuccess(true);

        setTimeout(() => {
          setCreateModalOpen(false);
          setCreateSuccess(false);
          setCreateName("");
          setCreateSlug("");
        }, 1000);
      } else {
        setServerError(res.error || "Failed to create plan.");
      }
    });
  };

  const handleDeletePlanSubmit = () => {
    if (!selectedPlan) return;

    startTransition(async () => {
      const res = await deletePlanAction(selectedPlan.id);
      if (res.success) {
        setDeleteSuccessMsg(res.message || "Plan deleted successfully.");
        if (res.action === "deleted") {
          setPlansList((prev) => prev.filter((p) => p.id !== selectedPlan.id));
        } else if (res.action === "archived") {
          setPlansList((prev) =>
            prev.map((p) => (p.id === selectedPlan.id ? { ...p, isActive: false } : p))
          );
        }

        setTimeout(() => {
          setDeleteModalOpen(false);
          setDeleteSuccessMsg(null);
        }, 1500);
      } else {
        setServerError(res.error || "Failed to delete plan.");
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-1">
            Stripe &amp; Billing Control
          </div>
          <h1 className="text-3xl font-black font-heading text-foreground tracking-tight">
            Subscription Tiers &amp; Active Subscriptions
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Supervise recurring revenue, create dynamic Stripe counterpart plans, and enforce safety conditions.
          </p>
        </div>

        <Button
          onClick={() => {
            setServerError(null);
            setCreateModalOpen(true);
          }}
          className="rounded-full bg-[#f5551d] text-black font-bold text-xs hover:bg-[#ff8a45] shadow-lg shadow-[#f5551d]/20 cursor-pointer"
        >
          <Plus className="size-3.5 mr-1.5" /> Create New Tier
        </Button>
      </div>

      {/* Plan Tiers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plansList.map((tier) => (
          <Card
            key={tier.id}
            className={`bg-card border-border shadow-sm flex flex-col justify-between hover:border-primary/40 transition-colors ${
              !tier.isActive ? "opacity-60 border-dashed" : tier.slug === "studio" ? "border-purple-500/30" : tier.slug === "pro" ? "border-primary/40" : ""
            }`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-base font-bold text-foreground">{tier.name}</CardTitle>
                  {!tier.isActive && (
                    <Badge variant="outline" className="text-[9px] font-mono border-amber-500/40 text-amber-400 bg-amber-500/10">
                      Archived
                    </Badge>
                  )}
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {tier.activeSubscribersCount} Active
                </Badge>
              </div>

              <div className="flex items-baseline justify-between mt-1">
                <p className="text-2xl font-black font-heading text-primary">
                  ${(tier.priceCents / 100).toFixed(0)}
                  <span className="text-xs font-normal text-muted-foreground font-mono"> / mo</span>
                </p>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleOpenEditPlan(tier)}
                    className="rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Edit Plan Pricing"
                  >
                    <Edit2 className="size-3.5" />
                  </Button>

                  {tier.slug !== "starter" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleOpenDeletePlan(tier)}
                      className="rounded-lg text-muted-foreground hover:text-red-400 cursor-pointer"
                      title="Delete or Archive Plan"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-2">
              <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">
                {tier.featuresSummary}
              </p>
              {tier.stripePriceId && (
                <p className="text-[9px] font-mono text-muted-foreground mt-2 truncate">
                  Stripe ID: {tier.stripePriceId}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Subscriptions Table */}
      <Card className="bg-card border-border shadow-sm overflow-hidden">
        <CardHeader className="p-6 pb-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold font-heading">
              Platform Subscriptions ({filteredSubscriptions.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Live subscription list for all registered creator studio workspaces.
            </CardDescription>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter studio, slug, or plan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8.5 h-8.5 text-xs rounded-xl bg-muted border-border"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-4 pl-6">Studio Workspace</th>
                  <th className="p-4">Plan Tier</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Monthly Rate</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredSubscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-muted/40 transition-colors">
                    <td className="p-4 pl-6 font-bold text-foreground">
                      <Link
                        href={`/${sub.workspaceSlug}/deliveries`}
                        target="_blank"
                        className="hover:text-primary transition-colors flex items-center gap-1.5"
                      >
                        <span>{sub.workspaceName}</span>
                        <ExternalLink className="size-3 text-muted-foreground opacity-70" />
                      </Link>
                    </td>

                    <td className="p-4">
                      <Badge variant="outline" className="text-[10px] font-mono capitalize border-border">
                        {sub.planName}
                      </Badge>
                    </td>

                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono capitalize ${
                          sub.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold"
                            : sub.status === "trialing"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {sub.status}
                      </Badge>
                    </td>

                    <td className="p-4 font-mono font-semibold text-foreground">
                      {sub.priceFormatted}
                    </td>

                    <td className="p-4 font-mono text-muted-foreground text-[11px]">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-4 pr-6 text-right">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="rounded-lg text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Link href={`/admin/workspaces/${sub.workspaceId}`}>
                          Inspect Workspace &rarr;
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CREATE NEW PLAN DIALOG */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="size-5 text-[#f5551d]" />
              Create Subscription Tier (Auto-Stripe Sync)
            </DialogTitle>
            <DialogDescription>
              Define a new tier. A counterpart Stripe Product &amp; Price will be created automatically.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePlanSubmit} className="space-y-4 py-2">
            {serverError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                {serverError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Plan Name
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Enterprise"
                  value={createName}
                  onChange={(e) => {
                    setCreateName(e.target.value);
                    setCreateSlug(e.target.value.toLowerCase().trim().replace(/[^a-z0-9]/g, "-"));
                  }}
                  className="bg-muted border-border text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Slug (URL Safe)
                </label>
                <Input
                  type="text"
                  required
                  placeholder="enterprise"
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value)}
                  className="bg-muted border-border text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Monthly Price (USD)
                </label>
                <Input
                  type="number"
                  min={0}
                  required
                  value={createPriceUsd}
                  onChange={(e) => setCreatePriceUsd(Number(e.target.value))}
                  className="bg-muted border-border text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Storage Allocation (GB)
                </label>
                <Input
                  type="number"
                  min={1}
                  required
                  value={createStorageGb}
                  onChange={(e) => setCreateStorageGb(Number(e.target.value))}
                  className="bg-muted border-border text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-xl border border-border">
              <div>
                <p className="text-xs font-bold text-foreground">WhatsApp Delivery</p>
                <p className="text-[10px] text-muted-foreground">Include automated client broadcasts</p>
              </div>
              <Switch checked={createWhatsApp} onCheckedChange={setCreateWhatsApp} />
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={isPending || createSuccess}
                className="rounded-full bg-[#f5551d] text-black font-bold text-xs hover:bg-[#ff8a45]"
              >
                {createSuccess ? (
                  <>
                    <Check className="size-3.5 mr-1" /> Created &amp; Synced!
                  </>
                ) : isPending ? (
                  "Syncing with Stripe..."
                ) : (
                  "Create Tier &amp; Stripe Product"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT PLAN DIALOG */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <DollarSign className="size-5 text-primary" />
              Edit Subscription Tier Configuration
            </DialogTitle>
            <DialogDescription>
              Modify pricing and title for <strong className="text-foreground">{selectedPlan?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePlanEdit} className="space-y-4 py-2">
            {serverError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                {serverError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                Plan Name
              </label>
              <Input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-muted border-border text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                Monthly Price (USD)
              </label>
              <Input
                type="number"
                min={0}
                required
                value={editPriceUsd}
                onChange={(e) => setEditPriceUsd(Number(e.target.value))}
                className="bg-muted border-border text-xs font-mono"
              />
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={isPending || editSuccess}
                className="rounded-full bg-primary text-black font-bold text-xs hover:bg-primary/90"
              >
                {editSuccess ? (
                  <>
                    <Check className="size-3.5 mr-1" /> Plan Saved!
                  </>
                ) : isPending ? (
                  "Updating..."
                ) : (
                  "Save Plan Details"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE / ARCHIVE PLAN CONFIRMATION DIALOG */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-red-400">
              <AlertTriangle className="size-5 text-red-400" />
              Delete / Archive Subscription Tier
            </DialogTitle>
            <DialogDescription>
              Safety evaluation for plan tier{" "}
              <strong className="text-foreground">{selectedPlan?.name}</strong> (slug: {selectedPlan?.slug}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {serverError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                {serverError}
              </div>
            )}

            {deleteSuccessMsg ? (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs flex items-center gap-2">
                <Check className="size-4 shrink-0" />
                <span>{deleteSuccessMsg}</span>
              </div>
            ) : selectedPlan?.slug === "starter" ? (
              <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 font-mono">
                <p className="font-bold uppercase text-[11px] mb-1">🛡️ Protected System Plan</p>
                <p>The "starter" plan cannot be deleted because new user registrations depend on it.</p>
              </div>
            ) : (selectedPlan?.activeSubscribersCount || 0) > 0 ? (
              <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono space-y-1.5">
                <p className="font-bold uppercase text-[11px]">⚠️ Active Subscribers Detected</p>
                <p>
                  This plan currently has <strong>{selectedPlan?.activeSubscribersCount}</strong> active subscriber(s).
                </p>
                <p className="text-[11px] text-amber-200/80">
                  To protect active accounts from losing their tier, the system will <strong>Archive / Deactivate</strong> this plan instead of hard deleting it. Existing subscribers keep their access, but the plan will be hidden from new users.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-muted border border-border text-muted-foreground font-mono">
                <p className="font-bold text-foreground uppercase text-[11px] mb-1">0 Active Subscribers</p>
                <p>This plan has zero subscribers and will be permanently deleted from the database and archived in Stripe.</p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>

              {selectedPlan?.slug !== "starter" && !deleteSuccessMsg && (
                <Button
                  type="button"
                  onClick={handleDeletePlanSubmit}
                  disabled={isPending}
                  className="rounded-full bg-red-500 text-white font-bold text-xs hover:bg-red-600"
                >
                  {isPending ? "Processing..." : (selectedPlan?.activeSubscribersCount || 0) > 0 ? "Archive Plan" : "Permanently Delete Plan"}
                </Button>
              )}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
