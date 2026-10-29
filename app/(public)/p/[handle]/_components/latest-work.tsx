"use client";

import React, { useState, useCallback } from "react";
import { Film, Image as ImageIcon, Layers, Play, Loader2, CheckCircle2 } from "lucide-react";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import {
  MediaCard,
  MediaGrid,
  MediaBadge,
  AssetCountBadge,
  PlayButtonOverlay,
  ZoomButtonOverlay,
} from "@/components/workspaces/media-card";
import { PortfolioProject, PortfolioAsset } from "@/lib/portfolio-data";
import { PortfolioAppearance } from "@/core/entities/portfolio";
import { usePortfolioModal } from "./portfolio-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TypographyH2, TypographyH3, TypographyKicker, TypographyMuted, TypographySpan } from "@/components/ui/typography";

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

  const PAGE_SIZE = 12;
  const [visibleCounts, setVisibleCounts] = useState<Record<"projects" | "films" | "stills", number>>({
    projects: PAGE_SIZE,
    films: PAGE_SIZE,
    stills: PAGE_SIZE,
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const visibleProjects = projects.slice(0, visibleCounts.projects);
  const visibleFilms = films.slice(0, visibleCounts.films);
  const visibleStills = stills.slice(0, visibleCounts.stills);

  const hasMoreProjects = projects.length > visibleProjects.length;
  const hasMoreFilms = films.length > visibleFilms.length;
  const hasMoreStills = stills.length > visibleStills.length;

  const currentHasMore =
    activeTab === "projects"
      ? hasMoreProjects
      : activeTab === "films"
      ? hasMoreFilms
      : hasMoreStills;

  const handleLoadMore = useCallback((tab: "projects" | "films" | "stills") => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCounts((prev) => ({
        ...prev,
        [tab]: (prev[tab] || PAGE_SIZE) + PAGE_SIZE,
      }));
      setIsLoadingMore(false);
    }, 200);
  }, [PAGE_SIZE]);

  const handleCurrentLoadMore = useCallback(() => {
    if (isLoadingMore) return;
    handleLoadMore(activeTab);
  }, [activeTab, isLoadingMore, handleLoadMore]);

  const { sentinelRef } = useInfiniteScroll({
    hasMore: currentHasMore,
    isLoading: isLoadingMore,
    onLoadMore: handleCurrentLoadMore,
    rootMargin: "300px",
  });

  const isMasonry =
    appearance?.aspectRatio === "grid" ||
    appearance?.aspectRatio === "masonry" ||
    appearance?.aspectRatio === "4:3";

  const cardSize = appearance?.cardSize || "M";

  const numericRatio =
    isMasonry
      ? undefined
      : appearance?.aspectRatio === "9:16"
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
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
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
          <div className="space-y-8">
            <MediaGrid isMasonry={isMasonry} cardSize={cardSize} className="animate-in fade-in duration-300">
              {visibleProjects.map((proj) => (
                <MediaCard
                  key={proj.id}
                  title={proj.title}
                  subtitle={proj.client}
                  showInfo={showClient}
                  showTitle={showClient}
                  showSubtitle={showClient}
                  src={proj.coverImage}
                  type="project"
                  isMasonry={isMasonry}
                  numericRatio={isMasonry ? 16 / 11 : numericRatio}
                  thumbnailScale={thumbScale}
                  onClick={() => setSelectedProject(proj)}
                  tiltIntensity={4}
                  glareIntensity={0.12}
                  topRight={<AssetCountBadge count={proj.tc} />}
                  textAlign="center"
                  footerMode="overlay"
                />
              ))}
            </MediaGrid>

            {/* Infinite Scroll Sentinel & Stats for Projects */}
            {hasMoreProjects && (
              <div
                ref={sentinelRef}
                className="flex flex-col items-center justify-center pt-8 pb-4 space-y-3"
              >
                <div
                  onClick={() => handleLoadMore("projects")}
                  className="flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-[#141416]/90 border border-white/10 text-white shadow-xl cursor-pointer hover:border-primary/40 transition-all duration-300"
                >
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <TypographySpan className="text-xs font-bold uppercase tracking-wider">
                    {isLoadingMore ? "Loading projects..." : "Loading more projects"}
                  </TypographySpan>
                  {projects.length - visibleProjects.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-2 py-0.5 rounded-full ml-1 bg-primary/15 text-primary border border-primary/30"
                    >
                      +{projects.length - visibleProjects.length} more
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400">
                  Showing {visibleProjects.length} of {projects.length} projects
                </p>
              </div>
            )}

            {projects.length <= visibleProjects.length && projects.length > PAGE_SIZE && (
              <div className="text-center pt-2 pb-2 text-[11px]  text-zinc-500 flex items-center justify-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                <TypographySpan>All {projects.length} projects displayed</TypographySpan>
              </div>
            )}
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
          <div className="space-y-8">
            <MediaGrid isMasonry={isMasonry} cardSize={cardSize} className="animate-in fade-in duration-300">
              {visibleFilms.map((film) => {
                const filmRatio = isMasonry ? (film.ar || undefined) : numericRatio;
                return (
                  <MediaCard
                    key={film.id}
                    title={film.title}
                    subtitle={film.desc}
                    showInfo={showClient}
                    showTitle={showClient}
                    showSubtitle={showClient}
                    src={film.image}
                    type="film"
                    isMasonry={isMasonry}
                    numericRatio={filmRatio}
                    thumbnailScale={thumbScale}
                    onClick={() => setActiveFilm(film)}
                    tiltIntensity={4}
                    glareIntensity={0.12}
                    topLeft={<MediaBadge type="film" />}
                    topRight={
                      film.tc ? (
                        <AssetCountBadge count={film.tc} />
                      ) : undefined
                    }
                    centerAction={<PlayButtonOverlay />}
                    textAlign="center"
                    footerMode="overlay"
                  />
                );
              })}
            </MediaGrid>

            {/* Infinite Scroll Sentinel & Stats for Films */}
            {hasMoreFilms && (
              <div
                ref={sentinelRef}
                className="flex flex-col items-center justify-center pt-8 pb-4 space-y-3"
              >
                <div
                  onClick={() => handleLoadMore("films")}
                  className="flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-[#141416]/90 border border-white/10 text-white shadow-xl cursor-pointer hover:border-primary/40 transition-all duration-300"
                >
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <TypographySpan className="text-xs font-bold uppercase tracking-wider">
                    {isLoadingMore ? "Loading films..." : "Loading more films"}
                  </TypographySpan>
                  {films.length - visibleFilms.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-2 py-0.5 rounded-full ml-1 bg-primary/15 text-primary border border-primary/30"
                    >
                      +{films.length - visibleFilms.length} more
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400">
                  Showing {visibleFilms.length} of {films.length} films
                </p>
              </div>
            )}

            {films.length <= visibleFilms.length && films.length > PAGE_SIZE && (
              <div className="text-center pt-2 pb-2 text-[11px]  text-zinc-500 flex items-center justify-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                <TypographySpan>All {films.length} films displayed</TypographySpan>
              </div>
            )}
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
          <div className="space-y-8">
            <MediaGrid isMasonry={isMasonry} cardSize={cardSize} className="animate-in fade-in duration-300">
              {visibleStills.map((still) => (
                <MediaCard
                  key={still.id}
                  title={still.title}
                  subtitle={still.cat}
                  showInfo={showClient}
                  showTitle={showClient}
                  showSubtitle={showClient}
                  src={still.image}
                  type="still"
                  isMasonry={isMasonry}
                  numericRatio={isMasonry ? undefined : numericRatio}
                  thumbnailScale={thumbScale}
                  onClick={() => setActiveStill(still)}
                  tiltIntensity={4}
                  glareIntensity={0.12}
                  topLeft={<MediaBadge type="still" />}
                  centerAction={<ZoomButtonOverlay />}
                  textAlign="center"
                  footerMode="overlay"
                />
              ))}
            </MediaGrid>

            {/* Infinite Scroll Sentinel & Stats for Stills */}
            {hasMoreStills && (
              <div
                ref={sentinelRef}
                className="flex flex-col items-center justify-center pt-8 pb-4 space-y-3"
              >
                <div
                  onClick={() => handleLoadMore("stills")}
                  className="flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-[#141416]/90 border border-white/10 text-white shadow-xl cursor-pointer hover:border-primary/40 transition-all duration-300"
                >
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <TypographySpan className="text-xs font-bold uppercase tracking-wider">
                    {isLoadingMore ? "Loading stills..." : "Loading more stills"}
                  </TypographySpan>
                  {stills.length - visibleStills.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-2 py-0.5 rounded-full ml-1 bg-primary/15 text-primary border border-primary/30"
                    >
                      +{stills.length - visibleStills.length} more
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400">
                  Showing {visibleStills.length} of {stills.length} stills
                </p>
              </div>
            )}

            {stills.length <= visibleStills.length && stills.length > PAGE_SIZE && (
              <div className="text-center pt-2 pb-2 text-[11px]  text-zinc-500 flex items-center justify-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                <TypographySpan>All {stills.length} stills displayed</TypographySpan>
              </div>
            )}
          </div>
        )
      )}
    </section>
  );
}
