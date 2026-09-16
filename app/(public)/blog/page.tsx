import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { HeaderSection } from "@/components/landing/HeaderSection";
import { FooterSection } from "@/components/landing/FooterSection";
import { getAllPosts } from "@/lib/blog-data";
import { getServerServices } from "@/core/server";
import { AmbientBackground } from "@/components/ui/ambient-background";

export const metadata: Metadata = {
  title: "Blog — CineSpace",
  description: "Field notes on delivering film like a studio — review, feedback, and handoff done right.",
};

export default async function BlogPage() {
  let user = null;
  let workspace = null;

  try {
    const services = await getServerServices();
    const session = await services.auth.getCurrentSessionData();
    user = session.user;
    workspace = session.workspace;
  } catch {
    // Unauthenticated visitor
  }

  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-[#070709] text-[#f6f3ec] font-sans antialiased selection:bg-[#f5551d] selection:text-white flex flex-col justify-between relative">
      <AmbientBackground variant="full" />

      <div className="relative z-10">
        <HeaderSection user={user} workspace={workspace} />

        <main className="mx-auto max-w-7xl px-4 sm:px-8 py-16 sm:py-24">
          {/* Hero Heading */}
          <div className="text-center space-y-4 max-w-2xl mx-auto mb-16 sm:mb-20">
            <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white font-display">
              BLOG
            </h1>
            <p className="text-base sm:text-lg text-[#aeaeb4] leading-relaxed">
              Field notes on delivering film like a studio — review, feedback, and handoff done right.
            </p>
          </div>

          {/* Posts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="group flex flex-col space-y-4 transition-all"
              >
                <Link
                  href={`/blog/${post.slug}`}
                  className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-white/10 bg-[#121217] transition-all duration-300 group-hover:border-white/25 group-hover:shadow-2xl group-hover:shadow-[#f5551d]/10"
                >
                  <Image
                    src={post.coverImage}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </Link>

                <div className="space-y-3 pt-1">
                  <Link href={`/blog/${post.slug}`}>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white group-hover:text-[#ff7948] transition-colors leading-snug">
                      {post.title}
                    </h2>
                  </Link>

                  <div className="flex items-center gap-2 text-xs text-[#aeaeb4]">
                    <span>{post.category}</span>
                    <span>·</span>
                    <span>{post.readTime}</span>
                  </div>

                  <div className="pt-1">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f5551d] to-[#df430f] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-[#f5551d]/25 transition-all hover:scale-[1.03] hover:shadow-[#f5551d]/40"
                    >
                      <span>READ BLOG</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </main>
      </div>

      <FooterSection />
    </div>
  );
}
