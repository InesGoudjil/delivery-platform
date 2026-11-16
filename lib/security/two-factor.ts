/**
 * Two-factor sign-in, for every user who turns it on (not only platform admins).
 *
 * A user with a verified authenticator first signs in at `aal1` (with a password, Google or an
 * email link). The session reaches `aal2` once they enter their code on /mfa. Until then the
 * session is "awaiting two-factor":
 * - the middleware sends it to /mfa;
 * - the server treats it as signed out (AuthService.getCurrentUser);
 * - row-level security refuses it.
 *
 * All three read the same signal: the `mfa_enrolled` claim, which the Custom Access Token hook
 * (migration 20261116150000_two_factor_sign_in) adds to every access token. Because they share
 * it, they always agree. Without the hook there is no claim, so none of the three enforce
 * anything. Sign-in still sends users with an authenticator to /mfa.
 *
 * Edge-safe.
 */

export const MFA_ENROLLED_CLAIM = "mfa_enrolled";

interface FactorLike {
  status?: string | null;
}

/**
 * True when the user has a verified authenticator. Only pass a user that came from Supabase Auth
 * (getUser(), or a sign-in or verify response). Never pass the copy in the session cookie: the
 * browser can edit it.
 */
export function hasVerifiedFactor(user: { factors?: FactorLike[] | null } | null | undefined): boolean {
  return Boolean(user?.factors?.some((factor) => factor.status === "verified"));
}

/**
 * True when verified access-token claims belong to someone who has two-factor sign-in but hasn't
 * entered a code in this session yet.
 */
export function isAwaitingTwoFactor(claims: unknown): boolean {
  if (!claims || typeof claims !== "object") return false;
  const { [MFA_ENROLLED_CLAIM]: enrolled, aal } = claims as Record<string, unknown>;
  return enrolled === true && aal !== "aal2";
}

/** The two-factor page. Afterwards it sends the user on to `returnTo`, a same-site path. */
export function twoFactorUrl(returnTo: string): string {
  return `/mfa?redirect=${encodeURIComponent(returnTo)}`;
}
