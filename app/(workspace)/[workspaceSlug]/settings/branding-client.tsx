"use client";

import React, { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateBrandingAction } from "@/app/actions/portfolio";
import { PortfolioAppearance, PortfolioExperience, PortfolioHeroCover, PortfolioStats } from "@/core/entities/portfolio";
import { UserProfile } from "@/core/entities/user-profile";
import { SelectableCoverAsset } from "@/lib/portfolio-data";
import { BrandingHeader } from "./_components/branding-header";
import { StorefrontIdentitySection } from "./_components/storefront-identity-section";
import { BioSection } from "./_components/bio-section";
// Preserved for client credentials feature logic
// import { ExperienceCredentialsSection } from "./_components/experience-credentials-section";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { TypographySpan } from "@/components/ui/typography";
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
  availableAssets?: SelectableCoverAsset[];
}

export function BrandingClient({
  workspace,
  portfolio,
  features,
  userProfile,
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

  // 3. Hero Cover is now curated under Portfolio screen
  const currentHeroCover = portfolio.appearance?.heroCover;

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
      "Directing high-impact commercial campaigns, brand documentaries, and luxury wedding films across Dubai, Abu Dhabi, and the Gulf region. Full end-to-end digital production."
  );

  // Baseline Saved State for Unsaved Changes (Dirty Tracking)
  const [savedState, setSavedState] = useState({
    brandName: workspace.brandName || "Pedro Concreato",
    handle: workspace.slug,
    accent: workspace.accentColor || "#F5551D",
    whatsapp: portfolio.whatsappNumber || "+971501234567",
    bio:
      portfolio.bio ||
      "Directing high-impact commercial campaigns, brand documentaries, and luxury wedding films across Dubai, Abu Dhabi, and the Gulf region. Full end-to-end digital production.",
    stats: portfolio.stats || {
      projects: "",
      years: "",
      location: "",
    },
  });

  const isDirty = React.useMemo(() => {
    if (brandName !== savedState.brandName) return true;
    if (handle !== savedState.handle) return true;
    if (accent !== savedState.accent) return true;
    if (whatsapp !== savedState.whatsapp) return true;
    if (bio !== savedState.bio) return true;
    if (
      stats.projects !== savedState.stats.projects ||
      stats.years !== savedState.stats.years ||
      stats.location !== savedState.stats.location
    )
      return true;
    return false;
  }, [brandName, handle, accent, whatsapp, bio, stats, savedState]);

  const handleResetChanges = () => {
    setBrandName(savedState.brandName);
    setHandle(savedState.handle);
    setAccent(savedState.accent);
    handleAccentChange(savedState.accent);
    setWhatsapp(savedState.whatsapp);
    setBio(savedState.bio);
    setStats({ ...savedState.stats });
    toast.info("Unsaved changes discarded.");
  };

  // Interactive Image Crop / Edit Dialog State
  const [cropEditor, setCropEditor] = useState<{
    isOpen: boolean;
    mode: "logo" | "avatar";
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
    }
  };

  // --- SAVE ALL BRANDING HANDLER ---
  const handleSaveAll = React.useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      startTransition(async () => {
        const res = await updateBrandingAction(workspace.id, portfolio.id, {
          brandName,
          accentColor: canBranding ? accent : undefined,
          logoUrl: canBranding ? logoUrl : undefined,
          avatarUrl,
          bio,
          heroCover: currentHeroCover,
          coverAssetUrl: portfolio.coverAssetUrl,
          whatsappNumber: whatsapp,
          experience: experiences,
          stats,
          slug: workspace.slug,
        });

        if (res.success) {
          setSavedState({
            brandName,
            handle,
            accent,
            whatsapp,
            bio,
            stats: { ...stats },
          });
          toast.success("Brand identity & bio settings saved!");
        } else {
          toast.error(res.error || "Failed to update branding settings.");
        }
      });
    },
    [
      workspace.id,
      workspace.slug,
      portfolio.id,
      portfolio.coverAssetUrl,
      currentHeroCover,
      brandName,
      accent,
      canBranding,
      logoUrl,
      avatarUrl,
      bio,
      whatsapp,
      experiences,
      stats,
      handle,
    ]
  );

  // Keyboard shortcut: Cmd/Ctrl + S to save
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSaveAll();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSaveAll]);

  return (
    <TooltipProvider delay={150}>
      <div className="w-full space-y-8 animate-in fade-in duration-200 pb-20">
        {/* Page Header */}
        <BrandingHeader
          workspaceSlug={workspace.slug}
          isPending={isPending}
          isDirty={isDirty}
          onSave={handleSaveAll}
        />

        {/* 1. Brand & Storefront Identity (with distinct Logo & Profile Avatar) */}
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

        {/* 2. Bio & About Description */}
        <BioSection bio={bio} onBioChange={setBio} />

        {/* 3. Experience & Credentials - Hidden visually per client request (logic & schema preserved) */}
        {/*
        <ExperienceCredentialsSection
          portfolioId={portfolio.id}
          initialExperiences={experiences}
          showFlash={showFlash}
          onExperiencesChange={setExperiences}
        />
        */}

        {/* Floating Unsaved Changes Action Dock (Replaces awkward static bottom button) */}
        {isDirty && (
          <div className="fixed bottom-6 inset-x-0 mx-auto w-fit max-w-[92vw] z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="bg-zinc-950/95 border border-primary/40 backdrop-blur-xl shadow-2xl rounded-full px-4 sm:px-6 py-2.5 flex items-center gap-3 sm:gap-5 text-white ring-1 ring-white/10">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="size-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <TypographySpan className="text-zinc-200 font-sans hidden sm:inline">
                  Unsaved brand changes
                </TypographySpan>
                <TypographySpan className="text-zinc-200 font-sans sm:hidden">
                  Unsaved changes
                </TypographySpan>
              </div>
              <div className="h-4 w-px bg-white/20 shrink-0" />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetChanges}
                  disabled={isPending}
                  className="text-xs text-zinc-400 hover:text-white h-8 px-3 rounded-full hover:bg-white/10 cursor-pointer"
                >
                  <TypographySpan>Discard</TypographySpan>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => handleSaveAll(e)}
                  disabled={isPending}
                  className="text-xs font-extrabold rounded-full bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-4 shadow-lg shadow-primary/25 flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                >
                  {isPending ? (
                    <>
                      <Sparkles className="size-3.5 animate-spin" />
                      <TypographySpan>Saving...</TypographySpan>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5" />
                      <TypographySpan>Save Changes</TypographySpan>
                      <kbd className="hidden md:inline-block ml-1 font-mono text-[10px] bg-black/40 px-1 py-0.5 rounded text-white/90">
                        ⌘S
                      </kbd>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Image Crop & Edit Modal */}
        <ImageCropEditorDialog
          isOpen={cropEditor.isOpen}
          onClose={() => setCropEditor((prev) => ({ ...prev, isOpen: false }))}
          imageSrc={cropEditor.imageSrc}
          title={cropEditor.mode === "logo" ? "EDIT BRAND LOGO" : "EDIT PROFILE PHOTO"}
          subtitle={
            cropEditor.mode === "logo"
              ? "Frame your studio insignia or brand mark."
              : "Frame your director portrait inside the circular safe zone."
          }
          defaultAspectRatio="1:1"
          aspectRatioOptions={cropEditor.mode === "logo" ? ["1:1", "16:9"] : ["1:1"]}
          lockAspectRatio={cropEditor.mode === "avatar"}
          circularGuide={cropEditor.mode === "avatar"}
          outputFileName={cropEditor.fileName}
          onApply={handleApplyCropResult}
        />
      </div>
    </TooltipProvider>
  );
}
