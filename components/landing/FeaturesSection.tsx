"use client";

import React from "react";
import {
  Image as ImageIcon,
  MessageSquare,
  Send,
  Lock,
  Pencil,
  Check,
  Play,
} from "lucide-react";
import { WorkflowSection } from "./WorkflowSection";
import { AppImage } from "../ui/app-image";

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

const IMG_CONCERT = "/images/img-concert.webp";
const IMG_FASHION = "/images/img-fashion.webp";
const IMG_CITY = "/images/img-city.webp";
const IMG_CAR = "/images/img-car.webp";
const IMG_HERO = "/images/posts/IG-Posts-16.webp";

const IMG_MEETING = "/images/img-meeting.webp";

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

const GRID_FEATURES = [
  {
    icon: ImageIcon,
    title: "A portfolio that sells",
    description:
      "A clean, branded page for your best work — your shop window, always up to date.",
  },
  {
    icon: MessageSquare,
    title: "Feedback & approval",
    description:
      "Clients watch, comment, and approve each cut. Every version tracked, every sign-off locked.",
  },
  {
    icon: Send,
    title: "Deliver on WhatsApp",
    description:
      "Send private links your clients open in one tap — no accounts, no friction.",
  },
  {
    icon: Lock,
    title: "Password-protected links",
    description:
      "Lock any delivery behind a password — only the people you choose can open it.",
  },
  {
    icon: Pencil,
    title: "Custom branding",
    description: "Your logo, your colours. Clients see your studio — not ours.",
  },
  {
    icon: Check,
    title: "Ad-free",
    description: "No ads, ever. Just your films, clean and distraction-free.",
  },
];

interface FeaturesSectionProps {
  onOpenDemo?: () => void;
}

