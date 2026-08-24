import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const typographyVariants = cva("transition-colors", {
  variants: {
    variant: {
      h1: "font-heading text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.02]",
      h2: "font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight",
      h3: "font-heading text-2xl sm:text-3xl font-bold tracking-tight",
      h4: "font-heading text-xl sm:text-2xl font-bold tracking-tight",
      h5: "font-heading text-lg sm:text-xl font-semibold tracking-tight",
      h6: "font-heading text-base font-semibold tracking-tight",
      lead: "text-base sm:text-lg leading-relaxed",
      p: "text-sm sm:text-base leading-relaxed",
      large: "text-lg font-semibold",
      small: "text-xs sm:text-sm font-medium",
      muted: "text-xs leading-normal",
      kicker: "text-xs font-bold uppercase tracking-wider",
      code: "relative rounded bg-white/10 px-[0.35rem] py-[0.15rem] font-mono text-xs font-semibold",
    },
    color: {
      default: "text-[#f6f3ec]",
      muted: "text-[#9a9a9f]",
      faint: "text-[#5e5e64]",
      orange: "text-[#f5551d]",
      sage: "text-[#86b98f]",
      white: "text-white",
      gradient:
        "text-transparent bg-clip-text bg-gradient-to-r from-[#f5551d] via-[#ff8a45] to-[#f6f3ec]",
    },
  },
  defaultVariants: {
    variant: "p",
    color: "default",
  },
});

type ElementType = React.ElementType;

export interface TypographyProps<T extends ElementType = "p">
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: T;
}

const defaultElementMap: Record<
  NonNullable<VariantProps<typeof typographyVariants>["variant"]>,
  ElementType
> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  lead: "p",
  p: "p",
  large: "div",
  small: "p",
  muted: "p",
  kicker: "span",
  code: "code",
};

export function Typography<T extends ElementType = "p">({
  as,
  variant = "p",
  color,
  className,
  children,
  ...props
}: TypographyProps<T> & React.ComponentPropsWithoutRef<T>) {
  const Component = as || (variant ? defaultElementMap[variant] : "p") || "p";

  // If color isn't explicitly supplied, set a sensible default based on variant
  let resolvedColor = color;
  if (!resolvedColor) {
    if (variant === "kicker") resolvedColor = "orange";
    else if (variant === "lead" || variant === "muted") resolvedColor = "muted";
    else resolvedColor = "default";
  }

  return (
    <Component
      className={cn(
        typographyVariants({ variant, color: resolvedColor }),
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

// Convenience helper components
export const TypographyH1 = (props: TypographyProps<"h1">) => (
  <Typography as="h1" variant="h1" {...props} />
);
export const TypographyH2 = (props: TypographyProps<"h2">) => (
  <Typography as="h2" variant="h2" {...props} />
);
export const TypographyH3 = (props: TypographyProps<"h3">) => (
  <Typography as="h3" variant="h3" {...props} />
);
export const TypographyH4 = (props: TypographyProps<"h4">) => (
  <Typography as="h4" variant="h4" {...props} />
);
export const TypographyH5 = (props: TypographyProps<"h5">) => (
  <Typography as="h5" variant="h5" {...props} />
);
export const TypographyH6 = (props: TypographyProps<"h6">) => (
  <Typography as="h6" variant="h6" {...props} />
);
export const TypographyLead = (props: TypographyProps<"p">) => (
  <Typography as="p" variant="lead" {...props} />
);
export const TypographyP = (props: TypographyProps<"p">) => (
  <Typography as="p" variant="p" {...props} />
);
export const TypographyMuted = (props: TypographyProps<"p">) => (
  <Typography as="p" variant="muted" {...props} />
);
export const TypographySmall = (props: TypographyProps<"p">) => (
  <Typography as="p" variant="small" {...props} />
);
export const TypographyKicker = (props: TypographyProps<"span">) => (
  <Typography as="span" variant="kicker" {...props} />
);
