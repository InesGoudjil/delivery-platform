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
  Film,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { WorkflowSection } from "./WorkflowSection";
import { AppImage } from "@/components/ui/app-image";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup, AvatarBadge } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
} from "@/components/ui/attachment";
import {
  TypographyH2,
  TypographyKicker,
  TypographyLead,
} from "@/components/ui/typography";
import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
  TiltCard,
} from "@/components/ui/motion";

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
    <TooltipProvider delay={150}>
      <section id="features" className="py-16 space-y-24">
        {/* 1. 6-Card Feature Grid Section with TiltCard */}
        <ScrollReveal className="space-y-12 text-center">
          <TypographyKicker color="orange">
            Everything you send clients
          </TypographyKicker>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left" staggerDelay={0.08}>
            {GRID_FEATURES.map((item, index) => {
              const Icon = item.icon;
              return (
                <StaggerItem key={index}>
                  <TiltCard tiltIntensity={6} glareIntensity={0.18} className="h-full">
                    <Card className="group relative rounded-2xl border border-white/10 bg-[#121217]/90 p-8 shadow-xl transition-all duration-300 hover:border-white/25 hover:bg-[#16161c] h-full flex flex-col justify-between">
                      <div>
                        <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-[#2a1b18] text-[#f5551d] border border-[#f5551d]/20 transition-transform group-hover:scale-110">
                          <Icon className="size-5" />
                        </div>

                        <CardTitle className="mb-2 text-lg font-bold text-white font-display">
                          {item.title}
                        </CardTitle>
                        <p className="text-sm leading-relaxed text-[#a0a0aa]">
                          {item.description}
                        </p>
                      </div>
                    </Card>
                  </TiltCard>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </ScrollReveal>

        <WorkflowSection />

        {/* 2. Spotlight Feature 01: Portfolio That Sells */}
        <ScrollReveal className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-8">
          <div className="lg:col-span-5 space-y-4 text-left">
            <Badge variant="orange" className="text-xs uppercase tracking-widest font-mono">
              Feature 01
            </Badge>
            <TypographyH2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight font-display">
              A PORTFOLIO THAT SELLS.
            </TypographyH2>
            <TypographyLead className="text-base text-[#aeaeb4] leading-relaxed">
              Your best work, always ready to share. A clean, branded page you can
              send to any lead in a tap — no PDFs, no WeTransfer links, no
              clutter.
            </TypographyLead>
          </div>

          <div className="lg:col-span-7">
            <Card className="rounded-[28px] border border-white/10 bg-[#121217] p-4 sm:p-6 shadow-2xl">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { img: IMG_CONCERT, title: "Live Concert 4K" },
                  { img: IMG_CITY, title: "Dubai Skyline" },
                  { img: IMG_CAR, title: "Supercar Commercial" },
                  { img: IMG_FASHION, title: "Fashion Campaign" },
                ].map((item, idx) => (
                  <TiltCard key={idx} tiltIntensity={4} glareIntensity={0.12}>
                    <div className="group relative rounded-xl overflow-hidden bg-black border border-white/10 cursor-pointer">
                      <AspectRatio ratio={16 / 9} className="w-full">
                        <AppImage
                          src={item.img}
                          alt={item.title}
                          fallbackIcon="film"
                          containerClassName="size-full"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-85"
                        />
                      </AspectRatio>
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <div className="size-10 rounded-full bg-black/60 border border-white/30 backdrop-blur-md flex items-center justify-center group-hover:scale-110 group-hover:bg-[#f5551d] transition-all pointer-events-auto">
                                <Play className="size-4 fill-current text-white ml-0.5" />
                              </div>
                            }
                          />
                          <TooltipContent>Play {item.title}</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </TiltCard>
                ))}
              </div>
            </Card>
          </div>
        </ScrollReveal>

        {/* 3. Spotlight Feature 02: Feedback & Approval */}
        <ScrollReveal className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-8">
          <div className="lg:col-span-7 order-2 lg:order-1">
            <Card className="rounded-[28px] border border-white/10 bg-[#121217] p-6 shadow-2xl space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
                <AspectRatio ratio={16 / 9} className="w-full">
                  <AppImage
                    src={IMG_MEETING}
                    alt="Client Review"
                    fallbackIcon="film"
                    containerClassName="size-full"
                    className="w-full h-full object-cover opacity-80"
                  />
                </AspectRatio>

                <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                  <div className="size-14 rounded-full bg-black/60 border border-white/30 backdrop-blur-md flex items-center justify-center">
                    <Play className="size-6 fill-current text-white ml-0.5" />
                  </div>
                </div>

                <div className="absolute bottom-4 right-4">
                  <Badge variant="sage" className="backdrop-blur-md px-3.5 py-1 text-xs font-bold gap-1.5 shadow-lg">
                    <Check className="size-3.5" /> Approved & Locked
                  </Badge>
                </div>
              </div>

              {/* Version Controls and Avatar Stacks */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="px-3.5 py-1 text-xs font-mono">
                    V1
                  </Badge>
                  <Badge variant="outline" className="px-3.5 py-1 text-xs font-mono">
                    V2
                  </Badge>
                  <Badge variant="orange" className="px-4 py-1 text-xs font-bold">
                    Final Cut
                  </Badge>
                </div>

                {/* Stakeholder Avatars */}
                <AvatarGroup>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Avatar size="sm" className="ring-1 ring-white/20">
                          <AvatarFallback className="bg-[#1f2937] text-zinc-200 text-[10px] font-bold">
                            ED
                          </AvatarFallback>
                        </Avatar>
                      }
                    />
                    <TooltipContent>Lead Editor (Pedro)</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Avatar size="sm" className="ring-1 ring-white/20">
                          <AvatarFallback className="bg-[#14532d] text-emerald-200 text-[10px] font-bold">
                            CL
                          </AvatarFallback>
                          <AvatarBadge className="bg-[#86b98f]" />
                        </Avatar>
                      }
                    />
                    <TooltipContent>Client Approved (Sign-off locked)</TooltipContent>
                  </Tooltip>
                </AvatarGroup>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-5 space-y-4 text-left order-1 lg:order-2">
            <Badge variant="orange" className="text-xs uppercase tracking-widest font-mono">
              Feature 02
            </Badge>
            <TypographyH2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight font-display">
              FEEDBACK & APPROVAL.
            </TypographyH2>
            <TypographyLead className="text-base text-[#aeaeb4] leading-relaxed">
              Feedback without the chaos. Clients watch each cut, leave notes, and
              compare versions — and every approval is timestamped and locks that
              version.
            </TypographyLead>
          </div>
        </ScrollReveal>

        {/* 4. Spotlight Feature 03: Deliver on WhatsApp */}
        <ScrollReveal className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-8">
          <div className="lg:col-span-5 space-y-4 text-left">
            <Badge variant="orange" className="text-xs uppercase tracking-widest font-mono">
              Feature 03
            </Badge>
            <TypographyH2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight font-display">
              DELIVER ON WHATSAPP.
            </TypographyH2>
            <TypographyLead className="text-base text-[#aeaeb4] leading-relaxed">
              Meet clients where they already are. Send a private link over
              WhatsApp — they open it in one tap, no account, no app. You're
              notified the moment they comment or approve.
            </TypographyLead>
          </div>

          <div className="lg:col-span-7">
            <Card className="rounded-[28px] border border-white/10 bg-[#121217] p-8 sm:p-12 shadow-2xl flex items-center justify-center">
              <div className="w-full max-w-md rounded-2xl bg-[#1c1c23] border border-white/10 p-5 space-y-4 shadow-2xl text-left">
                {/* Simulated Delivery Bubble */}
                <div className="rounded-xl bg-[#262630] p-4 space-y-2 border border-white/5">
                  <p className="text-sm font-medium text-zinc-200">
                    Your final cut is ready 🎬
                  </p>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="text-xs font-mono text-[#f5551d] hover:underline block"
                  >
                    cinespace.film/aisha-omar
                  </a>
                </div>

                {/* Password Protection Toggle Mockup */}
                <div className="flex items-center justify-between px-1 py-1 rounded-lg bg-black/30 border border-white/5 p-2.5">
                  <div className="flex items-center gap-2 text-xs text-zinc-300">
                    <ShieldCheck className="size-4 text-[#86b98f]" />
                    <span>PIN / Password Protected</span>
                  </div>
                  <Switch checked disabled className="data-[state=checked]:bg-[#86b98f]" />
                </div>

                <div className="flex items-center gap-1.5 text-xs text-[#86b98f] pl-1 font-medium">
                  <Check className="size-3.5" />
                  <span>Delivered · opened just now</span>
                </div>
              </div>
            </Card>
          </div>
        </ScrollReveal>

        {/* 5. Flagship: The Client Experience Box with Attachment */}
        <ScrollReveal className="card rounded-[32px] border border-white/10 bg-gradient-to-r from-[#141419] to-[#1a1a24] p-8 sm:p-14 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-4 text-left">
              <Badge variant="orange" className="text-xs uppercase tracking-widest font-mono">
                The client experience
              </Badge>
              <TypographyH2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight font-display">
                A SCREENING ROOM WITH YOUR NAME ON IT.
              </TypographyH2>
              <TypographyLead className="text-base text-[#aeaeb4] leading-relaxed">
                Clients get a clean, branded page — versions side by side,
                comments in one place, and a single tap to approve. No clutter, no
                confusion.
              </TypographyLead>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-2xl p-6 bg-gradient-to-tr from-[#df3b0b] to-[#7f1396] border border-white/20 shadow-2xl space-y-4">
                <div className="rounded-xl bg-[#0d0d12] p-4 border border-white/10 space-y-3 text-left">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
                      <Sparkles className="size-3 text-[#f5551d]" /> CineSpace Screening Room
                    </span>
                    <Badge variant="sage" className="text-[10px] uppercase font-bold py-0.5">
                      BRANDED
                    </Badge>
                  </div>

                  <div className="rounded-lg overflow-hidden bg-black relative">
                    <AspectRatio ratio={16 / 9} className="w-full">
                      <AppImage
                        src={IMG_HERO}
                        alt="Screening Room"
                        fallbackIcon="film"
                        containerClassName="size-full"
                        className="w-full h-full object-cover opacity-80"
                      />
                    </AspectRatio>
                  </div>

                  {/* Ready for Download Asset Card */}
                  <div className="pt-2">
                    <Attachment state="done" size="sm" className="w-full bg-white/[0.05] border-white/15">
                      <AttachmentMedia variant="icon">
                        <Film className="size-4 text-[#f5551d]" />
                      </AttachmentMedia>
                      <AttachmentContent>
                        <AttachmentTitle className="text-xs text-white">Aisha_Omar_Master_4K_ProRes.mov</AttachmentTitle>
                        <AttachmentDescription className="text-[11px] text-zinc-400">
                          4.8 GB · 10-bit ProRes 422 HQ · Ready for Download
                        </AttachmentDescription>
                      </AttachmentContent>
                    </Attachment>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </TooltipProvider>
  );
}
