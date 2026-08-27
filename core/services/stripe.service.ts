import Stripe from 'stripe';
import { getStripeClient, createStripeProductAndPrice, archiveStripeProductAndPrice } from '@/lib/stripe/client';
import { ISubscriptionRepository } from '@/core/repositories/subscription.repository';
import { IPlanRepository } from '@/core/repositories/plan.repository';
import { IWorkspaceMemberRepository } from '@/core/repositories/workspace-member.repository';

export interface CreateCheckoutSessionInput {
  workspaceId: string;
  userId: string;
  userEmail?: string | null;
  planId: string;
  origin: string;
}

export interface CreatePortalSessionInput {
  workspaceId: string;
  userId: string;
  origin: string;
}

export class StripeService {
  constructor(
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly planRepo: IPlanRepository,
    private readonly memberRepo: IWorkspaceMemberRepository
  ) {}

  private getStripe(): Stripe {
    const stripe = getStripeClient();
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }
    return stripe;
  }

  /**
   * Creates a Stripe Checkout Session for upgrading or subscribing a workspace.
   */
  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<{ url: string | null }> {
    const stripe = this.getStripe();

    // 1. Verify workspace membership (owner or admin)
    const member = await this.memberRepo.findByWorkspaceAndUserId(input.workspaceId, input.userId);
    if (!member || !['owner', 'admin'].includes(member.role)) {
      throw new Error('Permission denied for this workspace.');
    }

    // 2. Fetch plan details
    const plan = await this.planRepo.findById(input.planId);
    if (!plan) {
      throw new Error('Plan not found.');
    }
    if (!plan.stripePriceId) {
      throw new Error(`Plan "${plan.name}" does not have a stripePriceId set.`);
    }

    // 3. Resolve or create customer in Stripe
    const subscription = await this.subscriptionRepo.findByWorkspaceId(input.workspaceId);
    let customerId = subscription?.paymentProviderCustId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: input.userEmail || undefined,
        metadata: {
          workspace_id: input.workspaceId,
          user_id: input.userId,
        },
      });
      customerId = customer.id;
    }

    // 4. Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      client_reference_id: input.workspaceId,
      metadata: {
        workspace_id: input.workspaceId,
        plan_id: plan.id,
        user_id: input.userId,
      },
      subscription_data: {
        metadata: {
          workspace_id: input.workspaceId,
          plan_id: plan.id,
        },
      },
      success_url: `${input.origin}/${input.workspaceId}/billing?billing=success`,
      cancel_url: `${input.origin}/${input.workspaceId}/billing?billing=cancel`,
    });

    return { url: session.url };
  }

  /**
   * Creates a Stripe Customer Billing Portal Session.
   */
  async createBillingPortalSession(input: CreatePortalSessionInput): Promise<{ url: string }> {
    const stripe = this.getStripe();

    const subscription = await this.subscriptionRepo.findByWorkspaceId(input.workspaceId);
    if (!subscription?.paymentProviderCustId) {
      throw new Error('No active Stripe billing history found for this workspace.');
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.paymentProviderCustId,
      return_url: `${input.origin}/${input.workspaceId}/billing`,
    });

    return { url: portalSession.url };
  }

  /**
   * Creates a counterpart Stripe Product and Price in the Stripe Dashboard.
   */
  async createStripeProductAndPrice(params: {
    name: string;
    priceCents: number;
    currency?: string;
    billingInterval?: 'month' | 'year';
  }): Promise<{ stripePriceId: string | null; stripeProductId: string | null }> {
    return createStripeProductAndPrice(
      params.name,
      params.priceCents,
      params.currency || 'USD',
      params.billingInterval || 'month'
    );
  }

  /**
   * Archives a Stripe Price and Product.
   */
  async archiveStripeProductAndPrice(stripePriceId?: string | null): Promise<void> {
    return archiveStripeProductAndPrice(stripePriceId);
  }

  /**
   * Verifies and constructs a Stripe webhook event from raw payload and headers.
   */
  constructWebhookEvent(body: string, signature: string, webhookSecret: string): Stripe.Event {
    const stripe = this.getStripe();
    return stripe.webhooks.constructEvent(body, signature, webhookSecret);
  }

  /**
   * Retrieves a Stripe subscription object by ID.
   */
  async retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const stripe = this.getStripe();
    return stripe.subscriptions.retrieve(subscriptionId);
  }
}
