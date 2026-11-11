import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerServices } from "@/core/server";
import Link from "next/link";
import {
  Plus,
  Film,
  ArrowRight,
  Clock,
  CheckCircle2,
  FileEdit,
  LayoutGrid,
  HardDrive,
  Users,
  Sparkles,
  ExternalLink,
  Lock,
  Layers,
  MessageSquare,
  ShieldCheck,
  Zap,
  Activity,
  Cloud,
  Check,
} from "lucide-react";
import {
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyLead,
  TypographyMuted,
  TypographyKicker,
  TypographySpan,
  Typography,
} from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyReviewLinkButton } from "./_components/dashboard-client-actions";

export default async function WorkspaceDashboardPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const services = await getServerServices();

  const workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    redirect("/");
  }

  // Fetch subscription entitlements and plan for header badges
  const [entitlements, plan] = await Promise.all([
    services.subscription.getEntitlements(workspace.id).catch(() => null),
    services.subscription.getCurrentPlan(workspace.id).catch(() => null),
  ]);

  const planName = plan?.name || entitlements?.planName || "Starter Plan";

  const studioWorkflows = [
    {
      title: "Client Deliveries",
      subtitle: "Review rooms & frame-accurate cuts",
      description: "Upload video masters, generate 1080p proxies, and collect timecoded client notes.",
      href: `/${workspaceSlug}/deliveries`,
      icon: Film,
      glowColor: "from-orange-500/20 to-primary/10",
      iconBg: "bg-primary/15 text-primary border border-primary/25",
      tags: ["Frame Notes", "Passcode Guard", "Version Stacks"],
    },
    {
      title: "Portfolio Storefront",
      subtitle: "Public showreel & client storefront",
      description: "Curate your cinematic video reel, stills gallery, creator bio, and direct booking inquiries.",
      href: `/${workspaceSlug}/portfolio`,
      icon: LayoutGrid,
      glowColor: "from-emerald-500/20 to-[#86b98f]/10",
      iconBg: "bg-[#86b98f]/15 text-[#86b98f] border border-[#86b98f]/25",
      tags: ["4K Reel", "Inquiry Forms", "Custom Bio"],
    },
    {
      title: "Storage & Deep Vault",
      subtitle: "R2 master assets & Silo cold glacier",
      description: "Track Cloudflare R2 proxy delivery, AWS Glacier deep vault storage, and original master downloads.",
      href: `/${workspaceSlug}/storage`,
      icon: HardDrive,
      glowColor: "from-sky-500/20 to-blue-500/10",
      iconBg: "bg-sky-500/15 text-sky-400 border border-sky-500/25",
      tags: ["R2 Proxies", "Silo Glacier", "Zero Egress"],
    },
    {
      title: "Team & Collaborators",
      subtitle: "Director, editors & colorists",
      description: "Invite post-production team members, assign review permissions, and track studio logs.",
      href: `/${workspaceSlug}/members`,
      icon: Users,
      glowColor: "from-purple-500/20 to-indigo-500/10",
      iconBg: "bg-purple-500/15 text-purple-400 border border-purple-500/25",
      tags: ["Team Seats", "Role Controls", "Activity Log"],
    },
  ];

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      {/* 1. Hero Glass Studio Banner (Header) */}
      <div className="glass-panel relative rounded-3xl p-6 sm:p-8 overflow-hidden">
        {/* Cinematic ambient background glow rings */}
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 size-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Live Studio Status Pill */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="glass-pill inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-foreground/90">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active Studio</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-primary font-bold">{planName}</span>
              </div>
              <span className="glass-badge-neutral text-[11px] font-medium">
                Workspace: /{workspace.slug}
              </span>
            </div>

            {/* Brand Title & Headline */}
            <div className="flex items-center gap-3 pt-1">
              <div className="size-11 sm:size-12 rounded-2xl glass-card flex items-center justify-center font-heading font-black text-lg text-primary shadow-inner ring-1 ring-primary/30 shrink-0">
                {workspace.brandName ? workspace.brandName.slice(0, 2).toUpperCase() : "CS"}
              </div>
              <div>
                <TypographyKicker className="text-[11px] text-primary uppercase tracking-widest font-bold">
                  Post-Production Command Center
                </TypographyKicker>
                <TypographyH1 className="text-2xl sm:text-3xl font-extrabold font-heading text-foreground tracking-tight">
                  Welcome back, {workspace.brandName}
                </TypographyH1>
              </div>
            </div>

            <TypographyLead className="text-sm text-muted-foreground/90 leading-relaxed">
              Manage client review rooms, monitor master video encodes, and showcase your best filmmaker projects to prospective clients.
            </TypographyLead>
          </div>

          {/* Quick Glass Action Buttons */}
          {/* <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 self-start lg:self-center shrink-0">
            <Button
              asChild
              className="glass-btn text-xs font-bold cursor-pointer shadow-lg hover:shadow-primary/25"
            >
              <Link href={`/${workspaceSlug}/deliveries`} className="flex items-center gap-2">
                <Plus className="size-4" />
                <span>New Delivery Room</span>
              </Link>
            </Button>

            <Button
              asChild
              variant="ghost"
              className="glass-btn-ghost text-xs font-semibold cursor-pointer"
            >
              <Link href={`/${workspaceSlug}/portfolio`} className="flex items-center gap-2">
                <LayoutGrid className="size-3.5 text-muted-foreground" />
                <span>View Portfolio</span>
                <ExternalLink className="size-3 opacity-60 ml-0.5" />
              </Link>
            </Button>
          </div> */}
        </div>
      </div>

      {/* 2. Glass Stat KPI Cards (Streamed via Suspense) */}
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStatsSection workspace={workspace} />
      </Suspense>

      {/* 3. Studio Navigation / Creative Workflows (Glass Interactive Cards) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="glass-pill size-6 rounded-lg flex items-center justify-center text-primary">
              <Sparkles className="size-3.5" />
            </div>
            <div>
              <TypographyH2 className="text-xl font-bold font-heading text-foreground border-none pb-0">
                Studio Workflows
              </TypographyH2>
            </div>
          </div>
          <TypographyMuted className="text-xs text-muted-foreground/70 hidden sm:block">
            Direct access to production hubs
          </TypographyMuted>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {studioWorkflows.map((flow) => {
            const Icon = flow.icon;
            return (
              <Link
                key={flow.title}
                href={flow.href}
                className="group relative rounded-2xl glass-card glass-card-interactive p-5 flex flex-col justify-between overflow-hidden"
              >
                {/* Subtle top corner gradient glow */}
                <div
                  className={`absolute -top-12 -right-12 size-28 rounded-full bg-gradient-to-br ${flow.glowColor} blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
                />

                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className={`size-10 rounded-xl ${flow.iconBg} flex items-center justify-center shadow-sm`}>
                      <Icon className="size-5" />
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>

                  <div>
                    <TypographyH3 className="text-base font-bold font-heading text-foreground group-hover:text-primary transition-colors">
                      {flow.title}
                    </TypographyH3>
                    <TypographyMuted className="text-xs text-muted-foreground/80 mt-1 line-clamp-2 leading-relaxed">
                      {flow.description}
                    </TypographyMuted>
                  </div>
                </div>

                {/* Feature Tags Row */}
                <div className="pt-4 mt-2 border-t border-white/5 flex flex-wrap gap-1.5 relative z-10">
                  {flow.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 dark:bg-white/5 border border-white/10 text-muted-foreground font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 4. Recent Deliveries & Review Rooms (Streamed via Suspense) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TypographyH2 className="text-xl font-bold font-heading text-foreground border-none pb-0">
                Recent Client Deliveries
              </TypographyH2>
              <span className="glass-pill text-[10px] font-bold px-2 py-0.5 rounded-full text-primary">
                Live Rooms
              </span>
            </div>
            <TypographyMuted className="text-xs text-muted-foreground mt-0.5">
              Latest client review cuts, approvals, and frame-accurate feedback
            </TypographyMuted>
          </div>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-xs font-semibold text-primary hover:text-primary/90 hover:bg-primary/10 cursor-pointer rounded-full px-3"
          >
            <Link href={`/${workspaceSlug}/deliveries`} className="flex items-center gap-1">
              View all deliveries <ArrowRight className="size-3.5 ml-0.5" />
            </Link>
          </Button>
        </div>

        <Suspense fallback={<RecentDeliveriesSkeleton />}>
          <RecentDeliveriesSection
            workspaceId={workspace.id}
            workspaceSlug={workspaceSlug}
          />
        </Suspense>
      </div>

      {/* 5. Production Insights & Infrastructure Glass Footer Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Studio Cloud Infrastructure */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/20 flex items-center justify-center">
                <Cloud className="size-4" />
              </div>
              <div>
                <TypographyH3 className="text-sm font-bold text-foreground">
                  Media Engine & Cloud Proxies
                </TypographyH3>
                <TypographyMuted className="text-[11px] text-muted-foreground">
                  Global Cloudflare R2 & Silo Glacier Storage
                </TypographyMuted>
              </div>
            </div>
            <span className="glass-badge-emerald text-[10px]">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Operational
            </span>
          </div>

          <p className="text-xs text-muted-foreground/90 leading-relaxed">
            All uploaded video cuts automatically generate streaming proxies for zero-buffering playback while preserving bit-for-bit master files for client downloads.
          </p>

          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-muted-foreground">Original Preservation</span>
            <span className="font-semibold text-foreground flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-emerald-500" /> Apple ProRes & H.264
            </span>
          </div>
        </div>

        {/* Director Workflow Tips */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-primary/15 text-primary border border-primary/20 flex items-center justify-center">
                <Zap className="size-4" />
              </div>
              <div>
                <TypographyH3 className="text-sm font-bold text-foreground">
                  Timecoded Review Notes
                </TypographyH3>
                <TypographyMuted className="text-[11px] text-muted-foreground">
                  Frame-accurate feedback for directors
                </TypographyMuted>
              </div>
            </div>
            <span className="glass-badge-orange text-[10px]">
              SMPTE Standard
            </span>
          </div>

          <p className="text-xs text-muted-foreground/90 leading-relaxed">
            Clients can pause video playback at any second to leave frame-specific drawings and revision notes without needing a CineSpace account.
          </p>

          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-muted-foreground">Client Experience</span>
            <span className="font-semibold text-foreground flex items-center gap-1">
              <Check className="size-3.5 text-primary" /> Zero Login Required
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 2. Glass Stat KPI Cards (Suspense Streamed)
 */
async function DashboardStatsSection({
  workspace,
}: {
  workspace: { id: string; storageUsedBytes?: number; slug: string };
}) {
  const services = await getServerServices();

  const [projects, entitlements] = await Promise.all([
    services.delivery.listWorkspaceDeliveries(workspace.id).catch(() => []),
    services.subscription.getEntitlements(workspace.id).catch(() => null),
  ]);

  const draftCount = projects.filter((p) => p.status === "draft").length;
  const inReviewCount = projects.filter((p) => p.status === "in_review").length;
  const approvedCount = projects.filter((p) => p.status === "approved").length;

  // Storage calculations
  const GB_IN_BYTES = 1024 * 1024 * 1024;
  const usedBytes = workspace.storageUsedBytes || 0;
  const storageQuotaGb = entitlements?.features?.storage_gb || entitlements?.limits?.storageGbMax || 50;
  const totalBytesQuota = storageQuotaGb * GB_IN_BYTES;

  const usedGb = Number((usedBytes / GB_IN_BYTES).toFixed(1));
  const percentage = Math.min(100, Math.max(1, Math.round((usedBytes / totalBytesQuota) * 100)));

  const formatSize = (bytes: number) => {
    if (bytes >= GB_IN_BYTES * 1024) {
      return `${(bytes / (GB_IN_BYTES * 1024)).toFixed(1)} TB`;
    }
    if (bytes >= GB_IN_BYTES) {
      return `${(bytes / GB_IN_BYTES).toFixed(1)} GB`;
    }
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const usedDisplay = formatSize(usedBytes);
  const quotaDisplay = storageQuotaGb >= 1024 ? `${(storageQuotaGb / 1024).toFixed(1)} TB` : `${storageQuotaGb} GB`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. In Review KPI */}
      <Link
        href={`/${workspace.slug}/deliveries?status=in_review`}
        className="glass-stat-card rounded-2xl p-5 group block cursor-pointer"
      >
        <div className="flex items-center justify-between mb-3">
          <TypographyKicker className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            In Review
          </TypographyKicker>
          <div className="size-9 rounded-xl bg-primary/15 text-primary border border-primary/25 flex items-center justify-center shrink-0 shadow-sm">
            <Clock className="size-4" />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <Typography className="text-3xl font-extrabold font-heading text-primary">
              {inReviewCount}
            </Typography>
            <span className="glass-badge-orange text-[10px]">
              Active Client Notes
            </span>
          </div>
          <TypographyMuted className="text-xs text-muted-foreground/80">
            Awaiting client review & sign-off
          </TypographyMuted>
        </div>
      </Link>

      {/* 2. Approved KPI */}
      <Link
        href={`/${workspace.slug}/deliveries?status=approved`}
        className="glass-stat-card rounded-2xl p-5 group block cursor-pointer"
      >
        <div className="flex items-center justify-between mb-3">
          <TypographyKicker className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Approved Cuts
          </TypographyKicker>
          <div className="size-9 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 flex items-center justify-center shrink-0 shadow-sm">
            <CheckCircle2 className="size-4" />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <Typography className="text-3xl font-extrabold font-heading text-emerald-500 dark:text-emerald-400">
              {approvedCount}
            </Typography>
            <span className="glass-badge-emerald text-[10px]">
              Handover Cleared
            </span>
          </div>
          <TypographyMuted className="text-xs text-muted-foreground/80">
            Ready for final master download
          </TypographyMuted>
        </div>
      </Link>

      {/* 3. In Prep / Drafts KPI */}
      <Link
        href={`/${workspace.slug}/deliveries`}
        className="glass-stat-card rounded-2xl p-5 group block cursor-pointer"
      >
        <div className="flex items-center justify-between mb-3">
          <TypographyKicker className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            In Preparation
          </TypographyKicker>
          <div className="size-9 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/25 flex items-center justify-center shrink-0 shadow-sm">
            <FileEdit className="size-4" />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <Typography className="text-3xl font-extrabold font-heading text-foreground">
              {draftCount}
            </Typography>
            <span className="glass-badge-purple text-[10px]">
              Internal WIP
            </span>
          </div>
          <TypographyMuted className="text-xs text-muted-foreground/80">
            Draft cuts and pending encodes
          </TypographyMuted>
        </div>
      </Link>

      {/* 4. Cloud Storage Utilization KPI */}
      <Link
        href={`/${workspace.slug}/storage`}
        className="glass-stat-card rounded-2xl p-5 group block cursor-pointer"
      >
        <div className="flex items-center justify-between mb-3">
          <TypographyKicker className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Cloud Vault
          </TypographyKicker>
          <div className="size-9 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/25 flex items-center justify-center shrink-0 shadow-sm">
            <HardDrive className="size-4" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1">
              <Typography className="text-2xl font-extrabold font-heading text-sky-400">
                {usedDisplay}
              </Typography>
              <span className="text-xs text-muted-foreground">/ {quotaDisplay}</span>
            </div>
            <span className="glass-badge-sky text-[10px]">
              {percentage}% Used
            </span>
          </div>

          {/* Frosted Glass Progress Meter */}
          <div className="w-full bg-white/10 dark:bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5">
            <div
              className="bg-gradient-to-r from-sky-500 to-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </Link>
    </div>
  );
}

/**
 * 4. Recent Deliveries Section (Suspense Streamed)
 */
async function RecentDeliveriesSection({
  workspaceId,
  workspaceSlug,
}: {
  workspaceId: string;
  workspaceSlug: string;
}) {
  const services = await getServerServices();

  let summaries: any[] = [];
  try {
    summaries = await services.delivery.listWorkspaceDeliveriesSummary(workspaceId);
  } catch {
    summaries = await services.delivery.listWorkspaceDeliveries(workspaceId);
  }

  if (summaries.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden">
        {/* Subtle radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-md mx-auto space-y-4">
          <div className="size-14 rounded-2xl glass-card flex items-center justify-center mx-auto text-primary shadow-inner ring-1 ring-primary/20">
            <Film className="size-7" />
          </div>

          <div className="space-y-1">
            <TypographyH3 className="text-lg font-bold font-heading text-foreground">
              No delivery projects created yet
            </TypographyH3>
            <TypographyMuted className="text-xs text-muted-foreground leading-relaxed">
              Create your first client delivery room to upload video masters, generate fast streaming proxies, and receive frame-accurate client feedback.
            </TypographyMuted>
          </div>

          <div className="pt-2">
            <Button
              asChild
              className="glass-btn text-xs font-bold cursor-pointer"
            >
              <Link href={`/${workspaceSlug}/deliveries`} className="inline-flex items-center gap-2">
                <Plus className="size-4" />
                <span>Create Your First Project</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {summaries.slice(0, 6).map((project) => {
        const isApproved = project.status === "approved";
        const isInReview = project.status === "in_review";

        const statusBadgeClass = isApproved
          ? "glass-badge-emerald"
          : isInReview
          ? "glass-badge-orange"
          : "glass-badge-neutral";

        const statusLabel = isApproved
          ? "Approved"
          : isInReview
          ? "In Review"
          : project.status === "draft"
          ? "Draft"
          : "Archived";

        const clientName = project.clientName || "Private Client";
        const assetsCount = project.assetsCount || 0;
        const commentsCount = project.commentsCount || 0;
        const isPasscodeProtected = Boolean(project.passcodeProtected);

        // Duration string if available
        let durationStr = "";
        if (project.activeDurationSeconds && project.activeDurationSeconds > 0) {
          const totalSec = Math.round(project.activeDurationSeconds);
          const mins = Math.floor(totalSec / 60);
          const secs = totalSec % 60;
          durationStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        }

        return (
          <div
            key={project.id}
            className="group glass-card glass-card-interactive rounded-2xl p-5 flex flex-col justify-between gap-4"
          >
            {/* Top Row: Badges & Client */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`${statusBadgeClass} text-[10px] font-bold px-2 py-0.5`}>
                  {isInReview && (
                    <span className="size-1.5 rounded-full bg-primary animate-pulse mr-1 inline-block" />
                  )}
                  {statusLabel}
                </span>

                <span className="glass-pill text-[11px] font-medium px-2.5 py-0.5 rounded-full text-foreground/80">
                  {clientName}
                </span>
              </div>

              {durationStr && (
                <span className="text-[11px] font-mono font-medium text-muted-foreground/80">
                  {durationStr}
                </span>
              )}
            </div>

            {/* Middle Row: Title */}
            <Link
              href={`/${workspaceSlug}/deliveries/${project.id}`}
              className="block group/title focus:outline-none"
            >
              <TypographyH3 className="font-heading font-bold text-base text-foreground group-hover/title:text-primary transition-colors line-clamp-1">
                {project.title}
              </TypographyH3>
              {project.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {project.description}
                </p>
              )}
            </Link>

            {/* Bottom Row: Metadata & Quick Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/5 text-xs text-muted-foreground">
              {/* Meta Chips */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                  <Layers className="size-3 text-muted-foreground/70" />
                  {assetsCount} {assetsCount === 1 ? "cut" : "cuts"}
                </span>

                {commentsCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-primary font-medium">
                    <MessageSquare className="size-3" />
                    {commentsCount} {commentsCount === 1 ? "note" : "notes"}
                  </span>
                )}

                {isPasscodeProtected && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-medium">
                    <Lock className="size-3" />
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {project.shareToken && (
                  <CopyReviewLinkButton
                    shareToken={project.shareToken}
                    projectTitle={project.title}
                  />
                )}

                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2.5 rounded-lg text-xs font-semibold text-primary hover:text-primary/90 hover:bg-primary/10 transition-colors cursor-pointer"
                >
                  <Link
                    href={`/${workspaceSlug}/deliveries/${project.id}`}
                    className="flex items-center gap-1"
                  >
                    <span>Open Room</span>
                    <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Loading Skeletons matching the new Glassmorphic Design
 */
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="glass-stat-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="size-9 rounded-xl" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-3 w-24 rounded-full" />
          </div>
          <Skeleton className="h-2 w-full rounded" />
        </div>
      ))}
    </div>
  );
}

function RecentDeliveriesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-24 rounded-full" />
            </div>
            <Skeleton className="h-3 w-12 rounded" />
          </div>
          <Skeleton className="h-5 w-3/4 rounded-lg" />
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
