"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

/**
 * Confirmation for an admin change. Every admin write needs a reason, which goes into the audit
 * log. `onConfirm` returns an error message to keep the dialog open, or nothing on success.
 */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = false,
  canConfirm = true,
  children,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  /** False while the extra fields aren't filled in yet. */
  canConfirm?: boolean;
  children?: React.ReactNode;
  onConfirm: (reason: string) => Promise<string | void>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const reasonValid = reason.trim().length >= 5;

  function close(next: boolean) {
    if (pending) return;
    if (!next) {
      setReason("");
      setError(null);
    }
    onOpenChange(next);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!reasonValid || !canConfirm) return;
    setPending(true);
    setError(null);
    try {
      const failure = await onConfirm(reason.trim());
      if (failure) {
        setError(failure);
        return;
      }
      setReason("");
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          {children}

          <div className="space-y-1.5">
            <label htmlFor="admin-change-reason" className="text-sm font-medium">
              Reason
            </label>
            <Textarea
              id="admin-change-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why are you making this change? It's saved in the audit log."
              rows={3}
              maxLength={500}
              required
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={pending || !reasonValid || !canConfirm}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
