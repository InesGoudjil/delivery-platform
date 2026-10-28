"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Upload,
  X,
  Image as ImageIcon,
  Film,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Crop,
  Trash2,
  Plus,
  Layers,
  Info,
} from "lucide-react";
import { UniversalDialog } from "@/components/ui/universal-dialog";
import { TypographyMuted } from "@/components/ui/typography";
import { updateAssetAction } from "@/app/actions/assets";
import { PortfolioItem } from "../portfolio-client";
import { createUploadProgressToast } from "@/lib/upload-toast";
import {
  directUploadMediaFile,
  formatBytes,
} from "@/components/workspaces/video-uploader";
import {
  ImageCropEditorDialog,
  ImageCropResult,
} from "@/components/ui/image-crop-editor-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentActions,
  AttachmentAction,
} from "@/components/ui/attachment";

export interface QueuedFilmItem {
  id: string;
  file: File;
  previewUrl: string | null;
  assetType: "video" | "photo_gallery";
  title: string;
  status: "queued" | "uploading" | "completed" | "error";
  progress: number;
  statusText: string;
  errorMessage: string | null;
  uploadedAsset?: any;
  uploadedVersion?: any;
}

interface UploadFilmModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onAssetUploaded: (item: PortfolioItem) => void;
  showFlash: (msg: string) => void;
  isAtLimit?: boolean;
  limit?: number;
  workspaceSlug?: string;
}

