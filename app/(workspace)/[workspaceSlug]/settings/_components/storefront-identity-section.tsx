"use client";

import React from "react";
import { MessageCircle, Palette, Check } from "lucide-react";
import { ACCENTS } from "./constants";

interface StorefrontIdentitySectionProps {
  brandName: string;
  onBrandNameChange: (val: string) => void;
  handle: string;
  onHandleChange: (val: string) => void;
  whatsapp: string;
  onWhatsappChange: (val: string) => void;
  accent: string;
  onAccentChange: (val: string) => void;
}

export function StorefrontIdentitySection({
  brandName,
  onBrandNameChange,
  handle,
  onHandleChange,
  whatsapp,
  onWhatsappChange,
  accent,
  onAccentChange,
}: StorefrontIdentitySectionProps) {
  return (
    <section id="branding" className="space-y-4">
      <div>
        <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-0.5">
          Storefront Identity
        </div>
        <h2 className="text-xl font-bold font-heading text-foreground tracking-tight">
          BRAND &amp; URL SETTINGS
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure how your name, link, and accent styling appear to prospective clients.
        </p>
      </div>

      <div className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-5 md:p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Brand / Filmmaker Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Brand / Filmmaker Name
            </label>
            <input
              type="text"
              required
              value={brandName}
              onChange={(e) => onBrandNameChange(e.target.value)}
              placeholder="e.g. Pedro Concreato"
              className="w-full bg-[#0c0c0e] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#f6f3ec] focus:outline-none focus:border-[#f5551d] transition-colors"
            />
          </div>

          {/* Public Showcase Handle */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Public Showcase Handle
            </label>
            <div className="flex items-center bg-[#0c0c0e] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-muted-foreground">
              <span className="font-mono text-xs">cinespace.film/p/</span>
              <input
                type="text"
                required
                value={handle}
                onChange={(e) => onHandleChange(e.target.value)}
                className="bg-transparent text-[#f6f3ec] focus:outline-none ml-1 font-bold w-full text-sm"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {/* WhatsApp Delivery & Direct Booking */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MessageCircle className="size-3.5 text-[#f5551d]" />
              WhatsApp Direct Booking Number
            </label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => onWhatsappChange(e.target.value)}
              placeholder="+971501234567"
              className="w-full bg-[#0c0c0e] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#f6f3ec] focus:outline-none focus:border-[#f5551d] transition-colors font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Powers one-click WhatsApp client inquiries and rapid review links across the Gulf.
            </p>
          </div>

          {/* Accent Color Palette */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="size-3.5 text-[#f5551d]" />
              Player &amp; Button Accent Color
            </label>
            <div className="flex items-center gap-3 pt-1">
              {ACCENTS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => onAccentChange(c)}
                  style={{ backgroundColor: c }}
                  className={`size-9 rounded-full flex items-center justify-center transition-all border-2 cursor-pointer ${
                    accent === c
                      ? "border-white scale-110 shadow-lg"
                      : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                >
                  {accent === c && <Check className="size-4 text-black font-bold" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
