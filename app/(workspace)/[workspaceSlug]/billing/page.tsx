"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  CreditCard,
  Download,
  Building2,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface Invoice {
  id: string;
  number: string;
  date: string;
  description: string;
  amount: string;
  status: "paid" | "pending";
}

const INVOICES: Invoice[] = [
  {
    id: "inv_1",
    number: "INV-2026-0817",
    date: "Aug 17, 2026",
    description: "Studio Plan (Monthly)",
    amount: "$69.00",
    status: "paid",
  },
  {
    id: "inv_2",
    number: "INV-2026-0717",
    date: "Jul 17, 2026",
    description: "Studio Plan (Monthly)",
    amount: "$69.00",
    status: "paid",
  },
];

export default function BillingPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "studio";
  
  const [toast, setToast] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const showFlash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    async function getWorkspace() {
      const supabase = createClient();
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id")
        .eq("slug", workspaceSlug)
        .maybeSingle();

      if (ws) {
        setWorkspaceId(ws.id);
      }
    }
    getWorkspace();
  }, [workspaceSlug]);

  const handleOpenPortal = async () => {
    if (!workspaceId) {
      showFlash("Workspace ID loading...");
      return;
    }

    try {
      setLoadingPortal(true);
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to open Stripe portal");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      showFlash(err.message);
      setLoadingPortal(false);
    }
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
          Billing &amp; Invoices
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your payment methods, tax receipts, and view past billing statements.
        </p>
      </div>

      {/* Payment Method Card */}
      <div className="rounded-2xl bg-card border border-border p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-muted border border-border text-foreground">
              <CreditCard className="size-6 text-[#f5551d]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-base font-bold text-card-foreground">
                  Stripe Payment Methods
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Secured
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Managed safely via Stripe Customer Portal
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleOpenPortal}
            disabled={loadingPortal}
            className="rounded-full text-xs font-semibold cursor-pointer"
          >
            {loadingPortal ? (
              <>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" /> Opening Portal...
              </>
            ) : (
              "Update Payment Method & Invoices"
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t border-border">
          <ShieldCheck className="size-4 text-emerald-400" />
          <span>Payments are securely processed and encrypted via Stripe.</span>
        </div>
      </div>

      {/* Invoices List */}
      <div className="rounded-2xl bg-card border border-border p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div>
            <h3 className="font-heading text-base font-bold text-card-foreground">
              Billing History &amp; Invoices
            </h3>
            <p className="text-xs text-muted-foreground">
              Download tax-compliant VAT receipts for your accounting.
            </p>
          </div>
        </div>

        <div className="divide-y divide-border">
          {INVOICES.map((inv) => (
            <div
              key={inv.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 first:pt-1 last:pb-1"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-foreground">
                    {inv.description}
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {inv.number}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {inv.date}
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4">
                <span className="font-mono text-sm font-bold text-foreground">
                  {inv.amount}
                </span>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenPortal}
                  className="text-xs text-muted-foreground hover:text-foreground h-8 gap-1.5 cursor-pointer rounded-xl"
                >
                  <Download className="size-3.5 text-[#f5551d]" />
                  <span>PDF / Stripe Portal</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tax & Business Details */}
      <div className="rounded-2xl bg-card border border-border p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-muted border border-border text-foreground">
            <Building2 className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h4 className="font-heading text-sm font-bold text-card-foreground">
              VAT &amp; Commercial Tax Details
            </h4>
            <p className="text-xs text-muted-foreground">
              Add your UAE TRN / Gulf tax registration number to appear on invoices.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <input
            type="text"
            placeholder="TRN Number (e.g. 100342948200003)"
            defaultValue="100482910300003"
            className="flex-1 bg-muted border border-border rounded-xl px-3.5 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
          />
          <Button
            onClick={() => showFlash("Tax identification number updated")}
            className="rounded-xl text-xs font-semibold bg-primary text-black hover:bg-primary/90 cursor-pointer"
          >
            Save TRN
          </Button>
        </div>
      </div>
    </div>
  );
}
