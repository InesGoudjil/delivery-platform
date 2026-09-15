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
} from "lucide-react";
import { PortfolioAsset, PortfolioProject } from "@/lib/portfolio-data";
import { usePortfolioModal } from "./portfolio-context";

export function PortfolioModals() {
  const {
    profile,
    projects,
    assets,
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
              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(window.location.href);
                  }
                }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Share link"
              >
                <Share2 className="size-4" />
              </button>
              <button
                onClick={() => setActiveStill(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Center Image with Next / Prev buttons */}
          <div
            className="relative w-full max-w-5xl flex-1 flex items-center justify-center my-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handlePrevStill}
              className="absolute left-2 sm:left-4 z-20 p-3 rounded-full bg-black/50 hover:bg-[#f5551d] text-white hover:text-black transition-all cursor-pointer backdrop-blur-md"
              title="Previous (Left Arrow)"
            >
              <ArrowLeft className="size-5" />
            </button>

            <img
              src={activeStill.image}
              alt={activeStill.title}
              className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
            />

            <button
              onClick={handleNextStill}
              className="absolute right-2 sm:right-4 z-20 p-3 rounded-full bg-black/50 hover:bg-[#f5551d] text-white hover:text-black transition-all cursor-pointer backdrop-blur-md"
              title="Next (Right Arrow)"
            >
              <ArrowRight className="size-5" />
            </button>
          </div>

          {/* Bottom Bar Details */}
          <div
            className="w-full max-w-6xl flex items-center justify-between z-10 py-2 border-t border-white/10 text-xs font-mono text-zinc-400"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{activeStill.desc}</span>
            <button
              onClick={() =>
                handleWhatsAppChat(
                  `Hi ${profile.name}, I love your still "${activeStill.title}". I would like to inquire about a shoot.`
                )
              }
              className="text-[#f5551d] hover:underline font-bold cursor-pointer"
            >
              Inquire About Shoot →
            </button>
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
                <div className="size-9 rounded-full bg-[#f5551d]/10 border border-[#f5551d]/30 flex items-center justify-center text-[#f5551d]">
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

              <button
                onClick={() => setActiveFilm(null)}
                className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
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
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      if (isPlaying) videoRef.current.pause();
                      else videoRef.current.play();
                      setIsPlaying(!isPlaying);
                    }
                  }}
                  className="p-1 text-white hover:text-[#f5551d] transition-colors cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="size-5" />
                  ) : (
                    <Play className="size-5 fill-current" />
                  )}
                </button>

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
                  className="flex-1 accent-[#f5551d] h-1.5 rounded-full cursor-pointer bg-white/20"
                />

                <span className="text-xs font-mono text-zinc-300 shrink-0">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.muted = !isMuted;
                      setIsMuted(!isMuted);
                    }
                  }}
                  className="p-1 text-white hover:text-[#f5551d] transition-colors cursor-pointer"
                >
                  {isMuted ? (
                    <VolumeX className="size-5" />
                  ) : (
                    <Volume2 className="size-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Footer / Inquiry Action */}
            <div className="p-4 sm:p-6 bg-[#121214] border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-xs text-zinc-300 font-sans max-w-lg">
                {activeFilm.desc}
              </p>

              <button
                onClick={() =>
                  handleWhatsAppChat(
                    `Hi ${profile.name}! I watched "${activeFilm.title}" on your portfolio and would like to inquire about a similar production.`
                  )
                }
                className="px-5 py-2.5 rounded-full bg-[#c85332] hover:bg-[#d95d3a] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer"
              >
                <MessageCircle className="size-4" />
                <span>Inquire About Similar Film</span>
              </button>
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
            <button
              onClick={() => setSelectedProject(null)}
              className="absolute top-4 right-4 z-30 size-9 rounded-full bg-black/60 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
            >
              <X className="size-5" />
            </button>

            {/* Project Hero Header */}
            <div className="relative w-full h-64 sm:h-80 shrink-0 overflow-hidden">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${selectedProject.coverImage})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-[#121214]/60 to-transparent" />

              <div className="absolute bottom-6 left-6 right-6 z-10 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#f5551d] text-black text-[11px] font-bold uppercase tracking-wider">
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
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Tag */}
                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-mono font-bold text-white uppercase">
                        {asset.kind === "film" ? "FILM" : "STILL"}
                      </div>

                      {asset.kind === "film" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="size-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white group-hover:bg-[#f5551d] group-hover:text-black transition-colors">
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
              <button
                onClick={() =>
                  handleWhatsAppChat(
                    `Hi ${profile.name}! I was looking at the "${selectedProject.title}" project on your portfolio and would like to discuss a project inquiry.`
                  )
                }
                className="px-5 py-2 rounded-full bg-[#c85332] hover:bg-[#d95d3a] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <MessageCircle className="size-3.5" />
                <span>Inquire About Project</span>
              </button>
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
              <button
                onClick={() => setIsContactOpen(false)}
                className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
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
                  <button
                    onClick={() => handleWhatsAppChat()}
                    className="px-6 py-2.5 rounded-full bg-[#f5551d] text-black text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 mx-auto cursor-pointer"
                  >
                    <MessageCircle className="size-4" />
                    <span>Open WhatsApp Chat Directly</span>
                  </button>
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
                  onSubmit={(e) => {
                    e.preventDefault();
                    setContactSubmitted(true);
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">
                      Your Name / Company
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Prestige Motors / Sarah Smith"
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f5551d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">
                      Your Email / Phone
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="email@company.com or phone"
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f5551d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">
                      Project Details
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Tell us about the project scope, dates, and deliverable format..."
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f5551d] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#c85332] hover:bg-[#d95d3a] text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Send className="size-3.5" />
                    Send Project Inquiry
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
