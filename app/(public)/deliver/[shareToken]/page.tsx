"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Play, Check, Download, MessageCircle, Lock, Send, Clock, Share2 } from "lucide-react";

export default function ClientDeliveryPage() {
  const params = useParams();
  const shareToken = params.shareToken as string;

  const [version, setVersion] = useState("V2");
  const [isApproved, setIsApproved] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState([
    {
      id: "c1",
      who: "client",
      meta: "Lost in Tokyo · 2h ago",
      text: "Love this cut! Can we make the intro a touch faster?",
    },
    { id: "c2", who: "me", meta: "Pedro Concreato · 1h ago", text: "On it — sending V2 shortly." },
  ]);

  const handleApprove = () => {
    setIsApproved(true);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isApproved) return;

    setComments([
      ...comments,
      {
        id: Date.now().toString(),
        who: "client",
        meta: "You (Client) · Just now",
        text: newComment.trim(),
      },
    ]);
    setNewComment("");
  };

  return (
    <div className="min-h-screen bg-bg text-ink selection:bg-orange selection:text-black">
      <header className="border-b border-line bg-bg2/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange text-black font-extrabold flex items-center justify-center font-display">
              PC
            </div>
            <div>
              <h1 className="font-display font-bold text-lg leading-none">Pedro Concreato</h1>
              <p className="text-xs text-dim mt-0.5">Client Review Room · Lost in Tokyo</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isApproved ? (
              <span className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold rounded-full flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Approved & Locked
              </span>
            ) : (
              <button
                onClick={handleApprove}
                className="btn text-xs px-5 py-2.5 rounded-full font-bold shadow-lg shadow-orange/20 hover:scale-[1.02] transition"
              >
                <Check className="w-4 h-4" /> Approve Final Cut
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-bg2 border border-line p-6 rounded-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-orange uppercase tracking-wider font-semibold">Review Cut</span>
              <span className="text-xs text-dim">• Token: {shareToken.slice(0, 8)}...</span>
            </div>
            <h2 className="font-display text-3xl font-bold">Omakase Teaser</h2>
            <p className="text-sm text-dim mt-1">47-second teaser for the launch of a new omakase counter.</p>
          </div>

          <button className="px-6 py-3 rounded-full border border-line bg-bg3 text-xs font-bold text-ink hover:border-orange transition flex items-center gap-2 self-start md:self-auto">
            <Download className="w-4 h-4 text-orange" /> Download High-Res Cut
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            <div className="aspect-video bg-neutral-950 rounded-2xl border border-line relative overflow-hidden flex items-center justify-center group shadow-2xl">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{ backgroundImage: "url('/images/hero.jpg')" }}
              />
              <div className="relative z-10 w-20 h-20 rounded-full bg-orange text-black flex items-center justify-center cursor-pointer shadow-2xl group-hover:scale-110 transition">
                <Play className="w-8 h-8 fill-current ml-1" />
              </div>
              <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between bg-bg/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-line">
                <span className="text-xs font-mono text-dim">00:47 / 1080p</span>
                <span className="text-xs font-bold text-orange">Viewing Version {version}</span>
              </div>
            </div>

            <div className="flex items-center justify-between bg-bg2 border border-line p-4 rounded-xl">
              <span className="text-xs font-semibold text-dim uppercase tracking-wider">Select Version:</span>
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

          <div className="bg-bg2 border border-line rounded-2xl p-6 flex flex-col justify-between h-[480px]">
            <div>
              <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-orange" /> Notes & Feedback
              </h3>

              {isApproved && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl">
                  Version approved by client. Comments are now locked.
                </div>
              )}

              <div className="space-y-3 overflow-y-auto max-h-[310px] pr-2">
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

            {!isApproved && (
              <form onSubmit={handleAddComment} className="pt-4 border-t border-line flex gap-2">
                <input
                  type="text"
                  placeholder="Leave a comment on this cut..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 bg-bg3 border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-orange"
                />
                <button type="submit" className="p-2 rounded-xl bg-orange text-black font-bold">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
