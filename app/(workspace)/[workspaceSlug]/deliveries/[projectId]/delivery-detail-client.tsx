"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { VideoUploader } from "@/components/workspaces/video-uploader";
import { AssetMultiUploader } from "@/components/workspaces/asset-multi-uploader";
import {
  approveCutAction,
  archiveDeliveryAction,
  toggleAssetApprovalAction,
} from "@/app/actions/deliveries";

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

export function DeliveryDetailClient({
  workspace,
  portfolio,
  project,
  assets,
  initialFeedback,
}: DeliveryDetailClientProps) {
  // Dialog Open States
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);

  // Uploader & Toast State
  const [showUploader, setShowUploader] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Floating Upload Component State
  const [showAssetAddedBadge, setShowAssetAddedBadge] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(null);

  // Gallery Items Initialization
  const initialItems: GalleryItem[] =
    assets && assets.length > 0
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
              activeVer?.thumbnailUrl ||
              activeVer?.rawFileUrl ||
              "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1200&auto=format&fit=crop&q=80",
            status: a.isApproved ? "approved" : "review",
            rawUrl: activeVer?.rawFileUrl,
            hlsUrl: activeVer?.hlsManifestUrl,
            videoUrl:
              activeVer?.hlsManifestUrl ||
              activeVer?.rawFileUrl ||
              (isPhoto ? undefined : "https://files.vidstack.io/sprite-fight/hls/stream.m3u8"),
          };
        })
      : [];

  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(initialItems);
  const [coverThumbnailUrl, setCoverThumbnailUrl] = useState(
    galleryItems[0]?.src ||
      "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1200&auto=format&fit=crop&q=80"
  );

  // Editable Project Details State
  const [projectTitle, setProjectTitle] = useState(project.title || "Boxing Event");
  const [clientName, setClientName] = useState(project.clientName || "Boxing Event");
  const [projectDescription, setProjectDescription] = useState(
    project.description ||
      "A cinematic boxing project featuring films and stills captured across the event."
  );
  const [projectStatus, setProjectStatus] = useState(project.status || "draft");

  // Appearance Settings State
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    cardSize: "M",
    aspectRatioSetting: "masonry",
    thumbnailScale: "Fill",
    showCardInfo: true,
    watermarkMedia: true,
  });

  // Active Lightbox Item & Feedback State
  const [activeItem, setActiveItem] = useState<GalleryItem | null>(null);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>(initialFeedback);

  const shareUrl = `/deliver/${project.shareToken}`;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Actions
  const handleArchive = async () => {
    if (confirm("Are you sure you want to archive this delivery to the Silo?")) {
      const res = await archiveDeliveryAction(project.id);
      if (res.success) {
        setProjectStatus("archived");
        triggerToast("Delivery archived to Silo");
      } else {
        triggerToast(res.error || "Failed to archive delivery");
      }
    }
  };

  const handleApproveCut = async () => {
    const res = await approveCutAction(project.id, workspace.brandName || "Filmmaker");
    if (res.success) {
      setProjectStatus("approved");
      setGalleryItems((prev) =>
        prev.map((item) => ({ ...item, status: "approved" }))
      );
      triggerToast("Delivery room marked as APPROVED");
    } else {
      triggerToast(res.error || "Failed to approve cut");
    }
  };

  const handleToggleAssetApproval = async (itemId: string, currentStatus: string) => {
    const newIsApproved = currentStatus !== "approved";
    const res = await toggleAssetApprovalAction(project.id, itemId, newIsApproved);
    if (res.success) {
      setGalleryItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, status: newIsApproved ? "approved" : "review" }
            : item
        )
      );
      if (activeItem && activeItem.id === itemId) {
        setActiveItem((prev) =>
          prev ? { ...prev, status: newIsApproved ? "approved" : "review" } : null
        );
      }
      triggerToast(newIsApproved ? "Asset approved" : "Asset marked for revision");
    } else {
      triggerToast(res.error || "Failed to toggle asset approval");
    }
  };

  const handleDeleteItemFromGallery = (itemId: string) => {
    setGalleryItems((prev) => prev.filter((item) => item.id !== itemId));
    triggerToast("Asset removed from delivery");
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
      uploadedVersion?.thumbnailUrl ||
      uploadedVersion?.rawFileUrl ||
      "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1200&auto=format&fit=crop&q=80";

    setGalleryItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.id === uploadedAsset.id);
      if (existingIdx >= 0) {
        // Adding a new version to an existing asset!
        const existing = prev[existingIdx];
        const newTotalVersions = (existing.totalVersions || 1) + 1;
        const newVersionNumber = uploadedVersion?.versionNumber || newTotalVersions;
        const updatedItem: GalleryItem = {
          ...existing,
          title: uploadedAsset.title || existing.title,
          versionId: uploadedVersion?.id || existing.versionId,
          versionNumber: newVersionNumber,
          totalVersions: newTotalVersions,
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
        // Brand new asset added to project!
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
    });

    setShowAssetAddedBadge(true);
    setTimeout(() => setShowAssetAddedBadge(false), 5000);
    triggerToast(
      uploadedVersion?.versionNumber && uploadedVersion.versionNumber > 1
        ? `Added V${uploadedVersion.versionNumber} to "${uploadedAsset.title}"`
        : `Asset "${uploadedAsset.title}" uploaded successfully`
    );
  };

  const totalAssetsCount = galleryItems.length;
  const approvedCount =
    projectStatus === "approved"
      ? totalAssetsCount
      : galleryItems.filter((item) => item.status === "approved").length;

  return (
    <div className="space-y-8">
      {/* 1. Main Hero Banner Container */}
      <DeliveryHeroBanner
        coverThumbnailUrl={coverThumbnailUrl}
        projectTitle={projectTitle}
        projectStatus={projectStatus}
        totalAssetsCount={totalAssetsCount}
        approvedCount={approvedCount}
        shareUrl={shareUrl}
        clientName={clientName}
        onOpenShareDialog={() => setIsShareDialogOpen(true)}
        onOpenEditDialog={() => setIsEditDialogOpen(true)}
        onArchive={handleArchive}
        onOpenPublishDialog={() => setIsPublishDialogOpen(true)}
      />

      {/* 2. Client Approval Progress Bar Container */}
      <DeliveryProgressBar
        approvedCount={approvedCount}
        totalAssetsCount={totalAssetsCount}
        projectStatus={projectStatus}
        onApproveCut={handleApproveCut}
        onToggleUploader={() => setShowUploader(!showUploader)}
      />

      {/* 3. Direct Cloudflare Media Uploader Area */}
      {showUploader && (
        <div className="animate-in fade-in slide-in-from-top-3 duration-200">
          <AssetMultiUploader
            workspaceId={workspace.id}
            projectId={project.id}
            existingAssets={galleryItems.map((item) => ({
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
            }}
            onProgressChange={setUploadProgress}
            onClose={() => setShowUploader(false)}
          />
        </div>
      )}

      {/* 4. Appearance Settings Card */}
      <DeliveryAppearanceCard
        settings={appearance}
        onChangeSettings={setAppearance}
      />

      {/* 5. Deliverables & PROJECT ASSETS Gallery */}
      <DeliveryAssetsGallery
        items={galleryItems}
        appearance={appearance}
        showAssetAddedBadge={showAssetAddedBadge}
        onSelectItem={setActiveItem}
      />

      {/* 6. Project Details Card */}
      <DeliveryProjectDetailsCard
        projectId={project.id}
        initialTitle={projectTitle}
        initialClientName={clientName}
        initialDescription={projectDescription}
        onSaved={(newTitle, newClient, newDesc) => {
          setProjectTitle(newTitle);
          setClientName(newClient);
          setProjectDescription(newDesc);
        }}
        triggerToast={triggerToast}
      />

      {/* 7. SHARE A LINK Modal Dialog */}
      <ShareLinkDialog
        isOpen={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        projectId={project.id}
        shareToken={project.shareToken}
        projectTitle={projectTitle}
        initialPasscodeProtected={project.passcodeProtected ?? false}
        initialDownloadAllowed={project.isDownloadAllowed ?? false}
        triggerToast={triggerToast}
      />

      {/* 8. EDIT DELIVERY Modal Dialog */}
      <EditDeliveryDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        coverThumbnailUrl={coverThumbnailUrl}
        onChangeCoverUrl={setCoverThumbnailUrl}
        items={galleryItems}
        onDeleteItem={handleDeleteItemFromGallery}
        onAddAssetClick={() => setShowUploader(true)}
        onSaveChanges={() => {
          setIsEditDialogOpen(false);
          triggerToast("Delivery details updated successfully");
        }}
        onDeleteDelivery={() => {
          if (confirm("Are you sure you want to delete this delivery?")) {
            triggerToast("Delivery deleted");
            setIsEditDialogOpen(false);
          }
        }}
      />

      {/* 9. Publish to Portfolio Dialog */}
      <PublishPortfolioDialog
        isOpen={isPublishDialogOpen}
        onOpenChange={setIsPublishDialogOpen}
        projectId={project.id}
        portfolio={portfolio || null}
        workspaceSlug={workspace.slug}
        projectTitle={projectTitle}
        projectDescription={projectDescription}
        clientName={clientName}
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
        onClose={() => setActiveItem(null)}
        feedbackList={feedbackList}
        onAddFeedback={(fb) => setFeedbackList((prev) => [...prev, fb])}
        onToggleApproval={handleToggleAssetApproval}
        authorName={workspace.brandName || "Filmmaker"}
        triggerToast={triggerToast}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-[#121215] border border-[#f5551d] text-white px-5 py-3 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="size-4 text-[#f5551d]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
