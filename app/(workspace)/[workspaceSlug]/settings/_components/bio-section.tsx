"use client";

import React from "react";
import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TypographyH2, TypographyMuted } from "@/components/ui/typography";

interface BioSectionProps {
  bio: string;
  onBioChange: (val: string) => void;
}

export function BioSection({ bio, onBioChange }: BioSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="orange" className="font-mono text-[10px] tracking-wider uppercase">
            Artist Statement
          </Badge>
        </div>
        <TypographyH2 className="text-xl font-bold font-heading text-foreground tracking-tight flex items-center gap-2 border-none pb-0">
          <FileText className="size-5 text-primary" />
          BIO &amp; ABOUT DESCRIPTION
        </TypographyH2>
        <TypographyMuted className="text-xs text-muted-foreground mt-0.5">
          Introduce yourself to directors, agencies, and clients visiting your public showcase.
        </TypographyMuted>
      </div>

      <Card className="rounded-2xl bg-card/90 border border-border p-5 md:p-6 shadow-sm space-y-4 hover:translate-y-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
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
            className="w-full bg-muted/50 border border-border rounded-xl p-4 text-sm text-foreground focus:outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 leading-relaxed transition-colors resize-y"
          />
        </div>

        <div className="rounded-xl bg-muted/40 border border-border p-4 flex items-start gap-3">
          <div className="size-2 rounded-full bg-primary mt-1.5 shrink-0" />
          <TypographyMuted className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Pro-Tip for Gulf Filmmakers:</strong> Mentioning your base city (e.g. Dubai, Abu Dhabi, Riyadh) and primary equipment specialties (e.g. Arri Alexa Mini LF, RED V-Raptor, Anamorphic) increases commercial booking inquiries by 40%.
          </TypographyMuted>
        </div>
      </Card>
    </section>
  );
}
