"use client";

import React, { useState, ReactNode } from "react";
import { AlertTriangle, Trash2, HelpCircle } from "lucide-react";
import { UniversalDialog, UniversalDialogAction } from "@/components/ui/universal-dialog";
import { TypographyMuted } from "@/components/ui/typography";

export interface ConfirmModalProps {
  title: string;
  description: ReactNode;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
  onConfirm: () => Promise<void> | void;
  onCancel?: () => void;
}

export function ConfirmModal({
  isOpen,
  onOpenChange,
  title,
  description,
  itemName,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmModalProps & {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (isLoading) return;
    onCancel?.();
    onOpenChange(false);
  };

  const isDanger = variant === "danger";
  const isWarning = variant === "warning";

  return (
    <UniversalDialog
      open={isOpen}
      onOpenChange={(open) => !isLoading && onOpenChange(open)}
      size="md"
      variant={isDanger ? "destructive" : isWarning ? "warning" : "default"}
      icon={
        isDanger ? (
          <Trash2 className="size-5" />
        ) : isWarning ? (
          <AlertTriangle className="size-5" />
        ) : (
          <HelpCircle className="size-5" />
        )
      }
      title={title}
      description={itemName ? `“${itemName}”` : undefined}
      showCloseButton={!isLoading}
      footer={
        <>
          <UniversalDialogAction
            intent="secondary"
            disabled={isLoading}
            onClick={handleCancel}
          >
            {cancelText}
          </UniversalDialogAction>
          <UniversalDialogAction
            intent={isDanger ? "danger" : isWarning ? "warning" : "primary"}
            onClick={handleConfirm}
            loading={isLoading}
            loadingText="Processing..."
          >
            {confirmText}
          </UniversalDialogAction>
        </>
      }
    >
      <TypographyMuted className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
        {description}
      </TypographyMuted>
    </UniversalDialog>
  );
}

export function useConfirmModal(props: ConfirmModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    isOpen,
    setIsOpen,
    confirmModal: (
      <ConfirmModal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        {...props}
      />
    ),
  };
}
