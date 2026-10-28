"use client";

import React, { useState } from "react";
import {
  Play,
  MessageCircle,
  X,
  ArrowRight,
  Send,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { PortfolioAsset, PortfolioProject } from "@/lib/portfolio-data";
import { TypographySpan } from "@/components/ui/typography";
import { usePortfolioModal } from "./portfolio-context";
import { Button } from "@/components/ui/button";
import { submitPortfolioInquiryAction } from "@/app/actions/inquiries";
import { AssetLightboxModal } from "@/components/workspaces/asset-lightbox-modal";
import { detectAspectRatioFromDimensions } from "@/lib/media-ratios";
import {
  UniversalDialogRoot,
  UniversalDialogContent,
} from "@/components/ui/universal-dialog";

export function PortfolioModals() {
  const {
    profile,
    projects,
    assets,
    appearance,
    activeStill,
    setActiveStill,
    activeFilm,
    setActiveFilm,
    selectedProject,
    setSelectedProject,
    isContactOpen,
    setIsContactOpen,
    handleWhatsAppChat,
  } = usePortfolioModal();

  // Contact form submission state
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [projectDetails, setProjectDetails] = useState("");
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientContact.trim() || !projectDetails.trim()) {
      toast.error("Please fill in all inquiry fields.");
      return;
    }

    try {
      setIsSubmittingContact(true);
      const res = await submitPortfolioInquiryAction({
        handle: profile.handle,
        name: clientName,
        emailOrPhone: clientContact,
        details: projectDetails,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to submit inquiry.");
        return;
      }

      setContactSubmitted(true);
      toast.success("Inquiry sent successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit inquiry.");
    } finally {
      setIsSubmittingContact(false);
    }
  };

  // Still navigation (next / prev)
  const handleNextStill = () => {
    if (!activeStill) return;
    const stills = assets.filter((a) => a.kind === "still");
    const currentList = selectedProject
      ? assets.filter(
          (a) => selectedProject.assetIds.includes(a.id) && a.kind === "still"
        )
      : stills;
    if (currentList.length <= 1) return;
    const currentIndex = currentList.findIndex((s) => s.id === activeStill.id);
    if (currentIndex < currentList.length - 1) {
      setActiveStill(currentList[currentIndex + 1]);
    } else {
      setActiveStill(currentList[0]);
    }
  };

  const handlePrevStill = () => {
    if (!activeStill) return;
    const stills = assets.filter((a) => a.kind === "still");
    const currentList = selectedProject
      ? assets.filter(
          (a) => selectedProject.assetIds.includes(a.id) && a.kind === "still"
        )
      : stills;
    if (currentList.length <= 1) return;
    const currentIndex = currentList.findIndex((s) => s.id === activeStill.id);
    if (currentIndex > 0) {
      setActiveStill(currentList[currentIndex - 1]);
    } else {
      setActiveStill(currentList[currentList.length - 1]);
    }
  };

  // Film navigation (next / prev)
  const handleNextFilm = () => {
    if (!activeFilm) return;
    const films = assets.filter((a) => a.kind === "film");
    const currentList = selectedProject
      ? assets.filter(
          (a) => selectedProject.assetIds.includes(a.id) && a.kind === "film"
        )
      : films;
    if (currentList.length <= 1) return;
    const currentIndex = currentList.findIndex((f) => f.id === activeFilm.id);
    if (currentIndex < currentList.length - 1) {
      setActiveFilm(currentList[currentIndex + 1]);
    } else {
      setActiveFilm(currentList[0]);
    }
  };

  const handlePrevFilm = () => {
    if (!activeFilm) return;
    const films = assets.filter((a) => a.kind === "film");
    const currentList = selectedProject
      ? assets.filter(
          (a) => selectedProject.assetIds.includes(a.id) && a.kind === "film"
        )
      : films;
    if (currentList.length <= 1) return;
    const currentIndex = currentList.findIndex((f) => f.id === activeFilm.id);
    if (currentIndex > 0) {
      setActiveFilm(currentList[currentIndex - 1]);
    } else {
      setActiveFilm(currentList[currentList.length - 1]);
    }
  };

  const hasMultipleStills =
    assets.filter((a) => (selectedProject ? selectedProject.assetIds.includes(a.id) : true) && a.kind === "still")
      .length > 1;

  const hasMultipleFilms =
    assets.filter((a) => (selectedProject ? selectedProject.assetIds.includes(a.id) : true) && a.kind === "film")
      .length > 1;

  return (
    <>
      {/* 🖼️ STILL LIGHTBOX MODAL */}
      <AssetLightboxModal
        activeItem={
          activeStill
            ? {
                ...activeStill,
                id: String(activeStill.id),
                type: "still",
                kind: "still",
                src: activeStill.image,
                image: activeStill.image,
                aspectRatio:
                  typeof activeStill.ar === "number" && activeStill.ar > 0
                    ? (() => {
                        const detected = detectAspectRatioFromDimensions(activeStill.ar * 1000, 1000);
                        return detected.id === "custom" ? detected.cssRatio : detected.id;
                      })()
                    : undefined,
              }
            : null
        }
        onClose={() => setActiveStill(null)}
        onBack={
          selectedProject
            ? () => {
                setActiveStill(null);
                setActiveFilm(null);
              }
            : undefined
        }
        onNext={hasMultipleStills ? handleNextStill : undefined}
        onPrev={hasMultipleStills ? handlePrevStill : undefined}
        showFeedback={false}
        showVersions={false}
        showDownload={false}
        showShareLink={true}
        footerExtra={
          activeStill ? (
            <div className="w-full flex items-center justify-between text-xs  text-zinc-400">
              <TypographySpan className="truncate max-w-sm sm:max-w-md">{activeStill.desc}</TypographySpan>
              <Button
                variant="link"
                size="xs"
                onClick={() =>
                  handleWhatsAppChat(
                    `Hi ${profile.name}, I love your still "${activeStill.title}". I would like to inquire about a shoot.`
                  )
                }
                className="h-auto p-0 text-primary hover:underline font-bold cursor-pointer shrink-0 ml-4"
              >
                Inquire About Shoot →
              </Button>
            </div>
          ) : null
        }
      />

      {/* 📹 FILM LIGHTBOX MODAL */}
      <AssetLightboxModal
        activeItem={
          activeFilm
            ? {
                ...activeFilm,
                id: String(activeFilm.id),
                type: "film",
                kind: "film",
                videoUrl: activeFilm.videoUrl,
                poster: activeFilm.image,
                image: activeFilm.image,
                aspectRatio:
                  typeof activeFilm.ar === "number" && activeFilm.ar > 0
                    ? (() => {
                        const detected = detectAspectRatioFromDimensions(activeFilm.ar * 1000, 1000);
                        return detected.id === "custom" ? detected.cssRatio : detected.id;
                      })()
                    : undefined,
              }
            : null
        }
        onClose={() => setActiveFilm(null)}
        onBack={
          selectedProject
            ? () => {
                setActiveStill(null);
                setActiveFilm(null);
              }
            : undefined
        }
        onNext={hasMultipleFilms ? handleNextFilm : undefined}
        onPrev={hasMultipleFilms ? handlePrevFilm : undefined}
        showFeedback={false}
        showVersions={false}
        showDownload={false}
        showShareLink={true}
        footerExtra={
          activeFilm ? (
            <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans text-zinc-300">
              <p className="line-clamp-2 max-w-xl">{activeFilm.desc}</p>
              <Button
                onClick={() =>
                  handleWhatsAppChat(
                    `Hi ${profile.name}! I watched "${activeFilm.title}" on your portfolio and would like to inquire about a similar production.`
                  )
                }
                className="px-5 py-2 h-auto rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer shadow-lg shadow-primary/25"
              >
                <MessageCircle className="size-4" />
                <TypographySpan>Inquire About Similar Film</TypographySpan>
              </Button>
            </div>
          ) : null
        }
      />

      {/* 📁 MODAL 3: PROJECT DETAILS & ASSETS MODAL */}
      <UniversalDialogRoot
        open={Boolean(selectedProject)}
        onOpenChange={(open) => {
          if (!open) setSelectedProject(null);
        }}
      >
        <UniversalDialogContent
          size="5xl"
          showCloseButton={false}
          className="max-w-6xl max-h-[90vh] p-0 overflow-hidden bg-[#121214] border-white/15 rounded-3xl"
        >
          {selectedProject && (
            <div className="relative w-full flex flex-col max-h-[90vh] overflow-hidden">
            {/* Top Close Button */}
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setSelectedProject(null)}
              className="absolute top-4 right-4 z-30 size-9 rounded-full bg-black/60 hover:bg-white/20 text-white cursor-pointer border border-white/10"
            >
              <X className="size-5" />
            </Button>

            {/* Project Hero Header */}
            <div className="relative w-full h-64 sm:h-80 shrink-0 overflow-hidden">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${selectedProject.coverImage})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-[#121214]/60 to-transparent" />

              <div className="absolute bottom-6 left-6 right-6 z-10 space-y-2">
                <div className="flex items-center gap-2">
                  <TypographySpan className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider">
                    {selectedProject.client}
                  </TypographySpan>
                  <TypographySpan className="px-3 py-1 rounded-full bg-black/60 border border-white/15 text-zinc-300 text-[11px] ">
                    {selectedProject.tc}
                  </TypographySpan>
                </div>
                <h2 className="font-heading font-black text-2xl sm:text-4xl text-white uppercase tracking-tight">
                  {selectedProject.title}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 font-sans max-w-2xl leading-relaxed">
                  {selectedProject.desc}
                </p>
              </div>
            </div>

            {/* Project Asset Gallery */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-heading font-bold text-sm text-white uppercase tracking-wider">
                  Project Gallery
                </h3>
                <TypographySpan className="text-xs text-zinc-400 ">
                  {selectedProject.assetIds.length} Assets
                </TypographySpan>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {selectedProject.assetIds.map((assetId) => {
                  const asset = assets.find((a) => a.id === assetId);
                  if (!asset) return null;

                  return (
                    <div
                      key={asset.id}
                      onClick={() => {
                        if (asset.kind === "film") {
                          setActiveFilm(asset);
                        } else {
                          setActiveStill(asset);
                        }
                      }}
                      className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10 bg-zinc-900 cursor-pointer hover:border-white/30 transition-all duration-200"
                    >
                      <img
                        src={asset.image}
                        alt={asset.title}
                        className={`w-full h-full ${appearance?.thumbnailScale === "fit" ? "object-contain bg-black" : "object-cover"} group-hover:scale-105 transition-transform duration-300`}
                      />

                      {/* Tag */}
                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[9px]  font-bold text-white uppercase">
                        {asset.kind === "film" ? "FILM" : "STILL"}
                      </div>

                      {asset.kind === "film" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="size-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <Play className="size-3.5 fill-current ml-0.5" />
                          </div>
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                        <p className="text-xs font-bold text-white truncate">
                          {asset.title}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Bottom Inquire */}
            <div className="p-4 bg-[#0a0a0b] border-t border-white/10 flex items-center justify-between">
              <TypographySpan className="text-xs text-zinc-400 ">
                Location: {selectedProject.location}
              </TypographySpan>
              <Button
                onClick={() =>
                  handleWhatsAppChat(
                    `Hi ${profile.name}! I was looking at the "${selectedProject.title}" project on your portfolio and would like to discuss a project inquiry.`
                  )
                }
                className="px-5 py-2 h-auto rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-primary/25"
              >
                <MessageCircle className="size-3.5" />
                <TypographySpan>Inquire About Project</TypographySpan>
              </Button>
            </div>
          </div>
        )}
      </UniversalDialogContent>
      </UniversalDialogRoot>

      {/* 💬 MODAL 4: CONTACT & INQUIRY DRAWER */}
      <UniversalDialogRoot
        open={isContactOpen}
        onOpenChange={(open) => {
          if (!open) setIsContactOpen(false);
        }}
      >
        <UniversalDialogContent
          size="lg"
          showCloseButton={false}
          className="max-w-lg p-6 sm:p-8 bg-[#141416] border-white/15 rounded-3xl"
        >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="space-y-0.5">
                <h3 className="font-heading font-extrabold text-xl text-white">
                  Get In Touch
                </h3>
                <p className="text-xs text-zinc-400 font-sans">
                  Direct project inquiry with {profile.name}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setIsContactOpen(false)}
                className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="size-4" />
              </Button>
            </div>

            {contactSubmitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="size-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <Check className="size-6" />
                </div>
                <h4 className="font-heading font-bold text-lg text-white">
                  Inquiry Received
                </h4>
                <p className="text-xs text-zinc-300 font-sans max-w-xs mx-auto">
                  Thank you! We will review your production requirements and get back to you shortly.
                </p>
                <div className="pt-4">
                  <Button
                    onClick={() => handleWhatsAppChat()}
                    className="px-6 py-2.5 h-auto rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 mx-auto cursor-pointer shadow-lg shadow-primary/25"
                  >
                    <MessageCircle className="size-4" />
                    <TypographySpan>Open WhatsApp Chat Directly</TypographySpan>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Instant WhatsApp Shortcut Banner */}
                <div
                  onClick={() => handleWhatsAppChat()}
                  className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between cursor-pointer hover:bg-emerald-500/15 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <MessageCircle className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-emerald-300">
                        Chat on WhatsApp
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        Fastest response for dates & rates
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                </div>

                <div className="flex items-center gap-3 text-zinc-500 text-[11px] ">
                  <span className="flex-1 h-px bg-white/10" />
                  <TypographySpan>OR SEND DETAILS</TypographySpan>
                  <span className="flex-1 h-px bg-white/10" />
                </div>

                {/* Form */}
                <form
                  onSubmit={handleSubmitInquiry}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-xs  text-zinc-400 mb-1">
                      Your Name / Company
                    </label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Prestige Motors / Sarah Smith"
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs  text-zinc-400 mb-1">
                      Your Email / Phone
                    </label>
                    <input
                      type="text"
                      required
                      value={clientContact}
                      onChange={(e) => setClientContact(e.target.value)}
                      placeholder="email@company.com or phone"
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs  text-zinc-400 mb-1">
                      Project Details
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={projectDetails}
                      onChange={(e) => setProjectDetails(e.target.value)}
                      placeholder="Tell us about the project scope, dates, and deliverable format..."
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-primary resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmittingContact}
                    className="w-full py-2.5 h-auto rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50"
                  >
                    {isSubmittingContact ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                    {isSubmittingContact ? "Sending Inquiry..." : "Send Project Inquiry"}
                  </Button>
                </form>
              </div>
            )}
        </UniversalDialogContent>
      </UniversalDialogRoot>
    </>
  );
}
