"use client";

import { useState, useOptimistic, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AssetMultiUploader } from "@/components/workspaces/asset-multi-uploader";
import {
  approveCutAction,
  archiveDeliveryAction,
  toggleAssetApprovalAction,
  deleteAssetAction,
  deleteDeliveryAction,
  updateAssetAction,
  updateDeliveryAppearanceAction,
  loadMoreDeliveryAssetsAction,
} from "@/app/actions/deliveries";
import {
  restoreDeliveryFromSiloAction,
  checkDeliverySiloStatusAction,
} from "@/app/actions/silo";
import { resolveThumbnailUrl, resolveMediaUrl } from "@/lib/media";
import { EditAssetDialog, type EditableAssetItem } from "@/components/workspaces/edit-asset-dialog";
import { TrashBinDialog } from "@/components/workspaces/trash-bin-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";

// Modular Subcomponents
import { DeliveryHeroBanner } from "./_components/delivery-hero-banner";
import { DeliveryProgressBar } from "./_components/delivery-progress-bar";
import { DeliveryAppearanceCard } from "./_components/delivery-appearance-card";
import { DeliveryAssetsGallery } from "./_components/delivery-assets-gallery";
import { DeliveryProjectDetailsCard } from "./_components/delivery-project-details-card";
import { ShareLinkDialog } from "./_components/share-link-dialog";
import { EditDeliveryDialog } from "./_components/edit-delivery-dialog";
import { PublishPortfolioDialog } from "./_components/publish-portfolio-dialog";
import { FloatingUploadProgress } from "./_components/floating-upload-progress";
import { AssetLightboxModal } from "./_components/asset-lightbox-modal";
import { DownloadPackageModal } from "@/components/workspaces/download-package-modal";

// Shared Types
import type {
  AssetVersionItem,
  FeedbackItem,
  GalleryItem,
  AppearanceSettings,
  UploadProgressState,
  DeliveryDetailClientProps,
} from "./_components/types";

// Re-export types for backward-compatibility with page.tsx
export type {
  AssetVersionItem,
  FeedbackItem,
  GalleryItem,
  AppearanceSettings,
  UploadProgressState,
  DeliveryDetailClientProps,
};

type ActiveDialog = "share" | "edit-delivery" | "publish" | "trash" | "download-package" | null;

type GalleryOptimisticAction =
  | { type: "approve-all" }
  | { type: "toggle-approval"; id: string; isApproved: boolean }
  | { type: "delete"; id: string }
  | {
      type: "update";
      item: { id: string; title: string; aspectRatio?: string; src?: string };
    }
  | {
      type: "upload-complete";
      uploadedAsset: any;
      uploadedVersion: any;
      durationStr: string;
      resolvedSrc: string;
      isPhoto: boolean;
    }
  | {
      type: "add-feedback";
      itemId: string;
      feedback: FeedbackItem;
    };

