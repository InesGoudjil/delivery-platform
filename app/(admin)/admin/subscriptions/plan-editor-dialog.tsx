"use client";

import { useState } from "react";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createPlanAction, savePlanTierAction } from "@/app/actions/admin";
import { YEARLY_SLUG_SUFFIX, yearlySavingsPercent } from "@/core/entities/plan";
import type { WorkspaceFeatureConfig } from "@/core/entities/workspace";
import { formatUsd } from "@/lib/billing/price";
import { shareLinksPerDelivery } from "@/lib/share-links/limits";
import type { AdminPlanItem } from "./subscriptions-client";

/** The yearly price suggested when turning yearly on: 25% off twelve monthly payments. */
const SUGGESTED_YEARLY_DISCOUNT = 0.25;

type Language = "en" | "ar";

/** Every feature a plan grants, as the editor holds it: all set, nothing left to a default. */
export interface PlanFeaturesDraft {
  storage_gb: number;
  client_links: number;
  share_links_per_delivery: number;
  portfolio_videos: number;
  team_seats: number;
  languages: Language[];
  whatsapp_delivery: boolean;
  password_protected: boolean;
  extended_link_expiry: boolean;
  watermark: boolean;
  branding: boolean;
  download_notifications: boolean;
  priority_support: boolean;
  silo_archive: boolean;
  white_label: boolean;
}

type BooleanFeature = {
  [K in keyof PlanFeaturesDraft]: PlanFeaturesDraft[K] extends boolean ? K : never;
}[keyof PlanFeaturesDraft];

type LimitFeature = "storage_gb" | "client_links" | "share_links_per_delivery" | "portfolio_videos" | "team_seats";

const LIMITS: { key: LimitFeature; label: string; hint: string; unit?: string; unlimited: boolean; min: number }[] = [
  { key: "storage_gb", label: "Video storage", hint: "1024 GB = 1 TB", unit: "GB", unlimited: false, min: 1 },
  { key: "client_links", label: "Active delivery rooms", hint: "Rooms open at the same time", unlimited: true, min: 0 },
  { key: "share_links_per_delivery", label: "Client links per room", hint: "Share links in one room", unlimited: true, min: 1 },
  { key: "portfolio_videos", label: "Portfolio videos", hint: "Films on the portfolio page", unlimited: true, min: 0 },
  { key: "team_seats", label: "Team seats", hint: "Members including the owner", unlimited: false, min: 1 },
];

export const CAPABILITIES: { key: BooleanFeature; label: string; short: string; hint: string }[] = [
  { key: "whatsapp_delivery", label: "WhatsApp delivery", short: "WhatsApp", hint: "Send delivery rooms over WhatsApp" },
  { key: "password_protected", label: "Password-protected links", short: "Passwords", hint: "Lock a client link with a password" },
  { key: "extended_link_expiry", label: "Long-lived links", short: "Long links", hint: "Links past 30 days, or that never expire" },
  { key: "watermark", label: "Watermark media", short: "Watermark", hint: "Custom watermark overlay on videos" },
  { key: "branding", label: "Logo & brand colours", short: "Branding", hint: "The studio's own logo and colours" },
  { key: "download_notifications", label: "Download notifications", short: "Download alerts", hint: "Email when a client downloads" },
  { key: "priority_support", label: "Priority support", short: "Priority support", hint: "Support answers these first" },
  { key: "silo_archive", label: "The Silo cold archive", short: "Silo", hint: "Secure long-term archive" },
  { key: "white_label", label: "White-label", short: "White-label", hint: "Remove the CineSpace watermark" },
];

