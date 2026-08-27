"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Play,
  Film,
  User,
  Mail,
  MessageCircle,
  Clock,
  MapPin,
  Sparkles,
  ExternalLink,
  Layers,
  Grid,
  X,
  Camera,
  Award,
} from "lucide-react";

interface PortfolioWork {
  id: string;
  title: string;
  client: string;
  category: "commercial" | "wedding" | "still";
  tc: string;
  res: string;
  aspect: "16:9" | "9:16" | "1:1";
  gradient: string;
  desc: string;
}

const PORTFOLIO_ITEMS: PortfolioWork[] = [
  {
    id: "1",
    title: "Omakase Teaser — Director's Cut",
    client: "Lost in Tokyo",
    category: "commercial",
    tc: "00:47",
    res: "4K 60fps",
    aspect: "16:9",
    gradient: "linear-gradient(135deg, #3a1a10, #7a2f18)",
    desc: "A moody, high-contrast 47-second teaser for the launch of a premier omakase counter in Dubai.",
  },
  {
    id: "2",
    title: "Aisha & Omar — Wedding Highlights",
    client: "Cinematic Wedding",
    category: "wedding",
    tc: "03:12",
    res: "4K 24fps",
    aspect: "16:9",
    gradient: "linear-gradient(135deg, #1c2230, #38404e)",
    desc: "A three-minute cinematic wedding film shot across two days at One&Only Royal Mirage, Dubai.",
  },
  {
    id: "3",
    title: "GT3 Build Film",
    client: "Prestige Track Cars",
    category: "commercial",
    tc: "01:20",
    res: "4K 60fps",
    aspect: "16:9",
    gradient: "linear-gradient(135deg, #101a1c, #20403f)",
    desc: "Documenting a Porsche GT3 RS conversion to full track spec with anamorphic lenses.",
  },
  {
    id: "4",
    title: "Launch Reel — Vertical Cut",
    client: "Clean Performance GCC",
    category: "commercial",
    tc: "00:30",
    res: "1080p 60fps",
    aspect: "9:16",
    gradient: "linear-gradient(135deg, #3a2208, #8a4f14)",
    desc: "A fast-paced 30-second vertical reel optimized for Instagram & TikTok campaigns.",
  },
  {
    id: "5",
    title: "Desert Luxury Architectural Stills",
    client: "Private Villa Estate",
    category: "still",
    tc: "Still Pack",
    res: "8K Raw",
    aspect: "1:1",
    gradient: "linear-gradient(135deg, #2b1f14, #5c3c21)",
    desc: "Architectural photography capturing warm sunset reflections across a modern desert sanctuary.",
  },
  {
    id: "6",
    title: "Vogue Arabia Editorial Series",
    client: "Fashion House",
    category: "still",
    tc: "Still Pack",
    res: "6K Medium Format",
    aspect: "1:1",
    gradient: "linear-gradient(135deg, #2a1226, #5c2052)",
    desc: "High-fashion editorial stills shot on medium format digital for a capsule collection release.",
  },
];

