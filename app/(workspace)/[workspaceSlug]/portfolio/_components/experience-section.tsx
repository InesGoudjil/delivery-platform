"use client";

import React, { useState, useTransition } from "react";
import { Briefcase, Plus, X, Pencil, MapPin } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updatePortfolioAction } from "@/app/actions/portfolio";
import { PortfolioExperience } from "@/core/entities/portfolio";

interface ExperienceSectionProps {
  portfolioId: string;
  initialExperiences: PortfolioExperience[];
  showFlash: (msg: string) => void;
  onExperiencesChange?: (list: PortfolioExperience[]) => void;
}

const CATEGORY_SUGGESTIONS = [
  "Commercial",
  "Automotive",
  "Fashion & Editorial",
  "Documentary",
  "Music Video",
  "Luxury Wedding",
  "Brand Campaign",
];

export function ExperienceSection({
  portfolioId,
  initialExperiences,
  showFlash,
  onExperiencesChange,
}: ExperienceSectionProps) {
  const [isPending, startTransition] = useTransition();

  const [experiences, setExperiences] =
    useState<PortfolioExperience[]>(initialExperiences);
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [editingExpId, setEditingExpId] = useState<string | null>(null);

  const [expRole, setExpRole] = useState("");
  const [expCompany, setExpCompany] = useState("");
  const [expYears, setExpYears] = useState("");
  const [expLocation, setExpLocation] = useState("");
  const [expCategory, setExpCategory] = useState("");
  const [expDesc, setExpDesc] = useState("");

  const resetForm = () => {
    setExpRole("");
    setExpCompany("");
    setExpYears("");
    setExpLocation("");
    setExpCategory("");
    setExpDesc("");
    setEditingExpId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowExperienceModal(true);
  };

  const handleOpenEdit = (item: PortfolioExperience) => {
    setEditingExpId(item.id);
    setExpRole(item.role || "");
    setExpCompany(item.company || "");
    setExpYears(item.years || "");
    setExpLocation(item.location || "");
    setExpCategory(item.category || "");
    setExpDesc(item.description || "");
    setShowExperienceModal(true);
  };

  const handleSaveExperience = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expRole.trim() || !expCompany.trim()) return;

    let updatedList: PortfolioExperience[];

    if (editingExpId) {
      updatedList = experiences.map((exp) =>
        exp.id === editingExpId
          ? {
              ...exp,
              role: expRole.trim(),
              company: expCompany.trim(),
              years: expYears.trim() || "Present",
              location: expLocation.trim() || undefined,
              category: expCategory.trim() || undefined,
              description: expDesc.trim() || undefined,
            }
          : exp
      );
    } else {
      const newExp: PortfolioExperience = {
        id: `exp_${Date.now()}`,
        role: expRole.trim(),
        company: expCompany.trim(),
        years: expYears.trim() || "Present",
        location: expLocation.trim() || undefined,
        category: expCategory.trim() || undefined,
        description: expDesc.trim() || undefined,
      };
      updatedList = [newExp, ...experiences];
    }

    setExperiences(updatedList);
    if (onExperiencesChange) {
      onExperiencesChange(updatedList);
    }
    setShowExperienceModal(false);
    resetForm();

    startTransition(async () => {
      await updatePortfolioAction(portfolioId, {
        experience: updatedList,
      });
      showFlash(
        editingExpId
          ? "Experience credential updated & saved!"
          : "Experience credential added & saved!"
      );
    });
  };

  const handleDeleteExperience = (id: string) => {
    const updatedList = experiences.filter((e) => e.id !== id);
    setExperiences(updatedList);
    if (onExperiencesChange) {
      onExperiencesChange(updatedList);
    }

    startTransition(async () => {
      await updatePortfolioAction(portfolioId, {
        experience: updatedList,
      });
      showFlash("Experience credential removed.");
    });
  };

  return (
    <Card className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-5 md:p-6 shadow-sm space-y-4 hover:translate-y-0 hover:shadow-sm">
      {/* Add / Edit Experience Modal via shadcn Dialog */}
      <Dialog
        open={showExperienceModal}
        onOpenChange={(open) => {
          setShowExperienceModal(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-card-foreground flex items-center gap-2">
              <Briefcase className="size-4 text-[#f5551d]" />
              <span>
                {editingExpId
                  ? "Edit Experience / Credential"
                  : "Add Experience / Credential"}
              </span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveExperience} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-muted-foreground font-medium block">
                  Role / Title <span className="text-[#f5551d]">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Lead Director & DP"
                  value={expRole}
                  onChange={(e) => setExpRole(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground font-medium block">
                  Company / Client / Agency <span className="text-[#f5551d]">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Red Bull Media House"
                  value={expCompany}
                  onChange={(e) => setExpCompany(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-muted-foreground font-medium block">
                  Years / Duration
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. 2022 — Present"
                  value={expYears}
                  onChange={(e) => setExpYears(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground font-medium block">
                  Location / Region
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Dubai, UAE"
                  value={expLocation}
                  onChange={(e) => setExpLocation(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground font-medium block">
                Category / Focus
              </Label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {CATEGORY_SUGGESTIONS.map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setExpCategory(cat)}
                    className={`text-[10px] px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                      expCategory === cat
                        ? "bg-[#f5551d]/20 border-[#f5551d] text-[#f5551d] font-bold"
                        : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <Input
                type="text"
                placeholder="Or enter custom category..."
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground font-medium block">
                Description / Key Accomplishments
              </Label>
              <textarea
                rows={3}
                placeholder="Directing 4K commercial campaigns, high-speed tracking reels, or key broadcast commercials..."
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                className="w-full bg-muted/50 border border-border rounded-xl px-3.5 py-2 text-foreground focus:outline-none focus:border-primary text-xs resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowExperienceModal(false);
                  resetForm();
                }}
                className="rounded-xl text-xs text-muted-foreground cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-[#f5551d] hover:bg-[#ff8a45] text-black font-bold text-xs cursor-pointer"
              >
                {isPending ? "Saving..." : editingExpId ? "Save Changes" : "Add Credential"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Section Header using CardHeader, CardTitle, and CardAction */}
      <CardHeader className="border-b border-border pb-3 flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-xs font-bold text-foreground font-heading">
          <Briefcase className="size-4 text-[#f5551d]" />
          <span>Experience &amp; Client Track Record</span>
        </CardTitle>
        <CardAction>
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenAdd}
            className="rounded-xl bg-muted hover:bg-muted/80 text-xs font-medium text-foreground border border-border h-7 px-3 cursor-pointer"
          >
            <Plus className="size-3 mr-1 text-[#f5551d]" /> Add Experience
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="pt-2">
        {experiences.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-white/10 rounded-xl space-y-2">
            <Briefcase className="size-6 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-400 font-medium">No experience credentials added yet.</p>
            <p className="text-[11px] text-zinc-600 max-w-sm mx-auto">
              Add commercial campaigns, studio roles, or agency projects to showcase your industry credibility to prospective clients.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {experiences.map((exp) => (
              <Card
                key={exp.id}
                size="sm"
                className="bg-[#0c0c0e] border border-white/10 relative group hover:border-white/20 transition-all shadow-sm"
              >
                <CardHeader className="pb-1">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-xs font-bold text-white">
                    <span>{exp.role}</span>
                    {exp.category && (
                      <Badge variant="orange" className="text-[10px] font-mono px-2 py-0.5 rounded-full font-medium">
                        {exp.category}
                      </Badge>
                    )}
                  </CardTitle>

                  <CardDescription className="text-[11px] text-zinc-300 font-medium flex flex-wrap items-center gap-1.5">
                    <span>{exp.company}</span>
                    {exp.location && (
                      <span className="text-zinc-500 flex items-center gap-0.5">
                        <MapPin className="size-2.5" />
                        {exp.location}
                      </span>
                    )}
                  </CardDescription>

                  {/* Action Buttons: Edit and Delete in CardAction */}
                  <CardAction className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleOpenEdit(exp)}
                      className="size-7 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title="Edit entry"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDeleteExperience(exp.id)}
                      className="size-7 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Remove entry"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </CardAction>
                </CardHeader>

                <CardContent className="space-y-1.5 text-xs">
                  <div className="text-[10px] font-mono text-[#f5551d] font-semibold">
                    {exp.years}
                  </div>

                  {exp.description && (
                    <p className="text-[11px] text-zinc-400 pt-1 leading-relaxed border-t border-white/5">
                      {exp.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
