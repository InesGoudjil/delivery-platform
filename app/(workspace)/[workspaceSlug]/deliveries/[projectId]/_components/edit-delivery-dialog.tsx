"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, Plus, Check, Trash2, Pencil, Crop, Link as LinkIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UniversalDialog } from "@/components/ui/universal-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import {
  ImageCropEditorDialog,
  ImageCropResult,
} from "@/components/ui/image-crop-editor-dialog";
import { directUploadDeliveryCover } from "@/components/workspaces/video-uploader";
import { createUploadProgressToast, formatUploadBytes } from "@/lib/upload-toast";
import { TypographyMuted, TypographySpan } from "@/components/ui/typography";
import type { GalleryItem } from "./types";

interface EditDeliveryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** The delivery whose cover is edited. */
  deliveryId: string;
  /** What the cover shows now: the custom cover, or the first file. */
  coverThumbnailUrl: string;
  /** A new cover was uploaded and saved; the URL shows it. */
  onCoverChange: (coverUrl: string) => void;
  items: GalleryItem[];
  onDeleteItem: (itemId: string) => void;
  onEditItem?: (item: GalleryItem) => void;
  onAddAssetClick: () => void;
  onSaveChanges: () => void;
  onDeleteDelivery: () => void;
}

const DEFAULT_COVER_FILE_NAME = "delivery-cover.jpg";

