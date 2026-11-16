/**
 * Share links per delivery room, -1 for unlimited: the plan's `share_links_per_delivery`, else by
 * tier (Starter 1, Basic 3, Pro and up unlimited). No plan counts as Starter. The plan's
 * `client_links` feature counts active delivery rooms, not links.
 */
export function shareLinksPerDelivery(
  features: { share_links_per_delivery?: number | null } | null | undefined,
  tier: string | undefined
): number {
  const configured = features?.share_links_per_delivery;
  if (configured !== undefined && configured !== null) return Number(configured);
  if (!tier || tier === "starter") return 1;
  if (tier === "basic") return 3;
  return -1;
}
