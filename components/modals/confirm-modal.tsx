"use client";

import React, { useState, ReactNode } from "react";
import { AlertTriangle, Trash2, Loader2, HelpCircle } from "lucide-react";
import { UniversalDialog } from "@/components/ui/universal-dialog";
import { Button } from "@/components/ui/button";
import { TypographyMuted, TypographySpan } from "@/components/ui/typography";

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
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={handleCancel}
            className="rounded-full border-white/15 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold px-4 py-2 cursor-pointer"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            disabled={isLoading}
            onClick={handleConfirm}
            className={`rounded-full font-bold text-xs px-5 py-2 flex items-center gap-1.5 shadow-lg cursor-pointer ${
              isDanger
                ? "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
                : isWarning
                ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20"
                : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <TypographySpan>Processing...</TypographySpan>
              </>
            ) : (
              <TypographySpan>{confirmText}</TypographySpan>
            )}
          </Button>
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
