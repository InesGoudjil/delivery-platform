import { cn } from "@/lib/utils"

/**
 * A loading placeholder. Tinted with the text colour rather than a solid fill, so it shows on
 * every surface: the page, cards, and the dark glass panels (where `bg-muted`, nearly the cards'
 * own colour, all but disappeared).
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-foreground/[0.08]", className)}
      {...props}
    />
  )
}

/**
 * A line of text while it loads. The box is the line's full height (pass it in className, with the
 * width), so nothing moves when the text arrives; the bar inside is shorter, as glyphs are.
 */
function SkeletonLine({ className, barClassName }: { className?: string; barClassName?: string }) {
  return (
    <div data-slot="skeleton-line" className={cn("flex items-center", className)}>
      <Skeleton className={cn("h-[72%] w-full rounded-lg", barClassName)} />
    </div>
  )
}

export { Skeleton, SkeletonLine }
