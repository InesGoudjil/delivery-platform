"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { resolveMediaUrl, resolveThumbnailUrl } from "@/lib/media";
import { getDownloadFilename, triggerDirectDownload } from "@/lib/download";
import {
  toggleAssetApprovalAction,
  approveAllAssetsAction,
  unapproveAllAssetsAction,
  recordClientDownloadAction,
} from "@/app/actions/deliveries";
import type { LightboxAssetItem } from "@/components/workspaces/asset-lightbox-modal";
import type {
  DeliveryRoomProps,
  DeliveryAssetItem,
  AssetVersionItem,
  FeedbackItem,
  FeedbackReplyItem,
  AssetFilterTab,
} from "./types";

export function useDeliveryRoom({
  delivery,
  workspace,
  clientName,
  brandingLocation,
  initialTotalSizeBytes = 0,
  initialAssetCount = 0,
  initialAssets,
  isPasscodeProtected,
  isInitiallyUnlocked,
  currentUser,
}: DeliveryRoomProps) {
  // Passcode gate state
  const [isLocked, setIsLocked] = useState(isPasscodeProtected && !isInitiallyUnlocked);

  // Delivery data state
  const [deliveryStatus, setDeliveryStatus] = useState(delivery.status);
  const [assets, setAssets] = useState<DeliveryAssetItem[]>(() => {
    if (
      delivery.status === "approved" &&
      initialAssets.length > 0 &&
      initialAssets.every((a) => !a.isApproved)
    ) {
      return initialAssets.map((a) => ({ ...a, isApproved: true }));
    }
    return initialAssets;
  });
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [assetTab, setAssetTab] = useState<AssetFilterTab>("all");
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Comments state
  const [commentAuthor] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("cinespace_reviewer_name");
      if (stored?.trim()) return stored.trim();
    }
    return currentUser?.name || clientName || "Client Reviewer";
  });

  // Loading states for approvals
  const [approvingAssetId, setApprovingAssetId] = useState<string | null>(null);
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  // Find active asset
  const activeAsset = assets.find((a) => a.id === activeAssetId) || null;

  // Check if all assets are approved
  const allApproved =
    assets.length > 0
      ? assets.every((a) => a.isApproved)
      : deliveryStatus === "approved";

  const approvedCount = assets.filter((a) => a.isApproved).length;

  // Calculate total asset size strictly based on the assets present on this delivery alone
  const currentTotalSizeBytes = assets.reduce((acc, a) => {
    const v = a.activeVersion || a.versions?.[0];
    return acc + (Number(v?.fileSizeBytes) || 0);
  }, 0);

  const totalSizeBytes =
    currentTotalSizeBytes > 0
      ? currentTotalSizeBytes
      : (initialTotalSizeBytes || 0);

  const formattedTotalSize = (() => {
    if (totalSizeBytes <= 0) return "0 MB";
    const gb = totalSizeBytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
      return `${gb.toFixed(1)} GB`;
    }
    const mb = totalSizeBytes / (1024 * 1024);
    if (mb >= 1) {
      return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
    }
    const kb = totalSizeBytes / 1024;
    if (kb >= 1) {
      return `${Math.round(kb)} KB`;
    }
    return `${totalSizeBytes} B`;
  })();

  // Pick location from delivery override, or fall back to workspace branding location
  const displayLocation =
    delivery.location?.trim() || brandingLocation?.trim() || "Dubai, UAE";

  // Pick date from delivery date or creation date
  const formattedDate = (() => {
    const rawDate = delivery.deliveryDate || delivery.createdAt;
    if (!rawDate) return "02.21.26";
    if (typeof rawDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      const [year, month, day] = rawDate.split("-");
      return `${month}.${day}.${year.slice(-2)}`;
    }
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return "02.21.26";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}.${dd}.${yy}`;
  })();

  const displayAssetCount = assets.length > 0 ? assets.length : (initialAssetCount || 0);

  const isExpired = delivery.expiresAt ? new Date(delivery.expiresAt).getTime() < Date.now() : false;
  const expiryLabel = (() => {
    if (!delivery.expiresAt) return "Never expires";
    const diffMs = new Date(delivery.expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return `Expired on ${new Date(delivery.expiresAt).toLocaleDateString()}`;
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 24) {
      const h = Math.max(1, Math.round(diffHours));
      return `expires in ${h} ${h === 1 ? "hour" : "hours"}`;
    }
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return `expires in ${days} ${days === 1 ? "day" : "days"}`;
  })();

  const firstAsset = assets[0];
  const firstVersion = firstAsset?.activeVersion || firstAsset?.versions[0];
  const isFirstPhoto =
    firstAsset?.type === "photo_gallery" ||
    firstAsset?.type === "image" ||
    firstAsset?.type === "photo" ||
    firstAsset?.type === "still";
  const customDeliveryCover = delivery.appearance?.coverThumbnailUrl;
  const heroCoverUrl =
    (customDeliveryCover ? resolveMediaUrl(customDeliveryCover) : "") ||
    resolveThumbnailUrl(
      firstVersion?.thumbnailUrl,
      firstVersion?.rawFileUrl,
      isFirstPhoto
    ) ||
    "/images/projects/mercedes-amg-gt/1.webp";

  const filteredAssets = assets.filter((a) => {
    if (assetTab === "all") return true;
    const isVid =
      a.type === "video" ||
      a.type === "film" ||
      a.type === "clip" ||
      a.type === "trailer";
    if (assetTab === "video") return isVid;
    if (assetTab === "photo") return !isVid;
    return true;
  });

  // Unlock callback
  const handleUnlockSuccess = (unlockedAssets: DeliveryAssetItem[]) => {
    if (unlockedAssets && unlockedAssets.length > 0) {
      setAssets(unlockedAssets);
      if (!activeAssetId) {
        setActiveAssetId(unlockedAssets[0].id);
      }
    }
    setIsLocked(false);
  };

  // Single Asset Approval
  const handleToggleAssetApproval = async (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;
    const nextApproved = !asset.isApproved;
    const prevStatus = deliveryStatus;
    const nextAllApproved =
      assets.length > 0 &&
      assets.every((a) => (a.id === assetId ? nextApproved : a.isApproved));

    // Optimistic UI
    setAssets((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, isApproved: nextApproved } : a))
    );
    setDeliveryStatus(nextAllApproved ? "approved" : "in_review");

    setApprovingAssetId(assetId);
    try {
      const res = await toggleAssetApprovalAction(delivery.id, assetId, nextApproved);
      if (res.success) {
        if (nextApproved) {
          toast.success(`"${asset.title}" approved!`);
        } else {
          toast.info(`Approval removed for "${asset.title}"`);
        }
        if (res.delivery?.status) {
          setDeliveryStatus(res.delivery.status);
        }
      } else {
        // Revert on error
        setAssets((prev) =>
          prev.map((a) => (a.id === assetId ? { ...a, isApproved: asset.isApproved } : a))
        );
        setDeliveryStatus(prevStatus);
        toast.error(res.error || "Failed to update asset approval.");
      }
    } finally {
      setApprovingAssetId(null);
    }
  };

  // Bulk Approval & Unapproval
  const handleApproveAll = async () => {
    const prevAssets = assets;
    const prevStatus = deliveryStatus;
    setAssets((prev) => prev.map((a) => ({ ...a, isApproved: true })));
    setDeliveryStatus("approved");

    setIsApprovingAll(true);
    try {
      const res = await approveAllAssetsAction(delivery.id, commentAuthor);
      if (res.success) {
        toast.success("All delivery cuts approved & locked!");
      } else {
        setAssets(prevAssets);
        setDeliveryStatus(prevStatus);
        toast.error(res.error || "Failed to approve all cuts.");
      }
    } finally {
      setIsApprovingAll(false);
    }
  };

  const handleUnapproveAll = async () => {
    const prevAssets = assets;
    const prevStatus = deliveryStatus;
    setAssets((prev) => prev.map((a) => ({ ...a, isApproved: false })));
    setDeliveryStatus("in_review");

    setIsApprovingAll(true);
    try {
      const res = await unapproveAllAssetsAction(delivery.id);
      if (res.success) {
        toast.info("Project approval undone — cuts returned to review");
      } else {
        setAssets(prevAssets);
        setDeliveryStatus(prevStatus);
        toast.error(res.error || "Failed to undo approval.");
      }
    } finally {
      setIsApprovingAll(false);
    }
  };

  // Feedback & Reply Handlers
  const handleAddFeedback = (newFeedback: FeedbackItem) => {
    if (!activeAsset) return;
    setAssets((prev) =>
      prev.map((a) => {
        if (a.id === activeAsset.id) {
          return {
            ...a,
            feedback: [...a.feedback, newFeedback],
          };
        }
        return a;
      })
    );
  };

  const handleAddReply = (feedbackId: string, reply: FeedbackReplyItem) => {
    if (!activeAsset) return;
    setAssets((prev) =>
      prev.map((a) => {
        if (a.id === activeAsset.id) {
          return {
            ...a,
            feedback: a.feedback.map((f) =>
              f.id === feedbackId
                ? {
                    ...f,
                    replies: [...(f.replies || []), reply],
                  }
                : f
            ),
          };
        }
        return a;
      })
    );
  };

  // WhatsApp Share & Message Creator
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🎬 Here is the private review room for ${delivery.title}:\n${window.location.href}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleMessageCreator = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = encodeURIComponent(
      `Hey ${workspace.brandName}! Regarding the "${delivery.title}" delivery cuts:\n${url}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  // Master Files Download & Creator Notification
  const hasNotifiedDownloadRef = useRef(false);
  const isGlobalDownloadUnlocked = Boolean(
    delivery.isDownloadAllowed || deliveryStatus === "approved" || allApproved
  );

  const notifyCreatorOfDownload = (info: {
    assetTitle?: string;
    downloadedCount?: number;
  }) => {
    if (hasNotifiedDownloadRef.current) return;
    hasNotifiedDownloadRef.current = true;
    void recordClientDownloadAction({
      deliveryId: delivery.id,
      assetTitle: info.assetTitle,
      downloadedCount: info.downloadedCount,
    });
  };

  const handleSingleAssetDownload = (
    asset: DeliveryAssetItem,
    versionOverride?: AssetVersionItem | null
  ) => {
    const canDownloadThisAsset = isGlobalDownloadUnlocked || Boolean(asset.isApproved);
    if (!canDownloadThisAsset) {
      toast.error("Downloads are locked until this cut is approved.");
      return;
    }

    const targetVer = versionOverride || asset.activeVersion || asset.versions[0];
    const isPhoto =
      asset.type === "photo" ||
      asset.type === "photo_gallery" ||
      asset.type === "still" ||
      asset.type === "image";
    const dlUrl = resolveMediaUrl(
      targetVer?.downloadUrl ||
        targetVer?.rawFileUrl ||
        (isPhoto ? targetVer?.thumbnailUrl : "")
    );

    if (!dlUrl) {
      toast.error("No master file available for download.");
      return;
    }

    const filename = getDownloadFilename(
      asset.title,
      targetVer?.versionNumber || 1,
      dlUrl,
      asset.type
    );
    triggerDirectDownload(dlUrl, filename);
    toast.success(`Downloading ${asset.title}`, {
      description: `Saving as ${filename}`,
    });
    notifyCreatorOfDownload({ assetTitle: asset.title, downloadedCount: 1 });
  };

  const handleDownloadAll = () => {
    setShowDownloadModal(true);
  };

  // Modal navigation
  const openAssetModal = (asset: DeliveryAssetItem) => {
    setActiveAssetId(asset.id);
    const activeVer = asset.activeVersion || asset.versions[0] || null;
    setSelectedVersionId(activeVer ? activeVer.id : null);
  };

  const closeAssetModal = () => {
    setActiveAssetId(null);
  };

  const currentAssetIndex = activeAsset
    ? filteredAssets.findIndex((a) => a.id === activeAsset.id)
    : -1;

  const handleNextAsset = () => {
    if (currentAssetIndex >= 0 && currentAssetIndex < filteredAssets.length - 1) {
      openAssetModal(filteredAssets[currentAssetIndex + 1]);
    } else if (filteredAssets.length > 0) {
      openAssetModal(filteredAssets[0]);
    }
  };

  const handlePrevAsset = () => {
    if (currentAssetIndex > 0) {
      openAssetModal(filteredAssets[currentAssetIndex - 1]);
    } else if (filteredAssets.length > 0) {
      openAssetModal(filteredAssets[filteredAssets.length - 1]);
    }
  };

  const handleLightboxDownload = (item: LightboxAssetItem, version?: any) => {
    const asset = assets.find((a) => String(a.id) === String(item.id));
    if (asset) {
      handleSingleAssetDownload(asset, version);
    }
  };

  const activeLightboxItem: LightboxAssetItem | null = activeAsset
    ? {
        id: activeAsset.id,
        title: activeAsset.title,
        type: activeAsset.type,
        aspectRatio: activeAsset.aspectRatio,
        status: activeAsset.isApproved ? "approved" : "in_review",
        isApproved: activeAsset.isApproved,
        versionId:
          selectedVersionId ||
          activeAsset.activeVersion?.id ||
          activeAsset.versions?.[0]?.id,
        versions: activeAsset.versions.map((v) => ({
          id: v.id,
          versionNumber: v.versionNumber,
          rawFileUrl: v.rawFileUrl,
          downloadUrl: v.downloadUrl,
          hlsManifestUrl: v.hlsManifestUrl,
          thumbnailUrl: v.thumbnailUrl,
          durationSeconds: v.durationSeconds,
          fileSizeBytes: v.fileSizeBytes || 0,
          transcodingStatus: v.transcodingStatus || "ready",
          isActiveVersion: v.isActiveVersion ?? false,
          createdAt: "",
        })),
        feedback: activeAsset.feedback,
      }
    : null;

  const packageModalItems = assets.map((a) => {
    const activeVer = a.activeVersion || a.versions[0];
    const isPhoto =
      a.type === "photo" ||
      a.type === "photo_gallery" ||
      a.type === "still" ||
      a.type === "image";
    let durationStr: string | null = null;
    if (!isPhoto && activeVer?.durationSeconds) {
      const mins = Math.floor(activeVer.durationSeconds / 60);
      const secs = Math.round(activeVer.durationSeconds % 60);
      durationStr = `${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    const thumbUrl = resolveThumbnailUrl(
      activeVer?.thumbnailUrl,
      activeVer?.rawFileUrl,
      isPhoto
    );
    return {
      id: a.id,
      title: a.title,
      type: a.type,
      versionNumber: activeVer?.versionNumber || 1,
      fileSizeBytes: activeVer?.fileSizeBytes,
      duration: durationStr,
      aspectRatio: a.aspectRatio,
      thumbnailUrl: thumbUrl,
      downloadUrl:
        resolveMediaUrl(
          activeVer?.downloadUrl || activeVer?.rawFileUrl
        ) || (isPhoto ? thumbUrl : ""),
      proxyDownloadUrl: (activeVer as any)?.proxyDownloadUrl || null,
      isApproved: a.isApproved,
    };
  });

  return {
    isLocked,
    deliveryStatus,
    assets,
    activeAssetId,
    activeAsset,
    selectedVersionId,
    assetTab,
    setAssetTab,
    showDownloadModal,
    setShowDownloadModal,
    commentAuthor,
    approvingAssetId,
    isApprovingAll,
    allApproved,
    approvedCount,
    formattedTotalSize,
    displayLocation,
    formattedDate,
    displayAssetCount,
    isExpired,
    expiryLabel,
    heroCoverUrl,
    filteredAssets,
    isGlobalDownloadUnlocked,
    activeLightboxItem,
    packageModalItems,
    handleUnlockSuccess,
    handleToggleAssetApproval,
    handleApproveAll,
    handleUnapproveAll,
    handleAddFeedback,
    handleAddReply,
    handleWhatsAppShare,
    handleMessageCreator,
    notifyCreatorOfDownload,
    handleSingleAssetDownload,
    handleDownloadAll,
    openAssetModal,
    closeAssetModal,
    handleNextAsset,
    handlePrevAsset,
    handleLightboxDownload,
  };
}
