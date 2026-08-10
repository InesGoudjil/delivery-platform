"use client";

import React, { useState } from "react";
import {
  Play,
  Check,
  Download,
  MessageCircle,
  Lock,
  Send,
  ChevronDown,
  Sparkles,
  Film,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { HeaderSection } from "@/components/HeaderSection";
import { HeroSection } from "@/components/HeroSection";
import { FooterSection } from "@/components/FooterSection";

interface ProjectDemo {
  id: string;
  title: string;
  client: string;
  type: "film" | "photo";
  status: "draft" | "review" | "delivered";
  tc: string;
  g: string;
  desc: string;
}

const SAMPLE_PROJECTS: ProjectDemo[] = [
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

const FAQS = [
  {
    q: "Do my clients need an account to review?",
    a: "No. Clients open a private, secure link and can immediately watch, comment with timecodes, and approve — nothing to install, register, or sign up for.",
  },
  {
    q: "Can I use my own logo and brand colors?",
    a: "Yes. Studio and Agency plans allow you to set your custom brand name, logo, accent color, and custom handle so every client link looks 100% like your studio.",
  },
  {
    q: "How does video playback & streaming performance work?",
    a: "All cuts are transcoded and served via Cloudflare's ultra-fast global streaming network (1080p & 4K), ensuring fast loading on mobile networks across the Gulf.",
  },
  {
    q: "How does client delivery over WhatsApp work?",
    a: "With one tap, copy a formatted client delivery link ready to paste directly into WhatsApp. Clients click and view instantly on their mobile browser.",
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes. Plans are billed monthly or annually with no lock-in contracts. You can upgrade, downgrade, or cancel at any time directly from your settings.",
  },
];

export default function LandingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [activeProject, setActiveProject] = useState<ProjectDemo>(
    SAMPLE_PROJECTS[0],
  );
  const [activeVersion, setActiveVersion] = useState("V2");
  const [toast, setToast] = useState<string | null>(null);
  const [activeFeatureTab, setActiveFeatureTab] = useState<
    "review" | "portfolio" | "whatsapp"
  >("review");

  // Client room interactive comments state
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
  const [commentInput, setCommentInput] = useState("");
  const [isApproved, setIsApproved] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

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
    showToast("Comment added to timecode 00:24");
  };

  const handleApproveCut = () => {
    setIsApproved(true);
    showToast("Cut approved & locked! Filmmaker notified.");
  };

  return (
    <div className="root min-h-screen bg-[#0a0a0b] text-[#f6f3ec] font-sans antialiased selection:bg-[#f5551d] selection:text-black">
      {/* Background Subtle Film Grain Overlay */}
      <div className="grain opacity-[0.08]" />

      {/* Header Section Component */}
      <HeaderSection
        onOpenDemo={() => setShowDemoModal(true)}
        onStartTrial={() => showToast("Free trial registration initiated!")}
      />

      {/* Hero Section Component */}
      <HeroSection
        onOpenDemo={() => setShowDemoModal(true)}
        onStartTrial={() => showToast("Free trial registration initiated!")}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Client Trust Bar */}
        <div className="py-8 border-b border-white/[0.08] text-center">
          <p className="text-xs uppercase tracking-widest font-semibold text-[#5e5e64] mb-4">
            Trusted by independent filmmakers & studios in the Gulf
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 text-sm font-bold text-[#9a9a9f]">
            <span className="hover:text-[#f6f3ec] transition-colors">
              Lost in Tokyo
            </span>
            <span className="text-white/20">•</span>
            <span className="hover:text-[#f6f3ec] transition-colors">
              Clean Performance
            </span>
            <span className="text-white/20">•</span>
            <span className="hover:text-[#f6f3ec] transition-colors">
              Prestige Rentals
            </span>
            <span className="text-white/20">•</span>
            <span className="hover:text-[#f6f3ec] transition-colors">
              Seen Couture
            </span>
          </div>
        </div>

        {/* Interactive Feature Demo Tabs Section */}
        <section id="features" className="py-20 border-b border-white/[0.08]">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#f5551d]">
              Built For Filmmakers
            </span>
            <h2 className="disp text-3xl sm:text-5xl font-extrabold text-[#f6f3ec] tracking-tight mt-2">
              Everything you send to clients. In one clean link.
            </h2>
            <p className="text-[#9a9a9f] mt-4 text-base">
              Replace messy email threads, wetransfer links, and confusion with
              a single branded client room.
            </p>
          </div>

          {/* Feature Tabs Selector */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex p-1.5 rounded-full bg-[#141416] border border-white/10">
              <button
                onClick={() => setActiveFeatureTab("review")}
                className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  activeFeatureTab === "review"
                    ? "bg-[#f5551d] text-[#160a03] shadow-md"
                    : "text-[#9a9a9f] hover:text-[#f6f3ec]"
                }`}
              >
                <MessageCircle className="size-4" /> Client Review Room
              </button>
              <button
                onClick={() => setActiveFeatureTab("portfolio")}
                className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  activeFeatureTab === "portfolio"
                    ? "bg-[#f5551d] text-[#160a03] shadow-md"
                    : "text-[#9a9a9f] hover:text-[#f6f3ec]"
                }`}
              >
                <Film className="size-4" /> Video Portfolio
              </button>
              <button
                onClick={() => setActiveFeatureTab("whatsapp")}
                className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  activeFeatureTab === "whatsapp"
                    ? "bg-[#f5551d] text-[#160a03] shadow-md"
                    : "text-[#9a9a9f] hover:text-[#f6f3ec]"
                }`}
              >
                <Send className="size-4" /> WhatsApp Delivery
              </button>
            </div>
          </div>

          {/* Feature Display Content */}
          <Card className="bg-[#141416] border-white/10 rounded-3xl p-6 sm:p-10">
            {activeFeatureTab === "review" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-5">
                  <div className="w-12 h-12 rounded-2xl bg-[#f5551d]/15 text-[#f5551d] flex items-center justify-center">
                    <MessageCircle className="size-6" />
                  </div>
                  <h3 className="disp text-2xl sm:text-3xl font-extrabold text-[#f6f3ec]">
                    Timecoded Notes & Locked Sign-offs
                  </h3>
                  <p className="text-[#9a9a9f] text-sm sm:text-base leading-relaxed">
                    Clients pause at exact frames, leave feedback, and compare
                    V1 vs V2. Once satisfied, they hit <b>Approve Final Cut</b>,
                    locking the version so you can export finals with 100%
                    confidence.
                  </p>
                  <ul className="space-y-3 text-sm text-[#9a9a9f] font-medium">
                    <li className="flex items-center gap-2.5 text-[#f6f3ec]">
                      <Check className="size-4 text-[#86b98f]" /> Timecode
                      precise comments
                    </li>
                    <li className="flex items-center gap-2.5 text-[#f6f3ec]">
                      <Check className="size-4 text-[#86b98f]" /> Instant
                      version history (V1, V2, Final)
                    </li>
                    <li className="flex items-center gap-2.5 text-[#f6f3ec]">
                      <Check className="size-4 text-[#86b98f]" /> Formal client
                      sign-off locking
                    </li>
                  </ul>
                  <Button
                    onClick={() => setShowDemoModal(true)}
                    className="rounded-full bg-[#f5551d] text-[#160a03] font-semibold mt-2 cursor-pointer"
                  >
                    Test Review Room Interactive Demo
                  </Button>
                </div>
                <div className="lg:col-span-7 bg-[#0a0a0b] border border-white/10 rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500/80" />
                      <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <span className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <span className="text-xs font-mono text-[#5e5e64]">
                      cut.app/review/omakase-v2
                    </span>
                  </div>
                  <div className="aspect-video bg-gradient-to-br from-[#3a1a10] to-[#7a2f18] rounded-xl flex flex-col justify-between p-4 relative overflow-hidden">
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
                    <div className="self-center w-14 h-14 rounded-full bg-black/50 border border-white/30 flex items-center justify-center">
                      <Play className="size-6 text-[#f6f3ec] ml-0.5" />
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="flex gap-1.5">
                        <span className="px-2.5 py-1 bg-white/10 rounded-full text-xs font-mono">
                          V1
                        </span>
                        <span className="px-2.5 py-1 bg-[#f5551d] text-black font-bold rounded-full text-xs font-mono">
                          V2
                        </span>
                        <span className="px-2.5 py-1 bg-white/10 rounded-full text-xs font-mono">
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
                        <p className="text-[#f6f3ec]">
                          “Can we make the intro color grade warmer?”
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeFeatureTab === "portfolio" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-5">
                  <div className="w-12 h-12 rounded-2xl bg-[#f5551d]/15 text-[#f5551d] flex items-center justify-center">
                    <Film className="size-6" />
                  </div>
                  <h3 className="disp text-2xl sm:text-3xl font-extrabold text-[#f6f3ec]">
                    A Clean, Fast Video Portfolio
                  </h3>
                  <p className="text-[#9a9a9f] text-sm sm:text-base leading-relaxed">
                    Showcase your best commercial reels, wedding highlights, and
                    brand films on a sleek dark surface designed specifically
                    for video playback without lag or distraction.
                  </p>
                  <ul className="space-y-3 text-sm text-[#9a9a9f] font-medium">
                    <li className="flex items-center gap-2.5 text-[#f6f3ec]">
                      <Check className="size-4 text-[#86b98f]" /> Custom domain
                      & studio branding
                    </li>
                    <li className="flex items-center gap-2.5 text-[#f6f3ec]">
                      <Check className="size-4 text-[#86b98f]" /> Pinned
                      showreel hero spotlight
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
                      className="bg-[#141416] border-white/10 rounded-xl overflow-hidden p-3 space-y-3"
                    >
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
                        <h4 className="disp text-sm font-bold text-[#f6f3ec]">
                          {proj.title}
                        </h4>
                        <p className="text-xs text-[#9a9a9f]">{proj.client}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeFeatureTab === "whatsapp" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-5">
                  <div className="w-12 h-12 rounded-2xl bg-[#f5551d]/15 text-[#f5551d] flex items-center justify-center">
                    <Send className="size-6" />
                  </div>
                  <h3 className="disp text-2xl sm:text-3xl font-extrabold text-[#f6f3ec]">
                    One-Tap WhatsApp Delivery
                  </h3>
                  <p className="text-[#9a9a9f] text-sm sm:text-base leading-relaxed">
                    Clients in the Gulf live on WhatsApp. CUT generates private
                    links optimized for instant previewing directly inside
                    WhatsApp or mobile Safari with zero signup required.
                  </p>
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
                    <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                      <div className="w-9 h-9 rounded-full bg-[#86b98f] text-black font-bold flex items-center justify-center">
                        WA
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#f6f3ec]">
                          WhatsApp Client Share
                        </h4>
                        <p className="text-[11px] text-[#86b98f]">
                          Online · Private Delivery
                        </p>
                      </div>
                    </div>
                    <div className="bg-[#1c1c20] p-3 rounded-xl rounded-tl-none border border-white/10 text-xs space-y-2">
                      <p className="text-[#9a9a9f]">
                        Hey! Here is the latest V2 cut for the Omakase launch
                        teaser:
                      </p>
                      <div className="p-2.5 bg-[#0a0a0b] border border-white/10 rounded-lg flex items-center justify-between">
                        <span className="text-[#f5551d] font-mono truncate text-[11px]">
                          cut.app/review/omakase-v2
                        </span>
                        <ExternalLink className="size-3 text-[#9a9a9f] shrink-0" />
                      </div>
                      <span className="text-[10px] text-[#5e5e64] block text-right">
                        10:42 AM
                      </span>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* 3-Step Workflow Section */}
        <section id="workflow" className="py-20 border-b border-white/[0.08]">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#f5551d]">
              Simple 3-Step Process
            </span>
            <h2 className="disp text-3xl sm:text-4xl font-extrabold text-[#f6f3ec] tracking-tight mt-2">
              From export to final client sign-off in minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-[#141416] border-white/10 rounded-2xl p-8 space-y-4">
              <span className="disp text-4xl font-extrabold text-[#f5551d]">
                01
              </span>
              <h3 className="disp text-xl font-bold text-[#f6f3ec]">
                Upload Your Cut
              </h3>
              <p className="text-sm text-[#9a9a9f] leading-relaxed">
                Export from Premiere, DaVinci, or Final Cut and drag your MP4 or
                ProRes export into CUT. Automatic Cloudflare streaming setup.
              </p>
            </Card>

            <Card className="bg-[#141416] border-white/10 rounded-2xl p-8 space-y-4">
              <span className="disp text-4xl font-extrabold text-[#f5551d]">
                02
              </span>
              <h3 className="disp text-xl font-bold text-[#f6f3ec]">
                Share Private Link
              </h3>
              <p className="text-sm text-[#9a9a9f] leading-relaxed">
                Send a private, branded link via WhatsApp or email. Your client
                opens it on any browser without needing to register or log in.
              </p>
            </Card>

            <Card className="bg-[#141416] border-white/10 rounded-2xl p-8 space-y-4">
              <span className="disp text-4xl font-extrabold text-[#f5551d]">
                03
              </span>
              <h3 className="disp text-xl font-bold text-[#f6f3ec]">
                Review & Sign-Off
              </h3>
              <p className="text-sm text-[#9a9a9f] leading-relaxed">
                Client leaves timecoded comments, approves the cut, and receives
                high-res download access upon approval lock.
              </p>
            </Card>
          </div>
        </section>

        {/* Pricing Section (AED Tiers) */}
        <section id="pricing" className="py-20 border-b border-white/[0.08]">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#f5551d]">
              Transparent Pricing (AED)
            </span>
            <h2 className="disp text-3xl sm:text-5xl font-extrabold text-[#f6f3ec] tracking-tight mt-2">
              7-Day Free Trial. No Lock-in.
            </h2>
            <p className="text-[#9a9a9f] mt-4 text-base">
              Simple, predictable plans designed for Gulf creators and boutique
              studios.
            </p>

            {/* Monthly / Annual Billing Toggle */}
            <div className="inline-flex items-center gap-3 mt-8 p-1 rounded-full bg-[#141416] border border-white/10">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                  billing === "monthly"
                    ? "bg-[#f5551d] text-[#160a03]"
                    : "text-[#9a9a9f]"
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBilling("annual")}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  billing === "annual"
                    ? "bg-[#f5551d] text-[#160a03]"
                    : "text-[#9a9a9f]"
                }`}
              >
                Annual Billing{" "}
                <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded">
                  SAVE 20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {/* Solo Tier */}
            <Card className="bg-[#141416] border-white/10 rounded-2xl p-8 flex flex-col justify-between hover:border-white/20 transition-all">
              <div>
                <h3 className="disp text-2xl font-bold text-[#f6f3ec]">Solo</h3>
                <p className="text-xs text-[#9a9a9f] mt-1">
                  For independent videographers
                </p>
                <div className="my-6">
                  <span className="disp text-4xl font-extrabold text-[#f6f3ec]">
                    {billing === "monthly" ? "39" : "31"}
                  </span>
                  <span className="text-sm text-[#9a9a9f]"> AED / month</span>
                </div>
                <ul className="space-y-3 text-xs text-[#9a9a9f]">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-[#f5551d]" /> 5 Active client
                    projects
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-[#f5551d]" /> 1080p Cloudflare
                    CDN streaming
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-[#f5551d]" /> WhatsApp mobile
                    delivery links
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-[#f5551d]" /> Timecoded client
                    feedback
                  </li>
                </ul>
              </div>
              <Button
                onClick={() => showToast("Selected Solo plan trial")}
                variant="outline"
                className="w-full mt-8 rounded-full border-white/20 text-[#f6f3ec] hover:bg-white/10"
              >
                Start 7-Day Free Trial
              </Button>
            </Card>

            {/* Studio Tier (Popular) */}
            <Card className="bg-[#141416] border-2 border-[#f5551d] rounded-2xl p-8 flex flex-col justify-between relative shadow-2xl shadow-[#f5551d]/10">
              <Badge
                variant="orange"
                className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 text-[10px] font-extrabold uppercase tracking-widest bg-[#f5551d] text-black border-none shadow-md"
              >
                MOST POPULAR
              </Badge>
              <div>
                <h3 className="disp text-2xl font-bold text-[#f6f3ec]">
                  Studio
                </h3>
                <p className="text-xs text-[#9a9a9f] mt-1">
                  For active boutique production studios
                </p>
                <div className="my-6">
                  <span className="disp text-4xl font-extrabold text-[#f6f3ec]">
                    {billing === "monthly" ? "99" : "79"}
                  </span>
                  <span className="text-sm text-[#9a9a9f]"> AED / month</span>
                </div>
                <ul className="space-y-3 text-xs text-[#9a9a9f]">
                  <li className="flex items-center gap-2 text-[#f6f3ec] font-semibold">
                    <Check className="size-4 text-[#f5551d]" /> Unlimited active
                    client projects
                  </li>
                  <li className="flex items-center gap-2 text-[#f6f3ec] font-semibold">
                    <Check className="size-4 text-[#f5551d]" /> 4K Ultra-HD
                    video streaming
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-[#f5551d]" /> Custom brand
                    logo & colors
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-[#f5551d]" /> Custom studio
                    handle/domain
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-[#f5551d]" /> Version locking
                    & download protection
                  </li>
                </ul>
              </div>
              <Button
                onClick={() => showToast("Selected Studio plan trial")}
                className="w-full mt-8 rounded-full bg-[#f5551d] hover:bg-[#ff8a45] text-[#160a03] font-bold shadow-lg"
              >
                Start 7-Day Free Trial
              </Button>
            </Card>

            {/* Agency Tier */}
            <Card className="bg-[#141416] border-white/10 rounded-2xl p-8 flex flex-col justify-between hover:border-white/20 transition-all">
              <div>
                <h3 className="disp text-2xl font-bold text-[#f6f3ec]">
                  Agency
                </h3>
                <p className="text-xs text-[#9a9a9f] mt-1">
                  For production houses & media agencies
                </p>
                <div className="my-6">
                  <span className="disp text-4xl font-extrabold text-[#f6f3ec]">
                    {billing === "monthly" ? "199" : "159"}
                  </span>
                  <span className="text-sm text-[#9a9a9f]"> AED / month</span>
                </div>
                <ul className="space-y-3 text-xs text-[#9a9a9f]">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-[#f5551d]" /> Everything in
                    Studio plan
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-[#f5551d]" /> Team
                    collaborator seats
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-[#f5551d]" /> High-bandwidth
                    priority allocation
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-[#f5551d]" /> Custom client
                    NDA seals
                  </li>
                </ul>
              </div>
              <Button
                onClick={() => showToast("Selected Agency plan trial")}
                variant="outline"
                className="w-full mt-8 rounded-full border-white/20 text-[#f6f3ec] hover:bg-white/10"
              >
                Start 7-Day Free Trial
              </Button>
            </Card>
          </div>
        </section>

        {/* Interactive FAQ Section */}
        <section id="faq" className="py-20 border-b border-white/[0.08]">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#f5551d]">
              Frequently Asked Questions
            </span>
            <h2 className="disp text-3xl sm:text-4xl font-extrabold text-[#f6f3ec] tracking-tight mt-2">
              Got questions? We've got answers.
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = faqOpen === idx;
              return (
                <Card
                  key={idx}
                  className="bg-[#141416] border-white/10 rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setFaqOpen(isOpen ? null : idx)}
                    className="w-full px-6 py-5 text-left font-bold text-base sm:text-lg text-[#f6f3ec] flex items-center justify-between gap-4"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`size-5 text-[#9a9a9f] transition-transform duration-200 shrink-0 ${
                        isOpen ? "rotate-180 text-[#f5551d]" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm text-[#9a9a9f] leading-relaxed border-t border-white/5 pt-3">
                      {faq.a}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>

        {/* Call to Action Banner */}
        <section className="py-20">
          <div
            className="relative overflow-hidden rounded-[32px] bg-cover bg-center bg-no-repeat p-10 shadow-2xl sm:p-16"
            style={{
              backgroundImage: "url('/images/cta.jpg')",
            }}
          >
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/45" />

            {/* Optional Orange Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff9a4e]/20 via-[#f5551d]/20 to-[#7a2109]/50" />

            {/* Grain */}
            <div className="grain absolute inset-0 opacity-10" />

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="disp text-3xl font-black leading-tight text-white sm:text-5xl">
                Ready to elevate your video delivery?
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-base font-medium text-white/80 sm:text-lg">
                Join top filmmakers in Dubai, Abu Dhabi, and across the Gulf
                sending polished cuts today.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Button
                  onClick={() =>
                    showToast("Free trial registration initiated!")
                  }
                  size="lg"
                  className="rounded-full bg-[#f5551d] px-8 py-4 text-base font-bold text-white shadow-2xl transition-transform hover:-translate-y-0.5 hover:bg-[#ff7843]"
                >
                  Start Your 7-Day Free Trial
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer Section Component */}
      <FooterSection />

      {/* ===================== INTERACTIVE DEMO CLIENT ROOM MODAL ===================== */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#141416] border border-white/15 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 text-[#f6f3ec] shadow-2xl relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="disp font-black text-xl text-[#f6f3ec]">
                  Pedro Concreato<span className="text-[#f5551d]">.</span>
                </span>
                <Badge
                  variant="sage"
                  className="font-mono text-xs gap-1.5 py-1"
                >
                  <Lock className="size-3" /> Private Link · Active Review
                </Badge>
              </div>
              <button
                onClick={() => setShowDemoModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 text-[#9a9a9f] hover:text-[#f6f3ec] flex items-center justify-center transition-colors"
              >
                ✕
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
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      activeProject.id === proj.id
                        ? "bg-[#f5551d] text-[#160a03]"
                        : "bg-white/5 text-[#9a9a9f] hover:bg-white/10"
                    }`}
                  >
                    {proj.title}
                  </button>
                ))}
              </div>
              <span className="text-xs text-[#5e5e64] shrink-0 font-mono">
                Simulated Client Experience
              </span>
            </div>

            {/* Stage / Video Player View */}
            <div className="space-y-4">
              <div
                className="aspect-video rounded-2xl relative overflow-hidden flex flex-col justify-between p-6 shadow-2xl"
                style={{ background: activeProject.g }}
              >
                <div className="flex items-center justify-between z-10">
                  <span className="disp font-bold text-base text-[#f6f3ec]">
                    {activeProject.title}
                  </span>
                  <span className="text-xs font-mono bg-black/60 px-2.5 py-1 rounded-md text-[#f5551d]">
                    Version: {activeVersion}
                  </span>
                </div>

                <button
                  onClick={() => showToast("Playing simulated video cut...")}
                  className="self-center z-10 w-20 h-20 rounded-full bg-black/50 border-2 border-white/40 flex items-center justify-center hover:scale-110 hover:bg-[#f5551d] hover:border-[#f5551d] transition-all group"
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
                    className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-all ${
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
                onClick={() =>
                  showToast("Downloading high-res video export...")
                }
                variant="outline"
                className="rounded-full border-white/20 text-[#f6f3ec] hover:bg-white/10 text-xs gap-2"
              >
                <Download className="size-4" /> Download High-Res
              </Button>

              {!isApproved ? (
                <Button
                  onClick={handleApproveCut}
                  className="rounded-full bg-[#86b98f] hover:bg-[#a2d4ab] text-black font-bold text-xs gap-2"
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
                onClick={() =>
                  showToast("Opening WhatsApp chat with filmmaker...")
                }
                variant="outline"
                className="rounded-full border-white/20 text-[#f6f3ec] hover:bg-white/10 text-xs gap-2"
              >
                <MessageCircle className="size-4 text-[#86b98f]" /> WhatsApp
                Filmmaker
              </Button>
            </div>

            {/* Timecoded Notes & Comments */}
            <div className="bg-[#0a0a0b] border border-white/10 rounded-2xl p-5 space-y-4">
              <h4 className="disp text-sm font-bold text-[#f6f3ec]">
                Client Notes & Feedback
              </h4>
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
                      <p className="text-[#f6f3ec] leading-relaxed">{c.text}</p>
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
                  className="rounded-full bg-[#f5551d] text-black hover:bg-[#ff8a45] shrink-0"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#141416] border border-[#f5551d] text-[#f6f3ec] px-5 py-3 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="size-4 text-[#f5551d]" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
