import LandingPage from "@/components/landing/LandingPage";
import { getServerServices } from "@/core/server";

export default async function Home() {
  // Fetch authentication & workspace details purely via Core Domain Services
  const services = await getServerServices();
  const { user, workspace } = await services.auth.getCurrentSessionData();

  return <LandingPage user={user} workspace={workspace} />;
}
