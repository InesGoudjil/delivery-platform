import Stripe from 'stripe';
import { getStripeClient, createStripeProductAndPrice, archiveStripeProductAndPrice } from '@/lib/stripe/client';
import { ISubscriptionRepository } from '@/core/repositories/subscription.repository';
import { IPlanRepository } from '@/core/repositories/plan.repository';
import { IWorkspaceMemberRepository } from '@/core/repositories/workspace-member.repository';
import { IWorkspaceRepository } from '@/core/repositories/workspace.repository';
import { IProcessedBillingEventRepository } from '@/core/repositories/billing-event.repository';
import { SubscriptionService } from './subscription.service';
import { createScopedLogger } from '@/lib/logger';

const log = createScopedLogger({ service: 'StripeService' });

export interface CreateCheckoutSessionInput {
  workspaceId: string;
  workspaceSlug?: string;
  userId: string;
  userEmail?: string | null;
  planId: string;
  origin: string;
}

export interface CreateStorageCheckoutSessionInput {
  workspaceId: string;
  workspaceSlug?: string;
  userId: string;
  userEmail?: string | null;
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
    private readonly workspaceRepo?: IWorkspaceRepository,
    private readonly billingEventRepo?: IProcessedBillingEventRepository
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
        log.warn({ err, customerId }, 'Customer ID not found or invalid in Stripe');
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
  /**
   * Throws unless the user is the workspace owner or an admin member.
   * Every billing entry point (checkout, add-ons, portal) must call this first.
   */
  private async assertCanManageBilling(
    workspaceId: string,
    userId: string,
    deniedMessage = 'Permission denied for this workspace. Only owners or admins can manage billing.'
  ): Promise<void> {
    if (!workspaceId || !userId) {
      throw new Error(deniedMessage);
    }

    const member = await this.memberRepo.findByWorkspaceAndUserId(workspaceId, userId);
    if (member && ['owner', 'admin'].includes(member.role)) {
      return;
    }

    if (this.workspaceRepo) {
      const workspace = await this.workspaceRepo.findById(workspaceId);
      if (workspace && workspace.ownerId === userId) {
        return;
      }
    }

    throw new Error(deniedMessage);
  }

  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<{ url: string | null }> {
    const stripe = this.getStripe();

    // 1. Verify workspace permission (owner or admin member)
    await this.assertCanManageBilling(
      input.workspaceId,
      input.userId,
      'Permission denied for this workspace. Only owners or admins can change subscriptions.'
    );

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
        email: input.userEmail || '',
      },
      subscription_data: {
        metadata: {
          workspace_id: input.workspaceId,
          workspace_slug: pathSlug,
          plan_id: plan.id,
          email: input.userEmail || '',
        },
      },
      success_url: `${input.origin}/${pathSlug}/subscription?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${input.origin}/${pathSlug}/subscription?billing=cancel`,
    });

    return { url: session.url };
  }

  /**
   * Creates a Stripe Checkout Session specifically for upgrading Cloudflare R2 storage (+1 TB at $15/mo).
   */
  async createStorageAddonCheckoutSession(
    input: CreateStorageCheckoutSessionInput
  ): Promise<{ url: string | null }> {
    // 1. Verify workspace permission (owner or admin member)
    await this.assertCanManageBilling(
      input.workspaceId,
      input.userId,
      'Permission denied for this workspace. Only owners or admins can upgrade storage.'
    );

    let slug = input.workspaceSlug;
    if (!slug && this.workspaceRepo) {
      const ws = await this.workspaceRepo.findById(input.workspaceId);
      slug = ws?.slug;
    }
    const pathSlug = slug || input.workspaceId;

    const stripe = getStripeClient();
    if (!stripe) {
      throw new Error("Stripe is not configured in this environment.");
    }

    const customerId = await this.getOrCreateValidCustomer(
      stripe,
      input.workspaceId,
      input.userId,
      input.userEmail
    );

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: '+1 TB High-Speed Storage Add-on',
              description: '1 TB additional high-speed Cloudflare R2 edge capacity for your CineSpace workspace',
            },
            unit_amount: 1500, // $15.00
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      client_reference_id: input.workspaceId,
      metadata: {
        workspace_id: input.workspaceId,
        workspace_slug: pathSlug,
        type: 'storage_addon',
        storage_gb_delta: '1024',
        user_id: input.userId,
        email: input.userEmail || '',
      },
      subscription_data: {
        metadata: {
          workspace_id: input.workspaceId,
          workspace_slug: pathSlug,
          type: 'storage_addon',
          storage_gb_delta: '1024',
          email: input.userEmail || '',
        },
      },
      success_url: `${input.origin}/${pathSlug}/storage?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${input.origin}/${pathSlug}/storage?billing=cancel`,
    });

    return { url: session.url };
  }

  /**
   * Synchronizes a completed Stripe Checkout Session back into Supabase when the
   * user lands on the success URL (before or instead of the webhook).
   *
   * The success URL can be reloaded or replayed at any time, so each session is
   * applied at most once (recorded in `processed_billing_events`) and only while
   * its Stripe subscription is still active or trialing.
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

      // Never grant anything for a subscription that has since been cancelled or lapsed.
      const subscriptionStatus =
        typeof session.subscription === 'object' && session.subscription
          ? session.subscription.status
          : (await stripe.subscriptions.retrieve(stripeSubId)).status;
      if (!['active', 'trialing'].includes(subscriptionStatus)) {
        log.warn({ sessionId, workspaceId, subscriptionStatus }, 'Skipping checkout sync for inactive subscription');
        return { success: false };
      }

      if (!this.billingEventRepo) {
        log.error({ sessionId }, 'Billing event ledger unavailable; refusing to apply checkout session');
        return { success: false };
      }

      // Check if session is for +1 TB Storage Add-on
      if (session.metadata?.type === 'storage_addon') {
        const isFirstApplication = await this.billingEventRepo.claim(
          session.id,
          workspaceId,
          'checkout.storage_addon'
        );
        if (!isFirstApplication) {
          return { success: true, planName: '+1 TB Storage' };
        }

        try {
          const parsedDelta = parseInt(session.metadata?.storage_gb_delta || '1024', 10);
          const deltaGB = Number.isFinite(parsedDelta) && parsedDelta > 0 ? parsedDelta : 1024;
          const currentFeatures = await subscriptionService.getFeatures(workspaceId);
          const currentStorageGB = currentFeatures.storage_gb || 2;
          const overrides = await subscriptionService.getFeatureOverrides(workspaceId);

          // Override storage only. Copying the merged plan features into the overrides
          // would keep them after the plan is cancelled or changed.
          await subscriptionService.updateWorkspaceFeatures(workspaceId, {
            ...overrides,
            storage_gb: currentStorageGB + deltaGB,
          });
        } catch (applyErr) {
          await this.billingEventRepo.release(session.id).catch(() => undefined);
          throw applyErr;
        }

        await subscriptionService.recordInvoice({
          workspaceId,
          amountCents: 1500,
          currency: 'USD',
          description: '+1 TB Storage Add-on ($15/mo)',
          stripeCustomerId: customerId || undefined,
          status: 'paid',
        });

        log.info({ sessionId, workspaceId }, 'Successfully added storage to workspace');
        return { success: true, planName: '+1 TB Storage' };
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

      if (!targetPlan) {
        return { success: false };
      }

      const isFirstApplication = await this.billingEventRepo.claim(
        session.id,
        workspaceId,
        'checkout.subscription'
      );
      if (!isFirstApplication) {
        return { success: true, planName: targetPlan.name };
      }

      try {
        await subscriptionService.upgradePlan(
          workspaceId,
          targetPlan.id,
          stripeSubId,
          customerId || undefined
        );
      } catch (applyErr) {
        await this.billingEventRepo.release(session.id).catch(() => undefined);
        throw applyErr;
      }

      await subscriptionService.recordInvoice({
        workspaceId,
        amountCents: targetPlan.priceCents,
        currency: targetPlan.currency,
        description: `${targetPlan.name} Plan (${targetPlan.billingInterval === 'year' ? 'Annual' : 'Monthly'})`,
        stripeCustomerId: customerId || undefined,
        status: 'paid',
      });

      log.info({ sessionId, workspaceId, planName: targetPlan.name }, 'Successfully synchronized session for workspace');
      return { success: true, planName: targetPlan.name };
    } catch (err: any) {
      log.warn({ err, sessionId }, 'Failed to sync checkout session');
      return { success: false };
    }
  }

  /**
   * Creates a Stripe Customer Billing Portal Session.
   */
  async createBillingPortalSession(input: CreatePortalSessionInput): Promise<{ url: string }> {
    const stripe = this.getStripe();

    // The portal can cancel plans and change cards, so only owners/admins of this
    // workspace may open it. The subscription lookup below bypasses RLS.
    await this.assertCanManageBilling(input.workspaceId, input.userId);

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
