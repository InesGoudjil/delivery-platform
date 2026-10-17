"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, ShieldAlert, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeliveryExpiredScreenProps {
  title: string;
  expiresAt: string | null;
  workspace: {
    brandName: string;
    slug: string;
    logoUrl?: string | null;
    accentColor?: string;
  };
  portfolioUrl?: string | null;
}

export function DeliveryExpiredScreen({
  title,
  expiresAt,
  workspace,
  portfolioUrl,
}: DeliveryExpiredScreenProps) {
  const formattedDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "recently";

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#f6f3ec] flex flex-col justify-between selection:bg-primary selection:text-primary-foreground font-sans relative overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[360px] blur-[120px] opacity-25 rounded-full"
        style={{ backgroundColor: workspace.accentColor || "#f5551d" }}
      />

      {/* Top Header */}
      <header className="w-full px-6 py-6 border-b border-white/5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          {workspace.logoUrl ? (
            <div className="relative size-7 rounded-lg overflow-hidden border border-white/10">
              <Image
                src={workspace.logoUrl}
                alt={workspace.brandName}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div
              className="size-7 rounded-lg flex items-center justify-center font-bold text-xs text-black"
              style={{ backgroundColor: workspace.accentColor || "#f5551d" }}
            >
              {workspace.brandName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="text-xs font-mono tracking-widest uppercase font-semibold text-white/90">
            {workspace.brandName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <Clock className="size-3" />
            Expired Link
          </span>
        </div>
      </header>

      {/* Center Card */}
      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="max-w-md w-full rounded-3xl bg-[#141416]/90 backdrop-blur-xl border border-white/10 p-8 text-center space-y-6 shadow-2xl">
          <div className="size-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Clock className="size-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-mono text-primary uppercase tracking-widest font-semibold block">
              CLIENT REVIEW ROOM
            </span>
            <h1 className="text-2xl font-bold font-heading text-white tracking-tight">
              Review Link Expired
            </h1>
            <p className="text-sm font-medium text-white/90 line-clamp-1">
              &ldquo;{title}&rdquo;
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-left space-y-2">
            <div className="flex items-start gap-2.5 text-xs text-neutral-400">
              <ShieldAlert className="size-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Access to this delivery cut ended on{" "}
                <strong className="text-white">{formattedDate}</strong>. Client review links are set with time-limited lifecycles to protect confidential unreleased media.
              </span>
            </div>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed">
            If you need to review, approve, or download deliverables from this project, please reach out to <strong className="text-white">{workspace.brandName}</strong> to request an updated access link.
          </p>

          <div className="flex flex-col gap-2.5 pt-2">
            {portfolioUrl && (
              <Button
                asChild
                className="w-full rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs h-10 border border-white/10"
              >
                <Link href={portfolioUrl}>
                  <ExternalLink className="size-3.5 mr-2" />
                  View Studio Portfolio
                </Link>
              </Button>
            )}

            <Button
              asChild
              variant="ghost"
              className="w-full rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 font-mono text-[11px] h-9"
            >
              <Link href={`/login?redirect=/${workspace.slug}`}>
                Workspace Member? Sign in to manage <ArrowRight className="size-3 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-4 border-t border-white/5 text-center text-[11px] font-mono text-neutral-600 relative z-10">
        Powered by CineSpace · Secure 4K Master Deliveries
      </footer>
    </div>
  );
}
