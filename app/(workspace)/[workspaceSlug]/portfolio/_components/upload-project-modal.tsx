"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Upload,
  Plus,
  X,
  Image as ImageIcon,
  Film,
  AlertCircle,
  Loader2,
  Sparkles,
  Crop,
  Trash2,
  CheckCircle2,
  Layers,
  Info,
} from "lucide-react";
import { UniversalDialog } from "@/components/ui/universal-dialog";
import {
  createShowcaseProjectAction,
  attachAssetsToShowcaseProjectAction,
  updateShowcaseProjectCoverAction,
} from "@/app/actions/projects";
import { PortfolioItem, ProjectAsset } from "../portfolio-client";
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

export interface QueuedProjectMediaItem {
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

interface UploadProjectModalProps {
  workspaceId: string;
  portfolioId?: string;
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (item: PortfolioItem) => void;
  showFlash: (msg: string) => void;
  isAtLimit?: boolean;
  limit?: number;
  workspaceSlug?: string;
}

export function UploadProjectModal({
  workspaceId,
  portfolioId,
  isOpen,
  onClose,
  onProjectCreated,
  showFlash,
  isAtLimit = false,
  limit = 4,
  workspaceSlug,
}: UploadProjectModalProps) {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [category, setCategory] = useState("Commercial Project");
  const [description, setDescription] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverCropState, setCoverCropState] = useState<{
    isOpen: boolean;
    imageSrc: string | null;
    fileName: string;
  }>({
    isOpen: false,
    imageSrc: null,
    fileName: "project-cover.jpg",
  });

  const [queue, setQueue] = useState<QueuedProjectMediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const activeXhrRef = useRef<XMLHttpRequest | null>(null);
  const abortControllerRef = useRef<boolean>(false);
  const uploadToastRef = useRef<ReturnType<typeof createUploadProgressToast> | null>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      queue.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      if (coverPreview && coverPreview.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [queue, coverPreview]);

