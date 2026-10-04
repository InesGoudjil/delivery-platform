"use client";

import { useState } from "react";
import {
  Download,
  Check,
  Copy,
  Lock,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  HardDriveDownload,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppImage } from "@/components/ui/app-image";
import {
  formatBytes,
  getDownloadFilename,
  triggerDirectDownload,
  triggerSequentialDownloads,
  type SequentialDownloadItem,
} from "@/lib/download";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

export interface DownloadItem {
  id: string;
  title: string;
  type?: "video" | "photo" | string;
  versionNumber?: number;
  fileSizeBytes?: number | null;
  duration?: string | null;
  aspectRatio?: string | null;
  thumbnailUrl?: string | null;
  downloadUrl: string;
  isApproved?: boolean;
}

export interface DownloadPackageModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectTitle: string;
  items: DownloadItem[];
  isDownloadAllowed?: boolean; // false in client review room if creator locked it
  brandName?: string;
}

export function DownloadPackageModal({
  isOpen,
  onOpenChange,
  projectTitle,
  items,
  isDownloadAllowed = true,
  brandName,
}: DownloadPackageModalProps) {
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [queueProgress, setQueueProgress] = useState<{
    current: number;
    total: number;
    title: string;
  } | null>(null);
  const [downloadedIds, setDownloadedIds] = useState<Record<string, boolean>>({});
  const [copiedItemIds, setCopiedItemIds] = useState<Record<string, boolean>>({});
  const [hasCopiedLinks, setHasCopiedLinks] = useState(false);

  // Filter items with valid download URLs
  const validItems = items.filter((item) => Boolean(item.downloadUrl));
  const totalSizeBytes = validItems.reduce(
    (acc, curr) => acc + (Number(curr.fileSizeBytes) || 0),
    0
  );

  const handleDownloadSingle = (item: DownloadItem) => {
    if (!isDownloadAllowed) {
      toast.error("Downloads are currently locked by the creator pending sign-off.");
      return;
    }
    const filename = getDownloadFilename(
      item.title,
      item.versionNumber,
      item.downloadUrl,
      item.type
    );
    triggerDirectDownload(item.downloadUrl, filename);
    setDownloadedIds((prev) => ({ ...prev, [item.id]: true }));
    toast.success(`Started download for ${item.title}`);
    setTimeout(() => {
      setDownloadedIds((prev) => ({ ...prev, [item.id]: false }));
    }, 4000);
  };

  const handleCopySingleLink = (item: DownloadItem) => {
    if (!item.downloadUrl) return;
    navigator.clipboard.writeText(item.downloadUrl);
    setCopiedItemIds((prev) => ({ ...prev, [item.id]: true }));
    toast.success(`Copied direct URL for ${item.title}`, {
      description: "Paste directly into Free Download Manager (FDM) or IDM.",
    });
    setTimeout(() => {
      setCopiedItemIds((prev) => ({ ...prev, [item.id]: false }));
    }, 2500);
  };

  const handleDownloadAllSequential = async () => {
    if (!isDownloadAllowed) {
      toast.error("Downloads are currently locked by the creator pending sign-off.");
      return;
    }
    if (validItems.length === 0) {
      toast.error("No downloadable master files found.");
      return;
    }

    setIsQueueRunning(true);
    setQueueProgress({ current: 1, total: validItems.length, title: validItems[0].title });

    const queueItems: SequentialDownloadItem[] = validItems.map((item) => ({
      url: item.downloadUrl,
      filename: getDownloadFilename(
        item.title,
        item.versionNumber,
        item.downloadUrl,
        item.type
      ),
      title: item.title,
    }));

    try {
      await triggerSequentialDownloads(
        queueItems,
        (current, total, currentItem) => {
          setQueueProgress({ current, total, title: currentItem.title });
        },
        900 // 900ms spacing to prevent browser popup throttling
      );
      toast.success(
        `All ${validItems.length} deliverables queued for download in your browser!`,
        {
          description: "Files stream directly from Cloudflare R2 straight to your disk.",
        }
      );
    } catch (err) {
      console.error("Queue download error:", err);
      toast.error("An error occurred while dispatching the download queue.");
    } finally {
      setIsQueueRunning(false);
      setQueueProgress(null);
    }
  };

  const handleCopyLinks = () => {
    // Provide clean direct URLs one per line, optimal for Free Download Manager / IDM batch paste
    const text = validItems.map((i) => i.downloadUrl).join("\n");
    navigator.clipboard.writeText(text);
    setHasCopiedLinks(true);
    toast.success(`Copied ${validItems.length} direct URLs to clipboard!`, {
      description: "Paste into Free Download Manager (Ctrl+V) or IDM for multi-file accelerated batch download.",
    });
    setTimeout(() => setHasCopiedLinks(false), 2500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[#111115] border border-white/15 text-[#f6f3ec] rounded-3xl p-5 sm:p-7 w-[94vw] max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
        <DialogHeader className="space-y-2 border-b border-white/10 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-[#f5551d]/15 text-[#f5551d] flex items-center justify-center shrink-0 border border-[#f5551d]/30 shadow-inner">
                <HardDriveDownload className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold font-display text-white">
                  Master Deliverables Package
                </DialogTitle>
                <DialogDescription className="text-xs text-[#aeaeb4] font-mono truncate max-w-sm sm:max-w-md">
                  {projectTitle} {brandName ? `· ${brandName}` : ""}
                </DialogDescription>
              </div>
            </div>

            {/* Total Size & Count Badges */}
            <div className="hidden sm:flex flex-col items-end gap-1 text-right">
              <Badge variant="orange" className="font-mono text-xs font-bold py-0.5">
                {validItems.length} {validItems.length === 1 ? "Deliverable" : "Deliverables"}
              </Badge>
              {totalSizeBytes > 0 && (
                <span className="text-[11px] font-mono text-[#aeaeb4]">
                  {formatBytes(totalSizeBytes)} total
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Locked Notice */}
        {!isDownloadAllowed && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 text-amber-300">
            <Lock className="size-5 shrink-0 mt-0.5 text-amber-400" />
            <div className="space-y-1 text-xs">
              <p className="font-bold">Downloads Currently Restricted</p>
              <p className="text-amber-200/80 leading-relaxed">
                The creator has locked master cut downloads pending final sign-off and approval.
                Once approved, all high-resolution files will be unlocked for download here.
              </p>
            </div>
          </div>
        )}

        {/* Direct Download Queue Controller */}
        {isDownloadAllowed && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-[#f5551d]" />
                  <h4 className="text-sm font-bold text-white font-display">
                    Direct Cloud Storage Download
                  </h4>
                </div>
                <p className="text-[11px] text-[#aeaeb4] mt-0.5">
                  Multi-file queue transfers directly from Cloudflare R2 to your disk with zero browser RAM limit.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLinks}
                  className="rounded-full border-white/20 text-[#aeaeb4] hover:text-white hover:bg-white/10 text-xs font-mono h-8 px-3"
                  title="Copy all direct URLs to clipboard"
                >
                  {hasCopiedLinks ? (
                    <>
                      <Check className="size-3 text-emerald-400 mr-1.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3 mr-1.5" />
                      <span>Copy Links</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={handleDownloadAllSequential}
                  disabled={isQueueRunning || validItems.length === 0}
                  className="rounded-full bg-gradient-to-r from-[#d9481d] to-[#802010] hover:from-[#f5551d] hover:to-[#992e10] text-white font-bold text-xs px-4 py-2 shadow-lg shadow-[#d9481d]/20 border border-[#f5551d]/40 transition-all cursor-pointer h-8 gap-1.5 disabled:opacity-50"
                >
                  {isQueueRunning ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Queueing...</span>
                    </>
                  ) : (
                    <>
                      <Download className="size-3.5" />
                      <span>Download All ({validItems.length})</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Active Queue Progress Bar */}
            {isQueueRunning && queueProgress && (
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#aeaeb4]">
                  <span>
                    Dispatching {queueProgress.current} of {queueProgress.total}:{" "}
                    <strong className="text-white">{queueProgress.title}</strong>
                  </span>
                  <span>{Math.round((queueProgress.current / queueProgress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#f5551d] h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${(queueProgress.current / queueProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Deliverables List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono text-[#aeaeb4] px-1">
            <span>AVAILABLE MASTER FILES ({validItems.length})</span>
            <span className="sm:hidden">{formatBytes(totalSizeBytes)}</span>
          </div>

          <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
            {validItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#aeaeb4] bg-white/5 rounded-2xl border border-white/10">
                No deliverable files available for download yet.
              </div>
            ) : (
              validItems.map((item) => {
                const isPhoto =
                  item.type === "photo" ||
                  item.type === "photo_gallery" ||
                  item.type === "still";
                const isDownloaded = downloadedIds[item.id];

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-white/5 hover:bg-white/[0.08] border border-white/10 transition-colors"
                  >
                    {/* Media Thumbnail + Metadata */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-12 sm:size-14 rounded-xl bg-black/40 overflow-hidden relative shrink-0 border border-white/10">
                        {item.thumbnailUrl ? (
                          <AppImage
                            src={item.thumbnailUrl}
                            alt={item.title}
                            fill
                            className="object-cover"
                            fallbackIcon={isPhoto ? "image" : "film"}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#aeaeb4]">
                            {isPhoto ? (
                              <ImageIcon className="size-5" />
                            ) : (
                              <FileVideo className="size-5" />
                            )}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h5 className="font-semibold text-xs sm:text-sm text-white truncate">
                            {item.title}
                          </h5>
                          {item.versionNumber && (
                            <Badge
                              variant="orange"
                              className="text-[9px] font-mono font-bold py-0 h-4 shrink-0"
                            >
                              V{item.versionNumber}
                            </Badge>
                          )}
                          {item.isApproved && (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10 py-0 h-4 hidden sm:inline-flex"
                            >
                              Approved
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono text-[#aeaeb4] truncate">
                          <span>{item.aspectRatio || "16:9"}</span>
                          {item.duration && <span>· {item.duration}</span>}
                          {item.fileSizeBytes && item.fileSizeBytes > 0 && (
                            <span>· {formatBytes(item.fileSizeBytes)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Single Download & Copy Actions */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={!isDownloadAllowed}
                              onClick={() => handleCopySingleLink(item)}
                              className="size-8 rounded-xl text-[#aeaeb4] hover:text-white hover:bg-white/10 transition-colors p-0 cursor-pointer disabled:opacity-40"
                            >
                              {copiedItemIds[item.id] ? (
                                <Check className="size-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="size-3.5" />
                              )}
                            </Button>
                          }
                        />
                        <TooltipContent>
                          {copiedItemIds[item.id] ? "Link copied!" : "Copy direct URL (for FDM / IDM)"}
                        </TooltipContent>
                      </Tooltip>

                      <Button
                        type="button"
                        size="sm"
                        disabled={!isDownloadAllowed}
                        onClick={() => handleDownloadSingle(item)}
                        className={`h-8 rounded-xl font-mono text-xs font-bold px-3 transition-all cursor-pointer flex items-center gap-1.5 ${
                          isDownloaded
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30"
                            : "bg-white/10 text-white hover:bg-white/20 border border-white/15"
                        } disabled:opacity-40`}
                      >
                        {isDownloaded ? (
                          <>
                            <Check className="size-3.5 text-emerald-400" />
                            <span className="hidden sm:inline">Downloaded</span>
                          </>
                        ) : (
                          <>
                            <Download className="size-3.5" />
                            <span>Download</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footnote / FDM & IDM compatibility info */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#71717a] font-mono pt-1 border-t border-white/5 gap-1">
          <span>💡 Direct stream from Cloudflare R2 — zero browser memory limit</span>
          <span>Compatible with Free Download Manager, IDM & browser shelf</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
