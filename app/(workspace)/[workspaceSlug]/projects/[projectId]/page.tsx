"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  Play,
  Send,
  Link2,
  MessageCircle,
  Film,
  Sparkles,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoUploader } from "@/components/workspaces/video-uploader";

export default function ProjectDetailPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "studio";
  const projectId = (params?.projectId as string) || "1";

  const [showUploader, setShowUploader] = useState(false);
  const [version, setVersion] = useState("V2");
  const [reply, setReply] = useState("");
  const [comments, setComments] = useState([
    {
      id: "c1",
      who: "client",
      meta: "Lost in Tokyo · 2h ago",
      text: "Love this cut! Can we make the intro a touch faster?",
    },
    {
      id: "c2",
      who: "me",
      meta: "You · 1h ago",
      text: "On it — uploading V3 shortly with color balance tweaks.",
    },
  ]);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;

    setComments([
      ...comments,
      {
        id: Date.now().toString(),
        who: "me",
        meta: "You · Just now",
        text: reply.trim(),
      },
    ]);
    setReply("");
  };

  const handleUploadDone = (asset: any) => {
    setVersion(asset.title || "V3");
    setShowUploader(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Top Back Navigation & Review Link */}
      <div className="flex items-center justify-between">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-xs font-semibold text-muted-foreground hover:text-foreground -ml-2.5 rounded-full"
        >
          <Link href={`/${workspaceSlug}/projects`}>
            <ArrowLeft className="size-4 mr-1.5" /> Back to Projects
          </Link>
        </Button>

        <div className="flex items-center gap-3">
          <Button
            asChild
            className="rounded-full bg-[#f5551d] text-black font-bold text-xs hover:bg-[#ff8a45] shadow-lg shadow-[#f5551d]/20 cursor-pointer"
          >
            <Link href={`/deliver/${projectId}`} target="_blank">
              <Link2 className="size-3.5 mr-1.5" /> Preview Delivery Room
            </Link>
          </Button>
        </div>
      </div>

      {/* Project Meta Card */}
      <div className="rounded-2xl bg-card border border-border p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#f5551d]/15 text-[#f5551d] border border-[#f5551d]/30 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#f5551d] animate-pulse" />
              In Review
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              ID: {projectId}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-card-foreground">
            Omakase Counter Launch Film
          </h1>
          <p className="text-xs text-muted-foreground">
            Client: <span className="text-foreground font-medium">Lost in Tokyo</span> · 47-second promotional commercial cut
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowUploader(!showUploader)}
            variant={showUploader ? "outline" : "default"}
            className={`rounded-full text-xs font-bold cursor-pointer transition-all ${
              showUploader
                ? "border-primary text-primary"
                : "bg-primary text-black hover:bg-primary/90 shadow-md shadow-primary/20"
            }`}
          >
            <Upload className="size-3.5 mr-1.5" />
            {showUploader ? "Close Uploader" : "Upload New Cut (Up to 5GB)"}
          </Button>
        </div>
      </div>

      {/* Direct Cloudflare Video Uploader Area */}
      {showUploader && (
        <div className="animate-in fade-in slide-in-from-top-3 duration-200">
          <VideoUploader
            workspaceId={workspaceSlug}
            projectId={projectId}
            onUploadComplete={handleUploadDone}
          />
        </div>
      )}

      {/* Player Preview and Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="aspect-video bg-black rounded-2xl border border-border relative overflow-hidden flex items-center justify-center group shadow-xl">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40"
              style={{ backgroundImage: "url('/images/hero.jpg')" }}
            />
            <div className="relative z-10 size-16 rounded-full bg-[#f5551d] text-black flex items-center justify-center cursor-pointer shadow-2xl group-hover:scale-110 transition-transform">
              <Play className="size-6 fill-current ml-0.5" />
            </div>
            <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between bg-black/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-xs">
              <span className="font-mono text-muted-foreground">Duration: 00:47 (4K HDR)</span>
              <span className="font-bold text-[#f5551d]">Playing Cut {version}</span>
            </div>
          </div>

          <div className="flex items-center justify-between bg-card border border-border p-4 rounded-2xl shadow-sm">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Version History:
            </span>
            <div className="flex gap-2">
              {["V1", "V2", "Final"].map((v) => (
                <button
                  key={v}
                  onClick={() => setVersion(v)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    version === v
                      ? "bg-primary text-black"
                      : "bg-muted text-muted-foreground hover:text-foreground border border-border"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Client Notes & Feedback Feed */}
        <div className="rounded-2xl bg-card border border-border p-5 flex flex-col justify-between h-[450px] shadow-sm">
          <div>
            <h3 className="font-heading font-bold text-sm text-card-foreground mb-3 flex items-center gap-2 pb-2 border-b border-border">
              <MessageCircle className="size-4 text-primary" />
              <span>Client Notes ({comments.length})</span>
            </h3>

            <div className="space-y-3 overflow-y-auto max-h-[290px] pr-1">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className={`p-3 rounded-xl text-xs space-y-1 ${
                    c.who === "client"
                      ? "bg-muted border border-border text-foreground"
                      : "bg-primary/10 border border-primary/20 text-foreground ml-3"
                  }`}
                >
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {c.meta}
                  </div>
                  <p className="leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSendReply} className="pt-3 border-t border-border flex gap-2">
            <input
              type="text"
              placeholder="Reply to client..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            />
            <Button
              type="submit"
              size="sm"
              className="size-8 p-0 rounded-xl bg-primary text-black font-bold hover:bg-primary/90 cursor-pointer"
            >
              <Send className="size-3.5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