  const addFilesToQueue = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: QueuedProjectMediaItem[] = Array.from(files).map((file, idx) => {
      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? URL.createObjectURL(file) : null;
      const cleanTitle = file.name.replace(/\.[^/.]+$/, "");

      return {
        id: `pmedia_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
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
    setErrorMessage(null);
  };

  const handleCoverSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const objectUrl = URL.createObjectURL(file);
    setCoverCropState({
      isOpen: true,
      imageSrc: objectUrl,
      fileName: file.name,
    });
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const handleApplyCoverCrop = (result: ImageCropResult) => {
    setCoverFile(result.file);
    setCoverPreview(result.dataUrl);
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
    setProjectName("");
    setCategory("Commercial Project");
    setDescription("");
    setCoverFile(null);
    setCoverPreview(null);
    setUploading(false);
    setOverallProgress(0);
    setStatusText("");
    setErrorMessage(null);
  };

  /**
   * Close handler:
   * Clicking backdrop, ESC, or close button closes the modal.
   * If an upload is in progress, it CONTINUES IN THE BACKGROUND without aborting!
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
      uploadToastRef.current.info("Upload cancelled", "Project creation and upload was stopped.");
      uploadToastRef.current = null;
    }
    setUploading(false);
    setStatusText("Upload cancelled");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || uploading) return;

    setUploading(true);
    abortControllerRef.current = false;
    setErrorMessage(null);
    setOverallProgress(0);
    setStatusText("Creating showcase project in portfolio...");

    const cleanProjectName = projectName.trim();
    const queuedItems = queue.filter((q) => q.status === "queued" || q.status === "error");
    const totalFiles = queuedItems.length;

    const uploadToast = createUploadProgressToast(`portfolio-project-${Date.now()}`);
    uploadToastRef.current = uploadToast;

    uploadToast.start({
      title: `Creating portfolio project "${cleanProjectName}"...`,
      fileName: totalFiles > 0 ? queuedItems[0].file.name : cleanProjectName,
      fileSize: totalFiles > 0 ? formatBytes(queuedItems[0].file.size) : undefined,
      fileIndex: 1,
      totalFiles: Math.max(1, totalFiles),
      percentage: 0,
      statusText: "Creating showcase project container in database...",
    });

    try {
      // 1. Create Showcase Project ONLY in projects table (Portfolio scope, NOT deliveries table!)
      const projRes = await createShowcaseProjectAction(
        workspaceId,
        portfolioId || "",
        {
          title: cleanProjectName,
          clientName: category.trim() || "Commercial Project",
          description: description.trim() || undefined,
          category: category.trim() || "Commercial Project",
          coverAssetUrl: coverPreview || undefined,
        }
      );

      if (!projRes.success || !projRes.project) {
        throw new Error(projRes.error || "Failed to create showcase project.");
      }

      const createdProject = projRes.project;
      const uploadedAssetIds: string[] = [];
      const uploadedAssets: ProjectAsset[] = [];
      let primaryCoverUrl = coverPreview || "";

      // 2. Batch upload all queued media files sequentially
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

        const basePct = Math.round((i / Math.max(1, totalFiles)) * 90);
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
          statusText: "Initiating upload directly to storage...",
        });

        try {
          // Direct upload to Cloudflare / edge with projectId: "" (unassigned standalone asset)
          const result = await directUploadMediaFile({
            workspaceId,
            projectId: "", // Ensures delivery_id is null so it never attaches to client deliveries!
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

              const overall = Math.round(((i + percent / 100) / totalFiles) * 92);
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
                statusText: percent < 100 ? "Uploading media file..." : "Finalizing asset...",
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

          uploadedAssetIds.push(result.asset.id);

          const resolvedThumbUrl =
            result.assetVersion?.thumbnailUrl ||
            (isImage ? result.assetVersion?.rawFileUrl : "") ||
            "";

          const resolvedMediaUrl = isImage
            ? (result.assetVersion?.rawFileUrl || "")
            : (result.assetVersion?.rawFileUrl || result.assetVersion?.hlsManifestUrl || "");

          if (!primaryCoverUrl && resolvedThumbUrl) {
            primaryCoverUrl = resolvedThumbUrl;
          }

          uploadedAssets.push({
            id: result.asset.id,
            title: itemTitle,
            type: isImage ? "still" : "film",
            url: resolvedMediaUrl,
            thumbnailUrl: resolvedThumbUrl,
            aspectRatio: isImage ? "1:1" : "16:9",
            category: isImage ? "Photo Still" : "Film Cut",
          });

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
        } catch (itemErr: any) {
          const errText = itemErr.message || "Failed to upload asset.";
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    status: "error",
                    statusText: "Upload failed",
                    errorMessage: errText,
                  }
                : q
            )
          );
        } finally {
          activeXhrRef.current = null;
        }
      }

      if (abortControllerRef.current) {
        uploadToast.info("Upload cancelled", "Project upload was cancelled.");
        setUploading(false);
        return;
      }

      // 3. Attach all uploaded assets to the showcase project via project_assets junction table
      if (uploadedAssetIds.length > 0) {
        setStatusText("Linking assets to showcase project...");
        uploadToast.update({
          title: `Linking assets to "${cleanProjectName}"...`,
          percentage: 95,
          statusText: "Attaching files to portfolio project...",
        });
        await attachAssetsToShowcaseProjectAction(createdProject.id, uploadedAssetIds);
      }

      // 4. If a custom cropped cover image was selected, upload it
      if (coverFile) {
        try {
          setStatusText("Uploading project cover...");
          const coverResult = await directUploadMediaFile({
            workspaceId,
            projectId: "",
            file: coverFile,
            title: `${cleanProjectName} Cover`,
            assetType: "photo_gallery",
            onProgress: () => {},
          });

          const coverUrl =
            coverResult.assetVersion?.thumbnailUrl || coverResult.assetVersion?.rawFileUrl;
          if (coverUrl) {
            primaryCoverUrl = coverUrl;
            await updateShowcaseProjectCoverAction(createdProject.id, coverUrl);
          }
        } catch (coverErr) {
          console.warn("Cover image upload notice:", coverErr);
        }
      } else if (primaryCoverUrl) {
        // If no custom cover uploaded but assets have thumbnail, save it to project
        await updateShowcaseProjectCoverAction(createdProject.id, primaryCoverUrl);
      }

      setOverallProgress(100);
      uploadToast.success(
        `Project "${cleanProjectName}" created!`,
        uploadedAssets.length > 0
          ? `Uploaded ${uploadedAssets.length} of ${totalFiles} file(s) directly to portfolio.`
          : "Showcase project container created."
      );

      const newItem: PortfolioItem = {
        id: createdProject.id,
        title: cleanProjectName,
        category: createdProject.category || category.trim() || "Commercial Project",
        type: "project",
        assetCount: uploadedAssets.length,
        thumbnailUrl: primaryCoverUrl,
        description: description.trim() || undefined,
        projectAssets: uploadedAssets,
      };

      onProjectCreated(newItem);
      router.refresh();
      resetForm();
      onClose();
    } catch (err: any) {
      const msg = err.message || "An error occurred creating project.";
      setErrorMessage(msg);
      setUploading(false);
      uploadToast.error("Project creation failed", msg);
    } finally {
      uploadToastRef.current = null;
    }
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
    <>
      <UniversalDialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
        size="3xl"
        title="UPLOAD A PROJECT"
        description="Group films and photo stills from the same campaign or shoot into one showcase story on your portfolio. Supports multi-file batch upload."
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

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Project Details & Cover */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-black/30 border border-white/10 rounded-2xl p-4">
            {/* Left 2 Cols: Title, Category, Description */}
            <div className="md:col-span-2 space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block font-mono">
                  PROJECT NAME *
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Nike Football 2026 Campaign"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  disabled={uploading}
                  className="bg-[#0c0c0e]/80 border-white/10 text-xs text-white placeholder:text-zinc-600 focus-visible:border-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block font-mono">
                    CATEGORY / CLIENT
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g. Commercial Project"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={uploading}
                    className="bg-[#0c0c0e]/80 border-white/10 text-xs text-white placeholder:text-zinc-600 focus-visible:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block font-mono">
                    DESCRIPTION <span className="normal-case text-zinc-500">(optional)</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="A multi-asset showcase for..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={uploading}
                    className="bg-[#0c0c0e]/80 border-white/10 text-xs text-white placeholder:text-zinc-600 focus-visible:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Right 1 Col: Project Cover Thumbnail */}
            <div className="space-y-1.5 flex flex-col justify-between">
              <Label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block font-mono">
                COVER POSTER <span className="normal-case text-zinc-500">(optional)</span>
              </Label>

              <div className="flex items-center gap-2">
                <div className="w-20 h-14 rounded-xl bg-[#0c0c0e] border border-white/10 flex items-center justify-center text-zinc-500 overflow-hidden shrink-0">
                  {coverPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="size-5 text-zinc-600" />
                  )}
                </div>

                <div className="flex flex-col gap-1.5 flex-1">
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={(e) => handleCoverSelect(e.target.files)}
                    disabled={uploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploading}
                    className="rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border-white/15 text-white text-[11px] font-semibold py-1.5 px-2.5 h-auto flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="size-3 text-zinc-300" />
                    <span>{coverPreview ? "Change Cover" : "Upload Cover"}</span>
                  </Button>

                  {coverPreview && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCoverCropState({
                            isOpen: true,
                            imageSrc: coverPreview,
                            fileName: coverFile?.name || "project-cover.jpg",
                          })
                        }
                        disabled={uploading}
                        className="rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border-white/15 text-white text-[10px] font-semibold py-1 px-2 h-auto flex-1 cursor-pointer"
                      >
                        <Crop className="size-3 text-primary mr-1" />
                        Crop
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCoverFile(null);
                          setCoverPreview(null);
                        }}
                        disabled={uploading}
                        className="rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/30 text-rose-300 text-[10px] font-semibold py-1 px-2 h-auto cursor-pointer"
                        title="Remove cover"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Batch Asset Dropzone & Queue View */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block font-mono flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" />
                PROJECT ASSETS & MEDIA ({totalCount})
              </Label>
              <span className="text-[10px] font-mono text-zinc-500">
                Videos, Cut versions & High-res stills
              </span>
            </div>

            {/* Hidden multi-file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*,image/*,.mp4,.mov,.mkv,.m4v,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(e) => addFilesToQueue(e.target.files)}
              disabled={uploading}
            />

            {/* Dropzone */}
            {totalCount === 0 ? (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                  dragActive
                    ? "border-primary bg-primary/10 scale-[1.01]"
                    : "border-white/15 bg-white/[0.02] hover:border-primary/50 hover:bg-white/[0.04]"
                }`}
              >
                <div className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary shadow-inner">
                  <Upload className="size-6" />
                </div>

                <div className="space-y-1 max-w-sm">
                  <div className="text-sm font-bold text-white">
                    Drop project media here, or click to browse
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Select multiple videos and stills at once. Supports MP4, MOV, PNG, JPG, WEBP up to 5GB each.
                  </p>
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
            ) : (
              /* Queue View */
              <div className="space-y-3">
                {/* Batch Queue Header & Stats */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/40 border border-white/10 rounded-2xl p-3">
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

                {/* Queue Items List */}
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
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
                              <p className="text-[10px] font-mono text-zinc-400">
                                {formatBytes(item.file.size)} · {item.file.name}
                              </p>
                            </div>
                          </div>

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
          </div>

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/10">
            <p className="text-xs text-zinc-400">
              {completedCount === totalCount && totalCount > 0 ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="size-4" /> All {totalCount} items uploaded successfully!
                </span>
              ) : (
                <span>
                  {queuedCount} {queuedCount === 1 ? "asset" : "assets"} queued for this showcase project
                </span>
              )}
            </p>

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
                  type="submit"
                  disabled={!projectName.trim() || uploading || isAtLimit}
                  className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-extrabold px-6 py-2.5 h-auto shadow-lg shadow-primary/25 cursor-pointer uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="size-4 mr-1.5" />
                  {isAtLimit
                    ? "Plan Limit Reached"
                    : queuedCount > 0
                    ? `Create Project & Upload (${queuedCount} Files)`
                    : "Create Project Container"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </UniversalDialog>

      <ImageCropEditorDialog
        isOpen={coverCropState.isOpen}
        onClose={() => setCoverCropState((prev) => ({ ...prev, isOpen: false }))}
        imageSrc={coverCropState.imageSrc}
        title="EDIT & CROP PROJECT COVER"
        subtitle="Frame, zoom, rotate, or fine-tune the cover banner for this showcase project."
        defaultAspectRatio="16:9"
        aspectRatioOptions={["16:9", "9:16", "1:1", "4:3"]}
        outputFileName={coverCropState.fileName}
        onApply={handleApplyCoverCrop}
      />
    </>
  );
}
