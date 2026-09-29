"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PortfolioAppearance, PortfolioExperience, SocialLinks } from "@/core/entities/portfolio";
import {
  toggleFeaturedItemAction,
  deletePortfolioItemAction,
  deleteAssetAction,
  updateAssetAction,
} from "@/app/actions/portfolio";
import { EditAssetDialog, type EditableAssetItem } from "@/components/workspaces/edit-asset-dialog";
import { TrashBinDialog } from "@/components/workspaces/trash-bin-dialog";
import { PortfolioHero } from "./_components/portfolio-hero";
import { AppearanceToolbar } from "./_components/appearance-toolbar";
import { FeaturedReel } from "./_components/featured-reel";
import { ShowcaseGrid } from "./_components/showcase-grid";
import {
  StillLightboxModal,
  FilmPlayerModal,
  ProjectExplorerModal,
} from "./_components/portfolio-modals";
import { ExperienceSection } from "./_components/experience-section";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";



export interface ProjectAsset {
  id: string;
  title: string;
  type: "film" | "still";
  url: string;
  thumbnailUrl: string;
  aspectRatio?: string;
  duration?: string | null;
  category?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  type: "film" | "still" | "project";
  assetCount: number;
  thumbnailUrl: string;
  mediaUrl?: string;
  description?: string | null;
  aspectRatio?: string;
  isFeatured?: boolean;
  projectAssets?: ProjectAsset[];
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
    coverAssetUrl?: string | null;
    socialLinks?: SocialLinks;
    isPublished?: boolean;
    appearance?: PortfolioAppearance;
    experience?: PortfolioExperience[];
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
  const router = useRouter();
  const [projects, setProjects] = useState<PortfolioItem[]>(initialProjects);
  const [featuredIds, setFeaturedIds] = useState<string[]>(initialFeaturedIds);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleToggleFeature = (item: PortfolioItem) => {
    const isCurrentlyFeatured = featuredIds.includes(item.id);
    const updatedIds = isCurrentlyFeatured
      ? featuredIds.filter((id) => id !== item.id)
      : [...featuredIds, item.id];

    setFeaturedIds(updatedIds);

    startTransition(async () => {
      const itemType = item.type === "project" ? "project" : "asset";
      await toggleFeaturedItemAction(
        portfolio.id,
        item.id,
        itemType,
        !isCurrentlyFeatured
      );
      showFlash(
        isCurrentlyFeatured
          ? `Removed "${item.title}" from featured reel`
          : `Pinned "${item.title}" to featured reel`
      );
    });
  };

  const initialApp: PortfolioAppearance = portfolio.appearance || {
    cardSize: "M",
    aspectRatio: "16:9",
    thumbnailScale: "fill",
    showClientInfo: true,
  };
  const [appearance, setAppearance] = useState<PortfolioAppearance>(initialApp);

  // Modal Preview States
  const [selectedStill, setSelectedStill] = useState<PortfolioItem | ProjectAsset | null>(null);
  const [selectedFilm, setSelectedFilm] = useState<PortfolioItem | ProjectAsset | null>(null);
  const [selectedProject, setSelectedProject] = useState<PortfolioItem | null>(null);
  const [activeParentProject, setActiveParentProject] = useState<PortfolioItem | null>(null);

