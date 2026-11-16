"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Eye, EyeOff, Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TypographyMuted, TypographySpan } from "@/components/ui/typography";
import { generatePassphrase, passcodeProblem } from "@/lib/security/passphrase";
import { SHARE_LINK_PRESETS, presetForPlan, type ShareLinkPreset } from "@/lib/share-links/presets";
import { expiryLabel } from "@/lib/share-links/format";
import type { ShareLinkView } from "@/lib/share-links/view";
import type { ShareLinkSettingsInput, UpdateShareLinkInput } from "@/lib/validations/share-links";

/** What the plan includes, for locking options (the server checks the same rules). */
export interface ShareLinkPlan {
  passcode: boolean;
  extendedExpiry: boolean;
  alerts: boolean;
}

type ExpiryChoice = "keep" | "1" | "3" | "7" | "30" | "90" | "never" | "date";

const EXPIRY_CHOICES: ReadonlyArray<{ choice: Exclude<ExpiryChoice, "keep">; label: string; extended: boolean }> = [
  { choice: "1", label: "24 hours", extended: false },
  { choice: "3", label: "3 days", extended: false },
  { choice: "7", label: "7 days", extended: false },
  { choice: "30", label: "30 days", extended: false },
  { choice: "90", label: "90 days", extended: true },
  { choice: "never", label: "Never", extended: true },
  { choice: "date", label: "Pick a date", extended: false },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateInput(time: number): string {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The chosen expiry as an ISO date (end of the picked day for a date), null for never, undefined to keep. */
function expiryFor(choice: ExpiryChoice, date: string): string | null | undefined {
  if (choice === "keep") return undefined;
  if (choice === "never") return null;
  if (choice === "date") {
    const [y, m, d] = date.split("-").map(Number);
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d, 23, 59, 0).toISOString();
  }
  return new Date(Date.now() + Number(choice) * DAY_MS).toISOString();
}

interface ShareLinkFormProps {
  /** Set when editing; left out to create a link. */
  link?: ShareLinkView;
  plan: ShareLinkPlan;
  saving: boolean;
  onCancel: () => void;
  onCreate?: (values: ShareLinkSettingsInput) => void;
  onUpdate?: (values: UpdateShareLinkInput) => void;
  upgradeHref?: string;
}

export function ShareLinkForm({ link, plan, saving, onCancel, onCreate, onUpdate, upgradeHref }: ShareLinkFormProps) {
  const editing = Boolean(link);
  const [presetId, setPresetId] = useState<ShareLinkPreset["id"] | "custom">(editing ? "custom" : "review");
  const review = SHARE_LINK_PRESETS[0];
  const initial = editing ? null : presetForPlan(review, plan);

  const [label, setLabel] = useState(link?.label ?? review.label);
  const [recipientName, setRecipientName] = useState(link?.recipientName ?? "");
  const [recipientEmail, setRecipientEmail] = useState(link?.recipientEmail ?? "");
  const [expiry, setExpiry] = useState<ExpiryChoice>(editing ? "keep" : String(initial?.expiresInDays ?? 7) as ExpiryChoice);
  // When the form opened: the date picker's range and default count from here.
  const [openedAt] = useState(() => Date.now());
  const [date, setDate] = useState(() => toDateInput(openedAt + 7 * DAY_MS));

  // Passcode: on create, a switch; on edit, keep what's there unless the studio changes or removes it.
  const [passcodeOn, setPasscodeOn] = useState(editing ? Boolean(link?.hasPasscode) : Boolean(initial?.passcode));
  const [passcodeDirty, setPasscodeDirty] = useState(!editing && Boolean(initial?.passcode));
  const [passcode, setPasscode] = useState(() => (!editing && initial?.passcode ? generatePassphrase() : ""));
  const [showPasscode, setShowPasscode] = useState(true);
  const [copied, setCopied] = useState(false);

  const [canComment, setCanComment] = useState(link?.canComment ?? initial?.canComment ?? true);
  const [canApprove, setCanApprove] = useState(link?.canApprove ?? initial?.canApprove ?? true);
  const [canDownload, setCanDownload] = useState(link?.canDownload ?? initial?.canDownload ?? false);
  const [notifyOnOpen, setNotifyOnOpen] = useState(link?.notifyOnOpen ?? initial?.notifyOnOpen ?? false);
  const [notifyOnDownload, setNotifyOnDownload] = useState(link?.notifyOnDownload ?? initial?.notifyOnDownload ?? false);
  const [notifyOnComment, setNotifyOnComment] = useState(link?.notifyOnComment ?? initial?.notifyOnComment ?? true);

  const applyPreset = (preset: ShareLinkPreset) => {
    const settings = presetForPlan(preset, plan);
    setPresetId(preset.id);
    setLabel(preset.label);
    setExpiry(settings.expiresInDays === null ? "never" : (String(settings.expiresInDays) as ExpiryChoice));
    setPasscodeOn(settings.passcode);
    setPasscodeDirty(settings.passcode);
    setPasscode(settings.passcode ? generatePassphrase() : "");
    setCanComment(settings.canComment);
    setCanApprove(settings.canApprove);
    setCanDownload(settings.canDownload);
    setNotifyOnOpen(settings.notifyOnOpen);
    setNotifyOnDownload(settings.notifyOnDownload);
    setNotifyOnComment(settings.notifyOnComment);
  };

  const custom = () => setPresetId("custom");
  const maxDate = toDateInput(openedAt + (plan.extendedExpiry ? 3650 : 30) * DAY_MS);
  const minDate = toDateInput(openedAt);

  const problem = useMemo(() => {
    if (!label.trim()) return "Give the link a name.";
    if (passcodeOn && passcodeDirty) return passcodeProblem(passcode);
    if (expiry === "date" && expiryFor("date", date) === undefined) return "Pick a date.";
    return null;
  }, [label, passcodeOn, passcodeDirty, passcode, expiry, date]);

  const submit = () => {
    if (problem || saving) return;
    const expiresAt = expiryFor(expiry, date);
    const common = {
      label: label.trim(),
      recipientName: recipientName.trim() || null,
      recipientEmail: recipientEmail.trim() || null,
      canComment,
      canApprove,
      canDownload,
      notifyOnOpen,
      notifyOnDownload,
      notifyOnComment,
    };
    if (!editing) {
      onCreate?.({
        ...common,
        expiresAt: expiresAt === undefined ? null : expiresAt,
        passcode: passcodeOn ? passcode.trim() : null,
      });
      return;
    }
    onUpdate?.({
      ...common,
      ...(expiresAt !== undefined ? { expiresAt } : {}),
      // Removing the passcode, or setting a new one; otherwise the current one stays.
      ...(!passcodeOn && link?.hasPasscode ? { passcode: null } : {}),
      ...(passcodeOn && passcodeDirty ? { passcode: passcode.trim() } : {}),
    });
  };

  const copyPasscode = () => {
    if (!passcode) return;
    void navigator.clipboard.writeText(passcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const row = "flex items-center justify-between gap-3 text-xs text-white";
  const sectionTitle = "text-[10px] text-muted-foreground uppercase tracking-widest block";

  return (
    <div className="space-y-5">
      {!editing && (
        <div className="space-y-2">
          <TypographySpan className={sectionTitle}>Start from</TypographySpan>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {SHARE_LINK_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`rounded-xl border px-2.5 py-2 text-left transition-colors cursor-pointer ${
                  presetId === preset.id ? "border-primary bg-primary/10" : "border-white/10 bg-black/40 hover:border-white/25"
                }`}
              >
                <span className="block text-[11px] font-bold text-white">{preset.name}</span>
                <span className="block text-[10px] text-muted-foreground leading-snug">{preset.summary}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={custom}
              className={`rounded-xl border px-2.5 py-2 text-left transition-colors cursor-pointer ${
                presetId === "custom" ? "border-primary bg-primary/10" : "border-white/10 bg-black/40 hover:border-white/25"
              }`}
            >
              <span className="block text-[11px] font-bold text-white">Custom</span>
              <span className="block text-[10px] text-muted-foreground leading-snug">Set everything yourself</span>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className={sectionTitle} htmlFor="share-link-label">
          Name
        </label>
        <input
          id="share-link-label"
          value={label}
          maxLength={80}
          onChange={(e) => {
            setLabel(e.target.value);
            custom();
          }}
          placeholder="e.g. Agency review"
          className="w-full bg-black/60 border border-white/15 focus:border-primary rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            value={recipientName}
            maxLength={120}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="For (name, optional)"
            aria-label="Who the link is for"
            className="w-full bg-black/60 border border-white/15 focus:border-primary rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none"
          />
          <input
            value={recipientEmail}
            type="email"
            maxLength={254}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="Email (optional, used by Send)"
            aria-label="Their email"
            className="w-full bg-black/60 border border-white/15 focus:border-primary rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        <TypographySpan className={sectionTitle}>Expires</TypographySpan>
        <div className="flex flex-wrap gap-1.5">
          {editing && (
            <button
              type="button"
              onClick={() => setExpiry("keep")}
              className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-bold cursor-pointer ${
                expiry === "keep" ? "border-primary bg-primary text-primary-foreground" : "border-white/10 text-muted-foreground hover:text-white"
              }`}
            >
              Keep · {expiryLabel(link?.expiresAt)}
            </button>
          )}
          {EXPIRY_CHOICES.map(({ choice, label: text, extended }) => {
            const locked = extended && !plan.extendedExpiry;
            return (
              <button
                key={choice}
                type="button"
                disabled={locked}
                title={locked ? "Longer links need Pro or Studio" : undefined}
                onClick={() => {
                  setExpiry(choice);
                  custom();
                }}
                className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-bold inline-flex items-center gap-1 ${
                  expiry === choice
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-white/10 text-muted-foreground hover:text-white"
                } ${locked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {text}
                {locked && <Lock className="size-2.5 text-amber-400" />}
              </button>
            );
          })}
        </div>
        {expiry === "date" && (
          <input
            type="date"
            value={date}
            min={minDate}
            max={maxDate}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Expiry date"
            className="bg-black/60 border border-white/15 focus:border-primary rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none [color-scheme:dark]"
          />
        )}
        {!plan.extendedExpiry && upgradeHref && (
          <TypographyMuted className="text-[10px] text-muted-foreground">
            Links last up to 30 days on your plan.{" "}
            <a href={upgradeHref} className="text-primary hover:underline">
              Upgrade
            </a>{" "}
            for longer links.
          </TypographyMuted>
        )}
      </div>

      <div className="space-y-2">
        <div className={row}>
          <div className="flex items-center gap-2">
            <TypographySpan className={sectionTitle}>Passcode</TypographySpan>
            {!plan.passcode && <Lock className="size-3 text-amber-400" />}
          </div>
          <Switch
            checked={passcodeOn}
            disabled={!plan.passcode && !passcodeOn}
            onCheckedChange={(on) => {
              setPasscodeOn(on);
              custom();
              if (on && !passcode) {
                setPasscode(generatePassphrase());
                setPasscodeDirty(true);
              }
            }}
            aria-label="Protect the link with a passcode"
          />
        </div>
        {passcodeOn && editing && link?.hasPasscode && !passcodeDirty ? (
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-neutral-300">
            <span>A passcode is set. Clients who have it keep access.</span>
            <Button
              type="button"
              variant="link"
              size="xs"
              className="text-[11px] text-primary p-0 h-auto"
              onClick={() => {
                setPasscode(generatePassphrase());
                setPasscodeDirty(true);
              }}
            >
              Change
            </Button>
          </div>
        ) : passcodeOn ? (
          <div className="space-y-1.5">
            <div className="relative flex items-center">
              <input
                type={showPasscode ? "text" : "password"}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setPasscodeDirty(true);
                }}
                aria-label="Passcode"
                className="w-full bg-[#18181c] border border-white/15 focus:border-primary rounded-xl pl-3 pr-24 py-2 text-xs text-white focus:outline-none"
              />
              <div className="absolute right-1.5 flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon-xs" onClick={() => setShowPasscode(!showPasscode)} title={showPasscode ? "Hide" : "Show"}>
                  {showPasscode ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    setPasscode(generatePassphrase());
                    setPasscodeDirty(true);
                  }}
                  title="Generate a passcode"
                >
                  <RefreshCw className="size-3.5 text-primary" />
                </Button>
                <Button type="button" variant="ghost" size="icon-xs" onClick={copyPasscode} title="Copy passcode">
                  {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                </Button>
              </div>
            </div>
            <TypographyMuted className="text-[10px] text-muted-foreground">
              Generated passcodes can be shown again from this list. A passcode you type yourself is only shown now.
            </TypographyMuted>
          </div>
        ) : null}
      </div>

      <div className="space-y-2.5">
        <TypographySpan className={sectionTitle}>The client can</TypographySpan>
        <div className={row}>
          <span>Comment</span>
          <Switch checked={canComment} onCheckedChange={(on) => { setCanComment(on); custom(); }} aria-label="Allow comments" />
        </div>
        <div className={row}>
          <span>Approve</span>
          <Switch checked={canApprove} onCheckedChange={(on) => { setCanApprove(on); custom(); }} aria-label="Allow approvals" />
        </div>
        <div className={row}>
          <span>Download files</span>
          <Switch checked={canDownload} onCheckedChange={(on) => { setCanDownload(on); custom(); }} aria-label="Allow downloads" />
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <TypographySpan className={sectionTitle}>Tell me when they</TypographySpan>
          {!plan.alerts && <Lock className="size-3 text-amber-400" />}
        </div>
        <div className={row}>
          <span>Open it the first time</span>
          <Switch
            checked={notifyOnOpen}
            disabled={!plan.alerts && !notifyOnOpen}
            onCheckedChange={(on) => { setNotifyOnOpen(on); custom(); }}
            aria-label="Alert me on first open"
          />
        </div>
        <div className={row}>
          <span>Download files</span>
          <Switch
            checked={notifyOnDownload}
            disabled={!plan.alerts && !notifyOnDownload}
            onCheckedChange={(on) => { setNotifyOnDownload(on); custom(); }}
            aria-label="Alert me on downloads"
          />
        </div>
        <div className={row}>
          <span>Comment</span>
          <Switch checked={notifyOnComment} onCheckedChange={(on) => { setNotifyOnComment(on); custom(); }} aria-label="Alert me on comments" />
        </div>
      </div>

      {problem && <TypographyMuted className="text-[11px] text-amber-300">{problem}</TypographyMuted>}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel} className="text-xs">
          Cancel
        </Button>
        <Button
          type="button"
          onClick={submit}
          disabled={Boolean(problem) || saving}
          className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs px-5"
        >
          {saving ? "Saving..." : editing ? "Save link" : "Create link"}
        </Button>
      </div>
    </div>
  );
}
