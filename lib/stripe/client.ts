import Stripe from 'stripe';
import { env } from '@/lib/env';
import { createScopedLogger } from '@/lib/logger';

const log = createScopedLogger({ module: 'stripe/client' });

/**
 * Returns an initialized Stripe client instance or null if secret key is missing.
 */
export function getStripeClient(): Stripe | null {
  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === 'sk_test_...' || secretKey.trim() === '') {
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
    log.warn('Secret key unconfigured or placeholder. Generating fallback mock Stripe IDs.');
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
    log.error({ err, name }, 'Failed to create product/price in Stripe');
    throw new Error(`Stripe Error: ${err.message}`);
  }
}

/**
 * A new price for a plan whose price changed. Stripe prices can't be edited, so this adds a price
 * to the old price's product and deactivates the old price. Subscribers on the old price keep
 * paying it (Stripe still bills archived prices); new checkouts use the new one.
 */
export async function replaceStripePrice(
  oldStripePriceId: string,
  priceCents: number,
  currency: string = 'USD',
  billingInterval: 'month' | 'year' = 'month'
): Promise<string> {
  const stripe = getStripeClient();
  if (!stripe || oldStripePriceId.startsWith('price_mock_')) {
    log.warn('Secret key unconfigured or mock price. Generating a fallback mock Stripe price ID.');
    return `price_mock_${Date.now()}`;
  }

  try {
    const oldPrice = await stripe.prices.retrieve(oldStripePriceId);
    const productId = typeof oldPrice.product === 'string' ? oldPrice.product : oldPrice.product.id;

    const price = await stripe.prices.create({
      product: productId,
      unit_amount: Math.max(0, priceCents),
      currency: currency.toLowerCase(),
      recurring: { interval: billingInterval },
    });
    await stripe.prices.update(oldStripePriceId, { active: false });
    return price.id;
  } catch (err: any) {
    log.error({ err, oldStripePriceId }, 'Failed to replace price in Stripe');
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
    log.warn({ err, stripePriceId }, 'Failed to archive product/price in Stripe');
  }
}
