"use client";

import { AmbientBackground } from "@/components/ui/ambient-background";
import { AccentThemeProvider } from "@/components/theme/accent-theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AssetLightboxModal } from "@/components/workspaces/asset-lightbox-modal";
import { DownloadPackageModal } from "@/components/workspaces/download-package-modal";

import { DeliveryPasscodeDialog } from "./_components/delivery-passcode-dialog";
import { DeliveryRoomHeader } from "./_components/delivery-room-header";
import { DeliveryHeroBanner } from "./_components/delivery-hero-banner";
import { DeliveryActionBar } from "./_components/delivery-action-bar";
import { DeliveryAssetGrid } from "./_components/delivery-asset-grid";
import { DeliveryRoomFooter } from "./_components/delivery-room-footer";
import { DemoRoomBanner } from "./_components/demo-room-banner";
import { useDeliveryRoom } from "./_components/use-delivery-room";

import type {
  AssetVersionItem,
  FeedbackReplyItem,
  FeedbackItem,
  DeliveryAssetItem,
  DeliveryAppearance,
  DeliveryRoomProps,
  AssetFilterTab,
} from "./_components/types";

export type {
  AssetVersionItem,
  FeedbackReplyItem,
  FeedbackItem,
  DeliveryAssetItem,
  DeliveryAppearance,
  DeliveryRoomProps,
  AssetFilterTab,
};

/**
 * A locked room is rendered without its contents. After the passcode is accepted the
 * server re-renders the page unlocked (router.refresh in useDeliveryRoom); the key makes
 * the room start over from the full props instead of the locked ones.
 */
export function DeliveryRoomClient(props: DeliveryRoomProps) {
  return <DeliveryRoomView key={props.isInitiallyUnlocked ? "open" : "locked"} {...props} />;
}

