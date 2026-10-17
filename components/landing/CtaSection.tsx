import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, ScrollReveal } from "@/components/ui/motion";

interface CtaSectionProps {
  onStartTrial: () => void;
}

export function CtaSection({ onStartTrial }: CtaSectionProps) {
  return (
    <ScrollReveal className="py-16 sm:py-20 lg:py-24">
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-primary/80 via-primary to-primary/60 p-12 sm:p-20 text-center shadow-2xl border border-white/10">
        {/* Ambient Dark Image & Glow Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/20 via-black/40 to-black/80 pointer-events-none" />
        <div
          className="absolute inset-0 opacity-25 bg-cover bg-center mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=80')",
          }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-3xl mx-auto space-y-8">
          <h2 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight uppercase font-display">
            START DELIVERING <br />
            LIKE A STUDIO.
          </h2>

          <div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="inline-block"
            >
              <Button
                asChild
                className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-8 py-4 h-auto text-sm sm:text-base font-bold uppercase tracking-wider shadow-2xl shadow-primary/50 transition-all hover:bg-primary/90 hover:shadow-primary/75"
              >
                <Link href="/signup">
                  GET STARTED <ArrowRight className="size-4 sm:size-5" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}
