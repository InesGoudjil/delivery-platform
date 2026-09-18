import Stripe from 'stripe';
import { getStripeClient, createStripeProductAndPrice, archiveStripeProductAndPrice } from '@/lib/stripe/client';
import { ISubscriptionRepository } from '@/core/repositories/subscription.repository';
import { IPlanRepository } from '@/core/repositories/plan.repository';
import { IWorkspaceMemberRepository } from '@/core/repositories/workspace-member.repository';
import { IWorkspaceRepository } from '@/core/repositories/workspace.repository';
import { SubscriptionService } from './subscription.service';

export interface CreateCheckoutSessionInput {
  workspaceId: string;
  workspaceSlug?: string;
  userId: string;
  userEmail?: string | null;
  planId: string;
  origin: string;
}

export interface CreatePortalSessionInput {
  workspaceId: string;
  workspaceSlug?: string;
  userId: string;
  origin: string;
}

export class StripeService {
  constructor(
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly planRepo: IPlanRepository,
    private readonly memberRepo: IWorkspaceMemberRepository,
    private readonly workspaceRepo?: IWorkspaceRepository
  ) {}

  private getStripe(): Stripe {
    const stripe = getStripeClient();
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }
    return stripe;
  }

  /**
   * Resolves or creates a valid Stripe Customer ID for the workspace.
   * If existing ID is mock (e.g. cus_test_mock_123), deleted, or invalid in Stripe,
   * it creates a new real Stripe customer and updates the database.
   */
  private async getOrCreateValidCustomer(
    stripe: Stripe,
    workspaceId: string,
    userId: string,
    userEmail?: string | null
  ): Promise<string> {
    const subscription = await this.subscriptionRepo.findByWorkspaceId(workspaceId);
    let customerId = subscription?.paymentProviderCustId;

    let isValid = false;
    if (customerId && !customerId.startsWith('cus_test_mock') && !customerId.startsWith('cus_mock')) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        if (!existing.deleted) {
          isValid = true;
        }
      } catch (err: any) {
        console.warn(`[StripeService] Customer ID ${customerId} not found or invalid in Stripe:`, err.message);
      }
    }

    if (!isValid) {
      const customer = await stripe.customers.create({
        email: userEmail || undefined,
        metadata: {
          workspace_id: workspaceId,
          user_id: userId,
        },
      });
      customerId = customer.id;

      if (subscription) {
        await this.subscriptionRepo.update(subscription.id, {
          paymentProviderCustId: customerId,
        });
      }
    }

    return customerId!;
  }

  /**
   * Creates a Stripe Checkout Session for upgrading or subscribing a workspace.
   */
  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<{ url: string | null }> {
    const stripe = this.getStripe();

    // 1. Verify workspace permission (owner or admin member)
    const member = await this.memberRepo.findByWorkspaceAndUserId(input.workspaceId, input.userId);
    let isOwner = member && ['owner', 'admin'].includes(member.role);

    if (!isOwner && this.workspaceRepo) {
      const workspace = await this.workspaceRepo.findById(input.workspaceId);
      if (workspace && workspace.ownerId === input.userId) {
        isOwner = true;
      }
    }

    if (!isOwner) {
      throw new Error('Permission denied for this workspace. Only owners or admins can change subscriptions.');
    }

    // 2. Fetch plan details
    const plan = await this.planRepo.findById(input.planId);
    if (!plan) {
      throw new Error('Plan not found.');
    }
    if (!plan.stripePriceId) {
      throw new Error(`Plan "${plan.name}" does not have a stripePriceId set.`);
    }

    // 3. Resolve or create customer in Stripe (with self-healing for mock/invalid IDs)
    const customerId = await this.getOrCreateValidCustomer(
      stripe,
      input.workspaceId,
      input.userId,
      input.userEmail
    );

    // 4. Resolve slug for clean redirect URLs
    let slug = input.workspaceSlug;
    if (!slug && this.workspaceRepo) {
      const ws = await this.workspaceRepo.findById(input.workspaceId);
      slug = ws?.slug;
    }
    const pathSlug = slug || input.workspaceId;

    // 5. Create Checkout Session
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
        workspace_slug: pathSlug,
        plan_id: plan.id,
        user_id: input.userId,
      },
      subscription_data: {
        metadata: {
          workspace_id: input.workspaceId,
          workspace_slug: pathSlug,
          plan_id: plan.id,
        },
      },
      success_url: `${input.origin}/${pathSlug}/subscription?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${input.origin}/${pathSlug}/subscription?billing=cancel`,
    });

    return { url: session.url };
  }

  /**
   * Synchronizes a completed Stripe Checkout Session back into Supabase.
   * Useful when returning directly from Checkout (e.g. In local development or before webhooks arrive).
   */
  async syncCheckoutSession(
    sessionId: string,
    subscriptionService: SubscriptionService
  ): Promise<{ success: boolean; planName?: string }> {
    const stripe = this.getStripe();

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'line_items'],
      });

      if (session.status !== 'complete' && session.payment_status !== 'paid') {
        return { success: false };
      }

      const workspaceId = session.client_reference_id || session.metadata?.workspace_id;
      const stripeSubId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;
      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id;

      if (!workspaceId || !stripeSubId) {
        return { success: false };
      }

      let planId = session.metadata?.plan_id;
      let targetPlan = planId ? await this.planRepo.findById(planId) : null;

      if (!targetPlan) {
        const lineItemPriceId = session.line_items?.data?.[0]?.price?.id;
        if (lineItemPriceId) {
          const allPlans = await this.planRepo.listAllPlans();
          targetPlan = allPlans.find((p) => p.stripePriceId === lineItemPriceId) || null;
        }
      }

      if (targetPlan) {
        await subscriptionService.upgradePlan(
          workspaceId,
          targetPlan.id,
          stripeSubId,
          customerId || undefined
        );

        await subscriptionService.recordInvoice({
          workspaceId,
          amountCents: targetPlan.priceCents,
          currency: targetPlan.currency,
          description: `${targetPlan.name} Plan (${targetPlan.billingInterval === 'year' ? 'Annual' : 'Monthly'})`,
          stripeCustomerId: customerId || undefined,
          status: 'paid',
        });

        console.log(`[StripeService] Successfully synchronized session ${sessionId} for workspace ${workspaceId}`);
        return { success: true, planName: targetPlan.name };
      }

      return { success: false };
    } catch (err: any) {
      console.warn(`[StripeService] Failed to sync session ${sessionId}:`, err.message);
      return { success: false };
    }
  }

  /**
   * Creates a Stripe Customer Billing Portal Session.
   */
  async createBillingPortalSession(input: CreatePortalSessionInput): Promise<{ url: string }> {
    const stripe = this.getStripe();

    const subscription = await this.subscriptionRepo.findByWorkspaceId(input.workspaceId);
    let customerId = subscription?.paymentProviderCustId;

    if (!customerId || customerId.startsWith('cus_test_mock') || customerId.startsWith('cus_mock')) {
      throw new Error('No active Stripe billing history found for this workspace. Please upgrade to a paid plan first.');
    }

    try {
      const existingCustomer = await stripe.customers.retrieve(customerId);
      if (existingCustomer.deleted) {
        throw new Error('Stripe billing customer was removed. Please subscribe to a plan to start billing history.');
      }
    } catch (err: any) {
      throw new Error('Stripe billing profile could not be verified. Please subscribe to a plan to start your billing history.');
    }

    let slug = input.workspaceSlug;
    if (!slug && this.workspaceRepo) {
      const ws = await this.workspaceRepo.findById(input.workspaceId);
      slug = ws?.slug;
    }
    const pathSlug = slug || input.workspaceId;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${input.origin}/${pathSlug}/subscription`,
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
