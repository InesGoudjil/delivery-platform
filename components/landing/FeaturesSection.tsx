"use client";

import React, { useState } from "react";
import { MessageCircle, Film, Send, Check, Play, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Typography,
  TypographyH2,
  TypographyH3,
  TypographyH4,
  TypographyP,
  TypographyKicker,
} from "@/components/ui/typography";

export interface ProjectDemo {
  id: string;
  title: string;
  client: string;
  type: "film" | "photo";
  status: "draft" | "review" | "delivered";
  tc: string;
  g: string;
  desc: string;
}

export const SAMPLE_PROJECTS: ProjectDemo[] = [
  {
    id: "1",
    title: "Omakase Teaser",
    client: "Lost in Tokyo",
    type: "film",
    status: "review",
    tc: "00:47",
    g: "linear-gradient(135deg,#3a1a10,#7a2f18)",
    desc: "A moody 47-second teaser for the launch of a new omakase counter.",
  },
  {
    id: "2",
    title: "Aisha & Omar",
    client: "Wedding Film",
    type: "film",
    status: "delivered",
    tc: "03:12",
    g: "linear-gradient(135deg,#1c2230,#38404e)",
    desc: "A three-minute cinematic wedding film shot across two days in Dubai.",
  },
  {
    id: "3",
    title: "GT3 Build Film",
    client: "Prestige Rentals",
    type: "film",
    status: "review",
    tc: "01:20",
    g: "linear-gradient(135deg,#101a1c,#20403f)",
    desc: "Documenting a Porsche GT3 converted to full track spec.",
  },
];

interface FeaturesSectionProps {
  onOpenDemo: () => void;
}

