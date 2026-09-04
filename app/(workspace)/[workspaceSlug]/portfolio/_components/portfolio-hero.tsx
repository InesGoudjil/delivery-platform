"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Upload,
  Plus,
  Edit3,
  Camera,
  ExternalLink,
  Share2,
  Video,
  Globe,
  X,
  FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppImage } from "@/components/ui/app-image";
import { VideoUploader } from "@/components/workspaces/video-uploader";
import { updatePortfolioAction } from "@/app/actions/portfolio";
import { createWorkspaceProjectAction } from "@/app/actions/projects";
import { SocialLinks } from "@/core/entities/portfolio";
import { PortfolioItem } from "../portfolio-client";

interface PortfolioHeroProps {
  workspace: {
    id: string;
    brandName: string;
    slug: string;
  };
  portfolio: {
    id: string;
    title: string;
    bio?: string | null;
    coverAssetUrl?: string | null;
    socialLinks?: SocialLinks;
  };
  onProjectCreated?: (newItem: PortfolioItem) => void;
  showFlash: (msg: string) => void;
}

export function PortfolioHero({
  workspace,
  portfolio,
  onProjectCreated,
  showFlash,
}: PortfolioHeroProps) {
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(
    portfolio.title || `${workspace.brandName} Portfolio`
  );
  const [bio, setBio] = useState(
    portfolio.bio ||
      "Filmmaker & creative director specializing in films, commercials, and launch content — every frame, every cut, crafted with precision."
  );
  const [coverAssetUrl, setCoverAssetUrl] = useState(portfolio.coverAssetUrl || "");
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(
    portfolio.socialLinks || {}
  );

  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [uploaderProjectId, setUploaderProjectId] = useState("");
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");

  const handleOpenUploader = (targetProjectId: string = "") => {
    setUploaderProjectId(targetProjectId);
    setShowUploader(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updatePortfolioAction(portfolio.id, {
        title,
        bio,
        coverAssetUrl: coverAssetUrl || null,
        socialLinks,
      });
      if (res.success) {
        setShowProfileModal(false);
        showFlash("Profile & Social Links saved!");
      } else {
        showFlash("Failed to save profile.");
      }
    });
  };

  const handleCreateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;

    startTransition(async () => {
      const res = await createWorkspaceProjectAction(
        workspace.id,
        newProjectTitle,
        newProjectDesc
      );

      if (res.success && res.project) {
        setShowCreateProjectModal(false);
        const createdItem: PortfolioItem = {
          id: res.project.id,
          title: res.project.title,
          category: "Commercial Project",
          type: "project",
          assetCount: 0,
          thumbnailUrl: "",
        };

        if (onProjectCreated) {
          onProjectCreated(createdItem);
        }

        setNewProjectTitle("");
        setNewProjectDesc("");

        // Open Uploader attached to this new Project ID
        setUploaderProjectId(res.project.id);
        setShowUploader(true);
        showFlash(`Project "${res.project.title}" created! Uploading assets...`);
      } else {
        showFlash(res.error || "Failed to create project.");
      }
    });
  };

  return (
    <>
      {/* Direct Upload Drawer Modal */}
      {showUploader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#141416] border border-white/15 rounded-2xl p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setShowUploader(false)}
              className="absolute top-4 right-4 text-[#8e8e93] hover:text-white transition-colors"
            >
              <X className="size-5" />
            </button>
            <VideoUploader
              workspaceId={workspace.id}
              projectId={uploaderProjectId}
              onUploadComplete={(asset) => {
                setShowUploader(false);
                showFlash(`Master "${asset.title}" uploaded!`);
              }}
            />
          </div>
        </div>
      )}

      {/* Create Project Container Modal */}
      {showCreateProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-[#141416] border border-white/15 rounded-2xl p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setShowCreateProjectModal(false)}
              className="absolute top-4 right-4 text-[#8e8e93] hover:text-white transition-colors"
            >
              <X className="size-5" />
            </button>
            <h3 className="text-base font-bold text-[#f6f3ec] flex items-center gap-2">
              <FolderKanban className="size-4 text-[#f5551d]" />
              Create Project Container
            </h3>
            <p className="text-xs text-[#8e8e93]">
              Group multiple video cuts and photo stills into a single commercial or client project.
            </p>

            <form onSubmit={handleCreateProjectSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[#8e8e93] font-medium">Project Title</label>
                <input
                  type="text"
                  placeholder="e.g. Porsche GT3 Launch Film & Stills"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  className="w-full bg-[#0c0c0e] border border-white/10 rounded-xl px-3.5 py-2 text-[#f6f3ec] focus:outline-none focus:border-[#f5551d]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#8e8e93] font-medium">Client / Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Client: Porsche Middle East. Commercial launch campaign."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full bg-[#0c0c0e] border border-white/10 rounded-xl px-3.5 py-2 text-[#f6f3ec] focus:outline-none focus:border-[#f5551d] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateProjectModal(false)}
                  className="rounded-xl text-xs text-[#8e8e93]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-[#f5551d] text-black font-bold text-xs hover:bg-[#ff8a45]"
                >
                  {isPending ? "Creating..." : "Create & Start Upload"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile & Socials Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-xl bg-[#141416] border border-white/15 rounded-2xl p-6 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 text-[#8e8e93] hover:text-white transition-colors"
            >
              <X className="size-5" />
            </button>
            <h3 className="text-base font-bold text-[#f6f3ec] flex items-center gap-2">
              <Edit3 className="size-4 text-[#f5551d]" />
              Edit Profile &amp; Social Links
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[#8e8e93] font-medium">Display Title / Studio Name</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#0c0c0e] border border-white/10 rounded-xl px-3.5 py-2 text-[#f6f3ec] focus:outline-none focus:border-[#f5551d]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#8e8e93] font-medium">Bio &amp; Introduction</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-[#0c0c0e] border border-white/10 rounded-xl px-3.5 py-2 text-[#f6f3ec] focus:outline-none focus:border-[#f5551d] resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#8e8e93] font-medium">Avatar / Cover Image URL</label>
                <input
                  type="url"
                  value={coverAssetUrl}
                  onChange={(e) => setCoverAssetUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#0c0c0e] border border-white/10 rounded-xl px-3.5 py-2 text-[#f6f3ec] focus:outline-none focus:border-[#f5551d]"
                />
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-[#8e8e93] font-semibold block uppercase text-[10px] tracking-wider">
                  Social Links
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="url"
                    placeholder="Instagram URL"
                    value={socialLinks.instagram || ""}
                    onChange={(e) =>
                      setSocialLinks({ ...socialLinks, instagram: e.target.value })
                    }
                    className="bg-[#0c0c0e] border border-white/10 rounded-xl px-3 py-1.5 text-[#f6f3ec] focus:outline-none focus:border-[#f5551d]"
                  />
                  <input
                    type="url"
                    placeholder="YouTube URL"
                    value={socialLinks.youtube || ""}
                    onChange={(e) =>
                      setSocialLinks({ ...socialLinks, youtube: e.target.value })
                    }
                    className="bg-[#0c0c0e] border border-white/10 rounded-xl px-3 py-1.5 text-[#f6f3ec] focus:outline-none focus:border-[#f5551d]"
                  />
                  <input
                    type="url"
                    placeholder="Vimeo URL"
                    value={socialLinks.vimeo || ""}
                    onChange={(e) =>
                      setSocialLinks({ ...socialLinks, vimeo: e.target.value })
                    }
                    className="bg-[#0c0c0e] border border-white/10 rounded-xl px-3 py-1.5 text-[#f6f3ec] focus:outline-none focus:border-[#f5551d]"
                  />
                  <input
                    type="url"
                    placeholder="Website URL"
                    value={socialLinks.website || ""}
                    onChange={(e) =>
                      setSocialLinks({ ...socialLinks, website: e.target.value })
                    }
                    className="bg-[#0c0c0e] border border-white/10 rounded-xl px-3 py-1.5 text-[#f6f3ec] focus:outline-none focus:border-[#f5551d]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowProfileModal(false)}
                  className="rounded-xl text-xs text-[#8e8e93]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-[#f5551d] text-black font-bold text-xs hover:bg-[#ff8a45]"
                >
                  {isPending ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Profile Hero Section */}
      <section className="relative rounded-3xl bg-gradient-to-b from-[#1c1c20] to-[#141416] border border-white/10 p-6 md:p-8 shadow-2xl overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative size-16 sm:size-20 rounded-2xl overflow-hidden border-2 border-[#f5551d] shadow-lg shrink-0 bg-black/60 flex items-center justify-center text-[#f5551d]">
              <AppImage
                src={coverAssetUrl}
                alt={title}
                fallbackIcon="camera"
                containerClassName="size-full"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-[#f6f3ec] tracking-tight">
                  {title}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#f5551d]/15 text-[#f5551d] border border-[#f5551d]/30">
                  PUBLIC STOREFRONT
                </span>
              </div>
              <p className="text-xs text-[#a1a1aa] max-w-2xl leading-relaxed">{bio}</p>

              {/* Social Links Row */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {socialLinks.instagram && (
                  <a
                    href={socialLinks.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
                  >
                    <Share2 className="size-3 text-[#f5551d]" /> Instagram
                  </a>
                )}
                {socialLinks.youtube && (
                  <a
                    href={socialLinks.youtube}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
                  >
                    <Video className="size-3 text-[#f5551d]" /> YouTube
                  </a>
                )}
                {socialLinks.vimeo && (
                  <a
                    href={socialLinks.vimeo}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
                  >
                    <Video className="size-3 text-[#f5551d]" /> Vimeo
                  </a>
                )}
                {socialLinks.website && (
                  <a
                    href={socialLinks.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
                  >
                    <Globe className="size-3 text-[#f5551d]" /> Website
                  </a>
                )}

                <Link
                  href={`/p/${workspace.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#f5551d]/20 text-[#f5551d] hover:bg-[#f5551d]/30 border border-[#f5551d]/40 transition-colors ml-auto sm:ml-0"
                >
                  <ExternalLink className="size-3" /> Preview Public Page
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 border-t md:border-t-0 border-white/10 pt-4 md:pt-0">
            <Button
              onClick={() => setShowProfileModal(true)}
              variant="outline"
              className="rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-[#f6f3ec] text-xs font-semibold px-3.5 py-2 cursor-pointer h-9"
            >
              <Edit3 className="size-3.5 mr-1.5 text-[#f5551d]" /> Edit Profile
            </Button>

            {/* Button 1: Standalone Asset Upload (Film or Still) */}
            <Button
              onClick={() => handleOpenUploader("")}
              variant="outline"
              className="rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-[#f6f3ec] text-xs font-semibold px-3.5 py-2 cursor-pointer transition-all duration-150 h-9"
            >
              <Upload className="size-3.5 mr-1.5 text-[#f5551d]" />
              <span>UPLOAD FILM OR STILL</span>
            </Button>

            {/* Button 2: Create Multi-Asset Project Container */}
            <Button
              onClick={() => setShowCreateProjectModal(true)}
              className="rounded-xl bg-gradient-to-r from-[#d9481d] to-[#992e10] hover:from-[#f5551d] hover:to-[#ff8a45] text-white font-bold text-xs uppercase px-4 py-2 shadow-lg shadow-[#d9481d]/20 transition-all duration-200 cursor-pointer h-9 gap-1.5"
            >
              <Plus className="size-4 stroke-[3]" />
              <span>UPLOAD A PROJECT</span>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
