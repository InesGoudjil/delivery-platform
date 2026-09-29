"use client";

import React, { useState } from "react";
import { Film, Image as ImageIcon, Layers, Play } from "lucide-react";
import { PortfolioProject, PortfolioAsset } from "@/lib/portfolio-data";
import { PortfolioAppearance } from "@/core/entities/portfolio";
import { usePortfolioModal } from "./portfolio-context";
import { AppImage } from "@/components/ui/app-image";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TiltCard } from "@/components/ui/motion";
import { TypographyH2, TypographyH3, TypographyKicker, TypographyMuted } from "@/components/ui/typography";

interface LatestWorkProps {
  projects: PortfolioProject[];
  assets: PortfolioAsset[];
  appearance?: PortfolioAppearance;
}

export function LatestWork({ projects, assets, appearance }: LatestWorkProps) {
  const { setActiveStill, setActiveFilm, setSelectedProject } = usePortfolioModal();

  const films = assets.filter((a) => a.kind === "film");
  const stills = assets.filter((a) => a.kind === "still");

  // State for active category tab: "projects" | "films" | "stills"
  const [activeTab, setActiveTab] = useState<"projects" | "films" | "stills">(
    projects.length > 0 ? "projects" : films.length > 0 ? "films" : "stills"
  );

  const isMasonry =
    appearance?.aspectRatio === "grid" ||
    appearance?.aspectRatio === "masonry" ||
    appearance?.aspectRatio === "4:3";

  const cardSize = appearance?.cardSize || "M";
  const gridClasses =
    cardSize === "S"
      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5"
      : cardSize === "M"
      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-5"
      : "grid-cols-1 sm:grid-cols-2 gap-6";

  const columnsClass =
    cardSize === "S"
      ? "columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3.5"
      : cardSize === "M"
      ? "columns-1 sm:columns-2 md:columns-3 lg:columns-3 gap-5"
      : "columns-1 sm:columns-2 gap-6";

  const itemSpacing =
    cardSize === "S" ? "mb-3.5" : cardSize === "L" ? "mb-6" : "mb-5";

  const numericRatio =
    appearance?.aspectRatio === "9:16"
      ? 9 / 16
      : appearance?.aspectRatio === "1:1"
      ? 1
      : 16 / 9;

  const thumbScale = appearance?.thumbnailScale || "fill";
  const thumbObjectFit = thumbScale === "fit" ? "contain" : "cover";
  const showClient = appearance?.showClientInfo ?? true;

  return (
    <section className="space-y-8">
      {/* Section heading & Eyebrow */}
      <div className="text-center space-y-2">
        <TypographyKicker color="orange">Our Portfolio</TypographyKicker>
        <TypographyH2 className="font-heading font-black text-3xl sm:text-4xl md:text-5xl text-white tracking-tight uppercase">
          Latest Work
        </TypographyH2>
      </div>

      {/* Filter Segmented Control Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 rounded-full bg-[#18181b] border border-white/10 shadow-inner gap-1">
          {(["projects", "films", "stills"] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Button
                key={tab}
                type="button"
                variant={isActive ? "default" : "ghost"}
                onClick={() => setActiveTab(tab)}
                className={`px-6 sm:px-8 py-2 rounded-full text-xs font-bold tracking-wide capitalize transition-all duration-200 cursor-pointer h-auto ${
                  isActive
                    ? "bg-[#f5551d] text-white hover:bg-[#ff8a45] shadow-md"
                    : "text-zinc-400 hover:text-white hover:bg-transparent"
                }`}
              >
                {tab}
              </Button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: PROJECTS */}
      {activeTab === "projects" && (
        projects.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-[#141416]/50 rounded-2xl border border-white/5">
            <div className="size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
              <Layers className="size-5" />
            </div>
            <p className="text-zinc-400 font-sans text-sm">No featured projects published yet.</p>
          </div>
        ) : (
          <div className={isMasonry ? `${columnsClass} animate-in fade-in duration-300` : `grid ${gridClasses} animate-in fade-in duration-300`}>
            {projects.map((proj) => (
              <div key={proj.id} className={isMasonry ? `break-inside-avoid ${itemSpacing} w-full` : "h-full"}>
                <TiltCard tiltIntensity={4} glareIntensity={0.12} className={`w-full ${isMasonry ? "h-auto" : "h-full"}`}>
                  <div
                    onClick={() => setSelectedProject(proj)}
                    className={`group relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 cursor-pointer shadow-lg hover:border-white/25 transition-all duration-300 w-full ${isMasonry ? "h-auto" : "h-full"}`}
                  >
                    <AspectRatio ratio={isMasonry ? 16 / 11 : numericRatio} className="w-full">
                      <AppImage
                        src={proj.coverImage}
                        alt={proj.title}
                        fallbackIcon="film"
                        objectFit={thumbObjectFit}
                        containerClassName="size-full"
                        className="size-full transition-transform duration-500 group-hover:scale-105"
                      />
                    </AspectRatio>

                    {/* Gradient shadow */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent group-hover:via-black/20 transition-all duration-300 pointer-events-none" />

                    {/* Top-right asset count badge */}
                    <div className="absolute top-3 right-3 z-10">
                      <Badge variant="outline" className="bg-black/60 backdrop-blur-md border-white/10 text-[11px] font-mono text-zinc-200">
                        {proj.tc}
                      </Badge>
                    </div>

                    {/* Bottom title and client */}
                    <div className="absolute bottom-4 left-4 right-4 z-10 space-y-0.5 pointer-events-none">
                      <TypographyH3 className="font-heading font-bold text-base text-white group-hover:text-[#f5551d] transition-colors truncate">
                        {proj.title}
                      </TypographyH3>
                      {showClient && (
                        <TypographyMuted className="text-xs text-zinc-400 font-mono truncate">
                          {proj.client}
                        </TypographyMuted>
                      )}
                    </div>
                  </div>
                </TiltCard>
              </div>
            ))}
          </div>
        )
      )}

      {/* TAB 2: FILMS */}
      {activeTab === "films" && (
        films.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-[#141416]/50 rounded-2xl border border-white/5">
            <div className="size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
              <Film className="size-5" />
            </div>
            <p className="text-zinc-400 font-sans text-sm">No cinematic films published yet.</p>
          </div>
        ) : (
          <div className={isMasonry ? `${columnsClass} animate-in fade-in duration-300` : `grid ${gridClasses} animate-in fade-in duration-300`}>
            {films.map((film) => {
              const filmRatio = isMasonry ? (film.ar || 16 / 9) : numericRatio;
              return (
                <div key={film.id} className={isMasonry ? `break-inside-avoid ${itemSpacing} w-full` : "h-full"}>
                  <TiltCard tiltIntensity={4} glareIntensity={0.12} className={`w-full ${isMasonry ? "h-auto" : "h-full"}`}>
                    <div
                      onClick={() => setActiveFilm(film)}
                      className={`group relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 cursor-pointer shadow-lg hover:border-white/25 transition-all duration-300 w-full ${isMasonry ? "h-auto" : "h-full"} flex flex-col justify-between`}
                    >
                      <div className="relative w-full overflow-hidden">
                        <AspectRatio ratio={filmRatio} className="w-full">
                          <AppImage
                            src={film.image}
                            alt={film.title}
                            fallbackIcon="film"
                            objectFit={thumbObjectFit}
                            containerClassName="size-full"
                            className="size-full transition-transform duration-500 group-hover:scale-105"
                          />
                        </AspectRatio>
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors pointer-events-none" />

                        {/* Top-right duration */}
                        <div className="absolute top-3 right-3 z-10">
                          <Badge variant="outline" className="bg-black/60 backdrop-blur-md border-white/10 text-[11px] font-mono text-white">
                            {film.tc}
                          </Badge>
                        </div>

                        {/* Top-left resolution */}
                        <div className="absolute top-3 left-3 z-10">
                          <Badge variant="outline" className="bg-black/60 backdrop-blur-md border-white/10 text-[10px] font-mono font-bold text-white uppercase gap-1.5">
                            <Film className="size-3 text-[#f5551d]" />
                            <span>{film.resolution || "4K 60fps"}</span>
                          </Badge>
                        </div>

                        {/* Center play icon */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="size-12 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-[#f5551d] group-hover:text-black transition-all duration-300 shadow-xl">
                            <Play className="size-5 fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>

                      {/* Card bottom info */}
                      <div className="p-4 bg-[#121214] border-t border-white/5 space-y-1">
                        <TypographyH3 className="font-heading font-bold text-base text-white group-hover:text-[#f5551d] transition-colors truncate">
                          {film.title}
                        </TypographyH3>
                        {showClient && (
                          <p className="text-xs text-zinc-400 font-sans line-clamp-1">
                            {film.desc}
                          </p>
                        )}
                      </div>
                    </div>
                  </TiltCard>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ------------------------------------------------------------ */}
      {/* TAB 3: STILLS                                                */}
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
          <div className={isMasonry ? `${columnsClass} animate-in fade-in duration-300` : `grid ${gridClasses} animate-in fade-in duration-300`}>
            {stills.map((still) => (
              <div
                key={still.id}
                onClick={() => setActiveStill(still)}
                className={isMasonry ? `break-inside-avoid ${itemSpacing} w-full group relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 cursor-pointer shadow-lg hover:border-white/25 transition-all duration-300` : "h-full"}
              >
                {isMasonry ? (
                  <>
                    {/* Still image in Masonry */}
                    <img
                      src={still.image}
                      alt={still.title}
                      loading="lazy"
                      className={`w-full h-auto ${thumbObjectFit === "contain" ? "object-contain bg-black" : "object-cover"} transition-transform duration-500 group-hover:scale-105 block`}
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
                        {showClient && (
                          <p className="text-xs text-zinc-400 font-mono capitalize">
                            {still.cat}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <TiltCard tiltIntensity={4} glareIntensity={0.12} className="w-full h-full">
                    <div className="group relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 cursor-pointer shadow-lg hover:border-white/25 transition-all duration-300 w-full h-full">
                      <AspectRatio ratio={numericRatio} className="w-full">
                        <AppImage
                          src={still.image}
                          alt={still.title}
                          fallbackIcon="image"
                          objectFit={thumbObjectFit}
                          containerClassName="size-full"
                          className="size-full transition-transform duration-500 group-hover:scale-105"
                        />
                      </AspectRatio>

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
                          {showClient && (
                            <p className="text-xs text-zinc-400 font-mono capitalize">
                              {still.cat}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </TiltCard>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </section>
  );
}
