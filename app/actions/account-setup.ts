"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerServices } from "@/core/server";
import {
  completeAccountSetup,
  signInTokenFor,
  SETUP_LINK_UNUSABLE_MESSAGE,
} from "@/core/security/account-setup";
import { finishSignIn } from "@/core/security/finish-sign-in";
import { readSessionIdentity } from "@/core/services/session.service";
import { createScopedLogger } from "@/lib/logger";
import { signOutCurrentSession } from "@/lib/session-manager";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { resetPasswordSchema } from "@/lib/validations/auth";

const log = createScopedLogger({ actionGroup: "account-setup" });

export interface AccountSetupState {
  error?: string;
  /** The link can't be used (expired, used, replaced): the page offers the way back in instead. */
  linkUnusable?: boolean;
  /** The password is saved but signing in failed: they sign in on /login. */
  passwordSet?: boolean;
}

/**
 * /welcome/<token>: someone a platform admin made an account for (Admin → Users → New client)
 * chooses their password. They're then signed in and sent to their workspace. No session is
 * needed: the setup link is the credential (core/security/account-setup.ts).
 */
export async function completeAccountSetupAction(
  _prevState: AccountSetupState | null,
  formData: FormData
): Promise<AccountSetupState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirm-password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Choose a password." };
  }

  const limit = await checkRateLimit({
    policy: RATELIMIT_POLICIES.authLogin,
    identifier: [await getClientIp(), "account-setup"],
  });
  if (!limit.success) {
    return { error: limit.error || "Too many attempts. Please try again later." };
  }

  let destination: string;
  try {
    const admin = createServiceRoleClient();
    const result = await completeAccountSetup(admin, formData.get("token"), parsed.data.password);
    if (result.ok === false) {
      if (result.problem === "password_refused") return { error: result.message };
      log.info({ problem: result.problem }, "Setup link refused");
      return { error: SETUP_LINK_UNUSABLE_MESSAGE, linkUnusable: true };
    }

    // The password is saved. Now sign this browser in as them, ending whoever was signed in here.
    try {
      const supabase = await createClient();
      const current = await readSessionIdentity(supabase.auth);
      if (current && current.userId !== result.userId) {
        await signOutCurrentSession(await getServerServices(), await cookies());
      }
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: await signInTokenFor(admin, result.email),
        type: "magiclink",
      });
      if (error || !data?.user) throw error ?? new Error("The sign-in returned no user.");

      ({ redirectTo: destination } = await finishSignIn({
        user: data.user,
        identity: await readSessionIdentity(supabase.auth),
        headers: await headers(),
        requestedPath: "/",
      }));
    } catch (err: unknown) {
      log.warn({ err, userId: result.userId }, "Password set from a setup link, but the sign-in after it failed");
      return {
        passwordSet: true,
        error: "Your password is saved, but we couldn't sign you in. Sign in with your email and new password.",
      };
    }
  } catch (err: unknown) {
    log.error({ err }, "Account setup failed");
    return { error: "Something went wrong on our side. Please try again in a minute." };
  }

  revalidatePath("/", "layout");
  redirect(destination);
}
