"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Film,
  Globe,
  Code2,
  HardDrive,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function DocsPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "studio";

  const GUIDES = [
    {
      icon: Film,
      title: "Optimal Export Settings for 4K Review",
      description:
        "Best practice render presets for DaVinci Resolve, Premiere Pro, and Final Cut Pro. Target bitrates, Rec.709 color tags, and multi-channel audio.",
      tag: "Video Specs",
    },
    {
      icon: Globe,
      title: "Custom Domain DNS & SSL Setup",
      description:
        "Step-by-step instructions to point review.yourbrand.com to CineSpace with automatic zero-configuration Cloudflare SSL certificates.",
      tag: "Domain Setup",
    },
    {
      icon: Code2,
      title: "WhatsApp & Webhook Notifications",
      description:
        "Receive real-time JSON payloads when clients approve cuts, leave frame-accurate comments, or download ProRes masters.",
      tag: "Automation",
    },
    {
      icon: HardDrive,
      title: "The Silo Cold Storage Archive Protocol",
      description:
        "How project archiving works, SLA turnaround times for restoration, and managing cold data quotas.",
      tag: "Storage",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-border">
        <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-1">
          Support
        </div>
        <h1 className="text-3xl font-bold font-heading text-foreground">
          Documentation &amp; Guides
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Technical specifications, color management workflows, and integrations for film post-production.
        </p>
      </div>

      {/* Guides Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {GUIDES.map((g, i) => (
          <div
            key={i}
            className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all duration-200 flex flex-col justify-between space-y-4 group shadow-sm hover:shadow-md cursor-pointer"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <g.icon className="size-5" />
                </div>
                <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                  {g.tag}
                </span>
              </div>

              <h3 className="font-heading text-base font-bold text-card-foreground group-hover:text-primary transition-colors">
                {g.title}
              </h3>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {g.description}
              </p>
            </div>

            <div className="flex items-center text-xs font-semibold text-primary pt-2 border-t border-border/60 gap-1 group-hover:translate-x-1 transition-transform">
              <span>Read Guide</span>
              <ArrowRight className="size-3.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
