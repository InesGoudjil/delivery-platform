import LandingPage from "@/components/landing/LandingPage";
import { getServerServices } from "@/core/server";
export default async function Home(props: {
  searchParams?: Promise<{ ref?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const referralCode = searchParams?.ref;

  try {
    // Fetch authentication & workspace details purely via Core Domain Services
    const services = await getServerServices();
    const { user, workspace } = await services.auth.getCurrentSessionData();

    return <LandingPage user={user} workspace={workspace} referralCode={referralCode} />;
  } catch {
    return <LandingPage user={null} workspace={null} referralCode={referralCode} />;
  }
}
