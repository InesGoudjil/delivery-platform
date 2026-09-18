import { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { getServerServices } from "@/core/server";

export const metadata: Metadata = {
  title: "Privacy Policy — CineSpace",
  description: "Learn how CineSpace collects, uses, and protects your personal data.",
};

export default async function PrivacyPage() {
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
      title: "1. INFORMATION WE COLLECT",
      content: (
        <p>
          We collect information you give us directly — your name, email address, account credentials, billing details (handled by third-party payment processors; we never store full card numbers), uploaded content metadata such as file names, sizes and timestamps, and any messages you send to support. We also collect some information automatically: IP address, device identifiers, browser type, operating system, log data, and usage metrics like uploads, downloads, and delivery-link activity. We may receive limited information from third parties such as payment processors, authentication providers, analytics tools, and fraud-detection services.
        </p>
      ),
    },
    {
      title: "2. HOW WE USE YOUR INFORMATION",
      content: (
        <p>
          We use your information to provide, operate, and improve the Services; process payments and manage subscriptions; deliver, stream, and transcode your content; communicate with you; provide support; monitor usage and prevent abuse; and comply with legal obligations.
        </p>
      ),
    },
    {
      title: "3. HOW WE SHARE INFORMATION",
      content: (
        <p>
          We share information with service providers who help us run CineSpace — hosting and storage providers, payment processors, analytics tools, and email/SMS providers. We may disclose information when required by law, court order, or governmental request, or in connection with a merger, acquisition, or asset sale. We do not sell your personal information.
        </p>
      ),
    },
    {
      title: "4. COOKIES & TRACKING",
      content: (
        <p>
          We use cookies and similar technologies to keep you signed in, remember preferences, analyse site usage, and measure campaigns. See our{" "}
          <Link
            href="/cookies"
            className="text-white hover:text-[#f5551d] transition-colors underline underline-offset-2"
          >
            Cookie Policy
          </Link>{" "}
          for full details and controls.
        </p>
      ),
    },
    {
      title: "5. DATA RETENTION",
      content: (
        <p>
          We keep personal information only as long as needed to provide the Services, comply with legal obligations, resolve disputes, and enforce agreements. Uploaded content is retained according to your plan and storage usage; content exceeding plan limits may be removed after downgrade or termination as described in the{" "}
          <Link
            href="/terms"
            className="text-white hover:text-[#f5551d] transition-colors underline underline-offset-2"
          >
            Terms of Service
          </Link>
          .
        </p>
      ),
    },
    {
      title: "6. DATA SECURITY",
      content: (
        <p>
          We use administrative, technical, and physical safeguards to protect your information. No system is 100% secure, and we cannot guarantee absolute security.
        </p>
      ),
    },
    {
      title: "7. YOUR RIGHTS",
      content: (
        <p>
          Depending on where you live, you may have rights to access, correct, delete, or port your personal data, restrict or object to processing, and lodge a complaint with a supervisory authority. To exercise any of these rights, contact{" "}
          <a
            href="mailto:hello@cinespace.film"
            className="text-white hover:text-[#f5551d] transition-colors underline underline-offset-2"
          >
            hello@cinespace.film
          </a>{" "}
          — we verify all requests before acting on them.
        </p>
      ),
    },
    {
      title: "8. CHILDREN’S PRIVACY",
      content: (
        <p>
          The Services are not intended for anyone under 18. We do not knowingly collect personal information from minors, and we delete it if we become aware of it.
        </p>
      ),
    },
    {
      title: "9. INTERNATIONAL TRANSFERS",
      content: (
        <p>
          Your information may be transferred to and processed in countries where our service providers operate. By using the Services you consent to such transfers.
        </p>
      ),
    },
    {
      title: "10. CHANGES TO THIS POLICY",
      content: (
        <p>
          We may update this Privacy Policy from time to time. We will notify you of material changes by email or a notice in the product. Continued use of the Services means you accept the updated policy.
        </p>
      ),
    },
    {
      title: "11. CONTACT",
      content: (
        <p>
          For privacy questions or requests, contact CineSpace at{" "}
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
      badge="PRIVACY"
      title="PRIVACY POLICY"
      lastUpdated="Last updated: June 24th, 2026"
      intro="CineSpace (“CineSpace,” “we,” “our,” or “us”) respects your privacy. This Privacy Policy explains how we collect, use, share, and protect your information when you use our website, applications, and services (together, the “Services”). By using the Services, you agree to the practices described here."
      sections={sections}
      user={user}
      workspace={workspace}
    />
  );
}
