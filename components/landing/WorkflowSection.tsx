"use client";

import React from "react";
import { Upload, Share2, CheckCircle2 } from "lucide-react";


const SHOT_UPLOAD = "/images/posts/shot-upload.webp";
const SHOT_LINK = "/images/posts/shot-link.webp";
const SHOT_APPROVE = "/images/posts/shot-approve.webp";
const STEPS = [
  {
    step: "01",
    title: "Upload your assets",
    description:
      "Drop in a film. We handle the hosting, transcoding, and smooth playback.",
    icon: Upload,
        img:SHOT_UPLOAD,

    // img: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80",
    // badgeText: "TRANSCODING 4K",
  },
  {
    step: "02",
    title: "Share a private link",
    description:
      "Send it on WhatsApp. Your client opens it instantly — no login, no app.",
    icon: Share2,
        img:SHOT_LINK,

    // img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80",
    // badgeText: "PRIVATE WHATSAPP LINK",
  },
  {
    step: "03",
    title: "Edit & get approvals",
    description:
      "Clients comment and approve the final cut, and you deliver the finished files.",
    icon: CheckCircle2,
    img:SHOT_APPROVE,
    // img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80",
    // badgeText: "ASSETS APPROVAL ✓",
  },
];


export function WorkflowSection() {
  return (
    <section id="workflow" className="py-20 text-center space-y-12">
      {/* Section Header */}
      <div className="space-y-3">
        <h2 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight font-display">
          HOW IT WORKS
        </h2>
        <p className="text-base sm:text-lg text-[#aeaeb4] font-medium">
          From footage to sign-off in three steps.
        </p>
      </div>

      {/* 3 Step Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        {STEPS.map((item) => (
          <div
            key={item.step}
            className=" card group rounded-[28px] border border-white/10 bg-[#121217] p-5 shadow-2xl transition-all duration-300 hover:border-white/20 flex flex-col justify-between"
          >
            {/* Top Mockup Box with Orange Warm Backglow */}
            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-gradient-to-tr from-[#ce3909] via-[#e64713] to-[#88179f] p-3 flex items-center justify-center border border-white/10">
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative z-10 w-full h-full rounded-xl bg-[#0f0f13] border border-white/15 overflow-hidden flex flex-col justify-between p-3">
                <img
                  src={item.img}
                  alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform"
                />
                {/* <div className="relative z-10 flex justify-between items-start">
                  <span className="bg-[#f5551d] text-white text-[10px] font-extrabold px-2 py-0.5 rounded shadow font-mono">
                    {item.badgeText}
                  </span>
                </div> */}
                {/* <div className="relative z-10 bg-black/70 backdrop-blur-md p-2 rounded-lg border border-white/10">
                  <span className="text-[11px] font-bold text-white block">
                    {item.title}
                  </span>
                </div> */}
              </div>
            </div>

            {/* Bottom Content */}
            <div className="pt-6 pb-2 space-y-2">
              <span className="text-sm font-extrabold text-[#f5551d] font-mono block">
                {item.step}
              </span>
              <h3 className="text-xl font-bold text-white font-display">
                {item.title}
              </h3>
              <p className="text-sm text-[#aeaeb4] leading-relaxed">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
