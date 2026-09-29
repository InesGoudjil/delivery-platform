"use client";

import { UploadCloud, Plus, Check, Trash2, Pencil } from "lucide-react";
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
  return (
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
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
            COVER THUMBNAIL
          </span>
          <div className="flex items-center gap-3">
            <div className="w-14 h-10 rounded-lg overflow-hidden border border-border bg-muted shrink-0">
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

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const newCover = prompt("Enter new cover image URL:", coverThumbnailUrl);
                if (newCover) onChangeCoverUrl(newCover);
              }}
              className="rounded-full border-border bg-background/50 hover:bg-muted text-foreground font-bold text-xs px-4 py-2 cursor-pointer"
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
  );
}
