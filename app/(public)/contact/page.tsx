import { Metadata } from "next";
import { HeaderSection } from "@/components/landing/HeaderSection";
import { FooterSection } from "@/components/landing/FooterSection";
import { ContactForm } from "@/components/contact/ContactForm";
import { getServerServices } from "@/core/server";
import { AmbientBackground } from "@/components/ui/ambient-background";

export const metadata: Metadata = {
  title: "Contact Us — CineSpace",
  description:
    "Questions, feedback, or a project in mind? Drop us a line and a real person from the CineSpace team will get back to you.",
};

export default async function ContactPage() {
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
      <AmbientBackground variant="hero" />

      <div className="relative z-10">
        <HeaderSection user={user} workspace={workspace} />

        <main className="mx-auto max-w-3xl px-4 sm:px-8 py-16 sm:py-24 space-y-12">
          {/* Hero Heading */}
          <div className="text-center space-y-4 max-w-xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white font-display leading-[1.1]">
              LET&apos;S MAKE SOMETHING GREAT
            </h1>
            <p className="text-sm sm:text-base text-[#aeaeb4] leading-relaxed">
              Questions, feedback, or a project in mind? Drop us a line and a real person from the CineSpace team will get back to you.
            </p>
          </div>

          {/* Form & Partnership Container */}
          <ContactForm />
        </main>
      </div>

      <FooterSection />
    </div>
  );
}
