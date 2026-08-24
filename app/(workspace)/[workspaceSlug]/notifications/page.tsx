"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
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
  const [toast, setToast] = useState<string | null>(null);

  const showFlash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#f5551d] text-black font-semibold text-xs px-4 py-2.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="pb-6 border-b border-border">
        <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-1">
          Account
        </div>
        <h1 className="text-3xl font-bold font-heading text-foreground">
          Notifications &amp; WhatsApp
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure real-time client feedback alerts and WhatsApp delivery automation.
        </p>
      </div>

      {/* Notification Preferences */}
      <div className="rounded-2xl bg-card border border-border divide-y divide-border shadow-sm">
        {/* Client Approvals */}
        <div className="p-6 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-sm font-bold font-heading text-card-foreground">
              Client Cut Approvals
            </div>
            <div className="text-xs text-muted-foreground">
              Receive an immediate WhatsApp message and email when a client approves a cut.
            </div>
          </div>
          <button
            onClick={() => {
              setNotifyApproval(!notifyApproval);
              showFlash(!notifyApproval ? "Approval alerts enabled" : "Approval alerts disabled");
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              notifyApproval ? "bg-[#f5551d]" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                notifyApproval ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* New Comments */}
        <div className="p-6 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-sm font-bold font-heading text-card-foreground">
              New Timecoded Notes &amp; Comments
            </div>
            <div className="text-xs text-muted-foreground">
              Notify when a client pauses and leaves timestamped review notes on a scene.
            </div>
          </div>
          <button
            onClick={() => {
              setNotifyComments(!notifyComments);
              showFlash(!notifyComments ? "Comment notifications enabled" : "Comment notifications disabled");
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              notifyComments ? "bg-[#f5551d]" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                notifyComments ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Master File Downloads */}
        <div className="p-6 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-sm font-bold font-heading text-card-foreground">
              Master File Download Alerts
            </div>
            <div className="text-xs text-muted-foreground">
              Get notified when a client initiates a full 4K ProRes master file download.
            </div>
          </div>
          <button
            onClick={() => {
              setNotifyDownloads(!notifyDownloads);
              showFlash(!notifyDownloads ? "Download alerts enabled" : "Download alerts disabled");
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              notifyDownloads ? "bg-[#f5551d]" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                notifyDownloads ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Weekly Digest */}
        <div className="p-6 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-sm font-bold font-heading text-card-foreground">
              Weekly Studio Activity Summary
            </div>
            <div className="text-xs text-muted-foreground">
              A consolidated email digest of client views, stream minutes, and approvals every Monday morning.
            </div>
          </div>
          <button
            onClick={() => {
              setWeeklyDigest(!weeklyDigest);
              showFlash(!weeklyDigest ? "Weekly digest enabled" : "Weekly digest disabled");
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              weeklyDigest ? "bg-[#f5551d]" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                weeklyDigest ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* WhatsApp Delivery Automation */}
      <div className="rounded-2xl bg-card border border-border p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <MessageCircle className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-base font-bold text-card-foreground">
                  WhatsApp Direct Delivery
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Active Connected
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send branded preview links to clients straight to their WhatsApp chat.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={whatsAppNumber}
              onChange={(e) => setWhatsAppNumber(e.target.value)}
              className="bg-muted border border-border rounded-xl px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary w-44"
            />
            <Button
              onClick={() => showFlash("WhatsApp number verified")}
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
                  <span>{log.sentAt}</span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCheck className="size-3.5" />
                    {log.status === "read" ? "Read" : "Delivered"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
