"use client";

import { useEffect, useState } from "react";
import { Star, ArrowRight, Play } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion, FadeIn } from "@/components/ui/motion";

interface HeroSectionProps {
  /** The demo room (/demo) while it's on. Without it, the hero has no demo button. */
  demoHref?: string;
  /** Signup for visitors, their workspace for signed-in users. */
  startHref: string;
}

const REEL_ID = "bcb96cb5bbb50ee8093256f33146f473";
/** The reel's frame at 1s: what the hero shows first, and keeps for reduced motion. */
const REEL_POSTER = `https://videodelivery.net/${REEL_ID}/thumbnails/thumbnail.jpg?time=1s&height=720`;
const REEL_PLAYER = `https://iframe.videodelivery.net/${REEL_ID}?autoplay=true&loop=true&muted=true&controls=false&preload=true&poster=${encodeURIComponent(REEL_POSTER)}`;

/**
 * Whether to start the hero reel: once the page has loaded and the browser is idle, so the
 * player and its video don't compete with the page itself. Never for reduced motion.
 */
function useDeferredReel(): boolean {
  const [start, setStart] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let idle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if ("requestIdleCallback" in window) idle = window.requestIdleCallback(() => setStart(true), { timeout: 2000 });
      else timer = setTimeout(() => setStart(true), 200);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      window.removeEventListener("load", schedule);
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, []);
  return start;
}

export function HeroSection({ demoHref, startHref }: HeroSectionProps) {
  const startReel = useDeferredReel();
  const [reelReady, setReelReady] = useState(false);

  return (
    // Bleeds into <main>'s gutter (-mx/px match its px-4 sm:px-6 lg:px-8): the content lines up
    // with the other sections, while overflow-hidden clips at the gutter's edge instead of the
    // content's, so the buttons' hover scale and glow aren't cut off.
    <section className="relative -mx-4 px-4 pt-6 sm:-mx-6 sm:px-6 sm:pt-10 lg:-mx-8 lg:px-8 overflow-hidden">
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
                    <Link href={startHref}>
                      START FOR FREE <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </motion.div>
                {demoHref && (
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }}>
                    <Button
                      asChild
                      variant="ghost"
                      className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-md px-7 py-3.5 h-auto text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-white/10 hover:border-white/40 hover:text-white"
                    >
                      <Link href={demoHref}>
                        <Play className="size-4 fill-current" /> SEE A DEMO DELIVERY
                      </Link>
                    </Button>
                  </motion.div>
                )}
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
                  {/* The poster paints first; the looping, controls-free player fades in over it
                      once it has loaded (see useDeferredReel). */}
                  {/* eslint-disable-next-line @next/next/no-img-element -- Stream sizes it; the optimizer can't fetch this host */}
                  <img
                    src={REEL_POSTER}
                    alt=""
                    fetchPriority="high"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {startReel && (
                    <iframe
                      src={REEL_PLAYER}
                      onLoad={() => setReelReady(true)}
                      className={`w-full h-full border-none absolute inset-0 pointer-events-none transition-opacity duration-700 ${
                        reelReady ? "opacity-100" : "opacity-0"
                      }`}
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                      allowFullScreen
                      title="CineSpace Studio Preview Reel"
                    />
                  )}
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
