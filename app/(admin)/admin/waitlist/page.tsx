import { getServerServices } from "@/core/server";
import { WaitlistClient } from "./waitlist-client";

export default async function AdminWaitlistPage() {
  const services = await getServerServices();

  let metrics = { total: 0, pending: 0, invited: 0, registered: 0 };
  let entries: any[] = [];

  try {
    metrics = await services.waitlist.getDashboardMetrics();
    entries = await services.waitlist.listPending(100);
  } catch (err) {
    console.warn("Failed to load waitlist entries in admin:", err);
  }

  return <WaitlistClient metrics={metrics} entries={entries} />;
}
