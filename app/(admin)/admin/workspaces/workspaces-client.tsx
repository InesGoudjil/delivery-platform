"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Building2,
  Search,
  Sliders,
  ExternalLink,
  CreditCard,
  HardDrive,
  Film,
  Check,
  MoreVertical,
  ArrowRight,
  Shield,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateWorkspacePlanAction, updateWorkspaceFeaturesAction } from "@/app/actions/admin";

export interface AdminWorkspaceListItem {
  id: string;
  brandName: string;
  slug: string;
  ownerEmail?: string;
  planName: string;
  planId?: string;
  subscriptionStatus: "active" | "trialing" | "past_due" | "canceled";
  storageUsedGB: number;
  storageLimitGB: number;
  projectsCount: number;
  createdAt: string;
  accountType?: string;
}

export interface WorkspacesClientProps {
  workspaces: AdminWorkspaceListItem[];
  plans: { id: string; name: string; slug: string; priceCents: number }[];
}

export function WorkspacesClient({ workspaces: initialWorkspaces, plans }: WorkspacesClientProps) {
  const [isPending, startTransition] = useTransition();
  const [workspacesList, setWorkspacesList] = useState(initialWorkspaces);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [selectedWorkspace, setSelectedWorkspace] = useState<AdminWorkspaceListItem | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [planUpdateSuccess, setPlanUpdateSuccess] = useState(false);

  const [featuresModalOpen, setFeaturesModalOpen] = useState(false);
  const [overrideStorageGB, setOverrideStorageGB] = useState(500);
  const [featuresUpdateSuccess, setFeaturesUpdateSuccess] = useState(false);

  const filteredWorkspaces = workspacesList.filter((ws) =>
    ws.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ws.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenPlanModal = (ws: AdminWorkspaceListItem) => {
    setSelectedWorkspace(ws);
    setSelectedPlanId(ws.planId || plans[0]?.id || "");
    setPlanUpdateSuccess(false);
    setPlanModalOpen(true);
  };

  const handleOpenFeaturesModal = (ws: AdminWorkspaceListItem) => {
    setSelectedWorkspace(ws);
    setOverrideStorageGB(ws.storageLimitGB);
    setFeaturesUpdateSuccess(false);
    setFeaturesModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspace || !selectedPlanId) return;

    startTransition(async () => {
      const res = await updateWorkspacePlanAction(selectedWorkspace.id, selectedPlanId);
      if (res.success) {
        const updatedPlan = plans.find((p) => p.id === selectedPlanId);
        setWorkspacesList((prev) =>
          prev.map((w) =>
            w.id === selectedWorkspace.id
              ? { ...w, planName: updatedPlan?.name || w.planName, planId: selectedPlanId }
              : w
          )
        );
        setPlanUpdateSuccess(true);
        setTimeout(() => {
          setPlanModalOpen(false);
          setPlanUpdateSuccess(false);
        }, 1000);
      }
    });
  };

  const handleSaveFeatures = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspace) return;

    startTransition(async () => {
      const res = await updateWorkspaceFeaturesAction(selectedWorkspace.id, {
        storage_gb: overrideStorageGB,
      });
      if (res.success) {
        setWorkspacesList((prev) =>
          prev.map((w) =>
            w.id === selectedWorkspace.id ? { ...w, storageLimitGB: overrideStorageGB } : w
          )
        );
        setFeaturesUpdateSuccess(true);
        setTimeout(() => {
          setFeaturesModalOpen(false);
          setFeaturesUpdateSuccess(false);
        }, 1000);
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-1">
            Studio Workspaces
          </div>
          <h1 className="text-3xl font-black font-heading text-foreground tracking-tight">
            Workspaces Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor storage quotas, update subscription tiers, and inspect active creator workspaces.
          </p>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search workspace name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8.5 h-9 text-xs rounded-xl bg-muted border-border"
          />
        </div>
      </div>

      {/* Grid of Workspaces */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredWorkspaces.map((ws) => {
          const pct = Math.min(100, Math.round((ws.storageUsedGB / Math.max(1, ws.storageLimitGB)) * 100));

          return (
            <Card key={ws.id} className="bg-card border-border hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 rounded-xl border border-border">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm rounded-xl">
                      {ws.brandName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <Link href={`/admin/workspaces/${ws.id}`} className="hover:text-primary transition-colors">
                        {ws.brandName}
                      </Link>
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      /{ws.slug}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono capitalize ${
                      ws.planName === "Studio"
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/30 font-bold"
                        : ws.planName === "Pro"
                        ? "bg-primary/10 text-primary border-primary/30 font-bold"
                        : ws.planName === "Basic"
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {ws.planName}
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button variant="ghost" size="icon-sm" className="rounded-lg text-muted-foreground hover:text-foreground cursor-pointer">
                        <MoreVertical className="size-4" />
                      </Button>
                    } />
                    <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
                      <DropdownMenuLabel className="text-[10px] font-mono uppercase text-muted-foreground">
                        Admin Options
                      </DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleOpenPlanModal(ws)} className="cursor-pointer text-xs gap-2">
                        <CreditCard className="size-3.5 text-[#f5551d]" /> Change Plan Tier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenFeaturesModal(ws)} className="cursor-pointer text-xs gap-2">
                        <Sliders className="size-3.5 text-primary" /> Adjust Storage Quota
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild className="cursor-pointer text-xs gap-2">
                        <Link href={`/admin/workspaces/${ws.id}`}>
                          <ArrowRight className="size-3.5 text-muted-foreground" /> View Deep Inspection
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer text-xs gap-2">
                        <Link href={`/${ws.slug}/deliveries`} target="_blank">
                          <ExternalLink className="size-3.5 text-muted-foreground" /> Open Workspace Page
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                    <span>Storage Consumed</span>
                    <span className={pct > 80 ? "text-red-400 font-bold" : ""}>
                      {ws.storageUsedGB.toFixed(1)} / {ws.storageLimitGB} GB ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct > 80 ? "bg-red-400" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono pt-2 border-t border-border/60">
                  <span className="flex items-center gap-1">
                    <Film className="size-3.5 text-muted-foreground" /> {ws.projectsCount} Projects
                  </span>
                  <span>Joined {new Date(ws.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Change Plan Dialog */}
      <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="size-5 text-[#f5551d]" />
              Update Subscription Plan
            </DialogTitle>
            <DialogDescription>
              Select a new subscription tier for <strong className="text-foreground">{selectedWorkspace?.brandName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePlan} className="space-y-4 py-2">
            <div className="space-y-2">
              {plans.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlanId(p.id)}
                  className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    selectedPlanId === p.id
                      ? "border-primary bg-primary/10 text-foreground font-bold"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold">{p.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">slug: {p.slug}</p>
                  </div>
                  <span className="font-mono text-xs font-bold text-primary">
                    ${(p.priceCents / 100).toFixed(0)}/mo
                  </span>
                </button>
              ))}
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={isPending || planUpdateSuccess}
                className="rounded-full bg-primary text-black font-bold text-xs hover:bg-primary/90"
              >
                {planUpdateSuccess ? (
                  <>
                    <Check className="size-3.5 mr-1" /> Plan Updated!
                  </>
                ) : isPending ? (
                  "Updating..."
                ) : (
                  "Apply New Plan"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjust Storage Quota Dialog */}
      <Dialog open={featuresModalOpen} onOpenChange={setFeaturesModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sliders className="size-5 text-primary" />
              Adjust Storage Quota
            </DialogTitle>
            <DialogDescription>
              Set storage limits for <strong className="text-foreground">{selectedWorkspace?.brandName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveFeatures} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                Storage Limit (GB)
              </label>
              <Input
                type="number"
                min={1}
                max={10000}
                value={overrideStorageGB}
                onChange={(e) => setOverrideStorageGB(Number(e.target.value))}
                className="bg-muted border-border text-xs font-mono"
              />
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={isPending || featuresUpdateSuccess}
                className="rounded-full bg-primary text-black font-bold text-xs hover:bg-primary/90"
              >
                {featuresUpdateSuccess ? (
                  <>
                    <Check className="size-3.5 mr-1" /> Quota Updated!
                  </>
                ) : isPending ? (
                  "Saving..."
                ) : (
                  "Save Storage Quota"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
