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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

  const projects = await services.delivery.listWorkspaceDeliveries(workspace.id);

  const draftCount = projects.filter((p) => p.status === "draft").length;
  const inReviewCount = projects.filter((p) => p.status === "in_review").length;
  const approvedCount = projects.filter((p) => p.status === "approved").length;

  const quickActions = [
    {
      title: "Client Deliveries",
      description: "Manage review rooms & cuts",
      href: `/${workspaceSlug}/deliveries`,
      icon: Film,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Portfolio Showcase",
      description: "Edit your filmmaker storefront",
      href: `/${workspaceSlug}/portfolio`,
      icon: LayoutGrid,
      color: "text-[#86b98f]",
      bg: "bg-[#86b98f]/10",
    },
    {
      title: "Storage & Archive",
      description: "Track R2 usage & video streams",
      href: `/${workspaceSlug}/storage`,
      icon: HardDrive,
      color: "text-[#38bdf8]",
      bg: "bg-[#38bdf8]/10",
    },
    {
      title: "Team Members",
      description: "Invite editors & producers",
      href: `/${workspaceSlug}/members`,
      icon: Users,
      color: "text-[#a78bfa]",
      bg: "bg-[#a78bfa]/10",
    },
  ];

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <TypographyKicker className="text-xs text-primary uppercase tracking-wider mb-1 block">
            Workspace Overview
          </TypographyKicker>
          <TypographyH1 className="text-3xl font-bold font-heading text-foreground">
            Welcome back, {workspace.brandName}
          </TypographyH1>
          <TypographyLead className="text-sm text-muted-foreground mt-1">
            Manage your client review rooms, portfolio showcase, and video masters.
          </TypographyLead>
        </div>

        <Button
          asChild
          className="rounded-full bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 shadow-md cursor-pointer self-start sm:self-auto"
        >
          <Link href={`/${workspaceSlug}/deliveries`} className="flex items-center gap-2">
            <Plus className="size-4" />
            <TypographySpan>New Delivery Room</TypographySpan>
          </Link>
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Drafts"
          count={draftCount}
          icon={FileEdit}
          badgeText="In Preparation"
          color="text-muted-foreground"
          iconColor="text-muted-foreground"
          iconBg="bg-muted"
        />
        <StatCard
          label="In Review"
          count={inReviewCount}
          icon={Clock}
          badgeText="Active Client Notes"
          color="text-primary"
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          label="Approved"
          count={approvedCount}
          icon={CheckCircle2}
          badgeText="Ready for Master Handover"
          color="text-emerald-500 dark:text-emerald-400"
          iconColor="text-emerald-500 dark:text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
      </div>

      {/* Quick Access Shortcuts */}
      <div className="space-y-3">
        <TypographyH2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-none pb-0">
          Studio Navigation
        </TypographyH2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className="group p-5 rounded-2xl bg-card border border-border hover:border-border/80 hover:bg-muted/40 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`size-10 rounded-xl ${action.bg} ${action.color} flex items-center justify-center`}>
                    <Icon className="size-5" />
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <TypographyH3 className="text-sm font-bold font-heading text-card-foreground group-hover:text-primary transition-colors">
                  {action.title}
                </TypographyH3>
                <TypographyMuted className="text-xs text-muted-foreground mt-0.5">
                  {action.description}
                </TypographyMuted>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Deliveries */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <TypographyH2 className="text-xl font-bold font-heading text-foreground border-none pb-0">
              Recent Deliveries
            </TypographyH2>
            <TypographyMuted className="text-xs text-muted-foreground mt-0.5">
              Latest client review rooms and cut statuses
            </TypographyMuted>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-xs font-semibold text-primary hover:text-primary/90 hover:bg-primary/10 cursor-pointer"
          >
            <Link href={`/${workspaceSlug}/deliveries`} className="flex items-center gap-1">
              View all deliveries <ArrowRight className="size-3.5 ml-0.5" />
            </Link>
          </Button>
        </div>

        {projects.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center shadow-none">
            <Film className="size-10 text-muted-foreground/50 mx-auto mb-3" />
            <TypographyH3 className="text-sm font-bold text-foreground">
              No delivery projects created yet
            </TypographyH3>
            <TypographyMuted className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              Create your first client delivery room to upload video masters, generate streaming proxies, and receive frame-accurate feedback.
            </TypographyMuted>
            <div className="pt-4">
              <Button
                asChild
                size="sm"
                className="rounded-full bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 shadow-md cursor-pointer"
              >
                <Link href={`/${workspaceSlug}/deliveries`} className="inline-flex items-center gap-2">
                  <Plus className="size-4" /> Create Your First Project
                </Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.slice(0, 6).map((project) => {
              const statusVariant =
                project.status === "approved"
                  ? "sage"
                  : project.status === "in_review"
                  ? "orange"
                  : "outline";

              const statusLabel =
                project.status === "approved"
                  ? "Approved"
                  : project.status === "in_review"
                  ? "In Review"
                  : project.status === "draft"
                  ? "Draft"
                  : "Archived";

              return (
                <Link
                  key={project.id}
                  href={`/${workspaceSlug}/deliveries/${project.id}`}
                  className="group p-5 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all flex items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={statusVariant} className="text-[10px] px-2 py-0.5 font-bold">
                        {statusLabel}
                      </Badge>
                      <TypographySpan className="text-xs text-muted-foreground">
                        {(project as { clientName?: string }).clientName || "Private Client"}
                      </TypographySpan>
                    </div>
                    <TypographyH3 className="font-heading font-bold text-sm text-card-foreground group-hover:text-primary transition-colors truncate">
                      {project.title}
                    </TypographyH3>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  count,
  icon: Icon,
  badgeText,
  color,
  iconColor,
  iconBg,
}: {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  badgeText: string;
  color: string;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <Card className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:translate-y-0">
      <CardContent className="p-0 space-y-3">
        <div className="flex items-center justify-between">
          <TypographyKicker className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            {label}
          </TypographyKicker>
          <div className={`p-2 rounded-xl ${iconBg} ${iconColor} shrink-0`}>
            <Icon className="size-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <Typography className={`text-3xl font-bold font-heading ${color}`}>{count}</Typography>
          <TypographySpan className="text-[11px] text-muted-foreground truncate">
            {badgeText}
          </TypographySpan>
        </div>
      </CardContent>
    </Card>
  );
}
