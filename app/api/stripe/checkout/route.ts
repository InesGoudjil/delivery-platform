import { NextResponse } from 'next/server';
import { getServerServices } from '@/core/server';
import { stripeCheckoutSchema, safeValidate } from '@/lib/validations';

export async function POST(req: Request) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const validated = safeValidate(stripeCheckoutSchema, body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const { workspaceId, workspaceSlug, planId, type } = validated.data;
    const origin = req.headers.get('origin') || 'http://localhost:3000';

    if (type === 'storage_addon') {
      const session = await services.stripe.createStorageAddonCheckoutSession({
        workspaceId,
        workspaceSlug,
        userId: user.id,
        userEmail: user.email,
        origin,
      });
      return NextResponse.json({ url: session.url });
    }

    if (!planId) {
      return NextResponse.json({ error: 'planId is required for subscription checkouts' }, { status: 400 });
    }

    // Delegate session creation completely to core StripeService
    const session = await services.stripe.createCheckoutSession({
      workspaceId,
      workspaceSlug,
      userId: user.id,
      userEmail: user.email,
      planId,
      origin,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('[Stripe Checkout Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
