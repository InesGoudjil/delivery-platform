import Link from "next/link";
import { Play, Film, Check, ArrowRight, ShieldCheck, Zap, Globe, MessageCircle } from "lucide-react";

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-bg text-ink selection:bg-orange selection:text-black">
      {/* Header */}
      <header className="border-b border-line sticky top-0 bg-bg/90 backdrop-blur-md z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-display text-2xl font-black tracking-wider text-ink">
            CUT<span className="text-orange">.</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-dim">
            <a href="#features" className="hover:text-ink transition">Features</a>
            <a href="#pricing" className="hover:text-ink transition">Pricing (AED)</a>
            <a href="#faq" className="hover:text-ink transition">FAQ</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-sm font-semibold text-dim hover:text-ink px-4 py-2 transition"
            >
              Sign In
            </Link>
            <Link 
              href="/signup" 
              className="btn text-sm px-5 py-2.5 rounded-full font-bold shadow-lg shadow-orange/20 hover:scale-[1.02] transition"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-line bg-bg2 text-orange text-xs font-semibold uppercase tracking-widest mb-8">
          <span className="w-2 h-2 rounded-full bg-orange animate-pulse" /> Built for Gulf Filmmakers
        </div>

        <h1 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
          Deliver Video Cuts to Clients. <br />
          <span className="bg-gradient-to-r from-orange via-orange2 to-amber-400 bg-clip-text text-transparent">
            Clean, Branded, & Unrestricted.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-dim max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          The video-first portfolio and client delivery platform built for videographers in Dubai, Riyadh, and the Gulf. Share private cut links, collect timecoded notes, and lock approved final cuts.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link 
            href="/signup" 
            className="btn text-base px-8 py-4 rounded-full font-bold w-full sm:w-auto shadow-xl shadow-orange/25 hover:shadow-orange/40 transition"
          >
            Start 7-Day Free Trial <ArrowRight className="w-5 h-5 ml-1" />
          </Link>
          <Link 
            href="/deliver/demo" 
            className="px-8 py-4 rounded-full font-semibold border border-line bg-bg2 hover:bg-bg3 text-ink w-full sm:w-auto transition flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current text-orange" /> See Client Review Demo
          </Link>
        </div>

        {/* Video Mockup Preview */}
        <div className="relative rounded-2xl border border-line bg-bg2 overflow-hidden shadow-2xl p-2 md:p-4">
          <div className="aspect-video bg-gradient-to-br from-neutral-900 via-neutral-950 to-black rounded-xl relative flex items-center justify-center group overflow-hidden border border-line/50">
            <div className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:scale-105 transition duration-700" style={{ backgroundImage: "url('/images/hero.jpg')" }} />
            <div className="relative z-10 w-20 h-20 rounded-full bg-orange/90 backdrop-blur-md flex items-center justify-center cursor-pointer shadow-2xl group-hover:scale-110 transition">
              <Play className="w-8 h-8 text-black fill-current ml-1" />
            </div>
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between z-10 bg-bg/80 backdrop-blur-md p-4 rounded-xl border border-line">
              <div>
                <p className="font-display font-bold text-white text-left">Omakase Teaser — Cut V2</p>
                <p className="text-xs text-dim text-left">Lost in Tokyo · Client Review</p>
              </div>
              <span className="px-3 py-1 bg-orange/20 text-orange font-semibold text-xs rounded-full border border-orange/30">
                In Review
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Surface Showcase Grid */}
      <section id="features" className="py-24 border-t border-line bg-bg2/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Four Surfaces. One Seamless Platform.</h2>
            <p className="text-dim">Everything you need to showcase work, deliver cuts, receive client feedback, and get final cut signoffs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl bg-bg2 border border-line hover:border-orange/40 transition">
              <Globe className="w-10 h-10 text-orange mb-4" />
              <h3 className="font-display text-xl font-bold mb-2">1. Public Marketing & Portfolio</h3>
              <p className="text-dim text-sm leading-relaxed">Showcase your top projects with pinned reels, custom typography, brand accent colors, and an About section.</p>
            </div>

            <div className="p-8 rounded-2xl bg-bg2 border border-line hover:border-orange/40 transition">
              <Film className="w-10 h-10 text-orange mb-4" />
              <h3 className="font-display text-xl font-bold mb-2">2. Filmmaker Backend</h3>
              <p className="text-dim text-sm leading-relaxed">Upload video cuts, manage version history (V1, V2, Final), track client approval states, and customize brand styles.</p>
            </div>

            <div className="p-8 rounded-2xl bg-bg2 border border-line hover:border-orange/40 transition">
              <Zap className="w-10 h-10 text-orange mb-4" />
              <h3 className="font-display text-xl font-bold mb-2">3. Client Delivery Room</h3>
              <p className="text-dim text-sm leading-relaxed">No client logins required. Clients open a private link, switch versions, post feedback, approve cuts, and download final files.</p>
            </div>

            <div className="p-8 rounded-2xl bg-bg2 border border-line hover:border-orange/40 transition">
              <MessageCircle className="w-10 h-10 text-orange mb-4" />
              <h3 className="font-display text-xl font-bold mb-2">4. WhatsApp Delivery</h3>
              <p className="text-dim text-sm leading-relaxed">Send client delivery links directly to WhatsApp with pre-formatted messages tailored for Gulf clients.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (AED Tiers) */}
      <section id="pricing" className="py-24 border-t border-line">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Simple Pricing in AED</h2>
            <p className="text-dim">7-day free trial. Metered video storage so you never pay for photo limits you don't use.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Solo Tier */}
            <div className="p-8 rounded-2xl bg-bg2 border border-line flex flex-col justify-between">
              <div>
                <h3 className="font-display text-xl font-bold mb-2">Solo</h3>
                <p className="text-xs text-dim mb-6">For independent filmmakers</p>
                <div className="mb-6">
                  <span className="font-display text-4xl font-extrabold text-ink">39</span>
                  <span className="text-dim text-sm"> AED / month</span>
                </div>
                <ul className="space-y-3 text-sm text-dim mb-8">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange" /> Up to 5 active projects</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange" /> 1080p Cloudflare streaming</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange" /> Versioning & client approvals</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange" /> WhatsApp delivery links</li>
                </ul>
              </div>
              <Link href="/signup?plan=solo" className="w-full py-3 rounded-full border border-line font-bold text-center text-sm hover:bg-bg3 transition">Start Free Trial</Link>
            </div>

            {/* Studio Tier (Popular) */}
            <div className="p-8 rounded-2xl bg-bg2 border-2 border-orange relative flex flex-col justify-between shadow-2xl shadow-orange/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-orange text-black font-extrabold text-xs uppercase tracking-widest rounded-full">Most Popular</div>
              <div>
                <h3 className="font-display text-xl font-bold mb-2">Studio</h3>
                <p className="text-xs text-dim mb-6">For active boutique studios</p>
                <div className="mb-6">
                  <span className="font-display text-4xl font-extrabold text-ink">99</span>
                  <span className="text-dim text-sm"> AED / month</span>
                </div>
                <ul className="space-y-3 text-sm text-dim mb-8">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange" /> Unlimited active projects</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange" /> 4K Cloudflare video streaming</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange" /> Custom brand colors & domain</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange" /> Priority WhatsApp support</li>
                </ul>
              </div>
              <Link href="/signup?plan=studio" className="btn w-full py-3 rounded-full font-bold text-center text-sm shadow-lg shadow-orange/20">Start Free Trial</Link>
            </div>

            {/* Agency Tier */}
            <div className="p-8 rounded-2xl bg-bg2 border border-line flex flex-col justify-between">
              <div>
                <h3 className="font-display text-xl font-bold mb-2">Agency</h3>
                <p className="text-xs text-dim mb-6">For high-volume production houses</p>
                <div className="mb-6">
                  <span className="font-display text-4xl font-extrabold text-ink">199</span>
                  <span className="text-dim text-sm"> AED / month</span>
                </div>
                <ul className="space-y-3 text-sm text-dim mb-8">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange" /> Everything in Studio</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange" /> High bandwidth allocation</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange" /> Team collaborator accounts</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange" /> Dedicated account manager</li>
                </ul>
              </div>
              <Link href="/signup?plan=agency" className="w-full py-3 rounded-full border border-line font-bold text-center text-sm hover:bg-bg3 transition">Start Free Trial</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line py-12 text-center text-xs text-faint">
        <p>© {new Date().getFullYear()} CUT Platform. Built for Gulf filmmakers.</p>
      </footer>
    </div>
  );
}
