"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateDeliveryDetailsAction } from "@/app/actions/deliveries";

interface DeliveryProjectDetailsCardProps {
  projectId: string;
  initialTitle: string;
  initialClientName: string;
  initialDescription: string;
  onSaved: (title: string, clientName: string, description: string) => void;
  triggerToast: (msg: string) => void;
}

export function DeliveryProjectDetailsCard({
  projectId,
  initialTitle,
  initialClientName,
  initialDescription,
  onSaved,
  triggerToast,
}: DeliveryProjectDetailsCardProps) {
  const [title, setTitle] = useState(initialTitle);
  const [clientName, setClientName] = useState(initialClientName);
  const [description, setDescription] = useState(initialDescription);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateDeliveryDetailsAction(projectId, {
        title,
        clientName,
        description,
      });
      if (res.success) {
        onSaved(title, clientName, description);
        triggerToast("Delivery details updated successfully");
      } else {
        triggerToast(res.error || "Failed to update delivery details");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-[#121215] border border-white/10 p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h3 className="text-base font-bold font-heading text-white">Project details</h3>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          size="sm"
          className="rounded-full bg-[#f5551d] text-black font-bold text-xs hover:bg-[#ff8a45] cursor-pointer"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="space-y-5 text-xs">
        <div className="space-y-2">
          <label className="text-muted-foreground font-mono block">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-4 py-3 text-white font-medium text-sm focus:outline-none focus:border-[#f5551d] transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="text-muted-foreground font-mono block">Client</label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-4 py-3 text-white font-medium text-sm focus:outline-none focus:border-[#f5551d] transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="text-muted-foreground font-mono block">
            Description (shows on your public page)
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-4 py-3 text-white font-medium text-sm focus:outline-none focus:border-[#f5551d] transition-colors resize-y"
          />
        </div>
      </div>
    </div>
  );
}
