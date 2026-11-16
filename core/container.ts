import { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseSystemHeartbeatRepository, type ISystemHeartbeatRepository } from "./repositories/system-heartbeat.repository";
import { SupabaseSiteSettingsRepository } from "./repositories/site-settings.repository";
import { SiteSettingsService } from "./services/site-settings.service";
import { SupabaseShareLinkRepository } from "./repositories/share-link.repository";
import { ShareLinkService } from "./services/share-link.service";
import { Database } from "@/types/database.types";
import { logger, Logger } from "@/lib/logger";
import { type QueryLog, timeQueries } from "./observability/query-log";

// Storage Provider
import {
  IStorageProvider,
  StorageProviderFactory,
  StorageFactoryOptions,
  ISiloStorageProvider,
  SiloProviderFactory,
} from "./providers/storage";

import { SupabaseAuthEmailLookup } from "@/core/repositories/auth-user-email.repository";

// Repositories
import {
  SupabaseWorkspaceRepository,
  SupabaseWorkspaceFeaturesRepository,
  SupabaseUserProfileRepository,
  SupabaseWorkspaceMemberRepository,
  SupabaseWorkspaceInvitationRepository,
  SupabasePlanRepository,
  SupabaseSubscriptionRepository,
  SupabaseClientRepository,
  SupabasePortfolioRepository,
  SupabaseDeliveryRepository,
  SupabaseProjectRepository,
  SupabaseAssetRepository,
  SupabaseAssetVersionRepository,
  SupabaseFeedbackRepository,
  SupabaseNotificationLogRepository,
  SupabaseInvoiceRepository,
  SupabaseWaitlistRepository,
  SupabaseInquiryRepository,
  SupabaseWorkspaceSettingsRepository,
  SupabaseUserSessionRepository,
  SupabaseProcessedBillingEventRepository,
} from "./repositories";
import { ZeptoMailEmailProvider, IEmailProvider } from "./providers/email";
import { createWhatsAppProvider } from "./providers/whatsapp";
import { WhatsAppNotificationService } from "./services/whatsapp-notification.service";
import { CommentEmailService } from "./services/comment-email.service";

// Services
import {
  AuthService,
  WorkspaceService,
  ProfileService,
  MemberService,
  SubscriptionService,
  ClientService,
  PortfolioService,
  DeliveryService,
  ProjectService,
  AssetService,
  AssetUploadService,
  FeedbackService,
  NotificationService,
  StripeService,
  WaitlistService,
  SiloService,
  SessionService,
} from "./services";

export interface CoreServices {
  logger: Logger;
  storageProvider: IStorageProvider;
  siloProvider: ISiloStorageProvider;
  repositories: {
    workspace: SupabaseWorkspaceRepository;
    workspaceFeatures: SupabaseWorkspaceFeaturesRepository;
    userProfile: SupabaseUserProfileRepository;
    workspaceMember: SupabaseWorkspaceMemberRepository;
    workspaceInvitation: SupabaseWorkspaceInvitationRepository;
    plan: SupabasePlanRepository;
    subscription: SupabaseSubscriptionRepository;
    client: SupabaseClientRepository;
    portfolio: SupabasePortfolioRepository;
    delivery: SupabaseDeliveryRepository;
    project: SupabaseProjectRepository;
    asset: SupabaseAssetRepository;
    assetVersion: SupabaseAssetVersionRepository;
    feedback: SupabaseFeedbackRepository;
    notification: SupabaseNotificationLogRepository;
    waitlist: SupabaseWaitlistRepository;
    inquiry: SupabaseInquiryRepository;
    settings: SupabaseWorkspaceSettingsRepository;
    session: SupabaseUserSessionRepository;
  };
  services: {
    auth: AuthService;
    workspace: WorkspaceService;
    profile: ProfileService;
    member: MemberService;
    subscription: SubscriptionService;
    client: ClientService;
    portfolio: PortfolioService;
    delivery: DeliveryService;
    project: ProjectService;
    asset: AssetService;
    upload: AssetUploadService;
    feedback: FeedbackService;
    notification: NotificationService;
    stripe: StripeService;
    waitlist: WaitlistService;
    storage: IStorageProvider;
    silo: SiloService;
    siloProvider: ISiloStorageProvider;
    email: IEmailProvider;
    settings: SupabaseWorkspaceSettingsRepository;
    session: SessionService;
    /** WhatsApp alerts and review links. Service role inside: authorize before calling. */
    whatsapp: WhatsAppNotificationService;
    /** Client comments batched into one studio email per 10 minutes. Service role inside: authorize before calling. */
    commentEmail: CommentEmailService;
    /** When scheduled jobs last ran (system_heartbeats). Service role inside. */
    heartbeat: ISystemHeartbeatRepository;
    /** Site-wide settings from the admin panel, e.g. the demo room (site_settings). Service role inside. */
    siteSettings: SiteSettingsService;
    /**
     * Client links into delivery rooms (share_links). Reads use this client; writes use the
     * service role, so authorize before writing (an admin of the workspace, or the room gate).
     */
    shareLink: ShareLinkService;
  };
}

