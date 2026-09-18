export interface BlogPostSection {
  heading?: string;
  paragraphs: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  category: string;
  readTime: string;
  date: string;
  coverImage: string;
  shortVersion: string;
  introParagraph: string;
  sections: BlogPostSection[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-to-deliver-films-like-a-studio",
    title: "How to deliver films like a studio: review, approve & hand off in one link",
    category: "Guide",
    readTime: "6 min read",
    date: "2026-03-10",
    coverImage: "/images/blog/studio-delivery.png",
    shortVersion:
      "to hand clients a studio-grade experience, stop sending bare download links. A real delivery flow lets clients stream instant-playback previews, leave time-stamped comments, approve each cut, and only unlocks the full-quality masters once you're ready — all under your own brand, alongside a portfolio that keeps winning the next job.",
    introParagraph:
      "You spent years on your craft — the gear, the grade, the edit. Then the final step arrives: getting the work to the client. For a lot of filmmakers this is where the premium experience falls apart. Dropping a pristine export into a generic cloud folder strips the polish right off your work. Worse, most \"delivery\" tools stop at exactly that: a link to download a file. No review. No feedback. No sign-off. No home for your best work.",
    sections: [
      {
        heading: "Delivery is more than a download link",
        paragraphs: [
          "Plenty of tools will host a file and hand over a URL. That's the floor, not the ceiling. The moment a client wants to say \"love it, but tighten the intro,\" a plain link falls apart — now you're back in email threads and screenshots trying to figure out which second they meant. CineSpace was built for the whole loop, not just the last step.",
        ],
      },
      {
        heading: "Let clients review, not just receive",
        paragraphs: [
          "Give clients an instant, zero-buffer preview that plays back cleanly on a phone between meetings — no massive download just to watch a draft. Then let them actually respond: time-stamped comments pinned to the exact frame, so feedback is precise instead of vague. Every note lives on the clip it belongs to.",
        ],
      },
      {
        heading: "Approvals that lock the sign-off",
        paragraphs: [
          "Each version gets an explicit approve — per asset or the whole project at once. You always know what's signed off and what's still in review, and the client knows their feedback landed. When it's approved, it's locked, and everyone's on the same page. That's something a raw download link simply can't do.",
        ],
      },
      {
        heading: "Protect the work until you're ready",
        paragraphs: [
          "Keep a delivery behind a passphrase, set links to expire, and get notified the moment a client comments or downloads. Hand over the full-bitrate masters on your terms — not the instant a link leaves your outbox.",
        ],
      },
      {
        heading: "Give your work a home, not just a handoff",
        paragraphs: [
          "Delivery tools forget one thing: the work that wins the next job. CineSpace pairs client delivery with a portfolio page — a clean, branded showcase of your films, stills, and full projects. One place that both delivers today's cut and sells tomorrow's booking. Most delivery-only tools have nothing like it.",
        ],
      },
      {
        heading: "Your brand, front and center",
        paragraphs: [
          "Your logo, your accent colour, your name on every page the client sees. Clients experience your studio — not the software. That white-labeled polish is what turns a file transfer into an experience worth paying premium for.",
          "High-end clients aren't just paying for a video file — they're paying for the experience around it. When review, feedback, approvals, protection, and a portfolio all live in one branded space, your packaging finally matches your price tag.",
        ],
      },
    ],
  },
];

export function getAllPosts(): BlogPost[] {
  return BLOG_POSTS;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
