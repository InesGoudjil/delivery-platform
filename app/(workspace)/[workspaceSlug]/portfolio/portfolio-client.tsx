"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Upload,
  Plus,
  Play,
  Check,
  Sparkles,
  Sliders,
  Eye,
  Star,
  CheckCircle2,
  X,
  Layers,
  Film,
  Camera,
  FolderKanban,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { VideoUploader } from "@/components/workspaces/video-uploader";
import {
  updatePortfolioAction,
  toggleFeaturedProjectAction,
} from "@/app/actions/portfolio";

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  type: "film" | "still" | "project";
  assetCount: number;
  thumbnailUrl: string;
  isFeatured?: boolean;
}

export interface PortfolioClientProps {
  workspace: {
    id: string;
    brandName: string;
    slug: string;
  };
  portfolio: {
    id: string;
    title: string;
    bio?: string | null;
    isPublished?: boolean;
  };
  initialProjects: PortfolioItem[];
  initialFeaturedIds: string[];
}

export function PortfolioClient({
  workspace,
  portfolio,
  initialProjects,
  initialFeaturedIds,
}: PortfolioClientProps) {
  const [isPending, startTransition] = useTransition();

  // Appearance States matching screenshot
  const [cardSize, setCardSize] = useState<"S" | "M" | "L">("M");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1" | "4:3">("16:9");
  const [thumbnailScale, setThumbnailScale] = useState<"fit" | "fill">("fill");
  const [showClientInfo, setShowClientInfo] = useState(true);

  // Filter tab
  const [activeTab, setActiveTab] = useState<"films" | "stills" | "projects">("projects");

  // Projects & Featured lists
  const [projects, setProjects] = useState<PortfolioItem[]>(initialProjects);
  const [featuredIds, setFeaturedIds] = useState<string[]>(
    initialFeaturedIds.length > 0
      ? initialFeaturedIds
      : initialProjects.map((p) => p.id)
  );

  // Bio state
  const [bio, setBio] = useState(
    portfolio.bio ||
      "Filmmaker & creative director based between Dubai and Sharjah. I specialize in films, commercials, and launch content for the Gulf — every frame, every cut, you don't notice."
  );

  // Upload modal state
  const [showUploader, setShowUploader] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showFlash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleFeature = (id: string) => {
    const isCurrentlyFeatured = featuredIds.includes(id);
    const updatedIds = isCurrentlyFeatured
      ? featuredIds.filter((fId) => fId !== id)
      : [...featuredIds, id];

    setFeaturedIds(updatedIds);

    startTransition(async () => {
      await toggleFeaturedProjectAction(
        portfolio.id,
        id,
        !isCurrentlyFeatured
      );
      showFlash(
        isCurrentlyFeatured
          ? "Removed from featured work reel"
          : "Pinned to featured work reel"
      );
    });
  };

  const handleSaveBio = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updatePortfolioAction(portfolio.id, {
        bio,
      });
      if (res.success) {
        showFlash("About & Bio updated successfully!");
      } else {
        showFlash("Failed to save bio.");
      }
    });
  };

  const filteredProjects = projects.filter((p) => {
    if (activeTab === "films") return p.type === "film" || p.type === "project";
    if (activeTab === "stills") return p.type === "still";
    return true;
  });

  const featuredItems = projects.filter((p) => featuredIds.includes(p.id));

  // Dynamic grid classes based on Card Size
  const gridClasses =
    cardSize === "S"
      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
      : cardSize === "M"
      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6";

  // Dynamic Aspect Ratio classes
  const aspectClasses =
    aspectRatio === "16:9"
      ? "aspect-video"
      : aspectRatio === "9:16"
      ? "aspect-[9/16]"
      : aspectRatio === "1:1"
      ? "aspect-square"
      : "aspect-[4/3]";

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#f5551d] text-black font-semibold text-xs px-4 py-2.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}

      {/* Upload Modal Drawer */}
      {showUploader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#141416] border border-white/15 rounded-2xl p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setShowUploader(false)}
              className="absolute top-4 right-4 text-[#8e8e93] hover:text-white transition-colors"
            >
              <X className="size-5" />
            </button>
            <VideoUploader
              workspaceId={workspace.id}
              projectId={projects[0]?.id || "new"}
              onUploadComplete={(asset) => {
                setShowUploader(false);
                showFlash(`Master "${asset.title}" uploaded!`);
              }}
            />
          </div>
        </div>
      )}

      {/* ===================== TOP HEADER & ACTION BUTTONS ===================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-1">
            Your public page
          </div>
          <h1 className="text-3xl font-bold font-heading text-[#f6f3ec] tracking-tight">
            PORTFOLIO
          </h1>
          <p className="text-xs text-[#8e8e93] mt-0.5 max-w-xl">
            Manage the work potential clients see when they visit your public film and portfolio pages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* UPLOAD FILM OR STILL Button */}
          <Button
            onClick={() => setShowUploader(true)}
            variant="outline"
            className="rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-[#f6f3ec] text-xs font-semibold px-4 py-2 cursor-pointer transition-all duration-150 h-9"
          >
            <Upload className="size-3.5 mr-1.5 text-[#8e8e93]" />
            <span>UPLOAD FILM OR STILL</span>
          </Button>

          {/* + UPLOAD A PROJECT Glowing Button */}
          <Button
            onClick={() => setShowUploader(true)}
            className="rounded-xl bg-gradient-to-r from-[#d9481d] to-[#992e10] hover:from-[#f5551d] hover:to-[#ff8a45] text-white font-bold text-xs uppercase px-5 py-2 shadow-lg shadow-[#d9481d]/20 transition-all duration-200 cursor-pointer h-9 gap-1.5"
          >
            <Plus className="size-4 stroke-[3]" />
            <span>UPLOAD A PROJECT</span>
          </Button>
        </div>
      </div>

      {/* ===================== CARD 1: APPEARANCE SETTINGS ===================== */}
      <section className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#f6f3ec]">
            <Sliders className="size-3.5 text-[#f5551d]" />
            <span>Appearance</span>
          </div>
          <span className="text-[11px] text-[#71717a] font-mono">
            Affects visitor grid presentation
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {/* Card Size: S / M / L */}
          <div className="space-y-1.5">
            <span className="text-[#8e8e93] font-medium block">Card size</span>
            <div className="inline-flex rounded-lg bg-[#0c0c0e] p-0.5 border border-white/10">
              {(["S", "M", "L"] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setCardSize(sz)}
                  className={`px-3 py-1 rounded-md font-mono text-xs font-semibold transition-all cursor-pointer ${
                    cardSize === sz
                      ? "bg-[#f5551d] text-black shadow-sm"
                      : "text-[#8e8e93] hover:text-white"
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio: 16:9 / 9:16 / 1:1 / 4:3 */}
          <div className="space-y-1.5">
            <span className="text-[#8e8e93] font-medium block">Aspect ratio</span>
            <div className="inline-flex rounded-lg bg-[#0c0c0e] p-0.5 border border-white/10">
              {(["16:9", "9:16", "1:1", "4:3"] as const).map((ar) => (
                <button
                  key={ar}
                  type="button"
                  onClick={() => setAspectRatio(ar)}
                  className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-semibold transition-all cursor-pointer ${
                    aspectRatio === ar
                      ? "bg-white/20 text-[#f6f3ec]"
                      : "text-[#8e8e93] hover:text-white"
                  }`}
                >
                  {ar}
                </button>
              ))}
            </div>
          </div>

          {/* Thumbnail Scale: Fit / Fill */}
          <div className="space-y-1.5">
            <span className="text-[#8e8e93] font-medium block">Thumbnail scale</span>
            <div className="inline-flex rounded-lg bg-[#0c0c0e] p-0.5 border border-white/10">
              {(["fit", "fill"] as const).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setThumbnailScale(sc)}
                  className={`px-3 py-1 rounded-md font-mono text-xs capitalize font-semibold transition-all cursor-pointer ${
                    thumbnailScale === sc
                      ? "bg-white/20 text-[#f6f3ec]"
                      : "text-[#8e8e93] hover:text-white"
                  }`}
                >
                  {sc}
                </button>
              ))}
            </div>
          </div>

          {/* Show Client Info: Toggle */}
          <div className="space-y-1.5 flex flex-col justify-between">
            <span className="text-[#8e8e93] font-medium block">Show client info</span>
            <div className="flex items-center gap-2 pt-1">
              <Switch
                checked={showClientInfo}
                onCheckedChange={setShowClientInfo}
                className="data-[state=checked]:bg-[#f5551d]"
              />
              <span className="text-[11px] text-[#71717a] font-mono">
                {showClientInfo ? "Visible" : "Hidden"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== CARD 2: FEATURED ON YOUR WORK PAGE ===================== */}
      <section className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-[#f6f3ec]">
            Featured on your Work page ({featuredItems.length})
          </div>
          <span className="text-[11px] text-[#71717a] font-mono">
            Drag or click cards to reorder visitor reel
          </span>
        </div>

        {/* Horizontal Carousel of Thumbnails */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-white/10">
          {featuredItems.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => handleToggleFeature(item.id)}
              className={`relative size-20 sm:w-28 sm:h-18 rounded-xl overflow-hidden shrink-0 border-2 cursor-pointer transition-all duration-200 group hover:scale-[1.03] ${
                idx === featuredItems.length - 1
                  ? "border-[#f5551d] shadow-md shadow-[#f5551d]/20"
                  : "border-white/10 hover:border-white/30"
              }`}
            >
              <Image
                src={item.thumbnailUrl}
                alt={item.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                <span className="text-[10px] font-bold text-white truncate max-w-full leading-tight">
                  {item.title}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== CARD 3: PORTFOLIO WORK GRID ===================== */}
      <section className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-5 md:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm font-bold text-[#f6f3ec]">
            Portfolio work — shown to visitors
          </div>

          {/* Filter Pills: Films / Stills / Projects */}
          <div className="flex items-center bg-[#0c0c0e] p-1 rounded-xl border border-white/10 self-start">
            <button
              onClick={() => setActiveTab("films")}
              className={`px-3.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "films"
                  ? "bg-[#f5551d] text-black font-bold"
                  : "text-[#8e8e93] hover:text-white"
              }`}
            >
              Films
            </button>
            <button
              onClick={() => setActiveTab("stills")}
              className={`px-3.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "stills"
                  ? "bg-[#f5551d] text-black font-bold"
                  : "text-[#8e8e93] hover:text-white"
              }`}
            >
              Stills
            </button>
            <button
              onClick={() => setActiveTab("projects")}
              className={`px-3.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "projects"
                  ? "bg-[#f5551d] text-black font-bold"
                  : "text-[#8e8e93] hover:text-white"
              }`}
            >
              Projects
            </button>
          </div>
        </div>

        {/* 8-Card Showcase Grid Matching Screenshot */}
        <div className={`grid ${gridClasses}`}>
          {filteredProjects.map((item) => {
            const isFeatured = featuredIds.includes(item.id);

            return (
              <div
                key={item.id}
                className="group relative rounded-2xl bg-[#0c0c0e] border border-white/[0.08] overflow-hidden transition-all duration-300 hover:border-white/20 hover:shadow-2xl shadow-black/40"
              >
                {/* Media Container */}
                <div className={`relative w-full ${aspectClasses} overflow-hidden bg-black`}>
                  <Image
                    src={item.thumbnailUrl}
                    alt={item.title}
                    fill
                    className={`transition-transform duration-500 group-hover:scale-105 ${
                      thumbnailScale === "fit" ? "object-contain" : "object-cover"
                    }`}
                  />

                  {/* Asset Count Badge (Top Right) */}
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-black/60 backdrop-blur-md text-[#f6f3ec] border border-white/10">
                      {item.assetCount} assets
                    </span>
                  </div>

                  {/* Hover Overlay with Action Buttons */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleToggleFeature(item.id)}
                      className={`rounded-full size-8 p-0 cursor-pointer ${
                        isFeatured
                          ? "bg-[#f5551d] text-black hover:bg-[#ff8a45]"
                          : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-md"
                      }`}
                      title={isFeatured ? "Unfeature" : "Feature"}
                    >
                      <Star className="size-4 fill-current" />
                    </Button>

                    <Button
                      asChild
                      size="sm"
                      className="rounded-full size-8 p-0 bg-white text-black hover:bg-white/90 shadow-md cursor-pointer"
                      title="View Project"
                    >
                      <Link href={`/${workspace.slug}/deliveries/${item.id}`}>
                        <Play className="size-3.5 fill-black ml-0.5" />
                      </Link>
                    </Button>
                  </div>

                  {/* Bottom Gradient with Title and Category Subtitle */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3.5 pt-8 flex flex-col justify-end">
                    <span className="text-xs font-bold text-white tracking-tight leading-snug truncate">
                      {item.title}
                    </span>
                    {showClientInfo && (
                      <span className="text-[10px] text-[#9a9a9f] font-mono truncate">
                        {item.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===================== CARD 4: ABOUT & BIO ===================== */}
      <section className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-5 md:p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-bold text-[#f6f3ec]">About &amp; Bio</h3>
          <p className="text-[11px] text-[#71717a] mt-0.5">
            Brief introduction displayed on your public creator storefront.
          </p>
        </div>

        <form onSubmit={handleSaveBio} className="space-y-3">
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-[#0c0c0e] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#f6f3ec] focus:outline-none focus:border-[#f5551d] transition-colors resize-none leading-relaxed"
          />

          <div className="flex items-center justify-start">
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-gradient-to-r from-[#d9481d] to-[#992e10] hover:from-[#f5551d] hover:to-[#ff8a45] text-white font-bold text-xs uppercase px-5 py-2 shadow-md shadow-[#d9481d]/20 transition-all cursor-pointer h-8 gap-1.5"
            >
              <Check className="size-3.5" />
              <span>{isPending ? "SAVING..." : "SAVE"}</span>
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
