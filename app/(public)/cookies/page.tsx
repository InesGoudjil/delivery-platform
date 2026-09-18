import { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { getServerServices } from "@/core/server";

export const metadata: Metadata = {
  title: "Cookie Policy — CineSpace",
  description: "Learn about the cookies and tracking technologies used on CineSpace.",
};

export default async function CookiesPage() {
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

  const sections = [
    {
      title: "1. WHAT ARE COOKIES?",
      content: (
        <p>
          Cookies are small text files stored on your device when you visit a website. They help sites function properly, remember preferences, and provide analytics. We may also use similar technologies such as pixels, SDKs, and local storage.
        </p>
      ),
    },
    {
      title: "2. TYPES OF COOKIES WE USE",
      content: (
        <p>
          Strictly necessary cookies authenticate users, maintain session state, enable security features, and prevent fraud — these cannot be disabled. Functional cookies remember preferences like language and account settings. Analytics cookies help us understand how the Services are used (page views, feature usage, error tracking, load times); we may use third-party analytics providers. Marketing cookies may be used to measure campaigns, attribute conversions, and retarget visitors — where required, only with your consent.
        </p>
      ),
    },
    {
      title: "3. THIRD-PARTY COOKIES",
      content: (
        <p>
          Some cookies are set by providers acting on our behalf — analytics, infrastructure, fraud prevention, and support tools. We do not control third-party cookies directly; their use is governed by the providers&rsquo; own privacy policies.
        </p>
      ),
    },
    {
      title: "4. CONTROLLING COOKIES",
      content: (
        <p>
          Most browsers let you view, delete, and block cookies and set preferences. Blocking some cookies may affect how the Services work. Where required by law, we provide a consent mechanism to accept or reject non-essential cookies, and you can change your preferences at any time.
        </p>
      ),
    },
    {
      title: "5. DO NOT TRACK",
      content: (
        <p>
          Some browsers transmit “Do Not Track” signals. There is no uniform standard for these signals and we do not currently respond to them.
        </p>
      ),
    },
    {
      title: "6. RETENTION",
      content: (
        <p>
          Session cookies are deleted when you close your browser; persistent cookies remain until they expire or are deleted. Specific periods vary by cookie type and provider.
        </p>
      ),
    },
    {
      title: "7. CHANGES",
      content: (
        <p>
          We may update this Cookie Policy periodically and will notify you of material changes via a website notice or email.
        </p>
      ),
    },
    {
      title: "8. CONTACT",
      content: (
        <p>
          Questions about this policy or your cookie preferences:{" "}
          <a
            href="mailto:hello@cinespace.film"
            className="text-white hover:text-[#f5551d] transition-colors underline underline-offset-2"
          >
            hello@cinespace.film
          </a>
          .
        </p>
      ),
    },
  ];

  return (
    <LegalPageLayout
      badge="LEGAL"
      title="COOKIE POLICY"
      lastUpdated="Last updated: February 8th, 2026"
      intro="This Cookie Policy explains how CineSpace uses cookies and similar technologies when you use our website, applications, and services (the “Services”). By continuing to use the Services, you consent to our use of cookies as described here, except where consent is required by law."
      sections={sections}
      user={user}
      workspace={workspace}
    />
  );
}
