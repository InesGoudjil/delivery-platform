"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Sparkles,
  ArrowRight,
  Check,
  Building2,
  ShieldCheck,
  Loader2,
  Lock,
  Zap,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createTeamWorkspaceAction, switchWorkspacePlanAction } from "@/app/actions/workspaces";

interface PlanFeatureItem {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  currency: string;
  features?: Record<string, any>;
}

interface NewWorkspaceClientProps {
  isEligible: boolean;
  maxSeats: number;
  currentPlanName: string;
  primaryWorkspaceId: string;
  primaryWorkspaceSlug: string;
  plans: PlanFeatureItem[];
  userWorkspaces: Array<{
    id: string;
    brandName: string;
    slug: string;
    accountType?: string;
  }>;
}

export function NewWorkspaceClient({
  isEligible,
  maxSeats,
  currentPlanName,
  primaryWorkspaceId,
  primaryWorkspaceSlug,
  plans,
  userWorkspaces,
}: NewWorkspaceClientProps) {
  const router = useRouter();

  const [brandName, setBrandName] = useState("");
  const [slug, setSlug] = useState("");
  const [accentColor, setAccentColor] = useState("#f5551d");
  const [defaultLanguage, setDefaultLanguage] = useState<"ar" | "en">("en");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBrandName(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(autoSlug);
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("brandName", brandName);
    formData.append("slug", slug);
    formData.append("accentColor", accentColor);
    formData.append("defaultLanguage", defaultLanguage);

    const res = await createTeamWorkspaceAction(formData);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to create workspace.");
      setIsSubmitting(false);
      return;
    }

    if (res.data?.slug) {
      router.push(`/${res.data.slug}`);
    } else {
      router.push("/");
    }
  };

  const handleQuickUpgrade = async () => {
    setIsUpgrading(true);
    setErrorMsg(null);
    const res = await switchWorkspacePlanAction(primaryWorkspaceId, "studio");
    if (!res.success) {
      setErrorMsg(res.error || "Failed to upgrade plan.");
      setIsUpgrading(false);
      return;
    }
    router.refresh();
    setIsUpgrading(false);
  };

  const studioPlan = plans.find((p) => p.slug === "studio") || {
    name: "Studio",
    priceCents: 6900,
    features: { team_seats: 5, storage_gb: 2048 },
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-in fade-in duration-200">
      {/* Top Header Breadcrumb */}
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
            <Link href={`/${primaryWorkspaceSlug}`} className="hover:text-foreground transition-colors">
              Workspaces
            </Link>
            <ChevronRight className="size-3.5" />
            <span className="text-primary font-bold">New Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-foreground">
            {isEligible ? "Create a Team Workspace" : "Team Workspaces (Studio Plan)"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEligible
              ? "Your Studio subscription includes team seats. Invite your assistant editors, colorists, and post producers to collaborate."
              : "Collaborative workspaces with multi-member team seats require the Studio Plan."}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <Badge variant={isEligible ? "default" : "outline"} className="px-3 py-1 font-mono text-xs">
            {isEligible ? "Studio Plan Active (5 Seats)" : `Current: ${currentPlanName} (Solo 1 Seat)`}
          </Badge>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {!isEligible ? (
        /* GATING PAYWALL: User needs Studio Plan */
        <div className="space-y-6">
          <Card className="border-2 border-primary/40 bg-gradient-to-br from-card via-card to-primary/5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Users className="size-48 text-primary" />
            </div>

            <CardHeader className="space-y-3 pb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold w-fit border border-primary/30">
                <Lock className="size-3.5" />
                <span>Subscription Upgrade Required</span>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold font-heading text-foreground">
                Collaborative Team Seats Require the Studio Plan
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground max-w-xl">
                Personal workspaces on Starter, Basic, and Pro tiers are configured for solo creators (1 seat).
                Upgrading to the <strong>Studio Plan</strong> unlocks secondary team workspaces with up to{" "}
                <strong>5 team collaborator seats</strong>, enabling shared project rooms, client note reviews, and multi-editor delivery workflows.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 py-2">
              {/* Studio Plan Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="flex items-start gap-2.5 text-xs text-foreground p-3 rounded-xl bg-muted/60 border border-border">
                  <Check className="size-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">5 Team Collaborator Seats</span>
                    <p className="text-muted-foreground text-[11px]">Invite assistant editors, colorists, and post producers</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-foreground p-3 rounded-xl bg-muted/60 border border-border">
                  <Check className="size-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">2,048 GB (2 TB) High-Speed Storage</span>
                    <p className="text-muted-foreground text-[11px]">Ample space for 4K ProRes cuts and project master exports</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-foreground p-3 rounded-xl bg-muted/60 border border-border">
                  <Check className="size-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Unlimited Client Delivery Links</span>
                    <p className="text-muted-foreground text-[11px]">Share protected delivery rooms with unlimited clients</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-foreground p-3 rounded-xl bg-muted/60 border border-border">
                  <Check className="size-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">White-Label Branding &amp; Watermarking</span>
                    <p className="text-muted-foreground text-[11px]">Your custom studio logos, player watermarks, and domains</p>
                  </div>
                </div>
              </div>

              {/* Plans Comparison Snapshot */}
              <div className="p-4 rounded-xl bg-background/80 border border-border space-y-3">
                <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider font-semibold">
                  Plans Seat &amp; Team Comparison
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {plans.map((p) => {
                    const seats = p.features?.team_seats ?? 1;
                    const isStudio = p.slug === "studio";
                    return (
                      <div
                        key={p.id}
                        className={`p-3 rounded-lg border flex flex-col justify-between ${
                          isStudio
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border bg-muted/40 opacity-75"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-foreground flex items-center justify-between">
                            <span>{p.name}</span>
                            {isStudio && (
                              <span className="text-[10px] bg-primary text-black font-bold px-1.5 py-0.2 rounded">
                                Teams
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-mono font-bold text-foreground mt-1">
                            ${(p.priceCents / 100).toFixed(0)}
                            <span className="text-[10px] text-muted-foreground font-normal"> /mo</span>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-border/50 text-[11px] font-mono">
                          <span className={isStudio ? "text-primary font-bold" : "text-muted-foreground"}>
                            {seats} {seats > 1 ? "Team Seats" : "Seat (Solo)"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6 border-t border-border">
              <div className="text-xs text-muted-foreground font-mono">
                Studio Plan: ${(studioPlan.priceCents / 100).toFixed(0)}/mo • Cancel anytime
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                {/* 1-Click Fast Upgrade for Development / Demo testing */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleQuickUpgrade}
                  disabled={isUpgrading}
                  className="rounded-full text-xs font-semibold cursor-pointer w-full sm:w-auto"
                  title="Instantly switch your workspace to Studio plan in development test mode"
                >
                  {isUpgrading ? (
                    <>
                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                      Upgrading...
                    </>
                  ) : (
                    <>
                      <Zap className="size-3.5 mr-1.5 text-amber-400" />
                      1-Click Upgrade (Demo)
                    </>
                  )}
                </Button>

                <Button
                  asChild
                  size="sm"
                  className="rounded-full bg-primary text-black font-bold hover:bg-primary/90 shadow-md shadow-primary/20 text-xs cursor-pointer w-full sm:w-auto"
                >
                  <Link href={`/${primaryWorkspaceSlug}/subscription`}>
                    <span>View Subscription &amp; Upgrade</span>
                    <ArrowRight className="size-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      ) : (
        /* CREATION FORM: User is eligible (Studio Plan Active) */
        <div className="space-y-6">
          <Card className="border border-border bg-card shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2 text-xs font-mono text-primary font-semibold mb-1">
                <ShieldCheck className="size-4" />
                <span>Studio Tier Feature Unlocked</span>
              </div>
              <CardTitle className="text-xl font-bold font-heading text-card-foreground">
                Set up your Team Workspace
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                This will create a dedicated workspace equipped with 5 team collaborator seats alongside your personal workspace.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleCreateWorkspace}>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Studio / Team Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CineSpace Post House"
                    value={brandName}
                    onChange={handleNameChange}
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    This brand name will appear on client delivery portals and the workspace switcher.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Workspace URL Slug
                  </label>
                  <div className="flex items-center rounded-xl border border-border bg-muted overflow-hidden px-3 py-2 text-xs">
                    <span className="text-muted-foreground font-mono mr-1">app.cutgrid.com/</span>
                    <input
                      type="text"
                      required
                      placeholder="my-team-studio"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      className="bg-transparent border-none text-foreground font-mono focus:outline-none flex-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Brand Accent Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="size-8 rounded-lg cursor-pointer border border-border bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Default Language
                    </label>
                    <select
                      value={defaultLanguage}
                      onChange={(e) => setDefaultLanguage(e.target.value as "ar" | "en")}
                      className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="en">English (Default)</option>
                      <option value="ar">العربية (Arabic)</option>
                    </select>
                  </div>
                </div>

                {/* Team Seat Guarantee Callout */}
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 flex items-start gap-3">
                  <Sparkles className="size-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-foreground">
                      Includes 5 Collaborator Seats
                    </span>
                    <p className="text-muted-foreground mt-0.5">
                      Once created, you can navigate to <strong>Team Collaborators</strong> from the sidebar to invite editors, colorists, and post producers by email.
                    </p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                  className="rounded-full text-xs cursor-pointer"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting || !brandName.trim()}
                  className="rounded-full text-xs font-bold bg-primary text-black hover:bg-primary/90 shadow-md shadow-primary/20 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                      Creating Workspace...
                    </>
                  ) : (
                    <>
                      <Building2 className="size-3.5 mr-1.5" />
                      Create Studio Workspace
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
