"use client";

import React, { useState, useEffect, useRef } from "react";
import { UploadCloud, Loader2, Image as ImageIcon, Link as LinkIcon, Crop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TypographyMuted, TypographySpan } from "@/components/ui/typography";
import { UniversalDialog } from "@/components/ui/universal-dialog";
import { requestAssetUploadAction } from "@/app/actions/upload";
import { createUploadProgressToast } from "@/lib/upload-toast";
import {
  ImageCropEditorDialog,
  ImageCropResult,
  CropAspectRatioPreset,
} from "@/components/ui/image-crop-editor-dialog";
import {
  ASPECT_RATIO_PRESETS,
  ASPECT_RATIO_BY_ID,
  parseAspectRatio,
  type AspectRatioId,
} from "@/lib/media-ratios";

export interface EditableAssetItem {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  thumbnailUrl?: string | null;
  aspectRatio?: string | null;
  type?: string | null;
}

interface EditAssetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: EditableAssetItem | null;
  workspaceId?: string;
  onSave: (updated: {
    id: string;
    title: string;
    description?: string;
    category?: string;
    thumbnailUrl?: string;
    aspectRatio?: string;
  }) => Promise<void> | void;
  isSaving?: boolean;
  dialogTitle?: string;
}

const ASPECT_RATIO_IDS: string[] = ASPECT_RATIO_PRESETS.map((p) => p.id);

