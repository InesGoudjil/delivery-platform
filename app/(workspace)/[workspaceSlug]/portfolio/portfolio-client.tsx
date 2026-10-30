"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PortfolioAppearance, PortfolioExperience, PortfolioHeroCover, SocialLinks } from "@/core/entities/portfolio";
import {
  toggleFeaturedItemAction,
  deletePortfolioItemAction,
  deleteAssetAction,
  updateAssetAction,
  updatePortfolioAction,
} from "@/app/actions/portfolio";
import { EditAssetDialog, type EditableAssetItem } from "@/components/workspaces/edit-asset-dialog";
import { TrashBinDialog } from "@/components/workspaces/trash-bin-dialog";
import { PortfolioHero } from "./_components/portfolio-hero";
import { CoverBannerSection } from "./_components/cover-banner-section";
import { AppearanceToolbar } from "./_components/appearance-toolbar";
import { ShowcaseGrid } from "./_components/showcase-grid";
import {
  AssetLightboxModal,
  ProjectExplorerModal,
} from "./_components/portfolio-modals";
// import { ExperienceSection } from "./_components/experience-section";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SelectableCoverAsset } from "@/lib/portfolio-data";
import {
  ImageCropEditorDialog,
  ImageCropResult,
} from "@/components/ui/image-crop-editor-dialog";



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
    logoUrl?: string | null;
    accentColor?: string | null;
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
  features?: any;
  availableAssets: SelectableCoverAsset[];
}

