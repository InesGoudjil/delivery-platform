"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus, Film, Clock, Check, ArrowRight, Share2, MessageCircle } from "lucide-react";
import { Project } from "@/types";
import { createProjectAction } from "@/app/actions/projects";

interface UIProject extends Project {
  clientName?: string;
  tc?: string;
  g?: string;
}

const INITIAL_PROJECTS: UIProject[] = [
  {
    id: "1",
    workspaceId: "w1",
    shareToken: "token-1",
    isDownloadAllowed: true,
    title: "Omakase Teaser",
    clientName: "Lost in Tokyo",
    status: "in_review",
    tc: "00:47",
    g: "linear-gradient(135deg,#3a1a10,#7a2f18)",
    description: "A moody 47-second teaser for the launch of a new omakase counter.",
    createdAt: "2026-08-01",
    updatedAt: "2026-08-01",
  },
  {
    id: "2",
    workspaceId: "w1",
    shareToken: "token-2",
    isDownloadAllowed: false,
    title: "Aisha & Omar",
    clientName: "Wedding Film",
    status: "approved",
    tc: "03:12",
    g: "linear-gradient(135deg,#1c2230,#38404e)",
    description: "A three-minute wedding film shot across two days in Dubai.",
    createdAt: "2026-07-28",
    updatedAt: "2026-07-28",
  },
  {
    id: "3",
    workspaceId: "w1",
    shareToken: "token-3",
    isDownloadAllowed: true,
    title: "GT3 Build Film",
    clientName: "Prestige Rentals",
    status: "in_review",
    tc: "01:20",
    g: "linear-gradient(135deg,#101a1c,#20403f)",
    description: "Documenting a Mercedes GT converted to full GT3 spec.",
    createdAt: "2026-07-20",
    updatedAt: "2026-07-20",
  },
  {
    id: "4",
    workspaceId: "w1",
    shareToken: "token-4",
    isDownloadAllowed: true,
    title: "Launch Reel",
    clientName: "Clean Performance",
    status: "approved",
    tc: "00:30",
    g: "linear-gradient(135deg,#3a2208,#8a4f14)",
    description: "A punchy 30-second launch reel for a healthy-snack brand.",
    createdAt: "2026-07-15",
    updatedAt: "2026-07-15",
  },
];

export default function ProjectsPage() {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;

  const [projects, setProjects] = useState<UIProject[]>(INITIAL_PROJECTS);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || creating) return;

    setCreating(true);
    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("description", client.trim() || "");

    const result = await createProjectAction(formData);

    if (result.success && result.project) {
      const project: UIProject = {
        ...result.project,
        clientName: client.trim() || "Unassigned Client",
        tc: "00:00",
        g: "linear-gradient(135deg,#1a2028,#2a3742)",
      };
      setProjects([project, ...projects]);
      setTitle("");
      setClient("");
      setShowAdd(false);
    } else {
      alert(result.error || "Failed to create project");
    }
    setCreating(false);
  };

  const getStatusBadge = (status: Project["status"]) => {
    switch (status) {
      case "in_review":
        return (
          <span className="px-3 py-1 bg-orange/20 text-orange border border-orange/30 text-xs font-semibold rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse" /> In Review
          </span>
        );
      case "approved":
        return (
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-full flex items-center gap-1.5">
            <Check className="w-3 h-3" /> Approved
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-neutral-500/20 text-neutral-400 border border-neutral-500/30 text-xs font-semibold rounded-full">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
        <div>
          <h1 className="font-display text-3xl font-bold">Projects</h1>
          <p className="text-sm text-dim mt-1">Manage cuts, track client reviews, and share delivery links</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="btn px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-orange/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg2 border border-line p-6 rounded-2xl max-w-md w-full shadow-2xl">
            <h3 className="font-display text-xl font-bold mb-4">Create New Project</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-dim uppercase mb-1">Project Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Omakase Launch Film"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-bg3 border border-line rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-orange"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-dim uppercase mb-1">Client Name</label>
                <input
                  type="text"
                  placeholder="e.g. Lost in Tokyo"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="w-full bg-bg3 border border-line rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-orange"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 text-sm font-semibold text-dim hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn px-5 py-2 text-sm font-bold rounded-full disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((proj) => (
          <div
            key={proj.id}
            className="group rounded-2xl bg-bg2 border border-line overflow-hidden hover:border-orange/40 transition flex flex-col justify-between"
          >
            <div className="h-44 relative p-6 flex flex-col justify-between" style={{ background: proj.g }}>
              <div className="flex items-center justify-between z-10">
                <span className="text-xs font-mono text-white/80 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {proj.tc}
                </span>
                {getStatusBadge(proj.status)}
              </div>

              <div className="z-10">
                <h3 className="font-display text-2xl font-bold text-white group-hover:text-orange transition">
                  {proj.title}
                </h3>
                <p className="text-xs text-white/70 mt-1">{proj.clientName}</p>
              </div>
            </div>

            <div className="p-5 flex items-center justify-between border-t border-line bg-bg2">
              <Link
                href={`/workspace/${workspaceSlug}/projects/${proj.id}`}
                className="text-xs font-semibold text-dim hover:text-ink flex items-center gap-1 transition"
              >
                Manage & Upload <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <div className="flex items-center gap-2">
                <Link
                  href={`/deliver/${proj.id}`}
                  className="p-2 rounded-lg bg-bg3 border border-line text-dim hover:text-orange transition"
                  title="Client Delivery Link"
                >
                  <Share2 className="w-4 h-4" />
                </Link>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Hi ${proj.clientName || "Client"}, here is your review cut for ${proj.title}: ${typeof window !== "undefined" ? window.location.origin : ""}/deliver/${proj.id}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition"
                  title="Share over WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
