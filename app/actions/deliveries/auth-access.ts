"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getServerAdminServices } from "@/core/server";
import { setDeliveryPasscodeCookie, hasValidDeliveryPasscodeCookie } from "@/lib/security/delivery-token";
import { verifyDeliveryPasscode } from "@/lib/security/passcode";
import { presignDeliveryAssets } from "@/lib/media-server";
import { verifyDeliveryPasscodeSchema, safeValidate } from "@/lib/validations";
import { normalizeActionError } from "../safe-action";
import { checkRateLimit, getClientIp, RATELIMIT_POLICIES } from "@/lib/upstash";

export async function verifyDeliveryPasscodeAction(
  shareToken: string,
  passcode: string,
  isCreatorBypass: boolean = false
) {
  try {
    const validated = safeValidate(verifyDeliveryPasscodeSchema, {
      shareToken,
      passcode,
      isCreatorBypass,
    });
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const {
      shareToken: cleanShareToken,
      passcode: cleanPasscode,
      isCreatorBypass: bypass,
    } = validated.data;

    const ip = await getClientIp();
    const rateLimit = await checkRateLimit({
      policy: RATELIMIT_POLICIES.deliveryPasscode,
      identifier: [ip, cleanShareToken],
    });
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.error };
    }

    const services = await getServerAdminServices();
    const delivery = await services.delivery.getDeliveryByShareToken(cleanShareToken, {
      allowExpired: bypass,
    });
    if (!delivery) {
      return { success: false, error: "Delivery not found or link has expired." };
    }

    let isAuthorized = !delivery.passcodeHash;

    if (!isAuthorized && bypass) {
      const user = await services.auth.getCurrentUser();
      if (user) {
        const isMember = await services.member
          .isMember(delivery.workspaceId, user.id)
          .catch(() => false);
        if (isMember) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      if (!cleanPasscode) {
        return { success: false, error: "Please enter the client passcode." };
      }
      const isMatch = await verifyDeliveryPasscode(cleanPasscode, delivery.passcodeHash);
      if (!isMatch) {
        return { success: false, error: "Incorrect passcode. Please try again." };
      }
      isAuthorized = true;
    }

    // Set HTTP-only cryptographically signed token valid for 30 days across site
    await setDeliveryPasscodeCookie(cleanShareToken);

    // Retrieve and map full assets & versions to return immediately upon unlock
    const fullDetails = await services.delivery.getDeliveryWithFullDetails(shareToken);
    const mappedAssets = (fullDetails?.assets || []).map((asset) => {
      const mappedVersions = (asset.versions || []).map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        rawFileUrl: v.rawFileUrl,
        downloadUrl: v.rawFileUrl,
        hlsManifestUrl: v.hlsManifestUrl || null,
        thumbnailUrl: v.thumbnailUrl || null,
        fileSizeBytes: v.fileSizeBytes || null,
        durationSeconds: v.durationSeconds ? Number(v.durationSeconds) : null,
        transcodingStatus: v.transcodingStatus || null,
        isActiveVersion: v.isActiveVersion,
      }));

      const activeVersion =
        mappedVersions.find((v) => v.isActiveVersion) || mappedVersions[0] || null;

      const mappedFeedback = (asset.feedback || []).map((f) => ({
        id: f.id,
        assetVersionId: f.assetVersionId,
        authorName: f.authorName,
        commentText: f.commentText,
        timestampSeconds: f.timestampSeconds ? Number(f.timestampSeconds) : null,
        isResolved: f.isResolved,
        createdAt: f.createdAt,
        replies: (f.replies || []).map((r) => ({
          id: r.id,
          feedbackId: r.feedbackId,
          authorName: r.authorName,
          commentText: r.commentText,
          createdAt: r.createdAt,
        })),
      }));

      return {
        id: asset.id,
        title: asset.title,
        type: asset.type,
        aspectRatio: asset.aspectRatio || undefined,
        isApproved: asset.isApproved,
        sortOrder: asset.sortOrder,
        versions: mappedVersions,
        activeVersion,
        feedback: mappedFeedback,
      };
    });

    const presignedAssets = await presignDeliveryAssets(mappedAssets, services.storage, 7200);
    revalidatePath(`/deliver/${shareToken}`);
    return { success: true, assets: presignedAssets };
  } catch (err: unknown) {
    return { success: false, error: normalizeActionError(err, "Failed to verify passcode.") };
  }
}

export async function verifyPassphraseWithTokenAction(
  shareToken: string,
  candidatePassphrase: string
) {
  try {
    const ip = await getClientIp();
    const rateLimit = await checkRateLimit({
      policy: RATELIMIT_POLICIES.deliveryPasscode,
      identifier: [ip, shareToken],
    });
    if (!rateLimit.success) {
      return { success: false, isProtected: true, error: rateLimit.error };
    }

    const services = await getServerAdminServices();
    const delivery = await services.delivery.getDeliveryByShareToken(shareToken);
    if (!delivery) {
      return { success: false, error: "Delivery not found." };
    }

    if (!delivery.passcodeHash) {
      return { success: true, isProtected: false, message: "Link is public (no passphrase required)." };
    }

    const clean = candidatePassphrase.trim();
    if (!clean) {
      return { success: false, isProtected: true, error: "Please enter a passphrase to verify." };
    }

    const isMatch = await verifyDeliveryPasscode(clean, delivery.passcodeHash);

    if (!isMatch) {
      return {
        success: false,
        isProtected: true,
        error: "Passphrase does not match the token security key.",
      };
    }

    return {
      success: true,
      isProtected: true,
      message: "Passphrase verified successfully with delivery token.",
    };
  } catch (err: unknown) {
    return { success: false, error: normalizeActionError(err, "Failed to verify passphrase.") };
  }
}

export async function checkDeliveryAccessAction(shareToken: string) {
  try {
    const cookieStore = await cookies();
    const hasAccess = hasValidDeliveryPasscodeCookie(cookieStore, shareToken);
    return { hasAccess };
  } catch {
    return { hasAccess: false };
  }
}
