"use client";

import React, { useState } from "react";
import {
  Play,
  Check,
  Download,
  MessageCircle,
  Lock,
  Image as ImageIcon,
  Clock,
  X,
  Send,
  Film,
} from "lucide-react";
import "./delivery-view.css";

const IMG_BG =
  "data:image/webp;base64,UklGRqoEAABXRUJQVlA4IJ4EAADwHQCdASohAEoBPslYo0wnpboiNFQMg0AZCWYIkIkB/K0XFDcvD8jzi7e3BA0P2VJx/1/pR+nfasPVBzwHtQ/yD1WrKWf66v7VbRIjpn0h/AGAhGBJpyqAx5NRu2WwH0ME/pKwEmFF5NxXpzVpcocvwINvw6YWIX8vhguXLuMxCPKjlG0LaV082xyzj8vM05mPdwpgxmGJF/+9pPaIaCNzxGjYlugqBCYZvIvaMfYo8oZAm2LMG+UeduWrUgjJyBRf1i9TpTW+XnT6f0GrgUaqeAyuHAhIQdLDJ0pX8iuikjCyow2CGnOhPA+GRRbsEqh/eF4YhtAB4AD+/d1ri/jxmv7j7Rfxy91eSvbWyuQM6D7j8FOUnkXvusVtLjlJKI67OkrPUjnReIbTwyN//UfJiQqQz+Z7FIVLCK+8L0mMYBOOqTdN4tfAibF3Wc3HKsYEDa5HtaMo7o5FJYWOrIxq9k2akz07OaKUZ2lMuF+mYWQCAZqu2RJZnmavvH3qGS/fLZS9TVfag+xd8uoqAQ5Wz5Ige+GfvIl09fQeomp3UycnfYtN8yvVDANE77YikMP+nZHnGeKgl67TTereq9KSQONfghHdWUMqPNGa4s+ze9oVOEF0brH1d4WeeAzE856AeRAZi2uuMg7XN7F6vwJBuDZ7VjOwEokUL1f84Ivcnnva9okDWOIPHiYHPnV/6CZ2ubY+Yy2t6V3bEOcBGj/L1byHy4dWhsUY49TPLe5ObIMmdQMn0/YLR5MAuiB/SG9yJMdgT2pgwjRR7su+tJ8K1WySbYMjxEUDMrqwMu5kQqD/+TwHF+JBOBIn1jTdv+rz5ooys1kdM2I2gATkQNr9AnFS8ZOjwaqoxojnXhXxCrpYUSPuBehxq82ZyRtkrUam+vQP5DLv06YiE+dZoCjXGBQNkw6me38SnSDFH2lWv31nNrBobebyzuepi6BWiD5dB9gb85QY8S66Qu4Wv2GGhS6ZHpmBgn0G+e1XsDh8x1wOkvN2Ld/AGTGkrcuHiFyNxPZusfyn7Sx53oLjo7qPlISGamb8wgd9xPFrun2XSFrOnli4imOul1an76SdwAgFzwPtfPoKflcTlVuBJ3xn2TnJb/2TtLtl+lKc5Cocr1RrSv6ioA6+kErUrTwCvwSrFg+11OsjP/N6Ns4CXoLyCicZ6P/+d2TeXx928TvcgdIPI1GOXA2Qkh1EtdAh+52AQgGKRR9szOgikpGs1+I/m51sgCq0qJC5D0pdLjox5IKBQhJwyQmtFc/I2BUUTjOO/j2dAVVoKGnrJBx+Wj9MfxVFrEOx4lg9g63OUInPdOhTZxbYHrg++ioQ9lOCyST+RJVmpLX2vhMpPUciKCvNx/TV9RAMrn7feMvhsgbzHn1YdIEaTH+ftqzIaz7yGnD+JXnfPRVtW8HsRtGriFJSfmIsxi+OKNoPhHrezX71IREwXqWaEYN1KS9pdbWHw9NCw4OYn/xYJaqWDXOefcikKnCjoZOwz3n5Hg+NKjG/UeTubQFSUZc1SVIGX3ql1a0qnWbuQBl6w2uce4FC7+0YU8yZAO12I7KYrpMAAAA=";

