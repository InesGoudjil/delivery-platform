"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Trash2,
  RotateCcw,
  Clock,
  AlertTriangle,
  Loader2,
  Film,
  Image as ImageIcon,
  Archive,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  listTrashAssetsAction,
  restoreAssetAction,
  permanentDeleteAssetAction,
  emptyTrashAction,
} from "@/app/actions/deliveries";
import { DeleteConfirmDialog } from "@/components/workspaces/delete-confirm-dialog";

interface TrashedAsset {
  id: string;
  title: string;
  type: string;
  deliveryId: string | null;
  workspaceId: string;
  thumbnailUrl: string | null;
  fileSizeBytes: number;
  deletedAt: string;
  daysRemaining: number;
}

interface TrashBinDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspaceSlug?: string;
  deliveryId?: string;
  onItemRestored?: (assetId: string) => void;
  onItemPermanentlyDeleted?: (assetId: string) => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function TrashBinDialog({
  isOpen,
  onOpenChange,
  workspaceId,
  workspaceSlug,
  deliveryId,
  onItemRestored,
  onItemPermanentlyDeleted,
}: TrashBinDialogProps) {
  const [assets, setAssets] = useState<TrashedAsset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Permanent delete modal state
  const [permanentTarget, setPermanentTarget] = useState<TrashedAsset | null>(null);
  const [isPermanentDeleting, setIsPermanentDeleting] = useState<boolean>(false);

  // Empty trash confirm modal state
  const [showEmptyConfirm, setShowEmptyConfirm] = useState<boolean>(false);
  const [isEmptying, setIsEmptying] = useState<boolean>(false);

  const fetchTrash = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const res = await listTrashAssetsAction(workspaceId);
      if (res.success && res.assets) {
        setAssets(res.assets);
      } else {
        toast.error(res.error || "Failed to load trashed items.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load trashed items.");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (isOpen) {
      fetchTrash();
    }
  }, [isOpen, fetchTrash]);

  const handleRestore = async (asset: TrashedAsset) => {
    setRestoringId(asset.id);
    try {
      const res = await restoreAssetAction(asset.id, {
        deliveryId: asset.deliveryId || deliveryId,
        workspaceSlug,
      });

      if (res.success) {
        toast.success(`"${asset.title}" restored successfully!`);
        setAssets((prev) => prev.filter((a) => a.id !== asset.id));
        onItemRestored?.(asset.id);
      } else {
        toast.error(res.error || "Failed to restore asset.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!permanentTarget) return;
    setIsPermanentDeleting(true);
    try {
      const res = await permanentDeleteAssetAction(permanentTarget.id, {
        deliveryId: permanentTarget.deliveryId || deliveryId,
        workspaceSlug,
      });

      if (res.success) {
        toast.success(`"${permanentTarget.title}" permanently deleted from Cloudflare.`);
        setAssets((prev) => prev.filter((a) => a.id !== permanentTarget.id));
        onItemPermanentlyDeleted?.(permanentTarget.id);
        setPermanentTarget(null);
      } else {
        toast.error(res.error || "Failed to permanently delete asset.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsPermanentDeleting(false);
    }
  };

  const handleEmptyTrash = async () => {
    setIsEmptying(true);
    try {
      const res = await emptyTrashAction(workspaceId, workspaceSlug);
      if (res.success) {
        toast.success("Trash emptied. All assets permanently purged.");
        setAssets([]);
        setShowEmptyConfirm(false);
      } else {
        toast.error(res.error || "Failed to empty trash.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsEmptying(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={true}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[#141418]/95 backdrop-blur-xl border border-white/15 text-white rounded-3xl p-6 sm:p-7 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl space-y-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-heading text-white">
                    Workspace Trash
                  </h2>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                    {assets.length} {assets.length === 1 ? "item" : "items"}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Items in trash are automatically purged after 30 days.
                </p>
              </div>
            </div>

            {assets.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowEmptyConfirm(true)}
                className="rounded-full border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="size-3.5" />
                <span>Empty Trash</span>
              </Button>
            )}
          </div>

          {/* Body / List */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-[220px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-zinc-400">
                <Loader2 className="size-6 animate-spin text-[#f5551d]" />
                <span className="text-xs font-mono">Loading trashed items...</span>
              </div>
            ) : assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 gap-3 text-center px-4">
                <div className="size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500">
                  <Archive className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-300">Trash is empty</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                    When you delete assets from deliveries or portfolio, they will appear here for 30 days before permanent removal.
                  </p>
                </div>
              </div>
            ) : (
              assets.map((asset) => {
                const isFilm = asset.type !== "photo_gallery";
                const isRestoring = restoringId === asset.id;

                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all group"
                  >
                    {/* Thumbnail & Title */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="relative size-14 rounded-xl overflow-hidden bg-black/60 border border-white/10 shrink-0 flex items-center justify-center">
                        {asset.thumbnailUrl ? (
                          <Image
                            src={asset.thumbnailUrl}
                            alt={asset.title}
                            fill
                            className="object-cover"
                            sizes="56px"
                            unoptimized
                          />
                        ) : (
                          <div className="text-zinc-500">
                            {isFilm ? <Film className="size-5" /> : <ImageIcon className="size-5" />}
                          </div>
                        )}
                        <div className="absolute top-1 left-1 size-5 rounded-md bg-black/60 backdrop-blur-md flex items-center justify-center text-white/80">
                          {isFilm ? <Film className="size-2.5" /> : <ImageIcon className="size-2.5" />}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white truncate max-w-[220px] sm:max-w-xs">
                            {asset.title}
                          </h4>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${
                              asset.daysRemaining <= 5
                                ? "bg-red-500/10 border-red-500/30 text-red-400"
                                : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                            }`}
                          >
                            <span className="inline-flex items-center gap-1">
                              <Clock className="size-2.5" />
                              {asset.daysRemaining}d left
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-400 font-mono">
                          <span>{isFilm ? "Film Cut" : "Photo Still"}</span>
                          {asset.fileSizeBytes > 0 && (
                            <>
                              <span>•</span>
                              <span>{formatBytes(asset.fileSizeBytes)}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>Trashed {new Date(asset.deletedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isRestoring}
                        onClick={() => handleRestore(asset)}
                        className="rounded-full bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Restore asset"
                      >
                        {isRestoring ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="size-3.5 text-[#f5551d]" />
                        )}
                        <span className="hidden sm:inline">Restore</span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPermanentTarget(asset)}
                        className="rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs px-2.5 py-1.5 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Delete permanently"
                      >
                        <Trash2 className="size-3.5" />
                        <span className="hidden sm:inline">Purge</span>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400 shrink-0">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-amber-400 shrink-0" />
              Restoring an asset returns it directly to its delivery room or portfolio.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-full border-white/15 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs px-4 py-1.5 cursor-pointer"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Single Item Permanent Delete Confirm Dialog */}
      <DeleteConfirmDialog
        isOpen={!!permanentTarget}
        onOpenChange={(open) => !open && setPermanentTarget(null)}
        isPermanent={true}
        title="Delete Forever"
        itemName={permanentTarget?.title}
        description="This will permanently purge this asset and its video files from Cloudflare Stream and R2 storage, and recover workspace quota. This cannot be undone."
        confirmText="Delete Forever"
        isDeleting={isPermanentDeleting}
        onConfirm={handlePermanentDelete}
      />

      {/* Empty Trash Confirm Dialog */}
      <DeleteConfirmDialog
        isOpen={showEmptyConfirm}
        onOpenChange={(open) => !open && setShowEmptyConfirm(false)}
        isPermanent={true}
        title="Empty Workspace Trash"
        description={`Are you sure you want to permanently delete all ${assets.length} items from trash? All associated media files will be deleted from Cloudflare storage forever.`}
        confirmText="Empty Trash Forever"
        isDeleting={isEmptying}
        onConfirm={handleEmptyTrash}
      />
    </>
  );
}
