import React from "react";
import { Lock, Film, Clock } from "lucide-react";
import {
  motion,
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
} from "@/components/ui/motion";

export function SiloSection() {
  return (
    <ScrollReveal id="silo" className="scroll-mt-24 py-16 sm:py-20 lg:py-24 text-center">
      {/* Section Header */}
      <div className="space-y-3 max-w-3xl mx-auto">
        <div className="flex justify-center">
          <motion.div
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary"
            whileHover={{ scale: 1.04 }}
            transition={{ duration: 0.2 }}
          >
            <Lock className="size-3.5" />
            <span>SECURE ARCHIVE</span>
          </motion.div>
        </div>

        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-primary tracking-tight font-display uppercase">
          THE SILO
        </h2>

        <p className="text-sm sm:text-base text-[#aeaeb4] max-w-2xl mx-auto leading-relaxed">
          Delivered a project? Move it to The Silo — secure cold storage that frees up your active space, and pulls back the moment a client returns.
        </p>

        <div className="pt-1">
          <span className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            1 TB · <span className="text-primary">$79/YR</span>
          </span>
        </div>
      </div>

      {/* Small spacing from header block to content */}
      <div className="mt-10 sm:mt-12">
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left" staggerDelay={0.1}>
        {[
          {
            icon: Film,
            title: "Free up your space",
            description:
              "Archive finished, client-approved work so your active storage stays clear for new projects.",
          },
          {
            icon: Lock,
            title: "Safe for the long haul",
            description:
              "Your deliverables sit in secure long-term storage — nothing lost, nothing expiring.",
          },
          {
            icon: Clock,
            title: "Restore anytime",
            description:
              "Need it back? Pull a project out of The Silo in 24-48 hours, ready to re-deliver.",
          },
        ].map((card, idx) => {
          const IconComponent = card.icon;
          return (
            <StaggerItem key={idx}>
              <motion.div
                className="card rounded-2xl border border-white/10 bg-[#121217] p-8 shadow-xl space-y-4 hover:border-white/20 transition-all h-full"
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <IconComponent className="size-5" />
                </div>
                <h3 className="text-lg font-bold text-white font-display">
                  {card.title}
                </h3>
                <p className="text-sm text-[#aeaeb4] leading-relaxed">
                  {card.description}
                </p>
              </motion.div>
            </StaggerItem>
          );
        })}
        </StaggerContainer>
      </div>

      {/* Subtext */}
      <p className="mt-6 text-xs italic text-[#71717a]">
        On Pro & Studio · $79/yr per TB · restore in 24-48h.
      </p>
    </ScrollReveal>
  );
}
