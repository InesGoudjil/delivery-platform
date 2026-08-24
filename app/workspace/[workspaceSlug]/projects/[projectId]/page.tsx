"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Play, Send, Link2, MessageCircle } from "lucide-react";

export default function ProjectDetailPage() {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const projectId = params.projectId as string;

  const [version, setVersion] = useState("V2");
  const [reply, setReply] = useState("");
  const [comments, setComments] = useState([
    {
      id: "c1",
      who: "client",
      meta: "Lost in Tokyo · 2h ago",
      text: "Love this cut! Can we make the intro a touch faster?",
    },
    { id: "c2", who: "me", meta: "You · 1h ago", text: "On it — sending V2 shortly." },
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

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Link
          href={`/workspace/${workspaceSlug}/projects`}
          className="text-xs font-semibold text-dim hover:text-ink flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={`/deliver/${projectId}`}
            target="_blank"
            className="btn text-xs px-4 py-2 rounded-full font-bold shadow-lg shadow-orange/20"
          >
            <Link2 className="w-3.5 h-3.5" /> Preview Delivery Link
          </Link>
        </div>
      </div>

      <div className="bg-bg2 border border-line rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-orange/20 text-orange text-xs font-semibold rounded-full border border-orange/30">
              In Review
            </span>
            <span className="text-xs text-dim font-mono">ID: {projectId}</span>
          </div>
          <h1 className="font-display text-3xl font-bold">Omakase Teaser</h1>
          <p className="text-sm text-dim mt-1">Client: Lost in Tokyo · 47-second promotional cut</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 rounded-full border border-line bg-bg3 text-xs font-bold text-ink hover:border-orange transition flex items-center gap-2">
            <Upload className="w-4 h-4 text-orange" /> Upload New Cut (V3)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          <div className="aspect-video bg-neutral-950 rounded-2xl border border-line relative overflow-hidden flex items-center justify-center group shadow-xl">
            <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('/images/hero.jpg')" }} />
            <div className="relative z-10 w-16 h-16 rounded-full bg-orange text-black flex items-center justify-center cursor-pointer shadow-2xl group-hover:scale-105 transition">
              <Play className="w-6 h-6 fill-current ml-0.5" />
            </div>
            <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between bg-bg/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-line">
              <span className="text-xs font-mono text-dim">Duration: 00:47</span>
              <span className="text-xs font-bold text-orange">Playing Cut {version}</span>
            </div>
          </div>

          <div className="flex items-center justify-between bg-bg2 border border-line p-4 rounded-xl">
            <span className="text-xs font-semibold text-dim uppercase tracking-wider">Version History:</span>
            <div className="flex gap-2">
              {["V1", "V2", "Final"].map((v) => (
                <button
                  key={v}
                  onClick={() => setVersion(v)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                    version === v
                      ? "bg-orange text-black"
                      : "bg-bg3 text-dim hover:text-ink border border-line"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-bg2 border border-line rounded-2xl p-6 flex flex-col justify-between h-[450px]">
          <div>
            <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-orange" /> Client Notes ({comments.length})
            </h3>

            <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className={`p-3 rounded-xl text-xs space-y-1 ${
                    c.who === "client"
                      ? "bg-bg3 border border-line text-ink"
                      : "bg-orange/10 border border-orange/20 text-ink ml-4"
                  }`}
                >
                  <p className="text-[10px] text-dim font-mono">{c.meta}</p>
                  <p className="leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSendReply} className="pt-4 border-t border-line flex gap-2">
            <input
              type="text"
              placeholder="Reply to client..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              className="flex-1 bg-bg3 border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-orange"
            />
            <button type="submit" className="p-2 rounded-xl bg-orange text-black font-bold">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
