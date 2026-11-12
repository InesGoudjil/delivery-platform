import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerServices } from "@/core/server";
import { signOutCurrentSession } from "@/lib/session-manager";

/**
 * Signs this device out only (same as signOutAction): flags its session row revoked and ends its
 * Supabase login. Other devices stay signed in. 303 so the browser follows with a GET.
 */
export async function POST(request: Request) {
  const services = await getServerServices();
  await signOutCurrentSession(services, await cookies());
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
