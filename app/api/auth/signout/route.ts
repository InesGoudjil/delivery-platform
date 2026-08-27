import { getServerServices } from "@/core/server";
import { redirect } from "next/navigation";

export async function POST() {
  const services = await getServerServices();
  await services.auth.signOut();
  redirect("/login");
}
