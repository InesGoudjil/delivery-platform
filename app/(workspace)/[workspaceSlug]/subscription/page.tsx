"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Check,
  CreditCard,
  Loader2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface DBPlan {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  currency: string;
  billing_interval: string;
  stripe_price_id: string | null;
  features: Record<string, any>;
}

export default function SubscriptionPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "studio";

  const [yearly, setYearly] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [plans, setPlans] = useState<DBPlan[]>([]);
  const [currentPlanSlug, setCurrentPlanSlug] = useState<string>("starter");
  const [subStatus, setSubStatus] = useState<string>("trialing");
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);

  const showFlash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();

        // Fetch workspace by slug
        const { data: ws } = await supabase
          .from("workspaces")
          .select("id")
          .eq("slug", workspaceSlug)
          .maybeSingle();

        if (ws) {
          setWorkspaceId(ws.id);

          // Fetch current subscription
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("status, current_period_end, plans(slug)")
            .eq("workspace_id", ws.id)
            .maybeSingle();

          if (sub) {
            setSubStatus(sub.status || "active");
            setPeriodEnd(sub.current_period_end);
            if ((sub as any).plans?.slug) {
              setCurrentPlanSlug((sub as any).plans.slug);
            }
          }
        }

        // Fetch active plans
        const { data: dbPlans } = await supabase
          .from("plans")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (dbPlans) {
          setPlans(dbPlans as DBPlan[]);
        }
      } catch (err: any) {
        console.error("Failed loading subscription details:", err);
      }
    }

    loadData();
  }, [workspaceSlug]);

  const handleCheckout = async (plan: DBPlan) => {
    if (!workspaceId) {
      showFlash("Workspace ID not loaded yet");
      return;
    }

    if (!plan.stripe_price_id) {
      showFlash(`Plan '${plan.name}' has no Stripe Price ID configured.`);
      return;
    }

    try {
      setLoadingAction(`checkout_${plan.id}`);
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          planId: plan.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start checkout");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      showFlash(`Checkout Error: ${err.message}`);
      setLoadingAction(null);
    }
  };

  const handleOpenPortal = async () => {
    if (!workspaceId) return;

    try {
      setLoadingAction("portal");
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to open billing portal");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      showFlash(err.message);
      setLoadingAction(null);
    }
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
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-primary/15 text-primary border border-primary/30 uppercase">
                {subStatus} PLAN
              </span>
              {periodEnd && (
                <span className="text-xs text-muted-foreground font-mono">
                  Renews on {new Date(periodEnd).toLocaleDateString()}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold font-heading text-card-foreground capitalize">
              {currentPlanSlug} Tier
            </h2>
            <p className="text-xs text-muted-foreground max-w-xl">
              Enjoy all feature inclusions for your current studio plan level.
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs text-muted-foreground font-mono">
              Billed securely via Stripe
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border/80">
          <Button
            onClick={handleOpenPortal}
            disabled={loadingAction === "portal"}
            className="rounded-full bg-primary text-black font-bold hover:bg-primary/90 shadow-md shadow-primary/20 text-xs cursor-pointer"
          >
            {loadingAction === "portal" ? (
              <>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" /> Redirecting to Stripe...
              </>
            ) : (
              <>
                <CreditCard className="size-3.5 mr-1.5" /> Manage Billing &amp; Payment Methods
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Plan Comparison Grid */}
      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-bold font-heading text-foreground">
          Compare Available Tiers
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrent = plan.slug === currentPlanSlug;
            const price = (plan.price_cents / 100).toFixed(0);

            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 ${
                  isCurrent
                    ? "bg-card border-2 border-primary shadow-lg ring-1 ring-primary/20"
                    : "bg-card/60 border border-border hover:border-border/80"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-heading text-lg font-bold text-card-foreground">
                      {plan.name}
                    </h4>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary text-black">
                        Active
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="text-2xl font-bold font-mono text-foreground">
                      ${price}
                      <span className="text-xs font-normal text-muted-foreground"> /mo</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      Billed monthly
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{plan.features?.storage_gb || 2} GB Storage</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                      <span>
                        {plan.features?.client_links === -1
                          ? "Unlimited client links"
                          : `${plan.features?.client_links || 1} client links`}
                      </span>
                    </div>
                    {plan.features?.whatsapp_delivery && (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                        <span>WhatsApp Client Delivery</span>
                      </div>
                    )}
                    {plan.features?.white_label && (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                        <span>White-Label Branding</span>
                      </div>
                    )}
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
                  ) : plan.slug === "starter" ? (
                    <Button
                      variant="outline"
                      disabled
                      className="w-full rounded-full text-xs font-semibold text-muted-foreground"
                    >
                      Free Tier
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleCheckout(plan)}
                      disabled={loadingAction === `checkout_${plan.id}`}
                      className="w-full rounded-full text-xs font-semibold bg-primary text-black hover:bg-primary/90 cursor-pointer"
                    >
                      {loadingAction === `checkout_${plan.id}` ? (
                        <>
                          <Loader2 className="size-3.5 mr-1.5 animate-spin" /> Loading Stripe...
                        </>
                      ) : (
                        `Upgrade to ${plan.name}`
                      )}
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