/** A plan's stored features as the editor's full set. Unset values take the defaults the app applies. */
export function featuresDraftFrom(features: WorkspaceFeatureConfig, tier: string): PlanFeaturesDraft {
  const passwordProtected = Boolean(features.password_protected);
  return {
    storage_gb: features.storage_gb ?? 100,
    client_links: features.client_links ?? 1,
    share_links_per_delivery: shareLinksPerDelivery(features, tier),
    portfolio_videos: features.portfolio_videos ?? -1,
    team_seats: features.team_seats ?? 1,
    languages: Array.isArray(features.languages) && features.languages.length > 0 ? features.languages : ["en"],
    whatsapp_delivery: Boolean(features.whatsapp_delivery),
    password_protected: passwordProtected,
    // Unset, it follows password protection (lib/share-links).
    extended_link_expiry: features.extended_link_expiry ?? passwordProtected,
    watermark: Boolean(features.watermark),
    branding: Boolean(features.branding),
    download_notifications: Boolean(features.download_notifications),
    priority_support: Boolean(features.priority_support),
    silo_archive: Boolean(features.silo_archive),
    white_label: Boolean(features.white_label),
  };
}

const NEW_PLAN_FEATURES: PlanFeaturesDraft = {
  storage_gb: 500,
  client_links: -1,
  share_links_per_delivery: -1,
  portfolio_videos: -1,
  team_seats: 1,
  languages: ["en", "ar"],
  whatsapp_delivery: true,
  password_protected: true,
  extended_link_expiry: true,
  watermark: true,
  branding: true,
  download_notifications: true,
  priority_support: false,
  silo_archive: false,
  white_label: false,
};

/** A tier: its monthly plan and, when it's sold yearly too, its yearly twin. */
export interface PlanTierItem {
  monthly: AdminPlanItem;
  yearly: AdminPlanItem | null;
}

interface Draft {
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  priceUsd: number;
  sellYearly: boolean;
  yearlyPriceUsd: number;
  features: PlanFeaturesDraft;
}

const toUsd = (cents: number) => Math.round(cents) / 100;
const toCents = (usd: number) => Math.round(usd * 100);
const suggestedYearlyUsd = (monthlyUsd: number) => toUsd(toCents(monthlyUsd) * 12 * (1 - SUGGESTED_YEARLY_DISCOUNT));
const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function initialDraft(tier: PlanTierItem | null, nextSortOrder: number): Draft {
  if (!tier) {
    return {
      name: "",
      slug: "",
      sortOrder: nextSortOrder,
      isActive: true,
      priceUsd: 29,
      sellYearly: true,
      yearlyPriceUsd: suggestedYearlyUsd(29),
      features: NEW_PLAN_FEATURES,
    };
  }
  const { monthly, yearly } = tier;
  // A hidden tier hides its yearly plan too, so that one still counts as sold yearly.
  const sellsYearly = Boolean(yearly && (yearly.isActive || !monthly.isActive));
  return {
    name: monthly.name,
    slug: monthly.slug,
    sortOrder: monthly.sortOrder,
    isActive: monthly.isActive,
    priceUsd: toUsd(monthly.priceCents),
    sellYearly: sellsYearly,
    yearlyPriceUsd: yearly ? toUsd(yearly.priceCents) : suggestedYearlyUsd(toUsd(monthly.priceCents)),
    features: featuresDraftFrom(monthly.features, monthly.slug),
  };
}

/** Why the draft can't be saved yet, or null. Mirrors the server's checks so the admin sees them first. */
function draftProblem(draft: Draft, tier: PlanTierItem | null): string | null {
  if (draft.name.trim().length < 2) return "Give the plan a name of at least 2 characters.";
  if (!tier) {
    if (!/^[a-z0-9-]{2,}$/.test(draft.slug)) return "The slug needs 2 or more lowercase letters, digits or hyphens.";
    if (draft.slug.endsWith(YEARLY_SLUG_SUFFIX)) return `The slug can't end in "${YEARLY_SLUG_SUFFIX}".`;
  }
  if (!Number.isFinite(draft.priceUsd) || draft.priceUsd < 0) return "Enter the monthly price.";
  if (tier?.monthly.slug === "starter" && draft.priceUsd > 0) return "Starter stays free: workspaces fall back to it.";
  if (tier && tier.monthly.priceCents > 0 && draft.priceUsd === 0) {
    return "A paid plan can't become free. Create a free plan instead.";
  }
  if (draft.sellYearly) {
    if (draft.priceUsd <= 0) return "Free plans have no yearly price.";
    if (!(draft.yearlyPriceUsd > 0)) return "Enter the yearly price.";
    if (toCents(draft.yearlyPriceUsd) >= toCents(draft.priceUsd) * 12) {
      return "The yearly price must be less than twelve monthly payments.";
    }
  }
  if (draft.features.languages.length === 0) return "Pick at least one language.";
  for (const limit of LIMITS) {
    const value = draft.features[limit.key];
    if (value === -1 && limit.unlimited) continue;
    if (!Number.isInteger(value) || value < limit.min) return `${limit.label} must be ${limit.min} or more.`;
  }
  return null;
}

