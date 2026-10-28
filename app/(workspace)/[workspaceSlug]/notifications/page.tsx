"use client";

import { useState } from "react";
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

interface WhatsAppLog {
  id: string;
  recipient: string;
  projectTitle: string;
  sentAt: string;
  status: "delivered" | "read";
}

const SAMPLE_LOGS: WhatsAppLog[] = [
  {
    id: "log_1",
    recipient: "+971 50 492 8192 (Lost in Tokyo)",
    projectTitle: "Omakase Launch Cut v3",
    sentAt: "15 mins ago",
    status: "read",
  },
  {
    id: "log_2",
    recipient: "+971 55 382 1029 (Aisha)",
    projectTitle: "Wedding Highlight Film",
    sentAt: "3 hours ago",
    status: "read",
  },
  {
    id: "log_3",
    recipient: "+971 52 901 3491 (Prestige Rentals)",
    projectTitle: "GT3 Desert Reel",
    sentAt: "Yesterday",
    status: "delivered",
  },
];

export default function NotificationsPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "studio";

  const [notifyApproval, setNotifyApproval] = useState(true);
  const [notifyComments, setNotifyComments] = useState(true);
  const [notifyDownloads, setNotifyDownloads] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [whatsAppNumber, setWhatsAppNumber] = useState("+971 50 839 2041");

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-border">
        <TypographyKicker className="text-xs font-mono text-primary uppercase tracking-wider mb-1 block">
          Account
        </TypographyKicker>
        <TypographyH1 className="text-3xl font-bold font-heading text-foreground">
          Notifications &amp; WhatsApp
        </TypographyH1>
        <TypographyLead className="text-sm text-muted-foreground mt-1">
          Configure real-time client feedback alerts and WhatsApp delivery automation.
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
            checked={notifyApproval}
            onCheckedChange={(checked) => {
              setNotifyApproval(checked);
              toast.success(checked ? "Approval alerts enabled" : "Approval alerts disabled");
            }}
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
            checked={notifyComments}
            onCheckedChange={(checked) => {
              setNotifyComments(checked);
              toast.success(checked ? "Comment notifications enabled" : "Comment notifications disabled");
            }}
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
            checked={notifyDownloads}
            onCheckedChange={(checked) => {
              setNotifyDownloads(checked);
              toast.success(checked ? "Download alerts enabled" : "Download alerts disabled");
            }}
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
            checked={weeklyDigest}
            onCheckedChange={(checked) => {
              setWeeklyDigest(checked);
              toast.success(checked ? "Weekly digest enabled" : "Weekly digest disabled");
            }}
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
              <TypographyH3 className="text-base font-bold font-heading text-card-foreground">
                Official CineSpace WhatsApp Bot
              </TypographyH3>
            </div>
            <TypographyMuted className="text-xs text-muted-foreground">
              Messages will be dispatched from +1 (800) 246-3772 to your registered Gulf mobile number.
            </TypographyMuted>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={whatsAppNumber}
              onChange={(e) => setWhatsAppNumber(e.target.value)}
              className="bg-muted border border-border rounded-xl px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary w-44"
            />
            <Button
              onClick={() => toast.success("WhatsApp number verified")}
              className="rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-black cursor-pointer"
            >
              Update
            </Button>
          </div>
        </div>

        {/* WhatsApp Delivery Logs */}
        <div className="pt-4 border-t border-border space-y-3">
          <div className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">
            Recent WhatsApp Delivery Broadcasts
          </div>

          <div className="divide-y divide-border">
            {SAMPLE_LOGS.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                <div className="space-y-0.5">
                  <div className="font-semibold text-foreground">{log.projectTitle}</div>
                  <div className="text-[11px] font-mono text-muted-foreground">{log.recipient}</div>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <TypographySpan>{log.sentAt}</TypographySpan>
                  <TypographySpan className="flex items-center gap-1 text-emerald-400">
                    <CheckCheck className="size-3.5" />
                    {log.status === "read" ? "Read" : "Delivered"}
                  </TypographySpan>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