const LOGO_SRC = "/images/logo.svg";

const DELIVERY = {
  name: "Mercedes-AMG GT ",
  client: "Prestige Rentals",
  date: "02.21.26",
  location: "Dubai, UAE",
  size: "1.1 GB",
  cover:
    "url(/images/projects/mercedes-amg-gt/1.webp) center/cover no-repeat",
};

const DELIVERY_ASSETS = [
  {
    id: 1,
    name: "build_wide",
    type: "video",
    size: "312 MB",
    tc: "1:24",
    ar: 1.6,
    g: "url(/images/projects/mercedes-amg-gt/1.webp) center/cover no-repeat",
    versions: ["V1", "V2"],
    approved: false,
    comments: [
      {
        who: "client",
        meta: "Client · 2h ago",
        text: "Love the opening — can we punch the grade a touch?",
        time: 8,
      },
    ],
  },
  {
    id: 2,
    name: "build_vertical",
    type: "video",
    size: "298 MB",
    tc: "0:58",
    ar: 1.6,
    g: "url(/images/projects/mercedes-amg-gt/2.webp) center/cover no-repeat",
    versions: ["V1"],
    approved: true,
    comments: [],
  },
  {
    id: 3,
    name: "details_wide",
    type: "photo",
    size: "24 MB",
    ar: 1.6,
    g: "url(/images/projects/mercedes-amg-gt/3.webp) center/cover no-repeat",
    versions: ["Final"],
    approved: false,
    comments: [],
  },
  {
    id: 4,
    name: "details_vertical",
    type: "photo",
    size: "22 MB",
    ar: 1.6,
    g: "url(/images/projects/mercedes-amg-gt/4.webp) center/cover no-repeat",
    versions: ["Final"],
    approved: false,
    comments: [],
  },
  {
    id: 5,
    name: "rolling_wide",
    type: "video",
    size: "180 MB",
    tc: "1:02",
    ar: 1.6,
    g: "url(/images/projects/mercedes-amg-gt/5.webp) center/cover no-repeat",
    versions: ["V1", "V2", "Final"],
    approved: false,
    comments: [
      {
        who: "client",
        meta: "Client · 1d ago",
        text: "This is the hero shot 🔥",
        time: 34,
      },
    ],
  },
  {
    id: 6,
    name: "rolling_verticalvv",
    type: "video",
    size: "176 MB",
    tc: "0:47",
    ar: 1.6,
    g: "url(/images/projects/mercedes-amg-gt/6.webp) center/cover no-repeat",
    versions: ["V1"],
    approved: false,
    comments: [],
  },
];

