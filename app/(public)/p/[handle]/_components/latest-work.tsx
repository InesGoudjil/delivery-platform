"use client";

import React, { useState } from "react";
import { Film, Image as ImageIcon, Layers, Play } from "lucide-react";
import { PortfolioProject, PortfolioAsset } from "@/lib/portfolio-data";
import { usePortfolioModal } from "./portfolio-context";

interface LatestWorkProps {
  projects: PortfolioProject[];
  assets: PortfolioAsset[];
}

export function LatestWork({ projects, assets }: LatestWorkProps) {
  const { setActiveStill, setActiveFilm, setSelectedProject } = usePortfolioModal();

  const films = assets.filter((a) => a.kind === "film");
  const stills = assets.filter((a) => a.kind === "still");

  // State for active category tab: "projects" | "films" | "stills"
  const [activeTab, setActiveTab] = useState<"projects" | "films" | "stills">(
    projects.length > 0 ? "projects" : films.length > 0 ? "films" : "stills"
  );

  return (
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
          {(["projects", "films", "stills"] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
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
      {/* TAB 1: PROJECTS (4-column grid matching screenshot 2)       */}
      {/* ------------------------------------------------------------ */}
      {activeTab === "projects" && (
        projects.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-[#141416]/50 rounded-2xl border border-white/5">
            <div className="size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
              <Layers className="size-5" />
            </div>
            <p className="text-zinc-400 font-sans text-sm">No featured projects published yet.</p>
          </div>
        ) : (
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
        )
      )}

      {/* ------------------------------------------------------------ */}
      {/* TAB 2: FILMS (Cinematic video cards with duration)          */}
      {/* ------------------------------------------------------------ */}
      {activeTab === "films" && (
        films.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-[#141416]/50 rounded-2xl border border-white/5">
            <div className="size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
              <Film className="size-5" />
            </div>
            <p className="text-zinc-400 font-sans text-sm">No cinematic films published yet.</p>
          </div>
        ) : (
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
        )
      )}

      {/* ------------------------------------------------------------ */}
      {/* TAB 3: STILLS (Masonry view matching screenshots 1 & 4)     */}
      {/* ------------------------------------------------------------ */}
      {activeTab === "stills" && (
        stills.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-[#141416]/50 rounded-2xl border border-white/5">
            <div className="size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
              <ImageIcon className="size-5" />
            </div>
            <p className="text-zinc-400 font-sans text-sm">No photo stills published yet.</p>
          </div>
        ) : (
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
        )
      )}
    </section>
  );
}
