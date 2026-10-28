"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  X,
  AlertCircle,
  Loader2,
  Upload,
  FileVideo,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TypographyH4, TypographyMuted } from "@/components/ui/typography";

export interface LightboxVersionUploadProps {
  nextVersionNumber: number;
  isStill: boolean;
  isUploading: boolean;
  uploadProgress: number;
  uploadStatusText: string;
  uploadError: string | null;
  onUploadFile: (file: File) => void;
  onCancelUpload: () => void;
  onClose: () => void;
}

export function LightboxVersionUpload({
  nextVersionNumber,
  isStill,
  isUploading,
  uploadProgress,
  uploadStatusText,
  uploadError,
  onUploadFile,
  onCancelUpload,
  onClose,
}: LightboxVersionUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
        isDragOver
          ? "border-primary bg-primary/10 ring-2 ring-primary/40"
          : "border-primary/30 bg-primary/5 hover:border-primary/50"
      }`}
    >
      {/* Upload Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="size-8 sm:size-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
            {isStill ? (
              <ImageIcon className="size-4.5" />
            ) : (
              <UploadCloud className="size-4.5" />
            )}
          </div>
          <div>
            <TypographyH4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono">
              Upload New Revision V{nextVersionNumber}
            </TypographyH4>
            <TypographyMuted className="text-[11px] text-muted-foreground">
              {isStill
                ? "Upload revised still photo (PNG, JPG, WEBP, AVIF up to 5GB)"
                : "Upload new ProRes 422/4444, MOV, or MP4 master cut (up to 5GB)"}
            </TypographyMuted>
          </div>
        </div>

        {!isUploading && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            className="size-7 rounded-lg text-muted-foreground hover:text-white cursor-pointer"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {/* Error Notice */}
      {uploadError && (
        <div className="mt-3 p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-semibold flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Progress / Active Upload State */}
      {isUploading ? (
        <div className="pt-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-white/90 flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin text-primary" />
              {uploadStatusText || `Uploading V${nextVersionNumber}...`}
            </span>
            <span className="font-bold text-primary">{uploadProgress}%</span>
          </div>

          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-150"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancelUpload}
              className="rounded-full text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 h-7 px-3 cursor-pointer"
            >
              Cancel Upload
            </Button>
          </div>
        </div>
      ) : (
        /* Idle Dropzone Call to Action */
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground text-center sm:text-left">
            Drag and drop your file here, or click to browse from local drive
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept={
                isStill
                  ? "image/*,.png,.jpg,.jpeg,.webp,.avif"
                  : "video/*,.mov,.mp4,.mkv,.m4v"
              }
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onUploadFile(e.target.files[0]);
                  e.target.value = "";
                }
              }}
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 px-4 py-1.5 h-8 cursor-pointer flex items-center gap-1.5 shadow-md shadow-primary/20"
            >
              <Upload className="size-3.5" />
              <span>Select File for V{nextVersionNumber}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
