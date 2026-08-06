"use client";

import React, { useState, useEffect } from "react";
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
  Pencil,
  Upload,
  ChevronDown,
  Star,
} from "lucide-react";

// Global styles now live in styles/globals.css (imported once in your
// app/layout.js or pages/_app.js — see the setup notes at the bottom
// of this message). Do NOT import it here as well, or it'll be
// duplicated in the bundle.

// ============================================================
//  CineSpace — full prototype (orange/dark)
//  Surfaces: CineSpace website · Filmmaker PUBLIC page ·
//            Filmmaker BACKEND (private) · Client view
// ============================================================

// -----------------------------------------------------------------
// Image / logo assets
// -----------------------------------------------------------------
// These were large inline base64 data URIs in your original single
// file. Rather than bloat this component (and your JS bundle) with
// ~200KB+ of base64 text, drop the actual image files in /public and
// reference them by path — that's the normal Next.js pattern and lets
// next/image optimize them for you.
//
//   1. Save each data URI from your original file as a real file:
//        IMG_HERO   -> public/images/hero.jpg
//        IMG_SHOW   -> public/images/showcase.jpg
//        IMG_CTA    -> public/images/cta.jpg
//        IMG_ABOUT  -> public/images/about.jpg
//        LOGO_SRC   -> public/images/logo.svg
//   2. Keep the paths below (or update them to match).
//
// If you'd rather keep them inline for now, just paste your original
// base64 strings back in as the values of these consts — everything
// else in this file works unchanged either way.

const IMG_HERO = "/images/hero.jpg";
const IMG_SHOW = "/images/showcase.jpg";
const IMG_CTA = "/images/cta.jpg";
const IMG_ABOUT = "/images/about-img.png";
const LOGO_SRC = "/images/logo.svg";

const STATUS = {
  draft: { l: "Draft", c: "var(--grey)" },
  review: { l: "In review", c: "var(--orange)" },
  delivered: { l: "Delivered", c: "var(--sage)" },
};
const ACCENTS = ["#F5551D", "#E23B3B", "#7C5CFF", "#1D9E75", "#378ADD"];
const SEED = [
  {
    id: 1,
    title: "Omakase Teaser",
    client: "Lost in Tokyo",
    type: "film",
    status: "review",
    tc: "00:47",
    delivered: "Aug 08, 2026",
    location: "Tokyo, Japan",
    totalSize: "2.8 GB",
    assets: 4,
    bgImage: "/images/placeholder.jpg",
    g: "linear-gradient(135deg,#3a1a10,#7a2f18)",
    pinned: true,
    desc: "A moody 47-second teaser for the launch of a new omakase counter.",
  },
  {
    id: 2,
    title: "Aisha & Omar",
    client: "Wedding Film",
    type: "film",
    status: "delivered",
    tc: "03:12",
    delivered: "Jul 24, 2026",
    location: "Dubai, UAE",
    totalSize: "14.6 GB",
    assets: 2,
    bgImage: "/images/placeholder.jpg",
    g: "linear-gradient(135deg,#1c2230,#38404e)",
    desc: "A three-minute wedding film shot across two days in Dubai.",
  },
  {
    id: 3,
    title: "GT3 Build Film",
    client: "Prestige Rentals",
    type: "film",
    status: "review",
    tc: "01:20",
    delivered: "02.21.26",
    location: "Dubai, UAE",
    totalSize: "1.1 GB",
    assets: 6,
    bgImage: "/images/project-files/the-gt3-build/cover.jpg",
    g: "linear-gradient(135deg,#101a1c,#20403f)",
    desc: "Documenting a Mercedes GT converted to full GT3 spec.",
  },
  {
    id: 4,
    title: "Launch Reel",
    client: "Clean Performance",
    type: "film",
    status: "delivered",
    tc: "00:30",
    delivered: "Jun 12, 2026",
    location: "Riyadh, Saudi Arabia",
    totalSize: "1.5 GB",
    assets: 5,
    bgImage: "/images/placeholder.jpg",
    g: "linear-gradient(135deg,#3a2208,#8a4f14)",
    desc: "A punchy 30-second launch reel for a healthy-snack brand.",
  },
];
// Each project keeps its own asset library
// switching the project being previewed also switches its files
const PROJECT_FILES = {
  1: [
    {
      id: 1,
      name: "main_edit",
      type: "video",
      size: "312 MB",
      tc: "1:24",
      bgImage: "/images/placeholder.jpg",
      g: "linear-gradient(135deg,#3a1a10,#7a2f18)",
      versions: ["V1", "V2"],
      approved: false,
      comments: [
        {
          who: "client",
          meta: "Client · 2h ago",
          text: "Love the opening — can we punch the grade a touch?",
        },
      ],
    },
    {
      id: 2,
      name: "vertical_cut",
      type: "video",
      size: "298 MB",
      tc: "0:58",
      bgImage: "/images/placeholder.jpg",
      g: "linear-gradient(135deg,#1c2230,#38404e)",
      versions: ["V1"],
      approved: true,
      comments: [],
    },
    {
      id: 3,
      name: "still_01",
      type: "photo",
      size: "24 MB",
      bgImage: "/images/placeholder.jpg",
      g: "linear-gradient(135deg,#101a1c,#20403f)",
      versions: ["Final"],
      approved: false,
      comments: [],
    },
    {
      id: 4,
      name: "still_02",
      type: "photo",
      size: "22 MB",
      bgImage: "/images/placeholder.jpg",
      g: "linear-gradient(135deg,#3a2208,#8a4f14)",
      versions: ["Final"],
      approved: false,
      comments: [],
    },
  ],
  2: [
    {
      id: 1,
      name: "ceremony_highlight",
      type: "video",
      size: "540 MB",
      tc: "3:12",
      bgImage: "/images/placeholder.jpg",
      g: "linear-gradient(135deg,#1c2230,#38404e)",
      versions: ["V1", "Final"],
      approved: true,
      comments: [],
    },
    {
      id: 2,
      name: "reception_edit",
      type: "video",
      size: "410 MB",
      tc: "2:05",
      bgImage: "/images/placeholder.jpg",
      g: "linear-gradient(135deg,#2b1a1f,#4a2530)",
      versions: ["V1", "Final"],
      approved: true,
      comments: [],
    },
    {
      id: 3,
      name: "portrait_01",
      type: "photo",
      size: "31 MB",
      bgImage: "/images/placeholder.jpg",
      g: "linear-gradient(135deg,#101a1c,#20403f)",
      versions: ["Final"],
      approved: true,
      comments: [],
    },
    {
      id: 4,
      name: "portrait_02",
      type: "photo",
      size: "29 MB",
      bgImage: "/images/placeholder.jpg",
      g: "linear-gradient(135deg,#3a2208,#8a4f14)",
      versions: ["Final"],
      approved: true,
      comments: [],
    },
  ],
  3: [
    {
      id: 1,
      name: "build_montage",
      type: "video",
      size: "280 MB",
      tc: "1:00",
      bgImage: "/images/project-files/the-gt3-build/1.jpg",
      g: "linear-gradient(135deg,#101a1c,#20403f)",
      versions: ["V1", "V2"],
      approved: false,
      comments: [
        {
          who: "client",
          meta: "Prestige Rentals · 5h ago",
          text: "Can we get a slower push-in on the engine bay shot?",
        },
      ],
    },
    {
      id: 2,
      name: "drive_teaser",
      type: "video",
      size: "190 MB",
      tc: "0:20",
      bgImage: "/images/project-files/the-gt3-build/2.jpg",
      g: "linear-gradient(135deg,#1c2230,#38404e)",
      versions: ["V1"],
      approved: false,
      comments: [],
    },
    {
      id: 3,
      name: "still_engine",
      type: "photo",
      size: "18 MB",
      bgImage: "/images/project-files/the-gt3-build/3.jpg",
      g: "linear-gradient(135deg,#3a1a10,#7a2f18)",
      versions: ["Final"],
      approved: false,
      comments: [],
    },
    {
      id: 4,
      name: "still_exterior",
      type: "photo",
      size: "20 MB",
      bgImage: "/images/project-files/the-gt3-build/4.jpg",
      g: "linear-gradient(135deg,#3a2208,#8a4f14)",
      versions: ["Final"],
      approved: false,
      comments: [],
    },
  ],
  4: [
    {
      id: 1,
      name: "launch_reel_30s",
      type: "video",
      size: "165 MB",
      tc: "0:30",
      bgImage: "/images/placeholder.jpg",
      g: "linear-gradient(135deg,#3a2208,#8a4f14)",
      versions: ["V1", "Final"],
      approved: true,
      comments: [],
    },
    {
      id: 2,
      name: "social_cutdown",
      type: "video",
      size: "88 MB",
      tc: "0:15",
      bgImage: "/images/placeholder.jpg",
      g: "linear-gradient(135deg,#1c2230,#38404e)",
      versions: ["Final"],
      approved: true,
      comments: [],
    },
    {
      id: 3,
      name: "product_still_01",
      type: "photo",
      size: "16 MB",
      bgImage: "/images/placeholder.jpg",
      g: "linear-gradient(135deg,#101a1c,#20403f)",
      versions: ["Final"],
      approved: true,
      comments: [],
    },
    {
      id: 4,
      name: "product_still_02",
      type: "photo",
      size: "15 MB",
      bgImage: "/images/placeholder.jpg",
      g: "linear-gradient(135deg,#3a1a10,#7a2f18)",
      versions: ["Final"],
      approved: false,
      comments: [],
    },
  ],
};

