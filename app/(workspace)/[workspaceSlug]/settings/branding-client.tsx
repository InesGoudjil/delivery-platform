"use client";

import React, { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateBrandingAction } from "@/app/actions/portfolio";
import { PortfolioAppearance, PortfolioExperience, PortfolioHeroCover, PortfolioStats } from "@/core/entities/portfolio";
import { UserProfile } from "@/core/entities/user-profile";
import { SelectableCoverAsset } from "@/lib/portfolio-data";
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
    appearance?: PortfolioAppearance;
  };
  features?: any;
  userProfile?: UserProfile | null;
  availableAssets: SelectableCoverAsset[];
}

export function BrandingClient({
  workspace,
  portfolio,
  features,
  userProfile,
  availableAssets,
}: BrandingClientProps) {
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

  // 1. Studio Brand Logo (workspace level)
  const [logoUrl, setLogoUrl] = useState<string | null>(workspace.logoUrl || null);

  // 2. Filmmaker / User Profile Photo (user_profile level)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    userProfile?.avatarUrl || null
  );

  // 3. Hero Cover Asset Configuration
  const initialHeroCover: PortfolioHeroCover = portfolio.appearance?.heroCover || {
    assetId: availableAssets[0]?.id || null,
    type: availableAssets[0]?.type || "video",
    mediaUrl: portfolio.coverAssetUrl || availableAssets[0]?.url || "",
    thumbnailUrl: portfolio.coverAssetUrl || availableAssets[0]?.thumbnailUrl || "",
    title: portfolio.title || workspace.brandName,
    category: availableAssets[0]?.category || "Featured Film",
    aspectRatio: "21:9",
    overlayOpacity: 50,
    videoBehavior: "ambient_loop",
  };

  const [heroCover, setHeroCover] = useState<PortfolioHeroCover>(initialHeroCover);

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

  // Interactive Image Crop / Edit Dialog State
  const [cropEditor, setCropEditor] = useState<{
    isOpen: boolean;
    mode: "logo" | "avatar" | "cover";
    imageSrc: string | null;
    fileName: string;
  }>({
    isOpen: false,
    mode: "avatar",
    imageSrc: null,
    fileName: "image.jpg",
  });

  const showFlash = (msg: string) => {
    toast.success(msg);
  };

  // --- BRAND LOGO HANDLERS ---
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canBranding) {
      toast.error(
        "Custom studio logo is reserved for Pro, Studio, and Enterprise plans. Upgrade to unlock."
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
      mode: "logo",
      imageSrc: objectUrl,
      fileName: file.name,
    });
  };

  const handleEditLogo = () => {
    if (!canBranding) {
      toast.error(
        "Custom studio logo is reserved for Pro, Studio, and Enterprise plans. Upgrade to unlock."
      );
      return;
    }
    if (!logoUrl) return;
    setCropEditor({
      isOpen: true,
      mode: "logo",
      imageSrc: logoUrl,
      fileName: "brand-logo.png",
    });
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
    startTransition(async () => {
      const res = await updateBrandingAction(workspace.id, portfolio.id, {
        logoUrl: null,
        slug: workspace.slug,
      });
      if (res.success) {
        toast.success("Studio logo removed.");
      } else {
        toast.error(res.error || "Failed to remove logo.");
      }
    });
  };

  // --- PROFILE AVATAR HANDLERS ---
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = "";

    const objectUrl = URL.createObjectURL(file);
    setCropEditor({
      isOpen: true,
      mode: "avatar",
      imageSrc: objectUrl,
      fileName: file.name,
    });
  };

  const handleEditAvatar = () => {
    if (!avatarUrl) return;
    setCropEditor({
      isOpen: true,
      mode: "avatar",
      imageSrc: avatarUrl,
      fileName: "profile-avatar.jpg",
    });
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    startTransition(async () => {
      const res = await updateBrandingAction(workspace.id, portfolio.id, {
        avatarUrl: null,
        slug: workspace.slug,
      });
      if (res.success) {
        toast.success("Profile photo removed.");
      } else {
        toast.error(res.error || "Failed to remove photo.");
      }
    });
  };

  // --- DIRECT COVER UPLOAD HANDLER ---
  const handleCustomCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = "";

    const objectUrl = URL.createObjectURL(file);
    const isVid = file.type.startsWith("video/");

    if (isVid) {
      // Videos don't need image cropper
      const updatedCover: PortfolioHeroCover = {
        ...heroCover,
        assetId: null,
        type: "video",
        mediaUrl: objectUrl,
        thumbnailUrl: objectUrl,
        title: file.name.replace(/\.[^/.]+$/, ""),
        category: "Featured Film",
      };
      setHeroCover(updatedCover);
      toast.success("Video preview loaded as cover!");
    } else {
      setCropEditor({
        isOpen: true,
        mode: "cover",
        imageSrc: objectUrl,
        fileName: file.name,
      });
    }
  };

  // --- CROP CONFIRMATION HANDLER ---
  const handleApplyCropResult = async (result: ImageCropResult) => {
    if (cropEditor.mode === "logo") {
      const uploadToast = createUploadProgressToast(`branding-logo-${Date.now()}`);
      uploadToast.start("Saving brand logo...", "Persisting logo to workspace...");
      setLogoUrl(result.dataUrl);

      const res = await updateBrandingAction(workspace.id, portfolio.id, {
        logoUrl: canBranding ? result.dataUrl : undefined,
        slug: workspace.slug,
      });

      if (res.success) {
        uploadToast.success("Brand logo saved!", "Updated across header and client rooms.");
      } else {
        uploadToast.error(res.error || "Failed to save logo.");
      }
    } else if (cropEditor.mode === "avatar") {
      const uploadToast = createUploadProgressToast(`branding-avatar-${Date.now()}`);
      uploadToast.start("Saving profile photo...", "Persisting portrait to director bio...");
      setAvatarUrl(result.dataUrl);

      const res = await updateBrandingAction(workspace.id, portfolio.id, {
        avatarUrl: result.dataUrl,
        slug: workspace.slug,
      });

      if (res.success) {
        uploadToast.success("Profile photo saved!", "Updated in your portfolio About section.");
      } else {
        uploadToast.error(res.error || "Failed to save photo.");
      }
    } else {
      // Cover crop
      const updated: PortfolioHeroCover = {
        ...heroCover,
        assetId: null,
        type: "still",
        mediaUrl: result.dataUrl,
        thumbnailUrl: result.dataUrl,
      };
      setHeroCover(updated);
      toast.success("Cover banner updated!");
    }
  };

  // --- SAVE ALL BRANDING HANDLER ---
  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    startTransition(async () => {
      const res = await updateBrandingAction(workspace.id, portfolio.id, {
        brandName,
        accentColor: canBranding ? accent : undefined,
        logoUrl: canBranding ? logoUrl : undefined,
        avatarUrl,
        bio,
        heroCover,
        coverAssetUrl: heroCover.thumbnailUrl || heroCover.mediaUrl,
        whatsappNumber: whatsapp,
        experience: experiences,
        stats,
        slug: workspace.slug,
      });

      if (res.success) {
        toast.success("Brand logo, profile photo, cover hero, credentials & bio saved!");
      } else {
        toast.error(res.error || "Failed to update branding settings.");
      }
    });
  };

  return (
    <TooltipProvider delay={150}>
      <div className="w-full space-y-10 animate-in fade-in duration-200 pb-16">
        {/* Page Header */}
        <BrandingHeader
          workspaceSlug={workspace.slug}
          isPending={isPending}
          onSave={handleSaveAll}
        />

        {/* 1. Asset-Driven Cover Banner & Showcase Hero */}
        <CoverBannerSection
          heroCover={heroCover}
          onHeroCoverChange={setHeroCover}
          availableAssets={availableAssets}
          brandName={brandName}
          handle={handle}
          accent={accent}
          logoUrl={logoUrl}
          onCustomUpload={handleCustomCoverUpload}
        />

        {/* 2. Brand & Storefront Identity (with distinct Logo & Profile Avatar) */}
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
          onLogoUpload={handleLogoUpload}
          onEditLogo={handleEditLogo}
          onRemoveLogo={handleRemoveLogo}
          avatarUrl={avatarUrl}
          onAvatarUpload={handleAvatarUpload}
          onEditAvatar={handleEditAvatar}
          onRemoveAvatar={handleRemoveAvatar}
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
              Publishes your logo, profile photo, hero cover, bio, and credentials live
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Interactive Image Crop & Edit Modal */}
        <ImageCropEditorDialog
          isOpen={cropEditor.isOpen}
          onClose={() => setCropEditor((prev) => ({ ...prev, isOpen: false }))}
          imageSrc={cropEditor.imageSrc}
          title={
            cropEditor.mode === "logo"
              ? "EDIT BRAND LOGO"
              : cropEditor.mode === "avatar"
              ? "EDIT PROFILE PHOTO"
              : "EDIT & CROP COVER BANNER"
          }
          subtitle={
            cropEditor.mode === "logo"
              ? "Frame your studio insignia or brand mark."
              : cropEditor.mode === "avatar"
              ? "Frame your director portrait inside the circular safe zone."
              : "Adjust cover banner framing and aspect ratio."
          }
          defaultAspectRatio={
            cropEditor.mode === "avatar" ? "1:1" : cropEditor.mode === "logo" ? "1:1" : "16:9"
          }
          aspectRatioOptions={
            cropEditor.mode === "avatar"
              ? ["1:1"]
              : cropEditor.mode === "logo"
              ? ["1:1", "16:9"]
              : ["16:9", "3:1"]
          }
          lockAspectRatio={cropEditor.mode === "avatar"}
          circularGuide={cropEditor.mode === "avatar"}
          outputFileName={cropEditor.fileName}
          onApply={handleApplyCropResult}
        />
      </div>
    </TooltipProvider>
  );
}