export interface ContainerOptions {
  storageOptions?: StorageFactoryOptions;
  adminSupabase?: SupabaseClient<Database>;
  /**
   * Times every repository query ("<repository>.<method>") and auth call on this log, one line
   * each, like the admin panel's query log. core/server.ts passes the request's log.
   */
  queryLog?: QueryLog;
}

/**
 * Dependency Injection factory function that initializes all repositories, storage providers,
 * and domain services with the supplied Supabase client.
 */
export function createCoreServices(
  supabase: SupabaseClient<Database>,
  options?: ContainerOptions
): CoreServices {
  // 0. Storage Provider
  const storageProvider = StorageProviderFactory.createProvider(options?.storageOptions);
  const siloProvider = SiloProviderFactory.createProvider();

  // Privileged client to bypass RLS for system/billing tables (subscriptions, plans, features, invoices)
  const systemClient = options?.adminSupabase || supabase;

  // Each repository's queries are timed as "<name>.<method>" when there's a query log.
  const queryLog = options?.queryLog;
  const timed = <T extends object>(name: string, repository: T): T =>
    queryLog ? timeQueries(repository, name, queryLog) : repository;

  // 1. Repositories
  const workspaceRepo = timed("workspace", new SupabaseWorkspaceRepository(supabase));
  const workspaceFeaturesRepo = timed("workspaceFeatures", new SupabaseWorkspaceFeaturesRepository(systemClient));
  const userProfileRepo = timed("userProfile", new SupabaseUserProfileRepository(supabase));
  const workspaceMemberRepo = timed("workspaceMember", new SupabaseWorkspaceMemberRepository(supabase));
  const systemWorkspaceMemberRepo = timed("workspaceMember", new SupabaseWorkspaceMemberRepository(systemClient));
  const workspaceInvitationRepo = timed("workspaceInvitation", new SupabaseWorkspaceInvitationRepository(systemClient));
  const planRepo = timed("plan", new SupabasePlanRepository(systemClient));
  const subscriptionRepo = timed("subscription", new SupabaseSubscriptionRepository(systemClient));
  const clientRepo = timed("client", new SupabaseClientRepository(supabase));
  const portfolioRepo = timed("portfolio", new SupabasePortfolioRepository(supabase));
  const deliveryRepo = timed("delivery", new SupabaseDeliveryRepository(supabase));
  const projectRepo = timed("project", new SupabaseProjectRepository(supabase));
  const assetRepo = timed("asset", new SupabaseAssetRepository(supabase));
  const assetVersionRepo = timed("assetVersion", new SupabaseAssetVersionRepository(supabase));
  const feedbackRepo = timed("feedback", new SupabaseFeedbackRepository(supabase));
  const notificationRepo = timed("notification", new SupabaseNotificationLogRepository(supabase));
  const invoiceRepo = timed("invoice", new SupabaseInvoiceRepository(systemClient));
  const waitlistRepo = timed("waitlist", new SupabaseWaitlistRepository(systemClient));
  const inquiryRepo = timed("inquiry", new SupabaseInquiryRepository(systemClient));
  const workspaceSettingsRepo = timed("workspaceSettings", new SupabaseWorkspaceSettingsRepository(supabase));
  const userSessionRepo = timed("userSession", new SupabaseUserSessionRepository(systemClient));
  const billingEventRepo = timed("billingEvent", new SupabaseProcessedBillingEventRepository(systemClient));

  // Email Provider (Zoho ZeptoMail)
  const emailProvider = new ZeptoMailEmailProvider();

  // Addresses of the people we email (studio alerts, client emails) come from Supabase Auth.
  const authEmailLookup = timed("authEmail", new SupabaseAuthEmailLookup(systemClient));

  // 2. Services (Injected with Repository Interfaces & Storage Provider)
  const authService = new AuthService(supabase, workspaceRepo, userProfileRepo, queryLog);
  const workspaceService = new WorkspaceService(
    workspaceRepo,
    workspaceFeaturesRepo,
    subscriptionRepo,
    planRepo,
    workspaceMemberRepo
  );
  const profileService = new ProfileService(userProfileRepo);
  const subscriptionService = new SubscriptionService(
    subscriptionRepo,
    planRepo,
    workspaceFeaturesRepo,
    deliveryRepo as any,
    invoiceRepo
  );
  // Notification Service (Hub for multi-channel notifications). Built after subscriptions: plan footers and prices need them.
  const notificationService = new NotificationService(
    notificationRepo,
    deliveryRepo,
    workspaceRepo,
    emailProvider,
    { clients: clientRepo, subscriptions: subscriptionService, authEmails: authEmailLookup }
  );
  const memberService = new MemberService(
    workspaceMemberRepo,
    workspaceInvitationRepo,
    workspaceFeaturesRepo,
    workspaceRepo,
    userProfileRepo,
    notificationService,
    systemWorkspaceMemberRepo,
    subscriptionService,
    authEmailLookup
  );
  const clientService = new ClientService(clientRepo);
  const portfolioService = new PortfolioService(
    portfolioRepo,
    projectRepo,
    assetRepo,
    assetVersionRepo
  );
  const deliveryService = new DeliveryService(
    deliveryRepo,
    clientRepo,
    assetRepo,
    assetVersionRepo,
    feedbackRepo,
    projectRepo,
    subscriptionService,
    notificationService
  );
  const projectService = new ProjectService(
    projectRepo,
    assetRepo,
    assetVersionRepo,
    subscriptionService
  );
  const assetService = new AssetService(assetRepo, assetVersionRepo);
  const uploadService = new AssetUploadService(
    storageProvider,
    workspaceRepo,
    deliveryRepo as any,
    assetRepo,
    assetVersionRepo,
    subscriptionRepo,
    planRepo,
    workspaceFeaturesRepo,
    subscriptionService
  );
  const feedbackService = new FeedbackService(feedbackRepo);
  const stripeService = new StripeService(
    subscriptionRepo,
    planRepo,
    workspaceMemberRepo,
    workspaceRepo,
    billingEventRepo
  );
  const waitlistService = new WaitlistService(waitlistRepo, emailProvider);
  const sessionService = new SessionService(userSessionRepo);
  const commentEmailService = new CommentEmailService({
    supabase: systemClient,
    notificationService,
    memberService,
    settingsRepo: workspaceSettingsRepo,
    deliveryRepo,
    workspaceRepo,
  });

  const whatsappService = new WhatsAppNotificationService({
    provider: createWhatsAppProvider(),
    settingsRepo: timed("workspaceSettings", new SupabaseWorkspaceSettingsRepository(systemClient)),
    workspaceRepo: timed("workspace", new SupabaseWorkspaceRepository(systemClient)),
    deliveryRepo: timed("delivery", new SupabaseDeliveryRepository(systemClient)),
    notificationRepo: timed("notification", new SupabaseNotificationLogRepository(systemClient)),
    subscriptionService,
    supabase: systemClient,
  });
  const siloService = new SiloService(
    siloProvider,
    storageProvider,
    deliveryRepo,
    assetRepo,
    assetVersionRepo,
    workspaceRepo,
    subscriptionService,
    notificationService,
    memberService
  );


  return {
    logger,
    storageProvider,
    siloProvider,
    repositories: {
      workspace: workspaceRepo,
      workspaceFeatures: workspaceFeaturesRepo,
      userProfile: userProfileRepo,
      workspaceMember: workspaceMemberRepo,
      workspaceInvitation: workspaceInvitationRepo,
      plan: planRepo,
      subscription: subscriptionRepo,
      client: clientRepo,
      portfolio: portfolioRepo,
      delivery: deliveryRepo,
      project: projectRepo,
      asset: assetRepo,
      assetVersion: assetVersionRepo,
      feedback: feedbackRepo,
      notification: notificationRepo,
      waitlist: waitlistRepo,
      inquiry: inquiryRepo,
      settings: workspaceSettingsRepo,
      session: userSessionRepo,
    },
    services: {
      auth: authService,
      workspace: workspaceService,
      profile: profileService,
      member: memberService,
      subscription: subscriptionService,
      client: clientService,
      portfolio: portfolioService,
      delivery: deliveryService,
      project: projectService,
      asset: assetService,
      upload: uploadService,
      feedback: feedbackService,
      notification: notificationService,
      stripe: stripeService,
      waitlist: waitlistService,
      storage: storageProvider,
      silo: siloService,
      siloProvider,
      email: emailProvider,
      settings: workspaceSettingsRepo,
      session: sessionService,
      whatsapp: whatsappService,
      commentEmail: commentEmailService,
      heartbeat: timed("heartbeat", new SupabaseSystemHeartbeatRepository(systemClient)),
      siteSettings: new SiteSettingsService(timed("siteSettings", new SupabaseSiteSettingsRepository(systemClient))),
      shareLink: new ShareLinkService(
        timed("shareLink", new SupabaseShareLinkRepository(supabase)),
        timed("shareLink", new SupabaseShareLinkRepository(systemClient))
      ),
    },
  };
}
