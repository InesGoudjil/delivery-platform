"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2, Send } from "lucide-react";

export function ContactForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) return;

    setIsSubmitting(true);
    // Simulate brief network submission
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="space-y-6">
      {/* Exploring Partnership banner */}
      <div className="rounded-2xl border border-white/10 bg-[#121217]/70 p-6 sm:p-7 text-center backdrop-blur-sm">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white">
          EXPLORING A PARTNERSHIP?
        </h3>
        <p className="mt-2 text-xs sm:text-sm text-[#aeaeb4] max-w-md mx-auto leading-relaxed">
          If you&apos;d like to collaborate with CineSpace or bring us to your community, our partner program has a home of its own.
        </p>
        <div className="mt-4">
          <Link
            href="/#partnership"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ff7948] hover:text-[#f5551d] transition-colors"
          >
            <span>SEE PARTNERSHIP OPPORTUNITIES</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* Main Message Form Card */}
      <div className="rounded-3xl border border-white/10 bg-[#121217]/80 p-6 sm:p-10 backdrop-blur-md shadow-2xl">
        <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-white font-display mb-6">
          SEND US A MESSAGE
        </h2>

        {submitted ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-8 text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="size-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Message Received</h3>
            <p className="text-sm text-[#aeaeb4] max-w-sm mx-auto">
              Thank you for reaching out! A member of the CineSpace team will review your message and get back to you shortly.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setMessage("");
                }}
                className="text-xs font-semibold text-[#ff7948] hover:underline"
              >
                Send another message
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div className="space-y-2">
              <label
                htmlFor="fullName"
                className="block text-[11px] font-bold uppercase tracking-wider text-[#aeaeb4]"
              >
                FULL NAME
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-white/10 bg-[#181820] px-4 py-3 text-sm text-white placeholder:text-[#5a5a64] focus:border-[#f5551d] focus:bg-[#1f1f2a] focus:outline-none transition-colors"
              />
            </div>

            {/* Email Address */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-[11px] font-bold uppercase tracking-wider text-[#aeaeb4]"
              >
                EMAIL ADDRESS
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.com"
                className="w-full rounded-xl border border-white/10 bg-[#181820] px-4 py-3 text-sm text-white placeholder:text-[#5a5a64] focus:border-[#f5551d] focus:bg-[#1f1f2a] focus:outline-none transition-colors"
              />
            </div>

            {/* Reason for Inquiry */}
            <div className="space-y-2">
              <label
                htmlFor="reason"
                className="block text-[11px] font-bold uppercase tracking-wider text-[#aeaeb4]"
              >
                REASON FOR INQUIRY
              </label>
              <div className="relative">
                <select
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-[#181820] px-4 py-3 text-sm text-white focus:border-[#f5551d] focus:bg-[#1f1f2a] focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="" disabled className="bg-[#181820] text-[#71717a]">
                    Select a reason
                  </option>
                  <option value="general" className="bg-[#181820] text-white">
                    General Inquiry
                  </option>
                  <option value="feedback" className="bg-[#181820] text-white">
                    Product Feedback
                  </option>
                  <option value="billing" className="bg-[#181820] text-white">
                    Billing &amp; Subscriptions
                  </option>
                  <option value="enterprise" className="bg-[#181820] text-white">
                    Custom Studio / Enterprise Plan
                  </option>
                  <option value="partnership" className="bg-[#181820] text-white">
                    Partnership &amp; Collaborations
                  </option>
                  <option value="bug" className="bg-[#181820] text-white">
                    Bug Report / Support
                  </option>
                  <option value="other" className="bg-[#181820] text-white">
                    Other
                  </option>
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#aeaeb4]">
                  <svg className="size-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label
                htmlFor="message"
                className="block text-[11px] font-bold uppercase tracking-wider text-[#aeaeb4]"
              >
                MESSAGE
              </label>
              <textarea
                id="message"
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's on your mind..."
                className="w-full rounded-xl border border-white/10 bg-[#181820] px-4 py-3 text-sm text-white placeholder:text-[#5a5a64] focus:border-[#f5551d] focus:bg-[#1f1f2a] focus:outline-none transition-colors resize-y min-h-[120px]"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-gradient-to-r from-[#f5551d] to-[#df430f] py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-[#f5551d]/25 transition-all hover:opacity-95 hover:shadow-[#f5551d]/40 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>SENDING...</span>
                  </>
                ) : (
                  <>
                    <span>SEND MESSAGE</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
