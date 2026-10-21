"use client";

import { useState, useEffect, useMemo } from "react";
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
  CheckSquare,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { UniversalDialog } from "@/components/ui/universal-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppImage } from "@/components/ui/app-image";
import {
  formatBytes,
  getDownloadFilename,
  buildAttachmentDownloadUrl,
  triggerDirectDownload,
  triggerSequentialDownloads,
  type SequentialDownloadItem,
} from "@/lib/download";
import { getDeliveryDownloadManifestAction } from "@/app/actions/deliveries";
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
  isDownloadAllowed?: boolean; // false in client review room if creator locked it and cut is not yet approved
  brandName?: string;
  deliveryId?: string;
  shareToken?: string;
  totalAssetsCount?: number;
  onClientDownload?: (info: { assetTitle?: string; downloadedCount?: number }) => void;
}

type FilterTab = "ALL" | "APPROVED" | "VIDEOS" | "PHOTOS";

export function DownloadPackageModal({
  isOpen,
  onOpenChange,
  projectTitle,
  items,
  isDownloadAllowed = true,
  brandName,
  deliveryId,
  shareToken,
  totalAssetsCount,
  onClientDownload,
}: DownloadPackageModalProps) {
  const [fullItems, setFullItems] = useState<DownloadItem[] | null>(null);
  const [isLoadingManifest, setIsLoadingManifest] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>("ALL");
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [queueProgress, setQueueProgress] = useState<{
    current: number;
    total: number;
    title: string;
  } | null>(null);
  const [downloadedIds, setDownloadedIds] = useState<Record<string, boolean>>({});
  const [copiedItemIds, setCopiedItemIds] = useState<Record<string, boolean>>({});
  const [hasCopiedLinks, setHasCopiedLinks] = useState(false);

  // Fetch full unpaginated manifest if the delivery has more assets than currently loaded
  useEffect(() => {
    if (!isOpen) return;
    const expectedTotal = totalAssetsCount ?? items.length;
    if (expectedTotal > items.length && (deliveryId || shareToken) && !fullItems) {
      let cancelled = false;
      setIsLoadingManifest(true);
      getDeliveryDownloadManifestAction({ deliveryId, shareToken })
        .then((res) => {
          if (!cancelled && res.success && res.items && res.items.length > 0) {
            setFullItems(res.items);
          }
        })
        .catch(() => null)
        .finally(() => {
          if (!cancelled) setIsLoadingManifest(false);
        });
      return () => {
        cancelled = true;
      };
    }
  }, [isOpen, totalAssetsCount, items.length, deliveryId, shareToken, fullItems]);

  const activeItems = fullItems && fullItems.length >= items.length ? fullItems : items;

  // Filter items with valid download URLs (or fallback to thumbnailUrl for still photos)
  const validItems = useMemo(
    () =>
      activeItems
        .map((item) => ({
          ...item,
          downloadUrl: item.downloadUrl || item.thumbnailUrl || "",
        }))
        .filter((item) => Boolean(item.downloadUrl)),
    [activeItems]
  );

  // Auto-select all valid items when modal opens or items update
  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds((prev) => {
      const next: Record<string, boolean> = {};
      for (const item of validItems) {
        const canDownloadItem = isDownloadAllowed || Boolean(item.isApproved);
        next[item.id] = prev[item.id] !== undefined ? prev[item.id] : canDownloadItem;
      }
      return next;
    });
  }, [isOpen, validItems, isDownloadAllowed]);

  const filteredItems = useMemo(() => {
    return validItems.filter((item) => {
      const isPhoto =
        item.type === "photo" ||
        item.type === "photo_gallery" ||
        item.type === "still";
      if (filterTab === "APPROVED") return Boolean(item.isApproved);
      if (filterTab === "VIDEOS") return !isPhoto;
      if (filterTab === "PHOTOS") return isPhoto;
      return true;
    });
  }, [validItems, filterTab]);

  const downloadableFilteredItems = useMemo(
    () =>
      filteredItems.filter(
        (item) => isDownloadAllowed || Boolean(item.isApproved)
      ),
    [filteredItems, isDownloadAllowed]
  );

  const selectedDownloadableItems = useMemo(
    () =>
      downloadableFilteredItems.filter((item) => Boolean(selectedIds[item.id])),
    [downloadableFilteredItems, selectedIds]
  );

  const totalSizeBytes = validItems.reduce(
    (acc, curr) => acc + (Number(curr.fileSizeBytes) || 0),
    0
  );

  const selectedSizeBytes = selectedDownloadableItems.reduce(
    (acc, curr) => acc + (Number(curr.fileSizeBytes) || 0),
    0
  );

  const allFilteredSelected =
    downloadableFilteredItems.length > 0 &&
    downloadableFilteredItems.every((item) => Boolean(selectedIds[item.id]));

  const handleToggleSelectAll = () => {
    const nextValue = !allFilteredSelected;
    setSelectedIds((prev) => {
      const next = { ...prev };
      for (const item of downloadableFilteredItems) {
        next[item.id] = nextValue;
      }
      return next;
    });
  };

  const handleToggleItemSelection = (id: string, canDownloadItem: boolean) => {
    if (!canDownloadItem) return;
    setSelectedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const resolveAbsoluteDownloadUrl = (item: DownloadItem): string => {
    const filename = getDownloadFilename(
      item.title,
      item.versionNumber,
      item.downloadUrl,
      item.type
    );
    const attachmentUrl = buildAttachmentDownloadUrl(item.downloadUrl, filename);
    if (
      typeof window !== "undefined" &&
      attachmentUrl.startsWith("/")
    ) {
      return `${window.location.origin}${attachmentUrl}`;
    }
    return attachmentUrl;
  };

  const handleDownloadSingle = (item: DownloadItem) => {
    const canDownloadItem = isDownloadAllowed || Boolean(item.isApproved);
    if (!canDownloadItem) {
      toast.error("This cut is locked pending approval.");
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
    toast.success(`Downloading ${item.title}`, {
      description: `Saving as ${filename}`,
    });
    onClientDownload?.({ assetTitle: item.title, downloadedCount: 1 });
    setTimeout(() => {
      setDownloadedIds((prev) => ({ ...prev, [item.id]: false }));
    }, 4000);
  };

  const handleCopySingleLink = (item: DownloadItem) => {
    const canDownloadItem = isDownloadAllowed || Boolean(item.isApproved);
    if (!canDownloadItem || !item.downloadUrl) return;
    const directUrl = resolveAbsoluteDownloadUrl(item);
    navigator.clipboard.writeText(directUrl);
    setCopiedItemIds((prev) => ({ ...prev, [item.id]: true }));
    toast.success(`Copied direct download URL for ${item.title}`, {
      description: "Paste directly into Free Download Manager (FDM) or IDM.",
    });
    setTimeout(() => {
      setCopiedItemIds((prev) => ({ ...prev, [item.id]: false }));
    }, 2500);
  };

  const handleDownloadSelectedSequential = async () => {
    const targetList =
      selectedDownloadableItems.length > 0
        ? selectedDownloadableItems
        : downloadableFilteredItems;

    if (targetList.length === 0) {
      if (!isDownloadAllowed) {
        toast.error("Downloads are locked until cuts are approved.");
      } else {
        toast.error("Please select at least one deliverable to download.");
      }
      return;
    }

    setIsQueueRunning(true);
    setQueueProgress({
      current: 1,
      total: targetList.length,
      title: targetList[0].title,
    });

    const queueItems: SequentialDownloadItem[] = targetList.map((item) => ({
      url: item.downloadUrl,
      filename: getDownloadFilename(
        item.title,
        item.versionNumber,
        item.downloadUrl,
        item.type
      ),
      title: item.title,
    }));

    const toastId = toast.loading(
      `Dispatching 1 of ${queueItems.length}: ${queueItems[0].title}...`,
      {
        description: "Streaming master files directly to your browser Downloads...",
      }
    );

    try {
      await triggerSequentialDownloads(
        queueItems,
        (current, total, currentItem) => {
          setQueueProgress({ current, total, title: currentItem.title });
          toast.loading(
            `Dispatching ${current} of ${total}: ${currentItem.title}...`,
            {
              id: toastId,
              description: `${Math.round((current / total) * 100)}% queued to browser download manager`,
            }
          );
        },
        850
      );
      setDownloadedIds((prev) => {
        const next = { ...prev };
        for (const item of targetList) {
          next[item.id] = true;
        }
        return next;
      });
      toast.success(
        `${queueItems.length} ${
          queueItems.length === 1 ? "deliverable" : "deliverables"
        } queued for download!`,
        {
          id: toastId,
          description: "Files stream directly from cloud storage to your disk.",
        }
      );
      onClientDownload?.({
        downloadedCount: queueItems.length,
        assetTitle: queueItems.length === 1 ? queueItems[0].title : undefined,
      });
    } catch (err) {
      console.error("Queue download error:", err);
      toast.error("An error occurred while dispatching the download queue.", {
        id: toastId,
      });
    } finally {
      setIsQueueRunning(false);
      setQueueProgress(null);
    }
  };

  const handleCopyLinks = () => {
    const targetList =
      selectedDownloadableItems.length > 0
        ? selectedDownloadableItems
        : downloadableFilteredItems;
    if (targetList.length === 0) return;

    const text = targetList.map((i) => resolveAbsoluteDownloadUrl(i)).join("\n");
    navigator.clipboard.writeText(text);
    setHasCopiedLinks(true);
    toast.success(`Copied ${targetList.length} direct URLs to clipboard!`, {
      description:
        "Paste into Free Download Manager (Ctrl+V) or IDM for multi-file batch download.",
    });
    setTimeout(() => setHasCopiedLinks(false), 2500);
  };

  const hasAnyDownloadable =
    isDownloadAllowed || validItems.some((i) => Boolean(i.isApproved));

  return (
    <UniversalDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      size="2xl"
      icon={<HardDriveDownload className="size-5 text-primary" />}
      title="Master Deliverables Package"
      description={`${projectTitle} ${brandName ? `· ${brandName}` : ""}`}
      headerExtra={
        <div className="hidden sm:flex flex-col items-end gap-1 text-right">
          <Badge variant="orange" className="font-mono text-xs font-bold py-0.5">
            {validItems.length}{" "}
            {validItems.length === 1 ? "Deliverable" : "Deliverables"}
          </Badge>
          {totalSizeBytes > 0 && (
            <span className="text-[11px] font-mono text-[#aeaeb4]">
              {formatBytes(totalSizeBytes)} total
            </span>
          )}
        </div>
      }
      bodyClassName="space-y-5"
      footer={
        <div className="w-full flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#71717a] font-mono gap-1">
          <span>
            💡 Direct stream from cloud storage — zero browser memory limit
          </span>
          <span>Compatible with Free Download Manager, IDM &amp; browser shelf</span>
        </div>
      }
    >

        {/* Locked Notice */}
        {!isDownloadAllowed && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 text-amber-300">
            <Lock className="size-5 shrink-0 mt-0.5 text-amber-400" />
            <div className="space-y-1 text-xs">
              <p className="font-bold">
                {hasAnyDownloadable
                  ? "Unapproved Drafts Locked — Approved Cuts Unlocked"
                  : "Downloads Currently Restricted"}
              </p>
              <p className="text-amber-200/80 leading-relaxed">
                {hasAnyDownloadable
                  ? "Approved assets are unlocked for immediate download below. Approve the remaining cuts to unlock the full package."
                  : "The creator has locked master cut downloads pending final sign-off and approval. Once approved, all high-resolution files unlock automatically."}
              </p>
            </div>
          </div>
        )}

        {/* Direct Download Queue Controller */}
        {hasAnyDownloadable && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <h4 className="text-sm font-bold text-white font-display">
                    Direct Cloud Storage Download
                  </h4>
                </div>
                <p className="text-[11px] text-[#aeaeb4] mt-0.5">
                  {selectedDownloadableItems.length > 0 && selectedSizeBytes > 0
                    ? `${selectedDownloadableItems.length} selected (${formatBytes(
                        selectedSizeBytes
                      )}) · Streams directly from cloud storage to disk.`
                    : "Multi-file queue transfers directly from cloud storage to your disk with zero browser RAM limit."}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={selectedDownloadableItems.length === 0}
                  onClick={handleCopyLinks}
                  className="rounded-full border-white/20 text-[#aeaeb4] hover:text-white hover:bg-white/10 text-xs font-mono h-8 px-3 cursor-pointer"
                  title="Copy direct download URLs for selected items"
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
                  onClick={handleDownloadSelectedSequential}
                  disabled={
                    isQueueRunning || selectedDownloadableItems.length === 0
                  }
                  className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-4 py-2 shadow-lg shadow-primary/20 border-0 transition-all cursor-pointer h-8 gap-1.5 disabled:opacity-50"
                >
                  {isQueueRunning ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Queueing...</span>
                    </>
                  ) : (
                    <>
                      <Download className="size-3.5" />
                      <span>
                        {selectedDownloadableItems.length === validItems.length
                          ? `Download All (${selectedDownloadableItems.length})`
                          : `Download Selected (${selectedDownloadableItems.length})`}
                      </span>
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
                  <span>
                    {Math.round(
                      (queueProgress.current / queueProgress.total) * 100
                    )}
                    %
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${
                        (queueProgress.current / queueProgress.total) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filter Pills + Select All Header */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10">
              {(["ALL", "APPROVED", "VIDEOS", "PHOTOS"] as const).map((tab) => (
                <Button
                  key={tab}
                  type="button"
                  variant={filterTab === tab ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterTab(tab)}
                  className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer h-auto ${
                    filterTab === tab
                      ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                      : "text-[#aeaeb4] hover:text-white hover:bg-transparent"
                  }`}
                >
                  {tab}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {isLoadingManifest && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-primary">
                  <Loader2 className="size-3 animate-spin" />
                  Syncing all deliverables...
                </span>
              )}
              {downloadableFilteredItems.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleSelectAll}
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#aeaeb4] hover:text-white transition-colors cursor-pointer h-auto p-0 hover:bg-transparent"
                >
                  {allFilteredSelected ? (
                    <CheckSquare className="size-3.5 text-primary" />
                  ) : (
                    <Square className="size-3.5" />
                  )}
                  <span>{allFilteredSelected ? "Deselect All" : "Select All"}</span>
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#aeaeb4] bg-white/5 rounded-2xl border border-white/10">
                No deliverables match this filter.
              </div>
            ) : (
              filteredItems.map((item) => {
                const isPhoto =
                  item.type === "photo" ||
                  item.type === "photo_gallery" ||
                  item.type === "still";
                const isDownloaded = downloadedIds[item.id];
                const canDownloadItem =
                  isDownloadAllowed || Boolean(item.isApproved);
                const isSelected =
                  canDownloadItem && Boolean(selectedIds[item.id]);

                return (
                  <div
                    key={item.id}
                    onClick={() =>
                      handleToggleItemSelection(item.id, canDownloadItem)
                    }
                    className={`flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border transition-colors ${
                      canDownloadItem ? "cursor-pointer" : "opacity-60"
                    } ${
                      isSelected
                        ? "bg-white/[0.08] border-primary/40"
                        : "bg-white/5 hover:bg-white/[0.07] border-white/10"
                    }`}
                  >
                    {/* Checkbox + Media Thumbnail + Metadata */}
                    <div className="flex items-center gap-3 min-w-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={!canDownloadItem}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleItemSelection(item.id, canDownloadItem);
                        }}
                        className="text-[#aeaeb4] hover:text-white disabled:opacity-30 shrink-0 cursor-pointer p-0 h-auto hover:bg-transparent"
                      >
                        {isSelected ? (
                          <CheckSquare className="size-4 text-primary" />
                        ) : (
                          <Square className="size-4" />
                        )}
                      </Button>

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
                              ✓ Approved
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono text-[#aeaeb4] truncate">
                          <span>{item.aspectRatio || "16:9"}</span>
                          {item.duration && <span>· {item.duration}</span>}
                          {item.fileSizeBytes && item.fileSizeBytes > 0 ? (
                            <span>· {formatBytes(item.fileSizeBytes)}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Single Download & Copy Actions */}
                    <div
                      className="shrink-0 flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={!canDownloadItem}
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
                          {copiedItemIds[item.id]
                            ? "Link copied!"
                            : "Copy direct URL (for FDM / IDM)"}
                        </TooltipContent>
                      </Tooltip>

                      <Button
                        type="button"
                        size="sm"
                        disabled={!canDownloadItem}
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
                        ) : !canDownloadItem ? (
                          <>
                            <Lock className="size-3.5" />
                            <span>Locked</span>
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

    </UniversalDialog>
  );
}

