"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { resolveMediaUrl, resolveThumbnailUrl } from "@/lib/media";
import { getDownloadFilename, triggerDirectDownload } from "@/lib/download";
import { useQueryParams } from "@/hooks/use-query-params";
import { mutatePrefix } from "@/lib/swr/mutate";
import {
  toggleAssetApprovalAction,
  approveAllAssetsAction,
  unapproveAllAssetsAction,
  recordClientDownloadAction,
} from "@/app/actions/deliveries";
import {
  toggleFeedbackResolvedAction,
  deleteFeedbackAction,
  deleteFeedbackReplyAction,
  updateFeedbackAction,
  updateFeedbackReplyAction,
} from "@/app/actions/feedback";
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
  demoMode,
}: DeliveryRoomProps) {
  const router = useRouter();
  // A visitor in the demo room: what they do stays in this browser. The server would refuse it
  // anyway (core/security/client-room.ts), so it's never sent.
  const keepLocal = demoMode === "visitor";

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

  const { queryParams, getParam } = useQueryParams();
  const tabParam = getParam("tab");
  const [assetTab, setAssetTabState] = useState<AssetFilterTab>(() => {
    if (tabParam === "video" || tabParam === "photo") return tabParam;
    return "all";
  });

  const setAssetTab = (tab: AssetFilterTab) => {
    setAssetTabState(tab);
    if (tab === "all") {
      queryParams({ del: "tab" });
    } else {
      queryParams({ set: { tab } });
    }
  };

  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Comments state
  const [commentAuthor] = useState(() => {
    if (keepLocal) return "You";
    if (typeof window !== "undefined") {
      // Storage can throw (site data blocked, some private windows): fall back to the defaults.
      try {
        const stored = localStorage.getItem("cinespace_reviewer_name");
        if (stored?.trim()) return stored.trim();
      } catch {}
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

  // Location from the delivery, else the studio's branding; none at all hides the stat (it used
  // to show a demo city to real clients).
  const displayLocation = delivery.location?.trim() || brandingLocation?.trim() || "";

  // The delivery date, else the day the room was made, always day.month.year. Delivery dates are
  // plain "YYYY-MM-DD" text and used to come out month first while creation dates came out day
  // first. Read in UTC: the room renders on the server and again in the visitor's browser, and a
  // local-time reading gave the two different days near midnight (a hydration mismatch).
  const formattedDate = formatRoomDate(delivery.deliveryDate || delivery.createdAt);

  const displayAssetCount = assets.length > 0 ? assets.length : (initialAssetCount || 0);

  const isExpired = delivery.expiresAt ? new Date(delivery.expiresAt).getTime() < Date.now() : false;
  const expiryLabel = (() => {
    if (!delivery.expiresAt) return "Never expires";
    const diffMs = new Date(delivery.expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return `Expired on ${formatRoomDate(delivery.expiresAt)}`;
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
  // No cover and no thumbnail: the banner shows its plain backdrop (it used to show a demo photo).
  const heroCoverUrl =
    (customDeliveryCover ? resolveMediaUrl(customDeliveryCover) : "") ||
    resolveThumbnailUrl(
      firstVersion?.thumbnailUrl,
      firstVersion?.rawFileUrl,
      isFirstPhoto
    ) ||
    "";

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

  // Unlock callback: show the files right away, then re-render the room from the server
  // (the locked page carries no description, comments setting or cover).
  const handleUnlockSuccess = (unlockedAssets: DeliveryAssetItem[]) => {
    if (unlockedAssets && unlockedAssets.length > 0) {
      setAssets(unlockedAssets);
    }
    setIsLocked(false);
    router.refresh();
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

    if (keepLocal) {
      if (nextApproved) {
        toast.success(`"${asset.title}" approved!`);
      } else {
        toast.info(`Approval removed for "${asset.title}"`);
      }
      return;
    }

    setApprovingAssetId(assetId);
    try {
      const res = await toggleAssetApprovalAction({ shareToken: delivery.shareToken }, assetId, nextApproved);
      if (res.success) {
        if (nextApproved) {
          toast.success(`"${asset.title}" approved!`);
        } else {
          toast.info(`Approval removed for "${asset.title}"`);
        }
        if (res.delivery?.status) {
          setDeliveryStatus(res.delivery.status);
        }
        void mutatePrefix([`/deliver/${delivery.shareToken}`, "/api/deliveries"]);
      } else {
        revert(res.error || "Failed to update asset approval.");
      }
    } catch {
      // The call itself failed (offline, or the page is older than the server): nothing was saved.
      revert("Couldn't save that. Check your connection and try again.");
    } finally {
      setApprovingAssetId(null);
    }

    function revert(message: string) {
      setAssets((prev) =>
        prev.map((a) => (a.id === assetId ? { ...a, isApproved: asset!.isApproved } : a))
      );
      setDeliveryStatus(prevStatus);
      toast.error(message);
    }
  };

  // Bulk Approval & Unapproval
  const handleApproveAll = async () => {
    const prevAssets = assets;
    const prevStatus = deliveryStatus;
    setAssets((prev) => prev.map((a) => ({ ...a, isApproved: true })));
    setDeliveryStatus("approved");

    if (keepLocal) {
      toast.success("All delivery cuts approved & locked!");
      return;
    }

    setIsApprovingAll(true);
    try {
      const res = await approveAllAssetsAction({ shareToken: delivery.shareToken }, commentAuthor);
      if (res.success) {
        toast.success("All delivery cuts approved & locked!");
        void mutatePrefix([`/deliver/${delivery.shareToken}`, "/api/deliveries"]);
      } else {
        setAssets(prevAssets);
        setDeliveryStatus(prevStatus);
        toast.error(res.error || "Failed to approve all cuts.");
      }
    } catch {
      setAssets(prevAssets);
      setDeliveryStatus(prevStatus);
      toast.error("Couldn't save that. Check your connection and try again.");
    } finally {
      setIsApprovingAll(false);
    }
  };

  const handleUnapproveAll = async () => {
    const prevAssets = assets;
    const prevStatus = deliveryStatus;
    setAssets((prev) => prev.map((a) => ({ ...a, isApproved: false })));
    setDeliveryStatus("in_review");

    if (keepLocal) {
      toast.info("Project approval undone — cuts returned to review");
      return;
    }

    setIsApprovingAll(true);
    try {
      const res = await unapproveAllAssetsAction({ shareToken: delivery.shareToken });
      if (res.success) {
        toast.info("Project approval undone — cuts returned to review");
        void mutatePrefix([`/deliver/${delivery.shareToken}`, "/api/deliveries"]);
      } else {
        setAssets(prevAssets);
        setDeliveryStatus(prevStatus);
        toast.error(res.error || "Failed to undo approval.");
      }
    } catch {
      setAssets(prevAssets);
      setDeliveryStatus(prevStatus);
      toast.error("Couldn't save that. Check your connection and try again.");
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
          const existing = a.feedback || [];
          if (existing.some((f) => f.id === newFeedback.id)) return a;
          return {
            ...a,
            feedback: [...existing, newFeedback],
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
            feedback: a.feedback.map((f) => {
              if (f.id !== feedbackId) return f;
              const existingReplies = f.replies || [];
              if (existingReplies.some((r) => r.id === reply.id)) return f;
              return {
                ...f,
                replies: [...existingReplies, reply],
              };
            }),
          };
        }
        return a;
      })
    );
  };

  const handleReconcileFeedbackId = (tempId: string, realId: string) => {
    setAssets((prev) =>
      prev.map((a) => ({
        ...a,
        feedback: a.feedback.map((f) => (f.id === tempId ? { ...f, id: realId } : f)),
      }))
    );
  };

  const handleReconcileReplyId = (
    feedbackId: string,
    tempReplyId: string,
    realReplyId: string
  ) => {
    setAssets((prev) =>
      prev.map((a) => ({
        ...a,
        feedback: a.feedback.map((f) =>
          f.id === feedbackId
            ? {
                ...f,
                replies: (f.replies || []).map((r) =>
                  r.id === tempReplyId ? { ...r, id: realReplyId } : r
                ),
              }
            : f
        ),
      }))
    );
  };

  const handleToggleResolve = async (feedbackId: string, currentResolved: boolean) => {
    const nextResolved = !currentResolved;
    setAssets((prev) =>
      prev.map((a) => ({
        ...a,
        feedback: a.feedback.map((f) =>
          f.id === feedbackId ? { ...f, isResolved: nextResolved } : f
        ),
      }))
    );

    if (keepLocal) return;

    const revert = (message: string) => {
      toast.error(message);
      setAssets((prev) =>
        prev.map((a) => ({
          ...a,
          feedback: a.feedback.map((f) =>
            f.id === feedbackId ? { ...f, isResolved: currentResolved } : f
          ),
        }))
      );
    };
    try {
      const res = await toggleFeedbackResolvedAction(feedbackId, nextResolved, delivery.shareToken);
      if (res?.error) revert(res.error);
    } catch {
      revert("Couldn't save that. Check your connection and try again.");
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    const owner = assets.find((a) => a.feedback.some((f) => f.id === feedbackId));
    const removedIndex = owner ? owner.feedback.findIndex((f) => f.id === feedbackId) : -1;
    const removed = owner && removedIndex >= 0 ? owner.feedback[removedIndex] : null;
    const restore = (message: string) => {
      toast.error(message);
      if (!owner || !removed) return;
      setAssets((prev) =>
        prev.map((a) => {
          if (a.id !== owner.id || a.feedback.some((f) => f.id === feedbackId)) return a;
          const feedback = [...a.feedback];
          feedback.splice(Math.min(removedIndex, feedback.length), 0, removed);
          return { ...a, feedback };
        })
      );
    };

    setAssets((prev) =>
      prev.map((a) => ({
        ...a,
        feedback: a.feedback.filter((f) => f.id !== feedbackId),
      }))
    );

    if (keepLocal) {
      toast.success("Comment deleted");
      return;
    }

    try {
      const res = await deleteFeedbackAction(feedbackId, delivery.shareToken);
      if (res?.error) {
        restore(res.error || "Failed to delete feedback");
      } else {
        toast.success("Comment deleted");
      }
    } catch {
      restore("Couldn't save that. Check your connection and try again.");
    }
  };

  const handleDeleteReply = async (feedbackId: string, replyId: string) => {
    const parent = assets.flatMap((a) => a.feedback).find((f) => f.id === feedbackId);
    const replyIndex = parent?.replies?.findIndex((r) => r.id === replyId) ?? -1;
    const removedReply = parent && replyIndex >= 0 ? parent.replies![replyIndex] : null;
    const restore = (message: string) => {
      toast.error(message);
      if (!removedReply) return;
      setAssets((prev) =>
        prev.map((a) => ({
          ...a,
          feedback: a.feedback.map((f) => {
            if (f.id !== feedbackId || (f.replies || []).some((r) => r.id === replyId)) return f;
            const replies = [...(f.replies || [])];
            replies.splice(Math.min(replyIndex, replies.length), 0, removedReply);
            return { ...f, replies };
          }),
        }))
      );
    };

    setAssets((prev) =>
      prev.map((a) => ({
        ...a,
        feedback: a.feedback.map((f) =>
          f.id === feedbackId
            ? {
                ...f,
                replies: (f.replies || []).filter((r) => r.id !== replyId),
              }
            : f
        ),
      }))
    );

    if (keepLocal) {
      toast.success("Reply deleted");
      return;
    }

    try {
      const res = await deleteFeedbackReplyAction(replyId, delivery.shareToken);
      if (res?.error) {
        restore(res.error || "Failed to delete reply");
      } else {
        toast.success("Reply deleted");
      }
    } catch {
      restore("Couldn't save that. Check your connection and try again.");
    }
  };

  const handleEditFeedback = async (feedbackId: string, newText: string) => {
    const nowIso = new Date().toISOString();
    const previous = assets.flatMap((a) => a.feedback).find((f) => f.id === feedbackId);
    const restore = (message: string) => {
      toast.error(message);
      if (!previous) return;
      setAssets((prev) =>
        prev.map((a) => ({
          ...a,
          feedback: a.feedback.map((f) =>
            f.id === feedbackId
              ? { ...f, commentText: previous.commentText, updatedAt: previous.updatedAt }
              : f
          ),
        }))
      );
    };
    setAssets((prev) =>
      prev.map((a) => ({
        ...a,
        feedback: a.feedback.map((f) =>
          f.id === feedbackId ? { ...f, commentText: newText, updatedAt: nowIso } : f
        ),
      }))
    );

    if (keepLocal) {
      toast.success("Comment updated");
      return;
    }

    try {
      const res = await updateFeedbackAction({
        feedbackId,
        commentText: newText,
        shareToken: delivery.shareToken,
      });
      if (res?.error) {
        restore(res.error || "Failed to update feedback");
      } else {
        toast.success("Comment updated");
      }
    } catch {
      restore("Couldn't save that. Check your connection and try again.");
    }
  };

  const handleEditReply = async (feedbackId: string, replyId: string, newText: string) => {
    const nowIso = new Date().toISOString();
    const previousReply = assets
      .flatMap((a) => a.feedback)
      .find((f) => f.id === feedbackId)
      ?.replies?.find((r) => r.id === replyId);
    const restore = (message: string) => {
      toast.error(message);
      if (!previousReply) return;
      setAssets((prev) =>
        prev.map((a) => ({
          ...a,
          feedback: a.feedback.map((f) =>
            f.id === feedbackId
              ? {
                  ...f,
                  replies: (f.replies || []).map((r) =>
                    r.id === replyId
                      ? { ...r, commentText: previousReply.commentText, updatedAt: previousReply.updatedAt }
                      : r
                  ),
                }
              : f
          ),
        }))
      );
    };
    setAssets((prev) =>
      prev.map((a) => ({
        ...a,
        feedback: a.feedback.map((f) =>
          f.id === feedbackId
            ? {
                ...f,
                replies: (f.replies || []).map((r) =>
                  r.id === replyId ? { ...r, commentText: newText, updatedAt: nowIso } : r
                ),
              }
            : f
        ),
      }))
    );

    if (keepLocal) {
      toast.success("Reply updated");
      return;
    }

    try {
      const res = await updateFeedbackReplyAction({
        replyId,
        commentText: newText,
        shareToken: delivery.shareToken,
      });
      if (res?.error) {
        restore(res.error || "Failed to update reply");
      } else {
        toast.success("Reply updated");
      }
    } catch {
      restore("Couldn't save that. Check your connection and try again.");
    }
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
    // Straight to the studio when it has a number; otherwise WhatsApp asks who to send it to.
    const number = (workspace.whatsappNumber || "").replace(/\D/g, "");
    window.open(`https://wa.me/${number}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  // Master Files Download & Creator Notification
  const hasNotifiedDownloadRef = useRef(false);
  const isGlobalDownloadUnlocked = Boolean(delivery.isDownloadAllowed);

  const refuseDownload = () => {
    if (keepLocal) {
      toast.info("Downloads are off in the demo room", {
        description: "In your own rooms, you choose whether clients can download.",
      });
      return;
    }
    toast.error("Downloads are restricted for this review link.");
  };

  const notifyCreatorOfDownload = (info: {
    assetId?: string;
    assetTitle?: string;
    downloadedCount?: number;
  }) => {
    if (keepLocal || hasNotifiedDownloadRef.current) return;
    hasNotifiedDownloadRef.current = true;
    void recordClientDownloadAction({
      shareToken: delivery.shareToken,
      assetId: info.assetId,
      downloadedCount: info.downloadedCount,
    });
  };

  const handleSingleAssetDownload = (
    asset: DeliveryAssetItem,
    versionOverride?: AssetVersionItem | null
  ) => {
    if (!isGlobalDownloadUnlocked) {
      refuseDownload();
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
    notifyCreatorOfDownload({ assetId: asset.id, downloadedCount: 1 });
  };

  const handleDownloadAll = () => {
    if (!isGlobalDownloadUnlocked) {
      refuseDownload();
      return;
    }
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
    handleReconcileFeedbackId,
    handleReconcileReplyId,
    handleToggleResolve,
    handleDeleteFeedback,
    handleDeleteReply,
    handleEditFeedback,
    handleEditReply,
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

/**
 * A room date as DD.MM.YY. "YYYY-MM-DD" text is taken as written; timestamps are read in UTC so
 * the server and the browser agree. Empty when there's no usable date.
 */
export function formatRoomDate(value: string | null | undefined): string {
  if (!value) return "";
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (plain) return `${plain[3]}.${plain[2]}.${plain[1].slice(-2)}`;
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(d.getUTCFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}
