import { NextResponse } from 'next/server';
import { getServerServices } from '@/core/server';
import { stripePortalSchema, safeValidate } from '@/lib/validations';

export async function POST(req: Request) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const validated = safeValidate(stripePortalSchema, body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const { workspaceId, workspaceSlug } = validated.data;
    const origin = req.headers.get('origin') || 'http://localhost:3000';

    // Delegate billing portal session creation to core StripeService
    const portalSession = await services.stripe.createBillingPortalSession({
      workspaceId,
      workspaceSlug,
      userId: user.id,
      origin,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: any) {
    console.error('[Stripe Portal Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