export function UploadFilmModal({
  workspaceId,
  isOpen,
  onClose,
  onAssetUploaded,
  showFlash,
  isAtLimit = false,
  limit = 4,
  workspaceSlug,
}: UploadFilmModalProps) {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [queue, setQueue] = useState<QueuedFilmItem[]>([]);
  const [description, setDescription] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbCropState, setThumbCropState] = useState<{
    isOpen: boolean;
    imageSrc: string | null;
    fileName: string;
  }>({
    isOpen: false,
    imageSrc: null,
    fileName: "film-thumbnail.jpg",
  });

  const [uploading, setUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const activeXhrRef = useRef<XMLHttpRequest | null>(null);
  const abortControllerRef = useRef<boolean>(false);
  const uploadToastRef = useRef<ReturnType<typeof createUploadProgressToast> | null>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      queue.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [queue]);

  const addFilesToQueue = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: QueuedFilmItem[] = Array.from(files).map((file, idx) => {
      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? URL.createObjectURL(file) : null;
      const cleanTitle = file.name.replace(/\.[^/.]+$/, "");

      return {
        id: `film_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        file,
        previewUrl,
        assetType: isImage ? "photo_gallery" : "video",
        title: cleanTitle,
        status: "queued",
        progress: 0,
        statusText: "Ready in queue",
        errorMessage: null,
      };
    });

    setQueue((prev) => [...prev, ...newItems]);
    setErrorMessage(null);
  };

  const removeItem = (id: string) => {
    setQueue((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  const updateItemTitle = (id: string, title: string) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title } : item))
    );
  };

  const clearQueue = () => {
    queue.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setQueue([]);
    setDescription("");
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setErrorMessage(null);
  };

  const handleThumbnailSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const objectUrl = URL.createObjectURL(file);
    setThumbCropState({
      isOpen: true,
      imageSrc: objectUrl,
      fileName: file.name,
    });
    if (thumbInputRef.current) thumbInputRef.current.value = "";
  };

  const handleApplyThumbnailCrop = (result: ImageCropResult) => {
    setThumbnailFile(result.file);
    setThumbnailPreview(result.dataUrl);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const resetForm = () => {
    clearQueue();
    setUploading(false);
    setOverallProgress(0);
    setStatusText("");
    setErrorMessage(null);
  };

  /**
   * Close handler:
   * Clicking backdrop, ESC, or close button closes the modal view.
   * If an upload is in progress, it CONTINUES IN THE BACKGROUND without being aborted!
   */
  const handleClose = () => {
    if (!uploading) {
      resetForm();
    }
    onClose();
  };

  const cancelActiveUpload = () => {
    abortControllerRef.current = true;
    if (activeXhrRef.current) {
      activeXhrRef.current.abort();
    }
    if (uploadToastRef.current) {
      uploadToastRef.current.info("Upload cancelled", "Batch upload was stopped by user.");
      uploadToastRef.current = null;
    }
    setUploading(false);
    setStatusText("Upload cancelled");
  };

  const handleStartBatchUpload = async () => {
    const queuedItems = queue.filter(
      (item) => item.status === "queued" || item.status === "error"
    );
    if (queuedItems.length === 0 || uploading) return;

    setUploading(true);
    abortControllerRef.current = false;
    setErrorMessage(null);
    setOverallProgress(0);

    const totalFiles = queuedItems.length;
    const uploadToast = createUploadProgressToast(`portfolio-batch-${Date.now()}`);
    uploadToastRef.current = uploadToast;

    uploadToast.start({
      title:
        totalFiles > 1
          ? `Uploading ${totalFiles} portfolio assets...`
          : `Uploading "${queuedItems[0].title || queuedItems[0].file.name}"`,
      fileName: queuedItems[0].file.name,
      fileSize: formatBytes(queuedItems[0].file.size),
      fileIndex: 1,
      totalFiles,
      percentage: 0,
      statusText: "Initializing direct upload...",
    });

    const completedItems: PortfolioItem[] = [];
    let failedCount = 0;
    let lastError = "";

    for (let i = 0; i < queuedItems.length; i++) {
      if (abortControllerRef.current) break;

      const item = queuedItems[i];
      const itemTitle = item.title.trim() || item.file.name;
      const isImage = item.assetType === "photo_gallery";

      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, status: "uploading", progress: 0, statusText: "Initiating upload..." }
            : q
        )
      );

      const basePct = Math.round((i / totalFiles) * 100);
      setOverallProgress(basePct);
      setStatusText(`Uploading (${i + 1}/${totalFiles}): ${itemTitle}`);

      uploadToast.update({
        title:
          totalFiles > 1
            ? `Uploading (${i + 1}/${totalFiles}): ${itemTitle}`
            : `Uploading "${itemTitle}"`,
        fileName: item.file.name,
        fileSize: formatBytes(item.file.size),
        fileIndex: i + 1,
        totalFiles,
        percentage: 0,
        statusText: "Initiating upload...",
      });

      try {
        // Direct upload to Cloudflare / edge with projectId: "" (unassigned standalone asset)
        const result = await directUploadMediaFile({
          workspaceId,
          projectId: "",
          file: item.file,
          title: itemTitle,
          assetType: item.assetType,
          onProgress: (percent, loaded, total) => {
            setQueue((prev) =>
              prev.map((q) =>
                q.id === item.id
                  ? {
                      ...q,
                      progress: percent,
                      statusText: `Uploading: ${percent}% (${formatBytes(loaded)} / ${formatBytes(total)})`,
                    }
                  : q
              )
            );

            const overall = Math.round(((i + percent / 100) / totalFiles) * 98);
            setOverallProgress(overall);

            uploadToast.update({
              title:
                totalFiles > 1
                  ? `Uploading (${i + 1}/${totalFiles}): ${itemTitle}`
                  : `Uploading "${itemTitle}"`,
              fileName: item.file.name,
              loadedBytes: loaded,
              totalBytes: total,
              fileIndex: i + 1,
              totalFiles,
              percentage: percent,
              statusText: percent < 100 ? "Uploading directly to edge..." : "Finalizing asset...",
            });
          },
          onStatusChange: (statusText) => {
            setQueue((prev) =>
              prev.map((q) => (q.id === item.id ? { ...q, statusText } : q))
            );
          },
          onXhrCreated: (xhr) => {
            activeXhrRef.current = xhr;
          },
        });

        // If single upload and custom thumbnail or description was provided, apply it
        const customThumbUrl = thumbnailPreview || "";
        if ((customThumbUrl || description.trim()) && queuedItems.length === 1) {
          try {
            await updateAssetAction(
              result.asset.id,
              {
                ...(customThumbUrl ? { thumbnailUrl: customThumbUrl } : {}),
                ...(description.trim() ? { description: description.trim() } : {}),
              },
              { workspaceSlug }
            );
          } catch (updateErr) {
            console.warn("Asset metadata update notice:", updateErr);
          }
        }

        // Mark item completed in state
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: "completed",
                  progress: 100,
                  statusText: "Ready & transcoded",
                  uploadedAsset: result.asset,
                  uploadedVersion: result.assetVersion,
                }
              : q
          )
        );

        const resolvedThumbUrl =
          customThumbUrl ||
          result.assetVersion?.thumbnailUrl ||
          (isImage ? result.assetVersion?.rawFileUrl : "") ||
          "";

        const resolvedMediaUrl = isImage
          ? (customThumbUrl || result.assetVersion?.rawFileUrl || "")
          : (result.assetVersion?.rawFileUrl || result.assetVersion?.hlsManifestUrl || "");

        const portfolioItem: PortfolioItem = {
          id: result.asset.id,
          title: itemTitle,
          category: isImage ? "Photo Still" : "Standalone Film",
          type: isImage ? "still" : "film",
          assetCount: 1,
          thumbnailUrl: resolvedThumbUrl,
          mediaUrl: resolvedMediaUrl,
          description: queuedItems.length === 1 && description.trim() ? description.trim() : undefined,
        };

        completedItems.push(portfolioItem);
        onAssetUploaded(portfolioItem);
      } catch (err: any) {
        failedCount++;
        lastError = err.message || "Failed to upload asset.";
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: "error",
                  statusText: "Upload failed",
                  errorMessage: lastError,
                }
              : q
          )
        );
      } finally {
        activeXhrRef.current = null;
      }
    }

    setUploading(false);
    setOverallProgress(100);

    if (abortControllerRef.current) {
      uploadToast.info("Upload cancelled", "Batch upload was interrupted.");
    } else if (completedItems.length > 0 && failedCount === 0) {
      uploadToast.success(
        completedItems.length === 1
          ? `"${completedItems[0].title}" uploaded!`
          : `All ${completedItems.length} films & stills uploaded & ready!`,
        "Added to your portfolio showcase."
      );
      router.refresh();
      resetForm();
      onClose();
    } else if (completedItems.length > 0 && failedCount > 0) {
      uploadToast.error(
        `Uploaded ${completedItems.length} of ${totalFiles} items (${failedCount} failed)`,
        lastError
      );
      router.refresh();
    } else if (failedCount > 0) {
      uploadToast.error("Upload failed", lastError);
      setErrorMessage(lastError);
    }

    uploadToastRef.current = null;
  };

  // Metrics
  const totalCount = queue.length;
  const completedCount = queue.filter((q) => q.status === "completed").length;
  const queuedCount = queue.filter(
    (q) => q.status === "queued" || q.status === "error"
  ).length;
  const videoCount = queue.filter((q) => q.assetType === "video").length;
  const stillCount = queue.filter((q) => q.assetType === "photo_gallery").length;
  const isSingleItem = totalCount === 1;

  return (
    <>
      <UniversalDialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
        size="2xl"
        title="UPLOAD FILM OR STILL"
        description="Add standalone films or high-res stills to your public portfolio. Supports batch multi-file uploads with background processing."
        showCloseButton={true}
        bodyClassName="space-y-5"
      >
        {/* Background continuation alert while uploading */}
        {uploading && (
          <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/30 text-primary text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin shrink-0" />
              <span>
                <strong>Upload running in background.</strong> You can safely close this modal; progress will continue in the notification.
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="text-[11px] h-7 px-2.5 rounded-lg border-primary/30 text-primary hover:bg-primary/20 shrink-0 cursor-pointer"
            >
              Minimize / Close
            </Button>
          </div>
        )}

        {/* Plan Limit Warning */}
        {isAtLimit && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 text-amber-400 shrink-0" />
              <span>
                Portfolio film limit reached ({limit} allowed on Starter plan).
              </span>
            </div>
            {workspaceSlug && (
              <Link
                href={`/${workspaceSlug}/subscription`}
                className="text-amber-400 hover:text-amber-300 font-semibold underline flex items-center gap-1 shrink-0 text-[11px]"
              >
                <Sparkles className="size-3" />
                Upgrade
              </Link>
            )}
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="size-4 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Hidden Multi-file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,image/*,.mp4,.mov,.mkv,.m4v,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => addFilesToQueue(e.target.files)}
          disabled={uploading}
        />

        {/* 1. EMPTY DROPZONE */}
        {totalCount === 0 && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-10 sm:p-14 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-4 ${
              dragActive
                ? "border-primary bg-primary/10 scale-[1.01]"
                : "border-white/15 bg-white/[0.02] hover:border-primary/50 hover:bg-white/[0.04]"
            }`}
          >
            <div className="size-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary shadow-inner">
              <Upload className="size-7" />
            </div>

            <div className="space-y-1.5 max-w-sm">
              <div className="text-sm font-bold text-white">
                Drop your films & photo stills here, or click to browse
              </div>
              <TypographyMuted className="text-xs text-zinc-400 leading-relaxed">
                Select single or multiple files at once. Supports MP4, MOV, ProRes, PNG, JPG, WEBP up to 5GB each.
              </TypographyMuted>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 text-xs font-semibold cursor-pointer"
            >
              <Plus className="size-3.5 mr-1.5 text-primary" /> Select Multiple Files
            </Button>
          </div>
        )}

        {/* 2. SINGLE ITEM VIEW (Allows Title, Description, and Custom Thumbnail Crop) */}
        {isSingleItem && (
          <div className="space-y-4 animate-in fade-in">
            {/* Attachment Card */}
            {(() => {
              const item = queue[0];
              const isImage = item.assetType === "photo_gallery";

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 bg-black/40 border border-white/10 rounded-2xl p-3 sm:p-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="size-12 rounded-xl bg-black/60 border border-white/10 overflow-hidden relative shrink-0 flex items-center justify-center text-muted-foreground">
                        {item.previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.previewUrl}
                            alt="Preview"
                            className="size-full object-cover"
                          />
                        ) : (
                          <Film className="size-5 text-primary" />
                        )}
                        <div className="absolute bottom-1 right-1 bg-black/80 rounded px-1 py-0.5 text-[8px] font-mono text-white/80 uppercase">
                          {isImage ? "STILL" : "CUT"}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">
                          {item.file.name}
                        </div>
                        <TypographyMuted className="text-[11px] font-mono text-zinc-400">
                          {formatBytes(item.file.size)} · Ready to upload
                        </TypographyMuted>
                      </div>
                    </div>

                    {!uploading && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs text-zinc-400 hover:text-white h-8"
                        >
                          <Plus className="size-3.5 mr-1 text-primary" /> Add More (Batch)
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeItem(item.id)}
                          className="size-7 rounded-lg text-zinc-400 hover:text-destructive"
                          title="Remove file"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Title Field */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block font-mono">
                      TITLE
                    </Label>
                    <Input
                      type="text"
                      placeholder="e.g. Dubai Nights"
                      value={item.title}
                      onChange={(e) => updateItemTitle(item.id, e.target.value)}
                      disabled={uploading}
                      className="bg-[#0c0c0e]/80 border-white/10 text-xs text-white placeholder:text-zinc-600 focus-visible:border-primary"
                      required
                    />
                  </div>

                  {/* Description Field */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block font-mono">
                      DESCRIPTION <span className="normal-case text-zinc-500">(optional)</span>
                    </Label>
                    <textarea
                      rows={2}
                      placeholder="A short line about this piece — the brief, the vibe, the client..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={uploading}
                      className="w-full bg-[#0c0c0e]/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary resize-none transition-all"
                    />
                  </div>

                  {/* Custom Thumbnail Section (Only needed for single video or custom preview) */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block font-mono">
                      THUMBNAIL <span className="normal-case text-zinc-500">(optional)</span>
                    </Label>

                    <div className="flex items-center gap-2.5">
                      <div className="w-16 h-11 rounded-xl bg-[#0c0c0e] border border-white/10 flex items-center justify-center text-zinc-500 overflow-hidden shrink-0">
                        {thumbnailPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbnailPreview}
                            alt="Thumbnail preview"
                            className="size-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="size-4 text-zinc-600" />
                        )}
                      </div>

                      <input
                        ref={thumbInputRef}
                        type="file"
                        accept="image/*,.png,.jpg,.jpeg,.webp"
                        className="hidden"
                        onChange={(e) => handleThumbnailSelect(e.target.files)}
                        disabled={uploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => thumbInputRef.current?.click()}
                        disabled={uploading}
                        className="flex-1 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border-white/15 text-white text-xs font-semibold py-2.5 px-3.5 h-auto flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="size-3.5 text-zinc-300" />
                        <span>{thumbnailPreview ? "CHANGE" : "UPLOAD THUMBNAIL"}</span>
                      </Button>
                      {thumbnailPreview && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              setThumbCropState({
                                isOpen: true,
                                imageSrc: thumbnailPreview,
                                fileName: thumbnailFile?.name || "film-thumbnail.jpg",
                              })
                            }
                            disabled={uploading}
                            className="rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border-white/15 text-white text-xs font-semibold py-2.5 px-3 h-auto flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Crop className="size-3.5 text-primary" />
                            <span>EDIT</span>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setThumbnailFile(null);
                              setThumbnailPreview(null);
                            }}
                            disabled={uploading}
                            className="rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/30 text-rose-300 text-xs font-semibold py-2.5 px-2.5 h-auto flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                            title="Remove custom thumbnail"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 3. MULTI-FILE BATCH QUEUE VIEW */}
        {totalCount > 1 && (
          <div className="space-y-4 animate-in fade-in">
            {/* Header stats & actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/40 border border-white/10 rounded-2xl p-3 sm:p-4">
              <div className="flex items-center gap-2.5 flex-wrap text-xs">
                <span className="font-bold text-white">
                  Queue: {totalCount} Files
                </span>
                <span className="text-zinc-500">·</span>
                {videoCount > 0 && (
                  <span className="flex items-center gap-1 text-primary font-mono text-[11px]">
                    <Film className="size-3.5" /> {videoCount} Video{videoCount > 1 ? "s" : ""}
                  </span>
                )}
                {stillCount > 0 && (
                  <span className="flex items-center gap-1 text-sky-400 font-mono text-[11px]">
                    <ImageIcon className="size-3.5" /> {stillCount} Still{stillCount > 1 ? "s" : ""}
                  </span>
                )}
                {completedCount > 0 && (
                  <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                    <CheckCircle2 className="size-3.5" /> {completedCount} Uploaded
                  </span>
                )}
              </div>

              {!uploading && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-zinc-300 hover:text-white h-8"
                  >
                    <Plus className="size-3.5 mr-1 text-primary" /> Add More
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearQueue}
                    className="text-xs text-zinc-400 hover:text-destructive h-8"
                  >
                    <Trash2 className="size-3.5 mr-1" /> Clear Queue
                  </Button>
                </div>
              )}
            </div>

            {/* Scrollable Items List */}
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {queue.map((item) => {
                const isImage = item.assetType === "photo_gallery";

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border transition-all p-3 space-y-2 ${
                      item.status === "uploading"
                        ? "bg-primary/5 border-primary/40 ring-1 ring-primary/30"
                        : item.status === "completed"
                        ? "bg-emerald-500/5 border-emerald-500/30"
                        : item.status === "error"
                        ? "bg-destructive/10 border-destructive/30"
                        : "bg-black/30 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Media Thumb & Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="size-11 rounded-xl bg-black/60 border border-white/10 overflow-hidden relative shrink-0 flex items-center justify-center text-zinc-400">
                          {item.previewUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.previewUrl}
                              alt="Preview"
                              className="size-full object-cover"
                            />
                          ) : (
                            <Film className="size-4 text-primary" />
                          )}
                          <div className="absolute bottom-0.5 right-0.5 bg-black/80 rounded px-1 py-0.2 text-[7px] font-mono text-white/80 uppercase">
                            {isImage ? "STILL" : "CUT"}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <input
                            type="text"
                            value={item.title}
                            disabled={uploading}
                            onChange={(e) => updateItemTitle(item.id, e.target.value)}
                            placeholder="Asset Title"
                            className="bg-transparent text-xs font-bold text-white border-b border-transparent hover:border-white/20 focus:border-primary focus:outline-none px-0.5 py-0.5 w-full max-w-sm truncate"
                          />
                          <TypographyMuted className="text-[10px] font-mono text-zinc-400">
                            {formatBytes(item.file.size)} · {item.file.name}
                          </TypographyMuted>
                        </div>
                      </div>

                      {/* Status Badges & Action */}
                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === "queued" && (
                          <span className="text-[10px] font-mono bg-white/10 text-zinc-300 px-2.5 py-1 rounded-full">
                            Queued
                          </span>
                        )}
                        {item.status === "uploading" && (
                          <span className="text-[10px] font-mono bg-primary/20 text-primary border border-primary/40 px-2.5 py-1 rounded-full flex items-center gap-1 font-bold">
                            <Loader2 className="size-3 animate-spin" /> {item.progress}%
                          </span>
                        )}
                        {item.status === "completed" && (
                          <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1 font-bold">
                            <CheckCircle2 className="size-3" /> Done
                          </span>
                        )}
                        {item.status === "error" && (
                          <span className="text-[10px] font-mono bg-destructive/20 text-destructive border border-destructive/40 px-2.5 py-1 rounded-full flex items-center gap-1 font-bold">
                            <AlertCircle className="size-3" /> Error
                          </span>
                        )}

                        {!uploading && item.status !== "uploading" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => removeItem(item.id)}
                            className="size-7 rounded-lg text-zinc-400 hover:text-destructive"
                            title="Remove item"
                          >
                            <X className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Active Upload Item Progress */}
                    {item.status === "uploading" && (
                      <div className="space-y-1 pt-1 animate-in fade-in">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-zinc-400 truncate max-w-[280px]">{item.statusText}</span>
                          <span className="font-bold text-primary">{item.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-150"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Global Progress Bar when uploading */}
        {uploading && (
          <div className="space-y-1.5 pt-2 border-t border-white/10 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400 flex items-center gap-1.5 truncate">
                <Loader2 className="size-3.5 animate-spin text-primary" />
                {statusText || "Processing upload..."}
              </span>
              <span className="font-bold text-primary">{overallProgress}%</span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-150"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Modal Action Buttons Footer */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/10">
            <TypographyMuted className="text-xs text-zinc-400">
              {completedCount === totalCount && totalCount > 0 ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="size-4" /> All {totalCount} items uploaded successfully!
                </span>
              ) : (
                <span>
                  {queuedCount} {queuedCount === 1 ? "file" : "files"} ready for upload
                </span>
              )}
            </TypographyMuted>

            <div className="flex items-center gap-2.5 justify-end">
              {uploading ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelActiveUpload}
                    className="rounded-xl text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    Cancel Uploads
                  </Button>
                  <Button
                    type="button"
                    onClick={handleClose}
                    className="rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 cursor-pointer"
                  >
                    Continue in Background
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={handleStartBatchUpload}
                  disabled={queuedCount === 0 || isAtLimit}
                  className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-extrabold px-6 py-2.5 h-auto shadow-lg shadow-primary/25 cursor-pointer uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="size-3.5 mr-1.5" />
                  {isAtLimit
                    ? "Plan Limit Reached"
                    : queuedCount === 1
                    ? "Upload Film / Still"
                    : `Upload All (${queuedCount} Files)`}
                </Button>
              )}
            </div>
          </div>
        )}
      </UniversalDialog>

      <ImageCropEditorDialog
        isOpen={thumbCropState.isOpen}
        onClose={() => setThumbCropState((prev) => ({ ...prev, isOpen: false }))}
        imageSrc={thumbCropState.imageSrc}
        title="EDIT & CROP FILM THUMBNAIL"
        subtitle="Frame, zoom, rotate, or fine-tune the custom thumbnail for this portfolio film."
        defaultAspectRatio="16:9"
        aspectRatioOptions={["16:9", "9:16", "1:1", "4:3"]}
        outputFileName={thumbCropState.fileName}
        onApply={handleApplyThumbnailCrop}
      />
    </>
  );
}
