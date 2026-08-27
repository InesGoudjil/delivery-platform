import { NextResponse } from 'next/server';
import { getServerServices } from '@/core/server';

export async function POST(req: Request) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = await req.json();

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || 'http://localhost:3000';

    // Delegate billing portal session creation to core StripeService
    const portalSession = await services.stripe.createBillingPortalSession({
      workspaceId,
      userId: user.id,
      origin,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: any) {
    console.error('[Stripe Portal Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
