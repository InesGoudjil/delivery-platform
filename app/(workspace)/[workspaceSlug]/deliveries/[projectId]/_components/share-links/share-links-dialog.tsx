"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  Check,
  CopyPlus,
  Copy,
  Download,
  Key,
  Link2,
  Lock,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Star,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UniversalDialog, UniversalDialogAction } from "@/components/ui/universal-dialog";
import { TypographyMuted, TypographySpan } from "@/components/ui/typography";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOptionalEntitlements } from "@/components/providers/entitlements-provider";
import { hasExtendedLinkExpiry } from "@/lib/security/link-expiry";
import { ACTIVITY_LABELS, expiryLabel, expiresSoon, shareLinkUrl, timeAgo } from "@/lib/share-links/format";
import type { ShareLinkEvent } from "@/core/entities/share-link";
import {
  createShareLinkAction,
  deleteShareLinkAction,
  duplicateShareLinkAction,
  listDeliveryShareLinksAction,
  listShareLinkActivityAction,
  makePrimaryShareLinkAction,
  regenerateShareLinkTokenAction,
  restoreShareLinkAction,
  revealShareLinkPasscodeAction,
  revokeShareLinkAction,
  updateShareLinkAction,
} from "@/app/actions/share-links";
import type { ShareLinkView } from "@/lib/share-links/view";
import { sendDeliveryEmailAction, sendDeliveryWhatsAppAction } from "@/app/actions/deliveries";
import { ShareLinkForm, type ShareLinkPlan } from "./share-link-form";

interface ShareLinksDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  deliveryId: string;
  projectTitle: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  /** CineSpace's WhatsApp sender is set up (Zoho CPaaS). */
  whatsappAvailable?: boolean;
  features?: Record<string, any>;
  workspaceSlug?: string;
  /** The main link's token changed (new URL, or another link made main). */
  onPrimaryTokenChange?: (token: string) => void;
  triggerToast: (msg: string) => void;
}

type View =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; link: ShareLinkView }
  | { kind: "created"; link: ShareLinkView; passcode: string | null };

function statusChip(link: ShareLinkView) {
  if (link.status === "revoked") {
    return <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-white/15 text-neutral-400">Off</Badge>;
  }
  if (link.status === "expired") {
    return <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500/30 text-amber-300">Expired</Badge>;
  }
  return (
    <span className={`text-[10px] ${expiresSoon(link.expiresAt) ? "text-amber-300" : "text-emerald-300"}`}>
      {expiryLabel(link.expiresAt)}
    </span>
  );
}

