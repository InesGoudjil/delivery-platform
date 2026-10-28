"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Film,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Trash2,
  Loader2,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TypographyH3, TypographyMuted, TypographySpan } from "@/components/ui/typography";
import { createUploadProgressToast } from "@/lib/upload-toast";
import {
  VideoUploader,
  directUploadMediaFile,
  formatBytes,
} from "./video-uploader";

export interface ExistingAssetOption {
  id: string;
  title: string;
  type?: string;
  versionCount?: number;
}

export interface QueuedUploadItem {
  id: string;
  file: File;
  previewUrl: string | null;
  assetType: "video" | "photo_gallery";
  title: string;
  targetAssetId: string; // "" = New Asset (V1), or existing asset id
  status: "queued" | "uploading" | "completed" | "error";
  progress: number;
  statusText: string;
  errorMessage: string | null;
  uploadedAsset?: any;
  uploadedVersion?: any;
}

export interface AssetMultiUploaderProps {
  workspaceId: string;
  projectId: string;
  existingAssets?: ExistingAssetOption[];
  onUploadComplete?: (asset: any, version?: any) => void;
  onBatchComplete?: (results: Array<{ asset: any; version?: any }>) => void;
  onProgressChange?: (
    progress: {
      fileName: string;
      fileSize: string;
      fileIndex: number;
      totalFiles: number;
      percentage: number;
    } | null
  ) => void;
  onClose?: () => void;
}

