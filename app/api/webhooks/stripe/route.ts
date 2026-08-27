import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/server';
import { createCoreServices } from '@/core/container';

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook secret configuration is missing' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const body = await req.text();
  const { services } = createCoreServices(createAdminClient());

  let event: Stripe.Event;
  try {
    event = services.stripe.constructWebhookEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`[Stripe Webhook Error]: Signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Signature Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.client_reference_id || session.metadata?.workspace_id;
        const stripeSubId = session.subscription as string;
        const customerId = session.customer as string;

        if (workspaceId && stripeSubId) {
          const stripeSub = await services.stripe.retrieveSubscription(stripeSubId);
          const priceId = stripeSub.items.data[0]?.price?.id;

          let planId = session.metadata?.plan_id;
          let targetPlan = planId ? await services.subscription.getPlanById(planId) : null;

          if (!targetPlan && priceId) {
            const allPlans = await services.subscription.listAllPlans();
            targetPlan = allPlans.find((p) => p.stripePriceId === priceId) || null;
          }

          if (targetPlan) {
            await services.subscription.upgradePlan(
              workspaceId,
              targetPlan.slug as any,
              stripeSubId,
              customerId
            );
            console.log(`[Stripe Webhook] Successfully updated subscription for workspace: ${workspaceId}`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const stripeSub = event.data.object as Stripe.Subscription;
        const priceId = stripeSub.items.data[0]?.price?.id;

        if (priceId) {
          const allPlans = await services.subscription.listAllPlans();
          const plan = allPlans.find((p) => p.stripePriceId === priceId);

          if (plan) {
            const allSubs = await services.subscription.listAllSubscriptions();
            const matchingSub = allSubs.find((s) => s.paymentProviderSubId === stripeSub.id);
            if (matchingSub) {
              await services.subscription.adminChangeWorkspacePlan(
                matchingSub.workspaceId,
                plan.id,
                stripeSub.status === 'active' ? 'active' : (stripeSub.status as any)
              );
              console.log(`[Stripe Webhook] Updated subscription status to '${stripeSub.status}' for sub: ${stripeSub.id}`);
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object as Stripe.Subscription;
        const allSubs = await services.subscription.listAllSubscriptions();
        const matchingSub = allSubs.find((s) => s.paymentProviderSubId === stripeSub.id);

        if (matchingSub) {
          await services.subscription.cancelSubscription(matchingSub.workspaceId);
          console.log(`[Stripe Webhook] Canceled subscription for workspace: ${matchingSub.workspaceId}`);
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error(`[Stripe Webhook Handler Error]:`, err);
    return NextResponse.json({ error: err.message || 'Server error processing webhook' }, { status: 500 });
  }
}
