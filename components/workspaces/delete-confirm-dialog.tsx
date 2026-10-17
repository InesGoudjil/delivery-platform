"use client";

import React from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { UniversalDialog } from "@/components/ui/universal-dialog";
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
    <UniversalDialog
      open={isOpen}
      onOpenChange={(open) => !isDeleting && onOpenChange(open)}
      size="md"
      variant={isPermanent ? "destructive" : "warning"}
      icon={
        isPermanent ? (
          <AlertTriangle className="size-5" />
        ) : (
          <Trash2 className="size-5" />
        )
      }
      title={displayTitle}
      description={itemName ? `“${itemName}”` : undefined}
      showCloseButton={!isDeleting}
      footer={
        <>
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
            className={`rounded-full font-bold text-xs px-5 py-2 flex items-center gap-1.5 shadow-lg cursor-pointer ${
              isPermanent
                ? "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
                : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
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
        </>
      }
    >
      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
        {displayDescription}
      </p>
    </UniversalDialog>
  );
}
