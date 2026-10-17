"use client";

import React from "react";
import { toast } from "sonner";

export const formatUploadBytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export interface UploadToastProgressPayload {
  title?: string;
  fileName?: string;
  percentage?: number;
  progress?: number;
  loadedBytes?: number;
  totalBytes?: number;
  fileSize?: string;
  fileIndex?: number;
  totalFiles?: number;
  statusText?: string;
  subtitle?: string;
}

function renderUploadProgressDescription({
  title,
  fileName,
  percentage,
  progress,
  loadedBytes,
  totalBytes,
  fileSize,
  fileIndex,
  totalFiles,
  statusText,
  subtitle,
}: UploadToastProgressPayload) {
  const rawPct = percentage ?? progress ?? 0;
  const clampedPct = Math.max(0, Math.min(100, Math.round(rawPct)));
  const displayFileName = fileName || title || "Media file";
  const displayStatus = statusText || subtitle;
  const sizeLabel =
    loadedBytes !== undefined && totalBytes !== undefined && totalBytes > 0
      ? `${formatUploadBytes(loadedBytes)} / ${formatUploadBytes(totalBytes)}`
      : fileSize || "";

  const batchLabel =
    fileIndex !== undefined && totalFiles !== undefined && totalFiles > 1
      ? `File ${fileIndex} of ${totalFiles}`
      : null;

  return (
    <div className="w-full space-y-2 pt-1">
      <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-muted-foreground">
        <span className="truncate max-w-[200px] text-foreground/90 font-medium">
          {displayFileName}
        </span>
        <span className="font-bold text-foreground shrink-0">{clampedPct}%</span>
      </div>

      <div className="w-full h-1.5 bg-muted/80 rounded-full overflow-hidden border border-border/30">
        <div
          className="h-full bg-primary transition-all duration-200 rounded-full"
          style={{ width: `${clampedPct}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-muted-foreground">
        <span className="truncate">
          {displayStatus || (clampedPct < 100 ? "Uploading media..." : "Finalizing...")}
        </span>
        <span className="shrink-0">
          {[batchLabel, sizeLabel].filter(Boolean).join(" · ")}
        </span>
      </div>
    </div>
  );
}

export function createUploadProgressToast(customId?: string) {
  const toastId =
    customId || `upload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  return {
    id: toastId,

    start(payloadOrTitle: UploadToastProgressPayload | string, subtitle?: string) {
      const payload: UploadToastProgressPayload =
        typeof payloadOrTitle === "string"
          ? {
              title: payloadOrTitle,
              fileName: payloadOrTitle,
              percentage: 0,
              statusText: subtitle || "Initializing upload...",
            }
          : payloadOrTitle;

      const heading =
        payload.title ||
        (payload.totalFiles && payload.totalFiles > 1
          ? `Uploading ${payload.totalFiles} files...`
          : `Uploading ${payload.fileName || "media"}`);

      toast.loading(heading, {
        id: toastId,
        duration: Infinity,
        description: renderUploadProgressDescription(payload),
      });
      return toastId;
    },

    update(payload: UploadToastProgressPayload) {
      const heading =
        payload.title ||
        (payload.totalFiles && payload.totalFiles > 1
          ? `Uploading (${payload.fileIndex || 1}/${payload.totalFiles})`
          : `Uploading ${payload.fileName || "media"}`);

      toast.loading(heading, {
        id: toastId,
        duration: Infinity,
        description: renderUploadProgressDescription(payload),
      });
    },

    success(message: string, description?: string) {
      toast.success(message, {
        id: toastId,
        duration: 4000,
        description: description || undefined,
      });
    },

    error(message: string, description?: string) {
      toast.error(message, {
        id: toastId,
        duration: 5000,
        description: description || undefined,
      });
    },

    info(message: string, description?: string) {
      toast.info(message, {
        id: toastId,
        duration: 3500,
        description: description || undefined,
      });
    },

    dismiss() {
      toast.dismiss(toastId);
    },
  };
}
