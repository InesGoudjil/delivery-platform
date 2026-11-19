"use client";

import React from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { UniversalDialog, UniversalDialogAction } from "@/components/ui/universal-dialog";
import { TypographyMuted } from "@/components/ui/typography";

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
      ? "This will permanently purge the media from cloud storage and recover your workspace quota. This action cannot be undone."
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
          <UniversalDialogAction
            intent="secondary"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </UniversalDialogAction>
          <UniversalDialogAction
            intent={isPermanent ? "danger" : "warning"}
            onClick={async () => {
              await onConfirm();
            }}
            loading={isDeleting}
            loadingText={isPermanent ? "Deleting..." : "Moving..."}
            icon={<Trash2 />}
          >
            {displayConfirmText}
          </UniversalDialogAction>
        </>
      }
    >
      <TypographyMuted className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
        {displayDescription}
      </TypographyMuted>
    </UniversalDialog>
  );
}
