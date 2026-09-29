"use client";

import { UploadCloud, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    <Card className="fixed bottom-6 right-6 z-50 bg-card/95 backdrop-blur-md border border-border rounded-2xl p-4 shadow-2xl min-w-[340px] max-w-sm space-y-3 animate-in slide-in-from-bottom duration-300 hover:translate-y-0">
      <CardContent className="p-0 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <UploadCloud className="size-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-card-foreground truncate">
                {progress.fileName}
              </h4>
              <p className="text-[11px] font-mono text-muted-foreground">
                {progress.fileSize} · {progress.fileIndex} of {progress.totalFiles} files
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold font-mono text-foreground">
              {progress.percentage}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onDismiss}
              className="size-6 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Progress Bar Line */}
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden border border-border/20">
          <div
            className="h-full bg-gradient-to-r from-primary to-[#ff8a45] transition-all duration-300 rounded-full"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