export default function PortfolioShowcasePage() {
  const [handle] = useState("pedro");
  const [activeTab, setActiveTab] = useState<"all" | "commercial" | "wedding" | "still">("all");
  const [gridSize, setGridSize] = useState<"S" | "M" | "L">("M");
  const [activeLightboxItem, setActiveLightboxItem] = useState<PortfolioWork | null>(null);

  const filteredWork = PORTFOLIO_ITEMS.filter((item) => {
    if (activeTab === "all") return true;
    return item.category === activeTab;
  });

  const handleWhatsAppBooking = () => {
    const text = encodeURIComponent(
      `Hi Pedro! I saw your portfolio on CUT (@${handle}) and would like to inquire about booking a video project.`
    );
    window.open(`https://wa.me/+971501234567?text=${text}`, "_blank");
  };

  const getGridClass = () => {
    if (gridSize === "S") return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";
    if (gridSize === "L") return "grid-cols-1 gap-8";
    return "grid-cols-1 md:grid-cols-2 gap-6";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#f6f3ec] font-sans antialiased selection:bg-[#f5551d] selection:text-black">
      {/* 🎬 1. STICKY GLASS HEADER */}
      <header className="sticky top-0 z-40 glass-panel border-b border-white/10 shadow-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f5551d] to-[#ff8a45] text-black font-extrabold flex items-center justify-center font-display text-sm shadow-md">
              PC
            </div>
            <div>
              <h1 className="font-display font-bold text-base sm:text-lg leading-none text-[#f6f3ec]">
                Pedro Concreato
              </h1>
              <p className="text-xs text-[#aeaeb4] mt-0.5 font-mono">
                @{handle} · Director & DP Dubai
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleWhatsAppBooking}
              className="glass-btn btn-glass-layer cursor-pointer text-xs px-5 py-2.5 font-bold flex items-center gap-2"
            >
              <MessageCircle className="size-4 text-black" /> Book via WhatsApp
            </button>
          </div>
        </div>
      </header>

      {/* 🌟 2. HERO FEATURED SPOTLIGHT REEL */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-6">
        <div className="liquid-glass rounded-3xl p-6 sm:p-10 border border-white/15 shadow-2xl space-y-6">
          {/* Profile Header & Stats Counter */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="glass-badge font-mono text-[11px] flex items-center gap-1">
                  <MapPin className="size-3 text-[#f5551d]" /> Dubai & Abu Dhabi, UAE
                </span>
                <span className="glass-badge font-mono text-[11px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  Available for Q3/Q4 Bookings
                </span>
              </div>
              <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-[#f6f3ec]">
                Commercial Films & Luxury Visuals.
              </h2>
              <p className="text-sm text-[#aeaeb4] max-w-2xl font-sans leading-relaxed">
                Directing high-impact commercial campaigns, brand documentaries, and
                luxury wedding films across the Gulf region. Full end-to-end 4K/8K production.
              </p>
            </div>

            {/* Experience Stats Badge */}
            <div className="flex items-center gap-4 bg-[#141416]/80 p-4 rounded-2xl border border-white/10 shrink-0">
              <div className="text-center px-3 border-r border-white/10">
                <span className="font-display font-extrabold text-2xl text-[#f6f3ec]">
                  80+
                </span>
                <span className="block text-[11px] text-[#aeaeb4] font-mono">
                  Projects
                </span>
              </div>
              <div className="text-center px-3 border-r border-white/10">
                <span className="font-display font-extrabold text-2xl text-[#f5551d]">
                  6 Yrs
                </span>
                <span className="block text-[11px] text-[#aeaeb4] font-mono">
                  Experience
                </span>
              </div>
              <div className="text-center px-3">
                <span className="font-display font-extrabold text-2xl text-[#f6f3ec]">
                  4K
                </span>
                <span className="block text-[11px] text-[#aeaeb4] font-mono">
                  HDR Stream
                </span>
              </div>
            </div>
          </div>

          {/* Featured Director's Cut Stage */}
          <div
            onClick={() => setActiveLightboxItem(PORTFOLIO_ITEMS[0])}
            className="aspect-[21/9] rounded-2xl relative overflow-hidden cursor-pointer group flex items-center justify-center border border-white/20 shadow-2xl"
            style={{ background: PORTFOLIO_ITEMS[0].gradient }}
          >
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
            <div className="relative z-10 w-20 h-20 rounded-full bg-[#101012]/80 border border-white/30 backdrop-blur-md flex items-center justify-center group-hover:scale-110 group-hover:bg-[#f5551d] transition-all shadow-2xl">
              <Play className="size-8 text-[#f6f3ec] group-hover:text-black ml-1" />
            </div>

            <div className="absolute bottom-6 left-6 right-6 z-10 flex items-center justify-between glass-panel p-4 rounded-xl border border-white/10">
              <div>
                <span className="text-xs font-mono text-[#f5551d] uppercase tracking-widest font-semibold flex items-center gap-1">
                  <Sparkles className="size-3" /> FEATURED SHOWREEL
                </span>
                <h3 className="font-display font-bold text-lg sm:text-xl text-[#f6f3ec]">
                  {PORTFOLIO_ITEMS[0].title}
                </h3>
              </div>
              <span className="text-xs font-mono text-[#aeaeb4] bg-black/50 px-3 py-1 rounded-full border border-white/10">
                00:47 · 4K 60fps
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 📁 3. CATEGORY TABS & GRID TOOLBAR */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-white/10">
          {/* Category Filter Pills */}
          <div className="glass-pill rounded-full p-1 flex items-center gap-1 overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === "all"
                  ? "glass-btn text-white shadow-md"
                  : "text-[#aeaeb4] hover:text-[#f6f3ec]"
              }`}
            >
              All Work
            </button>
            <button
              onClick={() => setActiveTab("commercial")}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === "commercial"
                  ? "glass-btn text-white shadow-md"
                  : "text-[#aeaeb4] hover:text-[#f6f3ec]"
              }`}
            >
              Commercials
            </button>
            <button
              onClick={() => setActiveTab("wedding")}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === "wedding"
                  ? "glass-btn text-white shadow-md"
                  : "text-[#aeaeb4] hover:text-[#f6f3ec]"
              }`}
            >
              Weddings
            </button>
            <button
              onClick={() => setActiveTab("still")}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === "still"
                  ? "glass-btn text-white shadow-md"
                  : "text-[#aeaeb4] hover:text-[#f6f3ec]"
              }`}
            >
              Stills / Photos
            </button>
          </div>

          {/* Grid Size Controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#aeaeb4] hidden sm:inline">
              Layout:
            </span>
            <div className="glass-pill rounded-full p-1 flex gap-1">
              {(["S", "M", "L"] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setGridSize(size)}
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
                    gridSize === size
                      ? "bg-[#f5551d] text-black"
                      : "text-[#aeaeb4] hover:text-[#f6f3ec]"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 🖼️ 4. PORTFOLIO SHOWCASE GRID */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className={`grid ${getGridClass()}`}>
          {filteredWork.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveLightboxItem(item)}
              className="liquid-glass rounded-2xl overflow-hidden group cursor-pointer border border-white/10 hover:border-[#f5551d]/40 transition-all duration-300 shadow-xl flex flex-col justify-between"
            >
              <div
                className="h-64 relative p-6 flex flex-col justify-between overflow-hidden"
                style={{ background: item.gradient }}
              >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />

                <div className="flex items-center justify-between z-10">
                  <span className="glass-badge font-mono text-[11px]">
                    {item.res}
                  </span>
                  <span className="text-xs font-mono text-[#f6f3ec] bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                    {item.tc}
                  </span>
                </div>

                <div className="relative z-10 w-12 h-12 rounded-full bg-black/50 border border-white/30 backdrop-blur-md flex items-center justify-center self-center group-hover:scale-110 group-hover:bg-[#f5551d] transition-all shadow-lg">
                  <Play className="size-5 text-[#f6f3ec] group-hover:text-black ml-0.5" />
                </div>

                <div className="z-10 space-y-1">
                  <h3 className="font-display text-xl font-bold text-[#f6f3ec] group-hover:text-[#ff8a45] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#aeaeb4] font-mono">{item.client}</p>
                </div>
              </div>

              <div className="p-5 glass-card border-t border-white/10 space-y-2">
                <p className="text-xs text-[#aeaeb4] font-sans leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 📹 5. INTERACTIVE VIDEO LIGHTBOX MODAL */}
      {activeLightboxItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="liquid-glass rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 text-[#f6f3ec] shadow-2xl relative border border-white/20">
            {/* Lightbox Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <Film className="size-6 text-[#f5551d]" />
                <div>
                  <h3 className="font-display font-bold text-lg text-[#f6f3ec]">
                    {activeLightboxItem.title}
                  </h3>
                  <p className="text-xs text-[#aeaeb4] font-mono">
                    Client: {activeLightboxItem.client} · {activeLightboxItem.res}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveLightboxItem(null)}
                className="w-9 h-9 rounded-full bg-white/10 text-[#aeaeb4] hover:text-[#f6f3ec] hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Video Stage */}
            <div
              className="aspect-video rounded-2xl relative overflow-hidden flex flex-col justify-between p-6 shadow-2xl border border-white/15"
              style={{ background: activeLightboxItem.gradient }}
            >
              <div className="flex justify-between items-start z-10">
                <span className="glass-badge font-mono text-[11px]">
                  {activeLightboxItem.res}
                </span>
                <span className="text-xs font-mono text-[#f6f3ec] bg-black/60 px-3 py-1 rounded-full border border-white/10">
                  {activeLightboxItem.tc}
                </span>
              </div>

              <div className="self-center w-16 h-16 rounded-full bg-black/60 border border-white/30 flex items-center justify-center backdrop-blur-md cursor-pointer hover:scale-110 hover:bg-[#f5551d] transition-all shadow-2xl">
                <Play className="size-7 text-[#f6f3ec] ml-1" />
              </div>

              <div className="flex justify-between items-end z-10 text-xs font-mono text-[#aeaeb4]">
                <span>Cloudflare 4K Stream</span>
                <span>Pedro Concreato Showreel</span>
              </div>
            </div>

            {/* Project Details */}
            <div className="glass-card p-5 rounded-2xl space-y-3">
              <h4 className="font-display font-bold text-base text-[#f6f3ec]">
                Project Overview
              </h4>
              <p className="text-xs text-[#aeaeb4] leading-relaxed font-sans">
                {activeLightboxItem.desc}
              </p>
              <div className="pt-2 flex items-center justify-between border-t border-white/10">
                <button
                  onClick={handleWhatsAppBooking}
                  className="glass-btn btn-glass-layer cursor-pointer text-xs px-5 py-2.5 font-bold flex items-center gap-2"
                >
                  <MessageCircle className="size-4" /> Inquire About Similar Project
                </button>
                <span className="text-[11px] font-mono text-[#5e5e64]">
                  CUT Portfolio Showcase
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-xs text-[#aeaeb4] font-sans">
        <p>
          Powered by{" "}
          <Link href="/" className="text-[#f5551d] font-bold hover:underline">
            CUT
          </Link>{" "}
          — Studio Platform for Filmmakers in the Gulf
        </p>
      </footer>
    </div>
  );
}
