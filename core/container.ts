import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

// Storage Provider
import {
  IStorageProvider,
  StorageProviderFactory,
  StorageFactoryOptions,
} from './providers/storage';

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
  SupabaseProjectRepository,
  SupabaseAssetRepository,
  SupabaseAssetVersionRepository,
  SupabaseFeedbackRepository,
  SupabaseNotificationLogRepository,
  SupabaseInvoiceRepository,
} from './repositories';

// Services
import {
  AuthService,
  WorkspaceService,
  ProfileService,
  MemberService,
  SubscriptionService,
  ClientService,
  PortfolioService,
  ProjectService,
  AssetService,
  AssetUploadService,
  FeedbackService,
  NotificationService,
  StripeService,
} from './services';

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
    project: SupabaseProjectRepository;
    asset: SupabaseAssetRepository;
    assetVersion: SupabaseAssetVersionRepository;
    feedback: SupabaseFeedbackRepository;
    notification: SupabaseNotificationLogRepository;
  };
  services: {
    auth: AuthService;
    workspace: WorkspaceService;
    profile: ProfileService;
    member: MemberService;
    subscription: SubscriptionService;
    client: ClientService;
    portfolio: PortfolioService;
    project: ProjectService;
    asset: AssetService;
    upload: AssetUploadService;
    feedback: FeedbackService;
    notification: NotificationService;
    stripe: StripeService;
  };
}

export interface ContainerOptions {
  storageOptions?: StorageFactoryOptions;
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

  // 1. Repositories
  const workspaceRepo = new SupabaseWorkspaceRepository(supabase);
  const workspaceFeaturesRepo = new SupabaseWorkspaceFeaturesRepository(supabase);
  const userProfileRepo = new SupabaseUserProfileRepository(supabase);
  const workspaceMemberRepo = new SupabaseWorkspaceMemberRepository(supabase);
  const workspaceInvitationRepo = new SupabaseWorkspaceInvitationRepository(supabase);
  const planRepo = new SupabasePlanRepository(supabase);
  const subscriptionRepo = new SupabaseSubscriptionRepository(supabase);
  const clientRepo = new SupabaseClientRepository(supabase);
  const portfolioRepo = new SupabasePortfolioRepository(supabase);
  const projectRepo = new SupabaseProjectRepository(supabase);
  const assetRepo = new SupabaseAssetRepository(supabase);
  const assetVersionRepo = new SupabaseAssetVersionRepository(supabase);
  const feedbackRepo = new SupabaseFeedbackRepository(supabase);
  const notificationRepo = new SupabaseNotificationLogRepository(supabase);
  const invoiceRepo = new SupabaseInvoiceRepository(supabase);

  // 2. Services (Injected with Repository Interfaces & Storage Provider)
  const authService = new AuthService(supabase, workspaceRepo, userProfileRepo);
  const workspaceService = new WorkspaceService(
    workspaceRepo,
    workspaceFeaturesRepo,
    subscriptionRepo,
    planRepo
  );
  const profileService = new ProfileService(userProfileRepo);
  const memberService = new MemberService(
    workspaceMemberRepo,
    workspaceInvitationRepo,
    workspaceFeaturesRepo
  );
  const subscriptionService = new SubscriptionService(
    subscriptionRepo,
    planRepo,
    workspaceFeaturesRepo,
    projectRepo,
    invoiceRepo
  );
  const clientService = new ClientService(clientRepo);
  const portfolioService = new PortfolioService(
    portfolioRepo,
    projectRepo,
    assetRepo,
    assetVersionRepo
  );
  const projectService = new ProjectService(
    projectRepo,
    clientRepo,
    assetRepo,
    assetVersionRepo,
    feedbackRepo
  );
  const assetService = new AssetService(assetRepo, assetVersionRepo);
  const uploadService = new AssetUploadService(
    storageProvider,
    workspaceRepo,
    projectRepo,
    assetRepo,
    assetVersionRepo,
    subscriptionRepo,
    planRepo
  );
  const feedbackService = new FeedbackService(feedbackRepo);
  const notificationService = new NotificationService(
    notificationRepo,
    projectRepo,
    workspaceRepo
  );
  const stripeService = new StripeService(
    subscriptionRepo,
    planRepo,
    workspaceMemberRepo
  );

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
      project: projectRepo,
      asset: assetRepo,
      assetVersion: assetVersionRepo,
      feedback: feedbackRepo,
      notification: notificationRepo,
    },
    services: {
      auth: authService,
      workspace: workspaceService,
      profile: profileService,
      member: memberService,
      subscription: subscriptionService,
      client: clientService,
      portfolio: portfolioService,
      project: projectService,
      asset: assetService,
      upload: uploadService,
      feedback: feedbackService,
      notification: notificationService,
      stripe: stripeService,
    },
  };
}
