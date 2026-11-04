import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TypographySpan } from "@/components/ui/typography";

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
        <TypographySpan variant="small" className="font-bold">Projects</TypographySpan>
      </Link>
    </div>
  );
}
