"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  Plus,
  X,
  Image as ImageIcon,
  Film,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { createWorkspaceProjectAction } from "@/app/actions/projects";
import {
  requestAssetUploadAction,
  confirmUploadCompletedAction,
} from "@/app/actions/upload";
import { PortfolioItem } from "../portfolio-client";

interface UploadProjectModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (item: PortfolioItem) => void;
  showFlash: (msg: string) => void;
}

export function UploadProjectModal({
  workspaceId,
  isOpen,
  onClose,
  onProjectCreated,
  showFlash,
}: UploadProjectModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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
    setCoverFile(file);
    const objectUrl = URL.createObjectURL(file);
    setCoverPreview(objectUrl);
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

      // 2. Upload Selected Files sequentially
      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const isImage = file.type.startsWith("image/");
          const assetType = isImage ? "photo_gallery" : "video";
          const filePercentBase = Math.round((i / selectedFiles.length) * 100);

          setStatusText(`Uploading ${i + 1}/${selectedFiles.length}: ${file.name}`);
          setProgress(filePercentBase);

          try {
            const initRes = await requestAssetUploadAction({
              workspaceId,
              projectId: createdProject.id,
              title: file.name.replace(/\.[^/.]+$/, ""),
              filename: file.name,
              fileSizeBytes: file.size,
              assetType,
            });

            if (initRes.success && initRes.directUpload) {
              const { uploadUrl, providerUid, uploadType, headers } = initRes.directUpload;

              await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
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

              if (!primaryThumbnailUrl && confirmRes.assetVersion?.thumbnailUrl) {
                primaryThumbnailUrl = confirmRes.assetVersion.thumbnailUrl;
              }
            }
          } catch (err) {
            console.error("Asset upload step error:", err);
          }
        }
      }

      // 3. Upload custom cover if specified and no thumbnail yet
      if (coverFile && !primaryThumbnailUrl) {
        setStatusText("Uploading cover thumbnail...");
        try {
          const coverInit = await requestAssetUploadAction({
            workspaceId,
            projectId: createdProject.id,
            title: `${projectName} Cover`,
            filename: coverFile.name,
            fileSizeBytes: coverFile.size,
            assetType: "photo_gallery",
          });
          if (coverInit.success && coverInit.directUpload) {
            await fetch(coverInit.directUpload.uploadUrl, {
              method: coverInit.directUpload.uploadType === "presigned_put" ? "PUT" : "POST",
              body: coverFile,
            });
            primaryThumbnailUrl = coverInit.directUpload.uploadUrl.split("?")[0];
          }
        } catch {
          // Fallback handled
        }
      }

      setProgress(100);

      const newItem: PortfolioItem = {
        id: createdProject.id,
        title: createdProject.title,
        category: "Commercial Project",
        type: "project",
        assetCount: selectedFiles.length || 0,
        thumbnailUrl: primaryThumbnailUrl,
      };

      onProjectCreated(newItem);
      showFlash(`Project "${createdProject.title}" created with ${selectedFiles.length} file(s)!`);
      handleClose();
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred creating project.");
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
            UPLOAD A PROJECT
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Group photos and videos from the same shoot into one project. Clients and visitors open it as a single story.
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
          {/* Dropzone Area */}
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
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*,image/*,.mp4,.mov,.mkv,.m4v,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
              disabled={uploading}
            />

            <div className="size-10 rounded-full flex items-center justify-center text-[#f5551d]">
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

          {/* Selected File Chips (Matches Screenshot 2) */}
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {selectedFiles.map((file, idx) => {
                const isImg = file.type.startsWith("image/");
                return (
                  <div
                    key={`${file.name}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border border-[#f5551d]/30 bg-[#f5551d]/10 text-orange-400 group"
                  >
                    {isImg ? (
                      <ImageIcon className="size-3 text-[#f5551d]" />
                    ) : (
                      <Film className="size-3 text-[#f5551d]" />
                    )}
                    <span className="truncate max-w-[140px] text-[11px] text-zinc-200">
                      {file.name}
                    </span>
                    {!uploading && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(idx);
                        }}
                        className="text-zinc-400 hover:text-white transition-colors ml-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              {!uploading && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
                >
                  <Plus className="size-3 text-[#f5551d]" />
                  <span>Add more</span>
                </button>
              )}
            </div>
          )}

          {/* Project Name Field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block font-mono">
              PROJECT NAME
            </label>
            <input
              type="text"
              placeholder="e.g. Mercedes-AMG GT"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
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
              placeholder="A short line about this project — the client, the shoot, the story..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
              className="w-full bg-[#0c0c0e]/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#f5551d] resize-none transition-all"
            />
          </div>

          {/* Cover Thumbnail Section */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase block font-mono">
              COVER THUMBNAIL <span className="normal-case text-zinc-500">(optional)</span>
            </label>

            <div className="flex items-center gap-3">
              {/* Preview Thumbnail Box */}
              <div className="size-11 rounded-xl bg-[#0c0c0e] border border-white/10 flex items-center justify-center text-zinc-500 overflow-hidden shrink-0">
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

              {/* Upload Cover Button */}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => handleCoverSelect(e.target.files)}
                disabled={uploading}
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploading}
                className="flex-1 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-white text-xs font-semibold py-2.5 px-4 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Upload className="size-3.5 text-zinc-300" />
                <span>UPLOAD COVER</span>
              </button>
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
              disabled={!projectName.trim() || uploading}
              className="w-full rounded-xl py-3 px-4 bg-gradient-to-r from-[#b8481e] via-[#db5722] to-[#8d3615] hover:brightness-110 active:brightness-95 text-white text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-orange-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
            >
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>CREATING PROJECT...</span>
                </>
              ) : (
                <>
                  <Plus className="size-4 stroke-[3]" />
                  <span>CREATE PROJECT</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
