"use client";

import React, { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateBrandingAction } from "@/app/actions/portfolio";
import { PortfolioExperience, PortfolioStats } from "@/core/entities/portfolio";
import { COVER_PRESETS } from "./_components/constants";
import { BrandingHeader } from "./_components/branding-header";
import { CoverBannerSection } from "./_components/cover-banner-section";
import { StorefrontIdentitySection } from "./_components/storefront-identity-section";
import { BioSection } from "./_components/bio-section";
import { ExperienceCredentialsSection } from "./_components/experience-credentials-section";

interface BrandingClientProps {
  workspace: {
    id: string;
    brandName: string;
    slug: string;
    logoUrl?: string | null;
    accentColor?: string | null;
  };
  portfolio: {
    id: string;
    title: string;
    bio?: string | null;
    coverAssetUrl?: string | null;
    whatsappNumber?: string | null;
    experience?: PortfolioExperience[];
    stats?: PortfolioStats;
  };
}

export function BrandingClient({ workspace, portfolio }: BrandingClientProps) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  // Brand details
  const [brandName, setBrandName] = useState(workspace.brandName || "Pedro Concreato");
  const [handle, setHandle] = useState(workspace.slug);
  const [accent, setAccent] = useState(workspace.accentColor || "#F5551D");
  const [whatsapp, setWhatsapp] = useState(portfolio.whatsappNumber || "+971501234567");

  // Profile image / avatar
  const [logoUrl, setLogoUrl] = useState<string | null>(workspace.logoUrl || null);

  // Showcase Stats
  const [stats, setStats] = useState<PortfolioStats>(
    portfolio.stats || {
      projects: "",
      years: "",
      location: "",
    }
  );

  // Experiences list
  const [experiences, setExperiences] = useState<PortfolioExperience[]>(
    portfolio.experience || []
  );

  // Bio
  const [bio, setBio] = useState(
    portfolio.bio ||
      "Directing high-impact commercial campaigns, brand documentaries, and luxury wedding films across Dubai, Abu Dhabi, and the Gulf region. Full end-to-end 4K/8K production."
  );

  // Cover image: either preset URL or custom uploaded data URL / image URL
  const [coverUrl, setCoverUrl] = useState<string>(
    portfolio.coverAssetUrl || COVER_PRESETS[0].url
  );
  const [isCustomCover, setIsCustomCover] = useState(
    portfolio.coverAssetUrl ? !COVER_PRESETS.some((p) => p.url === portfolio.coverAssetUrl) : false
  );

  const showFlash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSelectPreset = (url: string) => {
    setCoverUrl(url);
    setIsCustomCover(false);
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setCoverUrl(result);
        setIsCustomCover(true);
        showFlash("Cover image uploaded! Click Save to apply changes.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setLogoUrl(result);
        showFlash("Profile photo uploaded! Click Save to apply changes.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveProfile = () => {
    setLogoUrl(null);
    showFlash("Profile photo removed.");
  };

  const handleRemoveCover = () => {
    setCoverUrl(COVER_PRESETS[0].url);
    setIsCustomCover(false);
    showFlash("Reset to default cinematic cover.");
  };

  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    startTransition(async () => {
      const res = await updateBrandingAction(workspace.id, portfolio.id, {
        brandName,
        accentColor: accent,
        logoUrl,
        bio,
        coverAssetUrl: coverUrl,
        whatsappNumber: whatsapp,
        experience: experiences,
        stats,
        slug: workspace.slug,
      });

      if (res.success) {
        showFlash("Brand, profile photo, cover, credentials & bio updated successfully!");
      } else {
        showFlash(res.error || "Failed to update branding settings.");
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-200 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#f5551d] text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 border border-white/20">
          {toast}
        </div>
      )}

      {/* Page Header */}
      <BrandingHeader
        workspaceSlug={workspace.slug}
        isPending={isPending}
        onSave={handleSaveAll}
      />

      {/* 1. Cover Image & Banner Selection */}
      <CoverBannerSection
        coverUrl={coverUrl}
        isCustomCover={isCustomCover}
        brandName={brandName}
        handle={handle}
        accent={accent}
        logoUrl={logoUrl}
        onSelectPreset={handleSelectPreset}
        onCustomUpload={handleCustomUpload}
        onRemoveCover={handleRemoveCover}
        onProfileUpload={handleProfileUpload}
      />

      {/* 2. Brand & Storefront Identity */}
      <StorefrontIdentitySection
        brandName={brandName}
        onBrandNameChange={setBrandName}
        handle={handle}
        onHandleChange={setHandle}
        whatsapp={whatsapp}
        onWhatsappChange={setWhatsapp}
        accent={accent}
        onAccentChange={setAccent}
        logoUrl={logoUrl}
        onProfileUpload={handleProfileUpload}
        onRemoveProfile={handleRemoveProfile}
        stats={stats}
        onStatsChange={setStats}
      />

      {/* 3. Bio & About Description */}
      <BioSection bio={bio} onBioChange={setBio} />

      {/* 4. Experience & Credentials */}
      <ExperienceCredentialsSection
        portfolioId={portfolio.id}
        initialExperiences={experiences}
        showFlash={showFlash}
        onExperiencesChange={setExperiences}
      />

      {/* Bottom Save Action */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSaveAll}
          disabled={isPending}
          className="rounded-full bg-[#f5551d] hover:bg-[#ff8a45] text-black font-extrabold text-xs px-8 py-3 shadow-xl shadow-[#f5551d]/20 transition-all uppercase tracking-wider h-auto cursor-pointer"
        >
          <Sparkles className="size-4 mr-1.5" />
          <span>{isPending ? "Saving changes..." : "SAVE ALL BRAND SETTINGS"}</span>
        </Button>
      </div>
    </div>
  );
}
