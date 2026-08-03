"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Play,
  Plus,
  Check,
  Download,
  Link2,
  MessageCircle,
  Lock,
  Share2,
  Film,
  Image as ImageIcon,
  Clock,
  ArrowRight,
  ArrowLeft,
  X,
  Send,
  Upload,
  ChevronDown,
  Star,
  ExternalLink,
} from "lucide-react";
import { Project, ProjectStatus, Comment as CommentType } from "@/types";

const IMG_HERO = "/images/hero.jpg";
const IMG_SHOW = "/images/showcase.jpg";
const IMG_CTA = "/images/cta.jpg";
const IMG_ABOUT = "/images/about-img.png";

const STATUS: Record<ProjectStatus, { l: string; c: string }> = {
  draft: { l: "Draft", c: "#6B7580" },
  review: { l: "In review", c: "#F5551D" },
  delivered: { l: "Delivered", c: "#86B98F" },
};

const ACCENTS = ["#F5551D", "#E23B3B", "#7C5CFF", "#1D9E75", "#378ADD"];

const SEED: Project[] = [
  {
    id: "1",
    userId: "u1",
    title: "Omakase Teaser",
    client: "Lost in Tokyo",
    type: "film",
    status: "review",
    tc: "00:47",
    g: "linear-gradient(135deg,#3a1a10,#7a2f18)",
    pinned: true,
    desc: "A moody 47-second teaser for the launch of a new omakase counter.",
    createdAt: "2026-08-01",
  },
  {
    id: "2",
    userId: "u1",
    title: "Aisha & Omar",
    client: "Wedding Film",
    type: "film",
    status: "delivered",
    tc: "03:12",
    g: "linear-gradient(135deg,#1c2230,#38404e)",
    desc: "A three-minute wedding film shot across two days in Dubai.",
    createdAt: "2026-07-28",
  },
  {
    id: "3",
    userId: "u1",
    title: "GT3 Build Film",
    client: "Prestige Rentals",
    type: "film",
    status: "review",
    tc: "01:20",
    g: "linear-gradient(135deg,#101a1c,#20403f)",
    desc: "Documenting a Mercedes GT converted to full GT3 spec.",
    createdAt: "2026-07-20",
  },
  {
    id: "4",
    userId: "u1",
    title: "Launch Reel",
    client: "Clean Performance",
    type: "film",
    status: "delivered",
    tc: "00:30",
    g: "linear-gradient(135deg,#3a2208,#8a4f14)",
    desc: "A punchy 30-second launch reel for a healthy-snack brand.",
    createdAt: "2026-07-15",
  },
];

const FAQS = [
  {
    q: "Do my clients need an account?",
    a: "No. Clients open a private link and can watch, comment, and approve — nothing to install or sign up for.",
  },
  {
    q: "Can I use my own branding?",
    a: "Yes. Set your logo, accent colour, and layout in Customize so every page a client sees looks like yours, not ours.",
  },
  {
    q: "How does delivery work?",
    a: "Upload a cut, get a private link, and send it over WhatsApp or email. Clients review each version and approve the final.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — plans are monthly with no lock-in, and your work stays yours.",
  },
];

