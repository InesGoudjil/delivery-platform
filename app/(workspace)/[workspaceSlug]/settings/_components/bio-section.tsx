"use client";

import React from "react";
import { FileText } from "lucide-react";

interface BioSectionProps {
  bio: string;
  onBioChange: (val: string) => void;
}

export function BioSection({ bio, onBioChange }: BioSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-0.5">
          Artist Statement
        </div>
        <h2 className="text-xl font-bold font-heading text-foreground tracking-tight flex items-center gap-2">
          <FileText className="size-5 text-[#f5551d]" />
          BIO &amp; ABOUT DESCRIPTION
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Introduce yourself to directors, agencies, and clients visiting your public showcase.
        </p>
      </div>

      <div className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-5 md:p-6 shadow-sm space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#f6f3ec]">
              Filmmaker / Studio Biography
            </label>
            <span className="text-[11px] font-mono text-zinc-500">
              {bio.length} characters
            </span>
          </div>

          <textarea
            rows={4}
            value={bio}
            onChange={(e) => onBioChange(e.target.value)}
            placeholder="e.g. Commercial director and cinematographer based in Dubai with over 6 years of experience across automotive, fashion, and luxury hospitality campaigns..."
            className="w-full bg-[#0c0c0e] border border-white/[0.08] rounded-xl p-4 text-sm text-[#f6f3ec] focus:outline-none focus:border-[#f5551d] leading-relaxed transition-colors resize-y"
          />
        </div>

        <div className="rounded-xl bg-[#0c0c0e]/80 border border-white/[0.06] p-4 flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-[#f5551d] mt-1.5 shrink-0" />
          <div className="text-xs text-zinc-400 leading-relaxed">
            <strong className="text-zinc-200">Pro-Tip for Gulf Filmmakers:</strong> Mentioning your base city (e.g. Dubai, Abu Dhabi, Riyadh) and primary equipment specialties (e.g. Arri Alexa Mini LF, RED V-Raptor, Anamorphic) increases commercial booking inquiries by 40%.
          </div>
        </div>
      </div>
    </section>
  );
}
