"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  Film,
  CheckCircle2,
  AlertCircle,
  X,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  requestAssetUploadAction,
  confirmUploadCompletedAction,
} from "@/app/actions/upload";

export interface VideoUploaderProps {
  workspaceId: string;
  projectId: string;
  onUploadComplete?: (asset: any) => void;
}

export function VideoUploader({
  workspaceId,
  projectId,
  onUploadComplete,
}: VideoUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [assetType, setAssetType] = useState<"video" | "photo_gallery">("video");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedAsset, setCompletedAsset] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setSelectedFile(file);
    setTitle(file.name.replace(/\.[^/.]+$/, ""));
    
    // Auto-detect asset type based on mime type
    if (file.type.startsWith("image/")) {
      setAssetType("photo_gallery");
    } else {
      setAssetType("video");
    }

    setErrorMessage(null);
    setCompletedAsset(null);
    setProgress(0);
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const startDirectUpload = async () => {
    if (!selectedFile || uploading) return;

    setUploading(true);
    setErrorMessage(null);
    setProgress(0);
    setStatusText("Requesting Cloudflare direct upload token...");

    try {
      // 1. Request direct upload URL from server (validates storage quota)
      const initRes = await requestAssetUploadAction({
        workspaceId,
        projectId,
        title: title || selectedFile.name,
        filename: selectedFile.name,
        fileSizeBytes: selectedFile.size,
        assetType,
      });

      if (!initRes.success || !initRes.directUpload) {
        throw new Error(initRes.error || "Failed to initialize upload.");
      }

      const { uploadUrl, providerUid, uploadType, headers } = initRes.directUpload;
      const assetVersionId = initRes.assetVersion.id;

      setStatusText(`Uploading directly to Cloudflare (${uploadType})...`);

      // 2. Perform direct upload from client to Cloudflare (bypasses Next.js server limits)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress(percent);
            setStatusText(
              `Uploading: ${percent}% (${formatBytes(event.loaded)} / ${formatBytes(event.total)})`
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Direct upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during direct upload."));
        xhr.onabort = () => reject(new Error("Upload cancelled by user."));

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

      // 3. Confirm upload on backend and fetch HLS manifest & thumbnail
      setStatusText("Finalizing transcoding and storage records...");
      const confirmRes = await confirmUploadCompletedAction({
        assetVersionId,
        providerUid,
        fileSizeBytes: selectedFile.size,
      });

      if (!confirmRes.success) {
        throw new Error(confirmRes.error || "Failed to finalize upload records.");
      }

      setProgress(100);
      setStatusText("Upload complete & ready!");
      setCompletedAsset(initRes.asset);

      if (onUploadComplete) {
        onUploadComplete(initRes.asset);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during upload.");
    } finally {
      setUploading(false);
      xhrRef.current = null;
    }
  };

  const cancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
    }
    setUploading(false);
    setProgress(0);
    setStatusText("");
  };

  const resetForm = () => {
    setSelectedFile(null);
    setTitle("");
    setCompletedAsset(null);
    setErrorMessage(null);
    setProgress(0);
    setStatusText("");
  };

  return (
    <div className="w-full rounded-2xl bg-card border border-border p-6 sm:p-8 space-y-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
            {assetType === "photo_gallery" ? <ImageIcon className="size-5" /> : <Film className="size-5" />}
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-card-foreground">
              Direct Cloudflare Media Upload
            </h3>
            <p className="text-xs text-muted-foreground">
              Direct-to-edge 4K HLS video stream & high-res image gallery upload up to 5GB
            </p>
          </div>
        </div>

        {selectedFile && !uploading && !completedAsset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetForm}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5 mr-1" /> Reset
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
        </div>
      )}

      {/* Success State */}
      {completedAsset && (
        <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckCircle2 className="size-5" />
            <span>Master Asset Uploaded Successfully!</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {assetType === "video"
              ? "Your cut is being encoded into adaptive multi-bitrate HLS streams across Cloudflare edge nodes."
              : "Your photo gallery asset is now optimized and served globally via Cloudflare CDN."}
          </p>
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={resetForm}
              className="rounded-full bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-600 cursor-pointer"
            >
              Upload Another Asset
            </Button>
          </div>
        </div>
      )}

      {/* Dropzone Area */}
      {!selectedFile && !completedAsset && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
            dragActive
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border/80 hover:border-primary/50 hover:bg-muted/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,image/*,.mov,.mp4,.mkv,.m4v,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <div className="size-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary transition-colors">
            <Upload className="size-7 text-[#f5551d]" />
          </div>

          <div className="space-y-1">
            <div className="text-sm font-bold text-card-foreground">
              Click to select or drag and drop your video cut or photo asset
            </div>
            <p className="text-xs text-muted-foreground">
              Supports ProRes 422/4444, MP4, MOV, PNG, JPG, WEBP up to 5.0 GB
            </p>
          </div>
        </div>
      )}

      {/* File Details & Upload Trigger */}
      {selectedFile && !completedAsset && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-muted/60 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-foreground truncate max-w-md">
                {selectedFile.name}
              </div>
              <div className="text-[11px] font-mono text-muted-foreground">
                Size: {formatBytes(selectedFile.size)} · Type: {assetType === "video" ? "4K Video Cut" : "Photo Gallery Asset"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Asset Title (e.g. v2_Director_Cut)"
                disabled={uploading}
                className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary w-48"
              />
            </div>
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-2 pt-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">{statusText}</span>
                <span className="font-bold text-primary">{progress}%</span>
              </div>
              <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-gradient-to-r from-[#f5551d] to-[#ff8a45] rounded-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {uploading ? (
              <Button
                variant="outline"
                size="sm"
                onClick={cancelUpload}
                className="rounded-full text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                Cancel Upload
              </Button>
            ) : (
              <Button
                onClick={startDirectUpload}
                className="rounded-full bg-[#f5551d] text-black font-bold text-xs hover:bg-[#ff8a45] shadow-md shadow-[#f5551d]/20 cursor-pointer"
              >
                <Upload className="size-3.5 mr-1.5" /> Start Direct Upload
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
