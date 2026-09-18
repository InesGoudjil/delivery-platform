"use client";

import { X, UploadCloud, Plus, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { GalleryItem } from "./types";

interface EditDeliveryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  coverThumbnailUrl: string;
  onChangeCoverUrl: (url: string) => void;
  items: GalleryItem[];
  onDeleteItem: (itemId: string) => void;
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
  onAddAssetClick,
  onSaveChanges,
  onDeleteDelivery,
}: EditDeliveryDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[#141418]/95 backdrop-blur-xl border border-white/15 text-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl space-y-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-black font-heading tracking-wide uppercase text-white">
              EDIT DELIVERY
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Update the cover, manage assets, or delete this delivery.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-muted-foreground hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* COVER THUMBNAIL */}
        <div className="space-y-3">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
            COVER THUMBNAIL
          </span>
          <div className="flex items-center gap-3">
            <div className="w-14 h-10 rounded-lg overflow-hidden border border-white/15 bg-black shrink-0">
              <img
                src={coverThumbnailUrl}
                alt="Cover Thumbnail"
                className="w-full h-full object-cover"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const newCover = prompt("Enter new cover image URL:", coverThumbnailUrl);
                if (newCover) onChangeCoverUrl(newCover);
              }}
              className="rounded-full border-white/20 bg-black/40 hover:bg-white/10 text-white font-bold text-xs px-4 py-2 cursor-pointer"
            >
              <UploadCloud className="size-3.5 mr-1.5" /> CHANGE COVER
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Shown at the top of the delivery page.
          </p>
        </div>

        {/* ASSETS */}
        <div className="space-y-3">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
            ASSETS ({items.length})
          </span>

          <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="aspect-square rounded-xl overflow-hidden border border-white/10 relative group bg-black"
              >
                <img
                  src={item.src}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onDeleteItem(item.id)}
                  className="absolute top-1.5 right-1.5 size-5 rounded-full bg-black/70 text-white hover:bg-red-500 flex items-center justify-center transition-colors cursor-pointer"
                  title="Remove asset"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}

            {/* Add Asset dashed tile */}
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onAddAssetClick();
              }}
              className="aspect-square rounded-xl border border-dashed border-white/20 hover:border-[#f5551d] bg-black/40 flex items-center justify-center text-muted-foreground hover:text-white transition-colors cursor-pointer"
            >
              <Plus className="size-6" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <Button
            type="button"
            onClick={onSaveChanges}
            className="w-full rounded-full bg-[#f5551d] hover:bg-[#ff8a45] text-black font-extrabold text-xs py-3.5 h-auto shadow-lg shadow-[#f5551d]/20 cursor-pointer"
          >
            <Check className="size-4 mr-1.5" /> SAVE CHANGES
          </Button>

          <Button
            type="button"
            onClick={onDeleteDelivery}
            variant="outline"
            className="w-full rounded-full border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 font-bold text-xs py-3 h-auto cursor-pointer"
          >
            <Trash2 className="size-3.5 mr-1.5" /> Delete delivery
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
