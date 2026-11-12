"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Bell, CheckCheck, Clock, Loader2, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useOptionalEntitlements } from "@/components/providers/entitlements-provider";
import {
  TypographyH1,
  TypographyH3,
  TypographyKicker,
  TypographyLead,
  TypographyMuted,
  TypographySmall,
  TypographySpan,
} from "@/components/ui/typography";
import type { NotificationLog } from "@/core/entities/notification";
import type { WhatsAppNumberView } from "@/core/entities/workspace-settings";
import {
  getWorkspaceNotificationLogsAction,
  getWorkspaceSettingsAction,
  updateWorkspaceNotificationSettingsAction,
} from "@/app/actions/settings";
import {
  confirmWhatsAppVerificationAction,
  removeWhatsAppNumberAction,
  startWhatsAppVerificationAction,
} from "@/app/actions/whatsapp";
import { maskPhone } from "@/lib/phone";

type PrefKey =
  | "notifyApprovals"
  | "notifyComments"
  | "notifyDownloads"
  | "whatsappNotifyApprovals"
  | "whatsappNotifyComments"
  | "whatsappNotifyDownloads"
  | "whatsappEnabled";

type Prefs = Record<PrefKey, boolean>;

const DEFAULT_PREFS: Prefs = {
  notifyApprovals: true,
  notifyComments: true,
  notifyDownloads: true,
  whatsappNotifyApprovals: true,
  whatsappNotifyComments: true,
  whatsappNotifyDownloads: true,
  whatsappEnabled: true,
};

const NO_WHATSAPP: WhatsAppNumberView = {
  available: false,
  canManage: false,
  verifiedNumber: null,
  verifiedAt: null,
  unverifiedNumber: null,
  pendingNumber: null,
  pendingExpiresAt: null,
};

const ALERTS: {
  label: string;
  description: string;
  email: PrefKey;
  whatsapp: PrefKey;
  pro?: boolean;
}[] = [
  {
    label: "Cut approvals",
    description: "A client approves a cut, or every file in a delivery.",
    email: "notifyApprovals",
    whatsapp: "whatsappNotifyApprovals",
  },
  {
    label: "Comments",
    description:
      "A client leaves a note or a reply. On WhatsApp they're grouped: one message when a client starts commenting, then one with the rest once they pause.",
    email: "notifyComments",
    whatsapp: "whatsappNotifyComments",
  },
  {
    label: "Downloads",
    description: "A client downloads files from a delivery that has download alerts on.",
    email: "notifyDownloads",
    whatsapp: "whatsappNotifyDownloads",
    pro: true,
  },
];

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "Recently";
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
}

function recipientLabel(log: NotificationLog): string {
  if (log.recipientEmail) return log.recipientEmail;
  if (log.recipientPhone) return maskPhone(log.recipientPhone.replace(/\D/g, ""));
  return "Recipient";
}

