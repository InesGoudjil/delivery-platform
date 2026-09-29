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
import { getServerServices } from "@/core/server";
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
  TypographyH1,
  TypographyH3,
  TypographyLead,
  TypographyMuted,
} from "@/components/ui/typography";
import { StorageUpgradeButton } from "./_components/storage-upgrade-button";
import { ArchiveManagerButton } from "./_components/archive-manager-button";

export default async function StoragePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const services = await getServerServices();
  const user = await services.auth.getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=/${workspaceSlug}/storage`);
  }

  const workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);
  if (!workspace) {
    redirect("/");
  }

  // 1. Fetch all assets for this workspace (covers client deliveries, projects, and standalone assets), plan, and features
  const [allWorkspaceAssets, currentPlan, features] = await Promise.all([
    services.asset.listWorkspaceAssets(workspace.id),
    services.subscription.getCurrentPlan(workspace.id),
    services.subscription.getFeatures(workspace.id),
  ]);

  // 2. Calculate real storage usage concurrently across all workspace assets
  let totalVideoBytes = 0;
  let totalStillBytes = 0;
  let totalStreamBytes = 0;

  const processAsset = async (asset: { id: string; type: string }) => {
    const activeVer = await services.asset.getActiveVersion(asset.id);
    if (activeVer) {
      const bytes = Number(activeVer.fileSizeBytes || 0);
      if (asset.type === "photo_gallery") {
        totalStillBytes += bytes;
      } else {
        totalVideoBytes += bytes;
        if (activeVer.hlsManifestUrl) {
          totalStreamBytes += Math.round(bytes * 0.35);
        }
      }
    }
  };

  await Promise.all(allWorkspaceAssets.map(processAsset));

  const calculatedUsedBytes = totalVideoBytes + totalStillBytes + totalStreamBytes;
  const usedBytes = Math.max(workspace.storageUsedBytes || 0, calculatedUsedBytes);

  // Sync workspace.storage_used_bytes in database if it was out of sync
  if (calculatedUsedBytes > 0 && workspace.storageUsedBytes !== calculatedUsedBytes) {
    await services.workspace.trackStorageUsage(workspace.id, calculatedUsedBytes - (workspace.storageUsedBytes || 0)).catch(() => {});
  }

  // 3. Quota allocation based on active subscription plan & features
  const GB_IN_BYTES = 1024 * 1024 * 1024;
  const totalGB = features.storage_gb || 2;
  const canSiloArchive = Boolean(features.silo_archive);
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
          <div className="flex items-center gap-2">
            <Badge
              variant="orange"
              className="text-xs font-mono uppercase tracking-wider font-semibold"
            >
              WORKSPACE DASHBOARD
            </Badge>
            <Badge variant="outline" className="text-xs font-mono">
              Cloudflare R2 &amp; Stream
            </Badge>
          </div>
          <TypographyH1 className="text-3xl font-bold font-heading text-foreground">
            Storage &amp; Usage
          </TypographyH1>
          <TypographyLead className="text-sm text-muted-foreground font-sans max-w-2xl">
            Track real-time Cloudflare R2 master storage, HLS video streams, and cold archives for{" "}
            <strong className="text-foreground">{workspace.brandName}</strong>.
          </TypographyLead>
        </div>

        {/* Main Active Storage Meter */}
        <TiltCard tiltIntensity={1.5} glareIntensity={0.04} className="rounded-2xl">
          <Card className="rounded-2xl border border-border p-6 sm:p-8 space-y-6 shadow-sm hover:translate-y-0">
            <CardHeader className="p-0 flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <HardDrive className="size-6" />
                </div>
                <div>
                  <CardTitle className="font-heading text-lg font-bold text-card-foreground">
                    Active Cloudflare R2 &amp; Stream Storage
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Fast edge storage &amp; adaptive HLS 4K video streaming
                  </CardDescription>
                </div>
              </div>

              <CardAction className="text-left sm:text-right self-start sm:self-auto">
                <div className="text-2xl font-bold font-mono text-foreground">
                  {usedDisplay} <span className="text-sm font-normal text-muted-foreground">/ {quotaDisplay}</span>
                </div>
                <div className="flex items-center sm:justify-end gap-1.5 mt-0.5">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Badge variant={badgeVariant} className="text-xs font-mono font-semibold cursor-help">
                          {percentage}% allocated
                        </Badge>
                      }
                    />
                    <TooltipContent>
                      {usedDisplay} used out of {quotaDisplay} total capacity ({remainingDisplay} remaining)
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardAction>
            </CardHeader>

            <CardContent className="p-0 space-y-6">
              {/* Progress Bar with Tooltip */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <div className="space-y-2 cursor-pointer">
                      <div className="h-3 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border">
                        <div
                          className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                            percentage >= 90
                              ? "bg-destructive shadow-destructive/50"
                              : percentage >= 75
                              ? "bg-[#f5551d] shadow-[#f5551d]/50"
                              : "bg-gradient-to-r from-primary to-[#ff8a45] shadow-primary/50"
                          }`}
                          style={{ width: `${Math.max(percentage, 2)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                        <span>0 GB</span>
                        <span className="text-foreground font-semibold">{remainingDisplay} remaining</span>
                        <span>{quotaDisplay}</span>
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
                          <Card className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1 hover:translate-y-0 shadow-none h-full cursor-help">
                            <CardContent className="p-0 space-y-1">
                              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                <Film className="size-3.5 text-primary" />
                                Video Masters &amp; Cuts
                              </div>
                              <div className="text-sm font-mono font-bold text-foreground">
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
                          <Card className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1 hover:translate-y-0 shadow-none h-full cursor-help">
                            <CardContent className="p-0 space-y-1">
                              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                <Layers className="size-3.5 text-[#ff8a45]" />
                                Adaptive 4K HLS Streams
                              </div>
                              <div className="text-sm font-mono font-bold text-foreground">
                                {formatSize(totalStreamBytes)}
                              </div>
                              <TypographyMuted className="text-[10px] text-muted-foreground">
                                Cloudflare transcoded stream cache
                              </TypographyMuted>
                            </CardContent>
                          </Card>
                        </TiltCard>
                      </div>
                    }
                  />
                  <TooltipContent>
                    Edge-cached multi-bitrate HLS video ladder for instant buffer-free client streaming
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <div className="w-full">
                        <TiltCard tiltIntensity={3} glareIntensity={0.08} className="rounded-xl h-full">
                          <Card className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1 hover:translate-y-0 shadow-none h-full cursor-help">
                            <CardContent className="p-0 space-y-1">
                              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                <Camera className="size-3.5 text-[#86b98f]" />
                                Stills &amp; Deliverables
                              </div>
                              <div className="text-sm font-mono font-bold text-foreground">
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
            <CardFooter className="p-0 pt-4 border-t border-border flex items-center justify-end">
              <StorageUpgradeButton />
            </CardFooter>
          </Card>
        </TiltCard>

        {/* The Silo — Cold Storage Archive */}
        <TiltCard tiltIntensity={1.5} glareIntensity={0.04} className="rounded-2xl">
          <Card className="rounded-2xl border border-border p-6 sm:p-8 space-y-5 shadow-sm hover:translate-y-0">
            <CardHeader className="p-0 flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
                  <Archive className="size-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="font-heading text-lg font-bold text-card-foreground">
                      The Silo — Deep Cold Archive
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono font-semibold bg-blue-500/15 text-blue-400 border-blue-500/30">
                      Secure Archival
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                    Move delivered, completed commercial projects to long-term cold storage. Keep your active workspace uncluttered while preserving immutable master backups.
                  </CardDescription>
                </div>
              </div>

              <CardAction className="self-start">
                <ArchiveManagerButton canSiloArchive={canSiloArchive} workspaceSlug={workspaceSlug} />
              </CardAction>
            </CardHeader>

            <CardContent className="p-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
                <Card className="flex flex-row items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border hover:translate-y-0 shadow-none">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  <span>
                    {canSiloArchive
                      ? `${quotaDisplay} cold storage included in your ${currentPlan?.name || "Studio"} Plan`
                      : "Cold storage archive requires Studio or Enterprise plan"}
                  </span>
                </Card>
                <Card className="flex flex-row items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border hover:translate-y-0 shadow-none">
                  <Shield className="size-4 text-blue-500 shrink-0" />
                  <span>Encrypted triple-redundancy storage</span>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TiltCard>
      </div>
    </TooltipProvider>
  );
}
