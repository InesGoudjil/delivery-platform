import { Metadata } from "next";
import { getServerServices } from "@/core/server";
import { WaitlistScreen } from "@/components/waitlist/WaitlistScreen";

export const metadata: Metadata = {
  title: "Join the Waitlist — CineSpace",
  description:
    "Deliver films like a studio. Join the CineSpace private beta waitlist for early access and founder pricing.",
};

export default async function WaitlistPage(props: {
  searchParams?: Promise<{ ref?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const referralCode = searchParams?.ref;

  let totalCount = 0;
  try {
    const services = await getServerServices();
    const metrics = await services.waitlist.getDashboardMetrics();
    totalCount = metrics.total;
  } catch (err) {
    console.warn("Could not fetch waitlist metrics for count:", err);
  }

  return (
    <WaitlistScreen
      initialReferralCode={referralCode}
      initialCount={totalCount}
    />
  );
}
