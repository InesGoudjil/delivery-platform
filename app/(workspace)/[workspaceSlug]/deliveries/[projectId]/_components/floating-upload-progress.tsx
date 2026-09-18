"use client";

import { UploadCloud, X } from "lucide-react";
import type { UploadProgressState } from "./types";

interface FloatingUploadProgressProps {
  progress: UploadProgressState | null;
  onDismiss: () => void;
}

export function FloatingUploadProgress({
  progress,
  onDismiss,
}: FloatingUploadProgressProps) {
  if (!progress) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-[#121215] border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[340px] max-w-sm space-y-3 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-9 rounded-xl bg-white/10 text-[#f5551d] flex items-center justify-center shrink-0 border border-white/10">
            <UploadCloud className="size-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white truncate">
              {progress.fileName}
            </h4>
            <p className="text-[11px] font-mono text-muted-foreground">
              {progress.fileSize} · {progress.fileIndex} of {progress.totalFiles} files
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold font-mono text-white">
            {progress.percentage}%
          </span>
          <button
            type="button"
            onClick={onDismiss}
            className="size-6 rounded-full bg-white/10 hover:bg-white/20 text-muted-foreground hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Bar Line */}
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#f5551d] to-[#ff8a45] transition-all duration-300 rounded-full"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
    </div>
  );
}
