"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createProjectAction } from "@/app/actions/projects";

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

    const formData = new FormData();
    formData.set("title", newTitle.trim());
    formData.set("description", newClient.trim() || "");

    const res = await createProjectAction(formData);

    if (res?.success && res.project) {
      setShowCreateModal(false);
      setNewTitle("");
      setNewClient("");
      router.push(`/${workspace.slug}/deliveries/${res.project.id}`);
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
          <div className="w-full max-w-md liquid-glass rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 text-[#aeaeb4] hover:text-[#f6f3ec] hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <div className="space-y-1">
              <span className="glass-badge font-mono text-[11px]">
                NEW REVIEW ROOM
              </span>
              <h3 className="text-xl font-bold font-display text-[#f6f3ec]">
                Create Delivery Workspace
              </h3>
              <p className="text-xs text-[#aeaeb4] font-sans">
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
                <label className="block text-xs font-semibold text-[#aeaeb4] uppercase tracking-wider mb-1.5 font-mono">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Omakase Counter Launch Film"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full glass-input text-xs rounded-xl py-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#aeaeb4] uppercase tracking-wider mb-1.5 font-mono">
                  Client / Brand Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lost in Tokyo Group"
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  className="w-full glass-input text-xs rounded-xl py-2.5"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="glass-btn-ghost cursor-pointer text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="glass-btn btn-glass-layer cursor-pointer text-xs px-5 py-2.5 font-bold"
                >
                  {creating ? "Creating..." : "Create & Upload Cut"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-1 font-semibold">
            WORKSPACE DASHBOARD
          </div>
          <h1 className="text-3xl font-bold font-display text-[#f6f3ec]">
            Client Deliveries
          </h1>
          <p className="text-sm text-[#aeaeb4] mt-1 font-sans">
            Your projects and client review links with 4K HDR streaming, timecoded feedback, and WhatsApp delivery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="glass-btn btn-glass-layer cursor-pointer text-xs px-5 py-2.5 font-bold flex items-center gap-2"
          >
            <Plus className="size-4" /> New Delivery Room
          </button>
        </div>
      </div>
    </>
  );
}
