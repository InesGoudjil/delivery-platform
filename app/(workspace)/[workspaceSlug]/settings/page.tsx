"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Check, Sparkles, KeyRound, Palette, User, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACCENTS = ["#F5551D", "#E23B3B", "#7C5CFF", "#1D9E75", "#378ADD"];

export default function SettingsPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "studio";

  // Profile fields matching screenshot
  const [fullName, setFullName] = useState("Pedro Concreato");
  const [email, setEmail] = useState("pedro@cinespace.film");
  const [password, setPassword] = useState("••••••••");

  // Brand fields
  const [brandName, setBrandName] = useState("Pedro Concreato");
  const [handle, setHandle] = useState(workspaceSlug);
  const [accent, setAccent] = useState("#F5551D");
  const [whatsapp, setWhatsapp] = useState("+971501234567");

  const [toast, setToast] = useState<string | null>(null);

  const showFlash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    showFlash("Password updated");
  };

  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    showFlash("Brand settings updated");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#f5551d] text-black font-semibold text-xs px-4 py-2.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}

      {/* ===================== 1. PROFILE SECTION (MATCHING SCREENSHOT) ===================== */}
      <section className="space-y-6">
        <div>
          <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-1">
            Account
          </div>
          <h1 className="text-3xl font-bold font-heading text-foreground tracking-tight">
            PROFILE
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your personal account details.
          </p>
        </div>

        <div className="space-y-4">
          {/* Card 1: Full name */}
          <div className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-6 shadow-sm space-y-2">
            <label className="text-xs font-semibold text-[#f6f3ec]">
              Full name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[#0c0c0e] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#f6f3ec] focus:outline-none focus:border-[#f5551d] transition-colors"
            />
          </div>

          {/* Card 2: Email */}
          <div className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-6 shadow-sm space-y-2">
            <label className="text-xs font-semibold text-[#f6f3ec]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0c0c0e] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#f6f3ec] focus:outline-none focus:border-[#f5551d] transition-colors"
            />
          </div>

          {/* Card 3: Password */}
          <div className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-6 shadow-sm space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#f6f3ec]">
                Password
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Change your account password.
              </p>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0c0c0e] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#f6f3ec] focus:outline-none focus:border-[#f5551d] transition-colors"
            />

            <Button
              onClick={handleUpdatePassword}
              className="rounded-xl bg-gradient-to-r from-[#d9481d] to-[#992e10] hover:from-[#f5551d] hover:to-[#ff8a45] text-white font-bold text-xs uppercase px-5 py-2.5 shadow-lg shadow-[#d9481d]/20 transition-all cursor-pointer h-auto gap-2"
            >
              <Check className="size-4" />
              <span>UPDATE PASSWORD</span>
            </Button>
          </div>
        </div>
      </section>

      {/* ===================== 2. BRAND & STUDIO SECTION ===================== */}
      <section id="branding" className="space-y-6 pt-6 border-t border-white/[0.08]">
        <div>
          <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-1">
            Studio
          </div>
          <h2 className="text-2xl font-bold font-heading text-foreground tracking-tight">
            BRAND &amp; CUSTOMIZATION
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your public storefront URL, player accent colors, and WhatsApp delivery.
          </p>
        </div>

        <form onSubmit={handleSaveBrand} className="rounded-2xl bg-[#141416]/90 border border-white/[0.08] p-6 md:p-8 space-y-6 shadow-sm">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Brand / Filmmaker Name
            </label>
            <input
              type="text"
              required
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full bg-[#0c0c0e] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#f6f3ec] focus:outline-none focus:border-[#f5551d]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Public Showcase Handle
            </label>
            <div className="flex items-center bg-[#0c0c0e] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-muted-foreground">
              <span className="font-mono">cinespace.film/p/</span>
              <input
                type="text"
                required
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="bg-transparent text-[#f6f3ec] focus:outline-none ml-1 font-bold w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              WhatsApp Delivery Number
            </label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+971501234567"
              className="w-full bg-[#0c0c0e] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#f6f3ec] focus:outline-none focus:border-[#f5551d]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Player Accent Color
            </label>
            <div className="flex items-center gap-3">
              {ACCENTS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setAccent(c)}
                  style={{ backgroundColor: c }}
                  className={`size-9 rounded-full flex items-center justify-center transition-all border-2 cursor-pointer ${
                    accent === c ? "border-white scale-110 shadow-lg" : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                >
                  {accent === c && <Check className="size-4 text-black font-bold" />}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.08]">
            <Button
              type="submit"
              className="rounded-xl bg-[#f5551d] text-black font-bold hover:bg-[#ff8a45] shadow-lg shadow-[#f5551d]/20 text-xs px-5 py-2.5 cursor-pointer h-auto"
            >
              <Sparkles className="size-4 mr-1.5" /> Save Brand Settings
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
