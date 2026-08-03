"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";

const ACCENTS = ["#F5551D", "#E23B3B", "#7C5CFF", "#1D9E75", "#378ADD"];

export default function SettingsPage() {
  const [brandName, setBrandName] = useState("Pedro Concreato");
  const [handle, setHandle] = useState("pedro");
  const [accent, setAccent] = useState("#F5551D");
  const [whatsapp, setWhatsapp] = useState("+971501234567");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Brand & Portfolio Customization</h1>
        <p className="text-sm text-dim mt-1">Configure your public storefront URL, accent colors, and contact info</p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-sm font-semibold rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4" /> Brand settings updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="bg-bg2 border border-line p-6 md:p-8 rounded-2xl space-y-6">
        <div>
          <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-2">
            Brand / Filmmaker Name
          </label>
          <input
            type="text"
            required
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            className="w-full bg-bg3 border border-line rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-orange"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-2">
            Public Handle (Your Showcase Link)
          </label>
          <div className="flex items-center bg-bg3 border border-line rounded-xl px-4 py-3 text-sm text-dim">
            <span>cut.ae/p/</span>
            <input
              type="text"
              required
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="bg-transparent text-ink focus:outline-none ml-1 font-bold w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-2">
            WhatsApp Delivery Number
          </label>
          <input
            type="text"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+971501234567"
            className="w-full bg-bg3 border border-line rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-orange"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-3">
            Brand Accent Color
          </label>
          <div className="flex items-center gap-3">
            {ACCENTS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setAccent(c)}
                style={{ backgroundColor: c }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition border-2 ${
                  accent === c ? "border-white scale-110" : "border-transparent"
                }`}
              >
                {accent === c && <Check className="w-4 h-4 text-black" />}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-line">
          <button type="submit" className="btn px-6 py-3 rounded-full font-bold text-sm shadow-lg shadow-orange/20">
            <Sparkles className="w-4 h-4" /> Save Brand Settings
          </button>
        </div>
      </form>
    </div>
  );
}
