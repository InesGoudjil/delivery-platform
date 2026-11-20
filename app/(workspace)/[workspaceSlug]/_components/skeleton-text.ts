/**
 * Line heights of the workspace pages' headings, for their loading skeletons (SkeletonLine).
 *
 * Text with its own size class keeps that size at every width (see variantClassesFor in
 * components/ui/typography.tsx), with Tailwind's line height for that size: the variant's
 * line-height goes with the variant's size (tailwind-merge treats them as one). Measured in the
 * browser on 20 Nov 2026.
 */
export const SKELETON_TEXT = {
  /** TypographyH1 with "text-3xl": 36px. */
  pageTitle: "h-9",
  /** TypographyH1 with "text-3xl sm:text-4xl": 36 / 40px. */
  pageTitleSm4xl: "h-9 sm:h-10",
  /** TypographyH1 with "text-2xl sm:text-3xl": 32 / 36px. */
  pageTitleSm3xl: "h-8 sm:h-9",
  /** TypographyH2 with "text-xl": 28px. */
  sectionTitle: "h-7",
  /** TypographyH2 with "text-sm" (a label, e.g. "ACTIVE MEMBERS"): 20px. */
  sectionLabel: "h-5",
  /** TypographyH3 with "text-base": 24px. */
  cardTitle: "h-6",
  /** TypographyH3 with "text-xl": 28px. */
  cardTitleXl: "h-7",
  /** TypographyH4 with "text-sm": 20px. */
  smallTitle: "h-5",
  /** TypographyLead with "text-sm": one line, 20px. */
  leadLine: "h-5",
} as const;
