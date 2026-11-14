import { cn } from "@/lib/utils";
import { SUBSCRIPTION_STATUS_LABELS } from "../_lib/format";

const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap";

const STATUS_TONES: Record<string, string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  trialing: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  past_due: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  canceled: "border-border bg-muted text-muted-foreground",
  none: "border-border bg-transparent text-muted-foreground",
};

export function SubscriptionStatusBadge({ status }: { status: string | null }) {
  const key = status ?? "none";
  return <span className={cn(base, STATUS_TONES[key] ?? STATUS_TONES.none)}>{SUBSCRIPTION_STATUS_LABELS[key] ?? key}</span>;
}

export function Pill({
  children,
  tone = "neutral",
  title,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "primary" | "warning" | "danger" | "success";
  title?: string;
}) {
  const tones = {
    neutral: "border-border bg-muted text-muted-foreground",
    primary: "border-primary/30 bg-primary/10 text-primary",
    warning: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    danger: "border-destructive/40 bg-destructive/10 text-destructive",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  };
  return (
    <span className={cn(base, tones[tone])} title={title}>
      {children}
    </span>
  );
}

export function StorageBar({ percent }: { percent: number | null }) {
  if (percent === null) return null;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
      <div
        className={cn("h-full rounded-full", percent >= 90 ? "bg-destructive" : percent >= 75 ? "bg-amber-500" : "bg-primary")}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
