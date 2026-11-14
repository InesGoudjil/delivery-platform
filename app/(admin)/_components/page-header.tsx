import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function AdminPageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1">
        {backHref && (
          <Link
            href={backHref}
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> {backLabel ?? "Back"}
          </Link>
        )}
        <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** A titled block of a detail page. */
export function AdminSection({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Shown in place of a section whose data couldn't be loaded, instead of made-up numbers. */
export function AdminLoadError({ what, error }: { what: string; error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <p className="font-medium text-destructive">Couldn&apos;t load {what}.</p>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
