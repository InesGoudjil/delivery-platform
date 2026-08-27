export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          owner_id: string;
          brand_name: string;
          slug: string;
          logo_url: string | null;
          custom_domain: string | null;
          accent_color: string | null;
          default_language: 'ar' | 'en';
          account_type: 'individual' | 'studio';
          storage_used_bytes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          brand_name: string;
          slug: string;
          logo_url?: string | null;
          custom_domain?: string | null;
          accent_color?: string | null;
          default_language?: 'ar' | 'en';
          account_type?: 'individual' | 'studio';
          storage_used_bytes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          brand_name?: string;
          slug?: string;
          logo_url?: string | null;
          custom_domain?: string | null;
          accent_color?: string | null;
          default_language?: 'ar' | 'en';
          account_type?: 'individual' | 'studio';
          storage_used_bytes?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspace_features: {
        Row: {
          workspace_id: string;
          features: Json;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          features?: Json;
          updated_at?: string;
        };
        Update: {
          workspace_id?: string;
          features?: Json;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          platform_role: 'user' | 'admin';
          last_login_at: string | null;
          last_login_ip: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          platform_role?: 'user' | 'admin';
          last_login_at?: string | null;
          last_login_ip?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          platform_role?: 'user' | 'admin';
          last_login_at?: string | null;
          last_login_ip?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'editor' | 'viewer';
          joined_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: 'owner' | 'admin' | 'editor' | 'viewer';
          joined_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'editor' | 'viewer';
          joined_at?: string;
        };
      };
      workspace_invitations: {
        Row: {
          id: string;
          workspace_id: string;
          inviter_id: string;
          email: string;
          role: 'admin' | 'editor' | 'viewer';
          token: string;
          status: 'pending' | 'accepted' | 'expired' | 'revoked';
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          inviter_id: string;
          email: string;
          role?: 'admin' | 'editor' | 'viewer';
          token?: string;
          status?: 'pending' | 'accepted' | 'expired' | 'revoked';
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          inviter_id?: string;
          email?: string;
          role?: 'admin' | 'editor' | 'viewer';
          token?: string;
          status?: 'pending' | 'accepted' | 'expired' | 'revoked';
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      plans: {
        Row: {
          id: string;
          name: string;
          slug: string;
          price_cents: number;
          currency: string;
          billing_interval: 'month' | 'year';
          sort_order: number;
          is_active: boolean;
          stripe_price_id: string | null;
          features: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          price_cents?: number;
          currency?: string;
          billing_interval?: 'month' | 'year';
          sort_order?: number;
          is_active?: boolean;
          stripe_price_id?: string | null;
          features?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          price_cents?: number;
          currency?: string;
          billing_interval?: 'month' | 'year';
          sort_order?: number;
          is_active?: boolean;
          stripe_price_id?: string | null;
          features?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          workspace_id: string;
          plan_id: string;
          payment_provider_sub_id: string | null;
          payment_provider_cust_id: string | null;
          status: 'trialing' | 'active' | 'past_due' | 'canceled';
          currency: string;
          trial_ends_at: string | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          plan_id: string;
          payment_provider_sub_id?: string | null;
          payment_provider_cust_id?: string | null;
          status?: 'trialing' | 'active' | 'past_due' | 'canceled';
          currency?: string;
          trial_ends_at?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          plan_id?: string;
          payment_provider_sub_id?: string | null;
          payment_provider_cust_id?: string | null;
          status?: 'trialing' | 'active' | 'past_due' | 'canceled';
          currency?: string;
          trial_ends_at?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          email: string | null;
          phone_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          email?: string | null;
          phone_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          email?: string | null;
          phone_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      portfolios: {
        Row: {
          id: string;
          workspace_id: string;
          slug: string;
          title: string;
          bio: string | null;
          cover_asset_url: string | null;
          social_links: Json;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          slug: string;
          title: string;
          bio?: string | null;
          cover_asset_url?: string | null;
          social_links?: Json;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          slug?: string;
          title?: string;
          bio?: string | null;
          cover_asset_url?: string | null;
          social_links?: Json;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          workspace_id: string;
          client_id: string | null;
          title: string;
          description: string | null;
          share_token: string;
          passcode_hash: string | null;
          status: 'draft' | 'in_review' | 'approved' | 'archived';
          is_download_allowed: boolean;
          notify_on_download: boolean;
          approved_at: string | null;
          approved_by_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          client_id?: string | null;
          title: string;
          description?: string | null;
          share_token?: string;
          passcode_hash?: string | null;
          status?: 'draft' | 'in_review' | 'approved' | 'archived';
          is_download_allowed?: boolean;
          notify_on_download?: boolean;
          approved_at?: string | null;
          approved_by_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          client_id?: string | null;
          title?: string;
          description?: string | null;
          share_token?: string;
          passcode_hash?: string | null;
          status?: 'draft' | 'in_review' | 'approved' | 'archived';
          is_download_allowed?: boolean;
          notify_on_download?: boolean;
          approved_at?: string | null;
          approved_by_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      portfolio_projects: {
        Row: {
          portfolio_id: string;
          project_id: string;
          display_order: number;
        };
        Insert: {
          portfolio_id: string;
          project_id: string;
          display_order?: number;
        };
        Update: {
          portfolio_id?: string;
          project_id?: string;
          display_order?: number;
        };
      };
      assets: {
        Row: {
          id: string;
          workspace_id: string;
          project_id: string | null;
          title: string;
          type: 'video' | 'photo_gallery';
          sort_order: number;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          project_id?: string | null;
          title: string;
          type?: 'video' | 'photo_gallery';
          sort_order?: number;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          project_id?: string | null;
          title?: string;
          type?: 'video' | 'photo_gallery';
          sort_order?: number;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      asset_versions: {
        Row: {
          id: string;
          asset_id: string;
          version_number: number;
          raw_file_url: string;
          hls_manifest_url: string | null;
          thumbnail_url: string | null;
          file_size_bytes: number;
          duration_seconds: number | null;
          transcoding_status: 'pending' | 'processing' | 'ready' | 'failed';
          is_active_version: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          asset_id: string;
          version_number: number;
          raw_file_url: string;
          hls_manifest_url?: string | null;
          thumbnail_url?: string | null;
          file_size_bytes?: number;
          duration_seconds?: number | null;
          transcoding_status?: 'pending' | 'processing' | 'ready' | 'failed';
          is_active_version?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          asset_id?: string;
          version_number?: number;
          raw_file_url?: string;
          hls_manifest_url?: string | null;
          thumbnail_url?: string | null;
          file_size_bytes?: number;
          duration_seconds?: number | null;
          transcoding_status?: 'pending' | 'processing' | 'ready' | 'failed';
          is_active_version?: boolean;
          created_at?: string;
        };
      };
      feedback: {
        Row: {
          id: string;
          asset_version_id: string;
          author_user_id: string | null;
          author_name: string;
          comment_text: string;
          timestamp_seconds: number | null;
          is_resolved: boolean;
          parent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          asset_version_id: string;
          author_user_id?: string | null;
          author_name: string;
          comment_text: string;
          timestamp_seconds?: number | null;
          is_resolved?: boolean;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          asset_version_id?: string;
          author_user_id?: string | null;
          author_name?: string;
          comment_text?: string;
          timestamp_seconds?: number | null;
          is_resolved?: boolean;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notification_logs: {
        Row: {
          id: string;
          workspace_id: string;
          client_id: string | null;
          project_id: string | null;
          channel: 'whatsapp' | 'email';
          recipient_phone: string;
          status: 'queued' | 'sent' | 'delivered' | 'failed';
          provider_message_id: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          client_id?: string | null;
          project_id?: string | null;
          channel?: 'whatsapp' | 'email';
          recipient_phone: string;
          status?: 'queued' | 'sent' | 'delivered' | 'failed';
          provider_message_id?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          client_id?: string | null;
          project_id?: string | null;
          channel?: 'whatsapp' | 'email';
          recipient_phone?: string;
          status?: 'queued' | 'sent' | 'delivered' | 'failed';
          provider_message_id?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
