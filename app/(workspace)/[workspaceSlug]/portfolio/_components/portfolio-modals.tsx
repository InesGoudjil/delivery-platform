"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Play,
  Pause,
  Film,
  Image as ImageIcon,
  FolderKanban,
  ExternalLink,
  Download,
  ArrowLeft,
  Volume2,
  VolumeX,
  Maximize2,
  Loader2,
  Trash2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppImage } from "@/components/ui/app-image";
import { CutReviewPlayer } from "@/components/video/cut-review-player";
import { DeleteConfirmDialog } from "@/components/workspaces/delete-confirm-dialog";
import { TypographyH2, TypographyLead, TypographyH4 } from "@/components/ui/typography";
import { PortfolioItem, ProjectAsset } from "../portfolio-client";
import { getProjectAssetsAction } from "@/app/actions/portfolio";
import { resolveMediaUrl, resolveThumbnailUrl } from "@/lib/media";

import { AssetLightboxModal } from "@/components/workspaces/asset-lightbox-modal";
import {
  UniversalDialogRoot,
  UniversalDialogContent,
} from "@/components/ui/universal-dialog";

export { AssetLightboxModal };

// ==========================================
// 1. STILL LIGHTBOX MODAL (Delegates to centralized AssetLightboxModal with UniversalDialog)
// ==========================================
export interface StillLightboxModalProps {
  item: PortfolioItem | ProjectAsset | null;
  onClose: () => void;
  onBack?: () => void;
  onDelete?: (item: PortfolioItem | ProjectAsset) => Promise<void> | void;
  onEdit?: (item: PortfolioItem | ProjectAsset) => void;
}

export function StillLightboxModal({
  item,
  onClose,
  onBack,
  onDelete,
  onEdit,
}: StillLightboxModalProps) {
  return (
    <AssetLightboxModal
      activeItem={item}
      onClose={onClose}
      onBack={onBack}
      onDeleteAsset={onDelete}
      onEditAsset={onEdit}
      showFeedback={false}
    />
  );
}

// ==========================================
// 2. FILM PLAYER MODAL (Delegates to centralized AssetLightboxModal with UniversalDialog)
// ==========================================
export interface FilmPlayerModalProps {
  item: PortfolioItem | ProjectAsset | null;
  onClose: () => void;
  onBack?: () => void;
  onDelete?: (item: PortfolioItem | ProjectAsset) => Promise<void> | void;
  onEdit?: (item: PortfolioItem | ProjectAsset) => void;
}

export function FilmPlayerModal({
  item,
  onClose,
  onBack,
  onDelete,
  onEdit,
}: FilmPlayerModalProps) {
  return (
    <AssetLightboxModal
      activeItem={item}
      onClose={onClose}
      onBack={onBack}
      onDeleteAsset={onDelete}
      onEditAsset={onEdit}
      showFeedback={false}
    />
  );
}

// ==========================================
// 3. PROJECT EXPLORER MODAL (Multi-Asset Container)
// ==========================================
interface ProjectExplorerModalProps {
  project: PortfolioItem | null;
  onClose: () => void;
  onSelectStill: (still: ProjectAsset) => void;
  onSelectFilm: (film: ProjectAsset) => void;
  onDeleteAsset?: (asset: ProjectAsset) => Promise<void> | void;
  onEditProject?: (project: PortfolioItem) => void;
  onEditAsset?: (asset: ProjectAsset) => void;
}