export function AssetMultiUploader({
  workspaceId,
  projectId,
  existingAssets = [],
  onUploadComplete,
  onBatchComplete,
  onProgressChange,
  onClose,
}: AssetMultiUploaderProps) {
  const [activeTab, setActiveTab] = useState<"batch" | "single">("batch");
  const [dragActive, setDragActive] = useState(false);
  const [queue, setQueue] = useState<QueuedUploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeXhrRef = useRef<XMLHttpRequest | null>(null);
  const abortControllerRef = useRef<boolean>(false);
  const batchToastRef = useRef<ReturnType<typeof createUploadProgressToast> | null>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      queue.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, [queue]);

  const addFilesToQueue = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const newItems: QueuedUploadItem[] = Array.from(fileList).map((file, idx) => {
      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? URL.createObjectURL(file) : null;
      const cleanTitle = file.name.replace(/\.[^/.]+$/, "");

      return {
        id: `file_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        file,
        previewUrl,
        assetType: isImage ? "photo_gallery" : "video",
        title: cleanTitle,
        targetAssetId: "", // Default to creating a new asset V1
        status: "queued",
        progress: 0,
        statusText: "Ready in queue",
        errorMessage: null,
      };
    });

    setQueue((prev) => [...prev, ...newItems]);
    setGlobalError(null);
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

  const removeItem = (id: string) => {
    setQueue((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const updateItemTitle = (id: string, title: string) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title } : item))
    );
  };

  const updateItemTargetAsset = (id: string, targetAssetId: string) => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        let updatedTitle = item.title;
        if (targetAssetId) {
          const match = existingAssets.find((a) => a.id === targetAssetId);
          if (match) updatedTitle = match.title;
        }
        return {
          ...item,
          targetAssetId,
          title: updatedTitle,
        };
      })
    );
  };

  const clearQueue = () => {
    queue.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setQueue([]);
    setGlobalError(null);
  };

  // Start processing queued files sequentially
  const startBatchUpload = async () => {
    if (isProcessing) return;

    const queuedItems = queue.filter(
      (item) => item.status === "queued" || item.status === "error"
    );
    if (queuedItems.length === 0) return;

    setIsProcessing(true);
    abortControllerRef.current = false;
    setGlobalError(null);

    const completedResults: Array<{ asset: any; version?: any }> = [];
    let failedCount = 0;
    let lastErrorMessage = "";

    const batchToast = createUploadProgressToast();
    batchToastRef.current = batchToast;
    batchToast.start({
      title:
        queuedItems.length > 1
          ? `Uploading ${queuedItems.length} deliverables...`
          : `Uploading "${queuedItems[0].title || queuedItems[0].file.name}"`,
      fileName: queuedItems[0].file.name,
      fileSize: formatBytes(queuedItems[0].file.size),
      fileIndex: 1,
      totalFiles: queuedItems.length,
      percentage: 0,
      statusText: "Initiating upload...",
    });

    for (let i = 0; i < queuedItems.length; i++) {
      if (abortControllerRef.current) break;

      const item = queuedItems[i];

      // Mark current item uploading
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, status: "uploading", progress: 0, statusText: "Initiating upload..." }
            : q
        )
      );

      // Notify floating progress & Sonner toast
      onProgressChange?.({
        fileName: item.file.name,
        fileSize: formatBytes(item.file.size),
        fileIndex: i + 1,
        totalFiles: queuedItems.length,
        percentage: 0,
      });

      batchToast.update({
        title:
          queuedItems.length > 1
            ? `Uploading (${i + 1}/${queuedItems.length}): ${item.title || item.file.name}`
            : `Uploading "${item.title || item.file.name}"`,
        fileName: item.file.name,
        fileSize: formatBytes(item.file.size),
        fileIndex: i + 1,
        totalFiles: queuedItems.length,
        percentage: 0,
        statusText: "Initiating upload...",
      });

      try {
        const result = await directUploadMediaFile({
          workspaceId,
          projectId,
          file: item.file,
          title: item.title,
          assetType: item.assetType,
          assetId: item.targetAssetId || undefined,
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

            onProgressChange?.({
              fileName: item.file.name,
              fileSize: formatBytes(item.file.size),
              fileIndex: i + 1,
              totalFiles: queuedItems.length,
              percentage: percent,
            });

            batchToast.update({
              title:
                queuedItems.length > 1
                  ? `Uploading (${i + 1}/${queuedItems.length}): ${item.title || item.file.name}`
                  : `Uploading "${item.title || item.file.name}"`,
              fileName: item.file.name,
              loadedBytes: loaded,
              totalBytes: total,
              fileIndex: i + 1,
              totalFiles: queuedItems.length,
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

        // Mark completed
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

        completedResults.push(result);
        onUploadComplete?.(result.asset, result.assetVersion);
      } catch (err: any) {
        failedCount++;
        lastErrorMessage = err.message || "Failed to upload asset.";
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: "error",
                  statusText: "Upload failed",
                  errorMessage: lastErrorMessage,
                }
              : q
          )
        );
      } finally {
        activeXhrRef.current = null;
      }
    }

    setIsProcessing(false);
    onProgressChange?.(null);

    if (abortControllerRef.current) {
      batchToast.info("Batch upload cancelled");
    } else if (completedResults.length > 0 && failedCount === 0) {
      batchToast.success(
        completedResults.length === 1
          ? `"${completedResults[0].asset?.title || queuedItems[0].title}" uploaded!`
          : `All ${completedResults.length} assets uploaded & ready!`
      );
      onBatchComplete?.(completedResults);
    } else if (completedResults.length > 0 && failedCount > 0) {
      batchToast.error(
        `Uploaded ${completedResults.length} of ${queuedItems.length} files (${failedCount} failed)`,
        lastErrorMessage
      );
      onBatchComplete?.(completedResults);
    } else if (failedCount > 0) {
      batchToast.error("Upload failed", lastErrorMessage);
    }

    batchToastRef.current = null;
  };

  const cancelActiveUpload = () => {
    abortControllerRef.current = true;
    if (activeXhrRef.current) {
      activeXhrRef.current.abort();
    } else if (batchToastRef.current) {
      batchToastRef.current.info("Batch upload cancelled");
      batchToastRef.current = null;
    }
    setIsProcessing(false);
    onProgressChange?.(null);
  };

  // Metrics
  const totalCount = queue.length;
  const completedCount = queue.filter((q) => q.status === "completed").length;
  const queuedCount = queue.filter(
    (q) => q.status === "queued" || q.status === "error"
  ).length;
  const videoCount = queue.filter((q) => q.assetType === "video").length;
  const stillCount = queue.filter((q) => q.assetType === "photo_gallery").length;

  return (
    <div className="w-full rounded-3xl bg-[#121215] border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in duration-200">
      {/* Header with Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-primary/10 border border-primary/30 text-primary flex items-center justify-center shrink-0">
            <Layers className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <TypographyH3 className="font-heading text-lg font-bold text-white tracking-tight">
                Media Asset Uploader
              </TypographyH3>
              <TypographySpan className="text-[10px]  uppercase bg-white/10 text-white/90 px-2 py-0.5 rounded-full">
                Video Cuts &amp; Stills
              </TypographySpan>
            </div>
            <TypographyMuted className="text-xs text-muted-foreground">
              Upload standalone stills, high-res photos, or video cuts with automatic versioning.
            </TypographyMuted>
          </div>
        </div>

        {/* Tab switcher & Close button */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1">
            <Button
              type="button"
              variant={activeTab === "batch" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("batch")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer h-auto ${
                activeTab === "batch"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
                  : "text-muted-foreground hover:text-white hover:bg-transparent"
              }`}
            >
              Multi-File Batch
            </Button>
            <Button
              type="button"
              variant={activeTab === "single" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("single")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer h-auto ${
                activeTab === "single"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
                  : "text-muted-foreground hover:text-white hover:bg-transparent"
              }`}
            >
              Single Cut
            </Button>
          </div>

          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onClose}
              className="size-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* SINGLE CUT TAB: Embeds enhanced VideoUploader */}
      {activeTab === "single" && (
        <div className="animate-in fade-in duration-200">
          <VideoUploader
            workspaceId={workspaceId}
            projectId={projectId}
            existingAssets={existingAssets}
            onUploadComplete={(asset, version) => {
              onUploadComplete?.(asset, version);
            }}
          />
        </div>
      )}

      {/* MULTI-FILE BATCH TAB */}
      {activeTab === "batch" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Global Alert */}
          {globalError && (
            <div className="p-4 rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-semibold flex items-start gap-2.5">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div className="flex-1">{globalError}</div>
            </div>
          )}

          {/* Hidden multi-file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*,image/*,.mov,.mp4,.mkv,.m4v,.png,.jpg,.jpeg,.webp,.avif"
            className="hidden"
            onChange={(e) => addFilesToQueue(e.target.files)}
          />

          {/* Empty State Dropzone */}
          {queue.length === 0 ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-10 sm:p-14 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-4 ${
                dragActive
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-white/15 hover:border-primary/60 hover:bg-white/[0.02]"
              }`}
            >
              <div className="size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                <Upload className="size-8 text-primary" />
              </div>

              <div className="space-y-1.5 max-w-md">
                <div className="text-base font-bold text-white">
                  Drop your videos &amp; photo stills here, or click to browse
                </div>
                <TypographyMuted className="text-xs text-muted-foreground leading-relaxed">
                  Select as many files as you want at once. Supports ProRes 422/4444, MP4, MOV, PNG, JPG, WEBP up to 5GB each.
                </TypographyMuted>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 text-xs font-semibold"
                >
                  <Plus className="size-3.5 mr-1.5 text-primary" /> Select Multiple Files
                </Button>
              </div>
            </div>
          ) : (
            /* Queue View */
            <div className="space-y-4">
              {/* Batch Queue Header & Stats */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/40 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-3 flex-wrap text-xs">
                  <TypographySpan className="font-bold text-white">
                    Queue: {totalCount} {totalCount === 1 ? "File" : "Files"}
                  </TypographySpan>
                  <TypographySpan className="text-muted-foreground">·</TypographySpan>
                  {videoCount > 0 && (
                    <TypographySpan className="flex items-center gap-1 text-primary  text-[11px]">
                      <Film className="size-3.5" /> {videoCount} Video{videoCount > 1 ? "s" : ""}
                    </TypographySpan>
                  )}
                  {stillCount > 0 && (
                    <TypographySpan className="flex items-center gap-1 text-sky-400  text-[11px]">
                      <ImageIcon className="size-3.5" /> {stillCount} Still{stillCount > 1 ? "s" : ""}
                    </TypographySpan>
                  )}
                  {completedCount > 0 && (
                    <TypographySpan className="flex items-center gap-1 text-emerald-400  text-[11px]">
                      <CheckCircle2 className="size-3.5" /> {completedCount} Uploaded
                    </TypographySpan>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-muted-foreground hover:text-white h-8"
                  >
                    <Plus className="size-3.5 mr-1 text-primary" /> Add More
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isProcessing}
                    onClick={clearQueue}
                    className="text-xs text-muted-foreground hover:text-destructive h-8"
                  >
                    <Trash2 className="size-3.5 mr-1" /> Clear Queue
                  </Button>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {queue.map((item) => {
                  const isImage = item.assetType === "photo_gallery";

                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border transition-all p-3.5 sm:p-4 space-y-3 ${
                        item.status === "uploading"
                          ? "bg-primary/5 border-primary/40 ring-1 ring-primary/30"
                          : item.status === "completed"
                          ? "bg-emerald-500/5 border-emerald-500/30"
                          : item.status === "error"
                          ? "bg-destructive/10 border-destructive/30"
                          : "bg-black/30 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Media Thumbnail & Meta */}
                        <div className="flex items-center gap-3 min-w-0 sm:flex-1">
                          <div className="size-12 rounded-xl bg-black/60 border border-white/10 overflow-hidden relative shrink-0 flex items-center justify-center text-muted-foreground">
                            {item.previewUrl ? (
                              <img
                                src={item.previewUrl}
                                alt="Preview"
                                className="size-full object-cover"
                              />
                            ) : (
                              <Film className="size-5 text-primary" />
                            )}
                            <div className="absolute bottom-1 right-1 bg-black/80 rounded px-1 py-0.2 text-[8px]  text-white/80 uppercase">
                              {isImage ? "STILL" : "CUT"}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={item.title}
                                disabled={isProcessing && item.status === "uploading"}
                                onChange={(e) => updateItemTitle(item.id, e.target.value)}
                                placeholder="Asset Title"
                                className="bg-transparent text-xs font-bold text-white border-b border-transparent hover:border-white/20 focus:border-primary focus:outline-none px-0.5 py-0.5 w-full max-w-sm truncate"
                              />
                            </div>
                            <TypographyMuted className="text-[11px]  text-muted-foreground">
                              {formatBytes(item.file.size)} · {item.file.name}
                            </TypographyMuted>
                          </div>
                        </div>

                        {/* Version selector & Actions */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          {/* Version Target Selector */}
                          <div className="flex items-center gap-1.5">
                            <TypographySpan className="text-[10px] text-muted-foreground uppercase  hidden md:inline">
                              Target:
                            </TypographySpan>
                            <select
                              value={item.targetAssetId}
                              disabled={isProcessing && (item.status === "uploading" || item.status === "completed")}
                              onChange={(e) => updateItemTargetAsset(item.id, e.target.value)}
                              className="bg-black/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary max-w-[190px] truncate cursor-pointer"
                            >
                              <option value="">New Asset (V1)</option>
                              {existingAssets.map((a) => (
                                <option key={a.id} value={a.id}>
                                  Add as new version to: {a.title}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Status Badge */}
                          {item.status === "queued" && (
                            <TypographySpan className="text-[10px]  bg-white/10 text-white/80 px-2.5 py-1 rounded-full shrink-0">
                              Queued
                            </TypographySpan>
                          )}
                          {item.status === "uploading" && (
                            <TypographySpan className="text-[10px]  bg-primary/20 text-primary border border-primary/40 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                              <Loader2 className="size-3 animate-spin" /> {item.progress}%
                            </TypographySpan>
                          )}
                          {item.status === "completed" && (
                            <TypographySpan className="text-[10px]  bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 font-bold">
                              <CheckCircle2 className="size-3" /> Done
                            </TypographySpan>
                          )}
                          {item.status === "error" && (
                            <TypographySpan className="text-[10px]  bg-destructive/20 text-destructive border border-destructive/40 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 font-bold">
                              <AlertCircle className="size-3" /> Error
                            </TypographySpan>
                          )}

                          {/* Remove button */}
                          {!isProcessing && item.status !== "uploading" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => removeItem(item.id)}
                              className="size-7 rounded-lg bg-white/5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive flex items-center justify-center cursor-pointer transition-colors p-0"
                              title="Remove item"
                            >
                              <X className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Item Upload Progress Bar */}
                      {item.status === "uploading" && (
                        <div className="space-y-1.5 pt-1 animate-in fade-in">
                          <div className="flex items-center justify-between text-[11px] ">
                            <TypographySpan className="text-muted-foreground">{item.statusText}</TypographySpan>
                            <TypographySpan className="font-bold text-primary">{item.progress}%</TypographySpan>
                          </div>
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-150"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Error text */}
                      {item.status === "error" && item.errorMessage && (
                        <TypographyMuted className="text-[11px] text-destructive  pt-1">
                          {item.errorMessage}
                        </TypographyMuted>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Batch Actions Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-white/10">
                <TypographyMuted className="text-xs text-muted-foreground">
                  {completedCount === totalCount && totalCount > 0 ? (
                    <TypographySpan className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="size-4" /> All {totalCount} assets uploaded successfully!
                    </TypographySpan>
                  ) : (
                    <TypographySpan>
                      {queuedCount} {queuedCount === 1 ? "asset" : "assets"} ready for direct upload
                    </TypographySpan>
                  )}
                </TypographyMuted>

                <div className="flex items-center gap-3 justify-end">
                  {isProcessing ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={cancelActiveUpload}
                      className="rounded-full text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      Cancel Uploads
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={startBatchUpload}
                      disabled={queuedCount === 0}
                      className="rounded-full bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="size-3.5 mr-1.5" />
                      {queuedCount === 0 ? "All Files Uploaded" : `Upload All (${queuedCount} Files)`}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
