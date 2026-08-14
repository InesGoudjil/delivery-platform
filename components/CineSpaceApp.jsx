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
  Trash2,
  Upload,
  ChevronDown,
  Star,
  BadgeCheck,
  MapPin,
  Briefcase,
  Menu,
  Users,
  LayoutGrid,
  Archive,
  Palette,
} from "lucide-react";

// ============================================================
//  CineSpace — full prototype (orange/dark)
//  Surfaces: CineSpace website · Filmmaker PUBLIC page · Filmmaker BACKEND (private) · Client view
// ============================================================

const IMG_BG =
  "data:image/webp;base64,UklGRqoEAABXRUJQVlA4IJ4EAADwHQCdASohAEoBPslYo0wnpboiNFQMg0AZCWYIkIkB/K0XFDcvD8jzi7e3BA0P2VJx/1/pR+nfasPVBzwHtQ/yD1WrKWf66v7VbRIjpn0h/AGAhGBJpyqAx5NRu2WwH0ME/pKwEmFF5NxXpzVpcocvwINvw6YWIX8vhguXLuMxCPKjlG0LaV082xyzj8vM05mPdwpgxmGJF/+9pPaIaCNzxGjYlugqBCYZvIvaMfYo8oZAm2LMG+UeduWrUgjJyBRf1i9TpTW+XnT6f0GrgUaqeAyuHAhIQdLDJ0pX8iuikjCyow2CGnOhPA+GRRbsEqh/eF4YhtAB4AD+/d1ri/jxmv7j7Rfxy91eSvbWyuQM6D7j8FOUnkXvusVtLjlJKI67OkrPUjnReIbTwyN//UfJiQqQz+Z7FIVLCK+8L0mMYBOOqTdN4tfAibF3Wc3HKsYEDa5HtaMo7o5FJYWOrIxq9k2akz07OaKUZ2lMuF+mYWQCAZqu2RJZnmavvH3qGS/fLZS9TVfag+xd8uoqAQ5Wz5Ige+GfvIl09fQeomp3UycnfYtN8yvVDANE77YikMP+nZHnGeKgl67TTereq9KSQONfghHdWUMqPNGa4s+ze9oVOEF0brH1d4WeeAzE856AeRAZi2uuMg7XN7F6vwJBuDZ7VjOwEokUL1f84Ivcnnva9okDWOIPHiYHPnV/6CZ2ubY+Yy2t6V3bEOcBGj/L1byHy4dWhsUY49TPLe5ObIMmdQMn0/YLR5MAuiB/SG9yJMdgT2pgwjRR7su+tJ8K1WySbYMjxEUDMrqwMu5kQqD/+TwHF+JBOBIn1jTdv+rz5ooys1kdM2I2gATkQNr9AnFS8ZOjwaqoxojnXhXxCrpYUSPuBehxq82ZyRtkrUam+vQP5DLv06YiE+dZoCjXGBQNkw6me38SnSDFH2lWv31nNrBobebyzuepi6BWiD5dB9gb85QY8S66Qu4Wv2GGhS6ZHpmBgn0G+e1XsDh8x1wOkvN2Ld/AGTGkrcuHiFyNxPZusfyn7Sx53oLjo7qPlISGamb8wgd9xPFrun2XSFrOnli4imOul1an76SdwAgFzwPtfPoKflcTlVuBJ3xn2TnJb/2TtLtl+lKc5Cocr1RrSv6ioA6+kErUrTwCvwSrFg+11OsjP/N6Ns4CXoLyCicZ6P/+d2TeXx928TvcgdIPI1GOXA2Qkh1EtdAh+52AQgGKRR9szOgikpGs1+I/m51sgCq0qJC5D0pdLjox5IKBQhJwyQmtFc/I2BUUTjOO/j2dAVVoKGnrJBx+Wj9MfxVFrEOx4lg9g63OUInPdOhTZxbYHrg++ioQ9lOCyST+RJVmpLX2vhMpPUciKCvNx/TV9RAMrn7feMvhsgbzHn1YdIEaTH+ftqzIaz7yGnD+JXnfPRVtW8HsRtGriFJSfmIsxi+OKNoPhHrezX71IREwXqWaEYN1KS9pdbWHw9NCw4OYn/xYJaqWDXOefcikKnCjoZOwz3n5Hg+NKjG/UeTubQFSUZc1SVIGX3ql1a0qnWbuQBl6w2uce4FC7+0YU8yZAO12I7KYrpMAAAA=";
const IMG_HERO = "/images/posts/IG-Posts-16.webp";
const IMG_SHOW = "/images/showcase.jpg";
const SHOWREEL_IMG = "/images/showreel-img.webp";
const IMG_CTA = "/images/cta.jpg";
const IMG_ABOUT = "/images/about-img.png";
const IMG_CONCERT = "/images/img-concert.webp";
const IMG_FASHION = "/images/img-fashion.webp";
const IMG_CITY = "/images/img-city.webp";
const IMG_CAR = "/images/img-car.webp";
const IMG_MEETING = "/images/img-meeting.webp";
const LOGO_SRC = "/images/logo.svg";
const BLOG_COVER =
  "data:image/webp;base64,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";
const LEGAL_PAGES = {
  privacy: {
    badge: "Privacy",
    title: "Privacy Policy",
    updated: "June 24th, 2026",
    sections: [
      {
        h: "",
        p: "CineSpace (“CineSpace,” “we,” “our,” or “us”) respects your privacy. This Privacy Policy explains how we collect, use, share, and protect your information when you use our website, applications, and services (together, the “Services”). By using the Services, you agree to the practices described here.",
      },
      {
        h: "1. Information we collect",
        p: "We collect information you give us directly — your name, email address, account credentials, billing details (handled by third-party payment processors; we never store full card numbers), uploaded content metadata such as file names, sizes and timestamps, and any messages you send to support. We also collect some information automatically: IP address, device identifiers, browser type, operating system, log data, and usage metrics like uploads, downloads, and delivery-link activity. We may receive limited information from third parties such as payment processors, authentication providers, analytics tools, and fraud-detection services.",
      },
      {
        h: "2. How we use your information",
        p: "We use your information to provide, operate, and improve the Services; process payments and manage subscriptions; deliver, stream, and transcode your content; communicate with you; provide support; monitor usage and prevent abuse; and comply with legal obligations.",
      },
      {
        h: "3. How we share information",
        p: "We share information with service providers who help us run CineSpace — hosting and storage providers, payment processors, analytics tools, and email/SMS providers. We may disclose information when required by law, court order, or governmental request, or in connection with a merger, acquisition, or asset sale. We do not sell your personal information.",
      },
      {
        h: "4. Cookies & tracking",
        p: "We use cookies and similar technologies to keep you signed in, remember preferences, analyse site usage, and measure campaigns. See our Cookie Policy for full details and controls.",
      },
      {
        h: "5. Data retention",
        p: "We keep personal information only as long as needed to provide the Services, comply with legal obligations, resolve disputes, and enforce agreements. Uploaded content is retained according to your plan and storage usage; content exceeding plan limits may be removed after downgrade or termination as described in the Terms of Service.",
      },
      {
        h: "6. Data security",
        p: "We use administrative, technical, and physical safeguards to protect your information. No system is 100% secure, and we cannot guarantee absolute security.",
      },
      {
        h: "7. Your rights",
        p: "Depending on where you live, you may have rights to access, correct, delete, or port your personal data, restrict or object to processing, and lodge a complaint with a supervisory authority. To exercise any of these rights, contact hello@cinespace.film — we verify all requests before acting on them.",
      },
      {
        h: "8. Children’s privacy",
        p: "The Services are not intended for anyone under 18. We do not knowingly collect personal information from minors, and we delete it if we become aware of it.",
      },
      {
        h: "9. International transfers",
        p: "Your information may be transferred to and processed in countries where our service providers operate. By using the Services you consent to such transfers.",
      },
      {
        h: "10. Changes to this policy",
        p: "We may update this Privacy Policy from time to time. We will notify you of material changes by email or a notice in the product. Continued use of the Services means you accept the updated policy.",
      },
      {
        h: "11. Contact",
        p: "For privacy questions or requests, contact CineSpace at hello@cinespace.film.",
      },
    ],
  },
  terms: {
    badge: "Legal",
    title: "Terms of Service",
    updated: "June 12th, 2026",
    sections: [
      {
        h: "",
        p: "Welcome to CineSpace (“CineSpace”, “we”, “our”, “us”). By accessing or using our website, applications, or services (together, the “Services”), you agree to be bound by these Terms of Service. If you do not agree, do not use the Services.",
      },
      {
        h: "1. Account registration",
        p: "You must be at least 18 years old to use the Services. You are responsible for safeguarding your credentials and for all activity under your account. To prevent abuse, we may require email or phone verification; accounts created by bots or disposable email addresses may be terminated without notice.",
      },
      {
        h: "2. Service plans",
        p: "Our free Starter plan is subject to usage limits and may be modified or discontinued at any time; inactive free accounts may be deleted. Paid subscriptions (Basic, Pro, Studio) are billed in advance and fees are non-refundable except where required by law. If a payment fails, your account may revert to Starter limits and uploads may be suspended until usage is reduced or the plan is renewed.",
      },
      {
        h: "3. The Silo (archival storage)",
        p: "The Silo is cold storage for delivered projects, available on Pro and Studio plans. Access to Silo content requires an active paid subscription; if your subscription lapses, archived data is preserved but locked until you resume a paid plan. The Silo is designed for archival purposes — restore times of 24–48 hours apply, and content is not instantly streamable.",
      },
      {
        h: "4. Fair use",
        p: "CineSpace is built for the delivery and archiving of professional visual media by human-led workflows. Automated scripts, bots, or upload/delete cycles designed to bypass plan limits are prohibited. Backend processing (transcoding, proxies) is a shared resource: accounts that ingest several times their plan’s storage per billing cycle may be temporarily throttled. If you have a legitimate high-volume need, contact us for a custom solution. Reselling your account or using your storage as a public file host is not permitted.",
      },
      {
        h: "5. User content & copyright",
        p: "You keep full ownership of your content. You grant CineSpace a limited licence to host, transcode, and deliver it as needed to provide the Services. You agree not to upload content that is illegal, infringing, or malicious. We comply with applicable copyright law — see our Copyright Policy for the notice-and-takedown process. We may remove infringing content and terminate repeat infringers.",
      },
      {
        h: "6. Disclaimers",
        p: "The Services are provided “as is” and “as available.” To the fullest extent permitted by law, CineSpace disclaims all warranties, express or implied, and does not guarantee the Services will be uninterrupted, secure, or error-free.",
      },
      {
        h: "7. Limitation of liability",
        p: "To the maximum extent permitted by law, CineSpace shall not be liable for indirect, incidental, or consequential damages, including lost profits, data loss, or business interruption. Our total liability for any claim shall not exceed the amount you paid us in the 12 months preceding the claim.",
      },
      {
        h: "8. Indemnification",
        p: "You agree to indemnify and hold CineSpace and its officers harmless from claims, damages, and expenses (including legal fees) arising from your use of the Services, your violation of these Terms, or your violation of third-party rights.",
      },
      {
        h: "9. Termination",
        p: "We may suspend or terminate your account for violations of these Terms. Upon termination, your data may be permanently deleted after a 30-day grace period.",
      },
      {
        h: "10. Governing law",
        p: "These Terms are governed by the laws of the United Arab Emirates, without regard to conflict of law principles.",
      },
    ],
  },
  cookies: {
    badge: "Legal",
    title: "Cookie Policy",
    updated: "February 8th, 2026",
    sections: [
      {
        h: "",
        p: "This Cookie Policy explains how CineSpace uses cookies and similar technologies when you use our website, applications, and services (the “Services”). By continuing to use the Services, you consent to our use of cookies as described here, except where consent is required by law.",
      },
      {
        h: "1. What are cookies?",
        p: "Cookies are small text files stored on your device when you visit a website. They help sites function properly, remember preferences, and provide analytics. We may also use similar technologies such as pixels, SDKs, and local storage.",
      },
      {
        h: "2. Types of cookies we use",
        p: "Strictly necessary cookies authenticate users, maintain session state, enable security features, and prevent fraud — these cannot be disabled. Functional cookies remember preferences like language and account settings. Analytics cookies help us understand how the Services are used (page views, feature usage, error tracking, load times); we may use third-party analytics providers. Marketing cookies may be used to measure campaigns, attribute conversions, and retarget visitors — where required, only with your consent.",
      },
      {
        h: "3. Third-party cookies",
        p: "Some cookies are set by providers acting on our behalf — analytics, infrastructure, fraud prevention, and support tools. We do not control third-party cookies directly; their use is governed by the providers’ own privacy policies.",
      },
      {
        h: "4. Controlling cookies",
        p: "Most browsers let you view, delete, and block cookies and set preferences. Blocking some cookies may affect how the Services work. Where required by law, we provide a consent mechanism to accept or reject non-essential cookies, and you can change your preferences at any time.",
      },
      {
        h: "5. Do Not Track",
        p: "Some browsers transmit “Do Not Track” signals. There is no uniform standard for these signals and we do not currently respond to them.",
      },
      {
        h: "6. Retention",
        p: "Session cookies are deleted when you close your browser; persistent cookies remain until they expire or are deleted. Specific periods vary by cookie type and provider.",
      },
      {
        h: "7. Changes",
        p: "We may update this Cookie Policy periodically and will notify you of material changes via a website notice or email.",
      },
      {
        h: "8. Contact",
        p: "Questions about this policy or your cookie preferences: hello@cinespace.film.",
      },
    ],
  },
  refunds: {
    badge: "Legal",
    title: "Refunds & Cancellations",
    updated: "February 8th, 2026",
    sections: [
      {
        h: "",
        p: "This Refund & Cancellation Policy governs payments made to CineSpace for access to our services, including subscriptions, storage capacity, and processing features (the “Services”). By purchasing or subscribing, you acknowledge and agree to this policy.",
      },
      {
        h: "1. Subscriptions (Basic, Pro & Studio)",
        p: "All subscription fees are non-refundable. We do not provide refunds, credits, or prorated billing for unused time, downgrades, partial months, failure to use the service, or accounts suspended for policy violations. Once a billing cycle begins, charges for that cycle are final.",
      },
      {
        h: "2. Cancellation",
        p: "You may cancel your subscription at any time from your dashboard. Your subscription stays active until the end of the current billing period, and no further charges occur after cancellation, provided it is completed before the next renewal date.",
      },
      {
        h: "3. Failed payments",
        p: "If a payment fails, your account may be downgraded or restricted, access to paid features (including The Silo) may be suspended, and your data may become subject to plan limits.",
      },
      {
        h: "4. The Silo (storage purchases)",
        p: "Silo capacity purchases are one-time and non-refundable under any circumstances, including non-use, account cancellation, downgrade to Starter, or inaccessibility due to a lapsed subscription. Capacity is provisioned immediately as a digital service and is therefore not eligible for refunds. Silo access requires an active paid subscription — no refunds are issued for periods during which access is unavailable due to non-payment or cancellation.",
      },
      {
        h: "5. Usage limits & availability",
        p: "Processing, bandwidth, and storage are governed by your plan limits and our Fair Use policy; throttling or enforcement does not entitle you to refunds. The Services are provided as-is — temporary interruptions, maintenance, or performance degradation do not entitle you to refunds, credits, or extensions.",
      },
      {
        h: "6. Chargebacks",
        p: "If you initiate a chargeback or payment dispute, we may suspend or terminate your account, you remain responsible for outstanding balances, and reinstatement may require resolution of the dispute. Please contact support before initiating a chargeback.",
      },
      {
        h: "7. Exceptions required by law",
        p: "Refunds will be issued where required by applicable consumer-protection law. If local law grants you a mandatory right of withdrawal or refund, those rights are honoured strictly to the extent required.",
      },
      {
        h: "8. Contact",
        p: "For billing questions or cancellation support: hello@cinespace.film.",
      },
    ],
  },
  copyright: {
    badge: "Copyright",
    title: "Copyright Policy",
    updated: "June 24th, 2026",
    sections: [
      {
        h: "",
        p: "CineSpace respects the intellectual property rights of others and expects its users to do the same. We respond promptly to notices of alleged copyright infringement reported to our designated copyright contact identified below.",
      },
      {
        h: "1. Filing an infringement notice",
        p: "If you are a copyright owner (or authorised to act for one), report alleged infringement on or through the Services by sending a written notice that includes: your physical or electronic signature; identification of the copyrighted work claimed to be infringed; identification of the material claimed to be infringing and where it is located (for example the specific delivery or portfolio URL); your contact details (address, phone, email); a statement of good-faith belief that the use is not authorised by the copyright owner, its agent, or the law; and a statement, under penalty of perjury, that the information in the notice is accurate and that you are authorised to act for the owner.",
      },
      {
        h: "2. Copyright contact",
        p: "Send notices to our copyright contact: CineSpace — Attn: Copyright Agent, hello@cinespace.film. Please include “Copyright Takedown Notice” in the subject line.",
      },
      {
        h: "3. Counter-notification",
        p: "If you believe your content was removed by mistake or misidentification, you may file a written counter-notification with the information required by applicable law. On receipt of a valid counter-notification, we may restore the material if the original complaining party does not initiate court action within 10–14 business days.",
      },
      {
        h: "4. Repeat infringers",
        p: "In appropriate circumstances and at our sole discretion, we terminate the accounts of users deemed to be repeat infringers.",
      },
    ],
  },
};
const WL_IMGS = {
  links: "/images/waitlist/links.webp",
  control: "/images/waitlist/control.webp",
  brand: "/images/waitlist/brand.webp",
  feedback: "/images/waitlist/feedback.webp",
  password: "/images/waitlist/password.webp",
};

