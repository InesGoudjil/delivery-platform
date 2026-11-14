import { type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import { handleWaitlistMiddleware } from "./lib/middleware/waitlist";

export async function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  request.headers.set("x-request-id", requestId);

  // 1. Waitlist gatekeeping, preview bypass tokens, and cookies
  const waitlistResponse = handleWaitlistMiddleware(request, { requestId });
  if (waitlistResponse) {
    return waitlistResponse;
  }

  // 2. Auth session refresh, session revocation & route guards
  const response = await updateSession(request);
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sw.js, manifest.webmanifest, robots.txt
     * - images, media, and font assets
     */
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|mp4|webm)$).*)",
  ],
};
