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

      // Notify floating progress
      onProgressChange?.({
        fileName: item.file.name,
        fileSize: formatBytes(item.file.size),
        fileIndex: i + 1,
        totalFiles: queuedItems.length,
        percentage: 0,
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
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: "error",
                  statusText: "Upload failed",
                  errorMessage: err.message || "Failed to upload asset.",
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

    if (completedResults.length > 0) {
      onBatchComplete?.(completedResults);
    }
  };

  const cancelActiveUpload = () => {
    abortControllerRef.current = true;
    if (activeXhrRef.current) {
      activeXhrRef.current.abort();
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
          <div className="size-11 rounded-2xl bg-[#f5551d]/10 border border-[#f5551d]/30 text-[#f5551d] flex items-center justify-center shrink-0">
            <Layers className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-lg font-bold text-white tracking-tight">
                Media Asset Uploader
              </h3>
              <span className="text-[10px] font-mono uppercase bg-white/10 text-white/90 px-2 py-0.5 rounded-full">
                Cloudflare 4K HLS & Stills
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload standalone stills, high-res photos, or 4K video cuts with automatic versioning.
            </p>
          </div>
        </div>

        {/* Tab switcher & Close button */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setActiveTab("batch")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "batch"
                  ? "bg-[#f5551d] text-black shadow-md shadow-[#f5551d]/20"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Multi-File Batch
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("single")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "single"
                  ? "bg-[#f5551d] text-black shadow-md shadow-[#f5551d]/20"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Single Cut
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="size-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="size-4" />
            </button>
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
                  ? "border-[#f5551d] bg-[#f5551d]/5 scale-[1.01]"
                  : "border-white/15 hover:border-[#f5551d]/60 hover:bg-white/[0.02]"
              }`}
            >
              <div className="size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground group-hover:text-[#f5551d] transition-colors">
                <Upload className="size-8 text-[#f5551d]" />
              </div>

              <div className="space-y-1.5 max-w-md">
                <div className="text-base font-bold text-white">
                  Drop your videos & photo stills here, or click to browse
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Select as many files as you want at once. Supports 4K ProRes 422/4444, MP4, MOV, PNG, JPG, WEBP up to 5GB each.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 text-xs font-semibold"
                >
                  <Plus className="size-3.5 mr-1.5 text-[#f5551d]" /> Select Multiple Files
                </Button>
              </div>
            </div>
          ) : (
            /* Queue View */
            <div className="space-y-4">
              {/* Batch Queue Header & Stats */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/40 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-3 flex-wrap text-xs">
                  <span className="font-bold text-white">
                    Queue: {totalCount} {totalCount === 1 ? "File" : "Files"}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  {videoCount > 0 && (
                    <span className="flex items-center gap-1 text-[#ff8a45] font-mono text-[11px]">
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

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-muted-foreground hover:text-white h-8"
                  >
                    <Plus className="size-3.5 mr-1 text-[#f5551d]" /> Add More
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
                          ? "bg-[#f5551d]/5 border-[#f5551d]/40 ring-1 ring-[#f5551d]/30"
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
                              <Film className="size-5 text-[#f5551d]" />
                            )}
                            <div className="absolute bottom-1 right-1 bg-black/80 rounded px-1 py-0.2 text-[8px] font-mono text-white/80 uppercase">
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
                                className="bg-transparent text-xs font-bold text-white border-b border-transparent hover:border-white/20 focus:border-[#f5551d] focus:outline-none px-0.5 py-0.5 w-full max-w-sm truncate"
                              />
                            </div>
                            <p className="text-[11px] font-mono text-muted-foreground">
                              {formatBytes(item.file.size)} · {item.file.name}
                            </p>
                          </div>
                        </div>

                        {/* Version selector & Actions */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          {/* Version Target Selector */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground uppercase font-mono hidden md:inline">
                              Target:
                            </span>
                            <select
                              value={item.targetAssetId}
                              disabled={isProcessing && (item.status === "uploading" || item.status === "completed")}
                              onChange={(e) => updateItemTargetAsset(item.id, e.target.value)}
                              className="bg-black/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#f5551d] max-w-[190px] truncate cursor-pointer"
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
                            <span className="text-[10px] font-mono bg-white/10 text-white/80 px-2.5 py-1 rounded-full shrink-0">
                              Queued
                            </span>
                          )}
                          {item.status === "uploading" && (
                            <span className="text-[10px] font-mono bg-[#f5551d]/20 text-[#f5551d] border border-[#f5551d]/40 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                              <Loader2 className="size-3 animate-spin" /> {item.progress}%
                            </span>
                          )}
                          {item.status === "completed" && (
                            <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 font-bold">
                              <CheckCircle2 className="size-3" /> Done
                            </span>
                          )}
                          {item.status === "error" && (
                            <span className="text-[10px] font-mono bg-destructive/20 text-destructive border border-destructive/40 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 font-bold">
                              <AlertCircle className="size-3" /> Error
                            </span>
                          )}

                          {/* Remove button */}
                          {!isProcessing && item.status !== "uploading" && (
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="size-7 rounded-lg bg-white/5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive flex items-center justify-center cursor-pointer transition-colors"
                              title="Remove item"
                            >
                              <X className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Item Upload Progress Bar */}
                      {item.status === "uploading" && (
                        <div className="space-y-1.5 pt-1 animate-in fade-in">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-muted-foreground">{item.statusText}</span>
                            <span className="font-bold text-[#f5551d]">{item.progress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#f5551d] to-[#ff8a45] rounded-full transition-all duration-150"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Error text */}
                      {item.status === "error" && item.errorMessage && (
                        <p className="text-[11px] text-destructive font-mono pt-1">
                          {item.errorMessage}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Batch Actions Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-white/10">
                <p className="text-xs text-muted-foreground">
                  {completedCount === totalCount && totalCount > 0 ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="size-4" /> All {totalCount} assets uploaded successfully!
                    </span>
                  ) : (
                    <span>
                      {queuedCount} {queuedCount === 1 ? "asset" : "assets"} ready to upload directly to Cloudflare
                    </span>
                  )}
                </p>

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
                      className="rounded-full bg-[#f5551d] text-black font-bold text-xs hover:bg-[#ff8a45] shadow-lg shadow-[#f5551d]/20 cursor-pointer disabled:opacity-50"
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
