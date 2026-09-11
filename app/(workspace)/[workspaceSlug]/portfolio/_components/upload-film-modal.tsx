"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  X,
  Image as ImageIcon,
  Film,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  requestAssetUploadAction,
  confirmUploadCompletedAction,
} from "@/app/actions/upload";
import { PortfolioItem } from "../portfolio-client";
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
}

export function UploadFilmModal({
  workspaceId,
  isOpen,
  onClose,
  onAssetUploaded,
  showFlash,
}: UploadFilmModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  if (!isOpen) return null;

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
    setThumbnailFile(file);
    const objectUrl = URL.createObjectURL(file);
    setThumbnailPreview(objectUrl);
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

    try {
      const isImage = selectedFile.type.startsWith("image/");
      const assetType = isImage ? "photo_gallery" : "video";
      const itemTitle = title.trim() || selectedFile.name;

      // 1. Request upload URL from server (standalone asset: no projectId)
      const initRes = await requestAssetUploadAction({
        workspaceId,
        projectId: "",
        title: itemTitle,
        filename: selectedFile.name,
        fileSizeBytes: selectedFile.size,
        assetType,
      });

      if (!initRes.success || !initRes.directUpload) {
        throw new Error(initRes.error || "Failed to initialize upload.");
      }

      const { uploadUrl, providerUid, uploadType, headers } = initRes.directUpload;
      const assetVersionId = initRes.assetVersion.id;

      setStatusText("Uploading asset...");

      // 2. Direct upload to storage provider via XHR
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 90);
            setProgress(pct);
            setStatusText(`Uploading: ${pct}%`);
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

      // 3. Optional thumbnail upload if selected
      let customThumbUrl = "";
      if (thumbnailFile) {
        setStatusText("Uploading custom thumbnail...");
        try {
          const thumbInit = await requestAssetUploadAction({
            workspaceId,
            projectId: "",
            title: `${itemTitle} Thumbnail`,
            filename: thumbnailFile.name,
            fileSizeBytes: thumbnailFile.size,
            assetType: "photo_gallery",
          });
          if (thumbInit.success && thumbInit.directUpload) {
            await fetch(thumbInit.directUpload.uploadUrl, {
              method: thumbInit.directUpload.uploadType === "presigned_put" ? "PUT" : "POST",
              body: thumbnailFile,
            });
            customThumbUrl = thumbInit.directUpload.uploadUrl.split("?")[0];
          }
        } catch {
          // Non-critical fallback
        }
      }

      // 4. Confirm completion on server
      setStatusText("Finalizing asset...");
      const confirmRes = await confirmUploadCompletedAction({
        assetVersionId,
        providerUid,
        fileSizeBytes: selectedFile.size,
      });

      if (!confirmRes.success) {
        throw new Error(confirmRes.error || "Failed to finalize asset.");
      }

      setProgress(100);

      const newItem: PortfolioItem = {
        id: initRes.asset.id,
        title: itemTitle,
        category: isImage ? "Photo Still" : "Standalone Film",
        type: isImage ? "still" : "film",
        assetCount: 1,
        thumbnailUrl:
          customThumbUrl ||
          thumbnailPreview ||
          confirmRes.assetVersion?.thumbnailUrl ||
          confirmRes.assetVersion?.rawFileUrl ||
          "",
      };

      onAssetUploaded(newItem);
      showFlash(`"${itemTitle}" uploaded successfully!`);
      handleClose();
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during upload.");
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#161618]/95 border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 relative max-h-[92vh] overflow-y-auto"
        style={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
        }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={uploading}
          className="absolute top-5 right-5 size-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="size-4" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 pr-8">
          <h2 className="text-base sm:text-lg font-black tracking-wider text-white uppercase font-heading">
            UPLOAD FILM OR STILL
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Add a title and a short description. It&apos;ll show on your public Work page under Films or Stills.
          </p>
        </div>

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
                  <Film className="size-4 text-[#f5551d]" />
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
                  ? "border-[#f5551d] bg-[#f5551d]/10 scale-[1.01]"
                  : "border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]"
              }`}
            >
              <div className="size-10 rounded-full flex items-center justify-center text-[#f5551d]">
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
            <label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block font-mono">
              TITLE
            </label>
            <input
              type="text"
              placeholder="e.g. Dubai Nights"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
              className="w-full bg-[#0c0c0e]/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#f5551d] transition-all"
              required
            />
          </div>

          {/* Description Field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block font-mono">
              DESCRIPTION <span className="normal-case text-zinc-500">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="A short line about this piece — the brief, the vibe, the client..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
              className="w-full bg-[#0c0c0e]/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#f5551d] resize-none transition-all"
            />
          </div>

          {/* Thumbnail Section */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block font-mono">
              THUMBNAIL <span className="normal-case text-zinc-500">(optional)</span>
            </label>

            <div className="flex items-center gap-3">
              {/* Preview Thumbnail Box */}
              <div className="size-11 rounded-xl bg-[#0c0c0e] border border-white/10 flex items-center justify-center text-zinc-500 overflow-hidden shrink-0">
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

              {/* Upload Thumbnail Button */}
              <input
                ref={thumbInputRef}
                type="file"
                accept="image/*,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => handleThumbnailSelect(e.target.files)}
                disabled={uploading}
              />
              <button
                type="button"
                onClick={() => thumbInputRef.current?.click()}
                disabled={uploading}
                className="flex-1 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-white text-xs font-semibold py-2.5 px-4 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Upload className="size-3.5 text-zinc-300" />
                <span>UPLOAD THUMBNAIL</span>
              </button>
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
                  <Loader2 className="size-3 animate-spin text-[#f5551d]" />
                  {statusText}
                </span>
                <span className="font-bold text-[#f5551d]">{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#d25828] to-[#f5551d] rounded-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="w-full rounded-xl py-3 px-4 bg-gradient-to-r from-[#b8481e] via-[#db5722] to-[#8d3615] hover:brightness-110 active:brightness-95 text-white text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-orange-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
            >
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>UPLOADING...</span>
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  <span>UPLOAD FILM OR STILL</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
