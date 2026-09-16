import { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { getServerServices } from "@/core/server";

export const metadata: Metadata = {
  title: "Refunds & Cancellations — CineSpace",
  description: "CineSpace refund and cancellation policy for subscriptions and storage purchases.",
};

export default async function RefundsPage() {
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
      title: "1. SUBSCRIPTIONS (BASIC, PRO & STUDIO)",
      content: (
        <p>
          All subscription fees are non-refundable. We do not provide refunds, credits, or prorated billing for unused time, downgrades, partial months, failure to use the service, or accounts suspended for policy violations. Once a billing cycle begins, charges for that cycle are final.
        </p>
      ),
    },
    {
      title: "2. CANCELLATION",
      content: (
        <p>
          You may cancel your subscription at any time from your dashboard. Your subscription stays active until the end of the current billing period, and no further charges occur after cancellation, provided it is completed before the next renewal date.
        </p>
      ),
    },
    {
      title: "3. FAILED PAYMENTS",
      content: (
        <p>
          If a payment fails, your account may be downgraded or restricted, access to paid features (including The Silo) may be suspended, and your data may become subject to plan limits.
        </p>
      ),
    },
    {
      title: "4. THE SILO (STORAGE PURCHASES)",
      content: (
        <p>
          Silo capacity purchases are one-time and non-refundable under any circumstances, including non-use, account cancellation, downgrade to Starter, or inaccessibility due to a lapsed subscription. Capacity is provisioned immediately as a digital service and is therefore not eligible for refunds. Silo access requires an active paid subscription — no refunds are issued for periods during which access is unavailable due to non-payment or cancellation.
        </p>
      ),
    },
    {
      title: "5. USAGE LIMITS & AVAILABILITY",
      content: (
        <p>
          Processing, bandwidth, and storage are governed by your plan limits and our Fair Use policy; throttling or enforcement does not entitle you to refunds. The Services are provided as-is — temporary interruptions, maintenance, or performance degradation do not entitle you to refunds, credits, or extensions.
        </p>
      ),
    },
    {
      title: "6. CHARGEBACKS",
      content: (
        <p>
          If you initiate a chargeback or payment dispute, we may suspend or terminate your account; you remain responsible for outstanding balances, and reinstatement may require resolution of the dispute. Please contact support before initiating a chargeback.
        </p>
      ),
    },
    {
      title: "7. EXCEPTIONS REQUIRED BY LAW",
      content: (
        <p>
          Refunds will be issued where required by applicable consumer-protection law. If local law grants you a mandatory right of withdrawal or refund, those rights are honoured strictly to the extent required.
        </p>
      ),
    },
    {
      title: "8. CONTACT",
      content: (
        <p>
          For billing questions or cancellation support:{" "}
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
      title="REFUNDS & CANCELLATIONS"
      lastUpdated="Last updated: February 8th, 2026"
      intro="This Refund & Cancellation Policy governs payments made to CineSpace for access to our services, including subscriptions, storage capacity, and processing features (the “Services”). By purchasing or subscribing, you acknowledge and agree to this policy."
      sections={sections}
      user={user}
      workspace={workspace}
    />
  );
}
