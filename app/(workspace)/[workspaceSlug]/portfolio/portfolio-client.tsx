"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  PortfolioAppearance,
  PortfolioExperience,
  PortfolioHeroCover,
  SocialLinks,
  PortfolioItem,
  ProjectAsset,
} from "@/core/entities/portfolio";
import {
  toggleFeaturedItemAction,
  deletePortfolioItemAction,
  deleteAssetAction,
  updateAssetAction,
  updatePortfolioAction,
} from "@/app/actions/portfolio";
import {
  useWorkspacePortfolio,
  applyAddPortfolioItem,
  applyRemovePortfolioItem,
  applyRemoveProjectAsset,
  applyUpdatePortfolioItem,
  applyToggleFeaturedItem,
  deriveAvailableCoverAssets,
} from "@/lib/swr";
import { EditAssetDialog, type EditableAssetItem } from "@/components/workspaces/edit-asset-dialog";
import { useModals } from "@/components/modals";
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
import {
  directUploadMediaFile,
  formatBytes,
} from "@/components/workspaces/video-uploader";
import { createUploadProgressToast } from "@/lib/upload-toast";

export type { ProjectAsset, PortfolioItem };


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
  availableAssets: passedAvailableAssets,
}: PortfolioClientProps) {
  const {
    items: projects,
    featuredIds,
    mutate,
  } = useWorkspacePortfolio(workspace.slug, {
    items: initialProjects,
    featuredIds: initialFeaturedIds,
  });

  const { setShowTrashModal } = useModals();
  const [isPending, startTransition] = useTransition();

  const derivedAvailableAssets = React.useMemo(
    () => deriveAvailableCoverAssets(projects),
    [projects]
  );
  const availableAssets =
    derivedAvailableAssets.length > 0
      ? derivedAvailableAssets
      : (passedAvailableAssets || []);

  // 1. Hero Cover Asset Configuration
  const initialHeroCover: PortfolioHeroCover = portfolio.appearance?.heroCover
    ? {
        ...portfolio.appearance.heroCover,
        showHeroText: portfolio.appearance.heroCover.showHeroText ?? true,
      }
    : {
        assetId: availableAssets[0]?.id || null,
        type: availableAssets[0]?.type || "video",
        mediaUrl: portfolio.coverAssetUrl || availableAssets[0]?.url || "",
        thumbnailUrl: portfolio.coverAssetUrl || availableAssets[0]?.thumbnailUrl || "",
        title: portfolio.title || workspace.brandName,
        category: availableAssets[0]?.category || "Featured Film",
        aspectRatio: "21:9",
        overlayOpacity: 50,
        videoBehavior: "ambient_loop",
        showHeroText: true,
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

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleProjectCreated = (newItem: PortfolioItem) => {
    mutate(
      (current) => (current ? applyAddPortfolioItem(current, newItem) : current),
      { revalidate: true }
    );
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

  const handleCustomCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = "";

    const isVid = file.type.startsWith("video/");

    if (isVid) {
      // 1. Direct Cloudflare Stream / R2 upload for video
      const fileBaseName = file.name.replace(/\.[^/.]+$/, "");
      const uploadToast = createUploadProgressToast();
      uploadToast.start({
        title: `Uploading Hero Video: ${fileBaseName}`,
        fileName: file.name,
        fileSize: formatBytes(file.size),
        percentage: 0,
        statusText: "Initiating Cloudflare upload...",
      });

      try {
        setIsUploadingMedia(true);
        setUploadProgress(0);

        const result = await directUploadMediaFile({
          workspaceId: workspace.id,
          projectId: "", // standalone asset
          file,
          title: fileBaseName,
          assetType: "video",
          onProgress: (percent, loaded, total) => {
            setUploadProgress(percent);
            uploadToast.update({
              loadedBytes: loaded,
              totalBytes: total,
              percentage: percent,
              statusText:
                percent < 100
                  ? "Uploading directly to Cloudflare..."
                  : "Finalizing video records...",
            });
          },
          onStatusChange: (statusText) => {
            uploadToast.update({ statusText });
          },
        });

        uploadToast.success("Hero video uploaded to Cloudflare!");

        const mediaUrl =
          result.assetVersion?.rawFileUrl ||
          result.assetVersion?.hlsManifestUrl ||
          "";
        const thumbnailUrl =
          result.assetVersion?.thumbnailUrl ||
          result.assetVersion?.rawFileUrl ||
          "";

        const updatedCover: PortfolioHeroCover = {
          ...heroCover,
          assetId: result.asset.id,
          type: "video",
          mediaUrl,
          thumbnailUrl,
          title: result.asset.title || fileBaseName,
          category: "Featured Film",
          videoBehavior: "ambient_loop",
        };

        setHeroCover(updatedCover);

        // Add to workspace portfolio showcase projects
        const newItem: PortfolioItem = {
          id: result.asset.id,
          title: result.asset.title || fileBaseName,
          category: "Featured Film",
          type: "film",
          assetCount: 1,
          thumbnailUrl,
          mediaUrl,
        };
        handleProjectCreated(newItem);
        toast.success('Hero video uploaded & ready! Click "Save Hero Banner" to publish.');
      } catch (err: any) {
        uploadToast.error(err.message || "Failed to upload video to Cloudflare");
        toast.error(err.message || "Failed to upload video to Cloudflare");
      } finally {
        setIsUploadingMedia(false);
        setUploadProgress(0);
      }
    } else {
      // 2. Image: open crop editor first so the filmmaker can frame the banner perfectly
      const objectUrl = URL.createObjectURL(file);
      setCropEditor({
        isOpen: true,
        imageSrc: objectUrl,
        fileName: file.name,
      });
    }
  };

  const handleApplyCropResult = async (result: ImageCropResult) => {
    // Revoke objectUrl to avoid memory leaks
    if (cropEditor.imageSrc && cropEditor.imageSrc.startsWith("blob:")) {
      URL.revokeObjectURL(cropEditor.imageSrc);
    }
    const currentFileName = cropEditor.fileName || "custom-hero-cover.jpg";
    setCropEditor({
      isOpen: false,
      imageSrc: null,
      fileName: "custom-hero-cover.jpg",
    });

    try {
      setIsUploadingMedia(true);
      setUploadProgress(0);

      const imageFile = result.file;
      const fileBaseName = currentFileName.replace(/\.[^/.]+$/, "");
      const uploadToast = createUploadProgressToast();
      uploadToast.start({
        title: `Uploading Hero Image: ${fileBaseName}`,
        fileName: currentFileName,
        fileSize: formatBytes(imageFile.size),
        percentage: 0,
        statusText: "Initiating Cloudflare upload...",
      });

      const uploadResult = await directUploadMediaFile({
        workspaceId: workspace.id,
        projectId: "", // standalone asset
        file: imageFile,
        title: fileBaseName,
        assetType: "photo_gallery",
        onProgress: (percent, loaded, total) => {
          setUploadProgress(percent);
          uploadToast.update({
            loadedBytes: loaded,
            totalBytes: total,
            percentage: percent,
            statusText:
              percent < 100
                ? "Uploading directly to Cloudflare..."
                : "Finalizing image records...",
          });
        },
        onStatusChange: (statusText) => {
          uploadToast.update({ statusText });
        },
      });

      uploadToast.success("Hero image uploaded to Cloudflare!");

      const mediaUrl =
        uploadResult.assetVersion?.rawFileUrl ||
        uploadResult.assetVersion?.thumbnailUrl ||
        "";
      const thumbnailUrl =
        uploadResult.assetVersion?.thumbnailUrl ||
        uploadResult.assetVersion?.rawFileUrl ||
        "";

      const updated: PortfolioHeroCover = {
        ...heroCover,
        assetId: uploadResult.asset.id,
        type: "still",
        mediaUrl,
        thumbnailUrl,
        title: uploadResult.asset.title || fileBaseName,
        category: "Featured Still",
      };

      setHeroCover(updated);

      // Add to workspace portfolio showcase projects
      const newItem: PortfolioItem = {
        id: uploadResult.asset.id,
        title: uploadResult.asset.title || fileBaseName,
        category: "Photo Still",
        type: "still",
        assetCount: 1,
        thumbnailUrl,
        mediaUrl,
      };
      handleProjectCreated(newItem);
      toast.success('Hero image uploaded & ready! Click "Save Hero Banner" to publish.');
    } catch (err: any) {
      toast.error(err.message || "Failed to upload hero image to Cloudflare");
    } finally {
      setIsUploadingMedia(false);
      setUploadProgress(0);
    }
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
      showHeroText: heroCover.showHeroText ?? true,
    };

    setHeroCover(updatedCover);
    toast.success(`Set "${item.title}" as Hero Banner! Click "Save Hero Banner" to publish.`);
  };

  const selectedCoverItem = projects.find((p) => p.id === heroCover.assetId);

  const handleToggleFeature = async (item: PortfolioItem) => {
    const isCurrentlyFeatured = featuredIds.includes(item.id);

    try {
      await mutate(
        async (current) => {
          const itemType = item.type === "project" ? "project" : "asset";
          const res = await toggleFeaturedItemAction(
            portfolio.id,
            item.id,
            itemType,
            !isCurrentlyFeatured
          );
          if (!res.success) {
            throw new Error(res.error || "Failed to update featured reel.");
          }
          showFlash(
            isCurrentlyFeatured
              ? `Removed "${item.title}" from featured reel`
              : `Pinned "${item.title}" to featured reel`
          );
          return current ? applyToggleFeaturedItem(current, item.id) : current;
        },
        {
          optimisticData: (current) => (current ? applyToggleFeaturedItem(current, item.id) : current),
          rollbackOnError: true,
          populateCache: true,
          revalidate: true,
        }
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update featured reel.");
    }
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

  const handleDeleteItem = async (item: PortfolioItem | ProjectAsset) => {
    const itemType =
      "type" in item && item.type === "project"
        ? "project"
        : item.type === "still"
        ? "still"
        : "film";

    try {
      await mutate(
        async (current) => {
          const res = await deletePortfolioItemAction(
            item.id,
            itemType,
            portfolio.id,
            workspace.slug
          );
          if (!res.success) {
            throw new Error(("error" in res && res.error) ? String(res.error) : "Failed to delete item");
          }
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
          return current ? applyRemovePortfolioItem(current, item.id) : current;
        },
        {
          optimisticData: (current) => (current ? applyRemovePortfolioItem(current, item.id) : current),
          rollbackOnError: true,
          populateCache: true,
          revalidate: true,
        }
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to delete item");
    }
  };

  const handleDeleteProjectAsset = async (asset: ProjectAsset) => {
    if (!selectedProject) return;
    const projectId = selectedProject.id;

    try {
      await mutate(
        async (current) => {
          const res = await deleteAssetAction(asset.id, {
            portfolioId: portfolio.id,
            workspaceSlug: workspace.slug,
            projectId,
          });
          if (!res.success) {
            throw new Error(res.error || "Failed to delete asset.");
          }
          showFlash(`Moved "${asset.title}" to Trash`);
          setSelectedProject((prev) => {
            if (!prev || !prev.projectAssets) return prev;
            const updatedAssets = prev.projectAssets.filter((a) => a.id !== asset.id);
            return {
              ...prev,
              assetCount: updatedAssets.length,
              projectAssets: updatedAssets,
            };
          });
          return current ? applyRemoveProjectAsset(current, projectId, asset.id) : current;
        },
        {
          optimisticData: (current) => (current ? applyRemoveProjectAsset(current, projectId, asset.id) : current),
          rollbackOnError: true,
          populateCache: true,
          revalidate: true,
        }
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to move asset to trash");
    }
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
        mutate(
          (current) => (current ? applyUpdatePortfolioItem(current, updated) : current),
          { revalidate: true }
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
          isUploadingMedia={isUploadingMedia}
          uploadProgress={uploadProgress}
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
          onOpenTrash={() => setShowTrashModal(true)}
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
          showVersions={false}
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

      {/* 10. Interactive Cover Image Crop & Edit Modal */}
      <ImageCropEditorDialog
        isOpen={cropEditor.isOpen}
        onClose={() => {
          if (cropEditor.imageSrc && cropEditor.imageSrc.startsWith("blob:")) {
            URL.revokeObjectURL(cropEditor.imageSrc);
          }
          setCropEditor({ isOpen: false, imageSrc: null, fileName: "custom-cover.jpg" });
        }}
        imageSrc={cropEditor.imageSrc}
        title="EDIT & CROP COVER BANNER"
        subtitle="Adjust cover banner framing and aspect ratio."
        defaultAspectRatio={
          heroCover.aspectRatio === "16:9" || heroCover.aspectRatio === "3:1"
            ? heroCover.aspectRatio
            : "2.39:1"
        }
        aspectRatioOptions={["2.39:1", "16:9", "3:1"]}
        outputFileName={cropEditor.fileName}
        onApply={handleApplyCropResult}
      />
      </div>
    </TooltipProvider>
  );
}

