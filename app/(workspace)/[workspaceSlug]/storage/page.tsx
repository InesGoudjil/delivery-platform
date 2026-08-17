"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  HardDrive,
  Upload,
  Archive,
  Zap,
  CheckCircle2,
  TrendingUp,
  Shield,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function StoragePage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "studio";
  const [toast, setToast] = useState<string | null>(null);

  const showFlash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const usedGB = 3400;
  const totalGB = 5000;
  const percentage = Math.round((usedGB / totalGB) * 100);

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
          Workspace
        </div>
        <h1 className="text-3xl font-bold font-heading text-foreground">
          Storage &amp; Usage
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your active 4K streaming storage and archive completed client films to The Silo.
        </p>
      </div>

      {/* Main Active Storage Meter */}
      <div className="rounded-2xl bg-card border border-border p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <HardDrive className="size-6" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-card-foreground">
                Active High-Speed Cloudflare Storage
              </h3>
              <p className="text-xs text-muted-foreground">
                Fast edge delivery &amp; adaptive HLS 4K streaming
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold font-mono text-foreground">
              3.4 TB <span className="text-sm font-normal text-muted-foreground">/ 5.0 TB</span>
            </div>
            <div className="text-xs font-mono text-primary font-semibold">
              {percentage}% allocated
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-3 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border">
            <div
              className="h-full bg-gradient-to-r from-[#f5551d] to-[#ff8a45] rounded-full transition-all duration-500 shadow-sm shadow-[#f5551d]/50"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>0 GB</span>
            <span>1.6 TB remaining</span>
            <span>5,000 GB</span>
          </div>
        </div>

        {/* Breakdown Items */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-muted/50 border border-border space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <span className="size-2 rounded-full bg-[#f5551d]" />
              ProRes / RAW Masters
            </div>
            <div className="text-sm font-mono font-bold text-foreground">2.4 TB</div>
            <div className="text-[10px] text-muted-foreground">Original cut source files</div>
          </div>

          <div className="p-3 rounded-xl bg-muted/50 border border-border space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <span className="size-2 rounded-full bg-[#ff8a45]" />
              Adaptive 4K Streams
            </div>
            <div className="text-sm font-mono font-bold text-foreground">820 GB</div>
            <div className="text-[10px] text-muted-foreground">Cloudflare transcoded streams</div>
          </div>

          <div className="p-3 rounded-xl bg-muted/50 border border-border space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <span className="size-2 rounded-full bg-[#86b98f]" />
              Stills &amp; Deliverables
            </div>
            <div className="text-sm font-mono font-bold text-foreground">180 GB</div>
            <div className="text-[10px] text-muted-foreground">Graded stills &amp; LUTs</div>
          </div>
        </div>

        {/* Storage Boost CTA */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            onClick={() => showFlash("Storage upgrade checkout opened")}
            className="rounded-full bg-[#f5551d] text-black font-bold hover:bg-[#ff8a45] shadow-md shadow-[#f5551d]/20 text-xs cursor-pointer"
          >
            <Zap className="size-3.5 mr-1.5" /> Add +1 TB Storage ($15/mo)
          </Button>
        </div>
      </div>

      {/* The Silo — Cold Storage Archive */}
      <div className="rounded-2xl bg-card border border-border p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <Archive className="size-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-lg font-bold text-card-foreground">
                  The Silo — Deep Cold Archive
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  Secure Archival
                </span>
              </div>
              <p className="text-xs text-muted-foreground max-w-xl">
                Move delivered, completed commercial projects to long-term cold storage. Keep your active workspace uncluttered while preserving immutable master backups.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => showFlash("Opening The Silo Archive Manager...")}
            className="rounded-full text-xs font-semibold cursor-pointer shrink-0"
          >
            <Upload className="size-3.5 mr-1.5" /> Manage Archive
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border">
            <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
            <span>1 TB included in your Studio Plan</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border">
            <Shield className="size-4 text-blue-400 shrink-0" />
            <span>Encrypted triple-redundancy storage</span>
          </div>
        </div>
      </div>
    </div>
  );
}
