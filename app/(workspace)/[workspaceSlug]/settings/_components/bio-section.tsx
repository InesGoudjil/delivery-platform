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

      <div className="rounded-2xl bg-card border border-border p-5 md:p-6 shadow-sm space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground">
              Filmmaker / Studio Biography
            </label>
            <span className="text-[11px] font-mono text-muted-foreground">
              {bio.length} characters
            </span>
          </div>

          <textarea
            rows={4}
            value={bio}
            onChange={(e) => onBioChange(e.target.value)}
            placeholder="e.g. Commercial director and cinematographer based in Dubai with over 6 years of experience across automotive, fashion, and luxury hospitality campaigns..."
            className="w-full bg-muted/50 border border-border rounded-xl p-4 text-sm text-foreground focus:outline-none focus:border-primary leading-relaxed transition-colors resize-y"
          />
        </div>

        <div className="rounded-xl bg-muted/40 border border-border p-4 flex items-start gap-3">
          <div className="size-2 rounded-full bg-[#f5551d] mt-1.5 shrink-0" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Pro-Tip for Gulf Filmmakers:</strong> Mentioning your base city (e.g. Dubai, Abu Dhabi, Riyadh) and primary equipment specialties (e.g. Arri Alexa Mini LF, RED V-Raptor, Anamorphic) increases commercial booking inquiries by 40%.
          </div>
        </div>
      </div>
    </section>
  );
}
