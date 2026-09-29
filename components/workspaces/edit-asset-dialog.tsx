"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, UploadCloud, Loader2, Image as ImageIcon, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { requestAssetUploadAction } from "@/app/actions/upload";

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

const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:3"];

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show temporary local preview immediately
    const tempUrl = URL.createObjectURL(file);
    setThumbnailUrl(tempUrl);

    if (workspaceId) {
      setIsUploadingThumb(true);
      setLocalError(null);
      try {
        const initRes = await requestAssetUploadAction({
          workspaceId,
          projectId: "",
          title: `${title.trim() || item?.title || "Asset"} Thumbnail`,
          filename: file.name,
          fileSizeBytes: file.size,
          assetType: "photo_gallery",
          category: "cover",
        });

        if (initRes.success && initRes.directUpload) {
          await fetch(initRes.directUpload.uploadUrl, {
            method: initRes.directUpload.uploadType === "presigned_put" ? "PUT" : "POST",
            headers: initRes.directUpload.headers || undefined,
            body: file,
          });
          const uploadedUrl = initRes.directUpload.uploadUrl.split("?")[0];
          setThumbnailUrl(uploadedUrl);
        } else {
          setLocalError(initRes.error || "Failed to initialize image upload.");
        }
      } catch (err: any) {
        setLocalError(err.message || "Failed to upload image.");
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[#141418]/95 backdrop-blur-xl border border-white/15 text-white rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl space-y-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-black font-heading tracking-wide uppercase text-white">
              {computedTitle}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Update title, thumbnail cover, description, or display format.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-muted-foreground hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {localError && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
            {localError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* TITLE */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
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
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                THUMBNAIL COVER
              </label>
              <button
                type="button"
                onClick={() => setIsUrlMode(!isUrlMode)}
                className="text-[11px] text-muted-foreground hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
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
              </button>
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
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingThumb}
                      className="rounded-full border-white/20 bg-black/40 hover:bg-white/10 text-white font-bold text-xs px-4 py-2 cursor-pointer"
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
                    <p className="text-[10px] text-muted-foreground mt-1">
                      PNG, JPG, WebP supported. Max 10MB.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
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
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
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
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
                ASPECT RATIO
              </label>
              <div className="grid grid-cols-4 gap-1">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-1.5 text-xs font-mono rounded-lg border transition-colors cursor-pointer text-center ${
                      aspectRatio === ratio
                        ? "bg-white text-black font-bold border-white"
                        : "bg-white/5 border-white/10 text-muted-foreground hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
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
      </DialogContent>
    </Dialog>
  );
}
