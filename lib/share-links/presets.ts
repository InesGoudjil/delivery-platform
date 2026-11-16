/**
 * Ready-made settings for a new share link (plans/share-links-manager-plan-2026-11-16.md §3.3).
 * Picking one fills the form; everything stays editable. Settings the plan doesn't include
 * (passcodes, alerts, long expiry) are left off.
 */

export interface ShareLinkPresetSettings {
  /** Days from now, or null for a link that never expires. */
  expiresInDays: number | null;
  passcode: boolean;
  canComment: boolean;
  canApprove: boolean;
  canDownload: boolean;
  notifyOnOpen: boolean;
  notifyOnDownload: boolean;
  notifyOnComment: boolean;
}

export interface ShareLinkPreset extends ShareLinkPresetSettings {
  id: "review" | "final" | "screener";
  name: string;
  /** The new link's name. */
  label: string;
  summary: string;
}

export const SHARE_LINK_PRESETS: readonly ShareLinkPreset[] = [
  {
    id: "review",
    name: "Review",
    label: "Client review",
    summary: "7 days · comments and approvals · no downloads",
    expiresInDays: 7,
    passcode: false,
    canComment: true,
    canApprove: true,
    canDownload: false,
    notifyOnOpen: false,
    notifyOnDownload: false,
    notifyOnComment: true,
  },
  {
    id: "final",
    name: "Final delivery",
    label: "Final delivery",
    summary: "30 days · downloads on · download alerts",
    expiresInDays: 30,
    passcode: false,
    canComment: true,
    canApprove: true,
    canDownload: true,
    notifyOnOpen: false,
    notifyOnDownload: true,
    notifyOnComment: true,
  },
  {
    id: "screener",
    name: "Screener",
    label: "Screener",
    summary: "3 days · passcode · view only",
    expiresInDays: 3,
    passcode: true,
    canComment: false,
    canApprove: false,
    canDownload: false,
    notifyOnOpen: true,
    notifyOnDownload: false,
    notifyOnComment: false,
  },
];

/** The preset's settings, with what the plan doesn't include turned off. */
export function presetForPlan(
  preset: ShareLinkPresetSettings,
  can: { passcode: boolean; extendedExpiry: boolean; alerts: boolean }
): ShareLinkPresetSettings {
  return {
    ...preset,
    passcode: preset.passcode && can.passcode,
    expiresInDays:
      preset.expiresInDays === null || preset.expiresInDays > 30
        ? can.extendedExpiry
          ? preset.expiresInDays
          : 30
        : preset.expiresInDays,
    notifyOnOpen: preset.notifyOnOpen && can.alerts,
    notifyOnDownload: preset.notifyOnDownload && can.alerts,
  };
}
