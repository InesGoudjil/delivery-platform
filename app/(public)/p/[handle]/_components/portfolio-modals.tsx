"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Film,
  Image as ImageIcon,
  MessageCircle,
  X,
  Volume2,
  VolumeX,
  ArrowRight,
  ArrowLeft,
  Share2,
  Send,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { PortfolioAsset, PortfolioProject } from "@/lib/portfolio-data";
import { usePortfolioModal } from "./portfolio-context";
import { Button } from "@/components/ui/button";
import { submitPortfolioInquiryAction } from "@/app/actions/inquiries";

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

  // Video player state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Still navigation (next / prev)
  const handleNextStill = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!activeStill) return;
    const stills = assets.filter((a) => a.kind === "still");
    const currentList = selectedProject
      ? assets.filter(
          (a) => selectedProject.assetIds.includes(a.id) && a.kind === "still"
        )
      : stills;
    const currentIndex = currentList.findIndex((s) => s.id === activeStill.id);
    if (currentIndex < currentList.length - 1) {
      setActiveStill(currentList[currentIndex + 1]);
    } else {
      setActiveStill(currentList[0]);
    }
  };

  const handlePrevStill = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!activeStill) return;
    const stills = assets.filter((a) => a.kind === "still");
    const currentList = selectedProject
      ? assets.filter(
          (a) => selectedProject.assetIds.includes(a.id) && a.kind === "still"
        )
      : stills;
    const currentIndex = currentList.findIndex((s) => s.id === activeStill.id);
    if (currentIndex > 0) {
      setActiveStill(currentList[currentIndex - 1]);
    } else {
      setActiveStill(currentList[currentList.length - 1]);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveStill(null);
        setActiveFilm(null);
        setSelectedProject(null);
        setIsContactOpen(false);
      }
      if (activeStill) {
        if (e.key === "ArrowRight") handleNextStill();
        if (e.key === "ArrowLeft") handlePrevStill();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeStill, selectedProject]);

  return (
    <>
      {/* 🖼️ MODAL 1: STILL LIGHTBOX MODAL */}
      {activeStill && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setActiveStill(null)}
        >
          {/* Top Bar */}
          <div
            className="w-full max-w-6xl flex items-center justify-between z-10 py-2 border-b border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 border border-white/15 text-[10px] font-mono font-bold text-white uppercase tracking-wider">
                <ImageIcon className="size-3 text-zinc-300" />
                <span>STILL</span>
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white font-heading truncate max-w-xs sm:max-w-md">
                {activeStill.title}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(window.location.href);
                  }
                }}
                className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                title="Share link"
              >
                <Share2 className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setActiveStill(null)}
                className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                title="Close (Esc)"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Center Image with Next / Prev buttons */}
          <div
            className="relative w-full max-w-5xl flex-1 flex items-center justify-center my-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevStill}
              className="absolute left-2 sm:left-4 z-20 size-11 rounded-full bg-black/50 hover:bg-primary text-white hover:text-primary-foreground transition-all cursor-pointer backdrop-blur-md"
              title="Previous (Left Arrow)"
            >
              <ArrowLeft className="size-5" />
            </Button>

            <img
              src={activeStill.image}
              alt={activeStill.title}
              className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
            />

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextStill}
              className="absolute right-2 sm:right-4 z-20 size-11 rounded-full bg-black/50 hover:bg-primary text-white hover:text-primary-foreground transition-all cursor-pointer backdrop-blur-md"
              title="Next (Right Arrow)"
            >
              <ArrowRight className="size-5" />
            </Button>
          </div>

          {/* Bottom Bar Details */}
          <div
            className="w-full max-w-6xl flex items-center justify-between z-10 py-2 border-t border-white/10 text-xs font-mono text-zinc-400"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{activeStill.desc}</span>
            <Button
              variant="link"
              size="xs"
              onClick={() =>
                handleWhatsAppChat(
                  `Hi ${profile.name}, I love your still "${activeStill.title}". I would like to inquire about a shoot.`
                )
              }
              className="h-auto p-0 text-primary hover:underline font-bold cursor-pointer"
            >
              Inquire About Shoot →
            </Button>
          </div>
        </div>
      )}

      {/* 📹 MODAL 2: FILM VIDEO PLAYER MODAL */}
      {activeFilm && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setActiveFilm(null)}
        >
          <div
            className="relative w-full max-w-5xl rounded-3xl overflow-hidden border border-white/15 bg-[#121214] shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 bg-[#121214]">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                  <Film className="size-4" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base sm:text-lg text-white">
                    {activeFilm.title}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    {activeFilm.resolution || "4K 60fps"} · {activeFilm.tc}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setActiveFilm(null)}
                className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Video Stage */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                src={activeFilm.videoUrl}
                poster={activeFilm.image}
                autoPlay
                playsInline
                muted={isMuted}
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    setCurrentTime(videoRef.current.currentTime);
                    setDuration(videoRef.current.duration || 0);
                  }
                }}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-contain"
              />

              {/* Play/Pause center overlay click */}
              <div
                onClick={() => {
                  if (videoRef.current) {
                    if (isPlaying) videoRef.current.pause();
                    else videoRef.current.play();
                    setIsPlaying(!isPlaying);
                  }
                }}
                className="absolute inset-0 flex items-center justify-center cursor-pointer group"
              >
                {!isPlaying && (
                  <div className="size-16 rounded-full bg-black/60 border border-white/25 backdrop-blur-md flex items-center justify-center text-white shadow-2xl">
                    <Play className="size-8 fill-current ml-1" />
                  </div>
                )}
              </div>

              {/* Custom Video Controls Bar */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 flex items-center gap-4 text-white z-20">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    if (videoRef.current) {
                      if (isPlaying) videoRef.current.pause();
                      else videoRef.current.play();
                      setIsPlaying(!isPlaying);
                    }
                  }}
                  className="size-8 p-1 text-white hover:text-primary hover:bg-white/10 cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="size-5" />
                  ) : (
                    <Play className="size-5 fill-current" />
                  )}
                </Button>

                {/* Progress bar */}
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => {
                    const newTime = Number(e.target.value);
                    setCurrentTime(newTime);
                    if (videoRef.current) videoRef.current.currentTime = newTime;
                  }}
                  className="flex-1 accent-primary h-1.5 rounded-full cursor-pointer bg-white/20"
                />

                <span className="text-xs font-mono text-zinc-300 shrink-0">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.muted = !isMuted;
                      setIsMuted(!isMuted);
                    }
                  }}
                  className="size-8 p-1 text-white hover:text-primary hover:bg-white/10 cursor-pointer"
                >
                  {isMuted ? (
                    <VolumeX className="size-5" />
                  ) : (
                    <Volume2 className="size-5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Footer / Inquiry Action */}
            <div className="p-4 sm:p-6 bg-[#121214] border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-xs text-zinc-300 font-sans max-w-lg">
                {activeFilm.desc}
              </p>

              <Button
                onClick={() =>
                  handleWhatsAppChat(
                    `Hi ${profile.name}! I watched "${activeFilm.title}" on your portfolio and would like to inquire about a similar production.`
                  )
                }
                className="px-5 py-2.5 h-auto rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer shadow-lg shadow-primary/25"
              >
                <MessageCircle className="size-4" />
                <span>Inquire About Similar Film</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 📁 MODAL 3: PROJECT DETAILS & ASSETS MODAL */}
      {selectedProject && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedProject(null)}
        >
          <div
            className="relative w-full max-w-6xl max-h-[90vh] rounded-3xl overflow-hidden border border-white/15 bg-[#121214] shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
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
                  <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider">
                    {selectedProject.client}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-black/60 border border-white/15 text-zinc-300 text-[11px] font-mono">
                    {selectedProject.tc}
                  </span>
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
                <span className="text-xs text-zinc-400 font-mono">
                  {selectedProject.assetIds.length} Assets
                </span>
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
                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-mono font-bold text-white uppercase">
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
              <span className="text-xs text-zinc-400 font-mono">
                Location: {selectedProject.location}
              </span>
              <Button
                onClick={() =>
                  handleWhatsAppChat(
                    `Hi ${profile.name}! I was looking at the "${selectedProject.title}" project on your portfolio and would like to discuss a project inquiry.`
                  )
                }
                className="px-5 py-2 h-auto rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-primary/25"
              >
                <MessageCircle className="size-3.5" />
                <span>Inquire About Project</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 💬 MODAL 4: CONTACT & INQUIRY DRAWER */}
      {isContactOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsContactOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-[#141416] p-6 sm:p-8 space-y-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
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
                    <span>Open WhatsApp Chat Directly</span>
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

                <div className="flex items-center gap-3 text-zinc-500 text-[11px] font-mono">
                  <span className="flex-1 h-px bg-white/10" />
                  <span>OR SEND DETAILS</span>
                  <span className="flex-1 h-px bg-white/10" />
                </div>

                {/* Form */}
                <form
                  onSubmit={handleSubmitInquiry}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">
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
                    <label className="block text-xs font-mono text-zinc-400 mb-1">
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
                    <label className="block text-xs font-mono text-zinc-400 mb-1">
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
          </div>
        </div>
      )}
    </>
  );
}
