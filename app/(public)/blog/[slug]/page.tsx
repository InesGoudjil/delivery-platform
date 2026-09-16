import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { HeaderSection } from "@/components/landing/HeaderSection";
import { FooterSection } from "@/components/landing/FooterSection";
import { getPostBySlug, getAllPosts } from "@/lib/blog-data";
import { getServerServices } from "@/core/server";
import { AmbientBackground } from "@/components/ui/ambient-background";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata(props: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found — CineSpace",
    };
  }

  return {
    title: `${post.title} — CineSpace Blog`,
    description: post.shortVersion,
  };
}

export default async function BlogPostPage(props: BlogPostPageProps) {
  const { slug } = await props.params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

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

  return (
    <div className="min-h-screen bg-[#070709] text-[#f6f3ec] font-sans antialiased selection:bg-[#f5551d] selection:text-white flex flex-col justify-between relative">
      <AmbientBackground variant="full" />

      <div className="relative z-10">
        <HeaderSection user={user} workspace={workspace} />

        <main className="mx-auto max-w-4xl px-4 sm:px-8 py-12 sm:py-20 space-y-10">
          {/* Back button */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-xs font-medium text-[#aeaeb4] hover:text-white transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>All posts</span>
          </Link>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white font-display leading-[1.15]">
            {post.title}
          </h1>

          {/* Featured Image */}
          <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden rounded-3xl border border-white/10 bg-[#121217] shadow-2xl">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              priority
              className="object-cover"
            />
          </div>

          {/* Article Body Content */}
          <div className="space-y-8 pt-4">
            {/* The short version callout */}
            <div className="border-l-2 border-[#f5551d] pl-5 sm:pl-6 py-1">
              <p className="text-sm sm:text-base text-[#aeaeb4] leading-relaxed">
                <strong className="text-[#f5551d] font-bold">The short version: </strong>
                {post.shortVersion}
              </p>
            </div>

            {/* Intro paragraph */}
            <p className="text-sm sm:text-base text-[#aeaeb4] leading-relaxed">
              {post.introParagraph}
            </p>

            {/* Content Sections */}
            {post.sections.map((section, idx) => (
              <div key={idx} className="space-y-4 pt-4">
                {section.heading && (
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
                    {section.heading}
                  </h2>
                )}
                {section.paragraphs.map((p, pIdx) => (
                  <p
                    key={pIdx}
                    className="text-sm sm:text-base text-[#aeaeb4] leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: p
                        .replace(
                          /\b(time-stamped comments|approve|portfolio page)\b/g,
                          "<strong class='text-white font-semibold'>$1</strong>"
                        )
                    }}
                  />
                ))}
              </div>
            ))}

            {/* Call to Action Box / Button */}
            <div className="pt-8 pb-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f5551d] to-[#df430f] px-8 py-4 text-xs font-bold uppercase tracking-wider text-white shadow-xl shadow-[#f5551d]/30 transition-all hover:scale-[1.03] hover:shadow-[#f5551d]/50"
              >
                <span>TRY CINESPACE FOR FREE</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </main>
      </div>

      <FooterSection />
    </div>
  );
}