export function DeliveryViewScreen() {
  const [assets, setAssets] = useState(DELIVERY_ASSETS);
  const [assetTab, setAssetTab] = useState("all");
  const [openAsset, setOpenAsset] = useState<number | null>(null);
  const [assetVer, setAssetVer] = useState("V1");
  const [playT, setPlayT] = useState(0);
  const [attachTime, setAttachTime] = useState(false);
  const [assetDraft, setAssetDraft] = useState("");
  const [replyKey, setReplyKey] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [clientView] = useState({
    size: "M",
    ratio: "mixed",
    scale: "fill",
    info: false,
  });
  const [accent] = useState("#F5551D");
  const [watermark] = useState(false);
  const brandName = "Pedro Concreato";
  const logo = null;

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2100);
  };

  const scrollTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const fmtT = (x: number) => {
    x = Math.max(0, Math.round(x));
    return Math.floor(x / 60) + ":" + String(x % 60).padStart(2, "0");
  };

  const parseTC = (tc: any) => {
    if (!tc || !("" + tc).includes(":")) return 0;
    const p = ("" + tc).split(":").map(Number);
    return p[0] * 60 + (p[1] || 0);
  };

  const scrubTo = (e: React.MouseEvent<HTMLDivElement>, dur: number) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    setPlayT(Math.max(0, Math.min(dur, x * dur)));
  };

  const AV_RATIO: Record<string, string> = {
    landscape: "16 / 10",
    square: "1 / 1",
    portrait: "3 / 4",
  };

  const lighten = (h: string, a = 0.3) => {
    const n = parseInt(h.slice(1), 16),
      R = (n >> 16) & 255,
      G = (n >> 8) & 255,
      B = n & 255,
      m = (x: number) =>
        Math.round(x + (255 - x) * a)
          .toString(16)
          .padStart(2, "0");
    return "#" + m(R) + m(G) + m(B);
  };

  const hexToRgb = (h: string) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  const darken = (rgb: number[], a = 0.28) => rgb.map((x) => Math.round(x * (1 - a)));

  const accentVars: React.CSSProperties = (() => {
    const base = /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : "#F5551D";
    const rgb = hexToRgb(base);
    const lt = hexToRgb(lighten(base, 0.28));
    const dk = darken(rgb, 0.28);
    return {
      "--orange": base,
      "--orange2": lighten(base, 0.28),
      "--acc": base,
      "--acc-rgb": rgb.join(","),
      "--acc2-rgb": lt.join(","),
      "--acc-dk-rgb": dk.join(","),
    } as React.CSSProperties;
  })();

  const thStyle = (a: any) => ({
    backgroundImage: a.g.match(/url\([^)]+\)/)?.[0] || "none",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize:
      clientView.ratio === "mixed"
        ? "cover"
        : clientView.scale === "fit"
          ? "contain"
          : "cover",
    backgroundColor: "var(--bg3)",
    aspectRatio:
      clientView.ratio === "mixed"
        ? a.ar
          ? String(a.ar)
          : a.type === "photo"
            ? "3 / 4"
            : "16 / 10"
        : AV_RATIO[clientView.ratio],
  });

  const approvedCount = assets.filter((a) => a.approved).length;

  const approveAsset = (id: number) => {
    setAssets((as) =>
      as.map((a) => (a.id === id ? { ...a, approved: true } : a))
    );
    flash("Asset approved");
  };

  const toggleApprove = (id: number) => {
    setAssets((as) =>
      as.map((a) => (a.id === id ? { ...a, approved: !a.approved } : a))
    );
  };

  const approveAll = () => {
    setAssets((as) => as.map((a) => ({ ...a, approved: true })));
    flash("Project approved");
  };

  const unapproveAll = () => {
    setAssets((as) => as.map((a) => ({ ...a, approved: false })));
  };

  const addAssetComment = (id: number) => {
    if (!assetDraft.trim()) return;
    setAssets((as) =>
      as.map((a) =>
        a.id === id
          ? {
              ...a,
              comments: [
                ...a.comments,
                {
                  who: "client" as const,
                  meta: "Client · just now",
                  text: assetDraft,
                  time:
                    attachTime && a.type === "video" ? Math.round(playT) : undefined,
                },
              ],
            }
          : a
      )
    );
    setAssetDraft("");
    flash("Comment added");
  };

  const addReply = (aid: number, idx: number, who: "client" | "me") => {
    if (!replyDraft.trim()) return;
    setAssets((as) =>
      as.map((a) => {
        if (a.id !== aid) return a;
        return {
          ...a,
          comments: a.comments.map((c, i) =>
            i === idx
              ? {
                  ...c,
                  replies: [
                    ...((c as any).replies || []),
                    {
                      who,
                      meta: who === "client" ? "Client · just now" : "Pedro · just now",
                      text: replyDraft,
                    },
                  ],
                }
              : c
          ),
        };
      })
    );
    setReplyDraft("");
    setReplyKey(null);
    flash("Reply added");
  };

  const Avatar = ({ who, sm }: { who: string; sm?: boolean }) => (
    <div
      className={"cav" + (sm ? " sm" : "")}
      style={{
        background:
          who === "me"
            ? "linear-gradient(140deg,var(--orange),var(--orange2))"
            : "var(--bg3)",
        color: who === "me" ? "#1a0c04" : "var(--ink)",
      }}
    >
      {who === "me" ? "PC" : "C"}
    </div>
  );

  const Comment = ({
    c,
    aid,
    idx,
    replyWho,
  }: {
    c: any;
    aid: number;
    idx: number;
    replyWho?: "client" | "me";
  }) => {
    const key = aid + ":" + idx;
    const open = replyKey === key;
    return (
      <div className="cmt">
        <Avatar who={c.who} />
        <div className="cbody">
          <div className="cmeta">
            {c.meta}
            {c.time != null && (
              <button className="tc-chip" onClick={() => setPlayT(c.time)}>
                <Clock size={11} />
                {fmtT(c.time)}
              </button>
            )}
          </div>
          <div className="ctext">{c.text}</div>
          {(c.replies || []).map((r: any, ri: number) => (
            <div key={ri} className="creply">
              <Avatar who={r.who} sm />
              <div>
                <div className="cmeta">{r.meta}</div>
                <div className="ctext">{r.text}</div>
              </div>
            </div>
          ))}
          {replyWho &&
            (open ? (
              <div className="cinput sm">
                <input
                  autoFocus
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  placeholder="Write a reply…"
                  onKeyDown={(e) =>
                    e.key === "Enter" && addReply(aid, idx, replyWho)
                  }
                />
                <button onClick={() => addReply(aid, idx, replyWho)}>
                  <Send size={14} />
                </button>
              </div>
            ) : (
              <button
                className="reply-btn"
                onClick={() => {
                  setReplyKey(key);
                  setReplyDraft("");
                }}
              >
                <MessageCircle size={12} />
                Reply
              </button>
            ))}
        </div>
      </div>
    );
  };

  const Wm = () =>
    watermark ? (
      <div className="wm">
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i}>{brandName || "CineSpace"}</span>
        ))}
      </div>
    ) : null;

  return (
    <div className="root" style={{ "--bg-lens": `url(${IMG_BG})` } as React.CSSProperties}>
      <div
        className="bgwrap"
        aria-hidden="true"
        style={accentVars}
      >
        <div className="bgimg" style={{ backgroundImage: `url(${IMG_BG})` }} />
        <div className="bgtint on" />
        <div className="bgveil" />
      </div>

      <div className="wrap anim-in" style={accentVars}>
        <div className="clienthead">
          {logo ? (
            <img className="brandlogo" src={logo} alt={brandName} />
          ) : (
            <span className="brand">
              {brandName}
              <span style={{ color: "var(--orange)" }}>.</span>
            </span>
          )}
          <span className="lockpill">
            <Lock size={13} /> Private · expires in 30 days
          </span>
        </div>

        <div className="dhero" style={{ background: DELIVERY.cover }}>
          <div className="dhero-inner">
            <div className="eyebrow">Delivery for {DELIVERY.client}</div>
            <h1 className="dhero-title disp">{DELIVERY.name}</h1>
            <div className="dmeta">
              <div>
                <span>Delivered</span>
                <b>{DELIVERY.date}</b>
              </div>
              <div>
                <span>Location</span>
                <b>{DELIVERY.location}</b>
              </div>
              <div>
                <span>Total size</span>
                <b className="acc">{DELIVERY.size}</b>
              </div>
              <div>
                <span>Assets</span>
                <b>{assets.length}</b>
              </div>
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
                  width: `${Math.round((approvedCount / assets.length) * 100)}%`,
                }}
              />
            </div>
            <span>
              {approvedCount} of {assets.length} assets approved
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
            {approvedCount === assets.length ? (
              <button
                className="btn sm seal-btn"
                onClick={unapproveAll}
                title="Tap to undo"
              >
                <Check size={14} />
                Project approved · undo
              </button>
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
          <div
            className="dtabs"
            style={{
              "--pill-n": 3,
              "--pill-i": { all: 0, video: 1, photo: 2 }[assetTab],
            } as React.CSSProperties}
          >
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
          <div
            className={
              clientView.ratio === "mixed"
                ? "dmason sz-" + clientView.size.toLowerCase()
                : "dgrid sz-" + clientView.size.toLowerCase()
            }
          >
            {assets
              .filter((a) => assetTab === "all" || a.type === assetTab)
              .map((a) => (
                <div
                  key={a.id}
                  className={
                    "acard" + (clientView.ratio === "mixed" ? " mason" : "")
                  }
                  onClick={() => {
                    setOpenAsset(a.id);
                    setAssetVer(a.versions[a.versions.length - 1]);
                  }}
                >
                  <div className="acard-th" style={thStyle(a)}>
                    <Wm />
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
                    {clientView.info && (
                      <div className="cinfo">
                        <div className="ci-title">{a.name}</div>
                        {(a as any).desc && <div className="ci-desc">{(a as any).desc}</div>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="foot">
          <img
            className="logo-img"
            src={LOGO_SRC}
            alt="CineSpace"
            onClick={scrollTop}
            style={{ cursor: "pointer" }}
          />
          <span className="foot-site-name">cinespace.pro</span>
        </div>

        {openAsset !== null &&
          (() => {
            const a = assets.find((x) => x.id === openAsset);
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
                  <div className="astage" style={{ background: a.g }}>
                    <Wm />
                    {a.type === "video" && (
                      <div
                        className="bigplay"
                        onClick={() => flash("Playing…")}
                      >
                        <Play size={24} />
                      </div>
                    )}
                  </div>
                  {a.type === "video" &&
                    (() => {
                      const dur = parseTC(a.tc) || 1;
                      const pct = Math.min(100, (playT / dur) * 100);
                      return (
                        <div style={{ marginTop: 12 }}>
                          <div className="scrub-time">
                            <b>{fmtT(playT)}</b>
                            <span>{a.tc}</span>
                          </div>
                          <div
                            className="scrub"
                            onClick={(e) => scrubTo(e, dur)}
                          >
                            <div className="scrub-track" />
                            <div
                              className="scrub-fill"
                              style={{ width: pct + "%" }}
                            />
                            {a.comments
                              .filter((c) => c.time != null)
                              .map((c, i) => (
                                <div
                                  key={i}
                                  className="scrub-mark"
                                  style={{ left: ((c.time || 0) / dur) * 100 + "%" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (c.time != null) setPlayT(c.time);
                                  }}
                                />
                              ))}
                            <div
                              className="scrub-head"
                              style={{ left: pct + "%" }}
                            />
                          </div>
                        </div>
                      );
                    })()}
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
                        className="btn seal-btn"
                        onClick={() => {
                          toggleApprove(a.id);
                          flash("Approval removed");
                        }}
                        title="Tap to undo approval"
                      >
                        <Check size={14} />
                        Approved · tap to undo
                      </button>
                    ) : (
                      <button
                        className="btn ghost"
                        onClick={() => approveAsset(a.id)}
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
                      <Comment
                        key={i}
                        c={c}
                        aid={a.id}
                        idx={i}
                        replyWho="client"
                      />
                    ))}
                    {a.type === "video" && (
                      <button
                        className={"tc-toggle" + (attachTime ? " on" : "")}
                        onClick={() => setAttachTime(!attachTime)}
                      >
                        <Clock size={13} />
                        {attachTime
                          ? `Pinned to ${fmtT(playT)}`
                          : "Add timecode"}
                      </button>
                    )}
                    <div className="cinput">
                      <input
                        value={assetDraft}
                        onChange={(e) => setAssetDraft(e.target.value)}
                        placeholder={
                          a.type === "video" && attachTime
                            ? `Note at ${fmtT(playT)}…`
                            : "Add a comment…"
                        }
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

      {toast && (
        <div className="toast">
          <Check size={15} />
          {toast}
        </div>
      )}
    </div>
  );
}
