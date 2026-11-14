import Link from "next/link";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function KpiCard({
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  tone?: "default" | "warning";
}) {
  const body = (
    <>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className={cn("mt-1 text-2xl font-bold", tone === "warning" && "text-amber-500")}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </>
  );
  const className = "block rounded-xl border border-border bg-card p-4";
  return href ? (
    <Link href={href} className={cn(className, "transition-colors hover:border-primary/50")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function KpiGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-7 w-20" />
          <Skeleton className="mt-2 h-3 w-32" />
        </div>
      ))}
    </div>
  );
}