export function EditDeliveryDialog({
  isOpen,
  onOpenChange,
  deliveryId,
  coverThumbnailUrl,
  onCoverChange,
  items,
  onDeleteItem,
  onEditItem,
  onAddAssetClick,
  onSaveChanges,
  onDeleteDelivery,
}: EditDeliveryDialogProps) {
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUrlInputMode, setIsUrlInputMode] = useState(false);
  const [coverLinkInput, setCoverLinkInput] = useState("");
  // The cropped cover being uploaded: shown in place of the current one until it's saved.
  const [coverUpload, setCoverUpload] = useState<{ previewUrl: string; percent: number } | null>(null);
  const [cropState, setCropState] = useState<{
    isOpen: boolean;
    imageSrc: string | null;
    fileName: string;
  }>({
    isOpen: false,
    imageSrc: null,
    fileName: DEFAULT_COVER_FILE_NAME,
  });

  const isUploadingCover = coverUpload !== null;

  const openCropEditor = (imageSrc: string, fileName: string) => {
    setCropState({ isOpen: true, imageSrc, fileName });
  };

  const closeCropEditor = () => {
    // A picked file was opened as a blob URL; the editor has drawn it by now.
    if (cropState.imageSrc?.startsWith("blob:")) URL.revokeObjectURL(cropState.imageSrc);
    setCropState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleCoverFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    openCropEditor(URL.createObjectURL(file), file.name);
  };

  const handleEditCurrentCover = () => {
    if (!coverThumbnailUrl) return;
    openCropEditor(coverThumbnailUrl, DEFAULT_COVER_FILE_NAME);
  };

  // An image from a link goes through the crop editor and is uploaded like a picked file.
  const handleUseCoverLink = () => {
    let link: URL | null = null;
    try {
      link = new URL(coverLinkInput.trim());
    } catch {
      link = null;
    }
    if (!link || (link.protocol !== "https:" && link.protocol !== "http:")) {
      toast.error("Enter an image link that starts with https://");
      return;
    }
    openCropEditor(link.toString(), DEFAULT_COVER_FILE_NAME);
  };

  const uploadCover = async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setCoverUpload({ previewUrl, percent: 0 });

    const title = "Uploading delivery cover";
    const uploadToast = createUploadProgressToast(`delivery-cover-${Date.now()}`);
    let progress = { percentage: 0, loadedBytes: 0, totalBytes: file.size };
    let statusText = "Preparing upload...";
    const showProgress = () =>
      uploadToast.update({ title, fileName: file.name, ...progress, statusText });

    uploadToast.start({
      title,
      fileName: file.name,
      fileSize: formatUploadBytes(file.size),
      percentage: 0,
      statusText,
    });

    try {
      const { coverUrl } = await directUploadDeliveryCover({
        deliveryId,
        file,
        onProgress: (percent, loaded, total) => {
          progress = { percentage: percent, loadedBytes: loaded, totalBytes: total };
          setCoverUpload((prev) => (prev ? { ...prev, percent } : prev));
          showProgress();
        },
        onStatusChange: (text) => {
          statusText = text;
          showProgress();
        },
      });

      if (coverUrl) {
        onCoverChange(coverUrl);
        uploadToast.success("Delivery cover updated", "Your client sees it at the top of the delivery room.");
      } else {
        uploadToast.success("Delivery cover saved", "Reload the page to see it.");
      }
    } catch (err: unknown) {
      uploadToast.error("Cover upload failed", (err instanceof Error && err.message) || "Please try again.");
    } finally {
      URL.revokeObjectURL(previewUrl);
      setCoverUpload(null);
    }
  };

  const handleApplyCoverCrop = (result: ImageCropResult) => {
    // The crop editor closes right away; the upload shows its progress in a toast.
    void uploadCover(result.file);
  };

  const shownCoverUrl = coverUpload?.previewUrl || coverThumbnailUrl;

  return (
    <>
      <UniversalDialog
        open={isOpen}
        onOpenChange={onOpenChange}
        size="md"
        title="EDIT DELIVERY"
        description="Update the cover, manage assets, or delete this delivery."
        bodyClassName="space-y-6"
        footer={
          <div className="w-full space-y-2">
            <Button
              type="button"
              onClick={onSaveChanges}
              disabled={isUploadingCover}
              className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs py-3.5 h-auto shadow-lg shadow-primary/20 cursor-pointer"
            >
              {isUploadingCover ? (
                <>
                  <Loader2 className="size-4 mr-1.5 animate-spin" /> UPLOADING COVER...
                </>
              ) : (
                <>
                  <Check className="size-4 mr-1.5" /> SAVE CHANGES
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={onDeleteDelivery}
              variant="outline"
              className="w-full rounded-full border-destructive/30 text-destructive bg-destructive/10 hover:bg-destructive/20 font-bold text-xs py-3 h-auto cursor-pointer"
            >
              <Trash2 className="size-3.5 mr-1.5" /> Delete delivery
            </Button>
          </div>
        }
      >

          {/* COVER THUMBNAIL */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <TypographySpan className="text-[10px]  text-muted-foreground uppercase tracking-widest block">
                COVER THUMBNAIL
              </TypographySpan>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setIsUrlInputMode((v) => !v)}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer h-auto p-0 hover:bg-transparent"
              >
                {isUrlInputMode ? (
                  <>
                    <UploadCloud className="size-3" /> Upload File
                  </>
                ) : (
                  <>
                    <LinkIcon className="size-3" /> Enter URL
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-16 h-11 rounded-lg overflow-hidden border border-border bg-muted shrink-0 relative group">
                <img
                  src={shownCoverUrl}
                  alt="Cover Thumbnail"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1200&auto=format&fit=crop&q=80";
                  }}
                  className="w-full h-full object-cover"
                />
                {coverUpload && (
                  <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/60 text-[10px] font-bold text-white">
                    <Loader2 className="size-3 animate-spin" />
                    {coverUpload.percent}%
                  </div>
                )}
              </div>

              {isUrlInputMode ? (
                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="url"
                    value={coverLinkInput}
                    onChange={(e) => setCoverLinkInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (!isUploadingCover) handleUseCoverLink();
                      }
                    }}
                    placeholder="https://example.com/cover.jpg"
                    className="flex-1 min-w-0 bg-background/60 border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUseCoverLink}
                    disabled={isUploadingCover || !coverLinkInput.trim()}
                    className="rounded-full border-border bg-background/50 hover:bg-muted text-foreground font-bold text-xs px-3.5 py-2 cursor-pointer"
                  >
                    <Crop className="size-3.5 mr-1.5 text-primary" /> USE
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={coverFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => coverFileInputRef.current?.click()}
                    disabled={isUploadingCover}
                    className="rounded-full border-border bg-background/50 hover:bg-muted text-foreground font-bold text-xs px-3.5 py-2 cursor-pointer"
                  >
                    <UploadCloud className="size-3.5 mr-1.5 text-primary" /> UPLOAD COVER
                  </Button>
                  {coverThumbnailUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleEditCurrentCover}
                      disabled={isUploadingCover}
                      className="rounded-full border-border bg-background/50 hover:bg-muted text-foreground font-bold text-xs px-3.5 py-2 cursor-pointer"
                    >
                      <Crop className="size-3.5 mr-1.5 text-primary" /> EDIT / CROP
                    </Button>
                  )}
                </div>
              )}
            </div>
            <TypographyMuted className="text-[11px] text-muted-foreground">
              {isUrlInputMode
                ? "Paste an image link, then crop it. The cropped image is uploaded with this delivery."
                : "Shown at the top of the delivery page. Upload and crop to 16:9 or 3:1 banner ratio."}
            </TypographyMuted>
          </div>

          {/* ASSETS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <TypographySpan className="text-[10px]  text-muted-foreground uppercase tracking-widest block">
                ASSETS
              </TypographySpan>
              <Badge variant="outline" className="text-[10px] ">
                {items.length} items
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto pr-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="aspect-square rounded-xl overflow-hidden border border-border relative group bg-black"
                >
                  <img
                    src={item.src}
                    alt={item.title}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src =
                        "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1200&auto=format&fit=crop&q=80";
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                    {onEditItem && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onEditItem(item)}
                        className="size-6 rounded-full bg-black/80 text-white hover:bg-white/30 flex items-center justify-center cursor-pointer shadow-md p-0"
                        title="Edit asset"
                      >
                        <Pencil className="size-3" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => {
                        if (confirm(`Delete asset "${item.title}"?`)) {
                          onDeleteItem(item.id);
                        }
                      }}
                      className="size-6 rounded-full bg-black/80 text-white hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center cursor-pointer shadow-md p-0"
                      title="Delete asset"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Add Asset dashed tile */}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onAddAssetClick();
                }}
                className="aspect-square h-auto rounded-xl border border-dashed border-border/80 hover:border-primary bg-muted/20 hover:bg-muted/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0"
              >
                <Plus className="size-6" />
              </Button>
            </div>
          </div>

      </UniversalDialog>

      <ImageCropEditorDialog
        isOpen={cropState.isOpen}
        onClose={closeCropEditor}
        imageSrc={cropState.imageSrc}
        title="EDIT & CROP DELIVERY COVER"
        subtitle="Frame, zoom, rotate, or fine-tune the hero cover for this client delivery room."
        defaultAspectRatio="16:9"
        aspectRatioOptions={["16:9", "3:1", "4:3"]}
        outputFileName={cropState.fileName}
        onApply={handleApplyCoverCrop}
      />
    </>
  );
}
