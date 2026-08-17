export * from './database.types';
export * from '../core/entities/workspace';
export * from '../core/entities/user-profile';
export * from '../core/entities/workspace-member';
export * from '../core/entities/plan';
export * from '../core/entities/subscription';
export * from '../core/entities/project';
export * from '../core/entities/client';
export * from '../core/entities/portfolio';
export * from '../core/entities/asset';
export * from '../core/entities/feedback';
export * from '../core/entities/notification';

// Helper table row convenience aliases
import type { Database } from './database.types';

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

export type WorkspaceRow = Tables<'workspaces'>;
export type WorkspaceFeaturesRow = Tables<'workspace_features'>;
export type UserProfileRow = Tables<'user_profiles'>;
export type WorkspaceMemberRow = Tables<'workspace_members'>;
export type WorkspaceInvitationRow = Tables<'workspace_invitations'>;
export type PlanRow = Tables<'plans'>;
export type SubscriptionRow = Tables<'subscriptions'>;
export type ClientRow = Tables<'clients'>;
export type PortfolioRow = Tables<'portfolios'>;
export type ProjectRow = Tables<'projects'>;
export type PortfolioProjectRow = Tables<'portfolio_projects'>;
export type AssetRow = Tables<'assets'>;
export type AssetVersionRow = Tables<'asset_versions'>;
export type FeedbackRow = Tables<'feedback'>;
export type NotificationLogRow = Tables<'notification_logs'>;

// Compatibility alias for UI components
import type { Feedback } from '../core/entities/feedback';
export type Comment = Feedback;
