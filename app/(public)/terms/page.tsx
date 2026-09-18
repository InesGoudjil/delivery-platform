import { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { getServerServices } from "@/core/server";

export const metadata: Metadata = {
  title: "Terms of Service — CineSpace",
  description: "Terms and conditions governing the use of CineSpace platforms and services.",
};

export default async function TermsPage() {
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
      title: "1. ACCOUNT REGISTRATION",
      content: (
        <p>
          You must be at least 18 years old to use the Services. You are responsible for safeguarding your credentials and for all activity under your account. To prevent abuse, we may require email or phone verification; accounts created by bots or disposable email addresses may be terminated without notice.
        </p>
      ),
    },
    {
      title: "2. SERVICE PLANS",
      content: (
        <p>
          Our free Starter plan is subject to usage limits and may be modified or discontinued at any time; inactive free accounts may be deleted. Paid subscriptions (Basic, Pro, Studio) are billed in advance and fees are non-refundable except where required by law. If a payment fails, your account may revert to Starter limits and uploads may be suspended until usage is reduced or the plan is renewed.
        </p>
      ),
    },
    {
      title: "3. THE SILO (ARCHIVAL STORAGE)",
      content: (
        <p>
          The Silo is cold storage for delivered projects, available on Pro and Studio plans. Access to Silo content requires an active paid subscription; if your subscription lapses, archived data is preserved but locked until you resume a paid plan. The Silo is designed for archival purposes — restore times of 24–48 hours apply, and content is not instantly streamable.
        </p>
      ),
    },
    {
      title: "4. FAIR USE",
      content: (
        <p>
          CineSpace is built for the delivery and archiving of professional visual media by human-led workflows. Automated scripts, bots, or upload/delete cycles designed to bypass plan limits are prohibited. Backend processing (transcoding, proxies) is a shared resource; accounts that ingest several times their plan&rsquo;s storage per billing cycle may be temporarily throttled. If you have a legitimate high-volume need, contact us for a custom solution. Reselling your account or using your storage as a public file host is not permitted.
        </p>
      ),
    },
    {
      title: "5. USER CONTENT & COPYRIGHT",
      content: (
        <p>
          You keep full ownership of your content. You grant CineSpace a limited licence to host, transcode, and deliver it as needed to provide the Services. You agree not to upload content that is illegal, infringing, or malicious. We comply with applicable copyright law — see our{" "}
          <Link
            href="/copyright"
            className="text-white hover:text-[#f5551d] transition-colors underline underline-offset-2"
          >
            Copyright Policy
          </Link>{" "}
          for the notice-and-takedown process. We may remove infringing content and terminate repeat infringers.
        </p>
      ),
    },
    {
      title: "6. DISCLAIMERS",
      content: (
        <p>
          The Services are provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; To the fullest extent permitted by law, CineSpace disclaims all warranties, express or implied, and does not guarantee the Services will be uninterrupted, secure, or error-free.
        </p>
      ),
    },
    {
      title: "7. LIMITATION OF LIABILITY",
      content: (
        <p>
          To the maximum extent permitted by law, CineSpace shall not be liable for indirect, incidental, or consequential damages, including lost profits, data loss, or business interruption. Our total liability for any claim shall not exceed the amount you paid us in the 12 months preceding the claim.
        </p>
      ),
    },
    {
      title: "8. INDEMNIFICATION",
      content: (
        <p>
          You agree to indemnify and hold CineSpace and its officers harmless from claims, damages, and expenses (including legal fees) arising from your use of the Services, your violation of these Terms, or your violation of third-party rights.
        </p>
      ),
    },
    {
      title: "9. TERMINATION",
      content: (
        <p>
          We may suspend or terminate your account for violations of these Terms. Upon termination, your data may be permanently deleted after a 30-day grace period.
        </p>
      ),
    },
    {
      title: "10. GOVERNING LAW",
      content: (
        <p>
          These Terms are governed by the laws of the United Arab Emirates, without regard to conflict of law principles.
        </p>
      ),
    },
  ];

  return (
    <LegalPageLayout
      badge="LEGAL"
      title="TERMS OF SERVICE"
      lastUpdated="Last updated: June 12th, 2026"
      intro="Welcome to CineSpace (“CineSpace,” “we,” “our,” “us”). By accessing or using our website, applications, or services (together, the “Services”), you agree to be bound by these Terms of Service. If you do not agree, do not use the Services."
      sections={sections}
      user={user}
      workspace={workspace}
    />
  );
}
