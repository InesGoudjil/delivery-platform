"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Bell,
  MessageCircle,
  Mail,
  CheckCheck,
  Send,
  Smartphone,
  Sparkles,
  Loader2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  TypographyH1,
  TypographyH3,
  TypographyLead,
  TypographyMuted,
  TypographyKicker,
  TypographySmall,
  TypographySpan,
} from "@/components/ui/typography";
import { NotificationLog } from "@/core/entities/notification";
import {
  getWorkspaceSettingsAction,
  updateWorkspaceNotificationSettingsAction,
  getWorkspaceNotificationLogsAction,
} from "@/app/actions/settings";

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

export default function NotificationsPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "studio";

  // Notification Preferences State
  const [notifyApproval, setNotifyApproval] = useState(true);
  const [notifyComments, setNotifyComments] = useState(true);
  const [notifyDownloads, setNotifyDownloads] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [whatsAppNumber, setWhatsAppNumber] = useState("");
  const [whatsAppEnabled, setWhatsAppEnabled] = useState(true);

  // Async & Logs State
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // Load persisted settings and real logs on mount
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [settingsRes, logsRes] = await Promise.all([
          getWorkspaceSettingsAction(workspaceSlug),
          getWorkspaceNotificationLogsAction(workspaceSlug),
        ]);

        if (mounted) {
          if (settingsRes.success && settingsRes.data) {
            setNotifyApproval(settingsRes.data.notifyApprovals);
            setNotifyComments(settingsRes.data.notifyComments);
            setNotifyDownloads(settingsRes.data.notifyDownloads);
            setWeeklyDigest(settingsRes.data.weeklyDigest);
            setWhatsAppNumber(settingsRes.data.whatsappNumber || "");
            setWhatsAppEnabled(settingsRes.data.whatsappEnabled);
          }
          setIsLoadingSettings(false);

          if (logsRes.success && logsRes.data) {
            setLogs(logsRes.data);
          }
          setIsLoadingLogs(false);
        }
      } catch (err) {
        console.warn("[NotificationsPage] Error loading settings/logs:", err);
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

  // Generic toggle persistence handler
  const handleTogglePreference = async (
    key: "notifyApprovals" | "notifyComments" | "notifyDownloads" | "weeklyDigest",
    checked: boolean,
    label: string
  ) => {
    // 1. Optimistic UI update
    if (key === "notifyApprovals") setNotifyApproval(checked);
    if (key === "notifyComments") setNotifyComments(checked);
    if (key === "notifyDownloads") setNotifyDownloads(checked);
    if (key === "weeklyDigest") setWeeklyDigest(checked);

    // 2. Persist to DB
    const res = await updateWorkspaceNotificationSettingsAction(workspaceSlug, {
      [key]: checked,
    });

    if (res.success) {
      toast.success(checked ? `${label} alerts enabled` : `${label} alerts disabled`);
    } else {
      // Revert on failure
      if (key === "notifyApprovals") setNotifyApproval(!checked);
      if (key === "notifyComments") setNotifyComments(!checked);
      if (key === "notifyDownloads") setNotifyDownloads(!checked);
      if (key === "weeklyDigest") setWeeklyDigest(!checked);
      toast.error(res.error || "Failed to update notification preference");
    }
  };

  // WhatsApp number update
  const handleUpdateWhatsAppNumber = async () => {
    const trimmed = whatsAppNumber.trim();
    if (!trimmed) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setIsUpdatingPhone(true);
    const res = await updateWorkspaceNotificationSettingsAction(workspaceSlug, {
      whatsappNumber: trimmed,
      whatsappEnabled: true,
    });
    setIsUpdatingPhone(false);

    if (res.success) {
      toast.success("WhatsApp delivery number updated and verified");
    } else {
      toast.error(res.error || "Failed to update WhatsApp number");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-border">
        <TypographyKicker className="text-xs text-primary uppercase tracking-wider mb-1 block">
          Studio Settings
        </TypographyKicker>
        <TypographyH1 className="text-3xl font-bold font-heading text-foreground">
          Notifications &amp; WhatsApp
        </TypographyH1>
        <TypographyLead className="text-sm text-muted-foreground mt-1">
          Configure real-time client feedback alerts, approval notifications, and delivery logs.
        </TypographyLead>
      </div>

      {/* Notification Preferences */}
      <div className="rounded-2xl bg-card border border-border divide-y divide-border shadow-sm">
        {/* Client Approvals */}
        <div className="p-6 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <TypographySmall className="text-sm font-bold font-heading text-card-foreground">
              Client Cut Approvals
            </TypographySmall>
            <TypographyMuted className="text-xs text-muted-foreground">
              Receive an immediate WhatsApp message and email when a client approves a cut.
            </TypographyMuted>
          </div>
          <Switch
            disabled={isLoadingSettings}
            checked={notifyApproval}
            onCheckedChange={(checked) =>
              handleTogglePreference("notifyApprovals", checked, "Client cut approval")
            }
            aria-label="Toggle Client Cut Approvals"
          />
        </div>

        {/* New Comments */}
        <div className="p-6 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <TypographySmall className="text-sm font-bold font-heading text-card-foreground">
              New Timecoded Notes &amp; Comments
            </TypographySmall>
            <TypographyMuted className="text-xs text-muted-foreground">
              Notify when a client pauses and leaves timestamped review notes on a scene.
            </TypographyMuted>
          </div>
          <Switch
            disabled={isLoadingSettings}
            checked={notifyComments}
            onCheckedChange={(checked) =>
              handleTogglePreference("notifyComments", checked, "Timecoded notes & comments")
            }
            aria-label="Toggle New Timecoded Notes & Comments"
          />
        </div>

        {/* Master File Downloads */}
        <div className="p-6 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <TypographySmall className="text-sm font-bold font-heading text-card-foreground">
              Master File Download Alerts
            </TypographySmall>
            <TypographyMuted className="text-xs text-muted-foreground">
              Get notified when a client initiates a full ProRes master file download.
            </TypographyMuted>
          </div>
          <Switch
            disabled={isLoadingSettings}
            checked={notifyDownloads}
            onCheckedChange={(checked) =>
              handleTogglePreference("notifyDownloads", checked, "Master file download")
            }
            aria-label="Toggle Master File Download Alerts"
          />
        </div>

        {/* Weekly Digest */}
        <div className="p-6 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <TypographySmall className="text-sm font-bold font-heading text-card-foreground">
              Weekly Studio Activity Summary
            </TypographySmall>
            <TypographyMuted className="text-xs text-muted-foreground">
              A consolidated email digest of client views, stream minutes, and approvals every Monday morning.
            </TypographyMuted>
          </div>
          <Switch
            disabled={isLoadingSettings}
            checked={weeklyDigest}
            onCheckedChange={(checked) =>
              handleTogglePreference("weeklyDigest", checked, "Weekly activity summary")
            }
            aria-label="Toggle Weekly Studio Activity Summary"
          />
        </div>
      </div>

      {/* WhatsApp Gateway Integration */}
      <div className="rounded-2xl bg-card border border-border p-6 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-block size-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <TypographyH3 className="text-base font-bold font-heading text-card-foreground flex items-center gap-2">
                <MessageCircle className="size-4 text-emerald-400" />
                CineSpace WhatsApp Gateway
              </TypographyH3>
            </div>
            <TypographyMuted className="text-xs text-muted-foreground">
              Instant alerts and share links dispatched directly to your mobile phone.
            </TypographyMuted>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="+971 50 123 4567"
              value={whatsAppNumber}
              disabled={isLoadingSettings || isUpdatingPhone}
              onChange={(e) => setWhatsAppNumber(e.target.value)}
              className="bg-muted border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary w-48 disabled:opacity-50"
            />
            <Button
              disabled={isUpdatingPhone || isLoadingSettings}
              onClick={handleUpdateWhatsAppNumber}
              className="rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-black cursor-pointer"
            >
              {isUpdatingPhone ? <Loader2 className="size-3 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>

        {/* Real Notification Delivery Logs */}
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>Recent Notification Broadcasts &amp; Alerts</span>
            <span className="text-[11px] font-normal normal-case">
              {logs.length} logged events
            </span>
          </div>

          {isLoadingLogs ? (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" /> Loading broadcast history...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center rounded-xl bg-muted/40 border border-border/60 p-6 space-y-1">
              <Bell className="size-5 text-muted-foreground mx-auto mb-2 opacity-50" />
              <TypographySmall className="text-xs font-semibold text-foreground">
                No notification events dispatched yet
              </TypographySmall>
              <TypographyMuted className="text-[11px] text-muted-foreground">
                When clients approve cuts, leave notes, or download master files, audit logs will appear here.
              </TypographyMuted>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log) => {
                const isEmail = log.channel === "email";
                const isWhatsApp = log.channel === "whatsapp";
                const recipientDisplay = log.recipientEmail || log.recipientPhone || "Recipient";
                const titleDisplay = log.subject || (isWhatsApp ? "WhatsApp Review Link" : "Studio Notification");

                return (
                  <div
                    key={log.id}
                    className="py-3 flex items-center justify-between text-xs first:pt-0 last:pb-0 gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-muted border border-border shrink-0">
                        {isEmail ? (
                          <Mail className="size-3.5 text-primary" />
                        ) : (
                          <MessageCircle className="size-3.5 text-emerald-400" />
                        )}
                      </div>
                      <div className="space-y-0.5 truncate">
                        <div className="font-semibold text-foreground truncate">{titleDisplay}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{recipientDisplay}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-[11px] text-muted-foreground">
                      <TypographySpan>{formatRelativeTime(log.createdAt)}</TypographySpan>
                      <TypographySpan
                        className={`flex items-center gap-1 font-semibold ${
                          log.status === "delivered" || log.status === "sent"
                            ? "text-emerald-400"
                            : log.status === "failed"
                            ? "text-destructive"
                            : "text-amber-400"
                        }`}
                      >
                        {log.status === "delivered" || log.status === "sent" ? (
                          <CheckCheck className="size-3.5" />
                        ) : (
                          <Clock className="size-3.5" />
                        )}
                        <span className="capitalize">{log.status}</span>
                      </TypographySpan>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
