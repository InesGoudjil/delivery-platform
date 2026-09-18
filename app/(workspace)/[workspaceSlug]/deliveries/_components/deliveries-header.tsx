"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createDeliveryAction } from "@/app/actions/deliveries";

interface DeliveriesHeaderProps {
  workspace: {
    id: string;
    brandName: string;
    slug: string;
  };
}

export function DeliveriesHeader({ workspace }: DeliveriesHeaderProps) {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newClient, setNewClient] = useState("");
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || creating) return;

    setCreating(true);
    setErrorMessage(null);

    const res = await createDeliveryAction(
      workspace.id,
      newTitle.trim(),
      undefined,
      newClient.trim() || undefined
    );

    if (res?.success && (res.delivery || res.project)) {
      const createdId = res.delivery?.id || res.project?.id;
      setShowCreateModal(false);
      setNewTitle("");
      setNewClient("");
      router.push(`/${workspace.slug}/deliveries/${createdId}`);
    } else {
      setErrorMessage(res?.error || "Failed to create project delivery room.");
    }
    setCreating(false);
  };

  return (
    <>
      {/* Create Delivery Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-card rounded-3xl p-6 sm:p-8 border border-border shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 size-8 rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <div className="space-y-1">
              <span className="glass-badge font-mono text-[11px]">
                NEW REVIEW ROOM
              </span>
              <h3 className="text-xl font-bold font-display text-card-foreground">
                Create Delivery Workspace
              </h3>
              <p className="text-xs text-muted-foreground font-sans">
                Set up a dedicated 4K review workspace for your client.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 font-mono">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Omakase Counter Launch Film"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-muted border border-border text-foreground text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 font-mono">
                  Client / Brand Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lost in Tokyo Group"
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  className="w-full bg-muted border border-border text-foreground text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs rounded-full border border-border text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-primary hover:bg-primary/90 text-black font-bold text-xs px-5 py-2.5 rounded-full cursor-pointer transition-colors shadow-md disabled:opacity-60"
                >
                  {creating ? "Creating..." : "Create & Upload Cut"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-1 font-semibold">
            WORKSPACE DASHBOARD
          </div>
          <h1 className="text-3xl font-bold font-display text-foreground">
            Client Deliveries
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-sans">
            Your projects and client review links with 4K HDR streaming, timecoded feedback, and WhatsApp delivery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary hover:bg-primary/90 text-black font-bold text-xs px-5 py-2.5 rounded-full cursor-pointer transition-colors shadow-md flex items-center gap-2"
          >
            <Plus className="size-4" /> New Delivery Room
          </button>
        </div>
      </div>
    </>
  );
}
