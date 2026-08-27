import Stripe from 'stripe';

/**
 * Returns an initialized Stripe client instance or null if secret key is missing.
 */
export function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey.startsWith('sk_test_...')) {
    return null;
  }

  return new Stripe(secretKey, {
    apiVersion: '2025-01-27.acacia' as any,
  });
}

export interface CreateStripeProductResult {
  stripeProductId: string | null;
  stripePriceId: string | null;
}

/**
 * Creates a corresponding Stripe Product and Price in the Stripe Dashboard.
 */
export async function createStripeProductAndPrice(
  name: string,
  priceCents: number,
  currency: string = 'USD',
  billingInterval: 'month' | 'year' = 'month'
): Promise<CreateStripeProductResult> {
  const stripe = getStripeClient();

  if (!stripe) {
    console.warn('[Stripe] Secret key unconfigured or placeholder. Generating fallback mock Stripe IDs.');
    const mockId = `price_mock_${Date.now()}`;
    return { stripeProductId: `prod_mock_${Date.now()}`, stripePriceId: mockId };
  }

  try {
    // 1. Create Stripe Product
    const product = await stripe.products.create({
      name,
      description: `CineSpace ${name} Subscription Tier`,
    });

    // 2. Create Stripe Price under the Product
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.max(0, priceCents),
      currency: currency.toLowerCase(),
      recurring: {
        interval: billingInterval,
      },
    });

    return {
      stripeProductId: product.id,
      stripePriceId: price.id,
    };
  } catch (err: any) {
    console.error('[Stripe] Failed to create product/price:', err);
    throw new Error(`Stripe Error: ${err.message}`);
  }
}

/**
 * Archives (deactivates) a Stripe Price and its parent Product.
 */
export async function archiveStripeProductAndPrice(stripePriceId?: string | null): Promise<void> {
  if (!stripePriceId || stripePriceId.startsWith('price_mock_')) return;

  const stripe = getStripeClient();
  if (!stripe) return;

  try {
    const price = await stripe.prices.retrieve(stripePriceId);

    // Deactivate Price
    await stripe.prices.update(stripePriceId, { active: false });

    // Deactivate Product if string ID
    if (typeof price.product === 'string') {
      await stripe.products.update(price.product, { active: false });
    }
  } catch (err: any) {
    console.warn('[Stripe] Failed to archive product/price:', err.message);
  }
}
