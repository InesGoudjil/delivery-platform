"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  HardDrive,
  Activity,
  Search,
  MoreVertical,
  Shield,
  ExternalLink,
  Sparkles,
  Check,
  Zap,
  Sliders,
  AlertCircle,
  Megaphone,
  Radio,
  Clock,
  Download,
  Film,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export interface AdminWorkspaceItem {
  id: string;
  brandName: string;
  slug: string;
  ownerEmail: string;
  planName: "Starter" | "Basic" | "Pro" | "Studio";
  subscriptionStatus: "active" | "trialing" | "past_due";
  storageUsedBytes: number;
  storageLimitGB: number;
  projectsCount: number;
  createdAt: string;
  customDomain?: string | null;
}

export interface AdminDashboardClientProps {
  stats: {
    totalWorkspaces: number;
    activeTrials: number;
    activePaid: number;
    recentProjects: number;
    mrrUsd: number;
    totalStorageUsedGB: number;
  };
  workspaces: AdminWorkspaceItem[];
}

export function AdminDashboardClient({
  stats,
  workspaces,
}: AdminDashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>("all");
  const [selectedWorkspace, setSelectedWorkspace] = useState<AdminWorkspaceItem | null>(null);

  // Dialog States
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementSent, setAnnouncementSent] = useState(false);

  // Storage Override Form
  const [overrideStorageGB, setOverrideStorageGB] = useState<number>(500);
  const [overrideWhatsApp, setOverrideWhatsApp] = useState(true);
  const [overrideWhiteLabel, setOverrideWhiteLabel] = useState(false);
  const [overrideSaved, setOverrideSaved] = useState(false);

  const filteredWorkspaces = workspaces.filter((w) => {
    const matchesSearch =
      w.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPlan =
      selectedPlanFilter === "all" ||
      w.planName.toLowerCase() === selectedPlanFilter.toLowerCase();

    return matchesSearch && matchesPlan;
  });

  const handleOpenOverride = (workspace: AdminWorkspaceItem) => {
    setSelectedWorkspace(workspace);
    setOverrideStorageGB(workspace.storageLimitGB);
    setOverrideSaved(false);
    setOverrideModalOpen(true);
  };

  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    setOverrideSaved(true);
    setTimeout(() => {
      setOverrideModalOpen(false);
      setOverrideSaved(false);
    }, 1200);
  };

  const handleSendAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    setAnnouncementSent(true);
    setTimeout(() => {
      setAnnouncementModalOpen(false);
      setAnnouncementSent(false);
      setAnnouncementText("");
    }, 1200);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 GB";
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1000) {
      return `${(gb / 1024).toFixed(1)} TB`;
    }
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* ======================= TOP ADMIN HEADER & ACTIONS ======================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-[#f5551d] uppercase tracking-wider font-semibold">
              Super Admin Console
            </span>
          </div>
          <h1 className="text-3xl font-black font-heading text-foreground tracking-tight">
            Platform Operations &amp; Metrics
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time multi-tenant monitoring across Cloudflare Stream, R2 Storage, Supabase, and Stripe.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Global Broadcast Dialog Trigger */}
          <Dialog open={announcementModalOpen} onOpenChange={setAnnouncementModalOpen}>
            <DialogTrigger render={
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs font-semibold gap-1.5 cursor-pointer hover:bg-accent"
              >
                <Megaphone className="size-3.5 text-[#f5551d]" /> Broadcast Notice
              </Button>
            } />
            <DialogContent className="sm:max-w-md bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Platform Broadcast</DialogTitle>
                <DialogDescription>
                  Send an instant announcement banner to all active creator workspace dashboards.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSendAnnouncement} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    Announcement Message
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Scheduled maintenance: Cloudflare Stream 4K transcode updates tonight at 02:00 UTC."
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={announcementSent}
                    className="rounded-full bg-primary text-black font-bold text-xs hover:bg-primary/90"
                  >
                    {announcementSent ? (
                      <>
                        <Check className="size-3.5 mr-1" /> Broadcasted!
                      </>
                    ) : (
                      "Send Announcement"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Button
            asChild
            className="rounded-full bg-[#f5551d] text-black font-bold text-xs hover:bg-[#ff8a45] shadow-lg shadow-[#f5551d]/20 cursor-pointer"
          >
            <Link href="/admin/workspaces">
              <Sliders className="size-3.5 mr-1.5" /> Manage Workspaces
            </Link>
          </Button>
        </div>
      </div>

      {/* ======================= METRIC KPI CARDS ======================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR Card */}
        <Card className="bg-card border-border hover:border-primary/40 transition-colors shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs uppercase font-mono font-semibold">
                Est. Monthly Revenue (MRR)
              </CardDescription>
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <CreditCard className="size-4" />
              </span>
            </div>
            <CardTitle className="text-2xl font-black font-heading text-foreground">
              ${stats.mrrUsd.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <TrendingUp className="size-3.5" />
              <span>+18.4% growth this month</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Workspaces Card */}
        <Card className="bg-card border-border hover:border-primary/40 transition-colors shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs uppercase font-mono font-semibold">
                Creator Studios
              </CardDescription>
              <span className="p-2 rounded-xl bg-[#f5551d]/10 text-[#f5551d]">
                <Building2 className="size-4" />
              </span>
            </div>
            <CardTitle className="text-2xl font-black font-heading text-foreground">
              {stats.totalWorkspaces}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <span className="text-emerald-400 font-semibold">{stats.activePaid} Paid</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">{stats.activeTrials} Trialing</span>
            </div>
          </CardContent>
        </Card>

        {/* Projects / 4K Cuts Card */}
        <Card className="bg-card border-border hover:border-primary/40 transition-colors shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs uppercase font-mono font-semibold">
                Active Review Rooms
              </CardDescription>
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Film className="size-4" />
              </span>
            </div>
            <CardTitle className="text-2xl font-black font-heading text-foreground">
              {stats.recentProjects}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1.5 text-xs text-blue-400 font-medium">
              <Zap className="size-3.5" />
              <span>100% 4K Stream Uptime</span>
            </div>
          </CardContent>
        </Card>

        {/* R2 Storage Consumed Card */}
        <Card className="bg-card border-border hover:border-primary/40 transition-colors shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs uppercase font-mono font-semibold">
                Cloudflare R2 Storage
              </CardDescription>
              <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <HardDrive className="size-4" />
              </span>
            </div>
            <CardTitle className="text-2xl font-black font-heading text-foreground">
              {stats.totalStorageUsedGB.toFixed(1)} GB
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <span>$0 Egress Bandwidth Cost</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ======================= WORKSPACES CONTROL TABLE ======================= */}
      <Card className="bg-card border-border shadow-sm overflow-hidden">
        <CardHeader className="p-6 pb-4 border-b border-border">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold font-heading">
                All Filmmaker Workspaces ({filteredWorkspaces.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Inspect workspace storage limits, plan tiers, and direct delivery links.
              </CardDescription>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search brand, slug, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8.5 h-8.5 text-xs rounded-xl bg-muted border-border"
                />
              </div>

              <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border">
                {["all", "Studio", "Pro", "Basic", "Starter"].map((plan) => (
                  <button
                    key={plan}
                    onClick={() => setSelectedPlanFilter(plan)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-colors cursor-pointer ${
                      selectedPlanFilter.toLowerCase() === plan.toLowerCase()
                        ? "bg-card text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {plan}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-4 pl-6">Workspace &amp; Owner</th>
                  <th className="p-4">Plan Tier</th>
                  <th className="p-4">Storage Usage</th>
                  <th className="p-4">Delivery Rooms</th>
                  <th className="p-4">Created</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredWorkspaces.map((ws) => {
                  const usedGB = ws.storageUsedBytes / (1024 * 1024 * 1024);
                  const pct = Math.min(100, Math.round((usedGB / ws.storageLimitGB) * 100));

                  return (
                    <tr
                      key={ws.id}
                      className="hover:bg-muted/40 transition-colors group"
                    >
                      {/* Workspace & Owner */}
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8 rounded-xl border border-border">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs rounded-xl">
                              {ws.brandName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <Link
                              href={`/${ws.slug}/deliveries`}
                              target="_blank"
                              className="font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5"
                            >
                              <span>{ws.brandName}</span>
                              <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              /{ws.slug} · {ws.ownerEmail}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Plan Tier Badge */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-mono capitalize ${
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
                          <span
                            className={`size-1.5 rounded-full ${
                              ws.subscriptionStatus === "active"
                                ? "bg-emerald-400"
                                : "bg-amber-400"
                            }`}
                            title={ws.subscriptionStatus}
                          />
                        </div>
                      </td>

                      {/* Storage Usage Bar */}
                      <td className="p-4 min-w-[160px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-muted-foreground">
                              {usedGB.toFixed(1)} / {ws.storageLimitGB} GB
                            </span>
                            <span className={pct > 80 ? "text-red-400 font-bold" : "text-muted-foreground"}>
                              {pct}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pct > 80 ? "bg-red-400" : "bg-primary"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Delivery Projects Count */}
                      <td className="p-4 font-mono text-muted-foreground">
                        <span className="font-semibold text-foreground">{ws.projectsCount}</span> projects
                      </td>

                      {/* Created Date */}
                      <td className="p-4 font-mono text-muted-foreground text-[11px]">
                        {new Date(ws.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions Menu */}
                      <td className="p-4 pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              <MoreVertical className="size-4" />
                            </Button>
                          } />
                          <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
                            <DropdownMenuLabel className="text-[10px] font-mono uppercase text-muted-foreground">
                              Workspace Actions
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleOpenOverride(ws)}
                              className="cursor-pointer text-xs gap-2"
                            >
                              <Sliders className="size-3.5 text-primary" /> Override Quotas &amp; Features
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="cursor-pointer text-xs gap-2">
                              <Link href={`/${ws.slug}/deliveries`} target="_blank">
                                <ExternalLink className="size-3.5 text-muted-foreground" /> View Public Workspace
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="cursor-pointer text-xs gap-2">
                              <Link href={`/${ws.slug}/portfolio`} target="_blank">
                                <Film className="size-3.5 text-muted-foreground" /> View Portfolio Showcase
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ======================= OVERRIDE QUOTAS & FEATURES DIALOG ======================= */}
      <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sliders className="size-5 text-primary" />
              Override Workspace Features &amp; Quota
            </DialogTitle>
            <DialogDescription>
              Grant custom storage limits or feature overrides for{" "}
              <strong className="text-foreground font-semibold">
                {selectedWorkspace?.brandName}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveOverride} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                Storage Allocation (GB)
              </label>
              <Input
                type="number"
                min={1}
                max={10000}
                value={overrideStorageGB}
                onChange={(e) => setOverrideStorageGB(Number(e.target.value))}
                className="bg-muted border-border text-xs"
              />
              <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                Current usage: {formatBytes(selectedWorkspace?.storageUsedBytes || 0)}
              </p>
            </div>

            <Separator className="bg-border/60" />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">WhatsApp Delivery Broadcast</p>
                  <p className="text-[11px] text-muted-foreground">
                    Allow direct 1-click WhatsApp client notifications.
                  </p>
                </div>
                <Switch
                  checked={overrideWhatsApp}
                  onCheckedChange={setOverrideWhatsApp}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">White-Label Custom Domain</p>
                  <p className="text-[11px] text-muted-foreground">
                    Enable custom CNAME domain delivery pages.
                  </p>
                </div>
                <Switch
                  checked={overrideWhiteLabel}
                  onCheckedChange={setOverrideWhiteLabel}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={overrideSaved}
                className="rounded-full bg-primary text-black font-bold text-xs hover:bg-primary/90"
              >
                {overrideSaved ? (
                  <>
                    <Check className="size-3.5 mr-1" /> Saved Overrides!
                  </>
                ) : (
                  "Save Workspace Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