export function PortfolioClient({
  workspace,
  portfolio,
  initialProjects,
  initialFeaturedIds,
  features,
  availableAssets,
}: PortfolioClientProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<PortfolioItem[]>(initialProjects);
  const [featuredIds, setFeaturedIds] = useState<string[]>(initialFeaturedIds);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // 1. Hero Cover Asset Configuration
  const initialHeroCover: PortfolioHeroCover = portfolio.appearance?.heroCover || {
    assetId: availableAssets[0]?.id || null,
    type: availableAssets[0]?.type || "video",
    mediaUrl: portfolio.coverAssetUrl || availableAssets[0]?.url || "",
    thumbnailUrl: portfolio.coverAssetUrl || availableAssets[0]?.thumbnailUrl || "",
    title: portfolio.title || workspace.brandName,
    category: availableAssets[0]?.category || "Featured Film",
    aspectRatio: "21:9",
    overlayOpacity: 50,
    videoBehavior: "ambient_loop",
  };

  const [heroCover, setHeroCover] = useState<PortfolioHeroCover>(initialHeroCover);
  const [savedHeroCover, setSavedHeroCover] = useState<PortfolioHeroCover>(initialHeroCover);
  const [isSavingHero, setIsSavingHero] = useState(false);

  const isHeroDirty = React.useMemo(() => {
    return JSON.stringify(heroCover) !== JSON.stringify(savedHeroCover);
  }, [heroCover, savedHeroCover]);

  const handleSaveHeroCover = async (updatedHero?: PortfolioHeroCover) => {
    const toSave = updatedHero || heroCover;
    setIsSavingHero(true);
    try {
      const res = await updatePortfolioAction(portfolio.id, {
        appearance: {
          ...appearance,
          heroCover: toSave,
        },
        coverAssetUrl: toSave.thumbnailUrl || toSave.mediaUrl,
      });

      if (res.success) {
        setSavedHeroCover(toSave);
        toast.success("Cover hero banner saved live!");
      } else {
        toast.error(res.error || "Failed to save hero banner");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save hero banner");
    } finally {
      setIsSavingHero(false);
    }
  };

  // Interactive Image Crop / Edit Dialog State for Custom Hero Cover
  const [cropEditor, setCropEditor] = useState<{
    isOpen: boolean;
    imageSrc: string | null;
    fileName: string;
  }>({
    isOpen: false,
    imageSrc: null,
    fileName: "custom-cover.jpg",
  });

  const handleCustomCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = "";

    const objectUrl = URL.createObjectURL(file);
    const isVid = file.type.startsWith("video/");

    if (isVid) {
      const updatedCover: PortfolioHeroCover = {
        ...heroCover,
        assetId: null,
        type: "video",
        mediaUrl: objectUrl,
        thumbnailUrl: objectUrl,
        title: file.name.replace(/\.[^/.]+$/, ""),
        category: "Featured Film",
      };
      setHeroCover(updatedCover);
      toast.success("Video preview loaded as cover!");
    } else {
      setCropEditor({
        isOpen: true,
        imageSrc: objectUrl,
        fileName: file.name,
      });
    }
  };

  const handleApplyCropResult = (result: ImageCropResult) => {
    const updated: PortfolioHeroCover = {
      ...heroCover,
      assetId: null,
      type: "still",
      mediaUrl: result.dataUrl,
      thumbnailUrl: result.dataUrl,
    };
    setHeroCover(updated);
    toast.success("Cover banner image updated!");
  };

  // Direct Set-as-Hero handler from Showcase Grid
  const handleSetAsHero = (item: PortfolioItem) => {
    const isVid = item.type === "film" || item.type === "project";
    const media = item.mediaUrl || item.thumbnailUrl;
    const thumb = item.thumbnailUrl;

    const updatedCover: PortfolioHeroCover = {
      assetId: item.id,
      type: isVid ? "video" : "still",
      mediaUrl: media,
      thumbnailUrl: thumb,
      title: item.title,
      category: item.category || (isVid ? "Featured Film" : "Featured Still"),
      aspectRatio: heroCover.aspectRatio || "asset",
      overlayOpacity: heroCover.overlayOpacity ?? 50,
      videoBehavior: "ambient_loop",
    };

    setHeroCover(updatedCover);
    toast.success(`Set "${item.title}" as Hero Banner! Click "Save Hero Banner" to publish.`);
  };

  const selectedCoverItem = projects.find((p) => p.id === heroCover.assetId);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    setFeaturedIds(initialFeaturedIds);
  }, [initialFeaturedIds]);

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
    router.refresh();
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
        setSelectedProject((prev) => {
          if (!prev || !prev.projectAssets) return prev;
          const updatedAssets = prev.projectAssets.filter((a) => a.id !== asset.id);
          return {
            ...prev,
            assetCount: updatedAssets.length,
            projectAssets: updatedAssets,
          };
        });
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
      <div className="w-full space-y-6 animate-in fade-in duration-200">
        {/* 1. Header & Modals */}
        <PortfolioHero
          workspace={workspace}
          portfolio={portfolio}
          onProjectCreated={handleProjectCreated}
          showFlash={showFlash}
          features={features}
          projectsCount={projects.length}
        />

        {/* 2. Appearance Controls Card */}
        <AppearanceToolbar
          portfolioId={portfolio.id}
          initialAppearance={appearance}
          onAppearanceChange={setAppearance}
          showFlash={showFlash}
        />

        {/* 3. Cover Banner & Showcase Hero (Customization placed after Appearance Toolbar) */}
        <CoverBannerSection
          heroCover={heroCover}
          onHeroCoverChange={setHeroCover}
          brandName={workspace.brandName}
          handle={workspace.slug}
          accent={workspace.accentColor || "#F5551D"}
          logoUrl={workspace.logoUrl}
          onCustomUpload={handleCustomCoverUpload}
          onSaveHero={() => handleSaveHeroCover(heroCover)}
          isSavingHero={isSavingHero}
          isHeroDirty={isHeroDirty}
          selectedAssetRatio={selectedCoverItem?.aspectRatio}
        />

        {/* 4. Showcase Work Grid (with direct Set as Hero capability) */}
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
          heroAssetId={heroCover.assetId}
          onSetAsHero={handleSetAsHero}
        />

      {/* 6. Universal Asset Lightbox Modal (Stills & Films) */}
      {(selectedStill || selectedFilm) && (
        <AssetLightboxModal
          activeItem={selectedStill || selectedFilm}
          onClose={() => {
            setSelectedStill(null);
            setSelectedFilm(null);
            setActiveParentProject(null);
          }}
          onBack={
            activeParentProject
              ? () => {
                  setSelectedStill(null);
                  setSelectedFilm(null);
                  setSelectedProject(activeParentProject);
                }
              : undefined
          }
          onDeleteAsset={handleDeleteItem}
          onEditAsset={handleOpenEdit}
          showFeedback={false}
          showApproval={false}
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

      {/* 10. Interactive Cover Image Crop & Edit Modal */}
      <ImageCropEditorDialog
        isOpen={cropEditor.isOpen}
        onClose={() => setCropEditor((prev) => ({ ...prev, isOpen: false }))}
        imageSrc={cropEditor.imageSrc}
        title="EDIT & CROP COVER BANNER"
        subtitle="Adjust cover banner framing and aspect ratio."
        defaultAspectRatio="16:9"
        aspectRatioOptions={["16:9", "3:1", "2.39:1"]}
        outputFileName={cropEditor.fileName}
        onApply={handleApplyCropResult}
      />
      </div>
    </TooltipProvider>
  );
}

