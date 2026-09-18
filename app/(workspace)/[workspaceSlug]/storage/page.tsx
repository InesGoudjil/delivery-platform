import { redirect } from "next/navigation";
import {
  HardDrive,
  Archive,
  CheckCircle2,
  Shield,
  Film,
  Camera,
  Layers,
} from "lucide-react";
import { getServerServices } from "@/core/server";
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

  // 1. Fetch real workspace projects, standalone assets, active subscription plan, and workspace features
  const [dbProjects, standaloneAssets, currentPlan, features] = await Promise.all([
    services.project.listWorkspaceProjects(workspace.id),
    services.asset.listUnassignedAssets(workspace.id),
    services.subscription.getCurrentPlan(workspace.id),
    services.subscription.getFeatures(workspace.id),
  ]);

  // 2. Calculate real storage usage concurrently
  let totalVideoBytes = 0;
  let totalStillBytes = 0;
  let totalStreamBytes = 0;

  const processAsset = async (asset: { id: string; type: string }) => {
    const activeVer = await services.asset.getActiveVersion(asset.id);
    if (activeVer) {
      const bytes = activeVer.fileSizeBytes || 0;
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

  const projectAssetsArrays = await Promise.all(
    dbProjects.map((p) => services.asset.listAssets(p.id))
  );

  const allAssetsToProcess = [
    ...standaloneAssets,
    ...projectAssetsArrays.flat(),
  ];

  await Promise.all(allAssetsToProcess.map(processAsset));

  const calculatedUsedBytes = totalVideoBytes + totalStillBytes + totalStreamBytes;
  const usedBytes = Math.max(workspace.storageUsedBytes || 0, calculatedUsedBytes);

  // 3. Quota allocation based on active subscription plan & features
  const GB_IN_BYTES = 1024 * 1024 * 1024;
  const totalGB = features.storage_gb || 2;
  const canSiloArchive = Boolean(features.silo_archive);
  const totalBytesQuota = totalGB * GB_IN_BYTES;

  const usedGB = Number((usedBytes / GB_IN_BYTES).toFixed(2));
  const remainingGB = Number(Math.max(0, totalGB - usedGB).toFixed(2));
  const percentage = Math.min(100, Math.round((usedGB / totalGB) * 100));

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
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-6 border-b border-border">
        <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-1 font-semibold">
          WORKSPACE DASHBOARD
        </div>
        <h1 className="text-3xl font-bold font-heading text-foreground">
          Storage &amp; Usage
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-sans">
          Track real-time Cloudflare R2 master storage, HLS video streams, and cold archives for{" "}
          <strong className="text-foreground">{workspace.brandName}</strong>.
        </p>
      </div>

      {/* Main Active Storage Meter (SSR Rendered) */}
      <div className="rounded-2xl bg-card border border-border p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#f5551d]/15 text-[#f5551d] border border-[#f5551d]/30 shrink-0">
              <HardDrive className="size-6" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-card-foreground">
                Active Cloudflare R2 &amp; Stream Storage
              </h3>
              <p className="text-xs text-muted-foreground">
                Fast edge storage &amp; adaptive HLS 4K video streaming
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold font-mono text-foreground">
              {usedDisplay} <span className="text-sm font-normal text-muted-foreground">/ {quotaDisplay}</span>
            </div>
            <div className="text-xs font-mono text-[#f5551d] font-semibold">
              {percentage}% allocated
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-3 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border">
            <div
              className="h-full bg-gradient-to-r from-[#f5551d] to-[#ff8a45] rounded-full transition-all duration-500 shadow-sm shadow-[#f5551d]/50"
              style={{ width: `${Math.max(percentage, 2)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>0 GB</span>
            <span>{remainingDisplay} remaining</span>
            <span>{quotaDisplay}</span>
          </div>
        </div>

        {/* Breakdown Items from Real Data */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Film className="size-3.5 text-[#f5551d]" />
              Video Masters &amp; Cuts
            </div>
            <div className="text-sm font-mono font-bold text-foreground">
              {formatSize(totalVideoBytes)}
            </div>
            <div className="text-[10px] text-muted-foreground">Original video cut source files</div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Layers className="size-3.5 text-[#ff8a45]" />
              Adaptive 4K HLS Streams
            </div>
            <div className="text-sm font-mono font-bold text-foreground">
              {formatSize(totalStreamBytes)}
            </div>
            <div className="text-[10px] text-muted-foreground">Cloudflare transcoded stream cache</div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Camera className="size-3.5 text-[#86b98f]" />
              Stills &amp; Deliverables
            </div>
            <div className="text-sm font-mono font-bold text-foreground">
              {formatSize(totalStillBytes)}
            </div>
            <div className="text-[10px] text-muted-foreground">Graded photo galleries &amp; stills</div>
          </div>
        </div>

        {/* Storage Boost CTA (Client Island) */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <StorageUpgradeButton />
        </div>
      </div>

      {/* The Silo — Cold Storage Archive */}
      <div className="rounded-2xl bg-card border border-border p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
              <Archive className="size-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-lg font-bold text-card-foreground">
                  The Silo — Deep Cold Archive
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  Secure Archival
                </span>
              </div>
              <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                Move delivered, completed commercial projects to long-term cold storage. Keep your active workspace uncluttered while preserving immutable master backups.
              </p>
            </div>
          </div>

          {/* Archive Action (Client Island) */}
          <ArchiveManagerButton canSiloArchive={canSiloArchive} workspaceSlug={workspaceSlug} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border">
            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
            <span>
              {canSiloArchive
                ? `${quotaDisplay} cold storage included in your ${currentPlan?.name || "Studio"} Plan`
                : "Cold storage archive requires Studio or Enterprise plan"}
            </span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border">
            <Shield className="size-4 text-blue-500 shrink-0" />
            <span>Encrypted triple-redundancy storage</span>
          </div>
        </div>
      </div>
    </div>
  );
}
