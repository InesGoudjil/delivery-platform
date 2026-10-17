"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { UniversalDialog } from "@/components/ui/universal-dialog";
import { createWorkspaceProjectAction } from "@/app/actions/projects";
import {
  requestAssetUploadAction,
  confirmUploadCompletedAction,
} from "@/app/actions/upload";
import { updateAssetAction } from "@/app/actions/assets";
import { PortfolioItem, ProjectAsset } from "../portfolio-client";
import { createUploadProgressToast } from "@/lib/upload-toast";
import {
  ImageCropEditorDialog,
  ImageCropResult,
} from "@/components/ui/image-crop-editor-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Attachment,
  AttachmentGroup,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentActions,
  AttachmentAction,
} from "@/components/ui/attachment";

interface UploadProjectModalProps {
  workspaceId: string;
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
  isOpen,
  onClose,
  onProjectCreated,
  showFlash,
  isAtLimit = false,
  limit = 4,
  workspaceSlug,
}: UploadProjectModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [projectName, setProjectName] = useState("");
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

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setErrorMessage(null);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
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
    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }
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
      handleFiles(e.dataTransfer.files);
    }
  };

  const resetForm = () => {
    setSelectedFiles([]);
    setProjectName("");
    setDescription("");
    setCoverFile(null);
    setCoverPreview(null);
    setUploading(false);
    setProgress(0);
    setStatusText("");
    setErrorMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || uploading) return;

    setUploading(true);
    setErrorMessage(null);
    setProgress(0);
    setStatusText("Creating project container...");

    const uploadToast = createUploadProgressToast(`portfolio-project-${Date.now()}`);
    uploadToast.start(
      `Creating project "${projectName.trim()}"...`,
      selectedFiles.length > 0
        ? `Preparing ${selectedFiles.length} file(s) for upload...`
        : "Initializing project container..."
    );

    try {
      // 1. Create Project Container
      const projRes = await createWorkspaceProjectAction(
        workspaceId,
        projectName.trim(),
        description.trim() || undefined
      );

      if (!projRes.success || !projRes.project) {
        throw new Error(projRes.error || "Failed to create project.");
      }

      const createdProject = projRes.project;
      let primaryThumbnailUrl = coverPreview || "";
      const uploadedAssets: ProjectAsset[] = [];

      // 2. Upload Selected Files sequentially
      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const isImage = file.type.startsWith("image/");
          const assetType = isImage ? "photo_gallery" : "video";
          const filePercentBase = Math.round((i / selectedFiles.length) * 100);

          setStatusText(`Uploading ${i + 1}/${selectedFiles.length}: ${file.name}`);
          setProgress(filePercentBase);
          uploadToast.update({
            title: `Uploading "${file.name}"`,
            progress: filePercentBase,
            loadedBytes: 0,
            totalBytes: file.size,
            fileIndex: i + 1,
            totalFiles: selectedFiles.length,
          });

          try {
            const initRes = await requestAssetUploadAction({
              workspaceId,
              projectId: createdProject.id,
              title: file.name.replace(/\.[^/.]+$/, ""),
              filename: file.name,
              fileSizeBytes: file.size,
              assetType,
              category: isImage ? "still" : "film",
            });

            if (initRes.success && initRes.directUpload) {
              const { uploadUrl, providerUid, uploadType, headers } = initRes.directUpload;

              await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.upload.onprogress = (event) => {
                  if (event.lengthComputable) {
                    const fileFraction = event.loaded / event.total;
                    const overallPct = Math.round(
                      ((i + fileFraction) / selectedFiles.length) * 95
                    );
                    setProgress(overallPct);
                    uploadToast.update({
                      title: `Uploading "${file.name}"`,
                      progress: Math.round(fileFraction * 100),
                      loadedBytes: event.loaded,
                      totalBytes: event.total,
                      fileIndex: i + 1,
                      totalFiles: selectedFiles.length,
                    });
                  }
                };
                xhr.onload = () => {
                  if (xhr.status >= 200 && xhr.status < 300) resolve();
                  else reject(new Error("File upload failed"));
                };
                xhr.onerror = () => reject(new Error("Network error"));

                if (uploadType === "presigned_put") {
                  xhr.open("PUT", uploadUrl, true);
                  if (headers) {
                    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
                  }
                  xhr.send(file);
                } else {
                  xhr.open("POST", uploadUrl, true);
                  const formData = new FormData();
                  formData.append("file", file);
                  xhr.send(formData);
                }
              });

              const confirmRes = await confirmUploadCompletedAction({
                assetVersionId: initRes.assetVersion.id,
                providerUid,
                fileSizeBytes: file.size,
              });

              const localBlobUrl = isImage ? URL.createObjectURL(file) : "";
              const assetMediaUrl =
                (isImage && localBlobUrl) ||
                confirmRes.assetVersion?.rawFileUrl ||
                confirmRes.assetVersion?.hlsManifestUrl ||
                confirmRes.assetVersion?.thumbnailUrl ||
                "";
              const assetThumbUrl =
                (isImage && localBlobUrl) ||
                confirmRes.assetVersion?.thumbnailUrl ||
                assetMediaUrl;

              uploadedAssets.push({
                id: initRes.asset.id,
                title: file.name.replace(/\.[^/.]+$/, ""),
                type: isImage ? "still" : "film",
                url: assetMediaUrl,
                thumbnailUrl: assetThumbUrl,
                aspectRatio: isImage ? "1:1" : "16:9",
                category: isImage ? "Photo Still" : "Film Cut",
              });

              if (!primaryThumbnailUrl && confirmRes.assetVersion?.thumbnailUrl) {
                primaryThumbnailUrl = confirmRes.assetVersion.thumbnailUrl;
              }
            }
          } catch (err) {
            console.error("Asset upload step error:", err);
          }
        }
      }

      // 3. Persist custom cropped cover or primary thumbnail to project record in database
      if (primaryThumbnailUrl) {
        setStatusText("Saving project cover thumbnail...");
        uploadToast.update({
          title: `Saving cover for "${createdProject.title}"`,
          progress: 98,
          subtitle: "Persisting project cover thumbnail...",
        });
        await updateAssetAction(
          createdProject.id,
          { thumbnailUrl: primaryThumbnailUrl },
          { isProject: true, workspaceSlug }
        );
      }

      setProgress(100);
      uploadToast.success(
        `Project "${createdProject.title}" created!`,
        selectedFiles.length > 0
          ? `Uploaded ${uploadedAssets.length} of ${selectedFiles.length} file(s) to portfolio.`
          : "Project container created."
      );

      const newItem: PortfolioItem = {
        id: createdProject.id,
        title: createdProject.title,
        category: "Commercial Project",
        type: "project",
        assetCount: selectedFiles.length || 0,
        thumbnailUrl: primaryThumbnailUrl,
        description: description.trim() || undefined,
        projectAssets: uploadedAssets,
      };

      onProjectCreated(newItem);
      handleClose();
    } catch (err: any) {
      const msg = err.message || "An error occurred creating project.";
      setErrorMessage(msg);
      setUploading(false);
      uploadToast.error("Project creation failed", msg);
    }
  };

  return (
    <>
      <UniversalDialog
        open={isOpen}
        onOpenChange={(open) => !uploading && !open && handleClose()}
        size="lg"
        title="UPLOAD A PROJECT"
        description="Group photos and videos from the same shoot into one project. Clients and visitors open it as a single story."
        showCloseButton={!uploading}
        bodyClassName="space-y-5"
      >
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dropzone Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
              dragActive
                ? "border-primary bg-primary/10 scale-[1.01]"
                : "border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*,image/*,.mp4,.mov,.mkv,.m4v,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
              disabled={uploading}
            />

            <div className="size-10 rounded-full flex items-center justify-center text-primary">
              <Upload className="size-5" />
            </div>

            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-zinc-200">
                Drop multiple files here or click to browse
              </div>
              <div className="text-[11px] text-zinc-500">
                Videos &amp; photos · up to 5 GB each
              </div>
            </div>
          </div>

          {/* Selected File Attachments */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2 pt-0.5">
              <AttachmentGroup className="py-1">
                {selectedFiles.map((file, idx) => {
                  const isImg = file.type.startsWith("image/");
                  return (
                    <Attachment
                      key={`${file.name}-${idx}`}
                      size="sm"
                      state={uploading ? "uploading" : "done"}
                      className="bg-white/[0.04] border-white/15"
                    >
                      <AttachmentMedia variant={isImg ? "image" : "icon"}>
                        {isImg ? (
                          <ImageIcon className="size-3.5" />
                        ) : (
                          <Film className="size-3.5 text-primary" />
                        )}
                      </AttachmentMedia>
                      <AttachmentContent>
                        <AttachmentTitle className="text-zinc-200">{file.name}</AttachmentTitle>
                        <AttachmentDescription className="text-zinc-400">
                          {(file.size / (1024 * 1024)).toFixed(1)} MB
                        </AttachmentDescription>
                      </AttachmentContent>
                      {!uploading && (
                        <AttachmentActions>
                          <AttachmentAction
                            variant="ghost"
                            size="icon-xs"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(idx);
                            }}
                            title="Remove file"
                          >
                            <X className="size-3 text-zinc-400 hover:text-white" />
                          </AttachmentAction>
                        </AttachmentActions>
                      )}
                    </Attachment>
                  );
                })}
              </AttachmentGroup>

              {!uploading && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-3 py-1 h-auto rounded-full text-xs font-medium border-white/15 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
                >
                  <Plus className="size-3 text-primary" />
                  <span>Add more files</span>
                </Button>
              )}
            </div>
          )}

          {/* Project Name Field */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block font-mono">
              PROJECT NAME
            </Label>
            <Input
              type="text"
              placeholder="e.g. Mercedes-AMG GT"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
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
              rows={3}
              placeholder="A short line about this project — the client, the shoot, the story..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
              className="w-full bg-[#0c0c0e]/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary resize-none transition-all"
            />
          </div>

          {/* Cover Thumbnail Section */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block font-mono">
              COVER THUMBNAIL <span className="normal-case text-zinc-500">(optional)</span>
            </Label>

            <div className="flex items-center gap-2.5">
              {/* Preview Thumbnail Box */}
              <div className="w-16 h-11 rounded-xl bg-[#0c0c0e] border border-white/10 flex items-center justify-center text-zinc-500 overflow-hidden shrink-0">
                {coverPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="size-full object-cover"
                  />
                ) : (
                  <ImageIcon className="size-4 text-zinc-600" />
                )}
              </div>

              {/* Upload / Edit / Remove Cover Buttons */}
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
                onClick={() => coverInputRef.current?.click()}
                disabled={uploading}
                className="flex-1 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border-white/15 text-white text-xs font-semibold py-2.5 px-3.5 h-auto flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Upload className="size-3.5 text-zinc-300" />
                <span>{coverPreview ? "CHANGE" : "UPLOAD COVER"}</span>
              </Button>
              {coverPreview && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setCoverCropState({
                        isOpen: true,
                        imageSrc: coverPreview,
                        fileName: coverFile?.name || "project-cover.jpg",
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
                      setCoverFile(null);
                      setCoverPreview(null);
                    }}
                    disabled={uploading}
                    className="rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/30 text-rose-300 text-xs font-semibold py-2.5 px-2.5 h-auto flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                    title="Remove custom cover"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </>
              )}
            </div>

            <p className="text-[11px] text-zinc-500 font-sans leading-tight pt-0.5">
              No cover? We&apos;ll use the first asset in the project.
            </p>
          </div>

          {/* Progress Indicator */}
          {uploading && (
            <div className="space-y-1.5 pt-1 animate-in fade-in">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Loader2 className="size-3 animate-spin text-primary" />
                  {statusText}
                </span>
                <span className="font-bold text-primary">{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={!projectName.trim() || uploading || isAtLimit}
              className="w-full rounded-xl py-3 px-4 h-auto bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-primary/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-0"
            >
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>CREATING PROJECT...</span>
                </>
              ) : isAtLimit ? (
                <span>PLAN LIMIT REACHED (UPGRADE TO UPLOAD)</span>
              ) : (
                <>
                  <Plus className="size-4 stroke-[3]" />
                  <span>CREATE PROJECT</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </UniversalDialog>

      <ImageCropEditorDialog
        isOpen={coverCropState.isOpen}
        onClose={() => setCoverCropState((prev) => ({ ...prev, isOpen: false }))}
        imageSrc={coverCropState.imageSrc}
        title="EDIT & CROP PROJECT COVER"
        subtitle="Frame, zoom, rotate, or fine-tune the cover thumbnail for this portfolio project."
        defaultAspectRatio="16:9"
        aspectRatioOptions={["16:9", "9:16", "1:1", "4:3"]}
        outputFileName={coverCropState.fileName}
        onApply={handleApplyCoverCrop}
      />
    </>
  );
}
