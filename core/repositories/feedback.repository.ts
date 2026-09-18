import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { Feedback } from '@/core/entities/feedback';

export interface CreateFeedbackDTO {
  assetVersionId: string;
  authorUserId?: string | null;
  authorName: string;
  commentText: string;
  timestampSeconds?: number | null;
  parentId?: string | null;
}

export interface IFeedbackRepository {
  findById(id: string): Promise<Feedback | null>;
  listByAssetVersionId(assetVersionId: string): Promise<Feedback[]>;
  create(dto: CreateFeedbackDTO): Promise<Feedback>;
  update(id: string, data: Partial<Feedback>): Promise<Feedback>;
  resolve(id: string, isResolved: boolean): Promise<Feedback>;
  delete(id: string): Promise<void>;
}

export class SupabaseFeedbackRepository implements IFeedbackRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): Feedback {
    return {
      id: row.id,
      assetVersionId: row.asset_version_id,
      authorUserId: row.author_user_id,
      authorName: row.author_name,
      commentText: row.comment_text,
      timestampSeconds: row.timestamp_seconds !== null ? Number(row.timestamp_seconds) : null,
      isResolved: row.is_resolved ?? false,
      parentId: row.parent_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<Feedback | null> {
    const { data, error } = await (this.supabase as any)
      .from('feedback')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`Error fetching feedback: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async listByAssetVersionId(assetVersionId: string): Promise<Feedback[]> {
    const { data, error } = await (this.supabase as any)
      .from('feedback')
      .select('*')
      .eq('asset_version_id', assetVersionId)
      .order('timestamp_seconds', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Error listing feedback: ${error.message}`);
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
        parent_id: dto.parentId,
      })
      .select()
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
      .select()
      .single();

    if (error) throw new Error(`Failed to update feedback: ${error.message}`);
    return this.mapRowToEntity(updated);
  }

  async resolve(id: string, isResolved: boolean): Promise<Feedback> {
    const { data, error } = await (this.supabase as any)
      .from('feedback')
      .update({ is_resolved: isResolved })
      .eq('id', id)
      .select()
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
}
