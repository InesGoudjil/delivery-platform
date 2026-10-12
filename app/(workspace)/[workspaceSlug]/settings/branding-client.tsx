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
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useAccentTheme } from "@/components/theme/accent-theme-provider";
import { toast } from "sonner";
import { createUploadProgressToast } from "@/lib/upload-toast";
import {
  ImageCropEditorDialog,
  ImageCropResult,
} from "@/components/ui/image-crop-editor-dialog";

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
  features?: any;
}

export function BrandingClient({ workspace, portfolio, features }: BrandingClientProps) {
  const [isPending, startTransition] = useTransition();
  const { setAccent: setLiveAccent } = useAccentTheme();

  const canBranding = features ? Boolean(features.branding) : true;
  const canWhatsapp = features ? Boolean(features.whatsapp_delivery ?? features.whatsappDelivery) : true;

  // Brand details
  const [brandName, setBrandName] = useState(workspace.brandName || "Pedro Concreato");
  const [handle, setHandle] = useState(workspace.slug);
  const [accent, setAccent] = useState(workspace.accentColor || "#F5551D");

  const handleAccentChange = (newColor: string) => {
    setAccent(newColor);
    if (canBranding) {
      setLiveAccent(newColor);
    }
  };
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

  // Interactive Image Crop / Edit Dialog State
  const [cropEditor, setCropEditor] = useState<{
    isOpen: boolean;
    mode: "cover" | "profile";
    imageSrc: string | null;
    fileName: string;
  }>({
    isOpen: false,
    mode: "cover",
    imageSrc: null,
    fileName: "image.jpg",
  });

  const showFlash = (msg: string) => {
    toast.success(msg);
  };

  const handleSelectPreset = (url: string) => {
    setCoverUrl(url);
    setIsCustomCover(false);
    startTransition(async () => {
      const res = await updateBrandingAction(workspace.id, portfolio.id, {
        coverAssetUrl: url,
        slug: workspace.slug,
      });
      if (res.success) {
        toast.success("Cover preset saved to your portfolio!");
      } else {
        toast.error(res.error || "Failed to save cover preset.");
      }
    });
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = "";

    const objectUrl = URL.createObjectURL(file);
    setCropEditor({
      isOpen: true,
      mode: "cover",
      imageSrc: objectUrl,
      fileName: file.name,
    });
  };

  const handleEditCurrentCover = () => {
    if (!coverUrl) return;
    setCropEditor({
      isOpen: true,
      mode: "cover",
      imageSrc: coverUrl,
      fileName: "cover-banner.jpg",
    });
  };

  const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canBranding) {
      toast.error(
        "Custom studio profile/logo is reserved for Pro, Studio, and Enterprise plans. Upgrade to unlock."
      );
      return;
    }
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = "";

    const objectUrl = URL.createObjectURL(file);
    setCropEditor({
      isOpen: true,
      mode: "profile",
      imageSrc: objectUrl,
      fileName: file.name,
    });
  };

  const handleEditCurrentProfile = () => {
    if (!canBranding) {
      toast.error(
        "Custom studio profile/logo is reserved for Pro, Studio, and Enterprise plans. Upgrade to unlock."
      );
      return;
    }
    if (!logoUrl) return;
    setCropEditor({
      isOpen: true,
      mode: "profile",
      imageSrc: logoUrl,
      fileName: "profile-avatar.jpg",
    });
  };

  const handleApplyCropResult = async (result: ImageCropResult) => {
    if (cropEditor.mode === "cover") {
      const uploadToast = createUploadProgressToast(`branding-cover-${Date.now()}`);
      uploadToast.start(
        `Saving cover "${cropEditor.fileName}"...`,
        "Persisting cropped banner to portfolio..."
      );
      setCoverUrl(result.dataUrl);
      setIsCustomCover(true);
      uploadToast.update({
        title: `Saving cover "${cropEditor.fileName}"`,
        progress: 65,
        loadedBytes: Math.round(result.file.size * 0.65),
        totalBytes: result.file.size,
      });

      const res = await updateBrandingAction(workspace.id, portfolio.id, {
        coverAssetUrl: result.dataUrl,
        slug: workspace.slug,
      });

      if (res.success) {
        uploadToast.success(
          "Cover banner cropped & saved!",
          "Your public portfolio cover has been updated."
        );
      } else {
        uploadToast.error(res.error || "Failed to save cropped cover banner.");
      }
    } else {
      const uploadToast = createUploadProgressToast(`branding-profile-${Date.now()}`);
      uploadToast.start(
        `Saving profile photo "${cropEditor.fileName}"...`,
        "Persisting cropped avatar to workspace..."
      );
      setLogoUrl(result.dataUrl);
      uploadToast.update({
        title: `Saving profile photo "${cropEditor.fileName}"`,
        progress: 65,
        loadedBytes: Math.round(result.file.size * 0.65),
        totalBytes: result.file.size,
      });

      const res = await updateBrandingAction(workspace.id, portfolio.id, {
        logoUrl: canBranding ? result.dataUrl : undefined,
        slug: workspace.slug,
      });

      if (res.success) {
        uploadToast.success(
          "Profile photo cropped & saved!",
          "Your studio avatar has been updated across the platform."
        );
      } else {
        uploadToast.error(res.error || "Failed to save cropped profile photo.");
      }
    }
  };

  const handleRemoveProfile = () => {
    setLogoUrl(null);
    startTransition(async () => {
      const res = await updateBrandingAction(workspace.id, portfolio.id, {
        logoUrl: null,
        slug: workspace.slug,
      });
      if (res.success) {
        toast.success("Profile photo removed and saved.");
      } else {
        toast.error(res.error || "Failed to remove profile photo.");
      }
    });
  };

  const handleRemoveCover = () => {
    const defaultCover = COVER_PRESETS[0].url;
    setCoverUrl(defaultCover);
    setIsCustomCover(false);
    startTransition(async () => {
      const res = await updateBrandingAction(workspace.id, portfolio.id, {
        coverAssetUrl: defaultCover,
        slug: workspace.slug,
      });
      if (res.success) {
        toast.success("Reset to default cinematic cover and saved.");
      } else {
        toast.error(res.error || "Failed to reset cover.");
      }
    });
  };

  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    startTransition(async () => {
      const res = await updateBrandingAction(workspace.id, portfolio.id, {
        brandName,
        accentColor: canBranding ? accent : undefined,
        logoUrl: canBranding ? logoUrl : undefined,
        bio,
        coverAssetUrl: coverUrl,
        whatsappNumber: whatsapp,
        experience: experiences,
        stats,
        slug: workspace.slug,
      });

      if (res.success) {
        toast.success("Brand, profile photo, cover, credentials & bio updated successfully!");
      } else {
        toast.error(res.error || "Failed to update branding settings.");
      }
    });
  };

  return (
    <TooltipProvider delay={150}>
      <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-200 pb-16">
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
          onEditCover={handleEditCurrentCover}
          onRemoveCover={handleRemoveCover}
          onProfileUpload={handleProfileUpload}
          onEditProfile={handleEditCurrentProfile}
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
          onAccentChange={handleAccentChange}
          logoUrl={logoUrl}
          onProfileUpload={handleProfileUpload}
          onEditProfile={handleEditCurrentProfile}
          onRemoveProfile={handleRemoveProfile}
          stats={stats}
          onStatsChange={setStats}
          canBranding={canBranding}
          canWhatsapp={canWhatsapp}
          workspaceSlug={workspace.slug}
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
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  onClick={handleSaveAll}
                  disabled={isPending}
                  className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs px-8 py-3 shadow-xl shadow-primary/25 transition-all uppercase tracking-wider h-auto cursor-pointer"
                >
                  <Sparkles className="size-4 mr-1.5" />
                  <span>{isPending ? "Saving changes..." : "SAVE ALL BRAND SETTINGS"}</span>
                </Button>
              }
            />
            <TooltipContent side="top">
              Publishes your logo, cover, bio, and credentials live
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Interactive Image Crop & Edit Modal */}
        <ImageCropEditorDialog
          isOpen={cropEditor.isOpen}
          onClose={() => setCropEditor((prev) => ({ ...prev, isOpen: false }))}
          imageSrc={cropEditor.imageSrc}
          title={
            cropEditor.mode === "cover"
              ? "EDIT & CROP COVER BANNER"
              : "EDIT & CROP PROFILE PHOTO"
          }
          subtitle={
            cropEditor.mode === "cover"
              ? "Position, zoom, rotate, or color-grade your storefront hero banner."
              : "Frame your studio portrait or logo inside the 1:1 avatar safe zone."
          }
          defaultAspectRatio={cropEditor.mode === "cover" ? "3:1" : "1:1"}
          aspectRatioOptions={cropEditor.mode === "cover" ? ["3:1", "16:9"] : ["1:1"]}
          lockAspectRatio={cropEditor.mode === "profile"}
          circularGuide={cropEditor.mode === "profile"}
          outputFileName={cropEditor.fileName}
          onApply={handleApplyCropResult}
        />
      </div>
    </TooltipProvider>
  );
}