export function PlanEditorDialog({
  open,
  onOpenChange,
  tier,
  nextSortOrder,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The tier to edit, or null to create one. */
  tier: PlanTierItem | null;
  nextSortOrder: number;
  /** Gets the message to confirm the save with. */
  onSaved: (message: string) => void;
}) {
  const [pending, setPending] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      {/* No glass close button: Cancel in the footer closes it, like the other admin forms. */}
      <DialogContent size="2xl" showCloseButton={false} className="max-h-[90dvh] gap-0 overflow-y-auto p-0">
        {/* Mounted per open, so the draft always starts from the saved plan. */}
        {open && (
          <PlanEditorForm
            key={tier?.monthly.id ?? "new"}
            tier={tier}
            nextSortOrder={nextSortOrder}
            onPendingChange={setPending}
            onCancel={() => onOpenChange(false)}
            onDone={(message) => {
              onOpenChange(false);
              onSaved(message);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PlanEditorForm({
  tier,
  nextSortOrder,
  onPendingChange,
  onCancel,
  onDone,
}: {
  tier: PlanTierItem | null;
  nextSortOrder: number;
  onPendingChange: (pending: boolean) => void;
  onCancel: () => void;
  onDone: (message: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => initialDraft(tier, nextSortOrder));
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNew = !tier;
  const isStarter = tier?.monthly.slug === "starter";
  const problem = draftProblem(draft, tier);
  const reasonValid = reason.trim().length >= 5;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setFeature = <K extends keyof PlanFeaturesDraft>(key: K, value: PlanFeaturesDraft[K]) =>
    setDraft((d) => ({ ...d, features: { ...d.features, [key]: value } }));

  const monthlyCents = toCents(draft.priceUsd);
  const yearlyCents = toCents(draft.yearlyPriceUsd);
  const saving = draft.sellYearly ? yearlySavingsPercent(monthlyCents, yearlyCents) : 0;

  // What a save does to people already paying, said before they're affected.
  const monthlyPriceChanges = tier !== null && monthlyCents !== tier.monthly.priceCents;
  const yearlyPriceChanges = Boolean(tier?.yearly && draft.sellYearly && yearlyCents !== tier.yearly.priceCents);
  const yearlyStops = Boolean(tier?.yearly?.isActive && !draft.sellYearly);
  const notices: string[] = [];
  if (monthlyPriceChanges && tier && tier.monthly.activeSubscribersCount > 0) {
    notices.push(
      `${tier.monthly.activeSubscribersCount} monthly subscriber(s) keep paying ${formatUsd(tier.monthly.priceCents)}/mo. New checkouts pay ${formatUsd(monthlyCents)}/mo.`
    );
  }
  if (yearlyPriceChanges && tier?.yearly && tier.yearly.activeSubscribersCount > 0) {
    notices.push(
      `${tier.yearly.activeSubscribersCount} yearly subscriber(s) keep paying ${formatUsd(tier.yearly.priceCents)}/yr. New checkouts pay ${formatUsd(yearlyCents)}/yr.`
    );
  }
  if (yearlyStops && tier?.yearly) {
    notices.push(
      tier.yearly.activeSubscribersCount > 0
        ? `Yearly billing stops for new customers. The yearly plan is archived, and its ${tier.yearly.activeSubscribersCount} subscriber(s) keep it.`
        : "Yearly billing stops: the yearly plan and its Stripe price are removed."
    );
  }
  if (!draft.isActive) notices.push("Hidden plans aren't on the pricing pages, so nobody new can choose them.");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (problem || !reasonValid || pending) return;
    setPending(true);
    onPendingChange(true);
    setError(null);

    const name = draft.name.trim();
    const yearlyPriceUsd = draft.sellYearly ? draft.yearlyPriceUsd : null;
    try {
      const res = isNew
        ? await createPlanAction({
            name,
            slug: draft.slug,
            priceUsd: draft.priceUsd,
            yearlyPriceUsd,
            sortOrder: draft.sortOrder,
            isActive: draft.isActive,
            features: draft.features,
            reason,
          })
        : await savePlanTierAction({
            planId: tier.monthly.id,
            name,
            priceUsd: draft.priceUsd,
            yearlyPriceUsd,
            sortOrder: draft.sortOrder,
            isActive: draft.isActive,
            features: draft.features,
            reason,
          });
      if (!res.success) {
        setError(res.error || "The plan couldn't be saved.");
        return;
      }
      onDone(isNew ? `${name} created.` : `${name} saved.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
      onPendingChange(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6 p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{isNew ? "New plan" : `Edit ${tier.monthly.name}`}</DialogTitle>
          <DialogDescription>
            {isNew
              ? "Set every detail of the new plan. Its Stripe products and prices are created on save."
              : "The monthly and yearly plans are saved together and grant the same features."}
          </DialogDescription>
        </DialogHeader>

        <Section title="Basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="plan-name">
              <Input
                id="plan-name"
                value={draft.name}
                placeholder="e.g. Pro"
                maxLength={100}
                autoFocus={isNew}
                onChange={(e) => {
                  const name = e.target.value;
                  setDraft((d) => ({ ...d, name, ...(isNew ? { slug: slugify(name) } : {}) }));
                }}
              />
            </Field>
            <Field
              label="Slug"
              htmlFor="plan-slug"
              hint={isNew ? "Used in URLs and code. It can't change later." : "Fixed once the plan exists."}
            >
              <Input
                id="plan-slug"
                value={draft.slug}
                disabled={!isNew}
                placeholder="pro"
                onChange={(e) => set("slug", e.target.value.toLowerCase())}
                className="font-mono"
              />
            </Field>
            <Field label="Display order" htmlFor="plan-order" hint="Lower comes first on the pricing pages.">
              <Input
                id="plan-order"
                type="number"
                min={0}
                max={1000}
                value={draft.sortOrder}
                onChange={(e) => set("sortOrder", Number(e.target.value))}
              />
            </Field>
            <ToggleRow
              id="plan-active"
              label="Show on pricing pages"
              hint="Off hides it from new customers. Subscribers keep it."
              checked={draft.isActive}
              onChange={(v) => set("isActive", v)}
            />
          </div>
        </Section>

        <Section title="Pricing" description="In US dollars.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Monthly price"
              htmlFor="plan-price"
              hint={
                isStarter
                  ? "Starter is always free."
                  : draft.priceUsd === 0
                    ? "Free plan: no Stripe price."
                    : "Billed every month."
              }
            >
              <Input
                id="plan-price"
                type="number"
                min={0}
                step="0.01"
                value={draft.priceUsd}
                disabled={isStarter}
                onChange={(e) => set("priceUsd", Number(e.target.value))}
              />
            </Field>
            <ToggleRow
              id="plan-yearly"
              label="Also sell yearly"
              hint={
                draft.priceUsd > 0
                  ? "Adds the Monthly / Yearly switch to the pricing pages."
                  : "Free plans have no yearly price."
              }
              checked={draft.sellYearly}
              disabled={draft.priceUsd <= 0}
              onChange={(v) => set("sellYearly", v)}
            />
          </div>

          {draft.sellYearly && draft.priceUsd > 0 && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-end gap-2">
                <Field label="Yearly price" htmlFor="plan-yearly-price" className="flex-1">
                  <Input
                    id="plan-yearly-price"
                    type="number"
                    min={1}
                    step="0.01"
                    value={draft.yearlyPriceUsd}
                    onChange={(e) => set("yearlyPriceUsd", Number(e.target.value))}
                  />
                </Field>
                <Button type="button" variant="outline" onClick={() => set("yearlyPriceUsd", suggestedYearlyUsd(draft.priceUsd))}>
                  Use 25% off
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Twelve monthly payments come to {formatUsd(monthlyCents * 12)}. The pricing pages show{" "}
                <span className="font-medium text-foreground">{formatUsd(Math.round(yearlyCents / 12))}/mo</span>
                {saving > 0 ? (
                  <>
                    , billed yearly, <span className="font-medium text-primary">save {saving}%</span>.
                  </>
                ) : (
                  ", billed yearly."
                )}
              </p>
            </div>
          )}
        </Section>

        <Section title="Limits" description="Switch on Unlimited where a plan has no cap.">
          <div className="grid gap-3 sm:grid-cols-2">
            {LIMITS.map((item) => (
              <LimitField
                key={item.key}
                id={`plan-${item.key}`}
                label={item.label}
                hint={item.hint}
                unit={item.unit}
                allowUnlimited={item.unlimited}
                min={item.min}
                value={draft.features[item.key]}
                onChange={(v) => setFeature(item.key, v)}
              />
            ))}
            <div className="space-y-2 rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Languages</p>
                <p className="text-xs text-muted-foreground">Of the client review room</p>
              </div>
              <div className="flex gap-2">
                {(["en", "ar"] as const).map((lang) => {
                  const on = draft.features.languages.includes(lang);
                  return (
                    <Button
                      key={lang}
                      type="button"
                      size="sm"
                      variant={on ? "secondary" : "outline"}
                      aria-pressed={on}
                      onClick={() =>
                        setFeature(
                          "languages",
                          on ? draft.features.languages.filter((l) => l !== lang) : [...draft.features.languages, lang]
                        )
                      }
                    >
                      {on && <Check className="size-3.5" />}
                      {lang === "en" ? "English" : "Arabic"}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </Section>

        <Section title="Features">
          <div className="grid gap-2 sm:grid-cols-2">
            {CAPABILITIES.map((cap) => (
              <ToggleRow
                key={cap.key}
                id={`plan-${cap.key}`}
                label={cap.label}
                hint={cap.hint}
                checked={draft.features[cap.key]}
                onChange={(v) => setFeature(cap.key, v)}
              />
            ))}
          </div>
        </Section>

        {notices.length > 0 && (
          <div className="space-y-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
            {notices.map((notice) => (
              <p key={notice} className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{notice}</span>
              </p>
            ))}
          </div>
        )}

        <Field label="Reason" htmlFor="plan-reason">
          <Textarea
            id="plan-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you making this change? It's saved in the audit log."
            rows={3}
            maxLength={500}
            required
          />
        </Field>
      </div>

      {/* Stays in view while the form scrolls, with what still blocks the save. */}
      <DialogFooter className="sticky bottom-0 m-0 flex-col gap-2 rounded-b-xl border-t border-border bg-popover px-4 py-3 sm:flex-row sm:items-center sm:px-6">
        <p role={error ? "alert" : undefined} className={`text-sm sm:mr-auto ${error ? "text-destructive" : "text-muted-foreground"}`}>
          {error ?? problem ?? (reasonValid ? "" : "Add a reason to save.")}
        </p>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={Boolean(problem) || !reasonValid || pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {isNew ? "Create plan" : "Save plan"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-border pt-5 first-of-type:border-t-0 first-of-type:pt-0">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
      <div className="space-y-0.5">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

function LimitField({
  id,
  label,
  hint,
  unit,
  allowUnlimited,
  min,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  unit?: string;
  allowUnlimited: boolean;
  min: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const unlimited = allowUnlimited && value === -1;
  // The number to go back to when Unlimited is switched off.
  const [lastFinite, setLastFinite] = useState(value === -1 ? Math.max(min, 10) : value);

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <label htmlFor={id} className="text-sm font-medium">
            {label}
          </label>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        {allowUnlimited && (
          <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            Unlimited
            <Switch
              checked={unlimited}
              onCheckedChange={(on) => onChange(on ? -1 : lastFinite)}
              aria-label={`${label}: unlimited`}
            />
          </label>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type={unlimited ? "text" : "number"}
          min={min}
          step={1}
          value={unlimited ? "Unlimited" : value}
          disabled={unlimited}
          onChange={(e) => {
            const next = Number(e.target.value);
            setLastFinite(next);
            onChange(next);
          }}
          className="h-8"
        />
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}