const COMPARISON_ROWS = [
  {
    feature: "Built for",
    cine: "Video",
    pixieset: "Photos",
    pictime: "Photos",
    shootproof: "Photos",
  },
  {
    feature: "Video on entry plan",
    cine: "100 GB · hundreds of films",
    pixieset: "30 min",
    pictime: "Minimal",
    shootproof: "Minimal",
  },
  {
    feature: "Review, comment & approve",
    cine: true,
    pixieset: "Photos only",
    pictime: "Photos only",
    shootproof: "Photos only",
  },
  {
    feature: "WhatsApp delivery",
    cine: true,
    pixieset: "—",
    pictime: "—",
    shootproof: "—",
  },
  {
    feature: "Arabic + English",
    cine: true,
    pixieset: "—",
    pictime: "—",
    shootproof: "—",
  },
  {
    feature: "Priced in AED",
    cine: true,
    pixieset: "—",
    pictime: "—",
    shootproof: "—",
  },
  {
    feature: "Starts at",
    cine: "AED 39/mo",
    pixieset: "$10/mo",
    pictime: "$8/mo",
    shootproof: "$10/mo",
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

export default function CineSpaceApp() {
  // Which project Client view previews
  // 1 = Omakase Teaser
  // 2 = Aisha & Omar
  // 3 = GT3 Build Film
  // 4 = Launch Reel.
  const CLIENT_VIEW_PROJECT_ID = 3;

  const [surface, setSurface] = useState("public");
  const [pubTab, setPubTab] = useState("work");
  const [beTab, setBeTab] = useState("projects");
  const [openProj, setOpenProj] = useState(null);
  const [projects, setProjects] = useState(SEED);
  const [selId, setSelId] = useState(CLIENT_VIEW_PROJECT_ID);
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", client: "" });
  const [ver, setVer] = useState("Final");
  const [accent, setAccent] = useState("#F5551D");
  const [tpl, setTpl] = useState("Grid");
  const [brandName, setBrandName] = useState("Pedro Concreato");
  const [faqOpen, setFaqOpen] = useState(0);
  const [billing, setBilling] = useState("monthly");
  const [reply, setReply] = useState("");
  const [pinnedId, setPinnedId] = useState(1);
  const [assetTab, setAssetTab] = useState("all");
  const [openAsset, setOpenAsset] = useState(null);
  const [assetVer, setAssetVer] = useState("V1");
  const [assetDraft, setAssetDraft] = useState("");
  const [projectFiles, setProjectFiles] = useState(() => ({
    ...PROJECT_FILES,
  }));
  const [bio, setBio] = useState(
    "Filmmaker & creative director based between Dubai and Sharjah. I make brand films, weddings, and launch content for the Gulf — story first, craft you don't notice.",
  );
  const [draft, setDraft] = useState("");
  const [comments, setComments] = useState([
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
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [surface]);

  const flash = (m) => {
    setToast(m);
    setTimeout(() => setToast(null), 2100);
  };
  const selAssets = projectFiles[selId] || [];
  const approvedCount = selAssets.filter((a) => a.approved).length;

  // Toggle a single asset's approval on/off, so the client can approve
  // and — if they change their mind — cancel that approval again.
  const toggleAssetApproval = (id) => {
    const current = (projectFiles[selId] || []).find((a) => a.id === id);
    const nextApproved = current ? !current.approved : true;
    setProjectFiles((pf) => ({
      ...pf,
      [selId]: (pf[selId] || []).map((a) =>
        a.id === id ? { ...a, approved: nextApproved } : a,
      ),
    }));
    flash(nextApproved ? "Asset approved" : "Approval removed");
  };
  const approveAll = () => {
    setProjectFiles((pf) => ({
      ...pf,
      [selId]: (pf[selId] || []).map((a) => ({ ...a, approved: true })),
    }));
    flash("Project approved");
  };
  const addAssetComment = (id) => {
    if (!assetDraft.trim()) return;
    setProjectFiles((pf) => ({
      ...pf,
      [selId]: (pf[selId] || []).map((a) =>
        a.id === id
          ? {
              ...a,
              comments: [
                ...a.comments,
                { who: "client", meta: "You · just now", text: assetDraft },
              ],
            }
          : a,
      ),
    }));
    setAssetDraft("");
  };
  const sel = projects.find((p) => p.id === selId) || projects[0];
  const pinned = projects.find((p) => p.id === pinnedId) || projects[0];
  const editProject = (id, f, v) =>
    setProjects(projects.map((p) => (p.id === id ? { ...p, [f]: v } : p)));
  const addProject = () => {
    if (!form.title.trim()) return;
    const newId = Date.now();
    setProjects([
      {
        id: newId,
        title: form.title.trim(),
        client: form.client.trim() || "Unassigned",
        type: "film",
        status: "draft",
        tc: "00:00",
        delivered: "—",
        location: "—",
        totalSize: "0 GB",
        bgImage: "/images/placeholder.jpg",
        g: "linear-gradient(135deg,#1a2028,#2a3742)",
        desc: "",
      },
      ...projects,
    ]);
    setProjectFiles((pf) => ({ ...pf, [newId]: [] }));
    setForm({ title: "", client: "" });
    setShowAdd(false);
    flash("Project created");
  };
  const approve = () => {
    setProjects(
      projects.map((p) =>
        p.id === sel.id ? { ...p, status: "delivered" } : p,
      ),
    );
    flash("Approved — locked & filmmaker notified");
  };
  const addComment = (who, txt, clear) => {
    if (!txt.trim()) return;
    setComments([
      ...comments,
      { who, meta: "You · just now", text: txt.trim() },
    ]);
    clear();
  };

  const Status = ({ s }) => (
    <span className="status">
      <span className="dot" style={{ background: STATUS[s].c }} />
      {STATUS[s].l}
    </span>
  );
  const Comment = ({ c }) => (
    <div className="cmt">
      <div
        className="cav"
        style={{
          background:
            c.who === "me"
              ? "linear-gradient(140deg,var(--orange),var(--orange2))"
              : "var(--bg3)",
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
  const Card = ({ p, onClick, showStatus }) => (
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
    <div className="root">
      <div className="switcher">
        <span className="lbl">Preview</span>
        <div className="seg">
          {[
            ["website", "CineSpace website"],
            ["public", "Public page"],
            ["backend", "Backend"],
            ["client", "Client view"],
          ].map(([k, l]) => (
            <button
              key={k}
              className={surface === k ? "on" : ""}
              onClick={() => setSurface(k)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ===================== CineSpace WEBSITE ===================== */}
      {surface === "website" && (
        <div className="wrap anim-in">
          <nav className="topnav">
            <img className="logo-img" src={LOGO_SRC} alt="CineSpace" />
            <div className="navlinks">
              <a>Features</a>
              <a>How it works</a>
              <a>Pricing</a>
              <a>Login</a>
            </div>
            <button className="btn sm" onClick={() => setSurface("backend")}>
              Get started
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
              Deliver films
              <br />
              like a studio.
            </h1>
            <p>
              Your portfolio, client review, and delivery — in one place, built
              for filmmakers in the Gulf.
            </p>
            <div className="row">
              <button
                className="btn dark"
                onClick={() => setSurface("backend")}
              >
                Start free trial <ArrowRight size={16} />
              </button>
              <button
                className="btn ghost"
                style={{ borderColor: "rgba(26,12,4,.3)", color: "#160A03" }}
                onClick={() => setSurface("client")}
              >
                See a delivery
              </button>
            </div>
          </header>
          <div className="trust">
            <b>Trusted by</b> Lost in Tokyo · Clean Performance · Prestige
            Rentals · Seen Couture
          </div>

          <section className="section reveal">
            <div className="eyebrow" style={{ textAlign: "center" }}>
              Everything you send clients
            </div>
            <div className="feats">
              <div className="feat">
                <div className="ic">
                  <ImageIcon size={20} />
                </div>
                <h3>A portfolio that sells</h3>
                <p>
                  A clean, branded page for your best work — your shop window,
                  always up to date.
                </p>
              </div>
              <div className="feat">
                <div className="ic">
                  <MessageCircle size={20} />
                </div>
                <h3>Review & approve</h3>
                <p>
                  Clients watch, comment, and approve each cut. Every version
                  tracked, every sign-off locked.
                </p>
              </div>
              <div className="feat">
                <div className="ic">
                  <Send size={20} />
                </div>
                <h3>Deliver on WhatsApp</h3>
                <p>
                  Send private links your clients open in one tap — no accounts,
                  no friction.
                </p>
              </div>
            </div>
          </section>

          <section className="section reveal">
            <h2 className="sec-h disp">How it works</h2>
            <p className="sec-sub">From footage to sign-off in three steps.</p>
            <div className="steps">
              <div className="step">
                <div className="n">01</div>
                <h3>Upload your cut</h3>
                <p>
                  Drop in a film. We handle the hosting, transcoding, and smooth
                  playback.
                </p>
              </div>
              <div className="step">
                <div className="n">02</div>
                <h3>Share a private link</h3>
                <p>
                  Send it on WhatsApp. Your client opens it instantly — no
                  login, no app.
                </p>
              </div>
              <div className="step">
                <div className="n">03</div>
                <h3>Get approved & paid</h3>
                <p>
                  Clients comment and approve the final cut, and you deliver the
                  finished files.
                </p>
              </div>
            </div>
          </section>

          <section className="featsec reveal">
            <div className="fs-text">
              <div className="eyebrow">Feature 01</div>
              <h2 className="disp">A portfolio that sells.</h2>
              <p>
                Your best work, always ready to share. A clean, branded page you
                can send to any lead in a tap — no PDFs, no WeTransfer links, no
                clutter.
              </p>
            </div>
            <div className="fs-visual">
              <div className="mini-grid">
                <div
                  className="mini-tile"
                  style={{
                    background: "linear-gradient(135deg,#3a1a10,#7a2f18)",
                  }}
                >
                  <Play size={14} />
                </div>
                <div
                  className="mini-tile"
                  style={{
                    background: "linear-gradient(135deg,#1c2230,#38404e)",
                  }}
                >
                  <Play size={14} />
                </div>
                <div
                  className="mini-tile"
                  style={{
                    background: "linear-gradient(135deg,#101a1c,#20403f)",
                  }}
                >
                  <Play size={14} />
                </div>
                <div
                  className="mini-tile"
                  style={{
                    background: "linear-gradient(135deg,#3a2208,#8a4f14)",
                  }}
                >
                  <Play size={14} />
                </div>
              </div>
            </div>
          </section>
          <section className="featsec rev reveal">
            <div className="fs-text">
              <div className="eyebrow">Feature 02</div>
              <h2 className="disp">Review &amp; approve.</h2>
              <p>
                Feedback without the chaos. Clients watch each cut, leave notes,
                and compare versions — and every approval is timestamped and
                locks that version.
              </p>
            </div>
            <div className="fs-visual">
              <div
                className="mini-player"
                style={{
                  background: "linear-gradient(135deg,#2b1a1f,#4a2530)",
                }}
              >
                <div className="mini-play">
                  <Play size={16} />
                </div>
                <span className="mini-seal">
                  <Check size={11} />
                  Approved
                </span>
              </div>
              <div className="mini-chips">
                <span>V1</span>
                <span>V2</span>
                <span className="on">Final</span>
              </div>
            </div>
          </section>
          <section className="featsec reveal">
            <div className="fs-text">
              <div className="eyebrow">Feature 03</div>
              <h2 className="disp">Deliver on WhatsApp.</h2>
              <p>
                Meet clients where they already are. Send a private link over
                WhatsApp — they open it in one tap, no account, no app. You're
                notified the moment they comment or approve.
              </p>
            </div>
            <div className="fs-visual">
              <div className="wa">
                <div className="wa-bubble">
                  Your final cut is ready 🎬
                  <div className="wa-link">cinespace.film/aisha-omar</div>
                </div>
                <div className="wa-meta">
                  <Check size={11} /> Delivered · opened just now
                </div>
              </div>
            </div>
          </section>
          <section className="showcase reveal">
            <div>
              <div className="eyebrow">The client experience</div>
              <h2 className="disp" style={{ marginTop: 10 }}>
                A screening room with your name on it.
              </h2>
              <p>
                Clients get a clean, branded page — versions side by side,
                comments in one place, and a single tap to approve. No clutter,
                no confusion.
              </p>
              <button
                className="btn sm"
                style={{ marginTop: 20 }}
                onClick={() => setSurface("client")}
              >
                See client view <ArrowRight size={15} />
              </button>
            </div>
            <div
              className="mini-stage"
              style={{
                backgroundImage: `linear-gradient(rgba(10,10,11,.22),rgba(10,10,11,.58)), url(${IMG_SHOW})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="play">
                <Play size={18} />
              </div>
              <span className="seal2">
                <Check size={12} />
                Approved
              </span>
            </div>
          </section>

          <section className="quote reveal">
            <p className="disp">
              "CineSpace replaced three tools. My clients approve faster, and
              every page looks like it came from a real studio."
            </p>
            <div className="by">— A filmmaker in Dubai</div>
          </section>

          <section className="section reveal">
            <h2 className="sec-h disp">Simple pricing</h2>
            <p className="sec-sub">
              Priced in AED · 7-day free trial · cancel anytime.
            </p>
            <div className="billtoggle">
              <button
                className={billing === "monthly" ? "on" : ""}
                onClick={() => setBilling("monthly")}
              >
                Monthly
              </button>
              <button
                className={billing === "yearly" ? "on" : ""}
                onClick={() => setBilling("yearly")}
              >
                Yearly <span>Save 20%</span>
              </button>
            </div>
            <div className="plans">
              {[
                {
                  n: "Solo",
                  p: "39",
                  pop: false,
                  f: [
                    "75 GB video hosting",
                    "Unlimited client links",
                    "WhatsApp delivery",
                    "Your own branding",
                  ],
                },
                {
                  n: "Studio",
                  p: "99",
                  pop: true,
                  f: [
                    "500 GB hosting",
                    "Versions & approvals",
                    "Custom domain",
                    "Arabic + English",
                  ],
                },
                {
                  n: "Agency",
                  p: "199",
                  pop: false,
                  f: [
                    "2 TB hosting",
                    "Team seats",
                    "White-label delivery",
                    "Priority support",
                  ],
                },
              ].map((pl) => (
                <div key={pl.n} className={`plan ${pl.pop ? "pop" : ""}`}>
                  {pl.pop && <span className="tag">Most popular</span>}
                  <div className="pname disp">{pl.n}</div>
                  <div className="price disp">
                    AED{" "}
                    {billing === "yearly"
                      ? Math.round(Number(pl.p) * 0.8)
                      : pl.p}
                    <small> /mo</small>
                  </div>
                  {billing === "yearly" && (
                    <div className="billnote">billed yearly · save 20%</div>
                  )}
                  <ul>
                    {pl.f.map((x, i) => (
                      <li key={i}>
                        <Check size={15} />
                        {x}
                      </li>
                    ))}
                  </ul>
                  <button
                    className="btn"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      marginTop: 20,
                      ...(pl.pop
                        ? {}
                        : {
                            background: "transparent",
                            border: "1px solid var(--line2)",
                            color: "var(--ink)",
                          }),
                    }}
                    onClick={() => setSurface("backend")}
                  >
                    Choose {pl.n}
                  </button>
                </div>
              ))}
            </div>

            <div className="cmp-wrap">
              <h3 className="cmp-title">How we compare</h3>

              <div className="cmp-scroll">
                <table className="cmp">
                  <thead>
                    <tr>
                      <th></th>
                      <th className="me">CineSpace</th>
                      <th>Pixieset</th>
                      <th>Pic-Time</th>
                      <th>ShootProof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_ROWS.map((row) => (
                      <tr key={row.feature}>
                        <td>{row.feature}</td>
                        <td className="me">
                          {row.cine === true ? <Check size={18} /> : row.cine}
                        </td>
                        <td>{row.pixieset}</td>
                        <td>{row.pictime}</td>
                        <td>{row.shootproof}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="cmp-note">
                Based on competitors' public 2026 plans — they cap video at 30
                min–2 hrs even at their top tiers.
              </p>
            </div>
          </section>

          <section className="section reveal">
            <h2 className="sec-h disp">Questions</h2>
            <div className="faq">
              {FAQS.map((f, i) => (
                <div className="faqi" key={i}>
                  <button
                    className="faqq"
                    onClick={() => setFaqOpen(faqOpen === i ? -1 : i)}
                  >
                    {f.q}
                    <ChevronDown
                      size={18}
                      style={{
                        transform: faqOpen === i ? "rotate(180deg)" : "none",
                      }}
                    />
                  </button>
                  {faqOpen === i && <div className="faqa">{f.a}</div>}
                </div>
              ))}
            </div>
          </section>

          <section
            className="cta reveal"
            style={{
              backgroundImage: `linear-gradient(rgba(245,85,29,.72),rgba(122,33,9,.90)), url(${IMG_CTA})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="grain" />
            <h2 className="disp">
              Start delivering
              <br />
              like a studio.
            </h2>
            <button
              className="btn dark"
              style={{ marginTop: 24 }}
              onClick={() => setSurface("backend")}
            >
              Get started <ArrowRight size={16} />
            </button>
          </section>
          <div className="foot">
            <span>© CineSpace — for filmmakers</span>
            <span>Dubai · Sharjah</span>
          </div>
        </div>
      )}

      {/* ===================== FILMMAKER PUBLIC PAGE ===================== */}
      {surface === "public" && (
        <div className="wrap anim-in">
          <nav className="topnav pubnav">
            <span className="logo">
              Pedro Concreato<span className="d">.</span>
            </span>
            <div className="navlinks">
              <button
                className={pubTab === "work" ? "on" : ""}
                onClick={() => setPubTab("work")}
              >
                Work
              </button>
              <button
                className={pubTab === "portfolio" ? "on" : ""}
                onClick={() => setPubTab("portfolio")}
              >
                Portfolio
              </button>
            </div>
            <button
              className="btn sm"
              onClick={() => flash("Opening WhatsApp…")}
            >
              Get in touch
            </button>
          </nav>

          {pubTab === "work" && (
            <>
              <div className="pinned" style={{ background: pinned.g }}>
                <span className="pin-tag">
                  <Star size={11} />
                  Featured
                </span>
                <div className="pin-play">
                  <div className="bigplay" onClick={() => flash("Playing…")}>
                    <Play size={24} />
                  </div>
                </div>
                <div className="pin-meta">
                  <h2 className="disp">{pinned.title}</h2>
                  <p>{pinned.desc}</p>
                </div>
                <span className="pin-tc">{pinned.tc}</span>
              </div>
              <div className="about-me">
                <div className="am-photos">
                  <div
                    className="am-portrait"
                    style={{ backgroundImage: `url(${IMG_ABOUT})` }}
                  />
                </div>
                <div className="am-text">
                  <div className="eyebrow">About</div>
                  <h2 className="disp">{brandName}</h2>
                  <p>
                    Pedro Concreato is a filmmaker and creative director based
                    between Dubai and Sharjah. Over six years he's shot brand
                    films, weddings, and launch content across the Gulf — story
                    first, craft you don't notice. He shoots, directs, and
                    grades his own work, and cares as much about how a film is
                    delivered as how it's made.
                  </p>
                  <div className="am-stats">
                    <div>
                      <b className="disp">80+</b>
                      <span>Films delivered</span>
                    </div>
                    <div>
                      <b className="disp">6 yrs</b>
                      <span>Behind the lens</span>
                    </div>
                    <div>
                      <b className="disp">UAE</b>
                      <span>Based</span>
                    </div>
                  </div>
                  <button
                    className="btn sm"
                    onClick={() => flash("Opening WhatsApp…")}
                  >
                    Work with me
                  </button>
                </div>
              </div>
              <div className="sectitle disp">Selected work</div>
              <div className="grid">
                {projects.map((p) => (
                  <Card
                    key={p.id}
                    p={p}
                    onClick={() => flash("Playing " + p.title + "…")}
                  />
                ))}
              </div>
              <div
                className="endband"
                style={{
                  backgroundImage: `linear-gradient(90deg, rgba(10,10,11,.90), rgba(10,10,11,.45) 65%, rgba(10,10,11,.12)), url(${IMG_SHOW})`,
                }}
              >
                <div className="eb-inner">
                  <h2 className="disp">Every frame, considered.</h2>
                  <p>
                    Brand films, weddings, and launch content — made across the
                    Gulf.
                  </p>
                  <button
                    className="btn sm"
                    onClick={() => flash("Opening WhatsApp…")}
                  >
                    Start a project
                  </button>
                </div>
              </div>
              <div className="foot">
                <span>© Pedro Concreato — Films</span>
                <span>Made with CineSpace</span>
              </div>
            </>
          )}

          {pubTab === "portfolio" && (
            <>
              <div className="pf">
                <div className="grain" />
                <div className="pf-head">
                  <div className="pfname disp">Pedro Concreato</div>
                  <div
                    className="pf-avatar"
                    style={{ backgroundImage: `url(${IMG_ABOUT})` }}
                  />
                </div>
                <div className="pfbio">{bio}</div>
                <div className="pfmeta">
                  <div>
                    <b className="disp">80+</b>
                    <span>Films delivered</span>
                  </div>
                  <div>
                    <b className="disp">6 yrs</b>
                    <span>Behind the lens</span>
                  </div>
                  <div>
                    <b className="disp">UAE</b>
                    <span>Based</span>
                  </div>
                </div>
                <div className="pfrow">
                  <button
                    className="btn sm"
                    onClick={() => flash("Opening WhatsApp…")}
                  >
                    Get in touch
                  </button>
                  <button
                    className="btn ghost sm"
                    onClick={() => flash("Portfolio link copied")}
                  >
                    <Share2 size={15} />
                    Share
                  </button>
                </div>
              </div>
              <div className="sectitle disp">Latest films</div>
              <div className="grid">
                {projects
                  .filter((p) => p.status === "delivered")
                  .map((p) => (
                    <Card
                      key={p.id}
                      p={p}
                      onClick={() => flash("Playing " + p.title + "…")}
                    />
                  ))}
              </div>
              <div className="foot">
                <span>© Pedro Concreato — Films</span>
                <span>Made with CineSpace</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===================== FILMMAKER BACKEND (PRIVATE) ===================== */}
      {surface === "backend" && (
        <div className="wrap anim-in">
          <div className="appbar">
            <img className="logo-img" src={LOGO_SRC} alt="CineSpace" />
            <span className="pill-demo">Backend · private</span>
            <div className="who">
              <span>Pedro Concreato</span>
              <span className="avatar">PC</span>
            </div>
          </div>

          {openProj ? (
            (() => {
              const p = projects.find((x) => x.id === openProj) || projects[0];
              return (
                <>
                  <button
                    className="backlink"
                    onClick={() => setOpenProj(null)}
                  >
                    <ArrowLeft size={15} />
                    Projects
                  </button>
                  <div className="pagehead">
                    <div>
                      <div className="eyebrow">Editing project</div>
                      <h1 className="disp">{p.title}</h1>
                      <div style={{ marginTop: 8 }}>
                        <Status s={p.status} />
                      </div>
                    </div>
                    <button
                      className="btn ghost"
                      onClick={() => flash("Client link copied")}
                    >
                      <Link2 size={15} />
                      Client link
                    </button>
                  </div>
                  <div className="stage-wrap">
                    <div className="stage" style={{ background: p.g }}>
                      <span className="stage-title disp">{p.title}</span>
                      <div
                        className="bigplay"
                        onClick={() => flash("Playing preview…")}
                      >
                        <Play size={24} />
                      </div>
                      <span className="stage-tc">00:00 / {p.tc}</span>
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
                      <span className="vchip">
                        <Clock
                          size={12}
                          style={{ marginRight: 5, verticalAlign: -1 }}
                        />
                        Updated 2d ago
                      </span>
                    </div>
                  </div>
                  <div className="dactions">
                    <button
                      className="btn"
                      onClick={() => flash("Sent to client on WhatsApp")}
                    >
                      <MessageCircle size={15} />
                      Send to client
                    </button>
                    <button
                      className="btn ghost"
                      onClick={() => flash("New version uploaded")}
                    >
                      <Upload size={15} />
                      Upload version
                    </button>
                  </div>
                  <div className="panel">
                    <h4>Project details</h4>
                    <div className="field2">
                      <label>Title</label>
                      <input
                        value={p.title}
                        onChange={(e) =>
                          editProject(p.id, "title", e.target.value)
                        }
                      />
                    </div>
                    <div className="field2" style={{ marginTop: 14 }}>
                      <label>Client</label>
                      <input
                        value={p.client}
                        onChange={(e) =>
                          editProject(p.id, "client", e.target.value)
                        }
                      />
                    </div>
                    <div className="field2" style={{ marginTop: 14 }}>
                      <label>Description (shows on your public page)</label>
                      <textarea
                        rows={2}
                        value={p.desc}
                        onChange={(e) =>
                          editProject(p.id, "desc", e.target.value)
                        }
                        placeholder="A short line about this project…"
                      />
                    </div>
                  </div>
                  <div className="cmts">
                    <h4>Client comments</h4>
                    {comments.map((c, i) => (
                      <Comment key={i} c={c} />
                    ))}
                    <div className="cinput">
                      <input
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Reply to your client…"
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          addComment("me", reply, () => setReply(""))
                        }
                      />
                      <button
                        onClick={() =>
                          addComment("me", reply, () => setReply(""))
                        }
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                </>
              );
            })()
          ) : (
            <>
              <div className="tabs">
                {[
                  ["projects", "Projects"],
                  ["mypage", "My page"],
                  ["customize", "Customize"],
                ].map(([k, l]) => (
                  <button
                    key={k}
                    className={`tab ${beTab === k ? "on" : ""}`}
                    onClick={() => setBeTab(k)}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {beTab === "projects" && (
                <>
                  <div className="pagehead">
                    <div>
                      <div className="eyebrow">Private workspace</div>
                      <h1 className="disp">Your projects</h1>
                      <p>
                        Create a project, upload cuts, send the delivery link to
                        your client, and follow up on comments and approvals.
                        Tap a project to open it.
                      </p>
                    </div>
                    <button className="btn" onClick={() => setShowAdd(true)}>
                      <Plus size={16} />
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
                          setOpenProj(p.id);
                          setSelId(p.id);
                        }}
                      />
                    ))}
                  </div>
                </>
              )}

              {beTab === "mypage" && (
                <>
                  <div className="pagehead">
                    <div>
                      <div className="eyebrow">Your public page</div>
                      <h1 className="disp">My page</h1>
                      <p>
                        Manage the work potential clients see when they visit
                        your public Work and Portfolio pages.
                      </p>
                    </div>
                    <button
                      className="btn"
                      onClick={() => flash("Upload started")}
                    >
                      <Upload size={16} />
                      Upload work
                    </button>
                  </div>
                  <div className="panel">
                    <h4>Featured on your Work page</h4>
                    <div className="featrow">
                      {projects.map((p) => (
                        <div
                          key={p.id}
                          className={`featpick ${pinnedId === p.id ? "on" : ""}`}
                          onClick={() => {
                            setPinnedId(p.id);
                            flash("Featured updated");
                          }}
                          style={{ background: p.g }}
                        >
                          {pinnedId === p.id && (
                            <span className="featbadge">
                              <Star size={10} />
                              Featured
                            </span>
                          )}
                          <span className="featname">{p.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="panel">
                    <h4>Portfolio work — shown to visitors</h4>
                    <div className="grid">
                      {projects
                        .filter((p) => p.status === "delivered")
                        .map((p) => (
                          <Card
                            key={p.id}
                            p={p}
                            onClick={() => flash("Editing " + p.title)}
                          />
                        ))}
                    </div>
                  </div>
                  <div className="panel">
                    <h4>About &amp; bio</h4>
                    <div className="field2">
                      <textarea
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                      />
                    </div>
                    <button
                      className="btn sm"
                      style={{ marginTop: 14 }}
                      onClick={() => flash("Saved to your public page")}
                    >
                      <Check size={15} />
                      Save
                    </button>
                  </div>
                </>
              )}

              {beTab === "customize" && (
                <div style={{ "--acc": accent }}>
                  <div className="pagehead">
                    <div>
                      <div className="eyebrow">Branding</div>
                      <h1 className="disp">Customize</h1>
                      <p>
                        Set how your public portfolio and client pages look.
                        Your accent, not ours.
                      </p>
                    </div>
                  </div>
                  <div className="panel">
                    <h4>Brand name</h4>
                    <div className="field2">
                      <input
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="panel">
                    <h4>Accent colour</h4>
                    <div className="swatches">
                      {ACCENTS.map((c) => (
                        <div
                          key={c}
                          className={`sw ${accent === c ? "on" : ""}`}
                          style={{ background: c }}
                          onClick={() => setAccent(c)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="panel">
                    <h4>Layout</h4>
                    <div className="tpls">
                      {["Grid", "Feed", "Minimal"].map((t) => (
                        <div
                          key={t}
                          className={`tpl ${tpl === t ? "on" : ""}`}
                          onClick={() => setTpl(t)}
                        >
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="cpreview">
                    <div className="bar" />
                    <div className="nm disp">
                      {brandName || "Your name"}
                      <span>.</span>
                    </div>
                    <div className="pv">Live preview · {tpl} layout</div>
                    <span className="chip">Get in touch</span>
                  </div>
                  <button
                    className="btn"
                    style={{ marginTop: 18 }}
                    onClick={() => flash("Branding saved")}
                  >
                    <Check size={15} />
                    Save changes
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===================== CLIENT VIEW ===================== */}
      {surface === "client" && (
        <div className="wrap anim-in">
          <div className="clienthead">
            <span className="brand disp">
              Pedro Concreato<span style={{ color: "var(--orange)" }}>.</span>
            </span>
            <span className="lockpill">
              <Lock size={13} /> Private · expires in 30 days
            </span>
          </div>

          <div
            className="dhero"
            style={{
              backgroundImage: `url(${sel.bgImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          >
            <div className="dhero-inner">
              <div className="eyebrow">Delivery for {sel.client}</div>
              <h1 className="dhero-title disp">{sel.title}</h1>
              <div className="dmeta">
                <div>
                  <span>DELIVERED</span>
                  <b>{sel.delivered}</b>
                </div>
                <div>
                  <span>LOCATION</span>
                  <b>{sel.location}</b>
                </div>
                <div>
                  <span>TOTAL SIZE</span>
                  <b style={{ color: "var(--orange)" }}>{sel.totalSize}</b>
                </div>
                <div>
                  <span>ASSETS</span>
                  <b>{selAssets.length}</b>
                </div>
                {/* <div>
                  <span>Approved</span>
                  <b className="acc">
                    {approvedCount}/{selAssets.length}
                  </b>
                </div> */}
              </div>
              <button
                className="btn sm"
                style={{ marginTop: 22 }}
                onClick={() => flash("Preparing download…")}
              >
                <Download size={15} />
                Download all
              </button>
            </div>
          </div>

          <div className="dbar">
            <div className="dbar-l">
              <div className="dbar-prog">
                <div
                  className="dbar-fill"
                  style={{
                    width: `${selAssets.length ? Math.round((approvedCount / selAssets.length) * 100) : 0}%`,
                  }}
                />
              </div>
              <span>
                {approvedCount} of {selAssets.length} assets approved
              </span>
            </div>
            <div className="dbar-r">
              <button
                className="btn ghost sm"
                onClick={() => flash("Opening WhatsApp…")}
              >
                <MessageCircle size={15} />
                Message Pedro
              </button>
              {selAssets.length > 0 && approvedCount === selAssets.length ? (
                <span className="seal">
                  <Check size={14} />
                  Project approved
                </span>
              ) : (
                <button className="btn sm" onClick={approveAll}>
                  <Check size={15} />
                  Approve all
                </button>
              )}
            </div>
          </div>

          <div className="dlib">
            <div className="eyebrow">Asset library</div>
            <h2 className="dlib-h disp">Project files</h2>
            <div className="dtabs">
              {[
                ["all", "All"],
                ["video", "Videos"],
                ["photo", "Photos"],
              ].map(([k, l]) => (
                <button
                  key={k}
                  className={assetTab === k ? "on" : ""}
                  onClick={() => setAssetTab(k)}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="dgrid">
              {selAssets
                .filter((a) => assetTab === "all" || a.type === assetTab)
                .map((a) => (
                  <div
                    key={a.id}
                    className="acard"
                    onClick={() => {
                      setOpenAsset(a.id);
                      setAssetVer(a.versions[a.versions.length - 1]);
                    }}
                  >
                    <div
                      className="acard-th"
                      style={{
                        backgroundImage: `linear-gradient(160deg, rgba(10,10,11,.15), rgba(10,10,11,.62)), url(${a.bgImage})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      <span className="acard-type">
                        {a.type === "video" ? (
                          <Play size={13} />
                        ) : (
                          <ImageIcon size={13} />
                        )}
                      </span>
                      {a.approved && (
                        <span className="acard-appr">
                          <Check size={12} />
                        </span>
                      )}
                      {a.type === "video" && (
                        <span className="acard-tc">{a.tc}</span>
                      )}
                    </div>
                    <div className="acard-meta">
                      <span className="acard-name">{a.name}</span>
                      <span className="acard-sub">
                        <span className="acc">{a.size}</span>
                        {a.comments.length > 0 && (
                          <span className="acard-cc">
                            <MessageCircle size={11} />
                            {a.comments.length}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              {selAssets.length === 0 && (
                <p className="cmt-empty">
                  No files uploaded to this project yet.
                </p>
              )}
            </div>
          </div>

          <div className="foot">
            <span>Delivered with CineSpace</span>
            <span>cinespace.film</span>
          </div>

          {openAsset !== null &&
            (() => {
              const a = selAssets.find((x) => x.id === openAsset);
              if (!a) return null;
              return (
                <div className="overlay" onClick={() => setOpenAsset(null)}>
                  <div className="asheet" onClick={(e) => e.stopPropagation()}>
                    <div className="asheet-head">
                      <div>
                        <div className="eyebrow">
                          {a.type === "video" ? "Video" : "Photo"} · {a.size}
                        </div>
                        <h3 className="disp">{a.name}</h3>
                      </div>
                      <button
                        className="btn ghost sm"
                        style={{ padding: 8 }}
                        onClick={() => setOpenAsset(null)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div
                      className="astage"
                      style={{
                        backgroundImage: `linear-gradient(160deg, rgba(10,10,11,.10), rgba(10,10,11,.55)), url(${a.bgImage})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      {a.type === "video" && (
                        <div
                          className="bigplay"
                          onClick={() => flash("Playing…")}
                        >
                          <Play size={24} />
                        </div>
                      )}
                    </div>
                    {a.versions.length > 1 && (
                      <div className="vstrip">
                        {a.versions.map((v) => (
                          <button
                            key={v}
                            className={`vchip ${assetVer === v ? "on" : ""}`}
                            onClick={() => setAssetVer(v)}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="dactions">
                      <button
                        className="btn"
                        onClick={() => flash("Download started")}
                      >
                        <Download size={15} />
                        Download
                      </button>
                      {a.approved ? (
                        <button
                          className="btn ghost"
                          onClick={() => toggleAssetApproval(a.id)}
                        >
                          <Check size={15} />
                          Approved · cancel
                        </button>
                      ) : (
                        <button
                          className="btn ghost"
                          onClick={() => toggleAssetApproval(a.id)}
                        >
                          <Check size={15} />
                          Approve this asset
                        </button>
                      )}
                    </div>
                    <div className="cmts">
                      <h4>Comments on {a.name}</h4>
                      {a.comments.length === 0 && (
                        <p className="cmt-empty">
                          No comments yet — leave the first note.
                        </p>
                      )}
                      {a.comments.map((c, i) => (
                        <Comment key={i} c={c} />
                      ))}
                      <div className="cinput">
                        <input
                          value={assetDraft}
                          onChange={(e) => setAssetDraft(e.target.value)}
                          placeholder="Add a comment…"
                          onKeyDown={(e) =>
                            e.key === "Enter" && addAssetComment(a.id)
                          }
                        />
                        <button onClick={() => addAssetComment(a.id)}>
                          <Send size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
        </div>
      )}

      {showAdd && (
        <div className="overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 className="disp">New project</h3>
              <button
                className="btn ghost sm"
                style={{ padding: 8 }}
                onClick={() => setShowAdd(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="field">
              <label>Project title</label>
              <input
                autoFocus
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addProject()}
                placeholder="e.g. Rooftop Brand Film"
              />
            </div>
            <div className="field">
              <label>Client</label>
              <input
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addProject()}
                placeholder="e.g. Meydan Studio"
              />
            </div>
            <button
              className="btn"
              style={{ width: "100%", justifyContent: "center", marginTop: 22 }}
              onClick={addProject}
            >
              <Plus size={15} />
              Create project
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast">
          <Check size={15} />
          {toast}
        </div>
      )}
    </div>
  );
}
