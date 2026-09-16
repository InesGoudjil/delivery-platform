import { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { getServerServices } from "@/core/server";

export const metadata: Metadata = {
  title: "Copyright Policy — CineSpace",
  description: "CineSpace Copyright Policy and DMCA notice procedures.",
};

export default async function CopyrightPage() {
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
      title: "1. FILING AN INFRINGEMENT NOTICE",
      content: (
        <p>
          If you are a copyright owner (or authorised to act for one), report alleged infringement on or through the Services by sending a written notice that includes: your physical or electronic signature; identification of the copyrighted work claimed to be infringed; identification of the material claimed to be infringing and where it is located (for example the specific delivery or portfolio URL); your contact details (address, phone, email); a statement of good-faith belief that the use is not authorised by the copyright owner, its agent, or the law; and a statement, under penalty of perjury, that the information in the notice is accurate and that you are authorised to act for the owner.
        </p>
      ),
    },
    {
      title: "2. COPYRIGHT CONTACT",
      content: (
        <p>
          Send notices to our copyright contact: CineSpace — Attn: Copyright Agent,{" "}
          <a
            href="mailto:hello@cinespace.film"
            className="text-white hover:text-[#f5551d] transition-colors underline underline-offset-2"
          >
            hello@cinespace.film
          </a>
          . Please include &ldquo;Copyright Takedown Notice&rdquo; in the subject line.
        </p>
      ),
    },
    {
      title: "3. COUNTER-NOTIFICATION",
      content: (
        <p>
          If you believe your content was removed by mistake or misidentification, you may file a written counter-notification with the information required by applicable law. On receipt of a valid counter-notification, we may restore the material if the original complaining party does not initiate court action within 10–14 business days.
        </p>
      ),
    },
    {
      title: "4. REPEAT INFRINGERS",
      content: (
        <p>
          In appropriate circumstances and at our sole discretion, we terminate the accounts of users deemed to be repeat infringers.
        </p>
      ),
    },
  ];

  return (
    <LegalPageLayout
      badge="COPYRIGHT"
      title="COPYRIGHT POLICY"
      lastUpdated="Last updated: June 20th, 2026"
      intro="CineSpace respects the intellectual property rights of others and expects its users to do the same. We respond promptly to notices of alleged copyright infringement reported to our designated copyright contact identified below."
      sections={sections}
      user={user}
      workspace={workspace}
    />
  );
}
