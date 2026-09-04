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

  // 1. Fetch real workspace projects and standalone assets
  const [dbProjects, standaloneAssets] = await Promise.all([
    services.project.listWorkspaceProjects(workspace.id),
    services.asset.listUnassignedAssets(workspace.id),
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

  // 3. Quota allocation based on account type
  const GB_IN_BYTES = 1024 * 1024 * 1024;
  const quotaMapGB: Record<string, number> = {
    individual: 500,
    team: 2048,
    agency: 5120,
  };
  const totalGB = quotaMapGB[workspace.accountType || "individual"] || 500;
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
      <div className="pb-6 border-b border-white/10">
        <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-1 font-semibold">
          WORKSPACE DASHBOARD
        </div>
        <h1 className="text-3xl font-bold font-heading text-[#f6f3ec]">
          Storage &amp; Usage
        </h1>
        <p className="text-sm text-[#aeaeb4] mt-1 font-sans">
          Track real-time Cloudflare R2 master storage, HLS video streams, and cold archives for{" "}
          <strong className="text-[#f6f3ec]">{workspace.brandName}</strong>.
        </p>
      </div>

      {/* Main Active Storage Meter (SSR Rendered) */}
      <div className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#f5551d]/15 text-[#f5551d] border border-[#f5551d]/30 shrink-0">
              <HardDrive className="size-6" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-[#f6f3ec]">
                Active Cloudflare R2 &amp; Stream Storage
              </h3>
              <p className="text-xs text-[#aeaeb4]">
                Fast edge storage &amp; adaptive HLS 4K video streaming
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold font-mono text-[#f6f3ec]">
              {usedDisplay} <span className="text-sm font-normal text-[#71717a]">/ {quotaDisplay}</span>
            </div>
            <div className="text-xs font-mono text-[#f5551d] font-semibold">
              {percentage}% allocated
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-3 w-full bg-[#0c0c0e] rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-[#f5551d] to-[#ff8a45] rounded-full transition-all duration-500 shadow-sm shadow-[#f5551d]/50"
              style={{ width: `${Math.max(percentage, 2)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-[#71717a]">
            <span>0 GB</span>
            <span>{remainingDisplay} remaining</span>
            <span>{quotaDisplay}</span>
          </div>
        </div>

        {/* Breakdown Items from Real Data */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-[#0c0c0e] border border-white/10 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#f6f3ec]">
              <Film className="size-3.5 text-[#f5551d]" />
              Video Masters &amp; Cuts
            </div>
            <div className="text-sm font-mono font-bold text-white">
              {formatSize(totalVideoBytes)}
            </div>
            <div className="text-[10px] text-[#71717a]">Original video cut source files</div>
          </div>

          <div className="p-3 rounded-xl bg-[#0c0c0e] border border-white/10 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#f6f3ec]">
              <Layers className="size-3.5 text-[#ff8a45]" />
              Adaptive 4K HLS Streams
            </div>
            <div className="text-sm font-mono font-bold text-white">
              {formatSize(totalStreamBytes)}
            </div>
            <div className="text-[10px] text-[#71717a]">Cloudflare transcoded stream cache</div>
          </div>

          <div className="p-3 rounded-xl bg-[#0c0c0e] border border-white/10 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#f6f3ec]">
              <Camera className="size-3.5 text-[#86b98f]" />
              Stills &amp; Deliverables
            </div>
            <div className="text-sm font-mono font-bold text-white">
              {formatSize(totalStillBytes)}
            </div>
            <div className="text-[10px] text-[#71717a]">Graded photo galleries &amp; stills</div>
          </div>
        </div>

        {/* Storage Boost CTA (Client Island) */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <StorageUpgradeButton />
        </div>
      </div>

      {/* The Silo — Cold Storage Archive */}
      <div className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
              <Archive className="size-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-lg font-bold text-[#f6f3ec]">
                  The Silo — Deep Cold Archive
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  Secure Archival
                </span>
              </div>
              <p className="text-xs text-[#aeaeb4] max-w-xl leading-relaxed">
                Move delivered, completed commercial projects to long-term cold storage. Keep your active workspace uncluttered while preserving immutable master backups.
              </p>
            </div>
          </div>

          {/* Archive Action (Client Island) */}
          <ArchiveManagerButton />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-[#aeaeb4]">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0c0c0e] border border-white/10">
            <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
            <span>{quotaDisplay} included in your {workspace.accountType || "Individual"} Plan</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0c0c0e] border border-white/10">
            <Shield className="size-4 text-blue-400 shrink-0" />
            <span>Encrypted triple-redundancy storage</span>
          </div>
        </div>
      </div>
    </div>
  );
}