export function ProjectExplorerModal({
  project,
  onClose,
  onSelectStill,
  onSelectFilm,
  onDeleteAsset,
  onEditProject,
  onEditAsset,
}: ProjectExplorerModalProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | "films" | "stills">("all");
  const [assets, setAssets] = useState<ProjectAsset[]>(project?.projectAssets || []);
  const [loading, setLoading] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<ProjectAsset | null>(null);
  const [isDeletingAsset, setIsDeletingAsset] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // If assets not preloaded, fetch them dynamically from server
  useEffect(() => {
    if (!project) return;
    if (project.projectAssets && project.projectAssets.length > 0) {
      setAssets(project.projectAssets);
      return;
    }
    if (!project.id?.trim()) {
      setAssets([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    getProjectAssetsAction(project.id).then((res) => {
      if (isMounted) {
        if (res.success && res.assets) {
          setAssets(res.assets as ProjectAsset[]);
        }
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [project]);

  if (!project) return null;

  const filmCount = assets.filter((a) => a.type === "film").length;
  const stillCount = assets.filter((a) => a.type === "still").length;

  const filteredAssets = assets.filter((item) => {
    if (activeFilter === "films") return item.type === "film";
    if (activeFilter === "stills") return item.type === "still";
    return true;
  });

  return (
    <>
      <UniversalDialogRoot
        open={Boolean(project)}
        onOpenChange={(open) => !open && onClose()}
      >
        <UniversalDialogContent
          size="5xl"
          showCloseButton={false}
          overlayClassName="bg-black/90 backdrop-blur-xl"
          className="w-full max-w-5xl bg-[#121215]/95 border border-white/15 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6 text-white relative max-h-[92vh] overflow-y-auto"
        >
        {/* Close Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-5 right-5 sm:top-7 sm:right-7 size-9 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer z-20"
          title="Close project explorer"
        >
          <X className="size-5" />
        </Button>

        {/* Project Header */}
        <div className="space-y-3 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/15 border border-primary/30 text-[10px] font-mono font-bold text-primary uppercase tracking-wider">
              <FolderKanban className="size-3" />
              <span>PROJECT CONTAINER</span>
            </span>

            <span className="text-[11px] font-mono text-zinc-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
              {assets.length} items · {filmCount} film{filmCount !== 1 ? "s" : ""}, {stillCount} still{stillCount !== 1 ? "s" : ""}
            </span>

            {onEditProject && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEditProject(project)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white transition-colors cursor-pointer h-auto"
                title="Edit project details"
              >
                <Pencil className="size-3.5" />
                <span>Edit Project</span>
              </Button>
            )}
          </div>

          <TypographyH2 className="text-2xl sm:text-3xl font-black text-white font-heading tracking-tight border-none pb-0">
            {project.title}
          </TypographyH2>

          {project.description && (
            <TypographyLead className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-2xl font-sans">
              {project.description}
            </TypographyLead>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="inline-flex items-center bg-[#0c0c0e] p-1 rounded-full border border-white/10 gap-1">
            {(
              [
                { key: "all", label: `All (${assets.length})` },
                { key: "films", label: `Films (${filmCount})` },
                { key: "stills", label: `Stills (${stillCount})` },
              ] as const
            ).map((tab) => (
              <Button
                key={tab.key}
                type="button"
                variant={activeFilter === tab.key ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveFilter(tab.key)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer h-auto ${
                  activeFilter === tab.key
                    ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    : "text-zinc-400 hover:text-white hover:bg-transparent"
                }`}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          <span className="text-xs font-mono text-zinc-500 hidden sm:inline">
            Click any still or video to view in full
          </span>
        </div>

        {/* Project Assets Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400 text-xs">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span>Loading project assets...</span>
          </div>
        ) : filteredAssets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {filteredAssets.map((asset) => {
              const isVideo = asset.type === "film";

              return (
                <div
                  key={asset.id}
                  onClick={() => {
                    if (isVideo) onSelectFilm(asset);
                    else onSelectStill(asset);
                  }}
                  className="group relative rounded-2xl bg-[#0c0c0e] border border-white/10 overflow-hidden hover:border-white/30 transition-all duration-200 cursor-pointer hover:shadow-xl shadow-black/40"
                >
                  {/* Thumbnail */}
                  <AppImage
                    src={asset.thumbnailUrl || asset.url}
                    alt={asset.title}
                    fallbackIcon={isVideo ? "film" : "image"}
                    containerClassName="aspect-video w-full relative"
                  />

                  {/* Top-Left Badge */}
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/15 text-[9px] font-mono font-bold text-white uppercase tracking-wider">
                      {isVideo ? (
                        <>
                          <Film className="size-2.5 text-primary" />
                          <span>FILM</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="size-2.5 text-zinc-300" />
                          <span>STILL</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Top-Right Action Buttons */}
                  {(onEditAsset || onDeleteAsset) && (
                    <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
                      {onEditAsset && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditAsset(asset);
                          }}
                          className="size-7 rounded-lg bg-black/70 backdrop-blur-md border-white/15 text-zinc-400 hover:text-white hover:bg-white/20 hover:border-white/30 flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100 max-sm:opacity-100 shadow-md p-0"
                          title="Edit asset"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      )}
                      {onDeleteAsset && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssetToDelete(asset);
                          }}
                          className="size-7 rounded-lg bg-black/70 backdrop-blur-md border-white/15 text-zinc-400 hover:text-red-400 hover:bg-red-500/20 hover:border-red-500/30 flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100 max-sm:opacity-100 shadow-md p-0"
                          title="Delete asset"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Center Action Overlay Icon */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <div className="size-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                      {isVideo ? (
                        <Play className="size-5 fill-current ml-0.5" />
                      ) : (
                        <Maximize2 className="size-4.5 stroke-[2.5]" />
                      )}
                    </div>
                  </div>

                  {/* Bottom Title Bar */}
                  <div className="p-3 bg-[#0c0c0e] border-t border-white/5 space-y-0.5">
                    <TypographyH4 className="text-xs font-bold text-white truncate font-heading group-hover:text-primary transition-colors">
                      {asset.title}
                    </TypographyH4>
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span>{isVideo ? "Video Stream" : "Photo Still"}</span>
                      {asset.duration && <span>{asset.duration}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center text-zinc-500 text-xs italic bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
            No {activeFilter === "all" ? "assets" : activeFilter} found inside this project container.
          </div>
        )}
        </UniversalDialogContent>
      </UniversalDialogRoot>

      {/* Move to Trash Confirm Dialog */}
      <DeleteConfirmDialog
        isOpen={Boolean(assetToDelete)}
        onOpenChange={(open) => !open && setAssetToDelete(null)}
        isPermanent={false}
        title="Move to Trash"
        itemName={assetToDelete?.title}
        description="This asset will be moved to your workspace Trash and safely retained for 30 days before permanent deletion."
        confirmText="Move to Trash"
        isDeleting={isDeletingAsset}
        onConfirm={async () => {
          if (!assetToDelete || !onDeleteAsset) return;
          setIsDeletingAsset(true);
          try {
            await onDeleteAsset(assetToDelete);
            setAssets((prev) => prev.filter((a) => a.id !== assetToDelete.id));
            setAssetToDelete(null);
          } finally {
            setIsDeletingAsset(false);
          }
        }}
      />
    </>
  );
}
