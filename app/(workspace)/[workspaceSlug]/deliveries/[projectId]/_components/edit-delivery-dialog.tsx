"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, Plus, Check, Trash2, Pencil, Crop, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ImageCropEditorDialog,
  ImageCropResult,
} from "@/components/ui/image-crop-editor-dialog";
import { createUploadProgressToast } from "@/lib/upload-toast";
import type { GalleryItem } from "./types";

interface EditDeliveryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  coverThumbnailUrl: string;
  onChangeCoverUrl: (url: string) => void;
  items: GalleryItem[];
  onDeleteItem: (itemId: string) => void;
  onEditItem?: (item: GalleryItem) => void;
  onAddAssetClick: () => void;
  onSaveChanges: () => void;
  onDeleteDelivery: () => void;
}

export function EditDeliveryDialog({
  isOpen,
  onOpenChange,
  coverThumbnailUrl,
  onChangeCoverUrl,
  items,
  onDeleteItem,
  onEditItem,
  onAddAssetClick,
  onSaveChanges,
  onDeleteDelivery,
}: EditDeliveryDialogProps) {
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUrlInputMode, setIsUrlInputMode] = useState(false);
  const [cropState, setCropState] = useState<{
    isOpen: boolean;
    imageSrc: string | null;
    fileName: string;
  }>({
    isOpen: false,
    imageSrc: null,
    fileName: "delivery-cover.jpg",
  });

  const handleCoverFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const objectUrl = URL.createObjectURL(file);
    setCropState({
      isOpen: true,
      imageSrc: objectUrl,
      fileName: file.name,
    });
  };

  const handleEditCurrentCover = () => {
    if (!coverThumbnailUrl) return;
    setCropState({
      isOpen: true,
      imageSrc: coverThumbnailUrl,
      fileName: "delivery-cover.jpg",
    });
  };

  const handleApplyCoverCrop = (result: ImageCropResult) => {
    const uploadToast = createUploadProgressToast(`delivery-cover-${Date.now()}`);
    uploadToast.start(
      `Applying delivery cover "${cropState.fileName}"...`,
      "Processing cropped cover..."
    );
    uploadToast.update({
      title: `Applying delivery cover "${cropState.fileName}"`,
      progress: 100,
      loadedBytes: result.file.size,
      totalBytes: result.file.size,
    });
    onChangeCoverUrl(result.dataUrl);
    uploadToast.success("Delivery cover updated!", "Click Save Changes to apply.");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={true}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card/95 backdrop-blur-xl border border-border text-card-foreground rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl space-y-6"
        >
          {/* Header */}
          <DialogHeader className="pr-8">
            <DialogTitle className="text-lg font-black font-heading tracking-wide uppercase text-foreground">
              EDIT DELIVERY
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Update the cover, manage assets, or delete this delivery.
            </DialogDescription>
          </DialogHeader>

          {/* COVER THUMBNAIL */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
                COVER THUMBNAIL
              </span>
              <button
                type="button"
                onClick={() => setIsUrlInputMode((v) => !v)}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
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
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-16 h-11 rounded-lg overflow-hidden border border-border bg-muted shrink-0 relative group">
                <img
                  src={coverThumbnailUrl}
                  alt="Cover Thumbnail"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1200&auto=format&fit=crop&q=80";
                  }}
                  className="w-full h-full object-cover"
                />
              </div>

              {isUrlInputMode ? (
                <input
                  type="url"
                  value={coverThumbnailUrl}
                  onChange={(e) => onChangeCoverUrl(e.target.value)}
                  placeholder="https://example.com/cover.jpg"
                  className="flex-1 bg-background/60 border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
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
                      className="rounded-full border-border bg-background/50 hover:bg-muted text-foreground font-bold text-xs px-3.5 py-2 cursor-pointer"
                    >
                      <Crop className="size-3.5 mr-1.5 text-primary" /> EDIT / CROP
                    </Button>
                  )}
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Shown at the top of the delivery page. Upload and crop to 16:9 or 3:1 banner ratio.
            </p>
          </div>

          {/* ASSETS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
                ASSETS
              </span>
              <Badge variant="outline" className="text-[10px] font-mono">
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

          {/* Action Buttons */}
          <DialogFooter className="flex-col gap-2.5 pt-2 sm:flex-col sm:justify-start -mx-6 -mb-6 p-6">
            <Button
              type="button"
              onClick={onSaveChanges}
              className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs py-3.5 h-auto shadow-lg shadow-primary/20 cursor-pointer"
            >
              <Check className="size-4 mr-1.5" /> SAVE CHANGES
            </Button>

            <Button
              type="button"
              onClick={onDeleteDelivery}
              variant="outline"
              className="w-full rounded-full border-destructive/30 text-destructive bg-destructive/10 hover:bg-destructive/20 font-bold text-xs py-3 h-auto cursor-pointer"
            >
              <Trash2 className="size-3.5 mr-1.5" /> Delete delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageCropEditorDialog
        isOpen={cropState.isOpen}
        onClose={() => setCropState((prev) => ({ ...prev, isOpen: false }))}
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