const DELIVERY = {
  name: "Mercedes-AMG GT ",
  client: "Prestige Rentals",
  date: "02.21.26",
  location: "Dubai, UAE",
  size: "1.1 GB",
  cover:
    "url(/images/projects/mercedes-amg-gt/cover.webp) center/cover no-repeat",
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

const STATUS = {
  draft: { l: "Draft", c: "var(--grey)" },
  review: { l: "In review", c: "var(--orange)" },
  delivered: { l: "Delivered", c: "var(--sage)" },
};
const ACCENTS = [
  { n: "Ember", c: "#F5551D" },
  { n: "Crimson", c: "#E23B3B" },
  { n: "Violet", c: "#7C5CFF" },
  { n: "Emerald", c: "#1D9E75" },
  { n: "Ocean", c: "#378ADD" },
  { n: "Gold", c: "#E0A82E" },
  { n: "Magenta", c: "#D8408F" },
  { n: "Slate", c: "#5B6B7C" },
];
const SEED = [
  {
    id: 1,
    title: "Dubai Nights",
    client: "Prestige Rentals",
    type: "film",
    status: "delivered",
    tc: "01:12",
    g: "url(data:image/webp;base64,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) center/cover no-repeat",
  },
  {
    id: 2,
    title: "Desert Run",
    client: "Land Cruiser Co",
    type: "film",
    status: "review",
    tc: "00:48",
    g: "url(data:image/webp;base64,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) center/cover no-repeat",
  },
  {
    id: 3,
    title: "Studio Sessions",
    client: "Neon Records",
    type: "music",
    status: "delivered",
    tc: "02:30",
    g: "url(data:image/webp;base64,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) center/cover no-repeat",
  },
  {
    id: 4,
    title: "New Year Gala",
    client: "The Ivy Group",
    type: "event",
    status: "delivered",
    tc: "01:05",
    g: "url(data:image/webp;base64,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) center/cover no-repeat",
  },
  {
    id: 5,
    title: "Aventador S",
    client: "Elite Motors",
    type: "film",
    status: "review",
    tc: "00:39",
    g: "url(data:image/webp;base64,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) center/cover no-repeat",
  },
  {
    id: 6,
    title: "Editorial — Mono",
    client: "Vogue Arabia",
    type: "fashion",
    status: "delivered",
    tc: "00:58",
    g: "url(data:image/webp;base64,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) center/cover no-repeat",
  },
  {
    id: 7,
    title: "Omakase",
    client: "Kaiseki House",
    type: "food",
    status: "delivered",
    tc: "01:20",
    g: "url(data:image/webp;base64,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) center/cover no-repeat",
  },
  {
    id: 8,
    title: "Live in Concert",
    client: "SoundWave",
    type: "music",
    status: "review",
    tc: "03:10",
    g: "url(data:image/webp;base64,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) center/cover no-repeat",
  },
  {
    id: 9,
    title: "Clinic Story",
    client: "Aster Health",
    type: "brand",
    status: "delivered",
    tc: "01:45",
    g: "url(data:image/webp;base64,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) center/cover no-repeat",
  },
];

const PF_ASSETS = [
  // ============================================================
  // FILMS — KEEPING YOUR CURRENT FILM SELECTION
  // ============================================================

  {
    id: 1,
    kind: "film",
    cat: "boxing",
    title: "Boxing Event",
    desc: "A cinematic boxing film, shot across the day.",
    ar: 1.25,
    tc: "—",
    g: "url(/images/portfolio/projects/Boxing/3.webp) center/cover no-repeat",
  },
  {
    id: 2,
    kind: "film",
    cat: "fashion",
    title: "Fashion Event",
    desc: "A cinematic fashion film, shot across the day.",
    ar: 0.72,
    tc: "—",
    g: "url(/images/portfolio/projects/Fashion/8.webp) center/cover no-repeat",
  },
  {
    id: 3,
    kind: "film",
    cat: "g class",
    title: "G Class",
    desc: "A cinematic G Class film, shot across the day.",
    ar: 1.65,
    tc: "—",
    g: "url(/images/portfolio/projects/G-class/3.webp) center/cover no-repeat",
  },
  {
    id: 4,
    kind: "film",
    cat: "maserati",
    title: "Maserati",
    desc: "A cinematic Maserati film, shot across the day.",
    ar: 0.62,
    tc: "—",
    g: "url(/images/portfolio/projects/Maserati/3.webp) center/cover no-repeat",
  },
  {
    id: 5,
    kind: "film",
    cat: "restaurant",
    title: "Restaurant",
    desc: "A cinematic restaurant film, shot across the day.",
    ar: 1.4,
    tc: "01:05",
    g: "url(/images/portfolio/projects/Restaurant/4.webp) center/cover no-repeat",
  },
  {
    id: 6,
    kind: "film",
    cat: "tenis",
    title: "Tennis",
    desc: "A cinematic tennis film, shot across the day.",
    ar: 0.58,
    tc: "—",
    g: "url(/images/portfolio/projects/Tenis/2.webp) center/cover no-repeat",
  },
  {
    id: 7,
    kind: "film",
    cat: "urus",
    title: "Urus",
    desc: "A cinematic Urus film, shot across the day.",
    ar: 1.75,
    tc: "01:20",
    g: "url(/images/portfolio/projects/Urus/5.webp) center/cover no-repeat",
  },
  {
    id: 8,
    kind: "film",
    cat: "boxing",
    title: "Boxing Event",
    desc: "A cinematic boxing film, shot across the day.",
    ar: 0.82,
    tc: "—",
    g: "url(/images/portfolio/projects/Boxing/6.webp) center/cover no-repeat",
  },
  {
    id: 9,
    kind: "film",
    cat: "fashion",
    title: "Fashion Event",
    desc: "A cinematic fashion film, shot across the day.",
    ar: 0.667,
    tc: "—",
    g: "url(/images/portfolio/projects/Fashion/1.webp) center/cover no-repeat",
  },
  {
    id: 10,
    kind: "film",
    cat: "g class",
    title: "G Class",
    desc: "A cinematic G Class film, shot across the day.",
    ar: 0.68,
    tc: "—",
    g: "url(/images/portfolio/projects/G-class/1.webp) center/cover no-repeat",
  },
  {
    id: 11,
    kind: "film",
    cat: "maserati",
    title: "Maserati",
    desc: "A cinematic Maserati film, shot across the day.",
    ar: 1.55,
    tc: "—",
    g: "url(/images/portfolio/projects/Maserati/1.webp) center/cover no-repeat",
  },
  {
    id: 12,
    kind: "film",
    cat: "restaurant",
    title: "Restaurant",
    desc: "A cinematic restaurant film, shot across the day.",
    ar: 0.75,
    tc: "01:05",
    g: "url(/images/portfolio/projects/Restaurant/12.webp) center/cover no-repeat",
  },
  {
    id: 13,
    kind: "film",
    cat: "tenis",
    title: "Tennis",
    desc: "A cinematic tennis film, shot across the day.",
    ar: 1.15,
    tc: "—",
    g: "url(/images/portfolio/projects/Tenis/4.webp) center/cover no-repeat",
  },
  {
    id: 14,
    kind: "film",
    cat: "urus",
    title: "Urus",
    desc: "A cinematic Urus film, shot across the day.",
    ar: 0.62,
    tc: "01:20",
    g: "url(/images/portfolio/projects/Urus/1.webp) center/cover no-repeat",
  },
  {
    id: 15,
    kind: "film",
    cat: "restaurant",
    title: "Restaurant",
    desc: "A cinematic restaurant film, shot across the day.",
    ar: 1.5,
    tc: "01:20",
    g: "url(/images/portfolio/projects/Restaurant/2.webp) center/cover no-repeat",
  },

  // ============================================================
  // STILLS — ALL REMAINING IMAGES, RANDOMIZED
  // ============================================================

  {
    id: 16,
    kind: "still",
    cat: "fashion",
    title: "Fashion Event",
    desc: "A cinematic still from the Fashion Event.",
    ar: 0.82,
    tc: "—",
    g: "url(/images/portfolio/projects/Fashion/4.webp) center/cover no-repeat",
  },
  {
    id: 17,
    kind: "still",
    cat: "urus",
    title: "Urus",
    desc: "A cinematic still from the Urus project.",
    ar: 1.55,
    tc: "—",
    g: "url(/images/portfolio/projects/Urus/3.webp) center/cover no-repeat",
  },
  {
    id: 18,
    kind: "still",
    cat: "boxing",
    title: "Boxing Event",
    desc: "A cinematic still from the Boxing Event.",
    ar: 1.2,
    tc: "—",
    g: "url(/images/portfolio/projects/Boxing/9.webp) center/cover no-repeat",
  },
  {
    id: 19,
    kind: "still",
    cat: "restaurant",
    title: "Restaurant",
    desc: "A cinematic still from the Restaurant project.",
    ar: 0.72,
    tc: "—",
    g: "url(/images/portfolio/projects/Restaurant/7.webp) center/cover no-repeat",
  },
  {
    id: 20,
    kind: "still",
    cat: "g class",
    title: "G Class",
    desc: "A cinematic still from the G Class project.",
    ar: 1.7,
    tc: "—",
    g: "url(/images/portfolio/projects/G-class/5.webp) center/cover no-repeat",
  },
  {
    id: 21,
    kind: "still",
    cat: "tenis",
    title: "Tennis",
    desc: "A cinematic still from the Tennis project.",
    ar: 0.58,
    tc: "—",
    g: "url(/images/portfolio/projects/Tenis/3.webp) center/cover no-repeat",
  },
  {
    id: 22,
    kind: "still",
    cat: "maserati",
    title: "Maserati",
    desc: "A cinematic still from the Maserati project.",
    ar: 1.35,
    tc: "—",
    g: "url(/images/portfolio/projects/Maserati/4.webp) center/cover no-repeat",
  },
  {
    id: 23,
    kind: "still",
    cat: "boxing",
    title: "Boxing Event",
    desc: "A cinematic still from the Boxing Event.",
    ar: 0.82,
    tc: "—",
    g: "url(/images/portfolio/projects/Boxing/4.webp) center/cover no-repeat",
  },
  {
    id: 24,
    kind: "still",
    cat: "fashion",
    title: "Fashion Event",
    desc: "A cinematic still from the Fashion Event.",
    ar: 0.667,
    tc: "—",
    g: "url(/images/portfolio/projects/Fashion/6.webp) center/cover no-repeat",
  },
  {
    id: 25,
    kind: "still",
    cat: "restaurant",
    title: "Restaurant",
    desc: "A cinematic still from the Restaurant project.",
    ar: 1.65,
    tc: "—",
    g: "url(/images/portfolio/projects/Restaurant/10.webp) center/cover no-repeat",
  },
  {
    id: 26,
    kind: "still",
    cat: "urus",
    title: "Urus",
    desc: "A cinematic still from the Urus project.",
    ar: 0.65,
    tc: "—",
    g: "url(/images/portfolio/projects/Urus/6.webp) center/cover no-repeat",
  },
  {
    id: 27,
    kind: "still",
    cat: "g class",
    title: "G Class",
    desc: "A cinematic still from the G Class project.",
    ar: 0.78,
    tc: "—",
    g: "url(/images/portfolio/projects/G-class/2.webp) center/cover no-repeat",
  },
  {
    id: 28,
    kind: "still",
    cat: "boxing",
    title: "Boxing Event",
    desc: "A cinematic still from the Boxing Event.",
    ar: 1.8,
    tc: "—",
    g: "url(/images/portfolio/projects/Boxing/1.webp) center/cover no-repeat",
  },
  {
    id: 29,
    kind: "still",
    cat: "tenis",
    title: "Tennis",
    desc: "A cinematic still from the Tennis project.",
    ar: 1.25,
    tc: "—",
    g: "url(/images/portfolio/projects/Tenis/5.webp) center/cover no-repeat",
  },
  {
    id: 30,
    kind: "still",
    cat: "fashion",
    title: "Fashion Event",
    desc: "A cinematic still from the Fashion Event.",
    ar: 0.82,
    tc: "—",
    g: "url(/images/portfolio/projects/Fashion/3.webp) center/cover no-repeat",
  },
  {
    id: 31,
    kind: "still",
    cat: "restaurant",
    title: "Restaurant",
    desc: "A cinematic still from the Restaurant project.",
    ar: 0.88,
    tc: "—",
    g: "url(/images/portfolio/projects/Restaurant/3.webp) center/cover no-repeat",
  },
  {
    id: 32,
    kind: "still",
    cat: "urus",
    title: "Urus",
    desc: "A cinematic still from the Urus project.",
    ar: 1.45,
    tc: "—",
    g: "url(/images/portfolio/projects/Urus/4.webp) center/cover no-repeat",
  },
  {
    id: 33,
    kind: "still",
    cat: "boxing",
    title: "Boxing Event",
    desc: "A cinematic still from the Boxing Event.",
    ar: 0.62,
    tc: "—",
    g: "url(/images/portfolio/projects/Boxing/7.webp) center/cover no-repeat",
  },
  {
    id: 34,
    kind: "still",
    cat: "g class",
    title: "G Class",
    desc: "A cinematic still from the G Class project.",
    ar: 1.3,
    tc: "—",
    g: "url(/images/portfolio/projects/G-class/4.webp) center/cover no-repeat",
  },
  {
    id: 35,
    kind: "still",
    cat: "restaurant",
    title: "Restaurant",
    desc: "A cinematic still from the Restaurant project.",
    ar: 1.5,
    tc: "—",
    g: "url(/images/portfolio/projects/Restaurant/11.webp) center/cover no-repeat",
  },
  {
    id: 36,
    kind: "still",
    cat: "fashion",
    title: "Fashion Event",
    desc: "A cinematic still from the Fashion Event.",
    ar: 0.667,
    tc: "—",
    g: "url(/images/portfolio/projects/Fashion/7.webp) center/cover no-repeat",
  },
  {
    id: 37,
    kind: "still",
    cat: "maserati",
    title: "Maserati",
    desc: "A cinematic still from the Maserati project.",
    ar: 0.7,
    tc: "—",
    g: "url(/images/portfolio/projects/Maserati/2.webp) center/cover no-repeat",
  },
  {
    id: 38,
    kind: "still",
    cat: "boxing",
    title: "Boxing Event",
    desc: "A cinematic still from the Boxing Event.",
    ar: 1.6,
    tc: "—",
    g: "url(/images/portfolio/projects/Boxing/10.webp) center/cover no-repeat",
  },
  {
    id: 39,
    kind: "still",
    cat: "restaurant",
    title: "Restaurant",
    desc: "A cinematic still from the Restaurant project.",
    ar: 0.65,
    tc: "—",
    g: "url(/images/portfolio/projects/Restaurant/6.webp) center/cover no-repeat",
  },
  {
    id: 40,
    kind: "still",
    cat: "urus",
    title: "Urus",
    desc: "A cinematic still from the Urus project.",
    ar: 1.15,
    tc: "—",
    g: "url(/images/portfolio/projects/Urus/2.webp) center/cover no-repeat",
  },
  {
    id: 41,
    kind: "still",
    cat: "fashion",
    title: "Fashion Event",
    desc: "A cinematic still from the Fashion Event.",
    ar: 0.75,
    tc: "—",
    g: "url(/images/portfolio/projects/Fashion/5.webp) center/cover no-repeat",
  },
  {
    id: 42,
    kind: "still",
    cat: "g class",
    title: "G Class",
    desc: "A cinematic still from the G Class project.",
    ar: 1.5,
    tc: "—",
    g: "url(/images/portfolio/projects/G-class/6.webp) center/cover no-repeat",
  },
  {
    id: 43,
    kind: "still",
    cat: "boxing",
    title: "Boxing Event",
    desc: "A cinematic still from the Boxing Event.",
    ar: 0.78,
    tc: "—",
    g: "url(/images/portfolio/projects/Boxing/5.webp) center/cover no-repeat",
  },
  {
    id: 44,
    kind: "still",
    cat: "restaurant",
    title: "Restaurant",
    desc: "A cinematic still from the Restaurant project.",
    ar: 1.75,
    tc: "—",
    g: "url(/images/portfolio/projects/Restaurant/9.webp) center/cover no-repeat",
  },
  {
    id: 45,
    kind: "still",
    cat: "tenis",
    title: "Tennis",
    desc: "A cinematic still from the Tennis project.",
    ar: 0.7,
    tc: "—",
    g: "url(/images/portfolio/projects/Tenis/1.webp) center/cover no-repeat",
  },
  {
    id: 46,
    kind: "still",
    cat: "fashion",
    title: "Fashion Event",
    desc: "A cinematic still from the Fashion Event.",
    ar: 0.667,
    tc: "—",
    g: "url(/images/portfolio/projects/Fashion/2.webp) center/cover no-repeat",
  },
  {
    id: 47,
    kind: "still",
    cat: "boxing",
    title: "Boxing Event",
    desc: "A cinematic still from the Boxing Event.",
    ar: 1.4,
    tc: "—",
    g: "url(/images/portfolio/projects/Boxing/2.webp) center/cover no-repeat",
  },
  {
    id: 48,
    kind: "still",
    cat: "restaurant",
    title: "Restaurant",
    desc: "A cinematic still from the Restaurant project.",
    ar: 0.8,
    tc: "—",
    g: "url(/images/portfolio/projects/Restaurant/8.webp) center/cover no-repeat",
  },
  {
    id: 49,
    kind: "still",
    cat: "urus",
    title: "Urus",
    desc: "A cinematic still from the Urus project.",
    ar: 1.65,
    tc: "—",
    g: "url(/images/portfolio/projects/Urus/6.webp) center/cover no-repeat",
  },
  {
    id: 50,
    kind: "still",
    cat: "g class",
    title: "G Class",
    desc: "A cinematic still from the G Class project.",
    ar: 0.64,
    tc: "—",
    g: "url(/images/portfolio/projects/G-class/4.webp) center/cover no-repeat",
  },
  {
    id: 51,
    kind: "still",
    cat: "boxing",
    title: "Boxing Event",
    desc: "A cinematic still from the Boxing Event.",
    ar: 1.3,
    tc: "—",
    g: "url(/images/portfolio/projects/Boxing/11.webp) center/cover no-repeat",
  },
  {
    id: 52,
    kind: "still",
    cat: "restaurant",
    title: "Restaurant",
    desc: "A cinematic still from the Restaurant project.",
    ar: 1.1,
    tc: "—",
    g: "url(/images/portfolio/projects/Restaurant/13.webp) center/cover no-repeat",
  },
  {
    id: 53,
    kind: "still",
    cat: "tenis",
    title: "Tennis",
    desc: "A cinematic still from the Tennis project.",
    ar: 1.55,
    tc: "—",
    g: "url(/images/portfolio/projects/Tenis/3.webp) center/cover no-repeat",
  },
];

const PF_PROJECTS = [
  {
    id: 1,
    title: "Boxing Event",
    client: "Boxing Event",
    desc: "A cinematic boxing project featuring films and stills captured across the event.",
    date: "—",
    location: "—",
    cover: 1,
    tc: "—",
    assetIds: [
      1,
      8, // Films
      18,
      23,
      28,
      33,
      38,
      43,
      47,
      51, // Stills
    ],
  },

  {
    id: 2,
    title: "Fashion Event",
    client: "Fashion Event",
    desc: "A cinematic fashion project combining motion and still photography.",
    date: "—",
    location: "—",
    cover: 2,
    tc: "—",
    assetIds: [
      2,
      9, // Films
      16,
      24,
      30,
      36,
      41,
      46, // Stills
    ],
  },

  {
    id: 3,
    title: "G Class",
    client: "G Class",
    desc: "A cinematic automotive project featuring the G Class through films and stills.",
    date: "—",
    location: "—",
    cover: 3,
    tc: "—",
    assetIds: [
      3,
      10, // Films
      20,
      27,
      34,
      42,
      50, // Stills
    ],
  },

  {
    id: 4,
    title: "Maserati",
    client: "Maserati",
    desc: "An automotive campaign capturing the Maserati through cinematic films and photography.",
    date: "—",
    location: "—",
    cover: 4,
    tc: "—",
    assetIds: [
      4,
      11, // Films
      22,
      37, // Stills
    ],
  },

  {
    id: 5,
    title: "Restaurant",
    client: "Restaurant",
    desc: "A cinematic restaurant project combining atmospheric films and still photography.",
    date: "—",
    location: "—",
    cover: 5,
    tc: "01:05",
    assetIds: [
      5,
      12,
      15, // Films
      19,
      25,
      31,
      35,
      39,
      44,
      48,
      52, // Stills
    ],
  },

  {
    id: 6,
    title: "Tennis",
    client: "Tennis",
    desc: "A cinematic tennis project capturing the energy and atmosphere of the event.",
    date: "—",
    location: "—",
    cover: 6,
    tc: "—",
    assetIds: [
      6,
      13, // Films
      21,
      29,
      45,
      53, // Stills
    ],
  },

  {
    id: 7,
    title: "Urus",
    client: "Urus",
    desc: "A cinematic automotive project featuring the Urus through films and stills.",
    date: "—",
    location: "—",
    cover: 7,
    tc: "01:20",
    assetIds: [
      7,
      14, // Films
      17,
      26,
      32,
      40,
      49, // Stills
    ],
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

const SHOT_UPLOAD =
  "data:image/webp;base64,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";
const SHOT_LINK = "/images/posts/IG-Posts-9-_1_.webp";
const SHOT_APPROVE =
  "data:image/webp;base64,UklGRvoQAABXRUJQVlA4IO4QAABQbQCdASpoAdMAPslip0+npaQjJBTb8PAZCWduwavJMBmV9857pnCCv3EOwJ4A/M2X/vVtk8wL2ejvFmHh7qJFWXX49dOwgycJY/MjTkXbMSjC/WlsiNNRSX3DvZh4KYPW2b4TiuPoJFmwY53oPAkzk0eHhrKYllR9DZ2uM40Hf/xkWewFwwoMioyA2c3PRcWbeEWaqESnpGHuAlx1dr3odQ/spBMDll+hq1OtkzFSDQx78Rvr+s2lKMknutXBHUWrEQ0klB7/RrFHNTXodD027MdnFLAW+UrcKZhP6xKP1ugK7FCEFGzzAJMm5QCOXSZaZPDin4dDcUAk0dorTYvMHkrStuUuZr1qQf/CntRSgXZckTIu7r8K/efyi9NrECCbPH0KkxKpsWWEoRNjWk0c3gw6gfU3P8tHlnaQMpRpzYBRKVQCIXPFuOCZMXbn3Oa0d8yC0b+3uGGovHOW1n/ht4CfRrXa2gQnCoZsZeeFGRzmUDQJQliHfjnaLWRnGb5bAfr45YLysd7/NCGEPq5gPEPuTkG69fE7Nl8lBqhdN7mPwPtqr11TijA1xRG7zsU9Omf7jdDM24ngRKxHKDiGBm6G/HlFtJ7O5x9339MozFTH8fIZODIiyohjgCTlJZ7teWTB5P/4kZzrVaHflgJ6zTj/r+Qy3UgvRce6ZRtduq1UKIPiMJf8eQS5GRuJeU5Dn/zOD5I3bSM3IOXFnudxLuOsP7yVzPSM4HahLtqNMTgChoO00US+6wiBZvGszLhTSZP7Hd4cRd8gd7cn9urESjt/ITfvXa5qA2KHHSDefZJasxDLU6em2GEpWZS5T7tutAyp+1pU+ioMnxh9M8Qi7ZmHzgX+jyhd3UN/dmbPW885mRLrABeeZEpzokc6tLxOkw40PFSq85bTXim9O4cLCjm88psG0jwwdTXsB+S2Fo5EC8I3CeoJdgRSUut8BXPJADysPb6sKHh0AKJZ0XKEC/0x5Kt2oLuSeBx4DKeJilGrKmG98gaTc3Xz6T3b4ob9/8Q6/g6Bhc4EQ+7Xor9uwmSvxvSJ0KQ/U3bRUfhGz+YP7qk8pu5ITnR51W4Q4ckHsJaNuDW1ZPSiUoelU2hbe1Ma6S7gf8DwHGleQEbtJYOdBdUd7MOyWTHodSG/7CakUCqgYQV1b2IaJF+6dcLBRf0AAP73CQOpwXxDb2pbXNEJ6T8HlDLIE5K20HNY02BjNv/ZkGnRk2L2jggGp/7wgieopr/gLfMxyy6IyTDdhTR5tw/RHc6fL8UrMSo6ZFpUeyhkXe0AIDT7dzijV0rhTHS6XuU7MOyHh3fHIkaSP6+lOv6UPIzAt7UU6ipsY3s+R3+4PV85p3zeDwddwlwKsYYCQj+BABUHHxroLStQ78lTgZtMd0LQlu0AI1Fu9KYMBDJP27g6RKacZMJltpjF2V/GhraJRpOJG75xYSEbiNlvBqPa+tfFBYIxzcZ96ZjqecayBfTJvJOgWGt2hqjocveD7F6XkUd/9dKuUmil4GrwXrnePk1Fzm800KbK8yl+F7rBXT2sniMSF1/gMYgYY/OH56iv7wt083GYEKWr3H5fAmwbW7nEKyCC7PYI53KjOi9pALE2LSH9mm04w57R8uefKaL8xe4nI1AcUznhDvNRL1LjGvnEa/xNuwxDzE3rlWVO8jCyFL/Fc222BvAJRxChlLwzb8p64SEGjtjzvHD8aAKQ/ptLZlJGSingD2bjQOSaIVtfTWHKWNEt4AG3SmDCZMis1fTSkCRaNAL6pkoegFTY45EwcII8tpKFvt7gOow91Bl1r8UPJn0314X1yLSt8/HdpRJx/rdedEiUMafwS01X59bA6LiNhZXJ53W1Rk7pAR8/bO2wnoKgrZv08OHXRvgBtZt+uWt1MKuu3tmVYPtUMhnopjShxwvQ51D4EAqxQvi+ZdgWg58JycceZsy8M0uiAlxpDc5M7M6DK0+3JKOAgiYJcbbKBtEUW4O528s1oC1biISeSZSWJ5gVddEVBcyyt+aztITJXKpMJ1wxsuUWTJJxG30vFVNpPksMTYMNG9iHTcTqKDQbgOdWldLEoXvgw4Wni/ILCFffCFUPQoRmqiLOkbR1L4iugXoI8NaXllDrLH24AX2IQGKz66lO0j+vSJPZLtuAkvByoZ9ycT6yQjOeVlr3ImN2IH9zTyyzFltpXLAqGzl0qRScH0Cd2+GxvKs8R5vZm3D1qyUulSUrrRwCgY2uGHNlXJEHQ+fmnKu0EMzXrn3mY0SXO5lPtiqSqF4eYA3r4t0eih1iPoyMub4/NRIhMM2pEB63ORDGzdkSN51+U++C9CR0nitiC4elNoix4TxPC04C4n/4BagnJxIPKEUzhFBseCPccJC05fpOCMOea+aPPLDZ+5yDZqRVKYbJi2EX4gOX6xhPLL1Uq0947LVAW+gg3aCt33Yt1zSAbh6BS9fRSwmsW6WRNTTjGO/kGNoF77FAGODgfh0tRM9Wr7WbpsaezpIicXls0NXXMIJtfCHBGMM17Fbe8OPl4GB7tn4Uy0o2n35ozuIMDGjQX8eRFl1X2XwmLpBpWehIHOqjhEBu9yddoICpFaQ1geSTHGbZxF7fyZXsNckytxJtrZL/d+7+NHfHj7YQtVgW9cQXSo8vsCk2WeMbQf7jPnreUGZ/VjAsGNbrdxb+9892SlOuUjYId4LlcxIuCfDBrby2AtNunwufWK1P2Q+wRkKtuLq0p6vfpFZPUhnaNxLmRrYBP1wtCA08Z8pzCGJsq8kgJyrk0jTQlEtv0fPc9kPsK19Iy+/b79hG+F5+ZbnmChKUV3/cqs8QISQSBp6c8qHVpzlnuLAjN8J11ByRg9vrLBPBk905Y9v8FD+xQMhRVlmvh9L/3MZ0dViKqUdk+6cmVxq1cCtAd6dX2EQTsxnzqBHnI9SHmR8IuyUSVn+QBLL1TAP9rYWK4H5NeM+5Trv/xmTFVCN9i+k/jMZ+aEWbVXFDhLIHE0d7Wc2VPju12FdLd6oCi6kR+RIi4FqWAW7z1hUdxftCEBt/Z4/5Qg7O9yovOQXp20ZmxGYU2LGAczVmOK8dAsLXmdrxa98U56amu6v9r/4n1uJkfeEq9+6An++3P0XVyr8opUAwj0y8U3+vYZ1bSAInRJQMwz0f+E84TJRmvE6+jDwTjtJUx3q8y0+jEz/yN3ekrOcpBVdcyWnER4UWuY8GPcW0LDDZR1kX1SySs/Lqg9H2EMWTOKhSPWEY0fpXbDoNr12nHAez8Uq+ReE5H7OBn3jEWH1RFqfS2pokliUycKX7CUXGSe5CcXhQqI6wQC3j+oNHXcvTpz1oMFFr42opX+6XTPQ7zAHwt7xhkhXCk4uWSbCeNBZatABxSWxnvIOhbsuowxTY11RM1sy92atXAKHCNQZxHiaD2mmyI17WVnoTPfnQVRJeY4R1tVNVEMoX0iQhF4ILZ+Uf362qgB6OmT2Tk+7zx/1C9CJVv8bm8nW4gAZtAnakaLyfRurQAh6R15rCzTulVBqKQmH9nxkCyjhXAntuFTJs37DdPT3hItZmPUl+q4Eq5r9tA7zcoiXx3D8I/ad/cRoNW0o5hKxu8vEmJDvnDDu4dl0nLb0mPM8E2CInTMxxHWa/dq6s0qhLQHL3G9y3TuzsUFWNiH7aCv5+MhXXxKYiZsO+QFWeA5Sqz2QLMkYFd6nLKfk1A0idL28ZWX2ojDNVWMw3P01MCy7fBKiEbkhhSQ0jRr5mJfl+B8X3zWk/DNNUqHpC0bTDA8HOHmYO3zZBUCdCFy15lfFhkAb2k0ZxIFn1u8/XuvVwx1xnNsruGK+oOZFCxRKsT9OP00VplUIYB3pYBAoNiHchZ/WrqyMwx79u+IrF1v5xX+2blxHMbxuJuHapLJQiX5JrvN8GQyjZTH8qV6bmbLaMwkbvZrh/GGEoKPZLR3GIf7PxAGH1z5raAhR4r5g4VoGk09kw4Y3TWfdKYKVAr00fuLhpo1T6wxxQoi0YhlNOr84GKnIUNNDCaa5Xo8cd9vBain/Pd53o7ZcICfdxW5CBjpJz4+8xwlWqeurxUMLuXccL0bhYfWydzXmQ56BeT9MDG6dG1WGAonwasJSw7FAvYcK1QbPzStkotImtcp35HOK4gmfVtyFc4AezLgqw862n1rsgEWUhiikfrvPl2ewev3bH3yQ52y3WVave7N3uu9Pwqr74tKMDBVLk3cypOUXDzqxzXKG8BUU/UauqKHT63n6Ul960dhBK0/yL5gKic7aizdRu91DRPutAq2T+id6nLu+/uRn/1GF+YqcaNfFYZ76rQ5Dcsyr2cIVg+cNFNMVdYIgIxWfgSigD4mW0VbI/6o505pzHKDgX0CcIn94dfhkyGGhiWUSQeeA/VGD/AItkbnEXl4lse298uTFSI/ZqQqfYAhVtK5AH9qA4yyqXberudOLNMashOKnIio9pa515vClUXDgI0x6BLl7QZ4kNnQTzdecYQLO8TBV2OXvkVHtXOqpZSRbSBq4KOc2tcBXMN83lszpT7iiJS8arZs5garUH5LgCHgN73DJxr2iKLX6nL8s5BNPbRkvlfW/gFG+HY2Sh3oLBKrbbXjBKAL6wrIbBfOYvcZaxftsAI5fQY1PlY6TKlydgtGO0lGIu9Q+HGhTWoSHEhJkOPqPDl1wODEUp3T5gm2ZjPzj92aPrHRb2Nv3Wf16ggnRNoSwAhJ/v587mLxOxtq8sjydRHjYVtNk5uZpfE/C3Oqa4o6ftrw73iBT92uz0W35+HluL1ZI/gZtjpNGexyXJAFulh2q6+gCE2W1dEND0aFt5X0YrAXcKqkf2nqKy3D6q28eaWDJQVAH4uuTjvdB1XBcQPc5Kr7wx4019EUT/YJYQI18tE3exjRIGcyIi3iwEjOntFmIUjgBm+aaiurAMgGrghW7ZHi3Xc0KUpwLRqnTUK6YFqVbUopJA6avvnBPn8Vw60xXn2gqZ3lhdacMMeQrv2Uwhl4RbGiwKrmte+/fOvqJOO/U2Q+NUoOrIeR7AR6yzugMzewhft+F/1YxdLQD759pmw/RyXPd3M+32HUy02vfyjYi8tcZ4usvMjS/IWnBtuGtd2B0D+13VAS2fVqRQocdBnMQgjF3L+hdepye42uAfpWbCy2D75WpN4gGOriBBM70gmSPZljNnLscaxUywS8DWIvxZsJbeDy+n1zKUBR4tAktrcWbJTOEYJgNWFUqU68zdvEB0mTz/Ks4/iJ/2F4rOP20UsFbDVjBjR7d5HWYaQQMCp/vDEZCbJccKQvWgS++dWGt4a5SCk9A9Kn4A0es/bEMz8yIs9E6wwr8Hkoh2MieX3lCnT7kXzhlBJsiTpdj9RtPbQyM9Rf8CVsi38Q61iZ1XN+WflW+U2B5jRb8ZfEzAbB0TDbNxgKR2SF7St8/++8SoFbvmMsadG3MMR2ThUXxxuzJdKkbu82vTeOvLHGv5MpyrfAV1vrJaTnfzgvX7FZ+Kxq66xWf8aHvOSwZQTfu6SF/sZBVCFtMnhvIQhv+xXacK/zGifjOXslGn6utEIodkACsqm9a9SR562GD1/yRZF5nKI/Ftlz5fX25kf8uae3gQHTPyZeTmUGHYMFZwdzBRedLaQp5TLsPQJ2aPXoRhD7qa/zn/7F2ryUXrGC253/biWvya6R7Z/VdkbPg5ffn7QdLWNsnRG4bgN9VYIEgigu2XIEi0EwAL6JpgY5CM9S/p9nVE7dS7dmMpgXqN/edEXDmcS3uX0G8P+e+sEIfEp8V/kZYLqc+kUjYxe+mj6AAAAAAAAA==";
// CineSpace — Waitlist landing page
// Persists signups via window.storage (shared) so the counter is live in the artifact preview.
// For production, the developer swaps saveSignup()/loadCount() for a real backend (Supabase, Mailchimp, etc.).

const WL_LOGO_SRC = LOGO_SRC;

function WaitlistSurface({ onOpenDemo }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Filmmaker");
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const ROLES = ["Filmmaker", "Studio", "Agency", "Other"];
  const BASE = 300; // shown as a head-start so the list never looks empty

  useEffect(() => {
    loadCount();
  }, []);

  async function loadCount() {
    try {
      const res = await window.storage.list("wl:");
      const n = res && res.keys ? res.keys.length : 0;
      setCount(BASE + n);
    } catch {
      setCount(BASE);
    }
  }

  function validEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  async function submit() {
    setErr("");
    if (!validEmail(email)) {
      setErr("Please enter a valid email address.");
      return;
    }
    setBusy(true);
    const key =
      "wl:" +
      email
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .slice(0, 60);
    const entry = {
      name: name.trim(),
      email: email.trim(),
      role,
      at: new Date().toISOString(),
    };
    try {
      await window.storage.set(key, JSON.stringify(entry), true); // shared = visible in the live count
      await loadCount();
      setDone(true);
    } catch {
      // even if storage fails, show success so the demo flows
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cs-wait">
      {/* flame-tinted ambient background */}
      <div className="wl-bg" aria-hidden="true">
        <div className="wl-bg-glow" />
        <div className="wl-bg-glow g2" />
      </div>

      <div className="wl-shell">
        <header className="wl-top">
          <img className="wl-logo-img" src={WL_LOGO_SRC} alt="CineSpace" />
          <span className="wl-badge">
            <Lock size={12} /> Private beta
          </span>
        </header>

        <main className="wl-main">
          <div className="wl-hero-split">
            <div className="wl-hero-left">
              <div className="wl-eyebrow">
                Coming soon · Built for filmmakers everywhere
              </div>
              <h1 className="wl-h1">
                Deliver films
                <br />
                like a studio.
              </h1>
              <p className="wl-sub">
                Your portfolio, client review, and delivery — in one place.
                CineSpace is opening in private beta. Join the waitlist and get
                early access, founder pricing, and a say in what we build.
              </p>
            </div>
            <div className="wl-hero-right">
              {!done ? (
                <div className="wl-card">
                  <div className="wl-field">
                    <label>
                      Name <span className="opt">(optional)</span>
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Pedro Concreato"
                    />
                  </div>
                  <div className="wl-field">
                    <label>Email</label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submit()}
                      placeholder="you@studio.com"
                      type="email"
                    />
                  </div>
                  <div className="wl-field">
                    <label>I'm a…</label>
                    <div className="wl-roles">
                      {ROLES.map((r) => (
                        <button
                          key={r}
                          className={"wl-role" + (role === r ? " on" : "")}
                          onClick={() => setRole(r)}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  {err && <div className="wl-err">{err}</div>}
                  <button className="wl-cta" onClick={submit} disabled={busy}>
                    {busy ? (
                      "Joining…"
                    ) : (
                      <>
                        Join the waitlist <ArrowRight size={17} />
                      </>
                    )}
                  </button>
                  <div className="wl-count">
                    <Users size={14} />{" "}
                    {count === null ? "…" : count.toLocaleString()} filmmakers
                    already waiting
                  </div>
                </div>
              ) : (
                <div className="wl-card wl-success">
                  <div className="wl-check">
                    <Check size={30} strokeWidth={2.6} />
                  </div>
                  <h2>You're on the list.</h2>
                  <p>
                    We'll email <b>{email}</b> the moment your invite is ready.
                    Early access is rolling out to founders first.
                  </p>
                  <div className="wl-count">
                    <Users size={14} />{" "}
                    {count === null ? "…" : count.toLocaleString()} filmmakers
                    already waiting
                  </div>
                  <button
                    className="wl-ghost"
                    onClick={() => {
                      setDone(false);
                      setName("");
                      setEmail("");
                      setRole("Filmmaker");
                    }}
                  >
                    Add another email
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="wl-demo-wrap">
            <button className="wl-demo-big" onClick={() => onOpenDemo()}>
              <Play size={17} /> See a live client demo — no signup needed
            </button>
          </div>

          <div className="wl-perks">
            <div className="wl-perk">
              <Film size={16} />
              <div>
                <b>Early access</b>
                <span>Be first in when we open the doors.</span>
              </div>
            </div>
            <div className="wl-perk">
              <Users size={16} />
              <div>
                <b>Founder pricing</b>
                <span>Locked-in rates for early members.</span>
              </div>
            </div>
            <div className="wl-perk">
              <Check size={16} />
              <div>
                <b>Shape the product</b>
                <span>Tell us what to build next.</span>
              </div>
            </div>
          </div>
        </main>

        {/* ===== Feature showcase (image mockups) ===== */}
        <section className="wl-sec">
          <div className="wl-sec-head">
            <div className="wl-eyebrow">A look inside</div>
            <h2 className="wl-h2">See how it actually looks.</h2>
            <p className="wl-sec-sub">
              A preview of the CineSpace experience — the real delivery pages
              your clients will open.
            </p>
          </div>
          <div className="wl-shots">
            <div className="wl-row">
              <div className="wl-row-txt">
                <b>Premium delivery links</b>
                <span>
                  Send clients one branded link — share, manage, and deliver
                  every cut and still inside a single cinematic page. No
                  scattered folders, no WeTransfer clutter.
                </span>
              </div>
              <div className="wl-row-img">
                <img src={WL_IMGS.links} alt="Premium delivery links" />
              </div>
            </div>
            <div className="wl-row">
              <div className="wl-row-img">
                <img src={WL_IMGS.password} alt="Password protected links" />
              </div>
              <div className="wl-row-txt">
                <b>Password-protected links</b>
                <span>
                  Lock any delivery behind a passphrase, set links to expire,
                  and share only with the people you choose. Your clients' films
                  stay private until you decide otherwise.
                </span>
              </div>
            </div>
            <div className="wl-row">
              <div className="wl-row-txt">
                <b>Feedback &amp; approvals</b>
                <span>
                  Clients leave time-stamped comments pinned to the exact frame,
                  and approve each asset — per cut or the whole project. Every
                  sign-off tracked and locked.
                </span>
              </div>
              <div className="wl-row-img">
                <img
                  src={WL_IMGS.feedback}
                  alt="Client timestamped feedback and approvals"
                />
              </div>
            </div>
            <div className="wl-row">
              <div className="wl-row-img">
                <img src={WL_IMGS.brand} alt="Add your brand" />
              </div>
              <div className="wl-row-txt">
                <b>Add your brand</b>
                <span>
                  Your logo, your accent colour, your name on every page.
                  Clients experience your studio — not our software.
                </span>
              </div>
            </div>
            <div className="wl-row">
              <div className="wl-row-txt">
                <b>Customize portfolio &amp; deliveries</b>
                <span>
                  Control card size, layout, and aspect ratio — including a
                  Pinterest-style mixed view. Shape both your portfolio and
                  every delivery page exactly the way you want.
                </span>
              </div>
              <div className="wl-row-img">
                <img
                  src={WL_IMGS.control}
                  alt="Customize portfolio and deliveries"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ===== What you get: the four surfaces ===== */}
        <section className="wl-sec">
          <div className="wl-sec-head">
            <div className="wl-eyebrow">Everything in one place</div>
            <h2 className="wl-h2">
              One link. From first pitch to final delivery.
            </h2>
            <p className="wl-sec-sub">
              CineSpace replaces the mess of WeTransfer links, PDFs, and
              scattered folders with a single branded home for your work.
            </p>
          </div>
          <div className="wl-surfaces">
            <div className="wl-surface">
              <div className="wl-si">
                <LayoutGrid size={20} />
              </div>
              <h3>Your public page</h3>
              <p>
                A cinematic portfolio that sells. Full-screen showreel, your
                latest work, your story — all on one link you can send to any
                lead in a tap.
              </p>
            </div>
            <div className="wl-surface">
              <div className="wl-si">
                <Link2 size={20} />
              </div>
              <h3>Client delivery pages</h3>
              <p>
                Send clients a private, password-protected page to review each
                cut, leave time-stamped comments, approve versions, and download
                the finished files.
              </p>
              <button className="wl-surface-demo" onClick={() => onOpenDemo()}>
                <Play size={13} /> Try the live demo
              </button>
            </div>
            <div className="wl-surface">
              <div className="wl-si">
                <Play size={20} />
              </div>
              <h3>Your dashboard</h3>
              <p>
                Manage projects, deliveries, storage, and branding from one
                clean workspace. Upload a cut, share a link, track approvals —
                without the chaos.
              </p>
            </div>
            <div className="wl-surface">
              <div className="wl-si">
                <Archive size={20} />
              </div>
              <h3>The Silo — secure archive</h3>
              <p>
                Move delivered projects to secure cold storage to free up your
                active space. Nothing lost, nothing expiring — restore any
                project in 24–48h.
              </p>
            </div>
          </div>
        </section>

        {/* ===== Capabilities ===== */}
        <section className="wl-sec">
          <div className="wl-sec-head">
            <div className="wl-eyebrow">Built for the way you work</div>
            <h2 className="wl-h2">
              Studio-grade delivery, without the studio.
            </h2>
          </div>
          <div className="wl-caps">
            <div className="wl-cap">
              <Palette size={18} />
              <div>
                <b>Your branding</b>
                <span>
                  Custom accent colours, your logo, and your name across every
                  page. Your brand, not ours.
                </span>
              </div>
            </div>
            <div className="wl-cap">
              <MessageCircle size={18} />
              <div>
                <b>Review &amp; approve</b>
                <span>
                  Clients comment on exact moments and approve each version —
                  every approval is timestamped and locks that cut.
                </span>
              </div>
            </div>
            <div className="wl-cap">
              <Lock size={18} />
              <div>
                <b>Private &amp; secure</b>
                <span>
                  Password-protect any delivery link, control downloads, and set
                  links to expire when you choose.
                </span>
              </div>
            </div>
            <div className="wl-cap">
              <Download size={18} />
              <div>
                <b>Instant handoff</b>
                <span>
                  Clients open your link and download finished files instantly —
                  no logins, no apps, no friction.
                </span>
              </div>
            </div>
            <div className="wl-cap">
              <Film size={18} />
              <div>
                <b>Watermark &amp; protect</b>
                <span>
                  Preview cuts with watermarks until they're approved and paid —
                  then release the clean files.
                </span>
              </div>
            </div>
            <div className="wl-cap">
              <Users size={18} />
              <div>
                <b>Made for everyone</b>
                <span>
                  Arabic + English delivery pages and WhatsApp-first sharing,
                  built for how clients everywhere actually work.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Plans teaser (no detail) ===== */}
        <section className="wl-sec">
          <div className="wl-sec-head">
            <div className="wl-eyebrow">Plans</div>
            <h2 className="wl-h2">Start free. Grow when you're ready.</h2>
            <p className="wl-sec-sub">
              From a free portfolio to a full studio setup. Early members lock
              in founder pricing for life — exact plans and pricing are shared
              with waitlist members first.
            </p>
          </div>
          <div className="wl-plannames">
            <span className="wl-planpill">Starter</span>
            <span className="wl-planpill">Basic</span>
            <span className="wl-planpill pop">Pro</span>
            <span className="wl-planpill">Studio</span>
          </div>
        </section>

        {/* ===== Bottom CTA ===== */}
        <section className="wl-endcta">
          <h2 className="wl-h2">Be first in.</h2>
          <p className="wl-sec-sub">
            Join {count === null ? "hundreds of" : count.toLocaleString()}{" "}
            filmmakers already on the list.
          </p>
          <button
            className="wl-cta"
            style={{ maxWidth: 320, margin: "0 auto" }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Join the waitlist <ArrowRight size={17} />
          </button>
        </section>

        <footer className="wl-foot">© CineSpace — Films, delivered.</footer>
      </div>
    </div>
  );
}

// ===== Live client-view demo (self-contained) =====

export default function CineSpaceApp({ initialSurface, embedded } = {}) {
  const [surface, setSurface] = useState(initialSurface || "public");
  const [pubTab, setPubTab] = useState("work");
  const [pfCat, setPfCat] = useState("films"); // films | stills | projects
  const [pfOpen, setPfOpen] = useState(null); // open project id (public + backend)
  const [pfAssets, setPfAssets] = useState(PF_ASSETS);
  const [pfProjects, setPfProjects] = useState(PF_PROJECTS);
  const [editAsset, setEditAsset] = useState(null); // asset being edited {id,...}
  const [editPfProject, setEditPfProject] = useState(null); // portfolio project being edited
  const [assetPicker, setAssetPicker] = useState(null); // {mode:'project'|'delivery', target}
  const [renameVer, setRenameVer] = useState(null); // {id, v} version being renamed
  const [beTab, setBeTab] = useState("projects");
  const [dashNav, setDashNav] = useState("branding"); // sidebar section
  const [dashGroup, setDashGroup] = useState("Account"); // mobile: which group is expanded
  const [profMenu, setProfMenu] = useState(false);
  const [livePrev, setLivePrev] = useState(false);
  const [openProj, setOpenProj] = useState(null);
  const [projects, setProjects] = useState(SEED);
  const [selId, setSelId] = useState(1);
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editDelivery, setEditDelivery] = useState(null);
  const [authModal, setAuthModal] = useState(null); // null | "login" | "signup"
  const [pwGate, setPwGate] = useState(false);
  const [pwVal, setPwVal] = useState("");
  const [uploadProg, setUploadProg] = useState(null); // null | {name,pct,total,idx,done}
  const [uploadModal, setUploadModal] = useState(false);
  const [projectModal, setProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({ title: "", desc: "" });
  const [uploadForm, setUploadForm] = useState({ title: "", desc: "" });
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCfg, setShareCfg] = useState({
    pass: false,
    passVal: "",
    downloads: false,
    comments: true,
    expiry: "7d",
    notifyComment: true,
    notifyDownload: true,
  });
  const [form, setForm] = useState({ title: "", client: "" });
  const [ver, setVer] = useState("Final");
  const [accent, setAccent] = useState("#F5551D");
  const [logo, setLogo] = useState(null);
  const logoInput = React.useRef(null);
  const [watermark, setWatermark] = useState(false);
  const [tpl, setTpl] = useState("Grid");
  const [brandName, setBrandName] = useState("Pedro Concreato");
  const [faqOpen, setFaqOpen] = useState(0);
  const [billing, setBilling] = useState("yearly");
  const [webView, setWebView] = useState("home");
  const [webScrolled, setWebScrolled] = useState(false);
  React.useEffect(() => {
    if (surface !== "website") return;
    const onScroll = () => setWebScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [surface]);
  const scrollTop = () => {
    setWebView("home");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 20);
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [pinnedId, setPinnedId] = useState(1);
  const [bio, setBio] = useState(
    "Filmmaker & creative director based between Dubai and Sharjah. I make brand films, weddings, and launch content for the Gulf — story first, craft you don't notice.",
  );
  const [aboutDesc, setAboutDesc] = useState(
    "Pedro Concreato is a filmmaker and creative director based between Dubai and Sharjah. Over six years he's shot brand films, weddings, and launch content across the Gulf — story first, craft you don't notice. He shoots, directs, and grades his own work, and cares as much about how a film is delivered as how it's made.",
  );
  const [statProjects, setStatProjects] = useState("80+");
  const [statYears, setStatYears] = useState("6");
  const [statBased, setStatBased] = useState("UAE");
  const [waNumber, setWaNumber] = useState("971500000000");
  const openWhatsApp = () => {
    const n = (waNumber || "").replace(/[^0-9]/g, "");
    if (n) {
      window.open(`https://wa.me/${n}`, "_blank");
    } else {
      flash("Add your WhatsApp number in the backend");
    }
  };
  const [draft, setDraft] = useState("");
  const [comments, setComments] = useState([
    {
      who: "client",
      meta: "Lost in Tokyo · 2h ago",
      text: "Love this cut! Can we make the intro a touch faster?",
    },
    { who: "me", meta: "You · 1h ago", text: "On it — sending V2 shortly." },
  ]);
  const [assetTab, setAssetTab] = useState("all");
  const [openAsset, setOpenAsset] = useState(null);
  const [assetVer, setAssetVer] = useState("V1");
  const [assetDraft, setAssetDraft] = useState("");
  const [playT, setPlayT] = useState(0);
  const [attachTime, setAttachTime] = useState(true);
  const [replyKey, setReplyKey] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [clientView, setClientView] = useState({
    size: "M",
    ratio: "mixed",
    scale: "fill",
    info: false,
  });
  const [pageView, setPageView] = useState({
    size: "M",
    ratio: "mixed",
    scale: "fill",
    info: false,
  });
  const [assets, setAssets] = useState(DELIVERY_ASSETS);

  useEffect(() => {
    const els = document.querySelectorAll(".reveal:not(.in)");
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
    // fallback: any reveal already in view (or if observer misses) becomes visible shortly
    const t = setTimeout(() => {
      document.querySelectorAll(".reveal:not(.in)").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight) {
          el.classList.add("in");
        }
      });
    }, 120);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, [surface, webView]);

  useEffect(() => {
    setPlayT(0);
    setReplyKey(null);
  }, [openAsset]);
  useEffect(() => {
    const el = document.querySelector(".bgimg");
    if (!el) return;
    const mob = window.matchMedia("(max-width:820px), (hover:none)").matches;
    el.style.backgroundAttachment = "scroll";
    const factor = mob ? 0.3 : 0.45;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY || document.documentElement.scrollTop || 0;
        el.style.backgroundPositionY = y * factor + "px";
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const flash = (m) => {
    setToast(m);
    setTimeout(() => setToast(null), 2100);
  };
  const goTo = (id) => {
    setWebView("home");
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };
  const fmtT = (x) => {
    x = Math.max(0, Math.round(x));
    return Math.floor(x / 60) + ":" + String(x % 60).padStart(2, "0");
  };
  const parseTC = (tc) => {
    if (!tc || !("" + tc).includes(":")) return 0;
    const p = ("" + tc).split(":").map(Number);
    return p[0] * 60 + (p[1] || 0);
  };
  const scrubTo = (e, dur) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    setPlayT(Math.max(0, Math.min(dur, x * dur)));
  };
  const AV_SIZE = { S: 150, M: 200, L: 260 };
  const AV_RATIO = { landscape: "16 / 10", square: "1 / 1", portrait: "3 / 4" };
  const dgridStyle = {
    gridTemplateColumns: `repeat(auto-fill,minmax(${AV_SIZE[clientView.size]}px,1fr))`,
  };
  const pgridStyle = {
    gridTemplateColumns: `repeat(auto-fill,minmax(${AV_SIZE[pageView.size]}px,1fr))`,
  };
  const lighten = (h, a = 0.3) => {
    const n = parseInt(h.slice(1), 16),
      R = (n >> 16) & 255,
      G = (n >> 8) & 255,
      B = n & 255,
      m = (x) =>
        Math.round(x + (255 - x) * a)
          .toString(16)
          .padStart(2, "0");
    return "#" + m(R) + m(G) + m(B);
  };
  const hexToRgb = (h) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const darken = (rgb, a = 0.28) => rgb.map((x) => Math.round(x * (1 - a)));
  const accentVars = (() => {
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
    };
  })();
  const thStyle = (a) => ({
    background: a.g,
    aspectRatio:
      clientView.ratio === "mixed"
        ? a.ar
          ? String(a.ar)
          : a.type === "photo"
            ? "3 / 4"
            : "16 / 10"
        : AV_RATIO[clientView.ratio],
    backgroundSize:
      clientView.ratio === "mixed"
        ? "cover"
        : clientView.scale === "fit"
          ? "contain"
          : "cover",
    backgroundColor: "var(--bg3)",
  });
  const approvedCount = assets.filter((a) => a.approved).length;
  const approveAsset = (id) => {
    setAssets((as) =>
      as.map((a) => (a.id === id ? { ...a, approved: true } : a)),
    );
    flash("Asset approved");
  };
  const toggleApprove = (id) => {
    setAssets((as) =>
      as.map((a) => (a.id === id ? { ...a, approved: !a.approved } : a)),
    );
  };
  const approveAll = () => {
    setAssets((as) => as.map((a) => ({ ...a, approved: true })));
    flash("Project approved");
  };
  const unapproveAll = () => {
    setAssets((as) => as.map((a) => ({ ...a, approved: false })));
    flash("Approvals cleared");
  };
  const addAssetComment = (id) => {
    if (!assetDraft.trim()) return;
    setAssets((as) =>
      as.map((a) =>
        a.id === id
          ? {
              ...a,
              comments: [
                ...a.comments,
                {
                  who: "client",
                  meta: "Client · just now",
                  text: assetDraft,
                  time:
                    attachTime && a.type === "video" ? Math.round(playT) : null,
                },
              ],
            }
          : a,
      ),
    );
    setAssetDraft("");
  };
  const addAssetReply = (id) => {
    if (!reply.trim()) return;
    setAssets((as) =>
      as.map((a) =>
        a.id === id
          ? {
              ...a,
              comments: [
                ...a.comments,
                { who: "me", meta: "You · just now", text: reply },
              ],
            }
          : a,
      ),
    );
    setReply("");
  };
  const addReply = (aid, idx, who) => {
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
                    ...(c.replies || []),
                    {
                      who,
                      meta:
                        who === "me" ? "You · just now" : "Client · just now",
                      text: replyDraft.trim(),
                    },
                  ],
                }
              : c,
          ),
        };
      }),
    );
    setReplyDraft("");
    setReplyKey(null);
  };
  const uploadVersion = (id) => {
    setAssets((as) =>
      as.map((a) =>
        a.id === id
          ? { ...a, versions: [...a.versions, `V${a.versions.length + 1}`] }
          : a,
      ),
    );
    flash("New version uploaded");
  };
  const addAsset = () => {
    setAssets((as) => [
      ...as,
      {
        id: Date.now(),
        name: `new_clip_${as.length + 1}`,
        type: "video",
        size: "—",
        tc: "0:00",
        g: as[0].g,
        versions: ["V1"],
        approved: false,
        comments: [],
      },
    ]);
    flash("Asset added");
  };
  const startUpload = (name = "rolling_wide_v3.mov") => {
    setUploadProg({ name, pct: 0, total: 3, idx: 1, done: false });
    let pct = 0;
    const t = setInterval(() => {
      pct = Math.min(100, pct + Math.random() * 16 + 6);
      if (pct >= 100) {
        clearInterval(t);
        setUploadProg((u) => u && { ...u, pct: 100, done: true });
        setTimeout(() => setUploadProg(null), 3200);
      } else setUploadProg((u) => u && { ...u, pct: Math.round(pct) });
    }, 360);
  };
  const submitUpload = () => {
    const title = uploadForm.title.trim() || "Untitled work";
    const desc = uploadForm.desc.trim();
    const grads = [
      "linear-gradient(135deg,#3a2a1a,#6a4a2a)",
      "linear-gradient(135deg,#1c2230,#38404e)",
      "linear-gradient(135deg,#2a1a1f,#4a2530)",
      "linear-gradient(135deg,#101a1c,#20403f)",
    ];
    setProjects((ps) => [
      {
        id: Date.now(),
        title,
        client: "Portfolio",
        type: "film",
        status: "delivered",
        tc: "00:00",
        g: grads[Math.floor(Math.random() * grads.length)],
        desc,
      },
      ...ps,
    ]);
    setUploadModal(false);
    setUploadForm({ title: "", desc: "" });
    startUpload(title + ".mov");
  };
  const submitProject = () => {
    const title = projectForm.title.trim() || "Untitled project";
    setProjectModal(false);
    setProjectForm({ title: "", desc: "" });
    setPfCat("projects");
    startUpload(
      title + " — " + (Math.floor(Math.random() * 4) + 6) + " assets",
    );
    flash("Project created — assets uploading");
  };
  // ---- Portfolio edit/delete ----
  const saveAsset = (patch) => {
    setPfAssets((as) =>
      as.map((a) => (a.id === editAsset.id ? { ...a, ...patch } : a)),
    );
    setEditAsset(null);
    flash("Saved");
  };
  const deleteAsset = () => {
    const id = editAsset.id;
    setPfAssets((as) => as.filter((a) => a.id !== id));
    setPfProjects((ps) =>
      ps.map((p) => ({ ...p, assetIds: p.assetIds.filter((x) => x !== id) })),
    );
    setEditAsset(null);
    flash("Deleted");
  };
  const saveProject = (patch) => {
    setPfProjects((ps) =>
      ps.map((p) => (p.id === editPfProject.id ? { ...p, ...patch } : p)),
    );
    setEditPfProject(null);
    flash("Saved");
  };
  const deleteProject = () => {
    const id = editPfProject.id;
    setPfProjects((ps) => ps.filter((p) => p.id !== id));
    setEditPfProject(null);
    flash("Project deleted");
  };
  const projAddAsset = (aid) =>
    setEditPfProject((p) => ({ ...p, assetIds: [...p.assetIds, aid] }));
  const projRemoveAsset = (aid) =>
    setEditPfProject((p) => ({
      ...p,
      assetIds: p.assetIds.filter((x) => x !== aid),
    }));
  // ---- Delivery version edit ----
  const delAddVersion = (aid) => {
    setAssets((as) =>
      as.map((a) => {
        if (a.id !== aid) return a;
        const n = "V" + (a.versions.length + 1);
        return { ...a, versions: [...a.versions, n] };
      }),
    );
    flash("Version added");
  };
  const delRemoveVersion = (aid, v) => {
    setAssets((as) =>
      as.map((a) => {
        if (a.id !== aid) return a;
        if (a.versions.length <= 1) return a;
        const nv = a.versions.filter((x) => x !== v);
        return { ...a, versions: nv };
      }),
    );
    setAssetVer((vv) => (vv === v ? "V1" : vv));
    flash("Version removed");
  };
  const delRenameVersion = (aid, oldV, newV) => {
    newV = (newV || "").trim() || oldV;
    setAssets((as) =>
      as.map((a) =>
        a.id === aid
          ? { ...a, versions: a.versions.map((x) => (x === oldV ? newV : x)) }
          : a,
      ),
    );
    setAssetVer((vv) => (vv === oldV ? newV : vv));
    setRenameVer(null);
  };
  const sel = projects.find((p) => p.id === selId) || projects[0];
  const pinned = projects.find((p) => p.id === pinnedId) || projects[0];
  const editProject = (id, f, v) =>
    setProjects(projects.map((p) => (p.id === id ? { ...p, [f]: v } : p)));
  const addProject = () => {
    if (!form.title.trim()) return;
    setProjects([
      {
        id: Date.now(),
        title: form.title.trim(),
        client: form.client.trim() || "Unassigned",
        type: "film",
        status: "draft",
        tc: "00:00",
        g: "linear-gradient(135deg,#1a2028,#2a3742)",
        desc: "",
      },
      ...projects,
    ]);
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
  const deliveryAddAsset = () => {
    const n = assets.length + 1;
    setAssets((as) => [
      ...as,
      {
        id: Date.now(),
        name: "new_asset_" + n,
        type: "video",
        size: "120 MB",
        tc: "0:30",
        ar: 1.6,
        approved: false,
        versions: ["V1"],
        g: as[0] ? as[0].g : "linear-gradient(135deg,#1a2028,#2a3742)",
        comments: [],
      },
    ]);
    flash("Asset added");
  };
  const deliveryRemoveAsset = (id) => {
    setAssets((as) => (as.length > 1 ? as.filter((a) => a.id !== id) : as));
    flash("Asset removed");
  };
  const deleteDelivery = () => {
    const id = editDelivery.id;
    setProjects((ps) => ps.filter((p) => p.id !== id));
    setEditDelivery(null);
    setOpenProj(null);
    flash("Delivery deleted");
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
  const Avatar = ({ who, sm }) => (
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
  const Comment = ({ c, aid, idx, replyWho }) => {
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
          {(c.replies || []).map((r, ri) => (
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
  const Card = ({ p, onClick, showStatus, view }) => (
    <div className="card" onClick={onClick}>
      <div
        className="thumb"
        style={
          view
            ? {
                background: p.g,
                aspectRatio: AV_RATIO[view.ratio],
                backgroundSize: view.scale === "fit" ? "contain" : "cover",
                backgroundColor: "var(--bg3)",
              }
            : { background: p.g }
        }
      >
        <span className="tmark">
          {p.type === "film" ? <Film size={11} /> : <ImageIcon size={11} />}
          {p.type}
        </span>
        <div className="play">
          <Play size={17} />
        </div>
        <span className="dur">{p.tc}</span>
        {view && view.info && (
          <div className="cinfo">
            <div className="ci-title">{p.title}</div>
            {p.desc && <div className="ci-desc">{p.desc}</div>}
          </div>
        )}
      </div>
      {!view && (
        <div className="cbody">
          <div className="ctitle">{p.title}</div>
          <div className="cclient">{p.client}</div>
          {p.desc && <div className="cdesc">{p.desc}</div>}
          {showStatus && <Status s={p.status} />}
        </div>
      )}
    </div>
  );

  const nReview = projects.filter((p) => p.status === "review").length;
  const nDeliv = projects.filter((p) => p.status === "delivered").length;

  // ===== Portfolio (Films / Stills / Projects) =====
  const PfAsset = ({ a, masonry, onClick, editable }) => (
    <div className={"pfa" + (masonry ? " mason" : "")} onClick={onClick}>
      <div
        className="pfa-th"
        style={
          masonry
            ? {
                background: a.g,
                aspectRatio: String(a.ar),
                backgroundSize: "cover",
              }
            : {
                background: a.g,
                aspectRatio:
                  AV_RATIO[
                    pageView.ratio === "mixed" ? "landscape" : pageView.ratio
                  ],
                backgroundSize: pageView.scale === "fit" ? "contain" : "cover",
                backgroundColor: "var(--bg3)",
              }
        }
      >
        {a.kind === "film" && (
          <div className="play">
            <Play size={16} />
          </div>
        )}
        <span className="tmark">
          {a.kind === "film" ? <Film size={11} /> : <ImageIcon size={11} />}
          {a.kind}
        </span>
        {a.tc !== "—" && <span className="dur">{a.tc}</span>}
        {editable && (
          <button
            className="pfa-edit"
            onClick={(e) => {
              e.stopPropagation();
              onClick && onClick();
            }}
          >
            <Pencil size={13} />
          </button>
        )}
        {pageView.info && (
          <div className="cinfo">
            <div className="ci-title">{a.title}</div>
          </div>
        )}
      </div>
    </div>
  );
  const PfGrid = ({ items, onItem, editable }) => {
    const masonry = pageView.ratio === "mixed";
    if (masonry)
      return (
        <div className={"pf-mason sz-" + pageView.size.toLowerCase()}>
          {items.map((a) => (
            <PfAsset
              key={a.id}
              a={a}
              masonry
              editable={editable}
              onClick={() => onItem && onItem(a)}
            />
          ))}
        </div>
      );
    return (
      <div className={"grid sz-" + pageView.size.toLowerCase()}>
        {items.map((a) => (
          <PfAsset
            key={a.id}
            a={a}
            editable={editable}
            onClick={() => onItem && onItem(a)}
          />
        ))}
      </div>
    );
  };
  const pfProjectCover = (proj) =>
    pfAssets.find((a) => a.id === proj.cover) || pfAssets[0];
  const PfProjectCard = ({ proj, onOpen, onEdit }) => {
    const cov = pfProjectCover(proj);
    return (
      <div className="pfproj" onClick={onOpen}>
        <div
          className="pfproj-th"
          style={{ background: cov.g, backgroundSize: "cover" }}
        >
          <span className="pfproj-count">{proj.assetIds.length} assets</span>
          {onEdit && (
            <button
              className="pfa-edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Pencil size={13} />
            </button>
          )}
          <div className="pfproj-info">
            <div className="pfproj-t">{proj.title}</div>
            <div className="pfproj-c">{proj.client}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="root" style={{ "--bg-lens": `url(${IMG_BG})` }}>
      <div
        className="bgwrap"
        aria-hidden="true"
        style={
          surface === "public" || surface === "client" ? accentVars : undefined
        }
      >
        <div className="bgimg" style={{ backgroundImage: `url(${IMG_BG})` }} />
        <div
          className={
            "bgtint" +
            (surface === "public" || surface === "client" ? " on" : "")
          }
        />
        <div className="bgveil" />
      </div>

      {!embedded && (
        <div className="switcher">
          <span className="lbl">Preview</span>
          <div className="seg">
            {[
              ["website", "CineSpace website"],
              ["public", "Public page"],
              ["backend", "Backend"],
              ["client", "Client view"],
              ["waitlist", "Waitlist"],
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
      )}

      {/* ===================== CineSpace WEBSITE ===================== */}
      {surface === "website" && (
        <div className="wrap anim-in">
          <nav className={"topnav" + (webScrolled ? " scrolled" : "")}>
            <img
              className="logo-img"
              src={LOGO_SRC}
              alt="CineSpace"
              onClick={scrollTop}
              style={{ cursor: "pointer" }}
            />
            <div className="navlinks">
              <a onClick={() => goTo("features")}>Features</a>
              <a onClick={() => goTo("pricing")}>Pricing</a>
              <a onClick={() => goTo("partner")}>Partnership</a>
              <a
                className={webView === "contact" ? "on" : ""}
                onClick={() => {
                  setWebView("contact");
                  setTimeout(
                    () => window.scrollTo({ top: 0, behavior: "smooth" }),
                    20,
                  );
                }}
              >
                Contact
              </a>
              <a onClick={() => setAuthModal("login")}>Login</a>
            </div>
            <button
              className="btn sm navcta"
              onClick={() => setAuthModal("signup")}
            >
              Get started
            </button>
            <button
              className="hamburger"
              aria-label="Menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </nav>
          {menuOpen && (
            <div className="mobmenu">
              <a
                onClick={() => {
                  setMenuOpen(false);
                  goTo("features");
                }}
              >
                Features
              </a>
              <a
                onClick={() => {
                  setMenuOpen(false);
                  goTo("pricing");
                }}
              >
                Pricing
              </a>
              <a
                onClick={() => {
                  setMenuOpen(false);
                  goTo("partner");
                }}
              >
                Partnership
              </a>
              <a
                onClick={() => {
                  setMenuOpen(false);
                  setWebView("contact");
                  window.scrollTo({ top: 0 });
                }}
              >
                Contact
              </a>
              <a
                onClick={() => {
                  setMenuOpen(false);
                  setAuthModal("login");
                }}
              >
                Login
              </a>
              <button
                className="btn sm"
                onClick={() => {
                  setMenuOpen(false);
                  setAuthModal("signup");
                }}
              >
                Get started
              </button>
            </div>
          )}
          {LEGAL_PAGES[webView] ? (
            (() => {
              const lp = LEGAL_PAGES[webView];
              return (
                <section className="legal">
                  <div className="legal-badge">{lp.badge}</div>
                  <h1 className="legal-h disp">{lp.title}</h1>
                  <div className="legal-date">Last updated: {lp.updated}</div>
                  <div className="legal-panel">
                    {lp.sections.map((s, i) => (
                      <div key={i}>
                        {s.h && <h2 className="legal-sub">{s.h}</h2>}
                        <p className="legal-p">{s.p}</p>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })()
          ) : webView === "blog" ? (
            <>
              <section className="blog-list">
                <h1 className="blog-h disp">Blog</h1>
                <p className="blog-lead">
                  Field notes on delivering film like a studio — review,
                  feedback, and handoff done right.
                </p>
                <div className="blog-grid">
                  <article
                    className="blog-card"
                    onClick={() => {
                      setWebView("blogpost");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <div
                      className="blog-card-img"
                      style={{ backgroundImage: `url(${BLOG_COVER})` }}
                    />
                    <h3>
                      How to deliver films like a studio: review, approve &amp;
                      hand off in one link
                    </h3>
                    <p className="blog-card-meta">Guide · 6 min read</p>
                    <button className="btn sm">
                      Read blog <ArrowRight size={14} />
                    </button>
                  </article>
                </div>
              </section>
            </>
          ) : webView === "blogpost" ? (
            <>
              <article className="post">
                <button
                  className="post-back"
                  onClick={() => {
                    setWebView("blog");
                    window.scrollTo({ top: 0 });
                  }}
                >
                  <ArrowRight
                    size={14}
                    style={{ transform: "rotate(180deg)" }}
                  />{" "}
                  All posts
                </button>
                <h1 className="post-h disp">
                  How to deliver films like a studio: review, approve &amp; hand
                  off in one link
                </h1>
                <div
                  className="post-cover"
                  style={{ backgroundImage: `url(${BLOG_COVER})` }}
                />
                <p className="post-lead">
                  <b>The short version:</b> to hand clients a studio-grade
                  experience, stop sending bare download links. A real delivery
                  flow lets clients stream instant-playback previews, leave
                  time-stamped comments, approve each cut, and only unlocks the
                  full-quality masters once you're ready — all under your own
                  brand, alongside a portfolio that keeps winning the next job.
                </p>

                <p className="post-p">
                  You spent years on your craft — the gear, the grade, the edit.
                  Then the final step arrives: getting the work to the client.
                  For a lot of filmmakers this is where the premium experience
                  falls apart. Dropping a pristine export into a generic cloud
                  folder strips the polish right off your work. Worse, most
                  "delivery" tools stop at exactly that: a link to download a
                  file. No review. No feedback. No sign-off. No home for your
                  best work.
                </p>

                <h2 className="post-sub">
                  Delivery is more than a download link
                </h2>
                <p className="post-p">
                  Plenty of tools will host a file and hand over a URL. That's
                  the floor, not the ceiling. The moment a client wants to say
                  "love it, but tighten the intro," a plain link falls apart —
                  now you're back in email threads and screenshots trying to
                  figure out which second they meant. CineSpace was built for
                  the whole loop, not just the last step.
                </p>

                <h2 className="post-sub">
                  Let clients review, not just receive
                </h2>
                <p className="post-p">
                  Give clients an instant, zero-buffer preview that plays back
                  cleanly on a phone between meetings — no massive download just
                  to watch a draft. Then let them actually respond:{" "}
                  <b>time-stamped comments</b> pinned to the exact frame, so
                  feedback is precise instead of vague. Every note lives on the
                  clip it belongs to.
                </p>

                <h2 className="post-sub">Approvals that lock the sign-off</h2>
                <p className="post-p">
                  Each version gets an explicit <b>approve</b> — per asset or
                  the whole project at once. You always know what's signed off
                  and what's still in review, and the client knows their
                  feedback landed. When it's approved, it's locked, and
                  everyone's on the same page. That's something a raw download
                  link simply can't do.
                </p>

                <h2 className="post-sub">
                  Protect the work until you're ready
                </h2>
                <p className="post-p">
                  Keep a delivery behind a passphrase, set links to expire, and
                  get notified the moment a client comments or downloads. Hand
                  over the full-bitrate masters on your terms — not the instant
                  a link leaves your outbox.
                </p>

                <h2 className="post-sub">
                  Give your work a home, not just a handoff
                </h2>
                <p className="post-p">
                  Delivery tools forget one thing: the work that wins the{" "}
                  <i>next</i> job. CineSpace pairs client delivery with a{" "}
                  <b>portfolio page</b> — a clean, branded showcase of your
                  films, stills, and full projects. One place that both delivers
                  today's cut and sells tomorrow's booking. Most delivery-only
                  tools have nothing like it.
                </p>

                <h2 className="post-sub">Your brand, front and center</h2>
                <p className="post-p">
                  Your logo, your accent colour, your name on every page the
                  client sees. Clients experience your studio — not the
                  software. That white-labeled polish is what turns a file
                  transfer into an experience worth paying premium for.
                </p>

                <p className="post-p">
                  High-end clients aren't just paying for a video file — they're
                  paying for the experience around it. When review, feedback,
                  approvals, protection, and a portfolio all live in one branded
                  space, your packaging finally matches your price tag.
                </p>

                <button
                  className="btn post-cta"
                  onClick={() => setAuthModal("signup")}
                >
                  Try CineSpace for free <ArrowRight size={16} />
                </button>
              </article>
            </>
          ) : webView === "contact" ? (
            <>
              <section className="contact-view">
                <h1 className="ct-h disp">
                  Let's make
                  <br />
                  something <span className="acc">great</span>
                </h1>
                <p className="ct-lead">
                  Questions, feedback, or a project in mind? Drop us a line and
                  a real person from the CineSpace team will get back to you.
                </p>
                <div className="ct-partner">
                  <h4>Exploring a partnership?</h4>
                  <p>
                    If you'd like to collaborate with CineSpace or bring us to
                    your community, our partner program has a home of its own.
                  </p>
                  <button
                    className="ct-partner-link"
                    onClick={() => goTo("partner")}
                  >
                    See partnership opportunities <ArrowRight size={14} />
                  </button>
                </div>
                <div className="ct-form">
                  <h3 className="disp">Send us a message</h3>
                  <div className="ff">
                    <label>Full name</label>
                    <input placeholder="Your name" />
                  </div>
                  <div className="ff">
                    <label>Email address</label>
                    <input placeholder="you@studio.com" />
                  </div>
                  <div className="ff">
                    <label>Reason for inquiry</label>
                    <select defaultValue="">
                      <option value="" disabled>
                        Select a reason
                      </option>
                      <option>General question</option>
                      <option>Technical support</option>
                      <option>Billing &amp; plans</option>
                      <option>Feature request</option>
                      <option>Press &amp; partnerships</option>
                    </select>
                  </div>
                  <div className="ff">
                    <label>Message</label>
                    <textarea
                      rows={5}
                      placeholder="Tell us what's on your mind…"
                    />
                  </div>
                  <button
                    className="btn"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      marginTop: 6,
                    }}
                    onClick={() =>
                      flash("Message sent — we'll be in touch soon!")
                    }
                  >
                    Send message
                  </button>
                </div>
              </section>
            </>
          ) : (
            <>
              <header className="hero split">
                <div className="hero-copy">
                  <button
                    className="hero-badge"
                    onClick={() => goTo("partner")}
                  >
                    <Star size={12} />
                    Partner program — applications open
                  </button>
                  <h1 className="disp">
                    Deliver films
                    <br />
                    like a <span className="acc">studio</span>.
                  </h1>
                  <p>
                    Your portfolio, client review, and delivery — in one place,
                    built for filmmakers in the Gulf.
                  </p>
                  <div className="row">
                    <button
                      className="btn"
                      onClick={() => setAuthModal("signup")}
                    >
                      Start for free <ArrowRight size={16} />
                    </button>
                    <button
                      className="btn ghost"
                      onClick={() => setSurface("client")}
                    >
                      See a delivery
                    </button>
                  </div>
                </div>
                <div className="hero-photo">
                  <img src={IMG_HERO} alt="CineSpace on a phone" />
                </div>
              </header>
              <div className="trust">
                <b>Trusted by</b> Lost in Tokyo · Clean Performance · Prestige
                Rentals · Seen Couture
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
                    <h3>A portfolio that sells</h3>
                    <p>
                      A clean, branded page for your best work — your shop
                      window, always up to date.
                    </p>
                  </div>
                  <div className="feat">
                    <div className="ic">
                      <MessageCircle size={20} />
                    </div>
                    <h3>Review & approve</h3>
                    <p>
                      Clients watch, comment, and approve each cut. Every
                      version tracked, every sign-off locked.
                    </p>
                  </div>
                  <div className="feat">
                    <div className="ic">
                      <Send size={20} />
                    </div>
                    <h3>Deliver on WhatsApp</h3>
                    <p>
                      Send private links your clients open in one tap — no
                      accounts, no friction.
                    </p>
                  </div>
                  <div className="feat">
                    <div className="ic">
                      <Lock size={20} />
                    </div>
                    <h3>Password-protected links</h3>
                    <p>
                      Lock any delivery behind a password — only the people you
                      choose can open it.
                    </p>
                  </div>
                  <div className="feat">
                    <div className="ic">
                      <Pencil size={20} />
                    </div>
                    <h3>Custom branding</h3>
                    <p>
                      Your logo, your colours. Clients see your studio — not
                      ours.
                    </p>
                  </div>
                  <div className="feat">
                    <div className="ic">
                      <Check size={20} />
                    </div>
                    <h3>Ad-free</h3>
                    <p>
                      No ads, ever. Just your films, clean and distraction-free.
                    </p>
                  </div>
                </div>
              </section>

              <section className="section reveal">
                <h2 className="sec-h disp">
                  How it <span className="acc">works</span>
                </h2>
                <p className="sec-sub">
                  From footage to sign-off in three steps.
                </p>
                <div className="steps">
                  <div className="step">
                    <div
                      className="stepimg"
                      style={{ backgroundImage: `url(${SHOT_UPLOAD})` }}
                    />
                    <div className="n">01</div>
                    <h3>Upload your cut</h3>
                    <p>
                      Drop in a film. We handle the hosting, transcoding, and
                      smooth playback.
                    </p>
                  </div>
                  <div className="step">
                    <div
                      className="stepimg"
                      style={{ backgroundImage: `url(${SHOT_LINK})` }}
                    />
                    <div className="n">02</div>
                    <h3>Share a private link</h3>
                    <p>
                      Send it on WhatsApp. Your client opens it instantly — no
                      login, no app.
                    </p>
                  </div>
                  <div className="step">
                    <div
                      className="stepimg"
                      style={{ backgroundImage: `url(${SHOT_APPROVE})` }}
                    />
                    <div className="n">03</div>
                    <h3>Get approved & paid</h3>
                    <p>
                      Clients comment and approve the final cut, and you deliver
                      the finished files.
                    </p>
                  </div>
                </div>
              </section>

              <section className="featsec reveal">
                <div className="fs-text">
                  <div className="eyebrow">Feature 01</div>
                  <h2 className="disp">
                    A portfolio that <span className="acc">sells</span>.
                  </h2>
                  <p>
                    Your best work, always ready to share. A clean, branded page
                    you can send to any lead in a tap — no PDFs, no WeTransfer
                    links, no clutter.
                  </p>
                </div>
                <div className="fs-visual">
                  <div className="mini-grid">
                    <div
                      className="mini-tile"
                      style={{
                        backgroundImage: `linear-gradient(rgba(0,0,0,.15),rgba(0,0,0,.35)), url(${IMG_CONCERT})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      <Play size={14} />
                    </div>
                    <div
                      className="mini-tile"
                      style={{
                        backgroundImage: `linear-gradient(rgba(0,0,0,.15),rgba(0,0,0,.35)), url(${IMG_CITY})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      <Play size={14} />
                    </div>
                    <div
                      className="mini-tile"
                      style={{
                        backgroundImage: `linear-gradient(rgba(0,0,0,.15),rgba(0,0,0,.35)), url(${IMG_CAR})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      <Play size={14} />
                    </div>
                    <div
                      className="mini-tile"
                      style={{
                        backgroundImage: `linear-gradient(rgba(0,0,0,.15),rgba(0,0,0,.35)), url(${IMG_FASHION})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
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
                  <h2 className="disp">
                    Review &amp; <span className="acc">approve</span>.
                  </h2>
                  <p>
                    Feedback without the chaos. Clients watch each cut, leave
                    notes, and compare versions — and every approval is
                    timestamped and locks that version.
                  </p>
                </div>
                <div className="fs-visual">
                  <div
                    className="mini-player"
                    style={{
                      backgroundImage: `linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.4)), url(${IMG_MEETING})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
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
                  <h2 className="disp">
                    Deliver on <span className="acc">WhatsApp</span>.
                  </h2>
                  <p>
                    Meet clients where they already are. Send a private link
                    over WhatsApp — they open it in one tap, no account, no app.
                    You're notified the moment they comment or approve.
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
                    comments in one place, and a single tap to approve. No
                    clutter, no confusion.
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
                  "CineSpace replaced three tools. My clients approve faster,
                  and every page looks like it came from a real studio."
                </p>
                <div className="by">— A filmmaker in Dubai</div>
              </section>

              <section id="pricing" className="section reveal">
                <div className="sec-eyebrow">
                  Prices that suit every filmmaker
                </div>

                <h2 className="sec-h disp">
                  Pay as you <span className="acc">go</span>
                </h2>

                <p className="sec-sub">
                  Priced in USD · free to start · cancel anytime.
                </p>

                <div
                  className="billtoggle"
                  style={{ "--pill-i": billing === "yearly" ? 1 : 0 }}
                >
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
                    Yearly <span>Save 25%</span>
                  </button>
                </div>

                <div className="plans">
                  {[
                    {
                      n: "Starter",
                      p: "0",
                      pop: false,
                      f: [
                        "Portfolio page (up to 4 videos)",
                        "2 GB video storage",
                        "1 client delivery link",
                        "Review, comments & approvals",
                      ],
                    },
                    {
                      n: "Basic",
                      p: "12",
                      pop: false,
                      f: [
                        "Full portfolio page",
                        "100 GB video storage",
                        "20 client delivery links",
                        "Review, comments & approvals",
                        "WhatsApp delivery",
                        "English only",
                      ],
                    },
                    {
                      n: "Pro",
                      p: "29",
                      pop: true,
                      f: [
                        "Everything in Basic, plus:",
                        "500 GB video storage",
                        "Unlimited client delivery links",
                        "Password-protected links",
                        "Watermark media",
                        "Arabic + English",
                        "Your logo & colours",
                        "File download notifications",
                        "Priority support",
                        "Access to THE SILO",
                      ],
                    },
                    {
                      n: "Studio",
                      p: "69",
                      pop: false,
                      f: [
                        "Everything in Pro, plus:",
                        "2 TB video storage",
                        "5 team seats",
                        "White-label (remove CineSpace)",
                      ],
                    },
                  ].map((pl) => (
                    <div key={pl.n} className={`plan ${pl.pop ? "pop" : ""}`}>
                      {pl.pop && <span className="tag">Most popular</span>}

                      <div className="pname disp">{pl.n}</div>

                      <div className="price disp">
                        {pl.p === "0" ? (
                          "Free"
                        ) : (
                          <>
                            $
                            {billing === "yearly"
                              ? Math.round(Number(pl.p) * 0.75)
                              : pl.p}
                            <small> /mo</small>
                          </>
                        )}
                      </div>

                      {billing === "yearly" && pl.p !== "0" && (
                        <div className="billnote">billed yearly · save 25%</div>
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
                        className={"btn" + (pl.pop ? "" : " white")}
                        style={{
                          width: "100%",
                          justifyContent: "center",
                          marginTop: 20,
                        }}
                        onClick={() => setSurface("backend")}
                      >
                        Choose {pl.n}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="cmp-wrap">
                  <h3 className="cmp-title disp">
                    Compare our <span className="acc">packages</span>
                  </h3>

                  <div className="cmp-scroll">
                    <table className="cmp">
                      <thead>
                        <tr>
                          <th></th>
                          <th>Starter</th>
                          <th>Basic</th>
                          <th className="me">Pro</th>
                          <th>Studio</th>
                        </tr>
                      </thead>

                      <tbody>
                        <tr>
                          <td>Price</td>
                          <td>Free</td>
                          <td>$12/mo</td>
                          <td className="me">$29/mo</td>
                          <td>$69/mo</td>
                        </tr>

                        <tr>
                          <td>Video storage</td>
                          <td>2 GB</td>
                          <td>100 GB</td>
                          <td className="me">500 GB</td>
                          <td>2 TB</td>
                        </tr>

                        <tr>
                          <td>Client delivery links</td>
                          <td>1</td>
                          <td>20</td>
                          <td className="me">Unlimited</td>
                          <td>Unlimited</td>
                        </tr>

                        <tr>
                          <td>Portfolio page</td>
                          <td>Up to 4 videos</td>
                          <td>Full</td>
                          <td className="me">Full</td>
                          <td>Full</td>
                        </tr>

                        <tr>
                          <td>Review, comments &amp; approvals</td>
                          <td>
                            <Check size={15} />
                          </td>
                          <td>
                            <Check size={15} />
                          </td>
                          <td className="me">
                            <Check size={15} />
                          </td>
                          <td>
                            <Check size={15} />
                          </td>
                        </tr>

                        <tr>
                          <td>WhatsApp delivery</td>
                          <td>—</td>
                          <td>
                            <Check size={15} />
                          </td>
                          <td className="me">
                            <Check size={15} />
                          </td>
                          <td>
                            <Check size={15} />
                          </td>
                        </tr>

                        <tr>
                          <td>Languages</td>
                          <td>English</td>
                          <td>English</td>
                          <td className="me">Arabic + English</td>
                          <td>Arabic + English</td>
                        </tr>

                        <tr>
                          <td>Password-protected links</td>
                          <td>—</td>
                          <td>—</td>
                          <td className="me">
                            <Check size={15} />
                          </td>
                          <td>
                            <Check size={15} />
                          </td>
                        </tr>

                        <tr>
                          <td>Watermark media</td>
                          <td>—</td>
                          <td>—</td>
                          <td className="me">
                            <Check size={15} />
                          </td>
                          <td>
                            <Check size={15} />
                          </td>
                        </tr>

                        <tr>
                          <td>Your logo &amp; colours</td>
                          <td>—</td>
                          <td>—</td>
                          <td className="me">
                            <Check size={15} />
                          </td>
                          <td>
                            <Check size={15} />
                          </td>
                        </tr>

                        <tr>
                          <td>Download notifications</td>
                          <td>—</td>
                          <td>—</td>
                          <td className="me">
                            <Check size={15} />
                          </td>
                          <td>
                            <Check size={15} />
                          </td>
                        </tr>

                        <tr>
                          <td>Priority support</td>
                          <td>—</td>
                          <td>—</td>
                          <td className="me">
                            <Check size={15} />
                          </td>
                          <td>
                            <Check size={15} />
                          </td>
                        </tr>

                        <tr>
                          <td>The Silo (cold archive)</td>
                          <td>—</td>
                          <td>—</td>
                          <td className="me">
                            <Check size={15} />
                          </td>
                          <td>
                            <Check size={15} />
                          </td>
                        </tr>

                        <tr>
                          <td>Team seats</td>
                          <td>—</td>
                          <td>—</td>
                          <td className="me">—</td>
                          <td>5</td>
                        </tr>

                        <tr>
                          <td>White-label</td>
                          <td>—</td>
                          <td>—</td>
                          <td className="me">—</td>
                          <td>
                            <Check size={15} />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="cmp-note">
                    Every plan includes hosting, transcoding, and secure client
                    links.
                  </p>
                </div>
              </section>

              <section className="vault reveal">
                <div className="vault-badge">
                  <Lock size={13} /> Secure archive
                </div>
                <h2 className="vault-h disp">The Silo</h2>
                <p className="vault-sub">
                  Delivered a project? Move it to The Silo — secure cold storage
                  that frees up your active space, and pulls back the moment a
                  client returns.
                </p>
                <div className="vault-price disp">
                  1 TB <span style={{ color: "var(--faint)" }}>·</span>{" "}
                  <span className="acc">$79/yr</span>
                </div>
                <div className="vault-cards">
                  <div className="vault-card">
                    <div className="vault-ic">
                      <Film size={18} />
                    </div>
                    <h4>Free up your space</h4>
                    <p>
                      Archive finished, client-approved work so your active
                      storage stays clear for new projects.
                    </p>
                  </div>
                  <div className="vault-card">
                    <div className="vault-ic">
                      <Lock size={18} />
                    </div>
                    <h4>Safe for the long haul</h4>
                    <p>
                      Your deliverables sit in secure long-term storage —
                      nothing lost, nothing expiring.
                    </p>
                  </div>
                  <div className="vault-card">
                    <div className="vault-ic">
                      <Clock size={18} />
                    </div>
                    <h4>Restore anytime</h4>
                    <p>
                      Need it back? Pull a project out of The Silo in 24–48
                      hours, ready to re-deliver.
                    </p>
                  </div>
                </div>
                <p className="vault-note">
                  On Pro & Studio · $79/yr per TB · restore in 24–48h.
                </p>
              </section>

              <section id="partner" className="partner reveal">
                <div className="pt-badge">
                  <Star size={12} /> The CineSpace Partnership
                </div>
                <h2 className="pt-h disp">
                  Partner with <span className="acc">us</span>
                </h2>
                <p className="pt-sub">
                  Help your audience deliver like a studio. Partner with
                  CineSpace to give your community a premium client-delivery
                  workflow — and earn for your influence.
                </p>
                <div className="pt-cards">
                  <div className="pt-card">
                    <div className="pt-ic">
                      <Film size={20} />
                    </div>
                    <h4>Creator access</h4>
                    <p>
                      Get the <b>Studio plan (2 TB)</b> free for 12 months.
                      Build your own client galleries, remove CineSpace
                      branding, and use it across your workflow and tutorials.
                    </p>
                  </div>
                  <div className="pt-card">
                    <div className="pt-ic">
                      <Share2 size={20} />
                    </div>
                    <h4>Share the workflow</h4>
                    <p>
                      Feature CineSpace in your videos, editing tutorials, or
                      behind-the-scenes — and earn a <b>commission</b> for every
                      creator you bring in.
                    </p>
                  </div>
                  <div className="pt-card">
                    <div className="pt-ic">
                      <ArrowRight size={20} />
                    </div>
                    <h4>Grow together</h4>
                    <p>
                      Keep inspiring your community and driving sign-ups, and
                      your Studio plan <b>auto-renews free</b>, indefinitely.
                    </p>
                  </div>
                  <div className="pt-card">
                    <div className="pt-ic">
                      <Star size={20} />
                    </div>
                    <h4>The community gift</h4>
                    <p>
                      Give your followers an exclusive discount — a{" "}
                      <b>free month of any plan</b> with your own promo code.
                    </p>
                  </div>
                </div>
                <div className="pt-form">
                  <h3 className="disp">Application form</h3>
                  <div className="ff">
                    <label>Full name *</label>
                    <input placeholder="Your name" />
                  </div>
                  <div className="ff">
                    <label>Email address *</label>
                    <input placeholder="you@email.com" />
                  </div>
                  <div className="ff2">
                    <div className="ff">
                      <label>Primary platform *</label>
                      <select defaultValue="">
                        <option value="" disabled>
                          Select platform
                        </option>
                        <option>YouTube</option>
                        <option>Instagram</option>
                        <option>TikTok</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="ff">
                      <label>Social handle *</label>
                      <input placeholder="@yourhandle" />
                    </div>
                  </div>
                  <div className="ff">
                    <label>Portfolio / work examples *</label>
                    <input placeholder="Link to your work" />
                  </div>
                  <div className="ff">
                    <label>Other relevant links</label>
                    <input placeholder="Anything else" />
                  </div>
                  <div className="ff">
                    <label>Why do you want to partner with us?</label>
                    <textarea
                      rows={3}
                      placeholder="Tell us about your audience..."
                    />
                  </div>
                  <label className="pt-check">
                    <input type="checkbox" />
                    <span>
                      I understand the partnership includes 12 months of Studio
                      access, with a review near the end of the term based on
                      content engagement and referrals.
                    </span>
                  </label>
                  <button
                    className="btn"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      marginTop: 16,
                    }}
                    onClick={() =>
                      flash("Application submitted — we will be in touch!")
                    }
                  >
                    Submit application
                  </button>
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
                            transform:
                              faqOpen === i ? "rotate(180deg)" : "none",
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
                  backgroundImage: `linear-gradient(rgba(var(--acc-rgb),.72),rgba(122,33,9,.90)), url(${IMG_CTA})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="grain" />
                <h2 className="disp" style={{ color: "white" }}>
                  Start delivering
                  <br />
                  like a studio.
                </h2>
                <button
                  className="btn"
                  style={{ marginTop: 24 }}
                  onClick={() => setAuthModal("signup")}
                >
                  Get started <ArrowRight size={16} />
                </button>
              </section>
            </>
          )}
          <footer className="sitefoot">
            <div className="sitefoot-main">
              <div className="sitefoot-brand">
                <img
                  className="logo-img"
                  src={LOGO_SRC}
                  alt="CineSpace"
                  onClick={scrollTop}
                  style={{ cursor: "pointer" }}
                />
                <p className="sitefoot-tag">
                  The home for filmmakers who take delivery seriously. CineSpace
                  turns your portfolio, client review, and final handoff into
                  one branded link — no scattered folders, no WeTransfer
                  clutter.
                </p>
                <div className="sitefoot-social">
                  <a aria-label="Instagram" onClick={() => flash("Instagram")}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <rect x="2" y="2" width="20" height="20" rx="5.5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle
                        cx="17.5"
                        cy="6.5"
                        r="1.2"
                        fill="currentColor"
                        stroke="none"
                      />
                    </svg>
                  </a>
                  <a aria-label="TikTok" onClick={() => flash("TikTok")}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.5 3c.3 2.2 1.6 3.7 3.7 3.9v2.5c-1.3.1-2.5-.2-3.7-.9v5.6c0 3.4-2.6 5.9-6 5.4-2.6-.4-4.3-2.6-4.1-5.3.2-2.5 2.4-4.4 4.9-4.2.3 0 .5.1.8.1v2.6c-.3-.1-.6-.2-.9-.2-1.1-.1-2.1.7-2.2 1.8-.1 1.1.7 2.1 1.9 2.1 1.1.1 2.1-.8 2.1-2V3h2.6z" />
                    </svg>
                  </a>
                  <a aria-label="Facebook" onClick={() => flash("Facebook")}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z" />
                    </svg>
                  </a>
                  <a aria-label="X" onClick={() => flash("X")}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.2 2.3h3.3l-7.2 8.2 8.5 11.2h-6.7l-5.2-6.8-6 6.8H1.6l7.7-8.8L1 2.3h6.8l4.7 6.2 5.7-6.2zm-1.2 17.6h1.8L7.1 4.1H5.2l11.8 15.8z" />
                    </svg>
                  </a>
                  <a aria-label="YouTube" onClick={() => flash("YouTube")}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23 12s0-3.2-.4-4.7c-.2-.8-.9-1.5-1.7-1.7C19.4 5.2 12 5.2 12 5.2s-7.4 0-8.9.4c-.8.2-1.5.9-1.7 1.7C1 8.8 1 12 1 12s0 3.2.4 4.7c.2.8.9 1.5 1.7 1.7 1.5.4 8.9.4 8.9.4s7.4 0 8.9-.4c.8-.2 1.5-.9 1.7-1.7.4-1.5.4-4.7.4-4.7zM9.8 15.3V8.7l5.7 3.3-5.7 3.3z" />
                    </svg>
                  </a>
                </div>
              </div>
              <div className="sitefoot-cols">
                <div className="sitefoot-col">
                  <div className="sitefoot-h">Product</div>
                  <a onClick={() => goTo("features")}>Features</a>
                  <a onClick={() => goTo("pricing")}>Pricing</a>
                  {/* <a onClick={() => flash("Roadmap — coming soon")}>Roadmap</a> */}
                  <a onClick={() => setSurface("waitlist")}>Waitlist</a>
                </div>
                <div className="sitefoot-col">
                  <div className="sitefoot-h">Company</div>
                  {/* <a onClick={() => flash("About — coming soon")}>About</a> */}
                  <a onClick={() => goTo("partner")}>Partnerships</a>
                  <a
                    onClick={() => {
                      setWebView("contact");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Contact
                  </a>
                  <a
                    onClick={() => {
                      setWebView("blog");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Blog
                  </a>
                </div>
              </div>
            </div>
            <div className="sitefoot-bar">
              <span>© 2026 CineSpace. Made for filmmakers.</span>
              <div className="sitefoot-legal">
                <a
                  onClick={() => {
                    setWebView("copyright");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Copyright
                </a>
                <a
                  onClick={() => {
                    setWebView("privacy");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Privacy
                </a>
                <a
                  onClick={() => {
                    setWebView("terms");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Terms
                </a>
                <a
                  onClick={() => {
                    setWebView("cookies");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Cookies
                </a>
                <a
                  onClick={() => {
                    setWebView("refunds");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Refunds
                </a>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* ===================== FILMMAKER PUBLIC PAGE ===================== */}
      {surface === "public" && (
        <div className="wrap anim-in" style={accentVars}>
          <nav className="topnav pubnav pubnav-solo">
            {logo ? (
              <img className="brandlogo" src={logo} alt={brandName} />
            ) : (
              <span className="logo">
                {brandName}
                <span className="d">.</span>
              </span>
            )}
            <button
              className="btn sm"
              onClick={() => flash("Opening WhatsApp…")}
            >
              Get in touch
            </button>
          </nav>

          {pubTab === "work" && (
            <>
              <div
                className="showreel"
                style={{
                  background:
                    "url(" + SHOWREEL_IMG + ") center/cover no-repeat",
                }}
              >
                <div
                  className="bigplay"
                  onClick={() => flash("Playing showreel…")}
                >
                  <Play size={26} />
                </div>
                <span className="rl-tc">{pinned.tc}</span>
              </div>
              <div className="workhead">
                <div className="eyebrow">Our portfolio</div>
                <h2 className="disp">Latest work</h2>
              </div>
              <div className="pf-slider">
                <div
                  className="pf-seg"
                  style={{
                    "--pill-i": { films: 0, stills: 1, projects: 2 }[pfCat],
                  }}
                >
                  {[
                    ["films", "Films"],
                    ["stills", "Stills"],
                    ["projects", "Projects"],
                  ].map(([k, l]) => (
                    <button
                      key={k}
                      className={pfCat === k ? "on" : ""}
                      onClick={() => setPfCat(k)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {pfCat === "films" && (
                <PfGrid
                  items={pfAssets.filter((a) => a.kind === "film")}
                  onItem={(a) => flash("Playing " + a.title + "…")}
                />
              )}
              {pfCat === "stills" && (
                <PfGrid
                  items={pfAssets.filter((a) => a.kind === "still")}
                  onItem={(a) => flash("Viewing " + a.title)}
                />
              )}
              {pfCat === "projects" && (
                <div className={"grid sz-" + pageView.size.toLowerCase()}>
                  {pfProjects.map((pr) => (
                    <PfProjectCard
                      key={pr.id}
                      proj={pr}
                      onOpen={() => setPfOpen(pr.id)}
                    />
                  ))}
                </div>
              )}
              <div className="about-me banner">
                <div
                  className="am-portrait"
                  style={{ backgroundImage: `url(${IMG_ABOUT})` }}
                />
                <div className="am-text">
                  <div className="eyebrow">About</div>
                  <div className="am-name">
                    <h2 className="disp">{brandName}</h2>
                  </div>
                  <p>{aboutDesc}</p>
                  <div className="am-stats">
                    <div className="am-stat">
                      <Film size={15} className="ic" />
                      <b className="disp">{statProjects}</b>
                      <span>Films delivered</span>
                    </div>
                    <div className="am-stat">
                      <Briefcase size={15} className="ic" />
                      <b className="disp">{statYears} yrs</b>
                      <span>Experience</span>
                    </div>
                    <div className="am-stat">
                      <MapPin size={15} className="ic" />
                      <b className="disp">{statBased}</b>
                      <span>Based</span>
                    </div>
                  </div>
                  <div className="am-cta">
                    <button className="btn sm" onClick={openWhatsApp}>
                      <MessageCircle size={16} />
                      Get in touch
                    </button>
                  </div>
                </div>
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
                    <b className="disp">{statProjects}</b>
                    <span>Films delivered</span>
                  </div>
                  <div>
                    <b className="disp">{statYears} yrs</b>
                    <span>Experience</span>
                  </div>
                  <div>
                    <b className="disp">{statBased}</b>
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
              <div className={"grid sz-" + pageView.size.toLowerCase()}>
                {projects
                  .filter((p) => p.status === "delivered")
                  .map((p) => (
                    <Card
                      key={p.id}
                      p={p}
                      view={pageView}
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
        <div
          className="wrap anim-in"
          style={{ "--acc": accent, ...accentVars }}
        >
          <div className="dashtop">
            <div className="dashbrand">
              <img className="logo-img" src={LOGO_SRC} alt="CineSpace" />
              <span className="dashbrand-t">Dashboard</span>
            </div>
            <div className="dashtop-r">
              <button
                className="btn sm livebtn"
                onClick={() => setSurface("public")}
              >
                <Play size={14} />
                Live Preview
              </button>
              <button
                className="avatar avatar-btn"
                onClick={() => setProfMenu((v) => !v)}
              >
                PC
              </button>
              {profMenu && (
                <div className="pdrop" onClick={(e) => e.stopPropagation()}>
                  <div className="pdrop-id">
                    <span className="avatar">PC</span>
                    <div>
                      <div className="pd-nm">{brandName}</div>
                      <div className="pd-em">pedro@cinespace.film</div>
                      <span className="pd-pill">Studio plan</span>
                    </div>
                  </div>
                  <a
                    onClick={() => {
                      setProfMenu(false);
                      setDashNav("profile");
                    }}
                  >
                    <span className="pd-ic">
                      <Pencil size={15} />
                    </span>
                    Profile
                  </a>
                  <a
                    onClick={() => {
                      setProfMenu(false);
                      setDashNav("subscription");
                    }}
                  >
                    <span className="pd-ic">
                      <Star size={15} />
                    </span>
                    Subscription
                  </a>
                  <a
                    onClick={() => {
                      setProfMenu(false);
                      setDashNav("billing");
                    }}
                  >
                    <span className="pd-ic">
                      <Download size={15} />
                    </span>
                    Billing
                  </a>
                  <a
                    onClick={() => {
                      setProfMenu(false);
                      setDashNav("security");
                    }}
                  >
                    <span className="pd-ic">
                      <Lock size={15} />
                    </span>
                    Security
                  </a>
                  <a
                    onClick={() => {
                      setProfMenu(false);
                      setDashNav("help");
                    }}
                  >
                    <span className="pd-ic">
                      <MessageCircle size={15} />
                    </span>
                    Help
                  </a>
                  <div className="pd-sep" />
                  <a
                    className="pd-danger"
                    onClick={() => {
                      setProfMenu(false);
                      setSurface("website");
                    }}
                  >
                    <span className="pd-ic">
                      <ArrowRight size={15} />
                    </span>
                    Log out
                  </a>
                </div>
              )}
            </div>
          </div>
          {profMenu && (
            <div className="pdrop-scrim" onClick={() => setProfMenu(false)} />
          )}

          <div className="dashsplit">
            <aside className="dashside">
              <p className="dash-intro">
                Your dashboard — manage your public page, client deliveries,
                storage, and account, all in one place.
              </p>
              <div
                className={
                  "navgroup" + (dashGroup === "Workspace" ? " open" : "")
                }
              >
                <button
                  className="side-grp"
                  onClick={() =>
                    setDashGroup((g) => (g === "Workspace" ? "" : "Workspace"))
                  }
                >
                  Workspace <ChevronDown size={15} className="grp-chev" />
                </button>
                <div className="navitems">
                  <button
                    className={"navi " + (dashNav === "profile" ? "on" : "")}
                    onClick={() => {
                      setDashNav("profile");
                      setOpenProj(null);
                    }}
                  >
                    <Pencil size={17} />
                    Profile
                  </button>
                  <button
                    className={"navi " + (dashNav === "portfolio" ? "on" : "")}
                    onClick={() => {
                      setDashNav("portfolio");
                      setOpenProj(null);
                    }}
                  >
                    <Film size={17} />
                    Portfolio
                  </button>
                  <button
                    className={"navi " + (dashNav === "deliveries" ? "on" : "")}
                    onClick={() => {
                      setDashNav("deliveries");
                      setOpenProj(null);
                    }}
                  >
                    <Link2 size={17} />
                    Client Deliveries
                  </button>
                  <button
                    className={"navi " + (dashNav === "storage" ? "on" : "")}
                    onClick={() => {
                      setDashNav("storage");
                      setOpenProj(null);
                    }}
                  >
                    <Upload size={17} />
                    Storage &amp; Usage
                  </button>
                </div>
              </div>
              <div
                className={
                  "navgroup" + (dashGroup === "Account" ? " open" : "")
                }
              >
                <button
                  className="side-grp"
                  onClick={() =>
                    setDashGroup((g) => (g === "Account" ? "" : "Account"))
                  }
                >
                  Account <ChevronDown size={15} className="grp-chev" />
                </button>
                <div className="navitems">
                  <button
                    className={"navi " + (dashNav === "branding" ? "on" : "")}
                    onClick={() => {
                      setDashNav("branding");
                      setOpenProj(null);
                    }}
                  >
                    <Pencil size={17} />
                    Add your branding
                  </button>
                  <button
                    className={
                      "navi " + (dashNav === "subscription" ? "on" : "")
                    }
                    onClick={() => {
                      setDashNav("subscription");
                      setOpenProj(null);
                    }}
                  >
                    <Star size={17} />
                    Subscription
                  </button>
                  <button
                    className={"navi " + (dashNav === "billing" ? "on" : "")}
                    onClick={() => {
                      setDashNav("billing");
                      setOpenProj(null);
                    }}
                  >
                    <Download size={17} />
                    Billing
                  </button>
                  <button
                    className={"navi " + (dashNav === "security" ? "on" : "")}
                    onClick={() => {
                      setDashNav("security");
                      setOpenProj(null);
                    }}
                  >
                    <Lock size={17} />
                    Security
                  </button>
                  <button
                    className={
                      "navi " + (dashNav === "notifications" ? "on" : "")
                    }
                    onClick={() => {
                      setDashNav("notifications");
                      setOpenProj(null);
                    }}
                  >
                    <MessageCircle size={17} />
                    Notifications
                  </button>
                </div>
              </div>
              <div
                className={
                  "navgroup" + (dashGroup === "Support" ? " open" : "")
                }
              >
                <button
                  className="side-grp"
                  onClick={() =>
                    setDashGroup((g) => (g === "Support" ? "" : "Support"))
                  }
                >
                  Support <ChevronDown size={15} className="grp-chev" />
                </button>
                <div className="navitems">
                  <button
                    className={"navi " + (dashNav === "help" ? "on" : "")}
                    onClick={() => {
                      setDashNav("help");
                      setOpenProj(null);
                    }}
                  >
                    <MessageCircle size={17} />
                    Help Center
                  </button>
                  <button
                    className={"navi " + (dashNav === "contact" ? "on" : "")}
                    onClick={() => {
                      setDashNav("contact");
                      setOpenProj(null);
                    }}
                  >
                    <Send size={17} />
                    Contact Us
                  </button>
                  <button
                    className={"navi " + (dashNav === "docs" ? "on" : "")}
                    onClick={() => {
                      setDashNav("docs");
                      setOpenProj(null);
                    }}
                  >
                    <Film size={17} />
                    Documentation
                  </button>
                </div>
              </div>
              <div className="side-sep" />
              <button
                className="navi danger"
                onClick={() => setSurface("website")}
              >
                <ArrowRight size={17} />
                Log out
              </button>
            </aside>
            <div className="dashmain">
              {openProj ? (
                (() => {
                  const p =
                    projects.find((x) => x.id === openProj) || projects[0];
                  return (
                    <>
                      <button
                        className="backlink"
                        onClick={() => {
                          setOpenProj(null);
                          setOpenAsset(null);
                        }}
                      >
                        <ArrowLeft size={15} />
                        Projects
                      </button>
                      <div className="dhero" style={{ background: p.g }}>
                        <div className="dhero-inner">
                          <div className="eyebrow">Editing · {p.client}</div>
                          <h1
                            className="dhero-title disp"
                            style={{ fontSize: "clamp(32px,6vw,60px)" }}
                          >
                            {p.title}
                          </h1>
                          <div className="dmeta">
                            <div>
                              <span>Status</span>
                              <b>
                                <Status s={p.status} />
                              </b>
                            </div>
                            <div>
                              <span>Assets</span>
                              <b>{assets.length}</b>
                            </div>
                            <div>
                              <span>Client approved</span>
                              <b className="acc">
                                {approvedCount}/{assets.length}
                              </b>
                            </div>
                          </div>
                          <div className="dbar-r" style={{ marginTop: 20 }}>
                            <button
                              className="btn sm"
                              onClick={() => setShareOpen(true)}
                            >
                              <Share2 size={15} />
                              Share a link
                            </button>
                            <button
                              className="btn ghost sm"
                              onClick={() =>
                                flash("Sent to client on WhatsApp")
                              }
                            >
                              <MessageCircle size={15} />
                              Send to client
                            </button>
                            <button
                              className="btn ghost sm"
                              onClick={() => setEditDelivery(p)}
                            >
                              <Pencil size={15} />
                              Edit delivery
                            </button>
                            <button
                              className="btn ghost sm"
                              onClick={() =>
                                flash(
                                  "Moved to The Silo — active storage freed",
                                )
                              }
                            >
                              <Lock size={15} />
                              Archive to The Silo
                            </button>
                          </div>
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
                            {approvedCount} of {assets.length} approved by
                            client
                          </span>
                        </div>
                        <button
                          className="btn sm"
                          onClick={() => {
                            addAsset();
                            startUpload();
                          }}
                        >
                          <Plus size={15} />
                          Upload asset
                        </button>
                      </div>
                      <div className="appr">
                        <div className="appr-top">
                          <span className="appr-title">
                            <Pencil size={15} />
                            Appearance
                          </span>
                          <span className="appr-note">
                            <Lock size={11} />
                            How your client sees this gallery
                          </span>
                        </div>
                        <div className="appr-row">
                          <span>Card size</span>
                          <div className="seg">
                            {["S", "M", "L"].map((o) => (
                              <button
                                key={o}
                                className={clientView.size === o ? "on" : ""}
                                onClick={() =>
                                  setClientView((v) => ({ ...v, size: o }))
                                }
                              >
                                {o}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="appr-row">
                          <span>Aspect ratio</span>
                          <div className="seg">
                            {["landscape", "square", "portrait", "mixed"].map(
                              (o) => (
                                <button
                                  key={o}
                                  className={clientView.ratio === o ? "on" : ""}
                                  onClick={() =>
                                    setClientView((v) => ({ ...v, ratio: o }))
                                  }
                                >
                                  {o === "mixed" ? (
                                    <span className="ar-mix" />
                                  ) : (
                                    <span className={"ar " + o} />
                                  )}
                                </button>
                              ),
                            )}
                          </div>
                        </div>
                        <div className="appr-row">
                          <span>Thumbnail scale</span>
                          <div className="seg">
                            {["fit", "fill"].map((o) => (
                              <button
                                key={o}
                                className={clientView.scale === o ? "on" : ""}
                                style={{ textTransform: "capitalize" }}
                                onClick={() =>
                                  setClientView((v) => ({ ...v, scale: o }))
                                }
                              >
                                {o}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="appr-row">
                          <span>Show card info</span>
                          <button
                            className={"tgl" + (clientView.info ? " on" : "")}
                            onClick={() =>
                              setClientView((v) => ({ ...v, info: !v.info }))
                            }
                          >
                            <span className="tgl-dot" />
                          </button>
                        </div>
                        <div className="appr-row">
                          <span>
                            Watermark media{" "}
                            <span className="pro-badge">Pro</span>
                          </span>
                          <button
                            className={"tgl" + (watermark ? " on" : "")}
                            onClick={() => setWatermark(!watermark)}
                          >
                            <span className="tgl-dot" />
                          </button>
                        </div>
                      </div>
                      <div className="dlib">
                        <div className="eyebrow">Deliverables</div>
                        <h2 className="dlib-h disp">Project assets</h2>
                        <div
                          className="dtabs"
                          style={{
                            "--pill-n": 3,
                            "--pill-i": { all: 0, video: 1, photo: 2 }[
                              assetTab
                            ],
                          }}
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
                            .filter(
                              (a) => assetTab === "all" || a.type === assetTab,
                            )
                            .map((a) => (
                              <div
                                key={a.id}
                                className={
                                  "acard" +
                                  (clientView.ratio === "mixed" ? " mason" : "")
                                }
                                onClick={() => {
                                  setOpenAsset(a.id);
                                  setAssetVer(
                                    a.versions[a.versions.length - 1],
                                  );
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
                                      {a.desc && (
                                        <div className="ci-desc">{a.desc}</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
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
                      {openAsset !== null &&
                        (() => {
                          const a = assets.find((x) => x.id === openAsset);
                          if (!a) return null;
                          return (
                            <div
                              className="overlay"
                              onClick={() => setOpenAsset(null)}
                            >
                              <div
                                className="asheet"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="asheet-head">
                                  <div>
                                    <div className="eyebrow">
                                      {a.type === "video" ? "Video" : "Photo"} ·{" "}
                                      {a.size}
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
                                  style={{ background: a.g }}
                                >
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
                                    const pct = Math.min(
                                      100,
                                      (playT / dur) * 100,
                                    );
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
                                                style={{
                                                  left:
                                                    (c.time / dur) * 100 + "%",
                                                }}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setPlayT(c.time);
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
                                  <button
                                    className="vchip vadd"
                                    onClick={() => delAddVersion(a.id)}
                                  >
                                    <Plus
                                      size={12}
                                      style={{
                                        marginRight: 5,
                                        verticalAlign: -1,
                                      }}
                                    />
                                    Upload new version
                                  </button>
                                </div>
                                <div className="vmanage-open">
                                  <div className="vmanage-h">
                                    Manage versions
                                  </div>
                                  {a.versions.map((v) => (
                                    <div key={v} className="vrow">
                                      {renameVer &&
                                      renameVer.id === a.id &&
                                      renameVer.v === v ? (
                                        <input
                                          className="vname-in"
                                          autoFocus
                                          defaultValue={v}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter")
                                              delRenameVersion(
                                                a.id,
                                                v,
                                                e.target.value,
                                              );
                                          }}
                                          onBlur={(e) =>
                                            delRenameVersion(
                                              a.id,
                                              v,
                                              e.target.value,
                                            )
                                          }
                                        />
                                      ) : (
                                        <>
                                          <span className="vname">{v}</span>
                                          <button
                                            onClick={() =>
                                              setRenameVer({ id: a.id, v })
                                            }
                                            title="Rename"
                                          >
                                            <Pencil size={13} />
                                          </button>
                                          {a.versions.length > 1 && (
                                            <button
                                              className="del"
                                              onClick={() =>
                                                delRemoveVersion(a.id, v)
                                              }
                                              title="Delete version"
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <div className="dactions">
                                  {a.approved ? (
                                    <span className="seal">
                                      <Check size={14} />
                                      Approved by client
                                    </span>
                                  ) : (
                                    <span className="pending">
                                      <Clock size={14} />
                                      Awaiting client approval
                                    </span>
                                  )}
                                  <button
                                    className="btn ghost"
                                    onClick={() => flash("Download started")}
                                  >
                                    <Download size={15} />
                                    Download
                                  </button>
                                </div>
                                <div className="cmts">
                                  <h4>Client comments</h4>
                                  {a.comments.length === 0 && (
                                    <p className="cmt-empty">
                                      No comments yet.
                                    </p>
                                  )}
                                  {a.comments.map((c, i) => (
                                    <Comment
                                      key={i}
                                      c={c}
                                      aid={a.id}
                                      idx={i}
                                      replyWho="me"
                                    />
                                  ))}
                                  <div className="cinput">
                                    <input
                                      value={reply}
                                      onChange={(e) => setReply(e.target.value)}
                                      placeholder="Reply to your client…"
                                      onKeyDown={(e) =>
                                        e.key === "Enter" && addAssetReply(a.id)
                                      }
                                    />
                                    <button onClick={() => addAssetReply(a.id)}>
                                      <Send size={16} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                    </>
                  );
                })()
              ) : (
                <>
                  {dashNav === "deliveries" && (
                    <>
                      <div className="pagehead">
                        <div>
                          <div className="eyebrow">Private workspace</div>
                          <h1 className="disp">Client deliveries</h1>
                          <p>
                            Create a project, upload cuts, send the delivery
                            link to your client, and follow up on comments and
                            approvals. Tap a project to open it.
                          </p>
                        </div>
                        <button
                          className="btn"
                          onClick={() => setShowAdd(true)}
                        >
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

                  {dashNav === "portfolio" && (
                    <>
                      <div className="pagehead">
                        <div>
                          <div className="eyebrow">Your public page</div>
                          <h1 className="disp">Portfolio</h1>
                          <p>
                            Manage the work potential clients see when they
                            visit your public Work and Portfolio pages.
                          </p>
                        </div>
                        <div className="upl-btns">
                          <button
                            className="btn ghost"
                            onClick={() => {
                              setUploadForm({ title: "", desc: "" });
                              setUploadModal(true);
                            }}
                          >
                            <Upload size={16} />
                            Upload Film or Still
                          </button>
                          <button
                            className="btn"
                            onClick={() => {
                              setProjectForm({ title: "", desc: "" });
                              setProjectModal(true);
                            }}
                          >
                            <Plus size={16} />
                            Upload a Project
                          </button>
                        </div>
                      </div>
                      <div className="appr">
                        <div className="appr-top">
                          <span className="appr-title">
                            <Pencil size={15} />
                            Appearance
                          </span>
                          <span className="appr-note">
                            <Lock size={11} />
                            How visitors see your work grid
                          </span>
                        </div>
                        <div className="appr-row">
                          <span>Card size</span>
                          <div className="seg">
                            {["S", "M", "L"].map((o) => (
                              <button
                                key={o}
                                className={pageView.size === o ? "on" : ""}
                                onClick={() =>
                                  setPageView((v) => ({ ...v, size: o }))
                                }
                              >
                                {o}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="appr-row">
                          <span>Aspect ratio</span>
                          <div className="seg">
                            {["landscape", "square", "portrait", "mixed"].map(
                              (o) => (
                                <button
                                  key={o}
                                  className={pageView.ratio === o ? "on" : ""}
                                  onClick={() =>
                                    setPageView((v) => ({ ...v, ratio: o }))
                                  }
                                >
                                  {o === "mixed" ? (
                                    <span className="ar-mix" />
                                  ) : (
                                    <span className={"ar " + o} />
                                  )}
                                </button>
                              ),
                            )}
                          </div>
                        </div>
                        <div className="appr-row">
                          <span>Thumbnail scale</span>
                          <div className="seg">
                            {["fit", "fill"].map((o) => (
                              <button
                                key={o}
                                className={pageView.scale === o ? "on" : ""}
                                style={{ textTransform: "capitalize" }}
                                onClick={() =>
                                  setPageView((v) => ({ ...v, scale: o }))
                                }
                              >
                                {o}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="appr-row">
                          <span>Show card info</span>
                          <button
                            className={"tgl" + (pageView.info ? " on" : "")}
                            onClick={() =>
                              setPageView((v) => ({ ...v, info: !v.info }))
                            }
                          >
                            <span className="tgl-dot" />
                          </button>
                        </div>
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
                        <div
                          className="pf-slider"
                          style={{
                            margin: "6px 0 4px",
                            justifyContent: "flex-start",
                          }}
                        >
                          <div
                            className="pf-seg"
                            style={{
                              "--pill-i": { films: 0, stills: 1, projects: 2 }[
                                pfCat
                              ],
                            }}
                          >
                            {[
                              ["films", "Films"],
                              ["stills", "Stills"],
                              ["projects", "Projects"],
                            ].map(([k, l]) => (
                              <button
                                key={k}
                                className={pfCat === k ? "on" : ""}
                                onClick={() => setPfCat(k)}
                              >
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>
                        {pfCat === "films" && (
                          <PfGrid
                            items={pfAssets.filter((a) => a.kind === "film")}
                            onItem={(a) => setEditAsset(a)}
                            editable
                          />
                        )}
                        {pfCat === "stills" && (
                          <PfGrid
                            items={pfAssets.filter((a) => a.kind === "still")}
                            onItem={(a) => setEditAsset(a)}
                            editable
                          />
                        )}
                        {pfCat === "projects" && (
                          <div
                            className={"grid sz-" + pageView.size.toLowerCase()}
                          >
                            {pfProjects.map((pr) => (
                              <PfProjectCard
                                key={pr.id}
                                proj={pr}
                                onOpen={() => setPfOpen(pr.id)}
                                onEdit={() => setEditPfProject(pr)}
                              />
                            ))}
                          </div>
                        )}
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

                  {dashNav === "branding" && (
                    <div style={{ "--acc": accent, ...accentVars }}>
                      <div className="pagehead">
                        <div>
                          <div className="eyebrow">Account</div>
                          <h1 className="disp">Add your branding</h1>
                          <p>
                            Make your public portfolio and client pages feel
                            like yours. Changes apply to your Public page and
                            Client view — hit Live Preview to see them.
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
                        <p className="panel-sub">
                          Retints the whole experience — buttons, highlights,
                          and the background glow.
                        </p>
                        <div className="swatches">
                          {ACCENTS.map((p) => (
                            <button
                              key={p.c}
                              className={`sw ${accent.toLowerCase() === p.c.toLowerCase() ? "on" : ""}`}
                              style={{ background: p.c }}
                              title={p.n}
                              onClick={() => setAccent(p.c)}
                            />
                          ))}
                        </div>
                        <div className="accpick">
                          <label
                            className="accpick-color"
                            style={{ background: accent }}
                          >
                            <input
                              type="color"
                              value={
                                /^#[0-9a-fA-F]{6}$/.test(accent)
                                  ? accent
                                  : "#F5551D"
                              }
                              onChange={(e) => setAccent(e.target.value)}
                            />
                          </label>
                          <div className="acchex">
                            <span className="acchex-hash">#</span>
                            <input
                              value={accent.replace(/^#/, "").toUpperCase()}
                              maxLength={6}
                              onChange={(e) => {
                                const v = e.target.value
                                  .replace(/[^0-9a-fA-F]/g, "")
                                  .slice(0, 6);
                                setAccent("#" + v);
                              }}
                              placeholder="F5551D"
                            />
                          </div>
                          <button
                            className="btn sm accprev"
                            style={{ pointerEvents: "none" }}
                          >
                            Preview
                          </button>
                        </div>
                      </div>
                      <div className="panel">
                        <h4>Logo</h4>
                        <p className="panel-sub">
                          Shown centred in your public page header and client
                          delivery pages.
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          ref={logoInput}
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const fl = e.target.files && e.target.files[0];
                            if (!fl) return;
                            const r = new FileReader();
                            r.onload = () => {
                              setLogo(r.result);
                              flash("Logo updated");
                            };
                            r.readAsDataURL(fl);
                            e.target.value = "";
                          }}
                        />
                        <div className="logo-up">
                          <div className="logo-prev">
                            {logo ? (
                              <img src={logo} alt="logo" />
                            ) : (
                              <span>No logo yet</span>
                            )}
                          </div>
                          <div className="logo-actions">
                            <button
                              className="btn sm"
                              onClick={() =>
                                logoInput.current && logoInput.current.click()
                              }
                            >
                              <Upload size={15} />
                              {logo ? "Replace logo" : "Upload logo"}
                            </button>
                            {logo && (
                              <button
                                className="btn ghost sm"
                                onClick={() => {
                                  setLogo(null);
                                  flash("Logo removed");
                                }}
                              >
                                <X size={15} />
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* <div className="panel">
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
                      </div> */}
                      <div className="panel">
                        <h4>About — photo</h4>
                        <div className="aboutphoto">
                          <div
                            className="ap-thumb"
                            style={{ backgroundImage: `url(${IMG_ABOUT})` }}
                          />
                          <div className="ap-side">
                            <button
                              className="btn ghost sm"
                              onClick={() => flash("Photo upload started")}
                            >
                              <Upload size={15} />
                              Change photo
                            </button>
                            <span className="ap-hint">
                              Best fit: portrait 4:5 — at least 1200 × 1500 px.
                              JPG or PNG, up to 10 MB.
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="panel">
                        <h4>About — description</h4>
                        <div className="field2">
                          <textarea
                            rows={4}
                            value={aboutDesc}
                            onChange={(e) => setAboutDesc(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="panel">
                        <h4>About — stats</h4>
                        <div className="statgrid">
                          <div className="field2">
                            <label>Projects delivered</label>
                            <input
                              value={statProjects}
                              onChange={(e) => setStatProjects(e.target.value)}
                            />
                          </div>
                          <div className="field2">
                            <label>Years of experience</label>
                            <input
                              value={statYears}
                              onChange={(e) => setStatYears(e.target.value)}
                            />
                          </div>
                          <div className="field2">
                            <label>Based in</label>
                            <input
                              value={statBased}
                              onChange={(e) => setStatBased(e.target.value)}
                            />
                          </div>
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

                  {dashNav === "profile" && (
                    <>
                      <div className="pagehead">
                        <div>
                          <div className="eyebrow">Account</div>
                          <h1 className="disp">Profile</h1>
                          <p>Your personal account details.</p>
                        </div>
                      </div>
                      <div className="panel">
                        <h4>Full name</h4>
                        <div className="field2">
                          <input defaultValue="Pedro Concreato" />
                        </div>
                      </div>
                      <div className="panel">
                        <h4>Email</h4>
                        <div className="field2">
                          <input defaultValue="pedro@cinespace.film" />
                        </div>
                      </div>
                      <div className="panel">
                        <h4>Password</h4>
                        <p className="panel-sub">
                          Change your account password.
                        </p>
                        <div className="field2">
                          <input
                            type="password"
                            defaultValue="password"
                            placeholder="New password"
                          />
                        </div>
                        <button
                          className="btn sm"
                          style={{ marginTop: 14 }}
                          onClick={() => flash("Password updated")}
                        >
                          <Check size={15} />
                          Update password
                        </button>
                      </div>
                    </>
                  )}

                  {dashNav === "storage" && (
                    <>
                      <div className="pagehead">
                        <div>
                          <div className="eyebrow">Workspace</div>
                          <h1 className="disp">Storage &amp; usage</h1>
                          <p>
                            Track your active storage and archive finished
                            projects to The Silo.
                          </p>
                        </div>
                      </div>
                      <div className="panel">
                        <h4>Active storage</h4>
                        <p className="panel-sub">3.4 TB of 5 TB used</p>
                        <div className="usebar">
                          <div
                            className="usebar-fill"
                            style={{ width: "68%" }}
                          />
                        </div>
                      </div>
                      <div className="panel">
                        <h4>The Silo — secure archive</h4>
                        <p className="panel-sub">
                          Move delivered projects to cold storage — 1 TB ·
                          $79/yr. Restore in 24–48h.
                        </p>
                        <button
                          className="btn sm"
                          onClick={() => flash("Opening The Silo…")}
                        >
                          <Upload size={15} />
                          Manage archive
                        </button>
                      </div>
                    </>
                  )}

                  {dashNav === "subscription" && (
                    <>
                      <div className="pagehead">
                        <div>
                          <div className="eyebrow">Account</div>
                          <h1 className="disp">Subscription</h1>
                          <p>Your current plan and what's included.</p>
                        </div>
                      </div>
                      <div className="panel">
                        <h4>Studio plan</h4>
                        <p className="panel-sub">
                          Your accent branding, unlimited client deliveries, The
                          Silo archive, and priority support.
                        </p>
                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                            marginTop: 6,
                          }}
                        >
                          <button
                            className="btn sm"
                            onClick={() => flash("Manage plan")}
                          >
                            Manage plan
                          </button>
                          <button
                            className="btn ghost sm"
                            onClick={() => flash("Compare plans")}
                          >
                            Compare plans
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {dashNav === "billing" && (
                    <>
                      <div className="pagehead">
                        <div>
                          <div className="eyebrow">Account</div>
                          <h1 className="disp">Billing</h1>
                          <p>Payment method and invoices.</p>
                        </div>
                      </div>
                      <div className="panel">
                        <h4>Payment method</h4>
                        <p className="panel-sub">
                          Visa ending 6411 · expires 08/28
                        </p>
                        <button
                          className="btn ghost sm"
                          onClick={() => flash("Update payment method")}
                        >
                          Update
                        </button>
                      </div>
                      <div className="panel">
                        <h4>Invoices</h4>
                        <p className="panel-sub">Your recent receipts.</p>
                        <div className="invrow">
                          <span>Studio plan — Aug 2026</span>
                          <span className="acc">$29.00</span>
                        </div>
                        <div className="invrow">
                          <span>Studio plan — Jul 2026</span>
                          <span className="acc">$29.00</span>
                        </div>
                      </div>
                    </>
                  )}

                  {dashNav === "security" && (
                    <>
                      <div className="pagehead">
                        <div>
                          <div className="eyebrow">Account</div>
                          <h1 className="disp">Security</h1>
                          <p>Keep your account and client links protected.</p>
                        </div>
                      </div>
                      <div className="panel">
                        <div className="trow2">
                          <div>
                            <div className="lbl">Two-factor authentication</div>
                            <div className="sub2">Require a code at login.</div>
                          </div>
                          <button
                            className="tgl"
                            onClick={(e) =>
                              e.currentTarget.classList.toggle("on")
                            }
                          >
                            <span className="tgl-dot" />
                          </button>
                        </div>
                      </div>
                      <div className="panel">
                        <div className="trow2">
                          <div>
                            <div className="lbl">
                              Default passphrase on links
                            </div>
                            <div className="sub2">
                              Password-protect new client links by default.
                            </div>
                          </div>
                          <button
                            className="tgl on"
                            onClick={(e) =>
                              e.currentTarget.classList.toggle("on")
                            }
                          >
                            <span className="tgl-dot" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {dashNav === "notifications" && (
                    <>
                      <div className="pagehead">
                        <div>
                          <div className="eyebrow">Account</div>
                          <h1 className="disp">Notifications</h1>
                          <p>Choose what you're notified about.</p>
                        </div>
                      </div>
                      <div className="panel">
                        <div className="trow2">
                          <div>
                            <div className="lbl">Client approvals</div>
                            <div className="sub2">
                              When a client approves a delivery.
                            </div>
                          </div>
                          <button
                            className="tgl on"
                            onClick={(e) =>
                              e.currentTarget.classList.toggle("on")
                            }
                          >
                            <span className="tgl-dot" />
                          </button>
                        </div>
                        <div className="trow2">
                          <div>
                            <div className="lbl">New comments</div>
                            <div className="sub2">
                              When a client leaves feedback.
                            </div>
                          </div>
                          <button
                            className="tgl on"
                            onClick={(e) =>
                              e.currentTarget.classList.toggle("on")
                            }
                          >
                            <span className="tgl-dot" />
                          </button>
                        </div>
                        <div className="trow2">
                          <div>
                            <div className="lbl">Weekly summary</div>
                            <div className="sub2">
                              A digest of activity every Monday.
                            </div>
                          </div>
                          <button
                            className="tgl"
                            onClick={(e) =>
                              e.currentTarget.classList.toggle("on")
                            }
                          >
                            <span className="tgl-dot" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {(dashNav === "help" ||
                    dashNav === "contact" ||
                    dashNav === "docs") && (
                    <>
                      <div className="pagehead">
                        <div>
                          <div className="eyebrow">Support</div>
                          <h1 className="disp">
                            {dashNav === "help"
                              ? "Help center"
                              : dashNav === "contact"
                                ? "Contact us"
                                : "Documentation"}
                          </h1>
                          <p>
                            {dashNav === "help"
                              ? "Find answers and guides for getting the most out of CineSpace."
                              : dashNav === "contact"
                                ? "Reach the CineSpace team — we usually reply within a day."
                                : "Guides, API references, and best practices."}
                          </p>
                        </div>
                      </div>
                      <div className="panel">
                        <h4>
                          {dashNav === "contact"
                            ? "Send us a message"
                            : "Browse resources"}
                        </h4>
                        <p className="panel-sub">
                          {dashNav === "contact"
                            ? "We'd love to hear from you."
                            : "Everything you need, in one place."}
                        </p>
                        <button
                          className="btn sm"
                          onClick={() =>
                            flash(
                              dashNav === "contact"
                                ? "Opening message…"
                                : "Opening resources…",
                            )
                          }
                        >
                          {dashNav === "contact" ? "Contact support" : "Open"}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== CLIENT VIEW ===================== */}
      {surface === "client" && (
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
              }}
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
                          {a.desc && <div className="ci-desc">{a.desc}</div>}
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
            {/* <span>Delivered with CineSpace</span> */}
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
                                    style={{ left: (c.time / dur) * 100 + "%" }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPlayT(c.time);
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
            <div className="field">
              <label>Cover thumbnail</label>
              <div className="upl-thumb">
                <div
                  className="upl-thumb-box"
                  style={{
                    background:
                      form.cover || "linear-gradient(135deg,#1a2028,#2a3742)",
                    backgroundSize: "cover",
                  }}
                />
                <div className="upl-thumb-txt">
                  <button
                    className="btn ghost sm"
                    onClick={() => flash("Choose a cover…")}
                  >
                    <Upload size={13} />
                    Upload cover
                  </button>
                  <span>No cover? We'll use the first uploaded asset.</span>
                </div>
              </div>
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

      {editDelivery && (
        <div className="overlay" onClick={() => setEditDelivery(null)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520 }}
          >
            <button
              className="btn ghost sm pw-close"
              style={{ padding: 8 }}
              onClick={() => setEditDelivery(null)}
            >
              <X size={16} />
            </button>
            <h3 className="disp" style={{ fontSize: 22, marginBottom: 4 }}>
              Edit delivery
            </h3>
            <p className="pw-p" style={{ marginBottom: 18 }}>
              Update the cover, manage assets, or delete this delivery.
            </p>
            <div className="ff" style={{ textAlign: "left" }}>
              <label>Cover thumbnail</label>
              <div className="upl-thumb">
                <div
                  className="upl-thumb-box"
                  style={{
                    background: editDelivery.g,
                    backgroundSize: "cover",
                  }}
                />
                <div className="upl-thumb-txt">
                  <button
                    className="btn ghost sm"
                    onClick={() => flash("Choose a cover…")}
                  >
                    <Upload size={13} />
                    Change cover
                  </button>
                  <span>Shown at the top of the delivery page.</span>
                </div>
              </div>
            </div>
            <div className="ff" style={{ textAlign: "left", marginTop: 14 }}>
              <label>Assets ({assets.length})</label>
              <div className="edit-assets">
                {assets.map((a) => (
                  <div
                    key={a.id}
                    className="ea-cell"
                    style={{ background: a.g, backgroundSize: "cover" }}
                  >
                    {assets.length > 1 && (
                      <button
                        className="ea-x"
                        onClick={() => deliveryRemoveAsset(a.id)}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
                <div className="ea-add" onClick={deliveryAddAsset}>
                  <Plus size={18} />
                </div>
              </div>
            </div>
            <button
              className="btn"
              style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
              onClick={() => {
                setEditDelivery(null);
                flash("Saved");
              }}
            >
              <Check size={15} />
              Save changes
            </button>
            <button
              className="edit-del"
              onClick={() => {
                if (
                  confirm("Delete this entire delivery? This cannot be undone.")
                )
                  deleteDelivery();
              }}
            >
              <Trash2 size={14} />
              Delete delivery
            </button>
          </div>
        </div>
      )}

      {shareOpen && (
        <div className="overlay" onClick={() => setShareOpen(false)}>
          <div
            className="asheet share-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="share-head">
              <div>
                <div className="eyebrow">Client link</div>
                <h3 className="disp">Share a link</h3>
              </div>
              <button
                className="btn ghost sm"
                style={{ padding: 8 }}
                onClick={() => setShareOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="share-linkbar">
              <Link2 size={15} style={{ color: "var(--dim)", flexShrink: 0 }} />
              <span className="share-url">
                cinespace.film/
                {(sel.title || "project")
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .slice(0, 16)}
              </span>
              <span
                className={"share-vis " + (shareCfg.pass ? "secure" : "open")}
              >
                {shareCfg.pass ? "Secure" : "Public"}
              </span>
            </div>
            <div className="share-sec">
              <div className="share-sec-h">Security</div>
              <div className="share-row">
                <span className="share-lbl">
                  <Lock size={15} />
                  Passphrase
                </span>
                <button
                  className={"tgl" + (shareCfg.pass ? " on" : "")}
                  onClick={() => setShareCfg((c) => ({ ...c, pass: !c.pass }))}
                >
                  <span className="tgl-dot" />
                </button>
              </div>
              {shareCfg.pass && (
                <input
                  className="share-pass"
                  value={shareCfg.passVal}
                  onChange={(e) =>
                    setShareCfg((c) => ({ ...c, passVal: e.target.value }))
                  }
                  placeholder="Set a passphrase…"
                />
              )}
              {shareCfg.pass && (
                <button
                  className="pwpreview"
                  onClick={() => {
                    setShareOpen(false);
                    setPwGate(true);
                    setPwVal("");
                  }}
                >
                  <Lock size={12} />
                  Preview the protected link
                </button>
              )}
            </div>
            <div className="share-sec">
              <div className="share-sec-h">Permissions</div>
              <div className="share-row">
                <span className="share-lbl">
                  <MessageCircle size={15} />
                  Comments
                </span>
                <button
                  className={"tgl" + (shareCfg.comments ? " on" : "")}
                  onClick={() =>
                    setShareCfg((c) => ({ ...c, comments: !c.comments }))
                  }
                >
                  <span className="tgl-dot" />
                </button>
              </div>
              <div className="share-row">
                <span className="share-lbl">
                  <Download size={15} />
                  Downloads
                </span>
                <button
                  className={"tgl" + (shareCfg.downloads ? " on" : "")}
                  onClick={() =>
                    setShareCfg((c) => ({ ...c, downloads: !c.downloads }))
                  }
                >
                  <span className="tgl-dot" />
                </button>
              </div>
            </div>
            <div className="share-sec">
              <div className="share-sec-h">Link expires</div>
              <div className="seg share-exp">
                {[
                  ["24h", "24 hours"],
                  ["7d", "7 days"],
                  ["30d", "30 days"],
                  ["never", "Never"],
                ].map(([k, l]) => (
                  <button
                    key={k}
                    className={shareCfg.expiry === k ? "on" : ""}
                    onClick={() => setShareCfg((c) => ({ ...c, expiry: k }))}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="share-sec">
              <div className="share-sec-h">Notify me when the client…</div>
              <div className="share-row">
                <span className="share-lbl">
                  <MessageCircle size={15} />
                  Leaves a comment
                </span>
                <button
                  className={"tgl" + (shareCfg.notifyComment ? " on" : "")}
                  onClick={() =>
                    setShareCfg((c) => ({
                      ...c,
                      notifyComment: !c.notifyComment,
                    }))
                  }
                >
                  <span className="tgl-dot" />
                </button>
              </div>
              <div className="share-row">
                <span className="share-lbl">
                  <Download size={15} />
                  Downloads files
                </span>
                <button
                  className={"tgl" + (shareCfg.notifyDownload ? " on" : "")}
                  onClick={() =>
                    setShareCfg((c) => ({
                      ...c,
                      notifyDownload: !c.notifyDownload,
                    }))
                  }
                >
                  <span className="tgl-dot" />
                </button>
              </div>
            </div>
            <div className="share-foot">
              <button
                className="btn ghost"
                onClick={() => flash("Opening WhatsApp…")}
              >
                <MessageCircle size={15} />
                Send on WhatsApp
              </button>
              <button
                className="btn"
                onClick={() => {
                  if (shareCfg.pass && !shareCfg.passVal.trim()) {
                    flash("Set a passphrase first");
                    return;
                  }
                  const exp =
                    shareCfg.expiry === "never"
                      ? "never expires"
                      : "expires in " +
                        {
                          ["24h"]: "24h",
                          ["7d"]: "7 days",
                          ["30d"]: "30 days",
                        }[shareCfg.expiry];
                  flash("Link copied · " + exp);
                  setShareOpen(false);
                }}
              >
                <Link2 size={15} />
                Copy link
              </button>
            </div>
          </div>
        </div>
      )}
      {surface === "waitlist" && (
        <WaitlistSurface onOpenDemo={() => setSurface("client")} />
      )}
      {authModal && (
        <div className="overlay" onClick={() => setAuthModal(null)}>
          <div className="modal authmodal" onClick={(e) => e.stopPropagation()}>
            <div className="m-head">
              <div>
                <div className="eyebrow">
                  {authModal === "signup" ? "Create account" : "Welcome back"}
                </div>
                <h3 className="disp am-h">
                  {authModal === "signup" ? "Sign up" : "Log in"}
                </h3>
              </div>
              <button
                className="btn ghost sm"
                style={{ padding: 8 }}
                onClick={() => setAuthModal(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="social-row">
              <button
                className="social"
                onClick={() => flash("Continuing with Google…")}
              >
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.7-2.6C17 3.1 14.7 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c5.9 0 9.8-4.1 9.8-9.9 0-.7-.1-1.2-.2-1.7H12z"
                  />
                </svg>
                Google
              </button>
              <button
                className="social"
                onClick={() => flash("Continuing with Apple…")}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff">
                  <path d="M16.4 12.9c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.1.8-.6 0-1.6-.7-2.7-.7-1.4 0-2.7.8-3.4 2-.1.3-1.9 3.2-.5 6.4.7 1.6 1.5 3.3 2.7 3.3 1 0 1.4-.6 2.7-.6 1.2 0 1.6.6 2.7.6 1.2 0 1.9-1.5 2.6-3-.2-.1-2.5-1-2.5-3.9zM14.5 6.3c.6-.7 1-1.7.9-2.7-.8 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6.9.1 1.9-.5 2.5-1.2z" />
                </svg>
                Apple
              </button>
            </div>
            <div className="authdiv">or</div>
            {authModal === "signup" && (
              <div className="ff">
                <label>Full name</label>
                <input placeholder="Pedro Concreato" />
              </div>
            )}
            <div className="ff">
              <label>Email</label>
              <input placeholder="you@studio.com" />
            </div>
            <div className="ff">
              <label>Password</label>
              <input type="password" placeholder="••••••••" />
            </div>
            {authModal === "login" && (
              <span
                className="forgotlink"
                onClick={() => flash("Reset link sent")}
              >
                Forgot password?
              </span>
            )}
            <button
              className="btn"
              style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
              onClick={() => {
                flash(authModal === "signup" ? "Account created" : "Logged in");
                setAuthModal(null);
                setSurface("backend");
              }}
            >
              {authModal === "signup" ? "Create account" : "Log in"}
            </button>
            <div className="authfoot">
              {authModal === "signup" ? (
                <>
                  Already have an account?{" "}
                  <a onClick={() => setAuthModal("login")}>Log in</a>
                </>
              ) : (
                <>
                  New to CineSpace?{" "}
                  <a onClick={() => setAuthModal("signup")}>Sign up</a>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {pfOpen &&
        (() => {
          const proj = pfProjects.find((p) => p.id === pfOpen);
          if (!proj) return null;
          const cov = pfProjectCover(proj);
          const items = proj.assetIds
            .map((id) => pfAssets.find((a) => a.id === id))
            .filter(Boolean);
          return (
            <div className="overlay" onClick={() => setPfOpen(null)}>
              <div className="pfdetail" onClick={(e) => e.stopPropagation()}>
                <div className="pfd-bar">
                  {logo ? (
                    <img className="brandlogo" src={logo} alt={brandName} />
                  ) : (
                    <span className="pfd-logo">
                      {brandName}
                      <span style={{ color: "var(--orange)" }}>.</span>
                    </span>
                  )}
                  <button
                    className="btn ghost sm"
                    style={{ padding: 8 }}
                    onClick={() => setPfOpen(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="pfd-scroll">
                  <div
                    className="pfd-hero"
                    style={{
                      background: cov.g,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="pfd-hero-tint" />
                    <div className="pfd-hero-inner">
                      <div className="eyebrow">Project</div>
                      <h1 className="pfd-title disp">{proj.title}</h1>
                      <p className="pfd-desc">{proj.desc}</p>
                    </div>
                  </div>
                  <div className="pfd-body">
                    <div className="eyebrow">In this project</div>
                    <h2 className="disp" style={{ marginBottom: 16 }}>
                      Films &amp; stills
                    </h2>
                    <div className="pf-mason sz-m">
                      {items.map((a) => (
                        <PfAsset
                          key={a.id}
                          a={a}
                          masonry
                          onClick={() =>
                            flash(
                              a.kind === "film"
                                ? "Playing " + a.title
                                : "Viewing " + a.title,
                            )
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {uploadModal && (
        <div className="overlay" onClick={() => setUploadModal(false)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 440 }}
          >
            <button
              className="btn ghost sm pw-close"
              style={{ padding: 8 }}
              onClick={() => setUploadModal(false)}
            >
              <X size={16} />
            </button>
            <h3 className="disp" style={{ fontSize: 22, marginBottom: 4 }}>
              Upload film or still
            </h3>
            <p className="pw-p" style={{ marginBottom: 18 }}>
              Add a title and a short description. It'll show on your public
              Work page under Films or Stills.
            </p>
            <div className="upl-drop">
              <Upload size={20} />
              <span>Drop a video here or click to browse</span>
              <small>MP4, MOV · up to 5 GB</small>
            </div>
            <div className="ff" style={{ textAlign: "left", marginTop: 16 }}>
              <label>Title</label>
              <input
                autoFocus
                value={uploadForm.title}
                onChange={(e) =>
                  setUploadForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="e.g. Dubai Nights"
              />
            </div>
            <div className="ff" style={{ textAlign: "left", marginTop: 12 }}>
              <label>
                Description{" "}
                <span
                  style={{
                    color: "var(--faint)",
                    fontWeight: 500,
                    textTransform: "none",
                    letterSpacing: 0,
                  }}
                >
                  (optional)
                </span>
              </label>
              <textarea
                className="upl-desc"
                value={uploadForm.desc}
                onChange={(e) =>
                  setUploadForm((f) => ({ ...f, desc: e.target.value }))
                }
                placeholder="A short line about this piece — the brief, the vibe, the client…"
                rows={3}
              />
            </div>
            <div className="ff" style={{ textAlign: "left", marginTop: 12 }}>
              <label>
                Thumbnail{" "}
                <span
                  style={{
                    color: "var(--faint)",
                    fontWeight: 500,
                    textTransform: "none",
                    letterSpacing: 0,
                  }}
                >
                  (optional)
                </span>
              </label>
              <div className="upl-thumb">
                <div className="upl-thumb-box">
                  <ImageIcon size={16} />
                </div>
                <div className="upl-thumb-txt">
                  <button
                    className="btn ghost sm"
                    onClick={() => flash("Choose a thumbnail…")}
                  >
                    <Upload size={13} />
                    Upload thumbnail
                  </button>
                  <span>
                    No thumbnail? We'll grab a frame from your video
                    automatically.
                  </span>
                </div>
              </div>
            </div>
            <button
              className="btn"
              style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
              onClick={submitUpload}
            >
              <Upload size={15} />
              Upload film or still
            </button>
          </div>
        </div>
      )}

      {projectModal && (
        <div className="overlay" onClick={() => setProjectModal(false)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460 }}
          >
            <button
              className="btn ghost sm pw-close"
              style={{ padding: 8 }}
              onClick={() => setProjectModal(false)}
            >
              <X size={16} />
            </button>
            <h3 className="disp" style={{ fontSize: 22, marginBottom: 4 }}>
              Upload a project
            </h3>
            <p className="pw-p" style={{ marginBottom: 18 }}>
              Group photos and videos from the same shoot into one project.
              Clients and visitors open it as a single story.
            </p>
            <div className="upl-drop">
              <Upload size={20} />
              <span>Drop multiple files here or click to browse</span>
              <small>Videos &amp; photos · up to 5 GB each</small>
            </div>
            <div className="prj-chips">
              <span className="prj-chip">
                <Film size={11} />
                build_wide.mov
              </span>
              <span className="prj-chip">
                <ImageIcon size={11} />
                detail_01.jpg
              </span>
              <span className="prj-chip">
                <ImageIcon size={11} />
                detail_02.jpg
              </span>
              <span className="prj-chip prj-add">
                <Plus size={11} />
                Add more
              </span>
            </div>
            <div className="ff" style={{ textAlign: "left", marginTop: 16 }}>
              <label>Project name</label>
              <input
                autoFocus
                value={projectForm.title}
                onChange={(e) =>
                  setProjectForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="e.g. Mercedes-AMG GT"
              />
            </div>
            <div className="ff" style={{ textAlign: "left", marginTop: 12 }}>
              <label>
                Description{" "}
                <span
                  style={{
                    color: "var(--faint)",
                    fontWeight: 500,
                    textTransform: "none",
                    letterSpacing: 0,
                  }}
                >
                  (optional)
                </span>
              </label>
              <textarea
                className="upl-desc"
                value={projectForm.desc}
                onChange={(e) =>
                  setProjectForm((f) => ({ ...f, desc: e.target.value }))
                }
                placeholder="A short line about this project — the client, the shoot, the story…"
                rows={3}
              />
            </div>
            <div className="ff" style={{ textAlign: "left", marginTop: 12 }}>
              <label>
                Cover thumbnail{" "}
                <span
                  style={{
                    color: "var(--faint)",
                    fontWeight: 500,
                    textTransform: "none",
                    letterSpacing: 0,
                  }}
                >
                  (optional)
                </span>
              </label>
              <div className="upl-thumb">
                <div className="upl-thumb-box">
                  <ImageIcon size={16} />
                </div>
                <div className="upl-thumb-txt">
                  <button
                    className="btn ghost sm"
                    onClick={() => flash("Choose a cover…")}
                  >
                    <Upload size={13} />
                    Upload cover
                  </button>
                  <span>
                    No cover? We'll use the first asset in the project.
                  </span>
                </div>
              </div>
            </div>
            <button
              className="btn"
              style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
              onClick={submitProject}
            >
              <Plus size={15} />
              Create project
            </button>
          </div>
        </div>
      )}

      {editAsset && (
        <div className="overlay" onClick={() => setEditAsset(null)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460 }}
          >
            <button
              className="btn ghost sm pw-close"
              style={{ padding: 8 }}
              onClick={() => setEditAsset(null)}
            >
              <X size={16} />
            </button>
            <h3 className="disp" style={{ fontSize: 22, marginBottom: 4 }}>
              Edit {editAsset.kind}
            </h3>
            <p className="pw-p" style={{ marginBottom: 18 }}>
              Update the details for this {editAsset.kind}, or remove it from
              your portfolio.
            </p>
            <div className="ff" style={{ textAlign: "left" }}>
              <label>Title</label>
              <input
                value={editAsset.title}
                onChange={(e) =>
                  setEditAsset((a) => ({ ...a, title: e.target.value }))
                }
              />
            </div>
            <div className="ff" style={{ textAlign: "left", marginTop: 12 }}>
              <label>Description</label>
              <textarea
                className="upl-desc"
                rows={3}
                value={editAsset.desc}
                onChange={(e) =>
                  setEditAsset((a) => ({ ...a, desc: e.target.value }))
                }
              />
            </div>
            <div className="ff" style={{ textAlign: "left", marginTop: 12 }}>
              <label>Thumbnail</label>
              <div className="upl-thumb">
                <div
                  className="upl-thumb-box"
                  style={{ background: editAsset.g, backgroundSize: "cover" }}
                />
                <div className="upl-thumb-txt">
                  <button
                    className="btn ghost sm"
                    onClick={() => flash("Choose a thumbnail…")}
                  >
                    <Upload size={13} />
                    Change thumbnail
                  </button>
                  <span>Replaces the frame shown on your portfolio.</span>
                </div>
              </div>
            </div>
            <button
              className="btn"
              style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
              onClick={() =>
                saveAsset({ title: editAsset.title, desc: editAsset.desc })
              }
            >
              <Check size={15} />
              Save changes
            </button>
            <button
              className="edit-del"
              onClick={() => {
                if (confirm("Delete this " + editAsset.kind + " permanently?"))
                  deleteAsset();
              }}
            >
              <Trash2 size={14} />
              Delete {editAsset.kind}
            </button>
          </div>
        </div>
      )}

      {editPfProject && (
        <div className="overlay" onClick={() => setEditPfProject(null)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 500 }}
          >
            <button
              className="btn ghost sm pw-close"
              style={{ padding: 8 }}
              onClick={() => setEditPfProject(null)}
            >
              <X size={16} />
            </button>
            <h3 className="disp" style={{ fontSize: 22, marginBottom: 4 }}>
              Edit project
            </h3>
            <p className="pw-p" style={{ marginBottom: 18 }}>
              Update this project, manage its assets, or delete it.
            </p>
            <div className="ff" style={{ textAlign: "left" }}>
              <label>Project name</label>
              <input
                value={editPfProject.title}
                onChange={(e) =>
                  setEditPfProject((p) => ({ ...p, title: e.target.value }))
                }
              />
            </div>
            <div className="ff" style={{ textAlign: "left", marginTop: 12 }}>
              <label>Description</label>
              <textarea
                className="upl-desc"
                rows={2}
                value={editPfProject.desc}
                onChange={(e) =>
                  setEditPfProject((p) => ({ ...p, desc: e.target.value }))
                }
              />
            </div>
            <div className="ff" style={{ textAlign: "left", marginTop: 12 }}>
              <label>Cover thumbnail</label>
              <div className="upl-thumb">
                <div
                  className="upl-thumb-box"
                  style={{
                    background: (
                      pfAssets.find((a) => a.id === editPfProject.cover) || {}
                    ).g,
                    backgroundSize: "cover",
                  }}
                />
                <div className="upl-thumb-txt">
                  <button
                    className="btn ghost sm"
                    onClick={() => flash("Choose a cover…")}
                  >
                    <Upload size={13} />
                    Change cover
                  </button>
                  <span>Shown on the project card.</span>
                </div>
              </div>
            </div>
            <div className="ff" style={{ textAlign: "left", marginTop: 12 }}>
              <label>Assets ({editPfProject.assetIds.length})</label>
              <div className="edit-assets">
                {editPfProject.assetIds.map((id) => {
                  const a = pfAssets.find((x) => x.id === id);
                  if (!a) return null;
                  return (
                    <div
                      key={id}
                      className="ea-cell"
                      style={{ background: a.g, backgroundSize: "cover" }}
                    >
                      <button
                        className="ea-x"
                        onClick={() => projRemoveAsset(id)}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
                <div
                  className="ea-add"
                  onClick={() => setAssetPicker({ mode: "project" })}
                >
                  <Plus size={18} />
                </div>
              </div>
            </div>
            <button
              className="btn"
              style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
              onClick={() =>
                saveProject({
                  title: editPfProject.title,
                  desc: editPfProject.desc,
                  assetIds: editPfProject.assetIds,
                })
              }
            >
              <Check size={15} />
              Save changes
            </button>
            <button
              className="edit-del"
              onClick={() => {
                if (confirm("Delete this entire project?")) deleteProject();
              }}
            >
              <Trash2 size={14} />
              Delete project
            </button>
          </div>
        </div>
      )}

      {assetPicker && (
        <div className="overlay" onClick={() => setAssetPicker(null)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520 }}
          >
            <button
              className="btn ghost sm pw-close"
              style={{ padding: 8 }}
              onClick={() => setAssetPicker(null)}
            >
              <X size={16} />
            </button>
            <h3 className="disp" style={{ fontSize: 20, marginBottom: 4 }}>
              Add assets
            </h3>
            <p className="pw-p" style={{ marginBottom: 16 }}>
              Tap to add from your library.
            </p>
            <div
              className="edit-assets"
              style={{ gridTemplateColumns: "repeat(5,1fr)" }}
            >
              {pfAssets
                .filter(
                  (a) =>
                    editPfProject && !editPfProject.assetIds.includes(a.id),
                )
                .map((a) => (
                  <div
                    key={a.id}
                    className="ea-cell"
                    style={{ background: a.g, backgroundSize: "cover" }}
                    onClick={() => {
                      projAddAsset(a.id);
                    }}
                  >
                    <span className="ea-plus">
                      <Plus size={14} />
                    </span>
                  </div>
                ))}
            </div>
            <button
              className="btn"
              style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
              onClick={() => setAssetPicker(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {pwGate && (
        <div className="overlay" onClick={() => setPwGate(false)}>
          <div className="modal pwmodal" onClick={(e) => e.stopPropagation()}>
            <button
              className="btn ghost sm pw-close"
              style={{ padding: 8 }}
              onClick={() => setPwGate(false)}
            >
              <X size={16} />
            </button>
            <div className="pw-badge">
              <Lock size={24} />
            </div>
            <h3 className="disp pw-h">Protected link</h3>
            <p className="pw-p">
              This delivery is password-protected. Enter the passphrase to
              continue.
            </p>
            <div className="pw-linkchip">
              <Link2 size={13} />
              cinespace.film/
              {(sel && sel.title ? sel.title : "omakase-teaser")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .slice(0, 20)}
            </div>
            <div className="ff" style={{ textAlign: "left" }}>
              <label>Passphrase</label>
              <input
                type="password"
                autoFocus
                value={pwVal}
                onChange={(e) => setPwVal(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  (pwVal.trim()
                    ? (setPwGate(false),
                      setSurface("client"),
                      flash("Unlocked"))
                    : flash("Enter the passphrase"))
                }
                placeholder="Enter passphrase"
              />
            </div>
            <button
              className="btn"
              style={{ width: "100%", justifyContent: "center", marginTop: 6 }}
              onClick={() => {
                if (!pwVal.trim()) {
                  flash("Enter the passphrase");
                  return;
                }
                setPwGate(false);
                setSurface("client");
                flash("Unlocked");
              }}
            >
              Unlock
            </button>
          </div>
        </div>
      )}

      {uploadProg && (
        <div className="upload-toast">
          <div className="ut-top">
            <div className={"ut-ic" + (uploadProg.done ? " done" : "")}>
              {uploadProg.done ? (
                <Check size={18} strokeWidth={2.6} />
              ) : (
                <Upload size={17} />
              )}
            </div>
            <div className="ut-meta">
              <div className="ut-name">
                {uploadProg.done ? "Upload complete" : uploadProg.name}
              </div>
              <div className="ut-sub">
                {uploadProg.done
                  ? `${uploadProg.total} files · 1.1 GB`
                  : `312 MB · ${uploadProg.idx} of ${uploadProg.total} files`}
              </div>
            </div>
            {!uploadProg.done && (
              <div className="ut-pct">{uploadProg.pct}%</div>
            )}
            <button className="ut-x" onClick={() => setUploadProg(null)}>
              <X size={14} />
            </button>
          </div>
          <div className="ut-bar">
            <div
              className={"ut-fill" + (uploadProg.done ? " done" : "")}
              style={{ width: uploadProg.pct + "%" }}
            />
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
