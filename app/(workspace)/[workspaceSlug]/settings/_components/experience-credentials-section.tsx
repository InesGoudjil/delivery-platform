"use client";

import React from "react";
import { ExperienceSection } from "../../portfolio/_components/experience-section";
import { PortfolioExperience } from "@/core/entities/portfolio";
import { Badge } from "@/components/ui/badge";
import { TypographyH2, TypographyMuted } from "@/components/ui/typography";

interface ExperienceCredentialsSectionProps {
  portfolioId: string;
  initialExperiences: PortfolioExperience[];
  showFlash: (msg: string) => void;
  onExperiencesChange?: (list: PortfolioExperience[]) => void;
}

export function ExperienceCredentialsSection({
  portfolioId,
  initialExperiences,
  showFlash,
  onExperiencesChange,
}: ExperienceCredentialsSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="orange" className="font-mono text-[10px] tracking-wider uppercase">
            Industry Track Record
          </Badge>
        </div>
        <TypographyH2 className="text-xl font-bold font-heading text-foreground tracking-tight border-none pb-0">
          EXPERIENCE &amp; CLIENT CREDENTIALS
        </TypographyH2>
        <TypographyMuted className="text-xs text-muted-foreground mt-0.5">
          Add key roles, production houses, agencies, or brand campaigns you have worked with.
        </TypographyMuted>
      </div>

      <ExperienceSection
        portfolioId={portfolioId}
        initialExperiences={initialExperiences}
        showFlash={showFlash}
        onExperiencesChange={onExperiencesChange}
      />
    </section>
  );
}
