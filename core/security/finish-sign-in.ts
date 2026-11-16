import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getServerAdminServices, getServerServices } from "@/core/server";
import type { Workspace } from "@/core/entities/workspace";
import type { SessionIdentity } from "@/core/services/session.service";
import { trackUserSession } from "@/lib/session-manager";
import { clientIpFromHeaders } from "@/lib/security/client-ip";
import { hasVerifiedFactor, twoFactorUrl } from "@/lib/security/two-factor";
import { createScopedLogger } from "@/lib/logger";

const log = createScopedLogger({ module: "finish-sign-in" });

export interface FinishSignInInput {
  /** The user from Supabase Auth's sign-in or verify response (never the copy in the session cookie). */
  user: User;
  /** The new login, read from the Supabase client that just created it. */
  identity: SessionIdentity | null;
  headers: Headers;
  /** Where the visitor asked to go, already checked with safeReturnPath. "/" or null: their workspace. */
  requestedPath?: string | null;
  /** A workspace invitation to open next (Google sign-up from an invite link). */
  inviteToken?: string | null;
  waitlistToken?: string | null;
  /** Google sign-in: the name and picture to copy onto the profile. */
  oauthProfile?: { fullName: string; avatarUrl: string | null };
}

export interface FinishSignInResult {
  /** Where to send the browser: /mfa first for users with two-factor sign-in. */
  redirectTo: string;
  workspace: Workspace | null;
  needsTwoFactor: boolean;
}

/**
 * Runs once Supabase Auth has created a login, on every sign-in path: password sign-in, sign-up,
 * the OAuth callback and email links. It records the device, claims a waitlist invite, syncs the
 * Google profile, then works out where to go next.
 *
 * Users with two-factor sign-in go to /mfa first. Their session is still aal1 there, and RLS
 * refuses aal1 sessions of users with an authenticator, so their lookups use the service role,
 * with the user id from Supabase Auth's response, never from the browser. Nothing is created
 * for them.
 */
export async function finishSignIn(input: FinishSignInInput): Promise<FinishSignInResult> {
  const { user } = input;
  const services = await getServerServices();
  const needsTwoFactor = hasVerifiedFactor(user);

  await trackUserSession(services.session, input.identity, input.headers).catch((err) =>
    log.warn({ err, userId: user.id }, "Could not record the login session")
  );

  if (input.waitlistToken) {
    await services.waitlist.claimInvite(input.waitlistToken).catch((err) =>
      log.warn({ err, userId: user.id }, "Could not claim the waitlist invite")
    );
  }

  const lookup = needsTwoFactor ? await getServerAdminServices() : services;

  if (input.oauthProfile) {
    await lookup.profile
      .syncOAuthProfile(user.id, { ...input.oauthProfile, ip: clientIpFromHeaders(input.headers, "") || undefined })
      .catch((err) => log.warn({ err, userId: user.id }, "Could not sync the OAuth profile"));
  }

  let workspace: Workspace | null = null;
  try {
    const workspaces = await lookup.workspace.getUserWorkspaces(user.id);
    workspace = workspaces[0] ?? null;
    if (!workspace && !needsTwoFactor) {
      workspace = await services.workspace.getOrCreateWorkspace(user.id, studioNameFor(user));
    }
  } catch (err) {
    log.error({ err, userId: user.id }, "Could not find or create the workspace after sign-in");
  }

  let destination = workspace ? `/${workspace.slug}` : "/";
  if (input.inviteToken) {
    destination = `/invite/${encodeURIComponent(input.inviteToken)}`;
  } else if (input.requestedPath && input.requestedPath !== "/") {
    destination = input.requestedPath;
  }

  return {
    redirectTo: needsTwoFactor ? twoFactorUrl(destination) : destination,
    workspace,
    needsTwoFactor,
  };
}

function studioNameFor(user: User): string {
  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  return meta.full_name || meta.name || user.email?.split("@")[0] || "My Studio";
}

/**
 * Redirects a route handler's response to `path` on this app. Behind Vercel's proxy the public
 * host is in `x-forwarded-host`; in development the request's own origin is right.
 */
export function redirectWithinApp(request: Request, path: string): NextResponse {
  const { origin } = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (process.env.NODE_ENV !== "development" && forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${path}`);
  }
  return NextResponse.redirect(`${origin}${path}`);
}