export default function CutApp() {
  const [surface, setSurface] = useState<"website" | "public" | "backend" | "client">("website");
  const [pubTab, setPubTab] = useState<"work" | "about">("work");
  const [beTab, setBeTab] = useState<"projects" | "brand">("projects");
  const [projects, setProjects] = useState<Project[]>(SEED);
  const [selId, setSelId] = useState<string>("1");
  const [toast, setToast] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", client: "" });
  const [ver, setVer] = useState("Final");
  const [accent, setAccent] = useState("#F5551D");
  const [tpl, setTpl] = useState("Grid");
  const [brandName, setBrandName] = useState("Pedro Concreato");
  const [faqOpen, setFaqOpen] = useState(0);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [reply, setReply] = useState("");
  const [pinnedId, setPinnedId] = useState<string>("1");
  const [bio, setBio] = useState(
    "Filmmaker & creative director based between Dubai and Sharjah. I make brand films, weddings, and launch content for the Gulf — story first, craft you don't notice."
  );
  const [draft, setDraft] = useState("");
  const [comments, setComments] = useState<Array<{ who: "client" | "me"; meta: string; text: string }>>([
    {
      who: "client",
      meta: "Lost in Tokyo · 2h ago",
      text: "Love this cut! Can we make the intro a touch faster?",
    },
    { who: "me", meta: "You · 1h ago", text: "On it — sending V2 shortly." },
  ]);

  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    const io = new IntersectionObserver(
      (ents) => {
        ents.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [surface]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2100);
  };

  const sel = projects.find((p) => p.id === selId) || projects[0];
  const pinned = projects.find((p) => p.id === pinnedId) || projects[0];

  const addProject = () => {
    if (!form.title.trim()) return;
    const newP: Project = {
      id: Date.now().toString(),
      userId: "u1",
      title: form.title.trim(),
      client: form.client.trim() || "Unassigned",
      type: "film",
      status: "draft",
      tc: "00:00",
      g: "linear-gradient(135deg,#1a2028,#2a3742)",
      desc: "",
      createdAt: new Date().toISOString(),
    };
    setProjects([newP, ...projects]);
    setForm({ title: "", client: "" });
    setShowAdd(false);
    flash("Project created");
  };

  const approve = () => {
    setProjects(
      projects.map((p) => (p.id === sel.id ? { ...p, status: "delivered" as ProjectStatus } : p))
    );
    flash("Approved — locked & filmmaker notified");
  };

  const addComment = (who: "client" | "me", txt: string, clear: () => void) => {
    if (!txt.trim()) return;
    setComments([...comments, { who, meta: "You · just now", text: txt.trim() }]);
    clear();
  };

  const Status = ({ s }: { s: ProjectStatus }) => (
    <span className="status">
      <span className="dot" style={{ background: STATUS[s].c }} />
      {STATUS[s].l}
    </span>
  );

  const CommentItem = ({ c }: { c: { who: "client" | "me"; meta: string; text: string } }) => (
    <div className="cmt">
      <div
        className="cav"
        style={{
          background: c.who === "me" ? "linear-gradient(140deg,var(--orange),var(--orange2))" : "var(--bg3)",
          color: c.who === "me" ? "#1a0c04" : "var(--ink)",
        }}
      >
        {c.who === "me" ? "PC" : "C"}
      </div>
      <div>
        <div className="cmeta">{c.meta}</div>
        <div className="ctext">{c.text}</div>
      </div>
    </div>
  );

  const Card = ({ p, onClick, showStatus }: { p: Project; onClick?: () => void; showStatus?: boolean }) => (
    <div className="card" onClick={onClick}>
      <div className="thumb" style={{ background: p.g }}>
        <span className="tmark">
          {p.type === "film" ? <Film size={11} /> : <ImageIcon size={11} />}
          {p.type}
        </span>
        <div className="play">
          <Play size={17} />
        </div>
        <span className="dur">{p.tc}</span>
      </div>
      <div className="cbody">
        <div className="ctitle">{p.title}</div>
        <div className="cclient">{p.client}</div>
        {p.desc && <div className="cdesc">{p.desc}</div>}
        {showStatus && <Status s={p.status} />}
      </div>
    </div>
  );

  const nReview = projects.filter((p) => p.status === "review").length;
  const nDeliv = projects.filter((p) => p.status === "delivered").length;

  return (
    <div className="root min-h-screen bg-bg text-ink">
      {/* Top Demo Surface Switcher Bar */}
      <div className="switcher">
        <span className="lbl">Interactive Demo Surface:</span>
        <div className="seg">
          {[
            ["website", "1. CUT Website"],
            ["public", "2. Public Portfolio"],
            ["backend", "3. Filmmaker Backend"],
            ["client", "4. Client Delivery Room"],
          ].map(([k, l]) => (
            <button
              key={k}
              className={surface === k ? "on" : ""}
              onClick={() => setSurface(k as any)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ===================== SURFACE 1: CUT WEBSITE ===================== */}
      {surface === "website" && (
        <div className="wrap anim-in">
          <nav className="topnav">
            <Link href="/" className="disp text-2xl font-black text-ink">
              CUT<span className="text-orange">.</span>
            </Link>
            <div className="navlinks">
              <a href="#features">Features</a>
              <a href="#pricing">Pricing (AED)</a>
              <a href="#faq">FAQ</a>
            </div>
            <button className="btn sm" onClick={() => setSurface("backend")}>
              Start free trial
            </button>
          </nav>

          <header
            className="hero photo"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(10,10,11,.30), rgba(10,10,11,.70) 62%, rgba(10,10,11,.93)), url(${IMG_HERO})`,
            }}
          >
            <div className="grain" />
            <h1 className="disp">
              Deliver video cuts
              <br />
              like a studio.
            </h1>
            <p>
              Your video portfolio, client review room, and delivery — built for filmmakers in the Gulf.
            </p>
            <div className="row">
              <button className="btn dark" onClick={() => setSurface("backend")}>
                Start free trial <ArrowRight size={16} />
              </button>
              <button
                className="btn ghost"
                style={{ borderColor: "rgba(255,255,255,.2)", color: "#fff" }}
                onClick={() => setSurface("client")}
              >
                See a client delivery
              </button>
            </div>
          </header>

          <div className="trust">
            <b>Trusted by filmmakers at</b> Lost in Tokyo · Clean Performance · Prestige Rentals · Seen Couture
          </div>

          <section id="features" className="section reveal">
            <div className="eyebrow" style={{ textAlign: "center" }}>
              Everything you send clients
            </div>
            <div className="feats">
              <div className="feat">
                <div className="ic">
                  <ImageIcon size={20} />
                </div>
                <h3>A video portfolio that sells</h3>
                <p>
                  A clean, branded page for your best work — your shop window in the Gulf, always up to date.
                </p>
              </div>
              <div className="feat">
                <div className="ic">
                  <MessageCircle size={20} />
                </div>
                <h3>Review & approve cuts</h3>
                <p>
                  Clients watch, comment, and approve each cut. Version history tracked, final sign-off locked.
                </p>
              </div>
              <div className="feat">
                <div className="ic">
                  <Send size={20} />
                </div>
                <h3>Deliver over WhatsApp</h3>
                <p>
                  Send private links your clients open in one tap — no accounts, no friction, AED billing.
                </p>
              </div>
            </div>
          </section>

          {/* Pricing Section (AED Tiers) */}
          <section id="pricing" className="section reveal">
            <div className="eyebrow" style={{ textAlign: "center" }}>
              Simple pricing in AED
            </div>
            <h2 className="sec-h disp" style={{ textAlign: "center" }}>
              7-day free trial. Metered video storage.
            </h2>
            <div className="pricing-cards mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-bg2 border border-line flex flex-col justify-between">
                <div>
                  <h3 className="disp text-xl font-bold">Solo</h3>
                  <div className="my-4">
                    <span className="disp text-4xl font-extrabold">39</span>
                    <span className="text-dim text-sm"> AED / mo</span>
                  </div>
                  <p className="text-xs text-dim mb-4">For independent videographers</p>
                  <ul className="text-xs text-dim space-y-2">
                    <li>✓ 5 active projects</li>
                    <li>✓ 1080p Cloudflare streaming</li>
                    <li>✓ WhatsApp client links</li>
                  </ul>
                </div>
                <button className="btn ghost sm mt-6 w-full" onClick={() => setSurface("backend")}>
                  Start trial
                </button>
              </div>

              <div className="p-6 rounded-2xl bg-bg2 border-2 border-orange relative flex flex-col justify-between shadow-xl">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-orange text-black font-extrabold text-[10px] uppercase rounded-full">
                  Popular
                </span>
                <div>
                  <h3 className="disp text-xl font-bold">Studio</h3>
                  <div className="my-4">
                    <span className="disp text-4xl font-extrabold">99</span>
                    <span className="text-dim text-sm"> AED / mo</span>
                  </div>
                  <p className="text-xs text-dim mb-4">For active boutique studios</p>
                  <ul className="text-xs text-dim space-y-2">
                    <li>✓ Unlimited active projects</li>
                    <li>✓ 4K video streaming</li>
                    <li>✓ Custom brand colors & domain</li>
                  </ul>
                </div>
                <button className="btn sm mt-6 w-full" onClick={() => setSurface("backend")}>
                  Start trial
                </button>
              </div>

              <div className="p-6 rounded-2xl bg-bg2 border border-line flex flex-col justify-between">
                <div>
                  <h3 className="disp text-xl font-bold">Agency</h3>
                  <div className="my-4">
                    <span className="disp text-4xl font-extrabold">199</span>
                    <span className="text-dim text-sm"> AED / mo</span>
                  </div>
                  <p className="text-xs text-dim mb-4">For production houses</p>
                  <ul className="text-xs text-dim space-y-2">
                    <li>✓ Everything in Studio</li>
                    <li>✓ High bandwidth allocation</li>
                    <li>✓ Team collaborator seats</li>
                  </ul>
                </div>
                <button className="btn ghost sm mt-6 w-full" onClick={() => setSurface("backend")}>
                  Start trial
                </button>
              </div>
            </div>
          </section>

          <footer className="foot border-t border-line py-8 text-center text-xs text-faint">
            © {new Date().getFullYear()} CUT Platform. Built for Gulf filmmakers.
          </footer>
        </div>
      )}

      {/* ===================== SURFACE 2: PUBLIC PORTFOLIO ===================== */}
      {surface === "public" && (
        <div className="wrap anim-in">
          <div className="pubhead">
            <div className="brand disp">
              {brandName || "Pedro Concreato"}
              <span style={{ color: accent }}>.</span>
            </div>
            <div className="tabnav">
              <button
                className={pubTab === "work" ? "on" : ""}
                style={pubTab === "work" ? { background: accent, color: "#1a0c04" } : {}}
                onClick={() => setPubTab("work")}
              >
                Work
              </button>
              <button
                className={pubTab === "about" ? "on" : ""}
                style={pubTab === "about" ? { background: accent, color: "#1a0c04" } : {}}
                onClick={() => setPubTab("about")}
              >
                About
              </button>
            </div>
          </div>

          {pubTab === "work" && (
            <>
              {pinned && (
                <div className="pin">
                  <div className="pin-visual" style={{ background: pinned.g }}>
                    <span className="pin-pill font-mono">Pinned Reel</span>
                    <div className="bigplay" onClick={() => flash("Playing reel…")}>
                      <Play size={24} />
                    </div>
                  </div>
                  <div className="pin-info">
                    <div className="pin-client">{pinned.client}</div>
                    <div className="pin-title disp">{pinned.title}</div>
                    {pinned.desc && <div className="pin-desc">{pinned.desc}</div>}
                  </div>
                </div>
              )}

              <div className="grid">
                {projects.map((p) => (
                  <Card
                    key={p.id}
                    p={p}
                    onClick={() => {
                      setSelId(p.id);
                      setSurface("client");
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {pubTab === "about" && (
            <div className="about">
              <div className="a-photo" style={{ backgroundImage: `url(${IMG_ABOUT})` }} />
              <div>
                <h2 className="disp">About {brandName}</h2>
                <p>{bio}</p>
                <button className="btn" style={{ background: accent, color: "#1a0c04" }} onClick={() => flash("Opening WhatsApp...")}>
                  <MessageCircle size={15} />
                  Get in touch
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== SURFACE 3: FILMMAKER BACKEND ===================== */}
      {surface === "backend" && (
        <div className="wrap anim-in">
          <div className="behead">
            <span className="brand disp">
              CUT<span style={{ color: "var(--orange)" }}>.</span>
              <span className="pill">Backend</span>
            </span>
            <div className="tabnav">
              <button className={beTab === "projects" ? "on" : ""} onClick={() => setBeTab("projects")}>
                Projects
              </button>
              <button className={beTab === "brand" ? "on" : ""} onClick={() => setBeTab("brand")}>
                Customize Brand
              </button>
            </div>
          </div>

          {beTab === "projects" && (
            <>
              <div className="stats">
                <div className="stat">
                  <div className="stat-val disp">{projects.length}</div>
                  <div className="stat-lbl">Total projects</div>
                </div>
                <div className="stat">
                  <div className="stat-val disp">{nReview}</div>
                  <div className="stat-lbl">In review</div>
                </div>
                <div className="stat">
                  <div className="stat-val disp">{nDeliv}</div>
                  <div className="stat-lbl">Delivered</div>
                </div>
              </div>

              <div className="pagehead">
                <div>
                  <h2 className="disp">Your Projects</h2>
                  <p className="sec-sub">Manage cuts, track client reviews, and share delivery links.</p>
                </div>
                <button className="btn" onClick={() => setShowAdd(true)}>
                  <Plus size={15} />
                  New project
                </button>
              </div>

              <div className="grid">
                {projects.map((p) => (
                  <Card
                    key={p.id}
                    p={p}
                    showStatus
                    onClick={() => {
                      setSelId(p.id);
                      setSurface("client");
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {beTab === "brand" && (
            <div className="customize p-6 bg-bg2 border border-line rounded-2xl space-y-4">
              <h3 className="disp text-xl font-bold">Customize Brand Appearance</h3>
              <div className="field">
                <label className="block text-xs text-dim uppercase mb-1">Brand Name</label>
                <input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full bg-bg3 border border-line rounded-xl px-4 py-2.5 text-sm text-ink"
                />
              </div>
              <div className="field">
                <label className="block text-xs text-dim uppercase mb-1">Accent Color</label>
                <div className="flex gap-3">
                  {ACCENTS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setAccent(c)}
                      style={{ backgroundColor: c }}
                      className={`w-8 h-8 rounded-full border-2 ${accent === c ? "border-white" : "border-transparent"}`}
                    />
                  ))}
                </div>
              </div>
              <button className="btn sm mt-4" onClick={() => flash("Branding saved")}>
                <Check size={14} /> Save Changes
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===================== SURFACE 4: CLIENT DELIVERY ROOM ===================== */}
      {surface === "client" && (
        <div className="wrap anim-in">
          <div className="clienthead">
            <span className="brand disp">
              {brandName}<span style={{ color: "var(--orange)" }}>.</span>
            </span>
            <span className="lockpill">
              <Lock size={13} /> Private Link · Active Review
            </span>
          </div>

          <div className="pagehead" style={{ paddingTop: 22 }}>
            <div>
              <div className="eyebrow">Delivery for {sel.client}</div>
              <h1 className="disp">{sel.title}</h1>
            </div>
          </div>

          <div className="stage-wrap">
            <div className="stage" style={{ background: sel.g }}>
              <span className="stage-title disp">{sel.title}</span>
              <div className="bigplay" onClick={() => flash("Playing cut…")}>
                <Play size={24} />
              </div>
              <span className="stage-tc">00:00 / {sel.tc}</span>
            </div>

            <div className="vstrip">
              {["V1", "V2", "Final"].map((v) => (
                <button
                  key={v}
                  className={`vchip ${ver === v ? "on" : ""}`}
                  onClick={() => setVer(v)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="dactions">
            <button className="btn" onClick={() => flash("Download started")}>
              <Download size={15} />
              Download High-Res
            </button>

            {sel.status !== "delivered" ? (
              <button className="btn ghost" onClick={approve}>
                <Check size={15} />
                Approve Final Cut
              </button>
            ) : (
              <span className="seal">
                <Check size={14} />
                Approved & Locked
              </span>
            )}

            <button className="btn ghost" onClick={() => flash("Opening WhatsApp...")}>
              <MessageCircle size={15} />
              WhatsApp {brandName.split(" ")[0]}
            </button>
          </div>

          <div className="cmts">
            <h4>Client Notes & Feedback</h4>
            {comments.map((c, i) => (
              <CommentItem key={i} c={c} />
            ))}

            <div className="cinput">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add a comment on this cut..."
                onKeyDown={(e) => e.key === "Enter" && addComment("client", draft, () => setDraft(""))}
              />
              <button onClick={() => addComment("client", draft, () => setDraft(""))}>
                <Send size={16} />
              </button>
            </div>
          </div>

          <div className="foot">
            <span>Delivered with CUT Platform</span>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showAdd && (
        <div className="overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="disp">New Project</h3>
              <button className="btn ghost sm" style={{ padding: 8 }} onClick={() => setShowAdd(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="field">
              <label>Project Title</label>
              <input
                autoFocus
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addProject()}
                placeholder="e.g. Omakase Launch Cut"
              />
            </div>
            <div className="field">
              <label>Client Name</label>
              <input
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addProject()}
                placeholder="e.g. Lost in Tokyo"
              />
            </div>
            <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 22 }} onClick={addProject}>
              <Plus size={15} />
              Create Project
            </button>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toast && (
        <div className="toast">
          <Check size={15} />
          {toast}
        </div>
      )}
    </div>
  );
}
