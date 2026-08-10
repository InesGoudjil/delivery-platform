"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Save, Globe, Palette, FileText } from "lucide-react";

export default function PortfolioPage() {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;

  const [title, setTitle] = useState("My Portfolio");
  const [bio, setBio] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Portfolio Management</h1>
        <p className="text-sm text-dim mt-1">
          Customize your public portfolio page at{" "}
          <code className="text-orange bg-bg3 px-1.5 py-0.5 rounded text-xs">cut.ae/p/{workspaceSlug}</code>
        </p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-sm font-semibold rounded-xl flex items-center gap-2">
          <Save className="w-4 h-4" /> Portfolio updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="bg-bg2 border border-line p-6 md:p-8 rounded-2xl space-y-6">
        <div>
          <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-2">
            Portfolio Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-bg3 border border-line rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-orange"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-2">
            About / Bio
          </label>
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell visitors about your work..."
            className="w-full bg-bg3 border border-line rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-orange resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-3">
            Visibility
          </label>
          <button
            type="button"
            onClick={() => setIsPublished(!isPublished)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition ${
              isPublished
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                : "bg-bg3 border-line text-dim"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            {isPublished ? "Published" : "Hidden"}
          </button>
        </div>

        <div className="pt-6 border-t border-line">
          <button type="submit" className="btn px-6 py-3 rounded-full font-bold text-sm shadow-lg shadow-orange/20">
            <Save className="w-4 h-4" /> Save Portfolio
          </button>
        </div>
      </form>
    </div>
  );
}
