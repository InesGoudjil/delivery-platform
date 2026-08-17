"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  MessageCircle,
  Mail,
  BookOpen,
  ChevronDown,
  ExternalLink,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: "How does 4K adaptive streaming work for client review?",
    answer:
      "When you upload a master cut (ProRes, DNxHR, or MP4), CineSpace transcodes it into multi-bitrate HLS streams distributed across Cloudflare's global edge network. Your clients experience zero-buffer 4K playback and frame-accurate timecoded scrubbing on any device.",
  },
  {
    question: "Do clients need to create an account to leave review feedback?",
    answer:
      "No! Clients receive a private, branded review room link. They can immediately pause at any exact frame, type notes, approve cuts, or request revisions without downloading any apps or logging in.",
  },
  {
    question: "How do I connect my own custom studio domain?",
    answer:
      "Navigate to Brand & Customization (Settings) and enter your custom domain (e.g. review.yourstudio.com). Then add a single CNAME record pointing to cname.cinespace.film in your DNS registrar (GoDaddy, Cloudflare, Namecheap). SSL certificates are issued automatically.",
  },
  {
    question: "What is The Silo deep archive?",
    answer:
      "The Silo is our cold-storage archiving tier for finished projects. Once a film is delivered and approved, you can move it to The Silo to free up your active fast storage. Archived projects can be restored back to your active workspace within 24 hours whenever needed.",
  },
  {
    question: "How does WhatsApp delivery automation work?",
    answer:
      "When you publish a new cut, you can tap 'Share via WhatsApp'. CineSpace automatically formats a rich preview message with thumbnail, client room link, and passcode directly to your client's WhatsApp chat.",
  },
];

export default function HelpPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "studio";
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-border">
        <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-1">
          Support
        </div>
        <h1 className="text-3xl font-bold font-heading text-foreground">
          Help Center &amp; Support
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Find answers, video upload guides, and get in touch with the CineSpace filmmaker team.
        </p>
      </div>

      {/* Direct Support Channels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a
          href="https://wa.me/971501234567?text=Hi%20CineSpace%20Support"
          target="_blank"
          rel="noreferrer"
          className="p-5 rounded-2xl bg-card border border-border hover:border-emerald-500/40 hover:bg-muted/40 transition-all space-y-2 group shadow-sm"
        >
          <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <MessageCircle className="size-5" />
          </div>
          <div className="font-heading text-sm font-bold text-card-foreground group-hover:text-emerald-400 transition-colors">
            WhatsApp Concierge
          </div>
          <p className="text-xs text-muted-foreground">
            Direct chat with our technical support team in Dubai. Usually replies in 15 mins.
          </p>
        </a>

        <a
          href="mailto:support@cinespace.film"
          className="p-5 rounded-2xl bg-card border border-border hover:border-primary/40 hover:bg-muted/40 transition-all space-y-2 group shadow-sm"
        >
          <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <Mail className="size-5" />
          </div>
          <div className="font-heading text-sm font-bold text-card-foreground group-hover:text-primary transition-colors">
            Email Support
          </div>
          <p className="text-xs text-muted-foreground">
            Detailed workflow questions, billing inquiries, and feature suggestions.
          </p>
        </a>

        <Link
          href={`/${workspaceSlug}/docs`}
          className="p-5 rounded-2xl bg-card border border-border hover:border-blue-500/40 hover:bg-muted/40 transition-all space-y-2 group shadow-sm"
        >
          <div className="size-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <BookOpen className="size-5" />
          </div>
          <div className="font-heading text-sm font-bold text-card-foreground group-hover:text-blue-400 transition-colors">
            Workflow Docs
          </div>
          <p className="text-xs text-muted-foreground">
            Read guides on export codecs, color spaces (Rec.709 / P3), and DNS configuration.
          </p>
        </Link>
      </div>

      {/* Frequently Asked Questions */}
      <div className="rounded-2xl bg-card border border-border p-6 sm:p-8 space-y-4 shadow-sm">
        <h3 className="font-heading text-lg font-bold text-card-foreground pb-2 border-b border-border">
          Frequently Asked Questions
        </h3>

        <div className="divide-y divide-border">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i;

            return (
              <div key={i} className="py-4 first:pt-2 last:pb-2">
                <button
                  onClick={() => toggleFAQ(i)}
                  className="w-full flex items-center justify-between gap-4 text-left font-heading text-sm font-bold text-card-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`size-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <p className="text-xs text-muted-foreground mt-2.5 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-150">
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