export function FeaturesSection({ onOpenDemo }: FeaturesSectionProps) {
  return (
    <section id="features" className="py-16 space-y-24">
      {/* 1. 6-Card Feature Grid Section */}
      <div className="space-y-12 text-center">
        <span className="text-sm font-semibold uppercase tracking-wider text-[#f5551d]">
          Everything you send clients
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {GRID_FEATURES.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="card group relative rounded-2xl border border-white/10 bg-[#121217]/90 p-8 shadow-xl transition-all duration-300 hover:border-white/20 hover:bg-[#16161c]"
              >
                <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-[#2a1b18] text-[#f5551d] border border-[#f5551d]/20 transition-transform group-hover:scale-105">
                  <Icon className="size-5" />
                </div>

                <h3 className="mb-2 text-lg font-bold text-white font-display">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#a0a0aa]">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <WorkflowSection />
      {/* 2. Spotlight Feature 01: Portfolio That Sells */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-8">
        <div className="lg:col-span-5 space-y-4 text-left">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#f5551d]">
            Feature 01
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight font-display">
            A PORTFOLIO THAT SELLS.
          </h2>
          <p className="text-base text-[#aeaeb4] leading-relaxed">
            Your best work, always ready to share. A clean, branded page you can
            send to any lead in a tap — no PDFs, no WeTransfer links, no
            clutter.
          </p>
        </div>

        <div className="lg:col-span-7">
          <div className="card rounded-[28px] border border-white/10 bg-[#121217] p-4 sm:p-6 shadow-2xl">
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  // img: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
                  img: IMG_CONCERT,
                  title: "Live Concert 4K",
                },
                {
                  // img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80",
                  img: IMG_CITY,
                  title: "Dubai Skyline",
                },
                {
                  // img: "https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=600&q=80",
                  img: IMG_CAR,
                  title: "Supercar Commercial",
                },
                {
                  // img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
                  img: IMG_FASHION,
                  title: "Fashion Campaign",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="group relative aspect-video rounded-xl overflow-hidden bg-black border border-white/10"
                >
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-85"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="size-10 rounded-full bg-black/60 border border-white/30 backdrop-blur-md flex items-center justify-center group-hover:scale-110 group-hover:bg-[#f5551d] transition-all">
                      <Play className="size-4 fill-current text-white ml-0.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Spotlight Feature 02: Feedback & Approval */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-8">
        <div className="lg:col-span-7 order-2 lg:order-1">
          <div className="card rounded-[28px] border border-white/10 bg-[#121217] p-6 shadow-2xl space-y-4">
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
              <img
              src={IMG_MEETING}
                // src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
                alt="Client Review"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="size-14 rounded-full bg-black/60 border border-white/30 backdrop-blur-md flex items-center justify-center">
                  <Play className="size-6 fill-current text-white ml-0.5" />
                </div>
              </div>
              <div className="absolute bottom-4 right-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#86b98f]/20 border border-[#86b98f]/50 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-[#86b98f]">
                  <Check className="size-3.5" /> Approved
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <span className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/80">
                V1
              </span>
              <span className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/80">
                V2
              </span>
              <span className="rounded-full bg-[#f5551d] px-5 py-1.5 text-xs font-bold text-white shadow-lg shadow-[#f5551d]/30">
                Final
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4 text-left order-1 lg:order-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#f5551d]">
            Feature 02
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight font-display">
            FEEDBACK & APPROVAL.
          </h2>
          <p className="text-base text-[#aeaeb4] leading-relaxed">
            Feedback without the chaos. Clients watch each cut, leave notes, and
            compare versions — and every approval is timestamped and locks that
            version.
          </p>
        </div>
      </div>

      {/* 4. Spotlight Feature 03: Deliver on WhatsApp */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-8">
        <div className="lg:col-span-5 space-y-4 text-left">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#f5551d]">
            Feature 03
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight font-display">
            DELIVER ON WHATSAPP.
          </h2>
          <p className="text-base text-[#aeaeb4] leading-relaxed">
            Meet clients where they already are. Send a private link over
            WhatsApp — they open it in one tap, no account, no app. You're
            notified the moment they comment or approve.
          </p>
        </div>

        <div className="lg:col-span-7">
          <div className=" card rounded-[28px] border border-white/10 bg-[#121217] p-8 sm:p-12 shadow-2xl flex items-center justify-center">
            <div className="w-full max-w-md rounded-2xl bg-[#1c1c23] border border-white/10 p-5 space-y-3 shadow-2xl text-left">
              <div className="rounded-xl bg-[#262630] p-4 space-y-2 border border-white/5">
                <p className="text-sm font-medium text-zinc-200">
                  Your final cut is ready 🎬
                </p>
                <a
                  href="#"
                  className="text-xs font-mono text-[#f5551d] hover:underline block"
                >
                  cinespace.film/aisha-omar
                </a>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#86b98f] pl-1 font-medium">
                <Check className="size-3.5" />
                <span>Delivered · opened just now</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. The Client Experience Box */}
      <div className="card rounded-[32px] border border-white/10 bg-gradient-to-r from-[#141419] to-[#1a1a24] p-8 sm:p-14 shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-4 text-left">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#f5551d]">
              The client experience
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight font-display">
              A SCREENING ROOM WITH YOUR NAME ON IT.
            </h2>
            <p className="text-base text-[#aeaeb4] leading-relaxed">
              Clients get a clean, branded page — versions side by side,
              comments in one place, and a single tap to approve. No clutter, no
              confusion.
            </p>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-2xl p-6 bg-gradient-to-tr from-[#df3b0b] to-[#7f1396] border border-white/20 shadow-2xl">
              <div className="rounded-xl bg-[#0d0d12] p-4 border border-white/10 space-y-3 text-left">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold text-white font-mono">
                    CineSpace Screening Room
                  </span>
                  <span className="text-[10px] bg-[#86b98f] text-black px-2 py-0.5 rounded font-bold">
                    BRANDED
                  </span>
                </div>
                <div className="aspect-video rounded-lg overflow-hidden bg-black relative flex items-center justify-center">
                  <img
                  src={IMG_HERO}
                    // src="https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=600&q=80"
                    alt="Screening Room"
                    className="w-full h-full object-cover opacity-80"
                  />
                  

                  {/* <Play className="size-10 text-white relative z-10" /> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
