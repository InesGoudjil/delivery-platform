"use client";

import React from "react";
import { ExperienceSection } from "../../portfolio/_components/experience-section";
import { PortfolioExperience } from "@/core/entities/portfolio";

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
        <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-0.5">
          Industry Track Record
        </div>
        <h2 className="text-xl font-bold font-heading text-foreground tracking-tight">
          EXPERIENCE &amp; CLIENT CREDENTIALS
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Add key roles, production houses, agencies, or brand campaigns you have worked with.
        </p>
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
