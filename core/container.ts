import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

// Storage Provider
import {
  IStorageProvider,
  StorageProviderFactory,
  StorageFactoryOptions,
} from "./providers/storage";

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
} from "./repositories";
import { ResendEmailProvider } from "./providers/email";

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
} from "./services";

export interface CoreServices {
  storageProvider: IStorageProvider;
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
  };
}

export interface ContainerOptions {
  storageOptions?: StorageFactoryOptions;
  adminSupabase?: SupabaseClient<Database>;
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

  // Privileged client to bypass RLS for system/billing tables (subscriptions, plans, features, invoices)
  const systemClient = options?.adminSupabase || supabase;

  // 1. Repositories
  const workspaceRepo = new SupabaseWorkspaceRepository(supabase);
  const workspaceFeaturesRepo = new SupabaseWorkspaceFeaturesRepository(systemClient);
  const userProfileRepo = new SupabaseUserProfileRepository(supabase);
  const workspaceMemberRepo = new SupabaseWorkspaceMemberRepository(supabase);
  const workspaceInvitationRepo = new SupabaseWorkspaceInvitationRepository(supabase);
  const planRepo = new SupabasePlanRepository(systemClient);
  const subscriptionRepo = new SupabaseSubscriptionRepository(systemClient);
  const clientRepo = new SupabaseClientRepository(supabase);
  const portfolioRepo = new SupabasePortfolioRepository(supabase);
  const deliveryRepo = new SupabaseDeliveryRepository(supabase);
  const projectRepo = new SupabaseProjectRepository(supabase);
  const assetRepo = new SupabaseAssetRepository(supabase);
  const assetVersionRepo = new SupabaseAssetVersionRepository(supabase);
  const feedbackRepo = new SupabaseFeedbackRepository(supabase);
  const notificationRepo = new SupabaseNotificationLogRepository(supabase);
  const invoiceRepo = new SupabaseInvoiceRepository(systemClient);
  const waitlistRepo = new SupabaseWaitlistRepository(systemClient);

  // Email Provider
  const emailProvider = new ResendEmailProvider();

  // 2. Services (Injected with Repository Interfaces & Storage Provider)
  const authService = new AuthService(supabase, workspaceRepo, userProfileRepo);
  const workspaceService = new WorkspaceService(
    workspaceRepo,
    workspaceFeaturesRepo,
    subscriptionRepo,
    planRepo,
    workspaceMemberRepo
  );
  const profileService = new ProfileService(userProfileRepo);
  const memberService = new MemberService(
    workspaceMemberRepo,
    workspaceInvitationRepo,
    workspaceFeaturesRepo,
    workspaceRepo,
    userProfileRepo
  );
  const subscriptionService = new SubscriptionService(
    subscriptionRepo,
    planRepo,
    workspaceFeaturesRepo,
    deliveryRepo as any,
    invoiceRepo
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
    projectRepo
  );
  const projectService = new ProjectService(
    projectRepo,
    assetRepo,
    assetVersionRepo
  );
  const assetService = new AssetService(assetRepo, assetVersionRepo);
  const uploadService = new AssetUploadService(
    storageProvider,
    workspaceRepo,
    deliveryRepo as any,
    assetRepo,
    assetVersionRepo,
    subscriptionRepo,
    planRepo
  );
  const feedbackService = new FeedbackService(feedbackRepo);
  const notificationService = new NotificationService(
    notificationRepo,
    deliveryRepo,
    workspaceRepo
  );
  const stripeService = new StripeService(
    subscriptionRepo,
    planRepo,
    workspaceMemberRepo,
    workspaceRepo
  );
  const waitlistService = new WaitlistService(waitlistRepo, emailProvider);

  return {
    storageProvider,
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
    },
  };
}