function DeliveryRoomView(props: DeliveryRoomProps) {
  const { delivery, workspace, clientName, isWorkspaceMember, whiteLabel, demoMode } = props;
  // The link this visitor came in by may leave approvals to someone else.
  const canApprove = delivery.isApproveAllowed !== false;
  const room = useDeliveryRoom(props);

  return (
    <AccentThemeProvider initialAccent={workspace?.accentColor || "#f5551d"}>
      <TooltipProvider delay={150}>
        <div
          className={`min-h-screen bg-[#070709] text-[#f6f3ec] font-sans antialiased selection:bg-primary selection:text-primary-foreground relative ${
            room.isLocked ? "overflow-hidden max-h-screen" : ""
          }`}
        >
          <AmbientBackground
            variant="subtle"
            showNoise={false}
            accentColor={workspace?.accentColor || undefined}
          />

          {/* 🔒 Passcode Verification Modal */}
          <DeliveryPasscodeDialog
            isOpen={room.isLocked}
            brandName={workspace.brandName}
            deliveryTitle={delivery.title}
            shareToken={delivery.shareToken}
            isWorkspaceMember={Boolean(isWorkspaceMember)}
            onUnlockSuccess={room.handleUnlockSuccess}
          />

          {/* Main Review Room Content (blurred when locked) */}
          <div
            className={`relative z-10 ${
              room.isLocked
                ? "filter blur-lg pointer-events-none select-none opacity-30 transition-all duration-500"
                : ""
            }`}
          >
            <div className="w-full px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6">
              {/* First screen: the header, then the banner filling the rest of the screen (svh, so
                  mobile browser toolbars never cover it). The gap above and below the banner is the
                  same as the side padding. A banner taller than that grows the column instead. */}
              <div className="flex flex-col min-h-svh pt-4 sm:pt-6 gap-4 sm:gap-6 lg:gap-8 pb-4 sm:pb-6 lg:pb-8">
                {/* The site's demo room says so, above everything else */}
                {demoMode && <DemoRoomBanner mode={demoMode} />}

                {/* Header & Expiration Notice */}
                <DeliveryRoomHeader
                  brandName={workspace.brandName}
                  logoUrl={workspace.logoUrl}
                  slug={workspace.slug}
                  deliveryId={delivery.id}
                  isExpired={room.isExpired}
                  expiresAt={delivery.expiresAt}
                  expiryLabel={room.expiryLabel}
                  isWorkspaceMember={Boolean(isWorkspaceMember)}
                />

                {/* Hero Project Cover Banner */}
                <DeliveryHeroBanner
                  title={delivery.title}
                  clientName={clientName}
                  heroCoverUrl={room.heroCoverUrl}
                  formattedDate={room.formattedDate}
                  displayLocation={room.displayLocation}
                  formattedTotalSize={room.formattedTotalSize}
                  displayAssetCount={room.displayAssetCount}
                  approvedCount={room.approvedCount}
                  isGlobalDownloadUnlocked={room.isGlobalDownloadUnlocked}
                  onDownloadAll={room.handleDownloadAll}
                />
              </div>

              <div className="space-y-4 sm:space-y-6">
                {/* Approval Progress & Action Bar */}
                <DeliveryActionBar
                  brandName={workspace.brandName}
                  totalAssets={room.assets.length}
                  approvedCount={room.approvedCount}
                  allApproved={room.allApproved}
                  isApprovingAll={room.isApprovingAll}
                  onMessageCreator={room.handleMessageCreator}
                  onApproveAll={room.handleApproveAll}
                  onUnapproveAll={room.handleUnapproveAll}
                  canApprove={canApprove}
                />

                {/* Asset Library / Project Files */}
                <DeliveryAssetGrid
                  filteredAssets={room.filteredAssets}
                  activeTab={room.assetTab}
                  onTabChange={room.setAssetTab}
                  workspaceBrandName={workspace.brandName}
                  appearance={delivery.appearance}
                  isDeliveryWatermarked={delivery.isWatermarked}
                  isGlobalDownloadUnlocked={room.isGlobalDownloadUnlocked}
                  approvingAssetId={room.approvingAssetId}
                  onSelectAsset={room.openAssetModal}
                  onToggleApproval={canApprove ? room.handleToggleAssetApproval : undefined}
                  onDownloadAsset={room.handleSingleAssetDownload}
                />

                {/* Studio Branding Footer */}
                <DeliveryRoomFooter
                  whiteLabel={whiteLabel}
                  brandName={workspace?.brandName}
                />

                {/* Studio Branding Footer */}
                {/* <DeliveryRoomFooter /> */}
              </div>
            </div>

            {/* 📹 Interactive Video Review Lightbox Modal */}
            <AssetLightboxModal
              activeItem={room.activeLightboxItem}
              onClose={room.closeAssetModal}
              onNext={room.filteredAssets.length > 1 ? room.handleNextAsset : undefined}
              onPrev={room.filteredAssets.length > 1 ? room.handlePrevAsset : undefined}
              feedbackList={room.activeAsset?.feedback || []}
              onAddFeedback={room.handleAddFeedback}
              onAddReply={room.handleAddReply}
              onReconcileFeedbackId={room.handleReconcileFeedbackId}
              onReconcileReplyId={room.handleReconcileReplyId}
              onToggleResolve={room.handleToggleResolve}
              onDeleteFeedback={room.handleDeleteFeedback}
              onDeleteReply={room.handleDeleteReply}
              onEditFeedback={room.handleEditFeedback}
              onEditReply={room.handleEditReply}
              keepFeedbackLocal={demoMode === "visitor"}
              onToggleApproval={canApprove ? room.handleToggleAssetApproval : undefined}
              authorName={room.commentAuthor}
              showFeedback={delivery.isCommentAllowed ?? true}
              showVersions={Boolean(
                room.activeAsset?.versions && room.activeAsset.versions.length > 1
              )}
              showDownload={room.isGlobalDownloadUnlocked}
              onDownload={room.handleLightboxDownload}
              watermarkMedia={
                Boolean(delivery.appearance?.watermarkMedia ?? delivery.isWatermarked) &&
                !room.activeAsset?.isApproved
              }
              watermarkText={workspace?.brandName || "STUDIO PREVIEW"}
              shareToken={delivery.shareToken}
              deliveryId={delivery.id}
            />

            {/* 📦 Master Deliverables Package Modal */}
            <DownloadPackageModal
              isOpen={room.showDownloadModal}
              onOpenChange={room.setShowDownloadModal}
              projectTitle={delivery.title}
              isDownloadAllowed={room.isGlobalDownloadUnlocked}
              brandName={workspace?.brandName}
              deliveryId={delivery.id}
              shareToken={delivery.shareToken}
              totalAssetsCount={room.displayAssetCount}
              onClientDownload={room.notifyCreatorOfDownload}
              items={room.packageModalItems}
            />
          </div>
        </div>
      </TooltipProvider>
    </AccentThemeProvider>
  );
}
