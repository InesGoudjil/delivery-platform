"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Star,
  Check,
  Zap,
  Sparkles,
  Shield,
  CreditCard,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlanTier {
  id: string;
  name: string;
  priceMonthlyAED: number;
  priceYearlyAED: number;
  storageGB: number;
  seats: number;
  features: string[];
  isPopular?: boolean;
}

const TIERS: PlanTier[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthlyAED: 49,
    priceYearlyAED: 39,
    storageGB: 100,
    seats: 1,
    features: [
      "100 GB Cloudflare 4K streaming",
      "5 active client delivery links",
      "Clean public video portfolio",
      "Timecoded client comments",
    ],
  },
  {
    id: "pro",
    name: "Pro Filmmaker",
    priceMonthlyAED: 119,
    priceYearlyAED: 95,
    storageGB: 1000,
    seats: 2,
    features: [
      "1 TB Cloudflare 4K streaming",
      "Unlimited client delivery links",
      "Custom domain & custom branding",
      "Passcode-protected delivery rooms",
      "Direct ProRes file downloads",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    priceMonthlyAED: 249,
    priceYearlyAED: 199,
    storageGB: 5000,
    seats: 5,
    isPopular: true,
    features: [
      "5 TB High-speed Cloudflare storage",
      "5 Team collaborator seats",
      "1 TB The Silo cold archive included",
      "WhatsApp automated client deliveries",
      "100% White-label custom branding",
      "Priority 24/7 filmmaker Gulf support",
    ],
  },
];

export default function SubscriptionPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "studio";

  const [yearly, setYearly] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showFlash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#f5551d] text-black font-semibold text-xs px-4 py-2.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-1">
            Account
          </div>
          <h1 className="text-3xl font-bold font-heading text-foreground">
            Subscription
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your active plan, storage allocation, and available upgrades.
          </p>
        </div>

        {/* Monthly / Yearly Toggle */}
        <div className="flex items-center gap-3 bg-muted p-1 rounded-full border border-border self-start sm:self-auto">
          <button
            onClick={() => setYearly(false)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              !yearly
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              yearly
                ? "bg-[#f5551d] text-black font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Annual</span>
            <span className="text-[10px] bg-black/20 text-foreground px-1.5 py-0.5 rounded-full font-mono">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Active Plan Highlight Card */}
      <div className="rounded-2xl bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/40 p-6 sm:p-8 space-y-6 shadow-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-primary/15 text-primary border border-primary/30">
                ACTIVE PLAN
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                Renews on Sept 17, 2026
              </span>
            </div>
            <h2 className="text-2xl font-bold font-heading text-card-foreground">
              Studio Plan
            </h2>
            <p className="text-xs text-muted-foreground max-w-xl">
              5 TB active Cloudflare 4K streaming storage, 5 team seats, custom brand white-labeling, and automated WhatsApp client delivery rooms.
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-3xl font-bold font-mono text-foreground">
              {yearly ? "199 AED" : "249 AED"}
              <span className="text-xs font-normal text-muted-foreground"> /mo</span>
            </div>
            <div className="text-xs text-muted-foreground font-mono mt-0.5">
              Billed {yearly ? "annually" : "monthly"} via Visa •••• 6411
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border/80">
          <Button
            onClick={() => showFlash("Opening Stripe Billing Portal...")}
            className="rounded-full bg-primary text-black font-bold hover:bg-primary/90 shadow-md shadow-primary/20 text-xs cursor-pointer"
          >
            <CreditCard className="size-3.5 mr-1.5" /> Manage Billing in Stripe
          </Button>

          <Button
            variant="outline"
            onClick={() => showFlash("Invoices sent to registered email")}
            className="rounded-full text-xs font-semibold cursor-pointer"
          >
            Download Latest Tax Invoice
          </Button>
        </div>
      </div>

      {/* Plan Comparison Grid */}
      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-bold font-heading text-foreground">
          Compare Available Tiers
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier) => {
            const isCurrent = tier.id === "studio";
            const price = yearly ? tier.priceYearlyAED : tier.priceMonthlyAED;

            return (
              <div
                key={tier.id}
                className={`rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 ${
                  isCurrent
                    ? "bg-card border-2 border-primary shadow-lg ring-1 ring-primary/20"
                    : "bg-card/60 border border-border hover:border-border/80"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-heading text-lg font-bold text-card-foreground">
                      {tier.name}
                    </h4>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary text-black">
                        Current
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="text-2xl font-bold font-mono text-foreground">
                      {price} AED
                      <span className="text-xs font-normal text-muted-foreground"> /mo</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {yearly ? "Billed yearly" : "Billed monthly"}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border">
                    {tier.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6">
                  {isCurrent ? (
                    <Button
                      disabled
                      className="w-full rounded-full text-xs font-semibold bg-muted text-muted-foreground cursor-not-allowed"
                    >
                      Active Plan
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => showFlash(`Selected ${tier.name} tier upgrade`)}
                      className="w-full rounded-full text-xs font-semibold cursor-pointer hover:bg-accent"
                    >
                      Switch to {tier.name}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