export function DeliveryDetailClient({
  workspace,
  portfolio,
  project,
  assets,
  initialTotalAssetsCount,
  initialApprovedCount,
  initialHasMore = false,
  initialFeedback,
  features,
}: DeliveryDetailClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isSavingAsset, startSavingAsset] = useTransition();

  // 1. Consolidated Dialog Discriminator (Replaces 4 boolean useStates)
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);

  // 2. Asset Editing State (Replaces isOpen + item duplication)
  const [editingAssetItem, setEditingAssetItem] = useState<EditableAssetItem | null>(null);

  // 3. Ephemeral Uploading State
  const [showUploader, setShowUploader] = useState(false);
  const [showAssetAddedBadge, setShowAssetAddedBadge] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(null);

  // 4. Initial Gallery Items Derivation from Server Props
  const initialItems: GalleryItem[] = useMemo(() => {
    return assets && assets.length > 0
      ? assets.map((a) => {
          const activeVer = a.activeVersion || a.versions[0];
          const isPhoto = a.type === "still" || a.type === "photo" || a.type === "photo_gallery";
          let durationStr = "STILL";
          if (!isPhoto) {
            if (activeVer?.durationSeconds) {
              const mins = Math.floor(activeVer.durationSeconds / 60);
              const secs = Math.round(activeVer.durationSeconds % 60);
              durationStr = `${mins.toString().padStart(2, "0")}:${secs
                .toString()
                .padStart(2, "0")}`;
            } else {
              durationStr = "00:45";
            }
          }
          return {
            id: a.id,
            versionId: activeVer?.id,
            versionNumber: activeVer?.versionNumber || 1,
            totalVersions: a.versions?.length || 1,
            versions: a.versions || [],
            title: a.title,
            type: isPhoto ? "photo" : "video",
            aspectRatio: a.aspectRatio || "16:9",
            duration: durationStr,
            src:
              resolveThumbnailUrl(activeVer?.thumbnailUrl, activeVer?.rawFileUrl, isPhoto) || "",
            status: a.isApproved ? "approved" : "review",
            rawUrl: resolveMediaUrl(activeVer?.rawFileUrl),
            downloadUrl: resolveMediaUrl(activeVer?.downloadUrl || activeVer?.rawFileUrl),
            fileSizeBytes: activeVer?.fileSizeBytes || 0,
            hlsUrl: resolveMediaUrl(activeVer?.hlsManifestUrl),
            videoUrl:
              resolveMediaUrl(activeVer?.hlsManifestUrl) ||
              resolveMediaUrl(activeVer?.rawFileUrl) ||
              (isPhoto ? undefined : "https://files.vidstack.io/sprite-fight/hls/stream.m3u8"),
            feedback: a.feedback || [],
          };
        })
      : [];
  }, [assets]);

  // Master loaded items state that persists across chunk loads
  const [loadedItems, setLoadedItems] = useState<GalleryItem[]>(initialItems);

  useEffect(() => {
    setLoadedItems(initialItems);
  }, [initialItems]);

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalAssetsCountState, setTotalAssetsCountState] = useState(
    initialTotalAssetsCount ?? initialItems.length
  );
  const [approvedCountState, setApprovedCountState] = useState(
    initialApprovedCount ?? initialItems.filter((i) => i.status === "approved").length
  );

  // 5. React 19 Optimistic Gallery (Eliminates manual state duplication and stale router.refresh() bugs)
  const [items, setOptimisticItems] = useOptimistic(
    loadedItems,
    (prev: GalleryItem[], action: GalleryOptimisticAction): GalleryItem[] => {
      switch (action.type) {
        case "approve-all":
          return prev.map((item) => ({ ...item, status: "approved" as const }));
        case "toggle-approval":
          return prev.map((item) =>
            item.id === action.id
              ? { ...item, status: action.isApproved ? "approved" : "review" }
              : item
          );
        case "delete":
          return prev.filter((item) => item.id !== action.id);
        case "update":
          return prev.map((i) =>
            i.id === action.item.id
              ? {
                  ...i,
                  title: action.item.title,
                  aspectRatio: action.item.aspectRatio || i.aspectRatio,
                  src: action.item.src || i.src,
                }
              : i
          );
        case "upload-complete": {
          const { uploadedAsset, uploadedVersion, durationStr, resolvedSrc, isPhoto } = action;
          const existingIdx = prev.findIndex((item) => item.id === uploadedAsset.id);
          if (existingIdx >= 0) {
            const existing = prev[existingIdx];
            const newTotalVersions = (existing.totalVersions || 1) + 1;
            const newVersionNumber = uploadedVersion?.versionNumber || newTotalVersions;
            const updatedVersions = uploadedVersion
              ? [...(existing.versions || []).filter((v) => v.id !== uploadedVersion.id), uploadedVersion]
              : existing.versions || [];
            const updatedItem: GalleryItem = {
              ...existing,
              title: uploadedAsset.title || existing.title,
              versionId: uploadedVersion?.id || existing.versionId,
              versionNumber: newVersionNumber,
              totalVersions: newTotalVersions,
              versions: updatedVersions,
              src: resolvedSrc,
              rawUrl: uploadedVersion?.rawFileUrl || existing.rawUrl,
              hlsUrl: uploadedVersion?.hlsManifestUrl || existing.hlsUrl,
              videoUrl:
                uploadedVersion?.hlsManifestUrl ||
                uploadedVersion?.rawFileUrl ||
                existing.videoUrl,
              duration: durationStr,
            };
            const next = [...prev];
            next[existingIdx] = updatedItem;
            return next;
          } else {
            const newItem: GalleryItem = {
              id: uploadedAsset.id,
              versionId: uploadedVersion?.id,
              versionNumber: uploadedVersion?.versionNumber || 1,
              totalVersions: 1,
              title: uploadedAsset.title || "Untitled Asset",
              type: isPhoto ? "photo" : "video",
              aspectRatio: uploadedAsset.aspectRatio || "16:9",
              duration: durationStr,
              src: resolvedSrc,
              status: "review",
              rawUrl: uploadedVersion?.rawFileUrl,
              hlsUrl: uploadedVersion?.hlsManifestUrl,
              videoUrl:
                uploadedVersion?.hlsManifestUrl ||
                uploadedVersion?.rawFileUrl ||
                (isPhoto ? undefined : "https://files.vidstack.io/sprite-fight/hls/stream.m3u8"),
            };
            return [newItem, ...prev];
          }
        }
        case "add-feedback":
          return prev.map((item) =>
            item.id === action.itemId
              ? {
                  ...item,
                  feedback: [...(item.feedback || []), action.feedback],
                }
              : item
          );
        default:
          return prev;
      }
    }
  );

  // 6. Project Metadata Object (Consolidates separate string states)
  const [projectMeta, setProjectMeta] = useState({
    title: project.title || "Boxing Event",
    clientName: project.clientName || "Boxing Event",
    description:
      project.description ||
      "A cinematic boxing project featuring films and stills captured across the event.",
    status: project.status || "draft",
    siloStatus: (project as any).siloStatus || (project.status === "archived" ? "archived" : null),
    siloTier: (project as any).siloRestoreTier || "Bulk",
  });
  const [isSiloPending, setIsSiloPending] = useState(false);

  // 7. Cover Thumbnail (Derived with optional custom override)
  const [customCoverUrl, setCustomCoverUrl] = useState<string | null>(null);
  const coverThumbnailUrl = customCoverUrl || items[0]?.src || "";

  // 8. Appearance Settings State
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    cardSize: project.appearance?.cardSize || "M",
    aspectRatioSetting: project.appearance?.aspectRatioSetting || "masonry",
    thumbnailScale: project.appearance?.thumbnailScale || "Fill",
    showCardInfo: project.appearance?.showCardInfo ?? true,
    watermarkMedia: project.appearance?.watermarkMedia ?? true,
  });

  // 9. Lightbox ID with Browser History Sync (Supports Back button and Deep Linking)
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);

  useEffect(() => {
    const syncWithUrl = () => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      setActiveAssetId(params.get("asset"));
    };
    syncWithUrl();
    window.addEventListener("popstate", syncWithUrl);
    return () => window.removeEventListener("popstate", syncWithUrl);
  }, []);

  const handleOpenLightbox = (item: GalleryItem) => {
    setActiveAssetId(item.id);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("asset", item.id);
      window.history.pushState(null, "", url.toString());
    }
  };

  const handleCloseLightbox = () => {
    setActiveAssetId(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("asset");
      window.history.pushState(null, "", url.pathname + (url.search ? url.search : ""));
    }
  };

  // Derived active item (Eliminates parallel activeItem state updates)
  const activeItem = useMemo(() => {
    if (!activeAssetId) return null;
    return items.find((i) => i.id === activeAssetId) || null;
  }, [items, activeAssetId]);

  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>(initialFeedback);
  const shareUrl = `/deliver/${project.shareToken}`;

  const triggerToast = (msg: string) => {
    toast.success(msg);
  };

  // ── Actions & Handlers ──────────────────────────────────────────────────────────

  const handleAppearanceChange = async (newSettings: AppearanceSettings) => {
    setAppearance(newSettings);
    const res = await updateDeliveryAppearanceAction(project.id, newSettings, workspace.slug);
    if (res?.success) {
      const layoutLabel =
        newSettings.aspectRatioSetting === "masonry"
          ? "Masonry layout"
          : `${newSettings.aspectRatioSetting} ratio`;
      toast.success("Appearance updated", {
        description: `Saved: ${layoutLabel} (${newSettings.cardSize} cards, ${newSettings.thumbnailScale} scale)`,
      });
    } else if (res?.error) {
      toast.error(res.error || "Failed to update appearance");
    }
  };

  const handleArchive = async () => {
    if (
      confirm(
        "Archive this project to The Silo (AWS S3 Glacier Deep Archive)?\n\n• Frees active workspace storage quota.\n• Master cut files are safely preserved in cold storage.\n• Restoring takes 12–48 hours."
      )
    ) {
      setIsSiloPending(true);
      try {
        const res = await archiveDeliveryAction(project.id);
        if (res.success) {
          setProjectMeta((prev) => ({
            ...prev,
            status: "archived",
            siloStatus: "archived",
          }));
          triggerToast("Project archived to The Silo (active storage freed)");
        } else {
          triggerToast(res.error || "Failed to archive delivery to The Silo");
        }
      } finally {
        setIsSiloPending(false);
      }
    }
  };

  const handleRestoreFromSilo = async (tier: "Bulk" | "Standard" = "Bulk") => {
    const hoursText = tier === "Standard" ? "~12 hours (Standard Tier)" : "24–48 hours (Bulk Tier)";
    if (
      confirm(
        `Thaw this project from AWS S3 Glacier Deep Archive?\n\n• Retrieval SLA: ${hoursText}.\n• Master cut assets will be thawed and restored into your active workspace.\n• You will receive an email once files are ready.`
      )
    ) {
      setIsSiloPending(true);
      try {
        const res = await restoreDeliveryFromSiloAction(project.id, tier);
        if (res.success) {
          setProjectMeta((prev) => ({
            ...prev,
            siloStatus: "restoring",
            siloTier: tier,
          }));
          toast.success("AWS S3 Glacier Thaw Initiated", {
            description: `Restoration in progress (${tier} Tier · ${hoursText}).`,
          });
        } else {
          toast.error(res.error || "Failed to initiate Silo restore");
        }
      } finally {
        setIsSiloPending(false);
      }
    }
  };

  const handleCheckSiloStatus = async () => {
    setIsSiloPending(true);
    try {
      const res = await checkDeliverySiloStatusAction(project.id);
      if (res.success) {
        if (res.isReady) {
          setProjectMeta((prev) => ({
            ...prev,
            status: "approved",
            siloStatus: "restored",
          }));
          toast.success("Project Thawed & Restored!", {
            description: "All master cut assets are back in active storage and ready.",
          });
          router.refresh();
        } else {
          toast.info("Glacier Thaw In Progress", {
            description: `${res.thawedVersionsCount} of ${res.totalVersionsCount} assets ready. AWS Glacier retrieval takes 12–48h.`,
          });
        }
      } else {
        toast.error(res.error || "Failed to check Silo status");
      }
    } finally {
      setIsSiloPending(false);
    }
  };

  const handleApproveCut = async () => {
    startTransition(async () => {
      setOptimisticItems({ type: "approve-all" });
      setLoadedItems((prev) => prev.map((item) => ({ ...item, status: "approved" as const })));
      setApprovedCountState(totalAssetsCountState);
      setProjectMeta((prev) => ({ ...prev, status: "approved" }));
      const res = await approveCutAction(project.id, workspace.brandName || "Filmmaker");
      if (res.success) {
        triggerToast("Delivery room marked as APPROVED");
      } else {
        triggerToast(res.error || "Failed to approve cut");
      }
    });
  };

  const handleToggleAssetApproval = async (itemId: string, currentStatus: string) => {
    const newIsApproved = currentStatus !== "approved";
    startTransition(async () => {
      setOptimisticItems({ type: "toggle-approval", id: itemId, isApproved: newIsApproved });
      setLoadedItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, status: newIsApproved ? "approved" : "review" }
            : item
        )
      );
      setApprovedCountState((prev) => (newIsApproved ? prev + 1 : Math.max(0, prev - 1)));
      const res = await toggleAssetApprovalAction(project.id, itemId, newIsApproved);
      if (res.success) {
        triggerToast(newIsApproved ? "Asset approved" : "Asset marked for revision");
      } else {
        triggerToast(res.error || "Failed to toggle asset approval");
      }
    });
  };

  const handleDeleteAsset = async (item: GalleryItem) => {
    startTransition(async () => {
      setOptimisticItems({ type: "delete", id: item.id });
      setLoadedItems((prev) => prev.filter((i) => i.id !== item.id));
      setTotalAssetsCountState((prev) => Math.max(0, prev - 1));
      if (item.status === "approved") {
        setApprovedCountState((prev) => Math.max(0, prev - 1));
      }
      if (activeAssetId === item.id) {
        handleCloseLightbox();
      }
      try {
        const res = await deleteAssetAction(item.id, {
          deliveryId: project.id,
          workspaceSlug: workspace.slug,
        });
        if (res.success) {
          triggerToast(`Asset "${item.title}" moved to Trash`);
        } else {
          triggerToast(res.error || "Failed to move asset to trash");
        }
      } catch (err: any) {
        triggerToast(err.message || "Failed to move asset to trash");
      }
    });
  };

  const handleDeleteItemFromGallery = async (itemId: string) => {
    const targetItem = items.find((i) => i.id === itemId);
    if (!targetItem) {
      startTransition(() => {
        setOptimisticItems({ type: "delete", id: itemId });
      });
      return;
    }
    await handleDeleteAsset(targetItem);
  };

  const handleOpenEditAsset = (item: GalleryItem) => {
    setEditingAssetItem({
      id: item.id,
      title: item.title,
      thumbnailUrl: item.src,
      aspectRatio: item.aspectRatio,
      type: item.type === "photo" ? "still" : "film",
    });
  };

  const handleSaveAssetEdit = async (updated: {
    id: string;
    title: string;
    description?: string;
    category?: string;
    thumbnailUrl?: string;
    aspectRatio?: string;
  }) => {
    startSavingAsset(async () => {
      setOptimisticItems({
        type: "update",
        item: {
          id: updated.id,
          title: updated.title,
          aspectRatio: updated.aspectRatio,
          src: updated.thumbnailUrl,
        },
      });

      setLoadedItems((prev) =>
        prev.map((i) =>
          i.id === updated.id
            ? {
                ...i,
                title: updated.title,
                aspectRatio: updated.aspectRatio || i.aspectRatio,
                src: updated.thumbnailUrl || i.src,
              }
            : i
        )
      );

      try {
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
            deliveryId: project.id,
            workspaceSlug: workspace.slug,
          }
        );

        if (res.success) {
          triggerToast(`Updated "${updated.title}" successfully`);
          setEditingAssetItem(null);
        } else {
          triggerToast(res.error || "Failed to update asset");
        }
      } catch (err: any) {
        triggerToast(err.message || "Failed to update asset");
      }
    });
  };

  const handleAssetUploaded = (uploadedAsset: any, uploadedVersion?: any) => {
    const isPhoto =
      uploadedAsset.type === "still" ||
      uploadedAsset.type === "photo" ||
      uploadedAsset.type === "photo_gallery";

    let durationStr = "STILL";
    if (!isPhoto) {
      if (uploadedVersion?.durationSeconds) {
        const mins = Math.floor(uploadedVersion.durationSeconds / 60);
        const secs = Math.round(uploadedVersion.durationSeconds % 60);
        durationStr = `${mins.toString().padStart(2, "0")}:${secs
          .toString()
          .padStart(2, "0")}`;
      } else {
        durationStr = "00:45";
      }
    }

    const resolvedSrc =
      resolveThumbnailUrl(
        uploadedVersion?.thumbnailUrl,
        uploadedVersion?.rawFileUrl,
        isPhoto
      ) ||
      resolveMediaUrl(uploadedVersion?.thumbnailUrl || uploadedVersion?.rawFileUrl) ||
      "";

    startTransition(() => {
      setOptimisticItems({
        type: "upload-complete",
        uploadedAsset,
        uploadedVersion,
        durationStr,
        resolvedSrc,
        isPhoto,
      });

      setLoadedItems((prev) => {
        const existingIdx = prev.findIndex((item) => item.id === uploadedAsset.id);
        if (existingIdx >= 0) {
          const existing = prev[existingIdx];
          const newTotalVersions = (existing.totalVersions || 1) + 1;
          const newVersionNumber = uploadedVersion?.versionNumber || newTotalVersions;
          const updatedVersions = uploadedVersion
            ? [...(existing.versions || []).filter((v) => v.id !== uploadedVersion.id), uploadedVersion]
            : existing.versions || [];
          const updatedItem: GalleryItem = {
            ...existing,
            title: uploadedAsset.title || existing.title,
            versionId: uploadedVersion?.id || existing.versionId,
            versionNumber: newVersionNumber,
            totalVersions: newTotalVersions,
            versions: updatedVersions,
            src: resolvedSrc,
            rawUrl: uploadedVersion?.rawFileUrl || existing.rawUrl,
            hlsUrl: uploadedVersion?.hlsManifestUrl || existing.hlsUrl,
            videoUrl:
              uploadedVersion?.hlsManifestUrl ||
              uploadedVersion?.rawFileUrl ||
              existing.videoUrl,
            duration: durationStr,
          };
          const next = [...prev];
          next[existingIdx] = updatedItem;
          return next;
        } else {
          const newItem: GalleryItem = {
            id: uploadedAsset.id,
            versionId: uploadedVersion?.id,
            versionNumber: uploadedVersion?.versionNumber || 1,
            totalVersions: 1,
            title: uploadedAsset.title || "Untitled Asset",
            type: isPhoto ? ("photo" as const) : ("video" as const),
            aspectRatio: uploadedAsset.aspectRatio || "16:9",
            duration: durationStr,
            src: resolvedSrc,
            status: "review",
            rawUrl: uploadedVersion?.rawFileUrl,
            hlsUrl: uploadedVersion?.hlsManifestUrl,
            videoUrl:
              uploadedVersion?.hlsManifestUrl ||
              uploadedVersion?.rawFileUrl ||
              (isPhoto ? undefined : "https://files.vidstack.io/sprite-fight/hls/stream.m3u8"),
          };
          return [newItem, ...prev];
        }
      });

      const isNew = !loadedItems.some((i) => i.id === uploadedAsset.id);
      if (isNew) {
        setTotalAssetsCountState((prev) => prev + 1);
      }
    });

    setShowAssetAddedBadge(true);
    setTimeout(() => setShowAssetAddedBadge(false), 5000);
    triggerToast(
      uploadedVersion?.versionNumber && uploadedVersion.versionNumber > 1
        ? `Added V${uploadedVersion.versionNumber} to "${uploadedAsset.title}"`
        : `Asset "${uploadedAsset.title}" uploaded successfully`
    );
  };

  const handleLoadMore = async (filterTab: "ALL" | "VIDEOS" | "PHOTOS" = "ALL") => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await loadMoreDeliveryAssetsAction({
        deliveryId: project.id,
        page: nextPage,
        pageSize: 12,
        filter: filterTab,
      });

      if (res.success && res.items) {
        setLoadedItems((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const uniqueNew = (res.items || []).filter((i) => !existingIds.has(i.id));
          return [...prev, ...uniqueNew];
        });
        setPage(nextPage);
        setHasMore(Boolean(res.hasMore));
        if (res.totalCount !== undefined) {
          setTotalAssetsCountState(res.totalCount);
        }
        if (res.approvedCount !== undefined) {
          setApprovedCountState(res.approvedCount);
        }
        toast.success(`Loaded ${res.items.length} more deliverables`);
      } else {
        toast.error(res.error || "Failed to load more assets");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load more assets");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const totalAssetsCount = totalAssetsCountState;
  const approvedCount =
    projectMeta.status === "approved"
      ? totalAssetsCount
      : approvedCountState;

  return (
    <TooltipProvider delay={150}>
      <div className="space-y-8">
        {/* 1. Main Hero Banner Container */}
        <DeliveryHeroBanner
          coverThumbnailUrl={coverThumbnailUrl}
          projectTitle={projectMeta.title}
          projectStatus={projectMeta.status}
          totalAssetsCount={totalAssetsCount}
          approvedCount={approvedCount}
          shareUrl={shareUrl}
          clientName={projectMeta.clientName}
          siloStatus={projectMeta.siloStatus}
          siloTier={projectMeta.siloTier}
          onOpenShareDialog={() => setActiveDialog("share")}
          onOpenEditDialog={() => setActiveDialog("edit-delivery")}
          onArchive={handleArchive}
          onRestoreFromSilo={handleRestoreFromSilo}
          onCheckSiloStatus={handleCheckSiloStatus}
          isSiloActionPending={isSiloPending}
          onOpenPublishDialog={() => setActiveDialog("publish")}
          onOpenDownloadDialog={() => setActiveDialog("download-package")}
        />

        {/* 2. Client Approval Progress Bar Container */}
        <DeliveryProgressBar
          approvedCount={approvedCount}
          totalAssetsCount={totalAssetsCount}
          projectStatus={projectMeta.status}
          onApproveCut={handleApproveCut}
          onToggleUploader={() => setShowUploader(!showUploader)}
        />

        {/* 3. Direct Cloudflare Media Uploader Area */}
        {showUploader && (
          <div className="animate-in fade-in slide-in-from-top-3 duration-200">
            <AssetMultiUploader
              workspaceId={workspace.id}
              projectId={project.id}
              existingAssets={items.map((item) => ({
                id: item.id,
                title: item.title,
                type: item.type,
                versionCount: item.totalVersions || 1,
              }))}
              onUploadComplete={(asset, version) => {
                handleAssetUploaded(asset, version);
              }}
              onBatchComplete={(results) => {
                triggerToast(`All ${results.length} assets ready in project gallery`);
                router.refresh();
              }}
              onProgressChange={setUploadProgress}
              onClose={() => setShowUploader(false)}
            />
          </div>
        )}

        {/* 4. Appearance Settings Card */}
        <DeliveryAppearanceCard
          settings={appearance}
          onChangeSettings={handleAppearanceChange}
          canWatermark={features ? Boolean(features.watermark) : false}
          workspaceSlug={workspace.slug}
        />

        {/* 5. Deliverables & PROJECT ASSETS Gallery */}
        <DeliveryAssetsGallery
          items={items}
          appearance={appearance}
          showAssetAddedBadge={showAssetAddedBadge}
          totalCount={totalAssetsCount}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
          onSelectItem={handleOpenLightbox}
          onDeleteAsset={handleDeleteAsset}
          onEditAsset={handleOpenEditAsset}
          onOpenTrash={() => setActiveDialog("trash")}
        />

        {/* 6. Project Details Card */}
        <DeliveryProjectDetailsCard
          projectId={project.id}
          initialTitle={projectMeta.title}
          initialClientName={projectMeta.clientName}
          initialDescription={projectMeta.description}
          onSaved={(newTitle, newClient, newDesc) => {
            setProjectMeta((prev) => ({
              ...prev,
              title: newTitle,
              clientName: newClient,
              description: newDesc,
            }));
          }}
          triggerToast={triggerToast}
        />

        {/* 7. SHARE A LINK Modal Dialog */}
        <ShareLinkDialog
          isOpen={activeDialog === "share"}
          onOpenChange={(open) => setActiveDialog(open ? "share" : null)}
          projectId={project.id}
          shareToken={project.shareToken}
          projectTitle={projectMeta.title}
          initialPasscodeProtected={project.passcodeProtected ?? false}
          initialDownloadAllowed={project.isDownloadAllowed ?? false}
          triggerToast={triggerToast}
          features={features}
          workspaceSlug={workspace.slug}
        />

        {/* 8. EDIT DELIVERY Modal Dialog */}
        <EditDeliveryDialog
          isOpen={activeDialog === "edit-delivery"}
          onOpenChange={(open) => setActiveDialog(open ? "edit-delivery" : null)}
          coverThumbnailUrl={coverThumbnailUrl}
          onChangeCoverUrl={setCustomCoverUrl}
          items={items}
          onDeleteItem={handleDeleteItemFromGallery}
          onEditItem={handleOpenEditAsset}
          onAddAssetClick={() => setShowUploader(true)}
          onSaveChanges={() => {
            setActiveDialog(null);
            triggerToast("Delivery details updated successfully");
          }}
          onDeleteDelivery={async () => {
            if (confirm("Are you sure you want to permanently delete this delivery and all its assets?")) {
              const res = await deleteDeliveryAction(project.id, workspace.slug);
              if (res.success) {
                triggerToast("Delivery deleted successfully");
                setActiveDialog(null);
                router.push(`/${workspace.slug}/deliveries`);
              } else {
                triggerToast(res.error || "Failed to delete delivery");
              }
            }
          }}
        />

        {/* 9. Publish to Portfolio Dialog */}
        <PublishPortfolioDialog
          isOpen={activeDialog === "publish"}
          onOpenChange={(open) => setActiveDialog(open ? "publish" : null)}
          projectId={project.id}
          portfolio={portfolio || null}
          workspaceSlug={workspace.slug}
          projectTitle={projectMeta.title}
          projectDescription={projectMeta.description}
          clientName={projectMeta.clientName}
          triggerToast={triggerToast}
        />

        {/* 10. Floating Upload Info Component */}
        <FloatingUploadProgress
          progress={uploadProgress}
          onDismiss={() => setUploadProgress(null)}
        />

        {/* 11. Lightbox Video Player Modal */}
        <AssetLightboxModal
          activeItem={activeItem}
          onClose={handleCloseLightbox}
          feedbackList={activeItem?.feedback && activeItem.feedback.length > 0 ? activeItem.feedback : feedbackList}
          onAddFeedback={(fb) => {
            setFeedbackList((prev) => [...prev, fb]);
            if (activeItem) {
              startTransition(() => {
                setOptimisticItems({
                  type: "add-feedback",
                  itemId: activeItem.id,
                  feedback: fb,
                });
              });
            }
          }}
          onToggleApproval={handleToggleAssetApproval}
          onDeleteAsset={handleDeleteAsset}
          onEditAsset={handleOpenEditAsset}
          authorName={workspace.brandName || "Filmmaker"}
          triggerToast={triggerToast}
          watermarkMedia={appearance.watermarkMedia}
          watermarkText={workspace.brandName || "STUDIO PREVIEW"}
        />

        {/* 12. Edit Asset Dialog */}
        <EditAssetDialog
          isOpen={Boolean(editingAssetItem)}
          onClose={() => setEditingAssetItem(null)}
          item={editingAssetItem}
          workspaceId={workspace.id}
          onSave={handleSaveAssetEdit}
          isSaving={isSavingAsset}
        />

        {/* 13. Workspace Trash Bin Dialog */}
        <TrashBinDialog
          isOpen={activeDialog === "trash"}
          onOpenChange={(open) => setActiveDialog(open ? "trash" : null)}
          workspaceId={workspace.id}
          workspaceSlug={workspace.slug}
          deliveryId={project.id}
          onItemRestored={() => {
            router.refresh();
          }}
        />

        {/* 14. Master Deliverables Download Package Modal */}
        <DownloadPackageModal
          isOpen={activeDialog === "download-package"}
          onOpenChange={(open) => setActiveDialog(open ? "download-package" : null)}
          projectTitle={projectMeta.title}
          isDownloadAllowed={true}
          brandName={workspace.brandName}
          items={items.map((item) => {
            const activeVer = item.versions?.find((v) => v.isActiveVersion) || item.versions?.[0];
            return {
              id: item.id,
              title: item.title,
              type: item.type,
              versionNumber: item.versionNumber || activeVer?.versionNumber || 1,
              fileSizeBytes: item.fileSizeBytes || activeVer?.fileSizeBytes,
              duration: item.duration,
              aspectRatio: item.aspectRatio,
              thumbnailUrl: item.src,
              downloadUrl: item.downloadUrl || item.rawUrl || "",
              isApproved: item.status === "approved",
            };
          })}
        />
      </div>
    </TooltipProvider>
  );
}
