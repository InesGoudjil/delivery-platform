"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, MailCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createClientAccountAction } from "@/app/actions/admin";
import { ADMIN_ACCOUNT_EXISTS_MESSAGE, type AdminCreatedClient } from "@/core/admin/types";
import { SetupLinkPanel } from "./setup-link-panel";

const EMPTY = { fullName: "", email: "", studioName: "", reason: "" };

/**
 * "New client" on the users page: makes an account for someone the team is in touch with, then
 * emails them a link to choose their password (or shows it, to send another way).
 */
export function CreateClientButton() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [sendEmail, setSendEmail] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<AdminCreatedClient | null>(null);
  const [showLink, setShowLink] = useState(false);

  const canSubmit =
    form.fullName.trim().length >= 2 && form.email.includes("@") && form.reason.trim().length >= 5 && !pending;

  function reset() {
    setForm(EMPTY);
    setSendEmail(true);
    setError(null);
    setCreated(null);
    setShowLink(false);
  }

  function onOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    // Drop the link from memory once the dialog closes.
    if (!next) reset();
  }

  const field = (key: keyof typeof EMPTY) => ({
    value: form[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value })),
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      const result = await createClientAccountAction({
        fullName: form.fullName,
        email: form.email,
        studioName: form.studioName,
        sendEmail,
        reason: form.reason,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      const { success: _success, ...account } = result;
      setCreated(account);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="size-4" /> New client
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="lg">
          {created ? (
            <CreatedView
              created={created}
              fullName={form.fullName.trim()}
              emailRequested={sendEmail}
              showLink={showLink || !created.emailSent}
              onShowLink={() => setShowLink(true)}
              onCreateAnother={reset}
              onDone={() => onOpenChange(false)}
            />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>New client</DialogTitle>
                <DialogDescription>
                  Makes an account and a studio workspace on the Free plan for someone you&apos;re in touch with. They
                  get a link to choose their password; you never see or set it.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="client-full-name" className="text-sm font-medium">
                    Full name
                  </label>
                  <Input id="client-full-name" autoComplete="off" maxLength={100} required autoFocus {...field("fullName")} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="client-email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="client-email"
                    type="email"
                    autoComplete="off"
                    maxLength={254}
                    required
                    {...field("email")}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="client-studio-name" className="text-sm font-medium">
                  Studio name <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Input
                  id="client-studio-name"
                  autoComplete="off"
                  maxLength={80}
                  placeholder={form.fullName.trim() || "Their name, if left empty"}
                  {...field("studioName")}
                />
                <p className="text-xs text-muted-foreground">
                  Names their workspace and its address. They can change the name later in their settings.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                <div className="space-y-0.5">
                  <label htmlFor="client-send-email" className="text-sm font-medium">
                    Email them the setup link
                  </label>
                  <p className="text-xs text-muted-foreground">
                    A welcome email from Pedro. Turn it off to copy the link and send it yourself.
                  </p>
                </div>
                <Switch id="client-send-email" checked={sendEmail} onCheckedChange={setSendEmail} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="client-reason" className="text-sm font-medium">
                  Reason
                </label>
                <Textarea
                  id="client-reason"
                  rows={2}
                  maxLength={500}
                  required
                  placeholder="Who they are and how you met, e.g. a call about wedding deliveries. It's saved in the audit log."
                  {...field("reason")}
                />
              </div>

              {error && (
                <div role="alert" className="space-y-1 text-sm text-destructive">
                  <p>{error}</p>
                  {error === ADMIN_ACCOUNT_EXISTS_MESSAGE && (
                    <Link
                      href={`/admin/users?q=${encodeURIComponent(form.email.trim())}`}
                      className="font-medium underline underline-offset-4"
                      onClick={() => onOpenChange(false)}
                    >
                      Find it in the user list
                    </Link>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmit}>
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  Create account
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreatedView({
  created,
  fullName,
  emailRequested,
  showLink,
  onShowLink,
  onCreateAnother,
  onDone,
}: {
  created: AdminCreatedClient;
  fullName: string;
  emailRequested: boolean;
  showLink: boolean;
  onShowLink: () => void;
  onCreateAnother: () => void;
  onDone: () => void;
}) {
  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-emerald-500" /> Account created
        </DialogTitle>
        <DialogDescription>
          {fullName} · {created.email}
        </DialogDescription>
      </DialogHeader>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">Workspace</dt>
        <dd>
          {created.workspace ? (
            <Link href={`/admin/workspaces/${created.workspace.id}`} className="font-medium hover:underline">
              {created.workspace.name}
            </Link>
          ) : (
            "Made when they first sign in"
          )}
          {created.workspace && <span className="text-muted-foreground"> · /{created.workspace.slug}</span>}
        </dd>
        <dt className="text-muted-foreground">Plan</dt>
        <dd>Free, as for any sign-up. Change it from the workspace page.</dd>
      </dl>

      {created.workspaceWarning && <Notice>{created.workspaceWarning}</Notice>}

      {created.emailSent ? (
        <p className="flex items-start gap-2 text-sm">
          <MailCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
          We emailed them the setup link. Once they choose a password, they land in their workspace.
        </p>
      ) : emailRequested ? (
        <Notice>
          The email didn&apos;t go out{created.emailError ? ` (${created.emailError})` : ""}. Copy the link and send
          it to them yourself.
        </Notice>
      ) : (
        <p className="text-sm">Send them this link. Once they choose a password, they land in their workspace.</p>
      )}

      {showLink ? (
        <SetupLinkPanel link={created.setupLink} expiresAt={created.setupLinkExpiresAt} />
      ) : (
        <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={onShowLink}>
          Show the link, to send it another way too
        </Button>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCreateAnother}>
          Create another
        </Button>
        <Button
          variant="outline"
          render={<Link href={`/admin/users/${created.userId}`}>Open user page</Link>}
          onClick={onDone}
        />
        <Button type="button" onClick={onDone}>
          Done
        </Button>
      </DialogFooter>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
      <span>{children}</span>
    </p>
  );
}
