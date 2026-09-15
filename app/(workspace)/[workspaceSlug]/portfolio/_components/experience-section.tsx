"use client";

import React, { useState, useTransition } from "react";
import { Briefcase, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updatePortfolioAction } from "@/app/actions/portfolio";
import { PortfolioExperience } from "@/core/entities/portfolio";

interface ExperienceSectionProps {
  portfolioId: string;
  initialExperiences: PortfolioExperience[];
  showFlash: (msg: string) => void;
}

export function ExperienceSection({
  portfolioId,
  initialExperiences,
  showFlash,
}: ExperienceSectionProps) {
  const [isPending, startTransition] = useTransition();

  const [experiences, setExperiences] =
    useState<PortfolioExperience[]>(initialExperiences);
  const [showExperienceModal, setShowExperienceModal] = useState(false);

  const [newExpRole, setNewExpRole] = useState("");
  const [newExpCompany, setNewExpCompany] = useState("");
  const [newExpYears, setNewExpYears] = useState("");
  const [newExpDesc, setNewExpDesc] = useState("");

  const handleAddExperience = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpRole.trim() || !newExpCompany.trim()) return;

    const newExp: PortfolioExperience = {
      id: `exp_${Date.now()}`,
      role: newExpRole,
      company: newExpCompany,
      years: newExpYears || "Present",
      description: newExpDesc,
    };

    const updatedList = [newExp, ...experiences];
    setExperiences(updatedList);
    setNewExpRole("");
    setNewExpCompany("");
    setNewExpYears("");
    setNewExpDesc("");
    setShowExperienceModal(false);

    startTransition(async () => {
      await updatePortfolioAction(portfolioId, {
        experience: updatedList,
      });
      showFlash("Experience entry added & saved!");
    });
  };

  const handleDeleteExperience = (id: string) => {
    const updatedList = experiences.filter((e) => e.id !== id);
    setExperiences(updatedList);

    startTransition(async () => {
      await updatePortfolioAction(portfolioId, {
        experience: updatedList,
      });
      showFlash("Experience entry removed.");
    });
  };

  return (
    <section className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-5 md:p-6 shadow-sm space-y-4">
      {/* Add Experience Modal */}
      {showExperienceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-card rounded-3xl p-6 border border-border shadow-2xl space-y-4 relative">
            <button
              onClick={() => setShowExperienceModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-5" />
            </button>
            <h3 className="text-base font-bold text-card-foreground flex items-center gap-2">
              <Briefcase className="size-4 text-[#f5551d]" />
              Add Experience / Credential
            </h3>

            <form onSubmit={handleAddExperience} className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground font-medium">Role / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Lead Colorist & Director"
                  value={newExpRole}
                  onChange={(e) => setNewExpRole(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl px-3.5 py-2 text-foreground focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="text-muted-foreground font-medium">Company / Agency / Freelance</label>
                <input
                  type="text"
                  placeholder="e.g. Red Bull Media House"
                  value={newExpCompany}
                  onChange={(e) => setNewExpCompany(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl px-3.5 py-2 text-foreground focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="text-muted-foreground font-medium">Years / Duration</label>
                <input
                  type="text"
                  placeholder="e.g. 2022 - Present"
                  value={newExpYears}
                  onChange={(e) => setNewExpYears(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl px-3.5 py-2 text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-muted-foreground font-medium">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of responsibilities or featured campaigns..."
                  value={newExpDesc}
                  onChange={(e) => setNewExpDesc(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl px-3.5 py-2 text-foreground focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowExperienceModal(false)}
                  className="rounded-xl text-xs text-muted-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-primary text-black font-bold text-xs hover:bg-primary/90"
                >
                  {isPending ? "Saving..." : "Save Entry"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <Briefcase className="size-4 text-[#f5551d]" />
          <span>Experience &amp; Client Roster</span>
        </div>
        <Button
          size="sm"
          onClick={() => setShowExperienceModal(true)}
          className="rounded-xl bg-muted hover:bg-muted/80 text-xs font-medium text-foreground border border-border h-7 px-3 cursor-pointer"
        >
          <Plus className="size-3 mr-1 text-[#f5551d]" /> Add Experience
        </Button>
      </div>

      {experiences.length === 0 ? (
        <div className="text-center py-8 px-4 border border-dashed border-white/10 rounded-xl space-y-2">
          <Briefcase className="size-6 text-zinc-600 mx-auto" />
          <p className="text-xs text-zinc-400 font-medium">No experience credentials added yet.</p>
          <p className="text-[11px] text-zinc-600">
            Add commercial campaigns, studio roles, or agency work to showcase your industry credibility.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {experiences.map((exp) => (
            <div
              key={exp.id}
              className="p-4 rounded-xl bg-[#0c0c0e] border border-white/10 space-y-1.5 relative group"
            >
              <button
                onClick={() => handleDeleteExperience(exp.id)}
                className="absolute top-3 right-3 text-[#71717a] hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Remove entry"
              >
                <X className="size-4" />
              </button>
              <div className="flex items-center justify-between pr-6">
                <span className="text-xs font-bold text-white">{exp.role}</span>
                <span className="text-[10px] font-mono text-[#f5551d] font-semibold">
                  {exp.years}
                </span>
              </div>
              <div className="text-[11px] text-[#a1a1aa] font-medium">{exp.company}</div>
              {exp.description && (
                <p className="text-[11px] text-[#71717a] pt-1 leading-relaxed">
                  {exp.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