export function ShareLinksDialog({
  isOpen,
  onOpenChange,
  deliveryId,
  projectTitle,
  clientEmail,
  clientPhone,
  whatsappAvailable = false,
  features,
  workspaceSlug,
  onPrimaryTokenChange,
  triggerToast,
}: ShareLinksDialogProps) {
  const entitlements = useOptionalEntitlements();
  const plan: ShareLinkPlan = {
    passcode: entitlements?.can.passwordProtect ?? Boolean(features?.password_protected),
    extendedExpiry: entitlements?.can.extendedLinkExpiry ?? hasExtendedLinkExpiry(features),
    alerts: entitlements?.can.receiveDownloadNotifications ?? Boolean(features?.download_notifications),
  };
  const canWhatsApp = (entitlements?.can.sendWhatsApp ?? Boolean(features?.whatsapp_delivery)) && whatsappAvailable;
  const upgradeHref = workspaceSlug ? `/${workspaceSlug}/subscription` : undefined;

  const [links, setLinks] = useState<ShareLinkView[] | null>(null);
  const [limit, setLimit] = useState(-1);
  const [canManage, setCanManage] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: "list" });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [passcodes, setPasscodes] = useState<Record<string, string>>({});
  const [sendFor, setSendFor] = useState<string | null>(null);
  const [activityFor, setActivityFor] = useState<string | null>(null);
  const [activity, setActivity] = useState<ShareLinkEvent[] | null>(null);

  const load = useCallback(async () => {
    const res = await listDeliveryShareLinksAction(deliveryId);
    if (res.success === false) {
      setLoadError(res.error);
      return null;
    }
    setLoadError(null);
    setLinks(res.links);
    setLimit(res.limit);
    setCanManage(res.canManage);
    return res.links;
  }, [deliveryId]);

  useEffect(() => {
    if (!isOpen) return;
    setView({ kind: "list" });
    void load();
  }, [isOpen, load]);

  /** After a change that can move the main link: reload, and tell the page its new token. */
  const reloadAndSyncPrimary = async () => {
    const next = await load();
    const primary = next?.find((link) => link.isPrimary);
    if (primary) onPrimaryTokenChange?.(primary.token);
  };

  const unrevoked = (links ?? []).filter((link) => link.status !== "revoked").length;
  const atLimit = limit !== -1 && unrevoked >= limit;

  const copy = async (link: ShareLinkView, withPasscode = false) => {
    const url = shareLinkUrl(link.token);
    let text = url;
    if (withPasscode) {
      let passcode = passcodes[link.id];
      if (!passcode) {
        const res = await revealShareLinkPasscodeAction(link.id);
        if (res.success === false) {
          toast.error(res.error);
          return;
        }
        passcode = res.passcode;
        setPasscodes((prev) => ({ ...prev, [link.id]: res.passcode }));
      }
      text = `Review link: ${url}\nPasscode: ${passcode}`;
    }
    await navigator.clipboard.writeText(text);
    setCopiedId(link.id);
    triggerToast(withPasscode ? "Link and passcode copied" : "Link copied");
    setTimeout(() => setCopiedId((id) => (id === link.id ? null : id)), 1800);
  };

  const run = async (link: ShareLinkView, task: () => Promise<{ success: boolean; error?: string }>, done: string, syncPrimary = false) => {
    setBusyId(link.id);
    try {
      const res = await task();
      if (res.success === false) {
        toast.error(res.error || "Something went wrong.");
        return;
      }
      triggerToast(done);
      if (syncPrimary) await reloadAndSyncPrimary();
      else await load();
    } finally {
      setBusyId(null);
    }
  };

  const reveal = async (link: ShareLinkView) => {
    const res = await revealShareLinkPasscodeAction(link.id);
    if (res.success === false) {
      toast.error(res.error);
      return;
    }
    setPasscodes((prev) => ({ ...prev, [link.id]: res.passcode }));
  };

  const showActivity = async (link: ShareLinkView) => {
    if (activityFor === link.id) {
      setActivityFor(null);
      return;
    }
    setActivityFor(link.id);
    setActivity(null);
    const res = await listShareLinkActivityAction(link.id);
    setActivity(res.success ? res.events : []);
    if (res.success === false) toast.error(res.error);
  };

  const create = async (values: Parameters<typeof createShareLinkAction>[1]) => {
    setSaving(true);
    try {
      const res = await createShareLinkAction(deliveryId, values);
      if (res.success === false) {
        toast.error(res.error);
        return;
      }
      if (res.passcode) setPasscodes((prev) => ({ ...prev, [res.link.id]: res.passcode as string }));
      setView({ kind: "created", link: res.link, passcode: res.passcode });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const update = async (link: ShareLinkView, values: Parameters<typeof updateShareLinkAction>[1]) => {
    setSaving(true);
    try {
      const res = await updateShareLinkAction(link.id, values);
      if (res.success === false) {
        toast.error(res.error);
        return;
      }
      if (res.passcode) setPasscodes((prev) => ({ ...prev, [link.id]: res.passcode as string }));
      triggerToast("Link saved");
      setView(res.passcode ? { kind: "created", link: res.link, passcode: res.passcode } : { kind: "list" });
      if (link.isPrimary) await reloadAndSyncPrimary();
      else await load();
    } finally {
      setSaving(false);
    }
  };

  const title =
    view.kind === "create" ? "New Link" : view.kind === "edit" ? "Edit Link" : view.kind === "created" ? "Link Ready" : "Share Links";
  const titleIcon =
    view.kind === "create" ? (
      <Plus className="size-5" />
    ) : view.kind === "edit" ? (
      <Pencil className="size-5" />
    ) : view.kind === "created" ? (
      <Check className="size-5" />
    ) : (
      <Link2 className="size-5" />
    );
  const description =
    view.kind === "create"
      ? "Set who it's for and what they can do."
      : view.kind === "edit"
        ? "Change this link's access and settings."
        : view.kind === "created"
          ? "Your link is ready to send."
          : "Give each person their own link and see who opened it.";

  // The create / edit forms keep their own buttons; the list and "created" views use the footer.
  let footer: ReactNode = null;
  if (view.kind === "created") {
    const createdView = view;
    footer = (
      <>
        <UniversalDialogAction intent="secondary" onClick={() => setView({ kind: "list" })}>
          Back to Links
        </UniversalDialogAction>
        <UniversalDialogAction
          intent="primary"
          onClick={async () => {
            const passcode = createdView.passcode;
            const url = shareLinkUrl(createdView.link.token);
            await navigator.clipboard.writeText(passcode ? `Review link: ${url}\nPasscode: ${passcode}` : url);
            triggerToast(passcode ? "Link and passcode copied" : "Link copied");
          }}
          icon={<Copy />}
        >
          {createdView.passcode ? "Copy Link & Passcode" : "Copy Link"}
        </UniversalDialogAction>
      </>
    );
  } else if (view.kind === "list") {
    footer = (
      <>
        <UniversalDialogAction intent="secondary" onClick={() => onOpenChange(false)}>
          Close
        </UniversalDialogAction>
        {canManage && (
          <UniversalDialogAction
            intent="primary"
            disabled={links === null || atLimit}
            onClick={() => setView({ kind: "create" })}
            title={atLimit ? "Your plan's link limit for this delivery is reached" : undefined}
            icon={<Plus />}
          >
            New Link
          </UniversalDialogAction>
        )}
      </>
    );
  }

  return (
    <UniversalDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      size="lg"
      badge={
        <TypographySpan className="text-[11px] font-bold text-primary uppercase tracking-wider block">
          {projectTitle}
        </TypographySpan>
      }
      icon={titleIcon}
      title={title}
      description={description}
      bodyClassName="space-y-4"
      footer={footer}
    >
      {view.kind === "create" && (
        <ShareLinkForm plan={plan} saving={saving} upgradeHref={upgradeHref} onCancel={() => setView({ kind: "list" })} onCreate={create} />
      )}

      {view.kind === "edit" && (
        <ShareLinkForm
          link={view.link}
          plan={plan}
          saving={saving}
          upgradeHref={upgradeHref}
          onCancel={() => setView({ kind: "list" })}
          onUpdate={(values) => update(view.link, values)}
        />
      )}

      {view.kind === "created" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
            <TypographySpan className="text-xs font-bold text-white block">{view.link.label}</TypographySpan>
            <div className="flex items-center gap-2 rounded-xl bg-black/60 border border-white/10 px-3 py-2">
              <Link2 className="size-3.5 text-primary shrink-0" />
              <span className="text-[11px] text-white truncate flex-1">{shareLinkUrl(view.link.token)}</span>
            </div>
            {view.passcode && (
              <div className="flex items-center gap-2 rounded-xl bg-black/60 border border-white/10 px-3 py-2">
                <Key className="size-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] text-white truncate flex-1">{view.passcode}</span>
              </div>
            )}
            {view.passcode && !view.link.canShowPasscode && (
              <TypographyMuted className="text-[10px] text-amber-300">
                You typed this passcode yourself, so it&apos;s only shown now. Copy it before you close this.
              </TypographyMuted>
            )}
          </div>
        </div>
      )}

      {view.kind === "list" && (
        <>
          <div className="flex items-center justify-between gap-3">
            <TypographyMuted className="text-[11px] text-muted-foreground">
              {links === null
                ? "Loading links..."
                : limit === -1
                  ? `${unrevoked} active link${unrevoked === 1 ? "" : "s"}`
                  : `${unrevoked} of ${limit} link${limit === 1 ? "" : "s"} on your plan`}
            </TypographyMuted>
          </div>

          {!canManage && links !== null && (
            <div className="flex items-start gap-2 text-[11px] text-neutral-300 bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
              <Lock className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <span>Only workspace admins can create or change links. You can still copy and send them.</span>
            </div>
          )}
          {atLimit && canManage && upgradeHref && (
            <TypographyMuted className="text-[11px] text-amber-300">
              You&apos;ve used every link your plan includes for this delivery.{" "}
              <Link href={upgradeHref} className="text-primary hover:underline">
                Upgrade
              </Link>{" "}
              to give each person their own link, or turn one off.
            </TypographyMuted>
          )}
          {loadError && <TypographyMuted className="text-[11px] text-red-400">{loadError}</TypographyMuted>}

          <div className="space-y-2.5">
            {(links ?? []).map((link) => {
              const busy = busyId === link.id;
              const off = link.status === "revoked";
              return (
                <div
                  key={link.id}
                  className={`rounded-2xl border p-3.5 space-y-2 ${off ? "border-white/5 bg-white/[0.02] opacity-70" : "border-white/10 bg-black/40"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <TypographySpan className="text-xs font-bold text-white truncate">{link.label}</TypographySpan>
                        {link.isPrimary && (
                          <Badge variant="orange" className="text-[9px] px-1.5 py-0 font-bold shrink-0">
                            MAIN
                          </Badge>
                        )}
                        {statusChip(link)}
                      </div>
                      {link.recipientName || link.recipientEmail ? (
                        <TypographyMuted className="text-[10px] text-muted-foreground truncate">
                          For {link.recipientName || link.recipientEmail}
                        </TypographyMuted>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={off}
                        onClick={() => copy(link)}
                        title="Copy link"
                        className="text-muted-foreground hover:text-white"
                      >
                        {copiedId === link.id ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={off}
                        onClick={() => setSendFor(sendFor === link.id ? null : link.id)}
                        title="Send"
                        className="text-muted-foreground hover:text-white"
                      >
                        <Mail className="size-3.5" />
                      </Button>
                      {canManage && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setView({ kind: "edit", link })}
                          title="Edit"
                          className="text-muted-foreground hover:text-white"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            disabled={busy}
                            aria-label={`More actions for ${link.label}`}
                            className="text-muted-foreground hover:text-white"
                          >
                            {busy ? <RefreshCw className="size-3.5 animate-spin" /> : <MoreHorizontal className="size-3.5" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
                          {link.hasPasscode && link.canShowPasscode && canManage && (
                            <>
                              <DropdownMenuItem onClick={() => reveal(link)} className="text-xs gap-2 cursor-pointer">
                                <Key className="size-3.5" /> Show passcode
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => copy(link, true)} className="text-xs gap-2 cursor-pointer">
                                <Copy className="size-3.5" /> Copy link & passcode
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem onClick={() => showActivity(link)} className="text-xs gap-2 cursor-pointer">
                            <Activity className="size-3.5" /> Activity
                          </DropdownMenuItem>
                          {canManage && (
                            <>
                              <DropdownMenuSeparator />
                              {!link.isPrimary && !off && (
                                <DropdownMenuItem
                                  onClick={() => run(link, () => makePrimaryShareLinkAction(link.id), "This is now the main link", true)}
                                  className="text-xs gap-2 cursor-pointer"
                                >
                                  <Star className="size-3.5" /> Make main link
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                disabled={atLimit}
                                onClick={() => run(link, () => duplicateShareLinkAction(link.id), "Link copied as a new link")}
                                className="text-xs gap-2 cursor-pointer"
                              >
                                <CopyPlus className="size-3.5" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  if (!window.confirm(`Give "${link.label}" a new URL? Everyone with the current one loses access.`)) return;
                                  void run(link, () => regenerateShareLinkTokenAction(link.id), "New URL made. The old one no longer works.", link.isPrimary);
                                }}
                                className="text-xs gap-2 cursor-pointer"
                              >
                                <RefreshCw className="size-3.5" /> New URL
                              </DropdownMenuItem>
                              {!link.isPrimary &&
                                (off ? (
                                  <DropdownMenuItem
                                    onClick={() => run(link, () => restoreShareLinkAction(link.id), "Link turned back on")}
                                    className="text-xs gap-2 cursor-pointer"
                                  >
                                    <Power className="size-3.5" /> Turn back on
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => run(link, () => revokeShareLinkAction(link.id), "Link turned off. Its URL no longer works.")}
                                    className="text-xs gap-2 cursor-pointer text-amber-300"
                                  >
                                    <Power className="size-3.5" /> Turn off
                                  </DropdownMenuItem>
                                ))}
                              {!link.isPrimary && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (!window.confirm(`Delete "${link.label}"? Its URL stops working and it's removed from your links. Comments made through it stay.`)) return;
                                    void run(link, () => deleteShareLinkAction(link.id), "Link deleted");
                                  }}
                                  className="text-xs gap-2 cursor-pointer text-red-400"
                                >
                                  <Trash2 className="size-3.5" /> Delete
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                    {link.hasPasscode && (
                      <span className="inline-flex items-center gap-1">
                        <Lock className="size-3" /> Passcode
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 ${link.canComment ? "" : "line-through opacity-60"}`}>
                      <MessageCircle className="size-3" /> Comments
                    </span>
                    <span className={`inline-flex items-center gap-1 ${link.canApprove ? "" : "line-through opacity-60"}`}>
                      <ThumbsUp className="size-3" /> Approve
                    </span>
                    <span className={`inline-flex items-center gap-1 ${link.canDownload ? "text-white" : "line-through opacity-60"}`}>
                      <Download className="size-3" /> Downloads
                    </span>
                  </div>

                  <TypographyMuted className="text-[10px] text-neutral-400">
                    {link.openCount > 0
                      ? `Opened ${link.openCount}× · last ${timeAgo(link.lastOpenedAt)}${
                          link.downloadCount > 0 ? ` · ${link.downloadCount} download${link.downloadCount === 1 ? "" : "s"}` : ""
                        }`
                      : "Not opened yet"}
                  </TypographyMuted>

                  {passcodes[link.id] && (
                    <div className="flex items-center gap-2 rounded-xl bg-black/60 border border-white/10 px-3 py-1.5">
                      <Key className="size-3 text-amber-400 shrink-0" />
                      <span className="text-[11px] text-white truncate flex-1">{passcodes[link.id]}</span>
                    </div>
                  )}

                  {sendFor === link.id && (
                    <SendPanel
                      deliveryId={deliveryId}
                      link={link}
                      defaultEmail={link.recipientEmail || clientEmail || ""}
                      defaultPhone={clientPhone || ""}
                      canWhatsApp={canWhatsApp}
                      onSent={(msg) => {
                        triggerToast(msg);
                        setSendFor(null);
                      }}
                    />
                  )}

                  {activityFor === link.id && (
                    <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 space-y-1">
                      {activity === null ? (
                        <TypographyMuted className="text-[10px] text-muted-foreground">Loading activity...</TypographyMuted>
                      ) : activity.length === 0 ? (
                        <TypographyMuted className="text-[10px] text-muted-foreground">Nothing yet.</TypographyMuted>
                      ) : (
                        activity.slice(0, 12).map((event) => (
                          <div key={event.id} className="flex items-center justify-between text-[10px]">
                            <span className={event.kind === "unlock_failed" ? "text-amber-300" : "text-neutral-300"}>
                              {ACTIVITY_LABELS[event.kind] ?? event.kind}
                              {event.country ? ` · ${event.country}` : ""}
                            </span>
                            <span className="text-muted-foreground">{timeAgo(event.createdAt)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <TypographyMuted className="text-[10px] text-muted-foreground">
            The main link is the one emails and copy buttons use. Give each person their own link to see who opened it and
            to turn one off without affecting the others.
          </TypographyMuted>
        </>
      )}
    </UniversalDialog>
  );
}

function SendPanel({
  deliveryId,
  link,
  defaultEmail,
  defaultPhone,
  canWhatsApp,
  onSent,
}: {
  deliveryId: string;
  link: ShareLinkView;
  defaultEmail: string;
  defaultPhone: string;
  canWhatsApp: boolean;
  onSent: (message: string) => void;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(defaultPhone);
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState<"email" | "whatsapp" | null>(null);

  const sendEmail = async () => {
    if (!email.trim()) {
      toast.error("Enter an email address.");
      return;
    }
    setSending("email");
    try {
      const res = await sendDeliveryEmailAction(deliveryId, email.trim(), undefined, link.id);
      if (res.success) onSent(`“${link.label}” emailed to ${email.trim()}`);
      else toast.error(res.error || "Couldn't send the email.");
    } finally {
      setSending(null);
    }
  };

  const sendWhatsApp = async () => {
    if (!phone.trim()) {
      toast.error("Enter the WhatsApp number.");
      return;
    }
    if (!consent) {
      toast.error("Confirm they agreed to get WhatsApp messages first.");
      return;
    }
    setSending("whatsapp");
    try {
      const res = await sendDeliveryWhatsAppAction(deliveryId, { phone: phone.trim(), clientConsent: true, linkId: link.id });
      if (res.success) onSent(`“${link.label}” sent on WhatsApp to ${res.sentTo}`);
      else toast.error(res.error || "Couldn't send the WhatsApp message.");
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="client@company.com"
          aria-label="Email address"
          className="flex-1 bg-black/60 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
        <Button
          type="button"
          size="sm"
          disabled={sending !== null}
          onClick={sendEmail}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs h-auto py-1.5 px-3 rounded-lg"
        >
          {sending === "email" ? "Sending..." : "Email"}
        </Button>
      </div>
      {canWhatsApp && (
        <>
          <div className="flex gap-2">
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+971 50 123 4567"
              aria-label="WhatsApp number"
              className="flex-1 bg-black/60 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
            <Button
              type="button"
              size="sm"
              disabled={sending !== null || !consent}
              onClick={sendWhatsApp}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs h-auto py-1.5 px-3 rounded-lg disabled:opacity-50"
            >
              {sending === "whatsapp" ? "Sending..." : "WhatsApp"}
            </Button>
          </div>
          <label className="flex items-start gap-2 text-[11px] text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-emerald-500" />
            <span>They agreed to get WhatsApp messages from CineSpace about this delivery.</span>
          </label>
        </>
      )}
      {link.hasPasscode && (
        <TypographyMuted className="text-[10px] text-amber-300/90">
          The passcode isn&apos;t included. Share it with them separately.
        </TypographyMuted>
      )}
    </div>
  );
}
