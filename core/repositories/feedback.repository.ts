import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { Feedback, FeedbackReply } from '@/core/entities/feedback';

export interface CreateFeedbackDTO {
  assetVersionId: string;
  authorUserId?: string | null;
  authorName: string;
  commentText: string;
  timestampSeconds?: number | null;
  parentId?: string | null;
}

export interface CreateFeedbackReplyDTO {
  feedbackId: string;
  authorUserId?: string | null;
  authorName: string;
  commentText: string;
}

export interface IFeedbackRepository {
  findById(id: string): Promise<Feedback | null>;
  listByAssetVersionId(assetVersionId: string): Promise<Feedback[]>;
  listByAssetVersionIds(assetVersionIds: string[]): Promise<Feedback[]>;
  create(dto: CreateFeedbackDTO): Promise<Feedback>;
  update(id: string, data: Partial<Feedback>): Promise<Feedback>;
  resolve(id: string, isResolved: boolean): Promise<Feedback>;
  delete(id: string): Promise<void>;
  createReply(dto: CreateFeedbackReplyDTO): Promise<FeedbackReply>;
  deleteReply(replyId: string): Promise<void>;
  listRepliesByFeedbackId(feedbackId: string): Promise<FeedbackReply[]>;
}

export class SupabaseFeedbackRepository implements IFeedbackRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapReplyRowToEntity(row: any): FeedbackReply {
    return {
      id: row.id,
      feedbackId: row.feedback_id,
      authorUserId: row.author_user_id,
      authorName: row.author_name,
      commentText: row.comment_text,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToEntity(row: any): Feedback {
    const rawReplies = Array.isArray(row.feedback_replies)
      ? row.feedback_replies
      : Array.isArray(row.replies)
      ? row.replies
      : [];

    const replies: FeedbackReply[] = rawReplies
      .map((r: any) => this.mapReplyRowToEntity(r))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return {
      id: row.id,
      assetVersionId: row.asset_version_id,
      authorUserId: row.author_user_id,
      authorName: row.author_name,
      commentText: row.comment_text,
      timestampSeconds: row.timestamp_seconds !== null ? Number(row.timestamp_seconds) : null,
      isResolved: row.is_resolved ?? false,
      parentId: null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      replies,
    };
  }

  async findById(id: string): Promise<Feedback | null> {
    const { data, error } = await (this.supabase as any)
      .from('feedback')
      .select('*, feedback_replies(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`Error fetching feedback: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async listByAssetVersionId(assetVersionId: string): Promise<Feedback[]> {
    const { data, error } = await (this.supabase as any)
      .from('feedback')
      .select('*, feedback_replies(*)')
      .eq('asset_version_id', assetVersionId)
      .order('timestamp_seconds', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Error listing feedback: ${error.message}`);
    return data ? data.map((r: any) => this.mapRowToEntity(r)) : [];
  }

  async listByAssetVersionIds(assetVersionIds: string[]): Promise<Feedback[]> {
    if (!assetVersionIds || assetVersionIds.length === 0) return [];
    const { data, error } = await (this.supabase as any)
      .from('feedback')
      .select('*, feedback_replies(*)')
      .in('asset_version_id', assetVersionIds)
      .order('timestamp_seconds', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Error listing feedback by version IDs: ${error.message}`);
    return data ? data.map((r: any) => this.mapRowToEntity(r)) : [];
  }

  async create(dto: CreateFeedbackDTO): Promise<Feedback> {
    const { data, error } = await (this.supabase as any)
      .from('feedback')
      .insert({
        asset_version_id: dto.assetVersionId,
        author_user_id: dto.authorUserId,
        author_name: dto.authorName,
        comment_text: dto.commentText,
        timestamp_seconds: dto.timestampSeconds,
      })
      .select('*, feedback_replies(*)')
      .single();

    if (error) throw new Error(`Failed to create feedback: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async update(id: string, data: Partial<Feedback>): Promise<Feedback> {
    const payload: any = {};
    if (data.commentText !== undefined) payload.comment_text = data.commentText;
    if (data.timestampSeconds !== undefined) payload.timestamp_seconds = data.timestampSeconds;
    if (data.isResolved !== undefined) payload.is_resolved = data.isResolved;

    const { data: updated, error } = await (this.supabase as any)
      .from('feedback')
      .update(payload)
      .eq('id', id)
      .select('*, feedback_replies(*)')
      .single();

    if (error) throw new Error(`Failed to update feedback: ${error.message}`);
    return this.mapRowToEntity(updated);
  }

  async resolve(id: string, isResolved: boolean): Promise<Feedback> {
    const { data, error } = await (this.supabase as any)
      .from('feedback')
      .update({ is_resolved: isResolved })
      .eq('id', id)
      .select('*, feedback_replies(*)')
      .single();

    if (error) throw new Error(`Failed to resolve feedback: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from('feedback')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete feedback: ${error.message}`);
  }

  async createReply(dto: CreateFeedbackReplyDTO): Promise<FeedbackReply> {
    const { data, error } = await (this.supabase as any)
      .from('feedback_replies')
      .insert({
        feedback_id: dto.feedbackId,
        author_user_id: dto.authorUserId,
        author_name: dto.authorName,
        comment_text: dto.commentText,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create feedback reply: ${error.message}`);
    return this.mapReplyRowToEntity(data);
  }

  async deleteReply(replyId: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from('feedback_replies')
      .delete()
      .eq('id', replyId);

    if (error) throw new Error(`Failed to delete feedback reply: ${error.message}`);
  }

  async listRepliesByFeedbackId(feedbackId: string): Promise<FeedbackReply[]> {
    const { data, error } = await (this.supabase as any)
      .from('feedback_replies')
      .select('*')
      .eq('feedback_id', feedbackId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to list feedback replies: ${error.message}`);
    return data ? data.map((r: any) => this.mapReplyRowToEntity(r)) : [];
  }
}