export function FeaturesSection({ onOpenDemo }: FeaturesSectionProps) {
  const [activeFeatureTab, setActiveFeatureTab] = useState<
    "review" | "portfolio" | "whatsapp"
  >("review");

  return (
    <section id="features" className="py-20 border-b border-white/[0.08]">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-14">
        <TypographyKicker className="text-[#f5551d]">
          Built For Filmmakers
        </TypographyKicker>
        <TypographyH2 className="mt-2 text-[#f6f3ec]">
          Everything you send to clients. In one clean link.
        </TypographyH2>
        <TypographyP className="text-[#9a9a9f] mt-4">
          Replace messy email threads, wetransfer links, and confusion with a
          single branded client room.
        </TypographyP>
      </div>

      {/* Feature Tabs Selector */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex p-1.5 rounded-full glass-pill shadow-lg">
          <button
            onClick={() => setActiveFeatureTab("review")}
            className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeFeatureTab === "review"
                ? "glass-btn text-white shadow-md"
                : "text-[#aeaeb4] hover:text-[#f6f3ec]"
            }`}
          >
            <MessageCircle className="size-4" /> Client Review Room
          </button>
          <button
            onClick={() => setActiveFeatureTab("portfolio")}
            className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeFeatureTab === "portfolio"
                ? "glass-btn text-white shadow-md"
                : "text-[#aeaeb4] hover:text-[#f6f3ec]"
            }`}
          >
            <Film className="size-4" /> Video Portfolio
          </button>
          <button
            onClick={() => setActiveFeatureTab("whatsapp")}
            className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeFeatureTab === "whatsapp"
                ? "glass-btn text-white shadow-md"
                : "text-[#aeaeb4] hover:text-[#f6f3ec]"
            }`}
          >
            <Send className="size-4" /> WhatsApp Delivery
          </button>
        </div>
      </div>

      {/* Feature Display Content Container */}
      <div className="liquid-glass rounded-3xl p-6 sm:p-10 shadow-2xl">
        <CardContent className="p-0">
          {/* TAB 1: CLIENT REVIEW ROOM */}
          {activeFeatureTab === "review" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-5">
                <div className="w-12 h-12 rounded-2xl bg-[#f5551d]/15 text-[#f5551d] flex items-center justify-center shadow-inner">
                  <MessageCircle className="size-6" />
                </div>
                <TypographyH3 className="text-2xl sm:text-3xl font-extrabold text-[#f6f3ec]">
                  Timecoded Notes & Locked Sign-offs
                </TypographyH3>
                <TypographyP className="text-[#9a9a9f] text-sm sm:text-base leading-relaxed">
                  Clients pause at exact frames, leave feedback, and compare
                  V1 vs V2. Once satisfied, they hit <b>Approve Final Cut</b>,
                  locking the version so you can export finals with 100%
                  confidence.
                </TypographyP>
                <ul className="space-y-3 text-sm text-[#9a9a9f] font-medium">
                  <li className="flex items-center gap-2.5 text-[#f6f3ec]">
                    <Check className="size-4 text-[#86b98f]" /> Timecode precise
                    comments
                  </li>
                  <li className="flex items-center gap-2.5 text-[#f6f3ec]">
                    <Check className="size-4 text-[#86b98f]" /> Instant version
                    history (V1, V2, Final)
                  </li>
                  <li className="flex items-center gap-2.5 text-[#f6f3ec]">
                    <Check className="size-4 text-[#86b98f]" /> Formal client
                    sign-off locking
                  </li>
                </ul>
                <Button
                  onClick={onOpenDemo}
                  className="rounded-full bg-[#f5551d] hover:bg-[#ff8a45] text-[#160a03] font-semibold mt-2 cursor-pointer transition-all shadow-lg shadow-[#f5551d]/20"
                >
                  Test Review Room Interactive Demo
                </Button>
              </div>

              {/* Review Room Mockup */}
              <div className="lg:col-span-7 bg-[#0a0a0b] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-inner">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <span className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-xs font-mono text-[#5e5e64]">
                    cinespace.app/review/omakase-v2
                  </span>
                </div>
                <div className="aspect-video bg-gradient-to-br from-[#3a1a10] to-[#7a2f18] rounded-xl flex flex-col justify-between p-4 relative overflow-hidden shadow-lg">
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-1 bg-black/60 rounded text-xs font-mono">
                      00:24.12
                    </span>
                    <Badge
                      variant="sage"
                      className="flex items-center gap-1 font-semibold"
                    >
                      <Check className="size-3" /> Client Reviewing
                    </Badge>
                  </div>
                  <div className="self-center w-14 h-14 rounded-full bg-black/50 border border-white/30 flex items-center justify-center backdrop-blur-sm">
                    <Play className="size-6 text-[#f6f3ec] ml-0.5" />
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="flex gap-1.5">
                      <span className="px-2.5 py-1 bg-white/10 rounded-full text-xs font-mono text-white/80">
                        V1
                      </span>
                      <span className="px-2.5 py-1 bg-[#f5551d] text-black font-bold rounded-full text-xs font-mono">
                        V2
                      </span>
                      <span className="px-2.5 py-1 bg-white/10 rounded-full text-xs font-mono text-white/80">
                        Final
                      </span>
                    </div>
                    <span className="text-xs text-[#9a9a9f]">
                      Cloudflare 4K Stream
                    </span>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="p-3 bg-[#141416] border border-white/10 rounded-xl text-xs flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#f5551d] text-black font-bold flex items-center justify-center shrink-0">
                      C
                    </div>
                    <div>
                      <div className="flex justify-between text-[#5e5e64] text-[11px] mb-0.5">
                        <span>Lost in Tokyo (Client)</span>
                        <span>00:24</span>
                      </div>
                      <TypographyP className="text-xs text-[#f6f3ec] leading-snug">
                        “Can we make the intro color grade warmer?”
                      </TypographyP>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VIDEO PORTFOLIO */}
          {activeFeatureTab === "portfolio" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-5">
                <div className="w-12 h-12 rounded-2xl bg-[#f5551d]/15 text-[#f5551d] flex items-center justify-center shadow-inner">
                  <Film className="size-6" />
                </div>
                <TypographyH3 className="text-2xl sm:text-3xl font-extrabold text-[#f6f3ec]">
                  A Clean, Fast Video Portfolio
                </TypographyH3>
                <TypographyP className="text-[#9a9a9f] text-sm sm:text-base leading-relaxed">
                  Showcase your best commercial reels, wedding highlights, and
                  brand films on a sleek dark surface designed specifically
                  for video playback without lag or distraction.
                </TypographyP>
                <ul className="space-y-3 text-sm text-[#9a9a9f] font-medium">
                  <li className="flex items-center gap-2.5 text-[#f6f3ec]">
                    <Check className="size-4 text-[#86b98f]" /> Custom domain &
                    studio branding
                  </li>
                  <li className="flex items-center gap-2.5 text-[#f6f3ec]">
                    <Check className="size-4 text-[#86b98f]" /> Pinned showreel
                    hero spotlight
                  </li>
                  <li className="flex items-center gap-2.5 text-[#f6f3ec]">
                    <Check className="size-4 text-[#86b98f]" /> Optimized for
                    high-bitrate mobile playback
                  </li>
                </ul>
              </div>
              <div className="lg:col-span-7 bg-[#0a0a0b] border border-white/10 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SAMPLE_PROJECTS.map((proj) => (
                  <Card
                    key={proj.id}
                    className="bg-[#141416] border-white/10 rounded-xl overflow-hidden p-3 space-y-3 hover:border-white/20 transition-all shadow-md"
                  >
                    <CardContent className="p-0 space-y-3">
                      <div
                        className="aspect-video rounded-lg flex items-center justify-center relative overflow-hidden"
                        style={{ background: proj.g }}
                      >
                        <Play className="size-8 text-[#f6f3ec] opacity-80" />
                        <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 px-2 py-0.5 rounded font-mono">
                          {proj.tc}
                        </span>
                      </div>
                      <div>
                        <TypographyH4 className="text-sm font-bold text-[#f6f3ec]">
                          {proj.title}
                        </TypographyH4>
                        <Typography
                          as="p"
                          variant="muted"
                          className="text-xs text-[#9a9a9f]"
                        >
                          {proj.client}
                        </Typography>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: WHATSAPP DELIVERY */}
          {activeFeatureTab === "whatsapp" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-5">
                <div className="w-12 h-12 rounded-2xl bg-[#f5551d]/15 text-[#f5551d] flex items-center justify-center shadow-inner">
                  <Send className="size-6" />
                </div>
                <TypographyH3 className="text-2xl sm:text-3xl font-extrabold text-[#f6f3ec]">
                  One-Tap WhatsApp Delivery
                </TypographyH3>
                <TypographyP className="text-[#9a9a9f] text-sm sm:text-base leading-relaxed">
                  Clients in the Gulf live on WhatsApp. CineSpace generates
                  private links optimized for instant previewing directly inside
                  WhatsApp or mobile Safari with zero signup required.
                </TypographyP>
                <ul className="space-y-3 text-sm text-[#9a9a9f] font-medium">
                  <li className="flex items-center gap-2.5 text-[#f6f3ec]">
                    <Check className="size-4 text-[#86b98f]" /> Zero client
                    account creation required
                  </li>
                  <li className="flex items-center gap-2.5 text-[#f6f3ec]">
                    <Check className="size-4 text-[#86b98f]" /> Auto-generated
                    mobile share links
                  </li>
                  <li className="flex items-center gap-2.5 text-[#f6f3ec]">
                    <Check className="size-4 text-[#86b98f]" /> Immediate
                    feedback alerts on your phone
                  </li>
                </ul>
              </div>
              <div className="lg:col-span-7 bg-[#0a0a0b] border border-white/10 rounded-2xl p-6 flex items-center justify-center">
                <Card className="w-full max-w-sm bg-[#141416] border-white/15 rounded-2xl p-4 shadow-xl space-y-3">
                  <CardHeader className="p-0 flex flex-row items-center gap-3 border-b border-white/10 pb-3">
                    <div className="w-9 h-9 rounded-full bg-[#86b98f] text-black font-bold flex items-center justify-center">
                      WA
                    </div>
                    <div>
                      <CardTitle className="text-xs font-bold text-[#f6f3ec]">
                        WhatsApp Client Share
                      </CardTitle>
                      <CardDescription className="text-[11px] text-[#86b98f]">
                        Online · Private Delivery
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="bg-[#1c1c20] p-3 rounded-xl rounded-tl-none border border-white/10 text-xs space-y-2">
                      <TypographyP className="text-xs text-[#9a9a9f]">
                        Hey! Here is the latest V2 cut for the Omakase launch
                        teaser:
                      </TypographyP>
                      <div className="p-2.5 bg-[#0a0a0b] border border-white/10 rounded-lg flex items-center justify-between">
                        <span className="text-[#f5551d] font-mono truncate text-[11px]">
                          cinespace.app/review/omakase-v2
                        </span>
                        <ExternalLink className="size-3 text-[#9a9a9f] shrink-0" />
                      </div>
                      <span className="text-[10px] text-[#5e5e64] block text-right">
                        10:42 AM
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </div>
    </section>
  );
}