export function EditAssetDialog({
  isOpen,
  onClose,
  item,
  workspaceId,
  onSave,
  isSaving = false,
  dialogTitle,
}: EditAssetDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");

  const [isUrlMode, setIsUrlMode] = useState(false);
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [cropState, setCropState] = useState<{
    isOpen: boolean;
    imageSrc: string | null;
    fileName: string;
  }>({
    isOpen: false,
    imageSrc: null,
    fileName: "asset-thumbnail.jpg",
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (item) {
      setTitle(item.title || "");
      setDescription(item.description || "");
      setCategory(item.category || "");
      setThumbnailUrl(item.thumbnailUrl || "");
      setAspectRatio(item.aspectRatio || "16:9");
      setLocalError(null);
      setIsUrlMode(false);
    }
  }, [item, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleEditCurrentThumbnail = () => {
    if (!thumbnailUrl) return;
    setCropState({
      isOpen: true,
      imageSrc: thumbnailUrl,
      fileName: `${(title || item?.title || "asset").replace(/\s+/g, "-").toLowerCase()}-thumb.jpg`,
    });
  };

  const handleApplyThumbnailCrop = async (result: ImageCropResult) => {
    const { file, dataUrl, aspectRatio: chosenRatio } = result;
    const nextRatio = ASPECT_RATIO_IDS.includes(chosenRatio) ? chosenRatio : aspectRatio;
    setAspectRatio(nextRatio);
    setThumbnailUrl(dataUrl);

    if (item && (title.trim() || item.title)) {
      setIsUploadingThumb(true);
      setLocalError(null);
      const uploadToast = createUploadProgressToast(`edit-thumb-${Date.now()}`);
      uploadToast.start(
        `Saving cropped thumbnail "${file.name}"...`,
        "Persisting thumbnail cover to database..."
      );
      try {
        uploadToast.update({
          title: `Saving cropped thumbnail "${file.name}"`,
          progress: 70,
          loadedBytes: Math.round(file.size * 0.7),
          totalBytes: file.size,
        });
        await onSave({
          id: item.id,
          title: title.trim() || item.title,
          description: description.trim(),
          category: category.trim(),
          thumbnailUrl: dataUrl,
          aspectRatio: nextRatio,
        });
        uploadToast.success(
          "Thumbnail cropped & saved!",
          `"${title.trim() || item.title}" cover has been updated.`
        );
      } catch (err: any) {
        const errMsg = err?.message || "Failed to persist cropped thumbnail.";
        setLocalError(errMsg);
        uploadToast.error("Thumbnail save failed", errMsg);
      } finally {
        setIsUploadingThumb(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !title.trim()) {
      setLocalError("Title cannot be empty.");
      return;
    }

    try {
      setLocalError(null);
      await onSave({
        id: item.id,
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        thumbnailUrl: thumbnailUrl.trim(),
        aspectRatio,
      });
      onClose();
    } catch (err: any) {
      setLocalError(err.message || "Failed to save changes.");
    }
  };

  const computedTitle = dialogTitle || (item?.type === "project" ? "EDIT PROJECT" : "EDIT ASSET");

  return (
    <>
      <UniversalDialog
        open={isOpen}
        onOpenChange={(open) => !open && onClose()}
        size="lg"
        title={computedTitle}
        description="Update title, thumbnail cover, description, or display format."
      >
        {localError && (
          <div className="p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
            {localError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* TITLE */}
          <div className="space-y-1.5">
            <label className="text-[10px]  text-muted-foreground uppercase tracking-widest block">
              TITLE *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master Cut v2"
              required
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-muted-foreground focus:outline-none focus:border-white/40 transition-colors"
            />
          </div>

          {/* THUMBNAIL COVER */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px]  text-muted-foreground uppercase tracking-widest">
                THUMBNAIL COVER
              </label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setIsUrlMode(!isUrlMode)}
                className="text-[11px] text-muted-foreground hover:text-white flex items-center gap-1 transition-colors cursor-pointer h-auto p-0 hover:bg-transparent"
              >
                {isUrlMode ? (
                  <>
                    <UploadCloud className="size-3" /> Upload File
                  </>
                ) : (
                  <>
                    <LinkIcon className="size-3" /> Enter Image URL
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-3.5">
              {/* Preview Thumbnail Box */}
              <div className="relative w-24 h-16 rounded-xl overflow-hidden border border-white/15 bg-black/60 shrink-0 flex items-center justify-center group">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt="Thumbnail Preview"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src =
                        "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1200&auto=format&fit=crop&q=80";
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="size-6 text-white/30" />
                )}

                {isUploadingThumb && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <Loader2 className="size-5 text-white animate-spin" />
                  </div>
                )}
              </div>

              {/* Action: Upload File or Direct URL input */}
              <div className="flex-1 min-w-0">
                {isUrlMode ? (
                  <input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://example.com/cover.jpg"
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-muted-foreground focus:outline-none focus:border-white/40 transition-colors"
                  />
                ) : (
                  <div className="space-y-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingThumb}
                        className="rounded-full border-white/20 bg-black/40 hover:bg-white/10 text-white font-bold text-xs px-3.5 py-2 cursor-pointer"
                      >
                        {isUploadingThumb ? (
                          <>
                            <Loader2 className="size-3.5 mr-1.5 animate-spin" /> Uploading...
                          </>
                        ) : (
                          <>
                            <UploadCloud className="size-3.5 mr-1.5" /> Choose New Image
                          </>
                        )}
                      </Button>
                      {thumbnailUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleEditCurrentThumbnail}
                          disabled={isUploadingThumb}
                          className="rounded-full border-white/20 bg-black/40 hover:bg-white/10 text-white font-bold text-xs px-3.5 py-2 cursor-pointer"
                        >
                          <Crop className="size-3.5 mr-1.5 text-primary" /> Edit / Crop
                        </Button>
                      )}
                    </div>
                    <TypographyMuted className="text-[10px] text-muted-foreground">
                      PNG, JPG, WebP supported. Crop &amp; adjust before saving.
                    </TypographyMuted>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="space-y-1.5">
            <label className="text-[10px]  text-muted-foreground uppercase tracking-widest block">
              DESCRIPTION / NOTES
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add project details, version notes, or director thoughts..."
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-muted-foreground focus:outline-none focus:border-white/40 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* CATEGORY */}
            <div className="space-y-1.5">
              <label className="text-[10px]  text-muted-foreground uppercase tracking-widest block">
                CATEGORY
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Commercial, Stills"
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-muted-foreground focus:outline-none focus:border-white/40 transition-colors"
              />
            </div>

            {/* ASPECT RATIO */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px]  text-muted-foreground uppercase tracking-widest block">
                  ASPECT RATIO
                </label>
                <TypographySpan className="text-[10px]  text-primary font-semibold">
                  {ASPECT_RATIO_BY_ID[aspectRatio as AspectRatioId]?.label || aspectRatio}
                </TypographySpan>
              </div>

              <div className="space-y-2">
                <div>
                  <TypographySpan className="text-[9px] uppercase tracking-wider text-muted-foreground/70 block mb-1">
                    Desktop & Broadcast
                  </TypographySpan>
                  <div className="grid grid-cols-2 gap-1.5">
                    {["16:9", "16:10"].map((ratio) => (
                      <Button
                        key={ratio}
                        type="button"
                        variant={aspectRatio === ratio ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setAspectRatio(ratio)}
                        className={`py-1.5 text-xs  rounded-lg border transition-colors cursor-pointer text-center h-auto ${
                          aspectRatio === ratio
                            ? "bg-primary text-primary-foreground font-bold border-primary hover:bg-primary/90"
                            : "bg-white/5 border-white/10 text-muted-foreground hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {ratio}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <TypographySpan className="text-[9px] uppercase tracking-wider text-muted-foreground/70 block mb-1">
                    Mobile & Social
                  </TypographySpan>
                  <div className="grid grid-cols-3 gap-1.5">
                    {["1:1", "4:5", "9:16"].map((ratio) => (
                      <Button
                        key={ratio}
                        type="button"
                        variant={aspectRatio === ratio ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setAspectRatio(ratio)}
                        className={`py-1.5 text-xs  rounded-lg border transition-colors cursor-pointer text-center h-auto ${
                          aspectRatio === ratio
                            ? "bg-primary text-primary-foreground font-bold border-primary hover:bg-primary/90"
                            : "bg-white/5 border-white/10 text-muted-foreground hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {ratio}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <TypographySpan className="text-[9px] uppercase tracking-wider text-muted-foreground/70 block mb-1">
                    Cinema Widescreen
                  </TypographySpan>
                  <div className="grid grid-cols-3 gap-1.5">
                    {["2.39:1", "2:1", "1.85:1"].map((ratio) => (
                      <Button
                        key={ratio}
                        type="button"
                        variant={aspectRatio === ratio ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setAspectRatio(ratio)}
                        className={`py-1.5 text-[11px]  rounded-lg border transition-colors cursor-pointer text-center h-auto ${
                          aspectRatio === ratio
                            ? "bg-primary text-primary-foreground font-bold border-primary hover:bg-primary/90"
                            : "bg-white/5 border-white/10 text-muted-foreground hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {ratio}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <TypographySpan className="text-[9px] uppercase tracking-wider text-muted-foreground/70 block mb-1">
                    Photography & Classic Film
                  </TypographySpan>
                  <div className="grid grid-cols-2 gap-1.5">
                    {["3:2", "4:3"].map((ratio) => (
                      <Button
                        key={ratio}
                        type="button"
                        variant={aspectRatio === ratio ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setAspectRatio(ratio)}
                        className={`py-1.5 text-xs  rounded-lg border transition-colors cursor-pointer text-center h-auto ${
                          aspectRatio === ratio
                            ? "bg-primary text-primary-foreground font-bold border-primary hover:bg-primary/90"
                            : "bg-white/5 border-white/10 text-muted-foreground hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {ratio}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSaving || isUploadingThumb}
              className="rounded-full text-muted-foreground hover:text-white hover:bg-white/5 cursor-pointer text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || isUploadingThumb}
              className="rounded-full bg-white hover:bg-white/90 text-black font-bold text-xs px-6 py-2 cursor-pointer transition-all shadow-md active:scale-95"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3.5 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </UniversalDialog>

      <ImageCropEditorDialog
        isOpen={cropState.isOpen}
        onClose={() => setCropState((prev) => ({ ...prev, isOpen: false }))}
        imageSrc={cropState.imageSrc}
        title="EDIT & CROP ASSET THUMBNAIL"
        subtitle="Frame, zoom, rotate, or adjust tone for this asset's thumbnail cover."
        defaultAspectRatio={
          (["16:9", "16:10", "4:5", "9:16", "1:1", "4:3", "2.39:1", "3:1"].includes(aspectRatio)
            ? aspectRatio
            : "16:9") as CropAspectRatioPreset
        }
        aspectRatioOptions={["16:9", "16:10", "4:5", "9:16", "1:1", "4:3", "2.39:1", "3:1"]}
        outputFileName={cropState.fileName}
        onApply={handleApplyThumbnailCrop}
      />
    </>
  );
}
