import Link from "next/link";
import { Play, Film, User, Mail, MessageCircle, Clock } from "lucide-react";

const PUBLIC_WORK = [
  {
    id: "1",
    title: "Omakase Teaser",
    client: "Lost in Tokyo",
    tc: "00:47",
    g: "linear-gradient(135deg,#3a1a10,#7a2f18)",
    desc: "A moody 47-second teaser for the launch of a new omakase counter.",
  },
  {
    id: "2",
    title: "Aisha & Omar",
    client: "Wedding Film",
    tc: "03:12",
    g: "linear-gradient(135deg,#1c2230,#38404e)",
    desc: "A three-minute wedding film shot across two days in Dubai.",
  },
  {
    id: "3",
    title: "GT3 Build Film",
    client: "Prestige Rentals",
    tc: "01:20",
    g: "linear-gradient(135deg,#101a1c,#20403f)",
    desc: "Documenting a Mercedes GT converted to full GT3 spec.",
  },
  {
    id: "4",
    title: "Launch Reel",
    client: "Clean Performance",
    tc: "00:30",
    g: "linear-gradient(135deg,#3a2208,#8a4f14)",
    desc: "A punchy 30-second launch reel for a healthy-snack brand.",
  },
];

export default function PortfolioShowcasePage({ params }: { params: { handle: string } }) {
  return (
    <div className="min-h-screen bg-bg text-ink selection:bg-orange selection:text-black">
      {/* Portfolio Header */}
      <header className="border-b border-line bg-bg2/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange text-black font-extrabold flex items-center justify-center font-display">
              PC
            </div>
            <div>
              <h1 className="font-display font-bold text-lg leading-none">Pedro Concreato</h1>
              <p className="text-xs text-dim mt-0.5 font-mono">@{params.handle} · Filmmaker Dubai</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://wa.me/+971501234567"
              target="_blank"
              rel="noreferrer"
              className="btn text-xs px-4 py-2 rounded-full font-bold shadow-md shadow-orange/20"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Book via WhatsApp
            </a>
          </div>
        </div>
      </header>

      {/* Hero Showcase Reel */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="relative rounded-3xl border border-line bg-bg2 overflow-hidden shadow-2xl p-4 md:p-8">
          <div className="aspect-[21/9] bg-neutral-950 rounded-2xl relative overflow-hidden flex items-center justify-center group">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:scale-105 transition duration-700"
              style={{ backgroundImage: "url('/images/showcase.jpg')" }}
            />
            <div className="relative z-10 w-20 h-20 rounded-full bg-orange text-black flex items-center justify-center cursor-pointer shadow-2xl group-hover:scale-110 transition">
              <Play className="w-8 h-8 fill-current ml-1" />
            </div>
            <div className="absolute bottom-6 left-6 right-6 z-10 flex items-center justify-between bg-bg/80 backdrop-blur-md p-4 rounded-xl border border-line">
              <div>
                <span className="text-xs font-mono text-orange uppercase tracking-widest font-semibold">Featured Reel</span>
                <h2 className="font-display font-bold text-xl text-white">Omakase Teaser — Director's Cut</h2>
              </div>
              <span className="text-xs font-mono text-dim">00:47</span>
            </div>
          </div>
        </div>
      </section>

      {/* Work Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="font-display text-2xl font-bold mb-8">Selected Work</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {PUBLIC_WORK.map((item) => (
            <div
              key={item.id}
              className="group rounded-2xl bg-bg2 border border-line overflow-hidden hover:border-orange/40 transition flex flex-col justify-between"
            >
              <div className="h-56 relative p-6 flex flex-col justify-between" style={{ background: item.g }}>
                <div className="flex items-center justify-between z-10">
                  <span className="text-xs font-mono text-white/80 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {item.tc}
                  </span>
                </div>
                <div className="z-10">
                  <h3 className="font-display text-2xl font-bold text-white group-hover:text-orange transition">
                    {item.title}
                  </h3>
                  <p className="text-xs text-white/70 mt-1">{item.client}</p>
                </div>
              </div>
              <div className="p-6 bg-bg2 border-t border-line">
                <p className="text-xs text-dim leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line py-8 text-center text-xs text-faint">
        <p>Powered by <Link href="/" className="text-orange font-bold hover:underline">CUT</Link> — Video Platform for Filmmakers</p>
      </footer>
    </div>
  );
}
