import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface DeliveryNavHeaderProps {
  workspaceSlug: string;
  shareToken: string;
}

export function DeliveryNavHeader({ workspaceSlug, shareToken }: DeliveryNavHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <Link
        href={`/${workspaceSlug}/deliveries`}
        className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
        <span>Projects</span>
      </Link>

      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
        <span>Share Token:</span>
        <span className="bg-muted px-2 py-0.5 rounded text-foreground font-semibold">
          {shareToken}
        </span>
      </div>
    </div>
  );
}