export default function NotificationsPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "studio";
  const entitlements = useOptionalEntitlements();
  const canNotifyDownloads = entitlements?.can.receiveDownloadNotifications ?? true;
  const canWhatsApp = entitlements?.can.sendWhatsApp ?? true;

  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [whatsapp, setWhatsApp] = useState<WhatsAppNumberView>(NO_WHATSAPP);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [settingsRes, logsRes] = await Promise.all([
          getWorkspaceSettingsAction(workspaceSlug),
          getWorkspaceNotificationLogsAction(workspaceSlug),
        ]);
        if (!mounted) return;
        if (settingsRes.success && settingsRes.data) {
          const s = settingsRes.data;
          setPrefs({
            notifyApprovals: s.notifyApprovals,
            notifyComments: s.notifyComments,
            notifyDownloads: s.notifyDownloads,
            whatsappNotifyApprovals: s.whatsappNotifyApprovals,
            whatsappNotifyComments: s.whatsappNotifyComments,
            whatsappNotifyDownloads: s.whatsappNotifyDownloads,
            whatsappEnabled: s.whatsappEnabled,
          });
          setWhatsApp(s.whatsapp);
        }
        if (logsRes.success && logsRes.data) setLogs(logsRes.data);
      } catch (err) {
        console.warn("[NotificationsPage] Error loading settings/logs:", err);
      } finally {
        if (mounted) {
          setIsLoadingSettings(false);
          setIsLoadingLogs(false);
        }
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [workspaceSlug]);

  const canManage = whatsapp.canManage;
  const whatsappReady = whatsapp.available && canWhatsApp && Boolean(whatsapp.verifiedNumber) && prefs.whatsappEnabled;

  const setPref = async (key: PrefKey, checked: boolean, message: string) => {
    setPrefs((p) => ({ ...p, [key]: checked }));
    const res = await updateWorkspaceNotificationSettingsAction(workspaceSlug, { [key]: checked });
    if (res.success) {
      toast.success(message);
    } else {
      setPrefs((p) => ({ ...p, [key]: !checked }));
      toast.error(res.error || "Couldn't save that change.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="pb-6 border-b border-border">
        <TypographyKicker className="text-xs text-primary uppercase tracking-wider mb-1 block">
          Studio Settings
        </TypographyKicker>
        <TypographyH1 className="text-3xl font-bold font-heading text-foreground">Notifications</TypographyH1>
        <TypographyLead className="text-sm text-muted-foreground mt-1">
          Choose how CineSpace tells your studio about client activity: by email to the workspace owners and
          admins, and on WhatsApp to your studio&apos;s number.
        </TypographyLead>
      </div>

      {/* Alerts: one row per event, a switch per channel */}
      <div className="rounded-2xl bg-card border border-border shadow-sm">
        <div className="px-6 pt-5 pb-3 flex items-end justify-between gap-4 border-b border-border">
          <TypographyH3 className="text-base font-bold font-heading text-card-foreground">Client activity</TypographyH3>
          <div className="flex shrink-0 gap-6 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="w-14 flex items-center justify-center gap-1">
              <Mail className="size-3.5" /> Email
            </span>
            <span className="w-14 flex items-center justify-center gap-1">
              <MessageCircle className="size-3.5" /> WhatsApp
            </span>
          </div>
        </div>

        <div className="divide-y divide-border">
          {ALERTS.map((alert) => {
            const locked = alert.pro && !canNotifyDownloads;
            return (
              <div key={alert.label} className="px-6 py-5 flex items-center justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <TypographySmall className="text-sm font-bold font-heading text-card-foreground">
                      {alert.label}
                    </TypographySmall>
                    {locked && (
                      <Badge variant="orange" className="text-[9px] px-1.5 py-0.5 font-bold">
                        PRO
                      </Badge>
                    )}
                  </div>
                  <TypographyMuted className="text-xs text-muted-foreground">{alert.description}</TypographyMuted>
                  {locked && (
                    <Link
                      href={`/${workspaceSlug}/subscription`}
                      className="text-[10px] text-primary hover:underline block pt-0.5"
                    >
                      Upgrade to Pro for download alerts &rarr;
                    </Link>
                  )}
                </div>
                <div className="flex shrink-0 gap-6">
                  <div className="w-14 flex justify-center">
                    <Switch
                      disabled={isLoadingSettings || !canManage || locked}
                      checked={!locked && prefs[alert.email]}
                      onCheckedChange={(checked) =>
                        setPref(alert.email, checked, `${alert.label} emails ${checked ? "on" : "off"}`)
                      }
                      aria-label={`${alert.label} by email`}
                    />
                  </div>
                  <div className="w-14 flex justify-center">
                    <Switch
                      disabled={isLoadingSettings || !canManage || locked || !whatsappReady}
                      checked={!locked && whatsappReady && prefs[alert.whatsapp]}
                      onCheckedChange={(checked) =>
                        setPref(alert.whatsapp, checked, `${alert.label} on WhatsApp ${checked ? "on" : "off"}`)
                      }
                      aria-label={`${alert.label} on WhatsApp`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-border space-y-1">
          {!isLoadingSettings && !whatsappReady && (
            <TypographyMuted className="text-[11px] text-muted-foreground">
              {!whatsapp.available
                ? "WhatsApp alerts aren't switched on for CineSpace yet. Email alerts work as usual."
                : !canWhatsApp
                  ? "WhatsApp alerts come with the Basic, Pro and Studio plans."
                  : whatsapp.verifiedNumber
                    ? "WhatsApp alerts are paused. Turn them back on below."
                    : "Verify your studio's WhatsApp number below to get these alerts on WhatsApp."}
            </TypographyMuted>
          )}
          {!isLoadingSettings && !canManage && (
            <TypographyMuted className="text-[11px] text-muted-foreground">
              Only workspace admins and owners can change notifications.
            </TypographyMuted>
          )}
        </div>
      </div>

      <WhatsAppNumberCard
        workspaceSlug={workspaceSlug}
        loading={isLoadingSettings}
        planAllows={canWhatsApp}
        whatsapp={whatsapp}
        onChange={setWhatsApp}
        alertsOn={prefs.whatsappEnabled}
        onAlertsOnChange={(checked) =>
          setPref("whatsappEnabled", checked, checked ? "WhatsApp alerts resumed" : "WhatsApp alerts paused")
        }
        onVerified={() => setPrefs((p) => ({ ...p, whatsappEnabled: true }))}
      />

      <NotificationLogList logs={logs} loading={isLoadingLogs} />
    </div>
  );
}

function WhatsAppNumberCard({
  workspaceSlug,
  loading,
  planAllows,
  whatsapp,
  onChange,
  alertsOn,
  onAlertsOnChange,
  onVerified,
}: {
  workspaceSlug: string;
  loading: boolean;
  planAllows: boolean;
  whatsapp: WhatsAppNumberView;
  onChange: (next: WhatsAppNumberView) => void;
  alertsOn: boolean;
  onAlertsOnChange: (checked: boolean) => void;
  onVerified: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<null | "send" | "verify" | "remove">(null);
  const [resendLocked, setResendLocked] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const usable = whatsapp.available && planAllows;
  const canEdit = usable && whatsapp.canManage;
  const showForm = canEdit && (editing || !whatsapp.verifiedNumber);
  const awaitingCode = showForm && Boolean(whatsapp.pendingNumber);

  const sendCode = async (number: string) => {
    if (!number.trim()) {
      toast.error("Enter your studio's WhatsApp number.");
      return;
    }
    setBusy("send");
    const res = await startWhatsAppVerificationAction(workspaceSlug, number);
    setBusy(null);
    if (!res.success) {
      toast.error(res.error || "Couldn't send the code.");
      return;
    }
    onChange({
      ...whatsapp,
      pendingNumber: res.pendingNumber,
      pendingExpiresAt: new Date(Date.now() + res.expiresInMinutes * 60_000).toISOString(),
    });
    setCode("");
    setResendLocked(true);
    setTimeout(() => setResendLocked(false), 30_000);
    toast.success(`Code sent to ${res.pendingNumber} on WhatsApp`);
  };

  const verify = async () => {
    if (code.replace(/\D/g, "").length !== 6) {
      toast.error("Enter the 6-digit code.");
      return;
    }
    setBusy("verify");
    const res = await confirmWhatsAppVerificationAction(workspaceSlug, code);
    setBusy(null);
    if (!res.success) {
      toast.error(res.error || "Couldn't check the code.");
      return;
    }
    onChange({
      ...whatsapp,
      verifiedNumber: res.verifiedNumber,
      verifiedAt: new Date().toISOString(),
      unverifiedNumber: null,
      pendingNumber: null,
      pendingExpiresAt: null,
    });
    onVerified();
    setEditing(false);
    setPhone("");
    setCode("");
    toast.success("WhatsApp number verified. Alerts will go there.");
  };

  const remove = async () => {
    setBusy("remove");
    const res = await removeWhatsAppNumberAction(workspaceSlug);
    setBusy(null);
    setConfirmRemove(false);
    if (!res.success) {
      toast.error(res.error || "Couldn't remove the number.");
      return;
    }
    onChange({ ...whatsapp, verifiedNumber: null, verifiedAt: null, unverifiedNumber: null, pendingNumber: null, pendingExpiresAt: null });
    setEditing(false);
    toast.success("WhatsApp number removed");
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-6 space-y-5 shadow-sm">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <MessageCircle className={`size-4 ${usable ? "text-emerald-400" : "text-muted-foreground"}`} />
          <TypographyH3 className="text-base font-bold font-heading text-card-foreground">
            Studio WhatsApp number
          </TypographyH3>
          {!planAllows && (
            <Badge variant="orange" className="text-[9px] px-1.5 py-0.5 font-bold">
              BASIC
            </Badge>
          )}
        </div>
        <TypographyMuted className="text-xs text-muted-foreground">
          Alerts come from the CineSpace WhatsApp account. We check the number with a one-time code first, so
          they only reach a phone your studio controls.
        </TypographyMuted>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" /> Loading…
        </div>
      ) : !whatsapp.available ? (
        <div className="rounded-xl bg-muted/40 border border-border/60 p-4 text-xs text-muted-foreground">
          WhatsApp isn&apos;t switched on for CineSpace yet. Email alerts work as usual.
        </div>
      ) : !planAllows ? (
        <Link href={`/${workspaceSlug}/subscription`} className="text-xs text-primary hover:underline">
          Upgrade to Basic or higher for WhatsApp alerts &rarr;
        </Link>
      ) : (
        <>
          {whatsapp.verifiedNumber && !editing && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <ShieldCheck className="size-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground tabular-nums">{whatsapp.verifiedNumber}</div>
                  <div className="text-[11px] text-muted-foreground">Verified</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch
                    disabled={!whatsapp.canManage}
                    checked={alertsOn}
                    onCheckedChange={onAlertsOnChange}
                    aria-label="Send alerts to this number"
                  />
                  {alertsOn ? "Alerts on" : "Alerts paused"}
                </label>
                {whatsapp.canManage &&
                  (confirmRemove ? (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="destructive" disabled={busy === "remove"} onClick={remove}>
                        {busy === "remove" ? <Loader2 className="size-3 animate-spin" /> : "Remove"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(false)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                        Change
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(true)}>
                        Remove
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {!whatsapp.verifiedNumber && !whatsapp.canManage && (
            <TypographyMuted className="text-xs text-muted-foreground">
              No number yet. An admin or owner can add one.
            </TypographyMuted>
          )}

          {showForm && !awaitingCode && (
            <div className="space-y-2">
              {whatsapp.unverifiedNumber && (
                <TypographyMuted className="text-xs text-muted-foreground">
                  The number saved earlier ({whatsapp.unverifiedNumber}) was never verified, so it doesn&apos;t get
                  alerts. Enter it again to verify it.
                </TypographyMuted>
              )}
              <form
                className="flex flex-col sm:flex-row gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendCode(phone);
                }}
              >
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+971 50 123 4567"
                  value={phone}
                  disabled={busy !== null}
                  onChange={(e) => setPhone(e.target.value)}
                  className="sm:w-56"
                  aria-label="WhatsApp number"
                />
                <Button type="submit" size="sm" disabled={busy !== null} className="h-8">
                  {busy === "send" ? <Loader2 className="size-3 animate-spin" /> : "Send code"}
                </Button>
                {editing && (
                  <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                )}
              </form>
              <TypographyMuted className="text-[11px] text-muted-foreground">
                Include the country code. We&apos;ll send a 6-digit code to this number on WhatsApp.
              </TypographyMuted>
            </div>
          )}

          {awaitingCode && (
            <div className="space-y-2">
              <TypographyMuted className="text-xs text-muted-foreground">
                Enter the 6-digit code we sent to <span className="text-foreground tabular-nums">{whatsapp.pendingNumber}</span>{" "}
                on WhatsApp. It&apos;s valid for 10 minutes.
              </TypographyMuted>
              <form
                className="flex flex-col sm:flex-row gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  verify();
                }}
              >
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  disabled={busy !== null}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="sm:w-32 tracking-[0.3em] tabular-nums"
                  aria-label="Verification code"
                />
                <Button type="submit" size="sm" disabled={busy !== null} className="h-8">
                  {busy === "verify" ? <Loader2 className="size-3 animate-spin" /> : "Verify"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  disabled={busy !== null || resendLocked || !phone.trim()}
                  onClick={() => sendCode(phone)}
                >
                  Resend code
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  disabled={busy !== null}
                  onClick={() => {
                    onChange({ ...whatsapp, pendingNumber: null, pendingExpiresAt: null });
                    setCode("");
                  }}
                >
                  Use another number
                </Button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NotificationLogList({ logs, loading }: { logs: NotificationLog[]; loading: boolean }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-6 space-y-3 shadow-sm">
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
        <span>Recent notifications</span>
        <span className="text-[11px] font-normal normal-case">{logs.length} logged</span>
      </div>

      {loading ? (
        <div className="py-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" /> Loading history…
        </div>
      ) : logs.length === 0 ? (
        <div className="py-8 text-center rounded-xl bg-muted/40 border border-border/60 p-6 space-y-1">
          <Bell className="size-5 text-muted-foreground mx-auto mb-2 opacity-50" />
          <TypographySmall className="text-xs font-semibold text-foreground">Nothing sent yet</TypographySmall>
          <TypographyMuted className="text-[11px] text-muted-foreground">
            Emails and WhatsApp messages about client approvals, comments and downloads will show up here.
          </TypographyMuted>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {logs.map((log) => {
            const isEmail = log.channel === "email";
            const ok = log.status === "delivered" || log.status === "sent";
            return (
              <div key={log.id} className="py-3 flex items-center justify-between text-xs first:pt-0 last:pb-0 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-muted border border-border shrink-0">
                    {isEmail ? (
                      <Mail className="size-3.5 text-primary" />
                    ) : (
                      <MessageCircle className="size-3.5 text-emerald-400" />
                    )}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-semibold text-foreground truncate">
                      {log.subject || (isEmail ? "Studio notification" : "WhatsApp message")}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{recipientLabel(log)}</div>
                    {log.status === "failed" && log.errorMessage && (
                      <div className="text-[11px] text-destructive truncate">{log.errorMessage}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-[11px] text-muted-foreground">
                  <TypographySpan>{formatRelativeTime(log.createdAt)}</TypographySpan>
                  <TypographySpan
                    className={`flex items-center gap-1 font-semibold ${
                      ok ? "text-emerald-400" : log.status === "failed" ? "text-destructive" : "text-amber-400"
                    }`}
                  >
                    {ok ? <CheckCheck className="size-3.5" /> : <Clock className="size-3.5" />}
                    <span className="capitalize">{log.status}</span>
                  </TypographySpan>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
