"use client";

import React, { useState } from "react";
import { Play, Check, Download, MessageCircle, Lock, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Typography,
  TypographyH4,
  TypographyP,
  TypographyMuted,
} from "@/components/ui/typography";
import { SAMPLE_PROJECTS, type ProjectDemo } from "./FeaturesSection";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export function DemoModal({ isOpen, onClose, onShowToast }: DemoModalProps) {
  const [activeProject, setActiveProject] = useState<ProjectDemo>(
    SAMPLE_PROJECTS[0]
  );
  const [activeVersion, setActiveVersion] = useState("V2");
  const [isApproved, setIsApproved] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [comments, setComments] = useState<
    Array<{ who: "client" | "me"; meta: string; text: string }>
  >([
    {
      who: "client",
      meta: "Lost in Tokyo · 2h ago",
      text: "Love this opening shot! Can we trim 2 seconds off the color grade intro?",
    },
    {
      who: "me",
      meta: "Filmmaker · 1h ago",
      text: "On it! Adjusted in V2. Check it out now.",
    },
  ]);

  if (!isOpen) return null;

  const handleAddComment = () => {
    if (!commentInput.trim()) return;
    setComments((prev) => [
      ...prev,
      {
        who: "client",
        meta: "Client (You) · Just now",
        text: commentInput.trim(),
      },
    ]);
    setCommentInput("");
    onShowToast("Comment added to timecode 00:24");
  };

  const handleApproveCut = () => {
    setIsApproved(true);
    onShowToast("Cut approved & locked! Filmmaker notified.");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <Card className="bg-[#141416] border border-white/15 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 text-[#f6f3ec] shadow-2xl relative">
        <CardContent className="p-0 space-y-6">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="font-heading font-black text-xl text-[#f6f3ec]">
                Pedro Concreato<span className="text-[#f5551d]">.</span>
              </span>
              <Badge variant="sage" className="font-mono text-xs gap-1.5 py-1">
                <Lock className="size-3" /> Private Link · Active Review
              </Badge>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 text-[#9a9a9f] hover:text-[#f6f3ec] hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Project Selection Tabs */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            <div className="flex gap-2">
              {SAMPLE_PROJECTS.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => {
                    setActiveProject(proj);
                    setIsApproved(proj.status === "delivered");
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeProject.id === proj.id
                      ? "bg-[#f5551d] text-[#160a03]"
                      : "bg-white/5 text-[#9a9a9f] hover:bg-white/10"
                  }`}
                >
                  {proj.title}
                </button>
              ))}
            </div>
            <TypographyMuted
              as="span"
              className="text-xs text-[#5e5e64] shrink-0 font-mono hidden sm:inline"
            >
              Simulated Client Experience
            </TypographyMuted>
          </div>

          {/* Stage / Video Player View */}
          <div className="space-y-4">
            <div
              className="aspect-video rounded-2xl relative overflow-hidden flex flex-col justify-between p-6 shadow-2xl"
              style={{ background: activeProject.g }}
            >
              <div className="flex items-center justify-between z-10">
                <Typography
                  as="span"
                  variant="large"
                  className="font-heading font-bold text-base text-[#f6f3ec]"
                >
                  {activeProject.title}
                </Typography>
                <span className="text-xs font-mono bg-black/60 px-2.5 py-1 rounded-md text-[#f5551d]">
                  Version: {activeVersion}
                </span>
              </div>

              <button
                onClick={() => onShowToast("Playing simulated video cut...")}
                className="self-center z-10 w-20 h-20 rounded-full bg-black/50 border-2 border-white/40 flex items-center justify-center hover:scale-110 hover:bg-[#f5551d] hover:border-[#f5551d] transition-all group cursor-pointer"
              >
                <Play className="size-8 text-[#f6f3ec] group-hover:text-black ml-1 transition-colors" />
              </button>

              <div className="flex items-center justify-between z-10 text-xs font-mono">
                <span className="bg-black/60 px-2.5 py-1 rounded-md">
                  00:24 / {activeProject.tc}
                </span>
                <span className="bg-black/60 px-2.5 py-1 rounded-md text-[#86b98f]">
                  4K Ultra-HD
                </span>
              </div>
            </div>

            {/* Version History Chips */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
              <span className="text-xs text-[#9a9a9f] font-semibold mr-2">
                Versions:
              </span>
              {["V1", "V2", "Final"].map((v) => (
                <button
                  key={v}
                  onClick={() => setActiveVersion(v)}
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
                    activeVersion === v
                      ? "bg-[#f5551d] text-[#160a03]"
                      : "bg-white/5 text-[#9a9a9f] hover:bg-white/10"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Client Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => onShowToast("Downloading high-res video export...")}
              variant="outline"
              className="rounded-full border-white/20 text-[#f6f3ec] hover:bg-white/10 text-xs gap-2 cursor-pointer bg-white/[0.04]"
            >
              <Download className="size-4" /> Download High-Res
            </Button>

            {!isApproved ? (
              <Button
                onClick={handleApproveCut}
                className="rounded-full bg-[#86b98f] hover:bg-[#a2d4ab] text-black font-bold text-xs gap-2 cursor-pointer"
              >
                <Check className="size-4" /> Approve Final Cut
              </Button>
            ) : (
              <Badge
                variant="sage"
                className="px-4 py-2 font-bold uppercase tracking-wider text-xs gap-2"
              >
                <Check className="size-4" /> Approved & Locked
              </Badge>
            )}

            <Button
              onClick={() => onShowToast("Opening WhatsApp chat with filmmaker...")}
              variant="outline"
              className="rounded-full border-white/20 text-[#f6f3ec] hover:bg-white/10 text-xs gap-2 cursor-pointer bg-white/[0.04]"
            >
              <MessageCircle className="size-4 text-[#86b98f]" /> WhatsApp Filmmaker
            </Button>
          </div>

          {/* Timecoded Notes & Comments */}
          <div className="bg-[#0a0a0b] border border-white/10 rounded-2xl p-5 space-y-4">
            <TypographyH4 className="text-sm font-bold text-[#f6f3ec]">
              Client Notes & Feedback
            </TypographyH4>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {comments.map((c, i) => (
                <div
                  key={i}
                  className="flex gap-3 text-xs border-b border-white/5 pb-2"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                      c.who === "me"
                        ? "bg-[#f5551d] text-black"
                        : "bg-white/10 text-[#f6f3ec]"
                    }`}
                  >
                    {c.who === "me" ? "P" : "C"}
                  </div>
                  <div>
                    <div className="text-[11px] text-[#5e5e64] mb-0.5">
                      {c.meta}
                    </div>
                    <TypographyP className="text-xs text-[#f6f3ec] leading-relaxed">
                      {c.text}
                    </TypographyP>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment Input */}
            <div className="flex gap-2 pt-2">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                placeholder="Add a timecoded note on this cut..."
                className="flex-1 bg-[#141416] border border-white/10 rounded-full px-4 py-2 text-xs text-[#f6f3ec] focus:outline-none focus:border-[#f5551d]"
              />
              <Button
                onClick={handleAddComment}
                size="icon"
                className="rounded-full bg-[#f5551d] text-black hover:bg-[#ff8a45] shrink-0 cursor-pointer"
              >
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
