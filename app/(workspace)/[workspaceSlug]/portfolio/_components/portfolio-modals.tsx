"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FolderKanban,
  Loader2,
  Trash2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/workspaces/delete-confirm-dialog";
import { TypographyH2, TypographyLead, TypographySpan } from "@/components/ui/typography";
import { PortfolioItem, ProjectAsset } from "../portfolio-client";
import { getProjectAssetsAction } from "@/app/actions/portfolio";
import {
  MediaCard,
  MediaGrid,
  MediaBadge,
  PlayButtonOverlay,
  ZoomButtonOverlay,
} from "@/components/workspaces/media-card";

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
      showApproval={false}
      showVersions={false}
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
      showApproval={false}
      showVersions={false}
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
          className="max-sm:!fixed max-sm:!inset-0 max-sm:!h-[100dvh] max-sm:!max-h-[100dvh] max-sm:!w-full max-sm:!max-w-none max-sm:!rounded-none max-sm:!border-0 max-sm:!translate-x-0 max-sm:!translate-y-0 max-sm:!top-0 max-sm:!left-0 w-full sm:max-w-5xl max-h-[calc(100dvh-2rem)] sm:max-h-[88vh] overflow-hidden flex flex-col p-0 bg-[#121215]/95 backdrop-blur-2xl border border-white/15 shadow-2xl rounded-3xl text-white outline-none"
        >
          {/* Header Section (Fixed at top) */}
          <div className="shrink-0 p-4 sm:p-7 pb-3 sm:pb-4 border-b border-white/10 relative space-y-3.5 bg-[#121215]/50 pt-safe">
            {/* Close Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-6 sm:right-6 size-8 sm:size-9 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer z-20"
              title="Close project explorer (Esc)"
            >
              <X className="size-4 sm:size-4.5" />
            </Button>

            {/* Meta Row: Badge, Counts, Edit Project */}
            <div className="flex flex-wrap items-center gap-2 pr-10">
              <TypographySpan className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/15 border border-primary/30 text-[10px] font-bold text-primary uppercase tracking-wider">
                <FolderKanban className="size-3" />
                <span>PROJECT CONTAINER</span>
              </TypographySpan>

              <TypographySpan className="text-[11px] text-zinc-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
                {assets.length} items · {filmCount} film{filmCount !== 1 ? "s" : ""}, {stillCount} still{stillCount !== 1 ? "s" : ""}
              </TypographySpan>

              {onEditProject && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onEditProject(project)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white transition-colors cursor-pointer h-7"
                  title="Edit project details"
                >
                  <Pencil className="size-3" />
                  <span>Edit Project</span>
                </Button>
              )}
            </div>

            {/* Project Title & Description */}
            <div className="space-y-1 pr-10">
              <TypographyH2 className="text-xl sm:text-2xl md:text-3xl font-black text-white font-heading tracking-tight border-none pb-0">
                {project.title}
              </TypographyH2>

              {project.description && (
                <TypographyLead className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-2xl font-sans line-clamp-2">
                  {project.description}
                </TypographyLead>
              )}
            </div>

            {/* Filter Toolbar */}
            <div className="flex items-center justify-between pt-1">
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
                    className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer h-7 sm:h-8 ${
                      activeFilter === tab.key
                        ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                        : "text-zinc-400 hover:text-white hover:bg-transparent"
                    }`}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>

              <TypographySpan className="text-xs text-zinc-500 hidden sm:inline">
                Click any still or video to view in full
              </TypographySpan>
            </div>
          </div>

          {/* Body Section (Scrollable MediaGrid area) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400 text-xs">
                <Loader2 className="size-6 animate-spin text-primary" />
                <TypographySpan>Loading project assets...</TypographySpan>
              </div>
            ) : filteredAssets.length > 0 ? (
              <MediaGrid isMasonry={false} cardSize="M" className="gap-4 pb-4">
                {filteredAssets.map((asset) => {
                  const isVideo = asset.type === "film";

                  return (
                    <MediaCard
                      key={asset.id}
                      title={asset.title}
                      subtitle={isVideo ? "Video Stream" : "Photo Still"}
                      src={asset.thumbnailUrl || asset.url}
                      type={isVideo ? "film" : "still"}
                      aspectRatio={asset.aspectRatio || "16:9"}
                      onClick={() => {
                        if (isVideo) onSelectFilm(asset);
                        else onSelectStill(asset);
                      }}
                      tiltIntensity={2}
                      glareIntensity={0.06}
                      topLeft={<MediaBadge type={isVideo ? "film" : "still"} />}
                      topRight={
                        (onEditAsset || onDeleteAsset) ? (
                          <div className="flex items-center gap-1.5">
                            {onEditAsset && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditAsset(asset);
                                }}
                                className="size-8 rounded-full p-0 bg-black/60 backdrop-blur-md text-zinc-400 hover:text-white hover:bg-white/20 border border-white/10 hover:border-white/30 flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100 max-sm:opacity-100 shadow-md"
                                title="Edit asset"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                            )}
                            {onDeleteAsset && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAssetToDelete(asset);
                                }}
                                className="size-8 rounded-full p-0 bg-black/60 backdrop-blur-md text-zinc-400 hover:text-red-400 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100 max-sm:opacity-100 shadow-md"
                                title="Delete asset"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        ) : undefined
                      }
                      centerAction={isVideo ? <PlayButtonOverlay /> :null}
                      footerMode="overlay"
                    />
                  );
                })}
              </MediaGrid>
            ) : (
              <div className="py-16 text-center text-zinc-500 text-xs italic bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
                No {activeFilter === "all" ? "assets" : activeFilter} found inside this project container.
              </div>
            )}
          </div>
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
