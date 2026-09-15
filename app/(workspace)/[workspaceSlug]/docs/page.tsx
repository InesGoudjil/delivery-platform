import Link from "next/link";
import {
  BookOpen,
  Film,
  Shield,
  Layers,
  Upload,
  CheckCircle2,
  FileCode,
  Share2,
  Sparkles,
  ExternalLink,
  Lock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function DocsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;

  const phases = [
    {
      step: "01",
      title: "Master File Ingest & Transcoding",
      desc: "Upload original high-bitrate ProRes 422, ProRes 4444, or H.264/HEVC masters. CineSpace securely stores your untouched raw master for client handover and generates ultra-low latency adaptive bitrate streaming proxies.",
      icon: Upload,
      color: "text-[#f5551d]",
      bg: "bg-[#f5551d]/10",
    },
    {
      step: "02",
      title: "Client Delivery Room Generation",
      desc: "Every cut receives a tamper-resistant share token (/deliver/[shareToken]). No client account creation or app installation required. Compatible across Safari, Chrome, iOS, and iPadOS with accurate color fidelity.",
      icon: Share2,
      color: "text-[#86b98f]",
      bg: "bg-[#86b98f]/10",
    },
    {
      step: "03",
      title: "Frame-Accurate Feedback & Marker Stacking",
      desc: "Clients pause at exact frames (1/24s precision) to leave feedback. Comments are timecoded, threaded, and can be checked off as resolved once the revision is rendered.",
      icon: Layers,
      color: "text-[#ff8a45]",
      bg: "bg-[#ff8a45]/10",
    },
    {
      step: "04",
      title: "One-Click Cut Approval & Master Download",
      desc: "When revisions are complete, the client signs off with one-click cut approval. Master downloads unlock automatically or upon your release, allowing full uncompressed file delivery.",
      icon: CheckCircle2,
      color: "text-[#a78bfa]",
      bg: "bg-[#a78bfa]/10",
    },
    {
      step: "05",
      title: "One-Click Portfolio Showcase",
      desc: "Promote approved projects straight to your public filmmaker portfolio at /p/[your-slug]. Display custom posters, categories, aspect ratios, and studio credits.",
      icon: Sparkles,
      color: "text-[#38bdf8]",
      bg: "bg-[#38bdf8]/10",
    },
  ];

  const securityFeatures = [
    {
      title: "SHA-256 Passcode Protection",
      detail:
        "Client passcodes are cryptographically hashed using SHA-256 before validation. Access is granted via HTTP-only, SameSite cookies with a 7-day TTL.",
    },
    {
      title: "Granular Master File Download Locks",
      detail:
        "Toggle whether raw master files are downloadable during initial review stages, protecting your intellectual property until project sign-off.",
    },
    {
      title: "Supabase Row Level Security (RLS)",
      detail:
        "Workspace data, internal feedback, and studio settings are partitioned by workspace ID and user membership with verified Postgres RLS policies.",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Header */}
      <div className="pb-6 border-b border-border">
        <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-1">
          Studio Guide &amp; Architecture
        </div>
        <h1 className="text-3xl font-bold font-heading text-foreground">
          CineSpace Platform Documentation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          A filmmaker-first guide to client delivery pipelines, review rooms, security controls, and portfolio showcases.
        </p>
      </div>

      {/* Delivery Lifecycle Pipeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="size-5 text-[#f5551d]" />
            <h2 className="text-xl font-bold font-heading text-foreground">
              The CineSpace Delivery Pipeline
            </h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="text-xs rounded-xl border-border hover:bg-muted"
          >
            <Link href={`/${workspaceSlug}/deliveries`}>
              Open Deliveries
              <ArrowRight className="size-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          How video assets progress from initial upload to client review, revision feedback, and final master sign-off.
        </p>

        <div className="grid grid-cols-1 gap-4">
          {phases.map((phase) => {
            const Icon = phase.icon;
            return (
              <div
                key={phase.step}
                className="p-6 rounded-2xl bg-card border border-border flex items-start gap-4 shadow-sm"
              >
                <div
                  className={`size-11 rounded-2xl ${phase.bg} ${phase.color} flex items-center justify-center shrink-0 font-mono font-bold text-sm`}
                >
                  <Icon className="size-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                      Step {phase.step}
                    </span>
                    <h3 className="text-base font-bold font-heading text-card-foreground">
                      {phase.title}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {phase.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security Architecture */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-[#86b98f]" />
          <h2 className="text-xl font-bold font-heading text-foreground">
            Security &amp; Asset Protection
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Engineered to give directors and production studios absolute control over their pre-release footage.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {securityFeatures.map((sec, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-card border border-border space-y-2 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="size-8 rounded-xl bg-muted text-foreground flex items-center justify-center mb-2">
                  <Lock className="size-4 text-[#f5551d]" />
                </div>
                <h3 className="text-sm font-bold font-heading text-card-foreground">
                  {sec.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {sec.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Access Links Footer */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-card to-muted/40 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <h3 className="text-base font-bold font-heading text-foreground">
            Have questions during client review?
          </h3>
          <p className="text-xs text-muted-foreground">
            Check the Filmmaker Help Center for player shortcuts and quick troubleshooting tips.
          </p>
        </div>
        <Button
          asChild
          className="bg-[#f5551d] hover:bg-[#f5551d]/90 text-white font-semibold text-xs rounded-xl px-4 py-2 shrink-0"
        >
          <Link href={`/${workspaceSlug}/help`}>
            View Help &amp; Keyboard Shortcuts
          </Link>
        </Button>
      </div>
    </div>
  );
}
