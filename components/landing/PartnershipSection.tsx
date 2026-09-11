"use client";

import React, { useState } from "react";
import { Star, Film, Share2, ArrowRight } from "lucide-react";

interface PartnershipSectionProps {
  onShowToast?: (msg: string) => void;
}

export function PartnershipSection({ onShowToast }: PartnershipSectionProps) {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (onShowToast) {
      onShowToast("Partnership application submitted successfully!");
    }
  };

  return (
    <section id="partnership" className="py-20 text-center space-y-16">
      {/* Top Badge */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#f5551d]/40 bg-[#f5551d]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#ff7948]">
          <Star className="size-3.5 fill-current" />
          <span>THE CINESPACE PARTNERSHIP</span>
        </div>
      </div>

      {/* Title & Description */}
      <div className="space-y-4 max-w-3xl mx-auto">
        <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight font-display">
          PARTNER WITH US
        </h2>
        <p className="text-base sm:text-lg text-[#aeaeb4] leading-relaxed">
          Help your audience deliver like a studio. Partner with CineSpace to give your community a premium client-delivery workflow — and earn for your influence.
        </p>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
        {[
          {
            icon: Film,
            title: "CREATOR ACCESS",
            description: (
              <>
                Get the <strong>Pro plan (500 GB)</strong> free for 12 months. Build your own client galleries, add your own branding, and use it across your workflow and tutorials.
              </>
            ),
          },
          {
            icon: Share2,
            title: "SHARE THE WORKFLOW",
            description: (
              <>
                Feature CineSpace in your videos, editing tutorials, or behind-the-scenes — and earn a <strong>commission</strong> for every creator you bring in.
              </>
            ),
          },
          {
            icon: ArrowRight,
            title: "GROW TOGETHER",
            description: (
              <>
                Keep inspiring your community and driving sign-ups, and your Studio plan <strong>auto-renews free</strong>, indefinitely.
              </>
            ),
          },
          {
            icon: Star,
            title: "THE COMMUNITY GIFT",
            description: (
              <>
                Give your followers an exclusive discount — a <strong>free month of any plan</strong> with your own promo code.
              </>
            ),
          },
        ].map((item, idx) => {
          const IconComponent = item.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-white/10 bg-[#121217] p-6 shadow-xl space-y-4 hover:border-white/20 transition-all"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-[#2a1b18] text-[#f5551d] border border-[#f5551d]/20">
                <IconComponent className="size-5" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-wider font-display uppercase">
                {item.title}
              </h3>
              <p className="text-xs text-[#aeaeb4] leading-relaxed">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Application Form Box */}
      <div className="max-w-2xl mx-auto rounded-[28px] border border-white/10 bg-[#121217] p-8 sm:p-12 shadow-2xl text-left space-y-6">
        <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide uppercase font-display">
          APPLICATION FORM
        </h3>

        {submitted ? (
          <div className="rounded-xl bg-[#86b98f]/10 border border-[#86b98f]/30 p-6 text-center space-y-2">
            <h4 className="text-lg font-bold text-[#86b98f]">Application Received!</h4>
            <p className="text-sm text-zinc-300">
              Thank you for applying to the CineSpace Partner Program. Our team will review your application and reach out within 24-48 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 text-xs text-[#aeaeb4]">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="block font-bold uppercase tracking-wider text-white text-[11px]">
                FULL NAME *
              </label>
              <input
                required
                type="text"
                placeholder="Your name"
                className="w-full rounded-xl border border-white/10 bg-[#1a1a22] px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-[#f5551d] focus:outline-none transition-colors"
              />
            </div>

            {/* Email Address */}
            <div className="space-y-2">
              <label className="block font-bold uppercase tracking-wider text-white text-[11px]">
                EMAIL ADDRESS *
              </label>
              <input
                required
                type="email"
                placeholder="you@email.com"
                className="w-full rounded-xl border border-white/10 bg-[#1a1a22] px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-[#f5551d] focus:outline-none transition-colors"
              />
            </div>

            {/* Platform & Social Handle Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block font-bold uppercase tracking-wider text-white text-[11px]">
                  PRIMARY PLATFORM *
                </label>
                <select
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#1a1a22] px-4 py-3 text-sm text-white focus:border-[#f5551d] focus:outline-none transition-colors"
                >
                  <option value="">Select platform</option>
                  <option value="youtube">YouTube</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block font-bold uppercase tracking-wider text-white text-[11px]">
                  SOCIAL HANDLE *
                </label>
                <input
                  required
                  type="text"
                  placeholder="@yourhandle"
                  className="w-full rounded-xl border border-white/10 bg-[#1a1a22] px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-[#f5551d] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Portfolio / Work Examples */}
            <div className="space-y-2">
              <label className="block font-bold uppercase tracking-wider text-white text-[11px]">
                PORTFOLIO / WORK EXAMPLES *
              </label>
              <input
                required
                type="text"
                placeholder="Link to your work"
                className="w-full rounded-xl border border-white/10 bg-[#1a1a22] px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-[#f5551d] focus:outline-none transition-colors"
              />
            </div>

            {/* Other Links */}
            <div className="space-y-2">
              <label className="block font-bold uppercase tracking-wider text-white text-[11px]">
                OTHER RELEVANT LINKS
              </label>
              <input
                type="text"
                placeholder="Anything else"
                className="w-full rounded-xl border border-white/10 bg-[#1a1a22] px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-[#f5551d] focus:outline-none transition-colors"
              />
            </div>

            {/* Why Partner */}
            <div className="space-y-2">
              <label className="block font-bold uppercase tracking-wider text-white text-[11px]">
                WHY DO YOU WANT TO PARTNER WITH US?
              </label>
              <textarea
                rows={3}
                placeholder="Tell us about your audience..."
                className="w-full rounded-xl border border-white/10 bg-[#1a1a22] px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-[#f5551d] focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Checkbox Agreement */}
            <div className="flex items-start gap-3 pt-1">
              <input
                required
                type="checkbox"
                id="partner-agree"
                className="mt-0.5 size-4 accent-[#f5551d] rounded border-white/10"
              />
              <label htmlFor="partner-agree" className="text-[11px] leading-relaxed text-[#aeaeb4]">
                I understand the partnership includes 12 months of Studio access, with a review near the end of the term based on content engagement and referrals.
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full rounded-full bg-gradient-to-r from-[#ce3a09] to-[#df4510] py-4 text-sm font-bold uppercase tracking-wider text-white shadow-xl shadow-[#f5551d]/30 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                SUBMIT APPLICATION
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
