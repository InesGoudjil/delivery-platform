"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  Pause,
  Film,
  Image as ImageIcon,
  MessageCircle,
  Briefcase,
  MapPin,
  X,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Share2,
  Sparkles,
  Layers,
  Send,
  Check,
} from "lucide-react";
import {
  FilmmakerProfile,
  PortfolioAsset,
  PortfolioProject,
} from "@/lib/portfolio-data";

interface PublicPortfolioClientProps {
  profile: FilmmakerProfile;
  projects: PortfolioProject[];
  assets: PortfolioAsset[];
}

export function PublicPortfolioClient({
  profile,
  projects,
  assets,
}: PublicPortfolioClientProps) {
  // State for active category tab: "films" | "stills" | "projects"
  const [activeTab, setActiveTab] = useState<"films" | "stills" | "projects">("stills");

  // Lightbox / Modal states
  const [activeStill, setActiveStill] = useState<PortfolioAsset | null>(null);
  const [activeFilm, setActiveFilm] = useState<PortfolioAsset | null>(null);
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Video player state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Featured project (e.g. Mercedes GTS)
  const featuredProject =
    projects.find((p) => p.id === profile.featuredProjectId) || projects[0];
  const featuredAsset =
    assets.find((a) => a.id === featuredProject?.cover) || assets[0];

  // Filtered asset lists
  const films = assets.filter((a) => a.kind === "film");
  const stills = assets.filter((a) => a.kind === "still");

  // Still navigation (next / prev)
  const handleNextStill = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!activeStill) return;
    const currentList = selectedProject
      ? assets.filter((a) => selectedProject.assetIds.includes(a.id) && a.kind === "still")
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
    const currentList = selectedProject
      ? assets.filter((a) => selectedProject.assetIds.includes(a.id) && a.kind === "still")
      : stills;
    const currentIndex = currentList.findIndex((s) => s.id === activeStill.id);
    if (currentIndex > 0) {
      setActiveStill(currentList[currentIndex - 1]);
    } else {
      setActiveStill(currentList[currentList.length - 1]);
    }
  };

  // Keyboard controls for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveStill(null);
        setActiveFilm(null);
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

  // Video time format
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // WhatsApp helper
  const handleWhatsAppChat = (customText?: string) => {
    const msg = encodeURIComponent(
      customText ||
        `Hi ${profile.name}! I saw your portfolio on CineSpace (@${profile.handle}) and would like to discuss booking a project.`
    );
    const cleanNumber = profile.whatsappNumber.replace(/[^0-9+]/g, "");
    window.open(`https://wa.me/${cleanNumber}?text=${msg}`, "_blank");
  };

  const handleSharePortfolio = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#f6f3ec] font-sans antialiased selection:bg-[#f5551d] selection:text-black">
      {/* ============================================================ */}
      {/* 🎬 1. TOP NAVIGATION HEADER                                 */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-40 bg-[#0a0a0b]/80 backdrop-blur-md border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link
            href={`/p/${profile.handle}`}
            className="group flex items-center gap-1.5 focus:outline-none"
          >
            <span className="font-heading font-extrabold text-xl sm:text-2xl tracking-tight text-white group-hover:text-zinc-200 transition-colors">
              {profile.name}
            </span>
            <span className="inline-block size-2 rounded-full bg-[#f5551d]" />
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSharePortfolio}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
              title="Share portfolio link"
            >
              {copiedLink ? (
                <>
                  <Check className="size-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="size-3.5 text-zinc-400" />
                  <span>Share</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsContactOpen(true)}
              className="px-6 py-2.5 rounded-full bg-[#c85332] hover:bg-[#d95d3a] active:scale-95 text-white text-xs font-extrabold tracking-wider uppercase transition-all shadow-lg hover:shadow-[#c85332]/25 cursor-pointer"
            >
              Get In Touch
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 🌟 2. HERO / FEATURED PROJECT SECTION                       */}
      {/* ============================================================ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 space-y-16 sm:space-y-24">
        <section className="relative">
          <div
            onClick={() => {
              if (featuredAsset.videoUrl) {
                setActiveFilm(featuredAsset);
              } else {
                setSelectedProject(featuredProject);
              }
            }}
            className="group relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-[2rem] overflow-hidden border border-white/10 bg-zinc-900 shadow-2xl cursor-pointer"
          >
            {/* Background cover image */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
              style={{
                backgroundImage: `url(${featuredProject.coverImage || profile.heroImage})`,
              }}
            />

            {/* Dark gradient & cinematic vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20 group-hover:via-black/20 transition-all duration-300" />

            {/* Center play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-16 sm:size-20 rounded-full bg-white/10 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-2xl group-hover:scale-110 group-hover:bg-[#f5551d] group-hover:text-black group-hover:border-[#f5551d] transition-all duration-300">
                <Play className="size-7 sm:size-8 fill-current ml-1 transition-transform" />
              </div>
            </div>

            {/* Bottom-left information */}
            <div className="absolute bottom-6 left-6 right-6 sm:bottom-10 sm:left-10 sm:right-10 z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5551d] text-black text-[11px] font-extrabold uppercase tracking-wider">
                  <span>Featured Project</span>
                </div>
                <h2 className="font-heading font-extrabold text-2xl sm:text-4xl lg:text-5xl text-white tracking-tight drop-shadow-md uppercase">
                  {featuredProject.title}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed drop-shadow-sm line-clamp-2">
                  {featuredProject.desc}
                </p>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-300 bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
                <Film className="size-3.5 text-[#f5551d]" />
                <span>4K 60fps · Cinematic Cut</span>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 📁 3. LATEST WORK & FILTER SEGMENTS                         */}
        {/* ============================================================ */}
        <section className="space-y-8">
          {/* Section heading & Eyebrow */}
          <div className="text-center space-y-2">
            <div className="text-[11px] font-mono font-bold tracking-widest text-[#f5551d] uppercase">
              Our Portfolio
            </div>
            <h2 className="font-heading font-black text-3xl sm:text-4xl md:text-5xl text-white tracking-tight uppercase">
              Latest Work
            </h2>
          </div>

          {/* Filter Segmented Control Tabs */}
          <div className="flex justify-center">
            <div className="inline-flex p-1 rounded-full bg-[#18181b] border border-white/10 shadow-inner">
              {(["films", "stills", "projects"] as const).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative px-6 sm:px-8 py-2 rounded-full text-xs font-bold tracking-wide capitalize transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-[#f5551d] text-black shadow-md"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ------------------------------------------------------------ */}
          {/* TAB 1: STILLS (Masonry view matching screenshots 1 & 4)     */}
          {/* ------------------------------------------------------------ */}
          {activeTab === "stills" && (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5 animate-in fade-in duration-300">
              {stills.map((still) => (
                <div
                  key={still.id}
                  onClick={() => setActiveStill(still)}
                  className="break-inside-avoid group relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 cursor-pointer shadow-lg hover:border-white/25 transition-all duration-300"
                >
                  {/* Still image */}
                  <img
                    src={still.image}
                    alt={still.title}
                    loading="lazy"
                    className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Top-left STILL badge */}
                  <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-mono font-bold text-white uppercase tracking-wider">
                    <ImageIcon className="size-3 text-zinc-300" />
                    <span>STILL</span>
                  </div>

                  {/* Hover overlay with title */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-white font-heading">
                        {still.title}
                      </p>
                      <p className="text-xs text-zinc-400 font-mono capitalize">
                        {still.cat}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ------------------------------------------------------------ */}
          {/* TAB 2: PROJECTS (4-column grid matching screenshot 2)       */}
          {/* ------------------------------------------------------------ */}
          {activeTab === "projects" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-in fade-in duration-300">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => setSelectedProject(proj)}
                  className="group relative aspect-[16/11] rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 cursor-pointer shadow-lg hover:border-white/25 transition-all duration-300"
                >
                  {/* Background cover image */}
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${proj.coverImage})` }}
                  />

                  {/* Gradient shadow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent group-hover:via-black/20 transition-all duration-300" />

                  {/* Top-right asset count badge */}
                  <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono text-zinc-200">
                    {proj.tc}
                  </div>

                  {/* Bottom title and client */}
                  <div className="absolute bottom-4 left-4 right-4 z-10 space-y-0.5">
                    <h3 className="font-heading font-bold text-base text-white group-hover:text-[#f5551d] transition-colors truncate">
                      {proj.title}
                    </h3>
                    <p className="text-xs text-zinc-400 font-mono truncate">
                      {proj.client}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ------------------------------------------------------------ */}
          {/* TAB 3: FILMS (Cinematic video cards with duration)          */}
          {/* ------------------------------------------------------------ */}
          {activeTab === "films" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              {films.map((film) => (
                <div
                  key={film.id}
                  onClick={() => setActiveFilm(film)}
                  className="group relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 cursor-pointer shadow-lg hover:border-white/25 transition-all duration-300"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video w-full overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url(${film.image})` }}
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />

                    {/* Top-right duration */}
                    <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono text-white">
                      {film.tc}
                    </div>

                    {/* Top-left resolution */}
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono font-bold text-white uppercase">
                      <Film className="size-3 text-[#f5551d]" />
                      <span>{film.resolution || "4K 60fps"}</span>
                    </div>

                    {/* Center play icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="size-12 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-[#f5551d] group-hover:text-black transition-all duration-300 shadow-xl">
                        <Play className="size-5 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Card bottom info */}
                  <div className="p-4 bg-[#121214] border-t border-white/5 space-y-1">
                    <h3 className="font-heading font-bold text-base text-white group-hover:text-[#f5551d] transition-colors truncate">
                      {film.title}
                    </h3>
                    <p className="text-xs text-zinc-400 font-sans line-clamp-1">
                      {film.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ============================================================ */}
        {/* 👤 4. ABOUT SECTION (Matching screenshots 2 & 3)             */}
        {/* ============================================================ */}
        <section className="relative rounded-[2.5rem] bg-[#121214] border border-white/10 overflow-hidden shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center p-6 sm:p-10 lg:p-12">
            {/* Left portrait with warm rim lighting */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-sm aspect-[4/5] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                <Image
                  src={profile.avatar}
                  alt={profile.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="object-cover"
                />
              </div>
            </div>

            {/* Right details & bio */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#f5551d]">
                  About
                </span>
                <h2 className="font-heading font-black text-3xl sm:text-4xl text-white tracking-tight uppercase">
                  {profile.name}
                </h2>
              </div>

              <p className="text-sm sm:text-base text-zinc-300 font-sans leading-relaxed">
                {profile.bio}
              </p>

              {/* 3 Stat Badges */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-lg">
                <div className="p-4 rounded-2xl bg-[#18181b] border border-white/10 text-center space-y-1">
                  <div className="flex justify-center text-[#f5551d]">
                    <Film className="size-4" />
                  </div>
                  <div className="font-heading font-black text-xl sm:text-2xl text-white">
                    {profile.stats.filmsDelivered}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono">
                    Films delivered
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#18181b] border border-white/10 text-center space-y-1">
                  <div className="flex justify-center text-[#f5551d]">
                    <Briefcase className="size-4" />
                  </div>
                  <div className="font-heading font-black text-xl sm:text-2xl text-white">
                    {profile.stats.experienceYears}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono">
                    Experience
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#18181b] border border-white/10 text-center space-y-1">
                  <div className="flex justify-center text-[#f5551d]">
                    <MapPin className="size-4" />
                  </div>
                  <div className="font-heading font-black text-xl sm:text-2xl text-white">
                    {profile.stats.based}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono">
                    Based
                  </div>
                </div>
              </div>

              {/* Experience Highlights */}
              <div className="pt-2 border-t border-white/10 space-y-3">
                <div className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                  Career Highlights
                </div>
                <div className="space-y-2.5">
                  {profile.experience.map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-start justify-between gap-4 text-xs"
                    >
                      <div>
                        <span className="font-bold text-white font-sans">
                          {exp.role}
                        </span>
                        <span className="text-zinc-400 ml-1.5 font-sans">
                          — {exp.company}
                        </span>
                      </div>
                      <span className="text-zinc-500 font-mono shrink-0">
                        {exp.period}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Get in touch button */}
              <div className="pt-2">
                <button
                  onClick={() => setIsContactOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#c85332] hover:bg-[#d95d3a] active:scale-95 text-white text-xs font-extrabold tracking-wider uppercase transition-all shadow-lg hover:shadow-[#c85332]/25 cursor-pointer"
                >
                  <MessageCircle className="size-4" />
                  <span>Get In Touch</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 🎬 5. END CTA BANNER (Matching screenshot 3)                 */}
        {/* ============================================================ */}
        <section className="relative rounded-[2.5rem] overflow-hidden border border-white/10 bg-zinc-900 shadow-2xl">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${profile.cta.image})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-black/30" />

          <div className="relative z-10 p-8 sm:p-14 lg:p-16 max-w-2xl space-y-6">
            <h2 className="font-heading font-black text-3xl sm:text-5xl text-white tracking-tight leading-tight uppercase whitespace-pre-line">
              {profile.cta.title}
            </h2>
            <p className="text-sm sm:text-base text-zinc-300 font-sans leading-relaxed">
              {profile.cta.subtitle}
            </p>
            <div>
              <button
                onClick={() => setIsContactOpen(true)}
                className="px-8 py-3.5 rounded-full bg-[#c85332] hover:bg-[#d95d3a] active:scale-95 text-white text-xs font-extrabold tracking-wider uppercase transition-all shadow-xl hover:shadow-[#c85332]/25 cursor-pointer"
              >
                Start A Project
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================ */}
      {/* 📜 6. FOOTER                                                 */}
      {/* ============================================================ */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-zinc-500">
          <p>© {profile.name} — Films</p>
          <p>Made with CineSpace</p>
        </div>
      </footer>

      {/* ============================================================ */}
      {/* 🖼️ MODAL 1: STILL LIGHTBOX MODAL                             */}
      {/* ============================================================ */}
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
                onClick={handleSharePortfolio}
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
              onClick={() => handleWhatsAppChat(`Hi Pedro, I love your still "${activeStill.title}". I would like to inquire about a shoot.`)}
              className="text-[#f5551d] hover:underline font-bold"
            >
              Inquire About Shoot →
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 📹 MODAL 2: FILM VIDEO PLAYER MODAL                         */}
      {/* ============================================================ */}
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
                  className="p-1 text-white hover:text-[#f5551d] transition-colors"
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
                  className="p-1 text-white hover:text-[#f5551d] transition-colors"
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
                    `Hi Pedro! I watched "${activeFilm.title}" on your portfolio and would like to inquire about a similar production.`
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

      {/* ============================================================ */}
      {/* 📁 MODAL 3: PROJECT DETAILS & ASSETS MODAL                  */}
      {/* ============================================================ */}
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
                    `Hi Pedro! I was looking at the "${selectedProject.title}" project on your portfolio and would like to discuss a project inquiry.`
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

      {/* ============================================================ */}
      {/* 💬 MODAL 4: CONTACT & INQUIRY DRAWER                         */}
      {/* ============================================================ */}
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
                <div className="size-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
                  <Check className="size-6" />
                </div>
                <h4 className="font-heading font-bold text-lg text-white">
                  Message Sent!
                </h4>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  Thank you for reaching out. Pedro will review your inquiry and respond shortly.
                </p>
                <button
                  onClick={() => {
                    setContactSubmitted(false);
                    setIsContactOpen(false);
                  }}
                  className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Instant WhatsApp Quick Action */}
                <div className="p-4 rounded-2xl bg-[#1d9e75]/10 border border-[#1d9e75]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageCircle className="size-4" />
                      Instant Chat via WhatsApp
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400/80">
                      Fastest response
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300">
                    Skip the forms and message Pedro directly on WhatsApp for rates and availability.
                  </p>
                  <button
                    onClick={() => handleWhatsAppChat()}
                    className="w-full py-2.5 rounded-xl bg-[#1d9e75] hover:bg-[#188c67] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="size-4" />
                    Open WhatsApp Chat
                  </button>
                </div>

                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-white/10 w-full" />
                  <span className="bg-[#141416] px-3 text-[11px] font-mono text-zinc-500 uppercase">
                    or send inquiry
                  </span>
                </div>

                {/* Email Inquiry Form */}
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
    </div>
  );
}
