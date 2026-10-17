"use client";

import { Star, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion, FadeIn } from "@/components/ui/motion";

interface HeroSectionProps {
  onOpenDemo: () => void;
  onStartTrial: () => void;
}

export function HeroSection({ onOpenDemo, onStartTrial }: HeroSectionProps) {
  return (
    <section className="relative pt-6 sm:pt-10 pb-16 sm:pb-20 lg:pb-24 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Headline & Action */}
          <div className="lg:col-span-6 space-y-6 text-left">
            {/* Partner Program Badge */}
            <FadeIn delay={0.05} distance={15}>
              <motion.div
                className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary"
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.2 }}
              >
                <Star className="size-3.5 fill-current" />
                <span>PARTNER PROGRAM — APPLICATIONS OPEN</span>
              </motion.div>
            </FadeIn>

            {/* Main Headline */}
            <FadeIn delay={0.15} distance={22}>
              <h1 className="text-4xl sm:text-6xl xl:text-7xl font-extrabold text-white tracking-tight leading-[1.05] font-display">
                DELIVER FILMS <br />
                LIKE A STUDIO.
              </h1>
            </FadeIn>

            {/* Subheading */}
            <FadeIn delay={0.25} distance={20}>
              <p className="text-base sm:text-lg text-[#b4b4bb] max-w-xl font-normal leading-relaxed">
                Your portfolio, client feedback, and delivery — in one place, built for elite filmmakers, videographers, and production agencies.
              </p>
            </FadeIn>

            {/* Action Buttons */}
            <FadeIn delay={0.35} distance={20}>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }}>
                  <Button
                    asChild
                    className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-7 py-3.5 h-auto text-sm font-bold uppercase tracking-wider shadow-xl shadow-primary/30 transition-all hover:bg-primary/90 hover:shadow-primary/50"
                  >
                    <Link href="/signup">
                      START FOR FREE <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </motion.div>
              </div>
            </FadeIn>
          </div>

          {/* Right Column: High-Fidelity UI Mockup with Controls-Free Looping Video */}
          <motion.div
            className="lg:col-span-6 relative"
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative rounded-[32px] shadow-2xl overflow-hidden border border-white/10 group bg-zinc-950">
              <div className="max-w-[920px] mx-auto w-full px-2 sm:px-0">
                <motion.div
                  className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-black"
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Clean studio looping cut without controls */}
                  <iframe
                    src="https://iframe.videodelivery.net/bcb96cb5bbb50ee8093256f33146f473?autoplay=true&loop=true&muted=true&controls=false&preload=true&poster=https%3A%2F%2Fvideodelivery.net%2Fbcb96cb5bbb50ee8093256f33146f473%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D1s%26height%3D720"
                    className="w-full h-full border-none absolute inset-0 pointer-events-none"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                    allowFullScreen
                    title="CineSpace Studio Preview Reel"
                  />
                  {/* Subtle ambient lighting vignette overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Subhead transition text below hero with balanced spacing */}
        <div className="mt-10 sm:mt-12 text-center">
          <p className="text-sm sm:text-base text-[#8e8e96] font-medium">
            Stop sending “Boring links” and send something worthy of your work
          </p>
        </div>
    </section>
  );
}
