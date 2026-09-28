"use client";

import React, { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Lock,
  Play,
  Check,
  ArrowRight,
  Users,
  Film,
  LayoutGrid,
  Link2,
  Archive,
  Palette,
  MessageCircle,
  Download,
  Copy,
  Sparkles,
  Share2,
  Loader2,
} from "lucide-react";
import { DemoModal } from "@/components/landing/DemoModal";
import { joinWaitlistAction, WaitlistActionState } from "@/app/actions/waitlist";
import { getWaitlistImageUrl, CLOUDFLARE_PUBLIC_DOMAIN } from "@/lib/assets";
import { trackLead } from "@/lib/meta/pixel";
import {
  motion,
  AnimatePresence,
  FadeIn,
  StaggerContainer,
  StaggerItem,
  ScrollReveal,
  AnimatedCounter,
} from "@/components/ui/motion";
import "./waitlist.css";

const ROLES = ["Filmmaker", "Studio", "Agency", "Other"];
const BASE_COUNT = 300;

interface WaitlistScreenProps {
  initialReferralCode?: string;
  initialCount?: number;
}

export function WaitlistScreen({
  initialReferralCode = "",
  initialCount = 0,
}: WaitlistScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Filmmaker");
  const [referralCode] = useState(initialReferralCode);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<WaitlistActionState | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const displayCount = BASE_COUNT + initialCount;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleJoin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("email", email);
    if (name.trim()) formData.append("name", name.trim());
    if (role) formData.append("role", role);
    if (referralCode) formData.append("referralCode", referralCode);

    startTransition(async () => {
      const res = await joinWaitlistAction(null, formData);
      setResult(res);
      if (res?.data?.eventId) {
        trackLead({ email, eventId: res.data.eventId });
      }
    });
  };

  const referralLink =
    typeof window !== "undefined" && result?.data?.referralCode
      ? `${window.location.origin}/waitlist?ref=${result.data.referralCode}`
      : "";

  const handleCopyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(
      `I just joined the waitlist for CineSpace! Deliver films like a studio. Jump the line with my link:`
    );
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(referralLink)}`,
      "_blank"
    );
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(
      `Join me on the CineSpace waitlist: ${referralLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const scrollToForm = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    emailInputRef.current?.focus();
  };

  return (
    <div className="cs-wait">
      {/* flame-tinted ambient background */}
      <div className="wl-bg" aria-hidden="true">
        <div className="wl-bg-glow" />
        <div className="wl-bg-glow g2" />
      </div>

      <div className="wl-shell">
        {/* Top Header */}
        <motion.header
          className="wl-top"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link href="/">
            <img className="wl-logo-img" src="/images/logo.svg" alt="CineSpace" />
          </Link>
          <span className="wl-badge">
            <Lock size={12} /> Private beta
          </span>
        </motion.header>

        {/* Hero Section */}
        <main className="wl-main">
          <div className="wl-hero-split">
            {/* Hero Left Column */}
            <div className="wl-hero-left">
              <FadeIn delay={0.08} distance={14}>
                <div className="wl-eyebrow">
                  Coming soon · Built for filmmakers everywhere
                </div>
              </FadeIn>
              <FadeIn delay={0.16} distance={20}>
                <h1 className="wl-h1">
                  Deliver films
                  <br />
                  like a studio.
                </h1>
              </FadeIn>
              <FadeIn delay={0.24} distance={20}>
                <p className="wl-sub">
                  Your portfolio, client feedback, and delivery — in one place.
                  CineSpace is opening in private beta. Join the waitlist and get
                  early access, founder pricing, and a say in what we build.
                </p>
              </FadeIn>
            </div>

            {/* Hero Right Column: Card */}
            <motion.div
              className="wl-hero-right"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.65, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <AnimatePresence mode="wait">
                {!result?.data ? (
                  <motion.div
                    key="form-card"
                    className="wl-card"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.3 }}
                  >
                    <form onSubmit={handleJoin}>
                      {/* Honeypot hidden input */}
                      <div style={{ display: "none" }}>
                        <input
                          type="text"
                          name="hp_field"
                          tabIndex={-1}
                          autoComplete="off"
                        />
                      </div>

                      <div className="wl-field">
                        <label>
                          Name <span className="opt">(optional)</span>
                        </label>
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Pedro Concreato"
                        />
                      </div>

                      <div className="wl-field">
                        <label>Email</label>
                        <input
                          ref={emailInputRef}
                          value={email}
                          required
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@studio.com"
                          type="email"
                        />
                      </div>

                      <div className="wl-field">
                        <label>I'm a…</label>
                        <div className="wl-roles">
                          {ROLES.map((r) => (
                            <motion.button
                              key={r}
                              type="button"
                              className={"wl-role" + (role === r ? " on" : "")}
                              onClick={() => setRole(r)}
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.96 }}
                              transition={{ duration: 0.15 }}
                            >
                              {r}
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      {result?.error && (
                        <div className="wl-err">{result.error}</div>
                      )}

                      <motion.button
                        type="submit"
                        className="wl-cta"
                        disabled={isPending || !email}
                        whileHover={!isPending && email ? { scale: 1.02, y: -2 } : {}}
                        whileTap={!isPending && email ? { scale: 0.98 } : {}}
                        transition={{ duration: 0.15 }}
                      >
                        {isPending ? (
                          "Joining…"
                        ) : (
                          <>
                            Join the waitlist <ArrowRight size={17} />
                          </>
                        )}
                      </motion.button>

                      <div className="wl-count">
                        <Users size={14} />{" "}
                        <AnimatedCounter to={displayCount} duration={1.6} /> filmmakers already waiting
                      </div>
                    </form>
                  </motion.div>
                ) : (
                  /* Success View */
                  <motion.div
                    key="success-card"
                    className="wl-card wl-success"
                    initial={{ opacity: 0, scale: 0.92, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <motion.div
                      className="wl-check"
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 350, damping: 20, delay: 0.1 }}
                    >
                      <Check size={30} strokeWidth={2.6} />
                    </motion.div>
                    <h2>You're on the list.</h2>
                    <p>
                      We'll email <b>{email}</b> the moment your invite is ready.
                      {result.data.position ? (
                        <> Early access is rolling out to founders first. Your priority spot is <strong>#{result.data.position}</strong>.</>
                      ) : (
                        <> Early access is rolling out to founders first.</>
                      )}
                    </p>

                    <div className="my-4 rounded-xl bg-white/5 border border-white/10 p-3 text-left">
                      <div className="text-[11px] font-semibold text-white/70 mb-1">
                        Bump up in line with your personal referral link:
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={referralLink}
                          className="flex-1 bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/90 font-mono select-all focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="flex items-center gap-1 rounded-lg bg-[#f5551d] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#e04a16] transition-colors"
                        >
                          {copied ? <Check size={13} /> : <Copy size={13} />}
                          <span>{copied ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                      <div className="text-[10.5px] text-white/50 mt-1.5">
                        Each friend who signs up moves you <strong>10 spots forward</strong>.
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={shareOnTwitter}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        Share on X
                      </button>
                      <button
                        type="button"
                        onClick={shareOnWhatsApp}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        WhatsApp
                      </button>
                    </div>

                    <div className="wl-count">
                      <Users size={14} />{" "}
                      <AnimatedCounter to={displayCount + 1} duration={1.6} /> filmmakers already waiting
                    </div>

                    <button
                      className="wl-ghost"
                      onClick={() => {
                        setResult(null);
                        setName("");
                        setEmail("");
                        setRole("Filmmaker");
                      }}
                    >
                      Add another email
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Demo Button Wrap */}
          <FadeIn delay={0.3} className="wl-demo-wrap">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/delivery-view"
                className="wl-demo-big inline-flex items-center justify-center gap-2"
              >
                <Play size={17} /> See a live client demo — no signup needed
              </Link>
            </motion.div>
          </FadeIn>

          {/* Perks Row */}
          <StaggerContainer className="wl-perks" staggerDelay={0.1} initialDelay={0.35}>
            <StaggerItem className="wl-perk">
              <Film size={16} />
              <div>
                <b>Early access</b>
                <span>Be first in when we open the doors.</span>
              </div>
            </StaggerItem>
            <StaggerItem className="wl-perk">
              <Users size={16} />
              <div>
                <b>Founder pricing</b>
                <span>Locked-in rates for early members.</span>
              </div>
            </StaggerItem>
            <StaggerItem className="wl-perk">
              <Check size={16} />
              <div>
                <b>Shape the product</b>
                <span>Tell us what to build next.</span>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </main>
        {/* ===== video here ===== */}
        <ScrollReveal className="wl-sec">
          <div className="wl-sec-head">
            <div className="wl-eyebrow">Product walkthrough</div>
            <h2 className="wl-h2">Watch CineSpace in action.</h2>
            <p className="wl-sec-sub">
              Experience the fast, studio-grade delivery workflow built specifically for filmmakers and creative agencies.
            </p>
          </div>

          <div className="max-w-[920px] mx-auto w-full px-2 sm:px-0">
            <motion.div
              className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-black/80"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.3 }}
            >
              <iframe
                src="https://iframe.videodelivery.net/bcb96cb5bbb50ee8093256f33146f473?preload=true&poster=https%3A%2F%2Fvideodelivery.net%2Fbcb96cb5bbb50ee8093256f33146f473%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D1s%26height%3D720"
                className="w-full h-full border-none absolute inset-0"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen
                title="CineSpace Preview Video"
              />
            </motion.div>
          </div>
        </ScrollReveal>

        {/* ===== Feature Showcase (Image Mockups) ===== */}
        <ScrollReveal className="wl-sec">
          <div className="wl-sec-head">
            <div className="wl-eyebrow">A look inside</div>
            <h2 className="wl-h2">See how it actually looks.</h2>
            <p className="wl-sec-sub">
              A preview of the CineSpace experience — the real delivery pages
              your clients will open.
            </p>
          </div>

          <div className="wl-shots">
            {/* Row 1: Premium delivery links */}
            <FadeIn direction="up" distance={20} className="wl-row">
              <div className="wl-row-txt">
                <b>Premium delivery links</b>
                <span>
                  Send clients one branded link — share, manage, and deliver
                  every cut and still inside a single cinematic page. No
                  scattered folders, no WeTransfer clutter.
                </span>
              </div>
              <motion.div className="wl-row-img" whileHover={{ scale: 1.02 }} transition={{ duration: 0.25 }}>
                <img
                  src={getWaitlistImageUrl("links.webp")}
                  alt="Premium delivery links"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/images/waitlist/links.webp";
                  }}
                />
              </motion.div>
            </FadeIn>

            {/* Row 2: Feedback & approvals */}
            <FadeIn direction="up" distance={20} className="wl-row">
              <motion.div className="wl-row-img" whileHover={{ scale: 1.02 }} transition={{ duration: 0.25 }}>
                <img
                  src={getWaitlistImageUrl("feedback.webp")}
                  alt="Client timestamped feedback and approvals"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/images/waitlist/feedback.webp";
                  }}
                />
              </motion.div>
              <div className="wl-row-txt">
                <b>Feedback &amp; approvals</b>
                <span>
                  Clients leave time-stamped comments pinned to the exact frame,
                  and approve each asset — per cut or the whole project. Every
                  sign-off tracked and locked.
                </span>
              </div>
            </FadeIn>

            {/* Row 3: Add your brand */}
            <FadeIn direction="up" distance={20} className="wl-row">
              <div className="wl-row-txt">
                <b>Add your brand</b>
                <span>
                  Your logo, your accent colour, your name on every page.
                  Clients experience your studio — not our software.
                </span>
              </div>
              <motion.div className="wl-row-img" whileHover={{ scale: 1.02 }} transition={{ duration: 0.25 }}>
                <img
                  src={getWaitlistImageUrl("brand.webp")}
                  alt="Add your brand"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/images/waitlist/brand.webp";
                  }}
                />
              </motion.div>
            </FadeIn>

            {/* Row 4: Customize portfolio & deliveries */}
            <FadeIn direction="up" distance={20} className="wl-row">
              <motion.div className="wl-row-img" whileHover={{ scale: 1.02 }} transition={{ duration: 0.25 }}>
                <img
                  src={getWaitlistImageUrl("control.webp")}
                  alt="Customize portfolio and deliveries"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/images/waitlist/control.webp";
                  }}
                />
              </motion.div>
              <div className="wl-row-txt">
                <b>Customize portfolio &amp; deliveries</b>
                <span>
                  Control card size, layout, and aspect ratio — including a
                  Pinterest-style mixed view. Shape both your portfolio and
                  every delivery page exactly the way you want.
                </span>
              </div>
            </FadeIn>
          </div>
        </ScrollReveal>

        {/* ===== What You Get: The Four Surfaces ===== */}
        <ScrollReveal className="wl-sec">
          <div className="wl-sec-head">
            <div className="wl-eyebrow">Everything in one place</div>
            <h2 className="wl-h2">
              One link. From first pitch to final delivery.
            </h2>
            <p className="wl-sec-sub">
              CineSpace replaces the mess of WeTransfer links, PDFs, and
              scattered folders with a single branded home for your work.
            </p>
          </div>

          <div className="wl-surfaces">
            <motion.div className="wl-surface" whileHover={{ y: -4, borderColor: "rgba(245, 85, 29, 0.4)" }} transition={{ duration: 0.2 }}>
              <div className="wl-si">
                <LayoutGrid size={20} />
              </div>
              <h3>Your public page</h3>
              <p>
                A cinematic portfolio that sells. Full-screen showreel, your
                latest work, your story — all on one link you can send to any
                lead in a tap.
              </p>
            </motion.div>

            <motion.div className="wl-surface" whileHover={{ y: -4, borderColor: "rgba(245, 85, 29, 0.4)" }} transition={{ duration: 0.2 }}>
              <div className="wl-si">
                <Link2 size={20} />
              </div>
              <h3>Client delivery pages</h3>
              <p>
                Send clients a private, password-protected page to review each
                cut, leave time-stamped comments, approve versions, and download
                the finished files.
              </p>
              <Link
                href="/delivery-view"
                className="wl-surface-demo inline-flex items-center gap-1.5"
              >
                <Play size={13} /> Try the live demo
              </Link>
            </motion.div>

            <motion.div className="wl-surface" whileHover={{ y: -4, borderColor: "rgba(245, 85, 29, 0.4)" }} transition={{ duration: 0.2 }}>
              <div className="wl-si">
                <Play size={20} />
              </div>
              <h3>Your dashboard</h3>
              <p>
                Manage projects, deliveries, storage, and branding from one
                clean workspace. Upload a cut, share a link, track approvals —
                without the chaos.
              </p>
            </motion.div>

            <motion.div className="wl-surface" whileHover={{ y: -4, borderColor: "rgba(245, 85, 29, 0.4)" }} transition={{ duration: 0.2 }}>
              <div className="wl-si">
                <Archive size={20} />
              </div>
              <h3>The Silo — secure archive</h3>
              <p>
                Move delivered projects to secure cold storage to free up your
                active space. Nothing lost, nothing expiring — restore any
                project in 24–48h.
              </p>
            </motion.div>
          </div>
        </ScrollReveal>

        {/* ===== Capabilities ===== */}
        <ScrollReveal className="wl-sec">
          <div className="wl-sec-head">
            <div className="wl-eyebrow">Built for the way you work</div>
            <h2 className="wl-h2">
              Studio-grade delivery, without the studio.
            </h2>
          </div>

          <StaggerContainer className="wl-caps" staggerDelay={0.07}>
            <StaggerItem className="wl-cap">
              <Palette size={18} />
              <div>
                <b>Your branding</b>
                <span>
                  Custom accent colours, your logo, and your name across every
                  page. Your brand, not ours.
                </span>
              </div>
            </StaggerItem>

            <StaggerItem className="wl-cap">
              <MessageCircle size={18} />
              <div>
                <b>Review &amp; approve</b>
                <span>
                  Clients comment on exact moments and approve each version —
                  every approval is timestamped and locks that cut.
                </span>
              </div>
            </StaggerItem>

            <StaggerItem className="wl-cap">
              <Lock size={18} />
              <div>
                <b>Private &amp; secure</b>
                <span>
                  Password-protect any delivery link, control downloads, and set
                  links to expire when you choose.
                </span>
              </div>
            </StaggerItem>

            <StaggerItem className="wl-cap">
              <Download size={18} />
              <div>
                <b>Instant handoff</b>
                <span>
                  Clients open your link and download finished files instantly —
                  no logins, no apps, no friction.
                </span>
              </div>
            </StaggerItem>

            <StaggerItem className="wl-cap">
              <Film size={18} />
              <div>
                <b>Watermark &amp; protect</b>
                <span>
                  Preview cuts with watermarks until they're approved and paid —
                  then release the clean files.
                </span>
              </div>
            </StaggerItem>

            <StaggerItem className="wl-cap">
              <Users size={18} />
              <div>
                <b>Made for everyone</b>
                <span>
                  Arabic + English delivery pages and WhatsApp-first sharing,
                  built for how clients everywhere actually work.
                </span>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </ScrollReveal>

        {/* ===== Plans Teaser ===== */}
        <ScrollReveal className="wl-sec">
          <div className="wl-sec-head">
            <div className="wl-eyebrow">Plans</div>
            <h2 className="wl-h2">Start free. Grow when you're ready.</h2>
            <p className="wl-sec-sub">
              From a free portfolio to a full studio setup. Early members lock
              in founder pricing for life — exact plans and pricing are shared
              with waitlist members first.
            </p>
          </div>

          <div className="wl-plannames">
            <motion.span className="wl-planpill" whileHover={{ scale: 1.05 }} transition={{ duration: 0.15 }}>Starter</motion.span>
            <motion.span className="wl-planpill" whileHover={{ scale: 1.05 }} transition={{ duration: 0.15 }}>Basic</motion.span>
            <motion.span className="wl-planpill pop" whileHover={{ scale: 1.06 }} transition={{ duration: 0.15 }}>Pro</motion.span>
            <motion.span className="wl-planpill" whileHover={{ scale: 1.05 }} transition={{ duration: 0.15 }}>Studio</motion.span>
          </div>
        </ScrollReveal>

        {/* ===== Bottom CTA ===== */}
        <ScrollReveal className="wl-endcta">
          <h2 className="wl-h2">Be first in.</h2>
          <p className="wl-sec-sub">
            Join {displayCount.toLocaleString()} filmmakers already on the list.
          </p>
          <motion.button
            className="wl-cta"
            style={{ maxWidth: 320, margin: "0 auto" }}
            onClick={scrollToForm}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            Join the waitlist <ArrowRight size={17} />
          </motion.button>
        </ScrollReveal>

        {/* Footer */}
        <footer className="wl-foot">
          © CineSpace — Films, delivered.
        </footer>
      </div>

      {/* Interactive Client Demo Modal */}
      <DemoModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        onShowToast={showToast}
      />
    </div>
  );
}
