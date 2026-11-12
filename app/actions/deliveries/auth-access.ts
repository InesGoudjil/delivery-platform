"use server";

import { getClientRoom, roomRefusal, unlockedRoom } from "@/core/security/client-room";
import { requireDeliveryAccess } from "@/core/security/guards";
import { grantRoomAccess } from "@/lib/security/delivery-token";
import { verifyDeliveryPasscode } from "@/lib/security/passcode";
import { loadRoomAssets } from "@/lib/client-room/content";
import { verifyDeliveryPasscodeSchema, safeValidate } from "@/lib/validations";
import { normalizeActionError } from "../safe-action";
import { checkRateLimit, getClientIp, RATELIMIT_POLICIES } from "@/lib/upstash";

/**
 * Opens a passcode-protected client room. On success the server sets the room's unlock
 * cookie (bound to the current link and passcode) and returns the room's files.
 *
 * A signed-in member of the studio opens their own room without the passcode; the server
 * checks their membership (it used to be a flag the browser sent).
 */
export async function verifyDeliveryPasscodeAction(shareToken: string, passcode: string) {
  try {
    const validated = safeValidate(verifyDeliveryPasscodeSchema, { shareToken, passcode });
    if (!validated.success) {
      return { success: false, error: validated.error };
    }
    const { shareToken: token, passcode: candidate } = validated.data;

    const ip = await getClientIp();
    const [perVisitor, perRoom] = await Promise.all([
      checkRateLimit({ policy: RATELIMIT_POLICIES.deliveryPasscode, identifier: [ip, token] }),
      checkRateLimit({ policy: RATELIMIT_POLICIES.deliveryPasscodeRoom, identifier: [token] }),
    ]);
    if (!perVisitor.success) return { success: false, error: perVisitor.error };
    if (!perRoom.success) return { success: false, error: perRoom.error };

    const room = await getClientRoom(token);
    if (!room) return { success: false, error: roomRefusal(null) };
    if (!room.member && (room.state === "expired" || room.state === "unavailable")) {
      return { success: false, error: roomRefusal(room) };
    }

    const { delivery } = room;
    if (!room.member && delivery.passcodeHash) {
      if (!candidate) return { success: false, error: "Please enter the passcode." };
      const isMatch = await verifyDeliveryPasscode(candidate, delivery.passcodeHash);
      if (!isMatch) return { success: false, error: "Incorrect passcode. Please try again." };
    }

    if (delivery.passcodeHash) {
      await grantRoomAccess(delivery, delivery.expiresAt);
    }

    const { assets } = await loadRoomAssets(unlockedRoom(room));
    return { success: true, assets };
  } catch (err: unknown) {
    return { success: false, error: normalizeActionError(err, "Failed to verify passcode.") };
  }
}

/**
 * Studio-side check that a typed passcode matches the one saved on a delivery
 * (the share dialog's "Verify" button). Admins only, rate limited.
 */
export async function verifyPassphraseWithTokenAction(deliveryId: string, candidatePassphrase: string) {
  try {
    const { delivery } = await requireDeliveryAccess(deliveryId, "admin");

    const rateLimit = await checkRateLimit({
      policy: RATELIMIT_POLICIES.deliveryPasscode,
      identifier: [await getClientIp(), delivery.id],
    });
    if (!rateLimit.success) {
      return { success: false, isProtected: true, error: rateLimit.error };
    }

    if (!delivery.passcodeHash) {
      return { success: true, isProtected: false, message: "Link is public (no passphrase required)." };
    }

    const clean = (candidatePassphrase || "").trim();
    if (!clean) {
      return { success: false, isProtected: true, error: "Please enter a passphrase to verify." };
    }

    const isMatch = await verifyDeliveryPasscode(clean, delivery.passcodeHash);
    if (!isMatch) {
      return { success: false, isProtected: true, error: "That passphrase doesn't match the saved one." };
    }
    return { success: true, isProtected: true, message: "Passphrase matches the saved one." };
  } catch (err: unknown) {
    return { success: false, error: normalizeActionError(err, "Failed to verify passphrase.") };
  }
}
