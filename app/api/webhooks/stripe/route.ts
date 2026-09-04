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

          let planId = session.metadata?.plan_id || stripeSub.metadata?.plan_id;
          let targetPlan = planId ? await services.subscription.getPlanById(planId) : null;

          if (!targetPlan && priceId) {
            const allPlans = await services.subscription.listAllPlans();
            targetPlan = allPlans.find((p) => p.stripePriceId === priceId) || null;
          }

          if (targetPlan) {
            await services.subscription.upgradePlan(
              workspaceId,
              targetPlan.id,
              stripeSubId,
              customerId
            );
            await services.subscription.recordInvoice({
              workspaceId,
              amountCents: targetPlan.priceCents,
              currency: targetPlan.currency,
              description: `${targetPlan.name} Plan (${targetPlan.billingInterval === 'year' ? 'Annual' : 'Monthly'})`,
              stripeCustomerId: customerId,
              status: 'paid',
            });
            console.log(`[Stripe Webhook] Successfully updated subscription for workspace: ${workspaceId}`);
          }
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const stripeSub = event.data.object as Stripe.Subscription;
        const priceId = stripeSub.items.data[0]?.price?.id;
        const workspaceId = stripeSub.metadata?.workspace_id;
        const customerId = stripeSub.customer as string;

        let planId = stripeSub.metadata?.plan_id;
        let plan = planId ? await services.subscription.getPlanById(planId) : null;

        if (!plan && priceId) {
          const allPlans = await services.subscription.listAllPlans();
          plan = allPlans.find((p) => p.stripePriceId === priceId) || null;
        }

        if (plan) {
          let targetWorkspaceId = workspaceId;

          if (!targetWorkspaceId) {
            const allSubs = await services.subscription.listAllSubscriptions();
            const matchingSub = allSubs.find(
              (s) => s.paymentProviderSubId === stripeSub.id || s.paymentProviderCustId === customerId
            );
            targetWorkspaceId = matchingSub?.workspaceId;
          }

          if (targetWorkspaceId) {
            await services.subscription.upgradePlan(
              targetWorkspaceId,
              plan.id,
              stripeSub.id,
              customerId
            );
            console.log(`[Stripe Webhook] Updated subscription status to '${stripeSub.status}' for workspace: ${targetWorkspaceId}`);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object as Stripe.Subscription;
        const workspaceId = stripeSub.metadata?.workspace_id;

        let targetWorkspaceId = workspaceId;
        if (!targetWorkspaceId) {
          const allSubs = await services.subscription.listAllSubscriptions();
          const matchingSub = allSubs.find((s) => s.paymentProviderSubId === stripeSub.id);
          targetWorkspaceId = matchingSub?.workspaceId;
        }

        if (targetWorkspaceId) {
          await services.subscription.cancelSubscription(targetWorkspaceId);
          console.log(`[Stripe Webhook] Canceled subscription for workspace: ${targetWorkspaceId}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoiceObj = event.data.object as Stripe.Invoice;
        const customerId = invoiceObj.customer as string;
        const amountCents = invoiceObj.amount_paid;
        const currency = invoiceObj.currency;
        const pdfUrl = invoiceObj.invoice_pdf;
        const hostedUrl = invoiceObj.hosted_invoice_url;
        const stripeInvoiceId = invoiceObj.id;

        const allSubs = await services.subscription.listAllSubscriptions();
        const matchingSub = allSubs.find((s) => s.paymentProviderCustId === customerId);

        if (matchingSub) {
          const currentPlan = await services.subscription.getPlanById(matchingSub.planId);
          await services.subscription.recordInvoice({
            workspaceId: matchingSub.workspaceId,
            stripeInvoiceId,
            stripeCustomerId: customerId,
            amountCents,
            currency: (currency || 'USD').toUpperCase(),
            description: currentPlan ? `${currentPlan.name} Plan Renewal` : 'Subscription Payment',
            hostedInvoiceUrl: hostedUrl,
            pdfUrl,
            status: 'paid',
          });
          console.log(`[Stripe Webhook] Logged invoice ${stripeInvoiceId} for workspace ${matchingSub.workspaceId}`);
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
