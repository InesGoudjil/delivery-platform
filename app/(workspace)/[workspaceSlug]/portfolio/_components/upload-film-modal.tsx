"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { UniversalDialog } from "@/components/ui/universal-dialog";
import {
  requestAssetUploadAction,
  confirmUploadCompletedAction,
} from "@/app/actions/upload";
import { updateAssetAction } from "@/app/actions/assets";
import { PortfolioItem } from "../portfolio-client";
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
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentActions,
  AttachmentAction,
} from "@/components/ui/attachment";

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
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
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
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const uploadToastRef = useRef<ReturnType<typeof createUploadProgressToast> | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setSelectedFile(file);
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
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
    if (thumbInputRef.current) {
      thumbInputRef.current.value = "";
    }
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setTitle("");
    setDescription("");
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setUploading(false);
    setProgress(0);
    setStatusText("");
    setErrorMessage(null);
  };

  const handleClose = () => {
    if (uploading && xhrRef.current) {
      xhrRef.current.abort();
    }
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || uploading) return;

    setUploading(true);
    setErrorMessage(null);
    setProgress(0);
    setStatusText("Initializing direct upload...");

    const isImage = selectedFile.type.startsWith("image/");
    const assetType = isImage ? "photo_gallery" : "video";
    const itemTitle = title.trim() || selectedFile.name;

    const uploadToast = createUploadProgressToast(`portfolio-film-${Date.now()}`);
    uploadToastRef.current = uploadToast;
    uploadToast.start(
      `Uploading "${itemTitle}"...`,
      "Initializing direct upload..."
    );

    try {
      // 1. Request upload URL from server (standalone asset: no projectId)
      const initRes = await requestAssetUploadAction({
        workspaceId,
        projectId: "",
        title: itemTitle,
        filename: selectedFile.name,
        fileSizeBytes: selectedFile.size,
        assetType,
        category: assetType === "video" ? "film" : "still",
      });

      if (!initRes.success || !initRes.directUpload) {
        throw new Error(initRes.error || "Failed to initialize upload.");
      }

      const { uploadUrl, providerUid, uploadType, headers } = initRes.directUpload;
      const assetVersionId = initRes.assetVersion.id;

      setStatusText("Uploading asset...");
      uploadToast.update({
        title: `Uploading "${itemTitle}"`,
        progress: 2,
        loadedBytes: 0,
        totalBytes: selectedFile.size,
      });

      // 2. Direct upload to storage provider via XHR
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 90);
            setProgress(pct);
            setStatusText(`Uploading: ${pct}%`);
            uploadToast.update({
              title: `Uploading "${itemTitle}"`,
              progress: Math.round((event.loaded / event.total) * 100),
              loadedBytes: event.loaded,
              totalBytes: event.total,
            });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during direct upload."));
        xhr.onabort = () => reject(new Error("Upload cancelled."));

        if (uploadType === "presigned_put") {
          xhr.open("PUT", uploadUrl, true);
          if (headers) {
            Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
          }
          xhr.send(selectedFile);
        } else {
          xhr.open("POST", uploadUrl, true);
          const formData = new FormData();
          formData.append("file", selectedFile);
          xhr.send(formData);
        }
      });

      // 3. Confirm completion on server
      setStatusText("Finalizing asset...");
      uploadToast.update({
        title: `Finalizing "${itemTitle}"...`,
        progress: 96,
        subtitle: "Saving to portfolio...",
      });
      const confirmRes = await confirmUploadCompletedAction({
        assetVersionId,
        providerUid,
        fileSizeBytes: selectedFile.size,
      });

      if (!confirmRes.success) {
        throw new Error(confirmRes.error || "Failed to finalize asset.");
      }

      // 4. Persist custom cropped thumbnail or description if provided
      const customThumbUrl = thumbnailPreview || "";
      if (customThumbUrl || description.trim()) {
        await updateAssetAction(
          initRes.asset.id,
          {
            ...(customThumbUrl ? { thumbnailUrl: customThumbUrl } : {}),
            ...(description.trim() ? { description: description.trim() } : {}),
          },
          { workspaceSlug }
        );
      }

      setProgress(100);
      uploadToast.success(
        `"${itemTitle}" uploaded successfully!`,
        `Added to your portfolio showcase.`
      );
      uploadToastRef.current = null;

      const resolvedMediaUrl = isImage
        ? (customThumbUrl || confirmRes.assetVersion?.rawFileUrl || "")
        : (confirmRes.assetVersion?.rawFileUrl || confirmRes.assetVersion?.hlsManifestUrl || "");

      const resolvedThumbUrl =
        customThumbUrl ||
        confirmRes.assetVersion?.thumbnailUrl ||
        (isImage ? confirmRes.assetVersion?.rawFileUrl : "") ||
        "";

      const newItem: PortfolioItem = {
        id: initRes.asset.id,
        title: itemTitle,
        category: isImage ? "Photo Still" : "Standalone Film",
        type: isImage ? "still" : "film",
        assetCount: 1,
        thumbnailUrl: resolvedThumbUrl,
        mediaUrl: resolvedMediaUrl,
      };

      onAssetUploaded(newItem);
      handleClose();
    } catch (err: any) {
      const msg = err.message || "An error occurred during upload.";
      setErrorMessage(msg);
      setUploading(false);
      if (msg === "Upload cancelled.") {
        uploadToast.info("Upload cancelled", `"${itemTitle}" upload was aborted.`);
      } else {
        uploadToast.error("Upload failed", msg);
      }
      uploadToastRef.current = null;
    }
  };

  return (
    <>
      <UniversalDialog
        open={isOpen}
        onOpenChange={(open) => !uploading && !open && handleClose()}
        size="lg"
        title="UPLOAD FILM OR STILL"
        description="Add a title and a short description. It'll show on your public Work page under Films or Stills."
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
          {/* Dropzone & Attachment Display Area */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,image/*,.mp4,.mov,.mkv,.m4v,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}
          />

          {selectedFile ? (
            <Attachment
              state={uploading ? "uploading" : errorMessage ? "error" : "done"}
              size="default"
              className="w-full bg-white/[0.04] border-white/15 p-3"
            >
              <AttachmentMedia variant={selectedFile.type.startsWith("image/") ? "image" : "icon"}>
                {selectedFile.type.startsWith("image/") ? (
                  <ImageIcon className="size-4" />
                ) : (
                  <Film className="size-4 text-primary" />
                )}
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle className="text-zinc-100">{selectedFile.name}</AttachmentTitle>
                <AttachmentDescription className="text-zinc-400">
                  {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · Ready for upload
                </AttachmentDescription>
              </AttachmentContent>
              {!uploading && (
                <AttachmentActions>
                  <AttachmentAction
                    variant="ghost"
                    size="icon-xs"
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    title="Remove file"
                  >
                    <X className="size-3.5 text-zinc-400 hover:text-white" />
                  </AttachmentAction>
                </AttachmentActions>
              )}
            </Attachment>
          ) : (
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
              <div className="size-10 rounded-full flex items-center justify-center text-primary">
                <Upload className="size-5" />
              </div>

              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-zinc-200">
                  Drop a video here or click to browse
                </div>
                <div className="text-[11px] text-zinc-500">
                  MP4, MOV · up to 5 GB
                </div>
              </div>
            </div>
          )}

          {/* Title Field */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block font-mono">
              TITLE
            </Label>
            <Input
              type="text"
              placeholder="e.g. Dubai Nights"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              placeholder="A short line about this piece — the brief, the vibe, the client..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
              className="w-full bg-[#0c0c0e]/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary resize-none transition-all"
            />
          </div>

          {/* Thumbnail Section */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block font-mono">
              THUMBNAIL <span className="normal-case text-zinc-500">(optional)</span>
            </Label>

            <div className="flex items-center gap-2.5">
              {/* Preview Thumbnail Box */}
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

              {/* Upload / Edit / Remove Thumbnail Buttons */}
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

            <p className="text-[11px] text-zinc-500 font-sans leading-tight pt-0.5">
              No thumbnail? We&apos;ll grab a frame from your video automatically.
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
              disabled={!selectedFile || uploading || isAtLimit}
              className="w-full rounded-xl py-3 px-4 h-auto bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-primary/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-0"
            >
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>UPLOADING...</span>
                </>
              ) : isAtLimit ? (
                <span>PLAN LIMIT REACHED (UPGRADE TO UPLOAD)</span>
              ) : (
                <>
                  <Upload className="size-4" />
                  <span>UPLOAD FILM OR STILL</span>
                </>
              )}
            </Button>
          </div>
        </form>
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
