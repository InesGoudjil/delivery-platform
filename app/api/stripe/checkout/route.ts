import { NextResponse } from 'next/server';
import { getServerServices } from '@/core/server';

export async function POST(req: Request) {
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, planId } = await req.json();

    if (!workspaceId || !planId) {
      return NextResponse.json({ error: 'workspaceId and planId are required' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || 'http://localhost:3000';

    // Delegate session creation completely to core StripeService
    const session = await services.stripe.createCheckoutSession({
      workspaceId,
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
