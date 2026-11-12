import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  HardDrive,
  Archive,
  CheckCircle2,
  Shield,
  Film,
  Camera,
  Layers,
  Sparkles,
} from "lucide-react";
import { getServerServices, getServerAdminServices } from "@/core/server";
import { createScopedLogger } from "@/lib/logger";
import StorageLoading from "./loading";

const log = createScopedLogger({ page: "StoragePage" });
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { TiltCard } from "@/components/ui/motion";
import {
  Typography,
  TypographySpan,
  TypographyH1,
  TypographyH3,
  TypographyH4,
  TypographyLead,
  TypographyMuted,
} from "@/components/ui/typography";
import { StorageUpgradeButton } from "./_components/storage-upgrade-button";
import { ArchiveManagerButton } from "./_components/archive-manager-button";
import { env } from "@/lib/env";

export default async function StoragePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ billing?: string; session_id?: string }>;
}) {
  const { workspaceSlug } = await params;
  const { billing, session_id } = await searchParams;
  const services = await getServerServices();
  const user = await services.auth.getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=/${workspaceSlug}/storage`);
  }

  const workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);
  if (!workspace) {
    redirect("/");
  }

  // 1. If returning from a successful Stripe storage upgrade checkout session, synchronize immediately
  let storageUpgradeSuccess = false;
  if (billing === "success" && session_id) {
    try {
      const adminServices = await getServerAdminServices();
      const syncResult = await adminServices.stripe.syncCheckoutSession(
        session_id,
        adminServices.subscription
      );
      if (syncResult.success) {
        storageUpgradeSuccess = true;
      }
    } catch (err: any) {
      log.warn({ err, sessionId: session_id }, "Checkout session sync error");
    }
  }

  return (
    <Suspense fallback={<StorageLoading />}>
      <StorageContent
        workspace={workspace}
        workspaceSlug={workspaceSlug}
        billing={billing}
        storageUpgradeSuccess={storageUpgradeSuccess}
      />
    </Suspense>
  );
}

async function StorageContent({
  workspace,
  workspaceSlug,
  billing,
  storageUpgradeSuccess,
}: {
  workspace: any;
  workspaceSlug: string;
  billing?: string;
  storageUpgradeSuccess: boolean;
}) {
  const services = await getServerServices();

  // 2. Fetch storage breakdown, plan, and features in a single parallel roundtrip
  const [storageBreakdown, currentPlan, features] = await Promise.all([
    services.asset.getWorkspaceStorageBreakdown(workspace.id),
    services.subscription.getCurrentPlan(workspace.id),
    services.subscription.getFeatures(workspace.id),
  ]);

  const totalVideoBytes = storageBreakdown.totalVideoBytes;
  const totalStillBytes = storageBreakdown.totalStillBytes;
  const totalStreamBytes = storageBreakdown.totalStreamBytes;
  const calculatedUsedBytes = storageBreakdown.totalUsedBytes;
  // workspaces.storage_used_bytes is kept up to date by database triggers; nothing writes it here.
  const usedBytes = Math.max(workspace.storageUsedBytes || 0, calculatedUsedBytes);

  // 3. Quota allocation based on active subscription plan & features
  const GB_IN_BYTES = 1024 * 1024 * 1024;
  const totalGB = features.storage_gb || 2;
  // The Silo card shows only while its kill switch (SILO_ENABLED) is on; the plan decides
  // between "included" and the upgrade prompt (same rule as isSiloArchiveAllowed).
  const siloEnabled = env.isSiloEnabled;
  const canSiloArchive = siloEnabled && Boolean(features.silo_archive);
  const totalBytesQuota = totalGB * GB_IN_BYTES;

  const usedGB = Number((usedBytes / GB_IN_BYTES).toFixed(2));
  const remainingGB = Number(Math.max(0, totalGB - usedGB).toFixed(2));
  const percentage = Math.min(100, Math.round((usedGB / totalGB) * 100));
  const badgeVariant = percentage >= 90 ? "destructive" : percentage >= 75 ? "orange" : "sage";

  // Format display strings
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
  const quotaDisplay = totalGB >= 1024 ? `${(totalGB / 1024).toFixed(1)} TB` : `${totalGB} GB`;
  const remainingDisplay = formatSize(Math.max(0, totalBytesQuota - usedBytes));

  return (
    <TooltipProvider delay={150}>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
        {/* Header */}
        <div className="pb-6 border-b border-border space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="kicker">
              WORKSPACE DASHBOARD
            </Badge>
            <Badge variant="outline" className="text-xs ">
              Cloud Storage &amp; Streaming
            </Badge>
          </div>
          <TypographyH1 className="text-2xl sm:text-3xl font-bold font-heading text-foreground">
            Storage &amp; Usage
          </TypographyH1>
          <TypographyLead className="text-sm text-muted-foreground font-sans max-w-2xl">
            Track real-time master storage, video streams, and cold archives for{" "}
            <strong className="text-foreground">{workspace.brandName}</strong>.
          </TypographyLead>
        </div>

        {/* Success Banner upon returning from Stripe Checkout */}
        {billing === "success" && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5 flex items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <TypographyH4 className="font-heading font-bold text-sm text-foreground">
                  +1 TB High-Speed Storage Boost Activated!
                </TypographyH4>
                <TypographyMuted className="text-xs text-muted-foreground">
                  Your storage allocation has been upgraded by 1,024 GB.
                </TypographyMuted>
              </div>
            </div>
          </div>
        )}

        {/* Main Active Storage Meter */}
        <TiltCard tiltIntensity={1.5} glareIntensity={0.04} className="rounded-2xl">
          <Card className="rounded-2xl border border-border p-4 sm:p-6 md:p-8 has-data-[slot=card-footer]:pb-4 sm:has-data-[slot=card-footer]:pb-6 md:has-data-[slot=card-footer]:pb-8 gap-5 sm:gap-6 shadow-sm hover:translate-y-0">
            <CardHeader className="p-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                <div className="p-2.5 sm:p-3 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <HardDrive className="size-5 sm:size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="p-0 border-none">
                    <TypographyH3 className="font-heading text-base sm:text-lg font-bold text-card-foreground leading-snug">
                      Active Storage &amp; Streaming
                    </TypographyH3>
                  </CardTitle>
                  <TypographyMuted className="text-xs text-muted-foreground mt-0.5">
                    Fast edge storage &amp; adaptive video streaming
                  </TypographyMuted>
                </div>
              </div>

              <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto shrink-0 gap-2 sm:gap-1 pt-3 sm:pt-0 border-t border-border/50 sm:border-t-0 text-left sm:text-right">
                <Typography as="div" variant="h3" className="text-lg sm:text-2xl font-bold text-foreground whitespace-nowrap leading-none">
                  {usedDisplay}{" "}
                  <TypographySpan variant="muted" className="text-xs sm:text-sm font-normal text-muted-foreground whitespace-nowrap">
                    / {quotaDisplay}
                  </TypographySpan>
                </Typography>
                <div className="flex items-center sm:justify-end gap-1.5 shrink-0">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Badge variant={badgeVariant} className="text-[11px] sm:text-xs font-semibold cursor-help whitespace-nowrap shrink-0">
                          {percentage}% allocated
                        </Badge>
                      }
                    />
                    <TooltipContent>
                      {usedDisplay} used out of {quotaDisplay} total capacity ({remainingDisplay} remaining)
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 space-y-5 sm:space-y-6">
              {/* Progress Bar with Tooltip */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <div className="w-full space-y-2 cursor-pointer">
                      <div className="h-3 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border">
                        <div
                          className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                            percentage >= 90
                              ? "bg-destructive shadow-destructive/50"
                              : percentage >= 75
                              ? "bg-amber-500 shadow-amber-500/50"
                              : "bg-primary shadow-primary/50"
                          }`}
                          style={{ width: `${Math.max(percentage, 2)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <TypographySpan className="whitespace-nowrap">0 GB</TypographySpan>
                        <TypographySpan className="text-foreground font-semibold whitespace-nowrap">{remainingDisplay} remaining</TypographySpan>
                        <TypographySpan className="whitespace-nowrap">{quotaDisplay}</TypographySpan>
                      </div>
                    </div>
                  }
                />
                <TooltipContent>
                  Storage Health: {percentage}% utilized · {remainingDisplay} free edge space
                </TooltipContent>
              </Tooltip>

              {/* Breakdown Items from Real Data */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <div className="w-full">
                        <TiltCard tiltIntensity={3} glareIntensity={0.08} className="rounded-xl h-full">
                          <Card className="p-3.5 rounded-xl bg-muted/40 border border-border gap-1 hover:translate-y-0 shadow-none h-full cursor-help">
                            <CardContent className="p-0 space-y-1">
                              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                <Film className="size-3.5 text-primary shrink-0" />
                                <TypographySpan className="truncate">Video Masters &amp; Cuts</TypographySpan>
                              </div>
                              <div className="text-sm font-bold text-foreground">
                                {formatSize(totalVideoBytes)}
                              </div>
                              <TypographyMuted className="text-[10px] text-muted-foreground">
                                Original video cut source files
                              </TypographyMuted>
                            </CardContent>
                          </Card>
                        </TiltCard>
                      </div>
                    }
                  />
                  <TooltipContent>
                    Raw uploaded master video files (ProRes, DNxHR, H.264/H.265) stored immutably in R2
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <div className="w-full">
                        <TiltCard tiltIntensity={3} glareIntensity={0.08} className="rounded-xl h-full">
                          <Card className="p-3.5 rounded-xl bg-muted/40 border border-border gap-1 hover:translate-y-0 shadow-none h-full cursor-help">
                            <CardContent className="p-0 space-y-1">
                              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                <Layers className="size-3.5 text-primary shrink-0" />
                                <TypographySpan className="truncate">Adaptive Video Streams</TypographySpan>
                              </div>
                              <div className="text-sm font-bold text-foreground">
                                {formatSize(totalStreamBytes)}
                              </div>
                              <TypographyMuted className="text-[10px] text-muted-foreground">
                                Transcoded stream cache
                              </TypographyMuted>
                            </CardContent>
                          </Card>
                        </TiltCard>
                      </div>
                    }
                  />
                  <TooltipContent>
                    Edge-cached multi-bitrate video stream for instant buffer-free client streaming
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <div className="w-full">
                        <TiltCard tiltIntensity={3} glareIntensity={0.08} className="rounded-xl h-full">
                          <Card className="p-3.5 rounded-xl bg-muted/40 border border-border gap-1 hover:translate-y-0 shadow-none h-full cursor-help">
                            <CardContent className="p-0 space-y-1">
                              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                <Camera className="size-3.5 text-[#86b98f] shrink-0" />
                                <TypographySpan className="truncate">Stills &amp; Deliverables</TypographySpan>
                              </div>
                              <div className="text-sm font-bold text-foreground">
                                {formatSize(totalStillBytes)}
                              </div>
                              <TypographyMuted className="text-[10px] text-muted-foreground">
                                Graded photo galleries &amp; stills
                              </TypographyMuted>
                            </CardContent>
                          </Card>
                        </TiltCard>
                      </div>
                    }
                  />
                  <TooltipContent>
                    Lossless client delivery stills, poster frames, and cover graphics
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>

            {/* Storage Boost CTA using CardFooter */}
            <CardFooter className="p-0 pt-4 sm:pt-5 border-t border-border bg-transparent rounded-none flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <TypographyMuted className="text-xs text-muted-foreground text-center sm:text-left">
                Need more capacity? Expand your high-speed workspace storage anytime.
              </TypographyMuted>
              <StorageUpgradeButton
                workspaceId={workspace.id}
                workspaceSlug={workspace.slug}
              />
            </CardFooter>
          </Card>
        </TiltCard>

        {/* The Silo — Cold Storage Archive */}
        {siloEnabled && (
          <TiltCard tiltIntensity={1.5} glareIntensity={0.04} className="rounded-2xl">
            <Card className="rounded-2xl border border-border p-4 sm:p-6 md:p-8 gap-5 shadow-sm hover:translate-y-0">
              <CardHeader className="p-0 flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="p-2.5 sm:p-3 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
                    <Archive className="size-5 sm:size-6" />
                  </div>
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="p-0 border-none">
                        <TypographyH3 className="font-heading text-base sm:text-lg font-bold text-card-foreground leading-snug">
                          The Silo — Deep Cold Archive
                        </TypographyH3>
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] font-semibold bg-blue-500/15 text-blue-400 border-blue-500/30">
                        Secure Archival
                      </Badge>
                    </div>
                    <TypographyMuted className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                      Move delivered, completed commercial projects to long-term cold storage. Keep your active workspace uncluttered while preserving immutable master backups.
                    </TypographyMuted>
                  </div>
                </div>

                <div className="w-full sm:w-auto shrink-0 self-stretch sm:self-start">
                  <ArchiveManagerButton canSiloArchive={canSiloArchive} workspaceSlug={workspaceSlug} />
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <Card className="flex flex-row items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border hover:translate-y-0 shadow-none">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <TypographySpan>
                      {canSiloArchive
                        ? `${quotaDisplay} cold storage included in your ${currentPlan?.name || "Studio"} Plan`
                        : "Cold storage archive requires Studio or Enterprise plan"}
                    </TypographySpan>
                  </Card>
                  <Card className="flex flex-row items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border hover:translate-y-0 shadow-none">
                    <Shield className="size-4 text-blue-500 shrink-0" />
                    <TypographySpan>Encrypted triple-redundancy storage</TypographySpan>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TiltCard>
        )}
      </div>
    </TooltipProvider>
  );
}