  // Edit State
  const [itemToEdit, setItemToEdit] = useState<EditableAssetItem | null>(null);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);

  const handleSelectItem = (item: PortfolioItem) => {
    if (item.type === "still") {
      setSelectedStill(item);
    } else if (item.type === "film") {
      setSelectedFilm(item);
    } else if (item.type === "project") {
      setSelectedProject(item);
    }
  };

  const showFlash = (msg: string) => {
    toast.success(msg);
  };

  const handleProjectCreated = (newItem: PortfolioItem) => {
    setProjects((prev) => [newItem, ...prev]);
  };

  const handleDeleteItem = async (item: PortfolioItem | ProjectAsset) => {
    startTransition(async () => {
      const itemType =
        "type" in item && item.type === "project"
          ? "project"
          : item.type === "still"
          ? "still"
          : "film";

      const res = await deletePortfolioItemAction(
        item.id,
        itemType,
        portfolio.id,
        workspace.slug
      );

      if (res.success) {
        setProjects((prev) => prev.filter((p) => p.id !== item.id));
        setFeaturedIds((prev) => prev.filter((id) => id !== item.id));
        showFlash(itemType === "project" ? `Deleted project "${item.title}"` : `Moved "${item.title}" to Trash`);
        if (selectedStill?.id === item.id) {
          setSelectedStill(null);
          setActiveParentProject(null);
        }
        if (selectedFilm?.id === item.id) {
          setSelectedFilm(null);
          setActiveParentProject(null);
        }
        if (selectedProject?.id === item.id) {
          setSelectedProject(null);
          setActiveParentProject(null);
        }
      } else {
        toast.error(("error" in res && res.error) ? String(res.error) : "Failed to delete item");
      }
    });
  };

  const handleDeleteProjectAsset = async (asset: ProjectAsset) => {
    startTransition(async () => {
      const res = await deleteAssetAction(asset.id, {
        portfolioId: portfolio.id,
        workspaceSlug: workspace.slug,
        projectId: selectedProject?.id,
      });

      if (res.success) {
        setProjects((prev) =>
          prev.map((p) => {
            if (p.id === selectedProject?.id && p.projectAssets) {
              const updatedAssets = p.projectAssets.filter((a) => a.id !== asset.id);
              return {
                ...p,
                assetCount: updatedAssets.length,
                projectAssets: updatedAssets,
              };
            }
            return p;
          })
        );
        showFlash(`Moved "${asset.title}" to Trash`);
      } else {
        toast.error(res.error || "Failed to move asset to trash");
      }
    });
  };

  const handleOpenEdit = (item: PortfolioItem | ProjectAsset) => {
    setItemToEdit({
      id: item.id,
      title: item.title,
      description: "description" in item ? item.description : null,
      category: "category" in item ? item.category : null,
      thumbnailUrl: item.thumbnailUrl,
      aspectRatio: item.aspectRatio || "16:9",
      type: "type" in item ? item.type : "still",
    });
    setIsEditingItem(true);
  };

  const handleSaveEdit = async (updated: {
    id: string;
    title: string;
    description?: string;
    category?: string;
    thumbnailUrl?: string;
    aspectRatio?: string;
  }) => {
    setIsSavingItem(true);
    try {
      const isProj = itemToEdit?.type === "project";
      const res = await updateAssetAction(
        updated.id,
        {
          title: updated.title,
          description: updated.description,
          category: updated.category,
          thumbnailUrl: updated.thumbnailUrl,
          aspectRatio: updated.aspectRatio,
        },
        {
          portfolioId: portfolio.id,
          workspaceSlug: workspace.slug,
          isProject: isProj,
        }
      );

      if (res.success) {
        setProjects((prev) =>
          prev.map((p) => {
            if (p.id === updated.id) {
              return {
                ...p,
                title: updated.title,
                description: updated.description !== undefined ? updated.description : p.description,
                category: updated.category || p.category,
                thumbnailUrl: updated.thumbnailUrl || p.thumbnailUrl,
                aspectRatio: updated.aspectRatio || p.aspectRatio,
              };
            }
            if (p.projectAssets) {
              const updatedAssets = p.projectAssets.map((a) =>
                a.id === updated.id
                  ? {
                      ...a,
                      title: updated.title,
                      category: updated.category || a.category,
                      thumbnailUrl: updated.thumbnailUrl || a.thumbnailUrl,
                      aspectRatio: updated.aspectRatio || a.aspectRatio,
                    }
                  : a
              );
              return {
                ...p,
                projectAssets: updatedAssets,
              };
            }
            return p;
          })
        );

        if (selectedProject?.id === updated.id) {
          setSelectedProject((prev) =>
            prev
              ? {
                  ...prev,
                  title: updated.title,
                  description: updated.description !== undefined ? updated.description : prev.description,
                  category: updated.category || prev.category,
                  thumbnailUrl: updated.thumbnailUrl || prev.thumbnailUrl,
                }
              : null
          );
        }
        if (selectedFilm?.id === updated.id) {
          setSelectedFilm((prev) =>
            prev
              ? {
                  ...prev,
                  title: updated.title,
                  category: updated.category || prev.category,
                  thumbnailUrl: updated.thumbnailUrl || prev.thumbnailUrl,
                  aspectRatio: updated.aspectRatio || prev.aspectRatio,
                }
              : null
          );
        }
        if (selectedStill?.id === updated.id) {
          setSelectedStill((prev) =>
            prev
              ? {
                  ...prev,
                  title: updated.title,
                  category: updated.category || prev.category,
                  thumbnailUrl: updated.thumbnailUrl || prev.thumbnailUrl,
                  aspectRatio: updated.aspectRatio || prev.aspectRatio,
                }
              : null
          );
        }

        showFlash(`Updated "${updated.title}" successfully`);
      } else {
        toast.error(res.error || "Failed to update item");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update item");
    } finally {
      setIsSavingItem(false);
    }
  };

  return (
    <TooltipProvider delay={150}>
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
        {/* 1. Header & Modals matching Screenshot 3 */}
      <PortfolioHero
        workspace={workspace}
        portfolio={portfolio}
        onProjectCreated={handleProjectCreated}
        showFlash={showFlash}
      />

      {/* 2. Appearance Controls Card matching Screenshot 3 */}
      <AppearanceToolbar
        portfolioId={portfolio.id}
        initialAppearance={appearance}
        onAppearanceChange={setAppearance}
        showFlash={showFlash}
      />

      {/* 3. Featured Work Reel matching Screenshot 3 */}
      <FeaturedReel
        portfolioId={portfolio.id}
        initialProjects={projects}
        initialFeaturedIds={initialFeaturedIds}
        featuredIds={featuredIds}
        onToggleFeature={handleToggleFeature}
        showFlash={showFlash}
        onSelectItem={handleSelectItem}
      />

      {/* 4. Showcase Work Grid matching Screenshot 4 */}
      <ShowcaseGrid
        portfolioId={portfolio.id}
        workspaceSlug={workspace.slug}
        projects={projects}
        initialFeaturedIds={initialFeaturedIds}
        featuredIds={featuredIds}
        onToggleFeature={handleToggleFeature}
        appearance={appearance}
        showFlash={showFlash}
        onSelectItem={handleSelectItem}
        onDeleteItem={handleDeleteItem}
        onEditItem={handleOpenEdit}
        onOpenTrash={() => setIsTrashOpen(true)}
      />

      {/* 6. Still Lightbox Modal */}
      {selectedStill && (
        <StillLightboxModal
          item={selectedStill}
          onClose={() => {
            setSelectedStill(null);
            setActiveParentProject(null);
          }}
          onBack={
            activeParentProject
              ? () => {
                  setSelectedStill(null);
                  setSelectedProject(activeParentProject);
                }
              : undefined
          }
          onDelete={handleDeleteItem}
          onEdit={handleOpenEdit}
        />
      )}

      {/* 6. Film Video Player Modal */}
      {selectedFilm && (
        <FilmPlayerModal
          item={selectedFilm}
          onClose={() => {
            setSelectedFilm(null);
            setActiveParentProject(null);
          }}
          onBack={
            activeParentProject
              ? () => {
                  setSelectedFilm(null);
                  setSelectedProject(activeParentProject);
                }
              : undefined
          }
          onDelete={handleDeleteItem}
          onEdit={handleOpenEdit}
        />
      )}

      {/* 7. Project Exploration Modal */}
      {selectedProject && (
        <ProjectExplorerModal
          project={selectedProject}
          onClose={() => {
            setSelectedProject(null);
            setActiveParentProject(null);
          }}
          onSelectStill={(still) => {
            setActiveParentProject(selectedProject);
            setSelectedProject(null);
            setSelectedStill(still);
          }}
          onSelectFilm={(film) => {
            setActiveParentProject(selectedProject);
            setSelectedProject(null);
            setSelectedFilm(film);
          }}
          onDeleteAsset={handleDeleteProjectAsset}
          onEditProject={handleOpenEdit}
          onEditAsset={handleOpenEdit}
        />
      )}

      {/* 8. Edit Asset / Project Dialog */}
      <EditAssetDialog
        isOpen={isEditingItem}
        onClose={() => {
          setIsEditingItem(false);
          setItemToEdit(null);
        }}
        item={itemToEdit}
        workspaceId={workspace.id}
        onSave={handleSaveEdit}
        isSaving={isSavingItem}
        dialogTitle={itemToEdit?.type === "project" ? "EDIT PROJECT" : "EDIT ASSET"}
      />

      {/* 9. Workspace Trash Bin Dialog */}
      <TrashBinDialog
        isOpen={isTrashOpen}
        onOpenChange={setIsTrashOpen}
        workspaceId={workspace.id}
        workspaceSlug={workspace.slug}
        onItemRestored={() => {
          router.refresh();
        }}
      />
      </div>
    </TooltipProvider>
  );
}

