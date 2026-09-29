"use client";

import React from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  itemName?: string;
  description?: string;
  isDeleting?: boolean;
  isPermanent?: boolean;
  confirmText?: string;
  onConfirm: () => Promise<void> | void;
}

export function DeleteConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  itemName,
  description,
  isDeleting = false,
  isPermanent = false,
  confirmText,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const displayTitle = title || (isPermanent ? "Delete Permanently" : "Move to Trash");
  const displayDescription =
    description ||
    (isPermanent
      ? "This will permanently purge the media from Cloudflare storage and recover your workspace quota. This action cannot be undone."
      : "This asset will be moved to your workspace Trash. It will immediately be hidden from active client deliveries and portfolio views, and safely retained for 30 days.");
  const displayConfirmText =
    confirmText || (isPermanent ? "Delete Forever" : "Move to Trash");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isDeleting && onOpenChange(open)}>
      <DialogContent
        showCloseButton={!isDeleting}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[#141418]/95 backdrop-blur-xl border border-white/15 text-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl space-y-5"
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`size-10 rounded-full flex items-center justify-center shrink-0 border ${
              isPermanent
                ? "bg-red-500/15 border-red-500/30 text-red-400"
                : "bg-amber-500/15 border-amber-500/30 text-amber-400"
            }`}
          >
            {isPermanent ? (
              <AlertTriangle className="size-5" />
            ) : (
              <Trash2 className="size-5" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold font-heading text-white">
              {displayTitle}
            </h3>
            {itemName && (
              <p className="text-xs font-mono text-zinc-400 truncate max-w-[260px]">
                &ldquo;{itemName}&rdquo;
              </p>
            )}
          </div>
        </div>

        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
          {displayDescription}
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
            className="rounded-full border-white/15 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold px-4 py-2 cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={isDeleting}
            onClick={async () => {
              await onConfirm();
            }}
            className={`rounded-full text-white font-bold text-xs px-5 py-2 flex items-center gap-1.5 shadow-lg cursor-pointer ${
              isPermanent
                ? "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                : "bg-[#f5551d] hover:bg-[#d44413] shadow-[#f5551d]/20"
            }`}
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>{isPermanent ? "Deleting..." : "Moving..."}</span>
              </>
            ) : (
              <>
                <Trash2 className="size-3.5" />
                <span>{displayConfirmText}</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

