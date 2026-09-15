import Link from "next/link";
import {
  Keyboard,
  HelpCircle,
  Film,
  Lock,
  Download,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Mail,
  ShieldCheck,
  Play,
  Share2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function HelpPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;

  const shortcuts = [
    { key: "Space", action: "Play / Pause playback", category: "Playback" },
    { key: "J / K / L", action: "Reverse / Pause / Fast Forward (Shuttle)", category: "Playback" },
    { key: "← / →", action: "Step backward / forward 1 frame (1/24s)", category: "Precision" },
    { key: "Shift + ← / →", action: "Jump backward / forward 1 second", category: "Navigation" },
    { key: "M", action: "Drop new timecoded feedback marker", category: "Review" },
    { key: "F", action: "Toggle cinema fullscreen mode", category: "Display" },
    { key: "C", action: "Toggle feedback comments drawer", category: "Review" },
  ];

  const faqs = [
    {
      question: "How do client delivery rooms work?",
      answer:
        "Every delivery has a unique, secure share token (/deliver/[shareToken]). Clients never need to create an account or install software. They can play back your cuts smoothly in their browser, drop timecoded notes at exact frames, and approve cuts with one click.",
    },
    {
      question: "What video formats and resolutions are supported?",
      answer:
        "You can upload high-bitrate masters including ProRes 422, ProRes 4444, DNxHR, H.264, and HEVC/H.265 up to 4K 60fps. CineSpace creates fast adaptive-bitrate streaming proxies for instant playback while preserving your original untouched master file for client download.",
    },
    {
      question: "How do passcodes and security work?",
      answer:
        "When you enable a passcode for a delivery, the client must enter it before accessing playback or files. Passcodes are hashed with SHA-256 and authenticated sessions are maintained using encrypted HTTP-only cookies for 7 days.",
    },
    {
      question: "Can I restrict master file downloads until final approval?",
      answer:
        "Yes. In your delivery settings, you can toggle 'Allow Master Downloads' off during work-in-progress review rounds. Once the client approves the cut or completes payment, toggle downloads on to unlock full-resolution assets.",
    },
    {
      question: "How do I show completed deliveries on my public portfolio?",
      answer:
        "Turn on 'Show in Public Portfolio' in the delivery settings. Your cut will immediately appear on your custom branded portfolio at /p/[your-slug], showcasing your best work to future clients.",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Header */}
      <div className="pb-6 border-b border-border">
        <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-1">
          Support &amp; Resources
        </div>
        <h1 className="text-3xl font-bold font-heading text-foreground">
          Filmmaker Help &amp; Shortcuts
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Keyboard shortcuts for frame-accurate review, answers to common workflow questions, and direct support.
        </p>
      </div>

      {/* Quick navigation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href={`/${workspaceSlug}/docs`}
          className="p-5 rounded-2xl bg-card border border-border hover:border-border/80 hover:bg-muted/40 transition-all group"
        >
          <div className="size-9 rounded-xl bg-[#f5551d]/10 text-[#f5551d] flex items-center justify-center mb-3">
            <Film className="size-5" />
          </div>
          <h3 className="text-sm font-bold font-heading text-card-foreground group-hover:text-[#f5551d] transition-colors">
            Studio Documentation
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Complete guide to delivery workflows, versioning, security, and portfolio management.
          </p>
        </Link>

        <Link
          href={`/${workspaceSlug}/deliveries`}
          className="p-5 rounded-2xl bg-card border border-border hover:border-border/80 hover:bg-muted/40 transition-all group"
        >
          <div className="size-9 rounded-xl bg-[#86b98f]/10 text-[#86b98f] flex items-center justify-center mb-3">
            <Share2 className="size-5" />
          </div>
          <h3 className="text-sm font-bold font-heading text-card-foreground group-hover:text-[#86b98f] transition-colors">
            Manage Deliveries
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Create new delivery rooms, update passcodes, manage cut versions, and view client approvals.
          </p>
        </Link>

        <Link
          href={`/${workspaceSlug}/security`}
          className="p-5 rounded-2xl bg-card border border-border hover:border-border/80 hover:bg-muted/40 transition-all group"
        >
          <div className="size-9 rounded-xl bg-[#ff8a45]/10 text-[#ff8a45] flex items-center justify-center mb-3">
            <ShieldCheck className="size-5" />
          </div>
          <h3 className="text-sm font-bold font-heading text-card-foreground group-hover:text-[#ff8a45] transition-colors">
            Security &amp; Passcodes
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Update your account password, manage default review security, and configure download locks.
          </p>
        </Link>
      </div>

      {/* Keyboard Shortcuts Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Keyboard className="size-5 text-[#f5551d]" />
          <h2 className="text-xl font-bold font-heading text-foreground">
            Review Player Keyboard Shortcuts
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Industry-standard NLE playback shortcuts available both in your filmmaker studio and in client delivery rooms.
        </p>

        <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
          <div className="grid grid-cols-1 divide-y divide-border">
            {shortcuts.map((sc) => (
              <div
                key={sc.key}
                className="flex items-center justify-between p-4 px-5 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-muted text-foreground border border-border shadow-xs">
                    {sc.key}
                  </span>
                  <span className="text-sm text-card-foreground font-medium">
                    {sc.action}
                  </span>
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                  {sc.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="size-5 text-[#86b98f]" />
          <h2 className="text-xl font-bold font-heading text-foreground">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-card border border-border space-y-2"
            >
              <div className="text-sm font-bold font-heading text-foreground flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[#86b98f] shrink-0" />
                <span>{faq.question}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Direct Contact Support Box */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-card to-muted/50 border border-border space-y-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold font-heading text-foreground">
              Need personalized assistance?
            </h3>
            <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
              Our video engineering team is available to help with high-volume uploads, custom branding domains, or review player troubleshooting.
            </p>
          </div>
          <div className="size-10 rounded-2xl bg-[#f5551d]/10 text-[#f5551d] flex items-center justify-center shrink-0">
            <Mail className="size-5" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            asChild
            className="bg-[#f5551d] hover:bg-[#f5551d]/90 text-white font-semibold text-xs rounded-xl px-4 py-2"
          >
            <a href="mailto:support@cinespace.video?subject=Filmmaker Support Request">
              Email Engineering Support
            </a>
          </Button>
          <Button
            variant="outline"
            asChild
            className="text-xs rounded-xl border-border hover:bg-muted"
          >
            <Link href={`/${workspaceSlug}/docs`}>
              Explore Full Studio Documentation
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
