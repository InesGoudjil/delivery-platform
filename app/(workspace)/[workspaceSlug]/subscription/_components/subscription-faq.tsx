"use client";

import React from "react";
import { ShieldCheck, RefreshCw, Zap, HelpCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export function SubscriptionFaq() {
  return (
    <div className="flex flex-col gap-6">
      {/* 1. Trust Indicators Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-start gap-3 p-4 rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
            <ShieldCheck className="size-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-foreground">Stripe 256-Bit Encryption</span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Certified PCI Service Provider Level 1. Your credit card data never touches our servers.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <RefreshCw className="size-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-foreground">Cancel or Change Anytime</span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              No locked contracts. Switch tiers, upgrade storage, or cancel seamlessly with one click.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
            <Zap className="size-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-foreground">Instant Quota Activation</span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Upgraded cloud storage and delivery links are unlocked immediately upon successful checkout.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Billing & Plan FAQ Accordion */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-muted text-foreground">
              <HelpCircle className="size-4 text-primary" />
            </div>
            <div className="flex flex-col gap-0.5">
              <CardTitle className="text-base font-bold font-heading text-foreground">
                Frequently Asked Billing Questions
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Everything you need to know about plans, quotas, and cancellations.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <Accordion className="w-full">
            <AccordionItem value="storage-limit">
              <AccordionTrigger className="text-xs sm:text-sm font-semibold hover:no-underline">
                What happens when my workspace reaches its storage quota?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-4">
                Your existing client delivery links and portfolio videos remain completely unaffected and accessible to your clients. New video uploads will be paused until you either upgrade your tier for more storage or free up space by archiving completed deliveries.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="downgrade-links">
              <AccordionTrigger className="text-xs sm:text-sm font-semibold hover:no-underline">
                Do my active client delivery links expire if I downgrade?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-4">
                No active delivery links will be deleted. Any link already shared with a client will honor its configured expiration date. However, creating new delivery links will be subject to your newly selected plan&apos;s active link limit.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="plan-changes">
              <AccordionTrigger className="text-xs sm:text-sm font-semibold hover:no-underline">
                Can I upgrade or downgrade my subscription midway through the month?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-4">
                Yes! When upgrading to a higher tier, Stripe automatically prorates the remaining days of your current billing period so you only pay the difference. When downgrading, your existing tier remains active until the end of your current cycle.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="payment-methods">
              <AccordionTrigger className="text-xs sm:text-sm font-semibold hover:no-underline">
                Which payment methods are supported?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-4">
                We accept all major credit and debit cards (Visa, Mastercard, American Express, Discover), as well as Apple Pay and Google Pay via Stripe&apos;s encrypted checkout. Official VAT/tax receipts with downloadable PDFs are generated for every invoice.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
