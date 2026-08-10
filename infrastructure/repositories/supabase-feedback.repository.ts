import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { Feedback } from '@/core/entities/feedback';
import { IFeedbackRepository, CreateFeedbackDTO } from '@/core/repositories/i-feedback-repository';

export class SupabaseFeedbackRepository implements IFeedbackRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): Feedback {
    return {
      id: row.id,
      assetVersionId: row.asset_version_id,
      authorUserId: row.author_user_id,
      authorName: row.author_name,
      commentText: row.comment_text,
      timestampSeconds: row.timestamp_seconds,
      isResolved: row.is_resolved,
      parentId: row.parent_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
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

  async getByAssetVersionId(assetVersionId: string): Promise<Feedback[]> {
    const { data, error } = await (this.supabase as any)
      .from('feedback')
      .select('*')
      .eq('asset_version_id', assetVersionId)
      .order('timestamp_seconds', { ascending: true });

    if (error) throw new Error(`Failed to fetch feedback: ${error.message}`);
    return data ? data.map((r: any) => this.mapRowToEntity(r)) : [];
  }

  async toggleResolve(id: string, isResolved: boolean): Promise<Feedback> {
    const { data, error } = await (this.supabase as any)
      .from('feedback')
      .update({ is_resolved: isResolved })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update resolution status: ${error.message}`);
    return this.mapRowToEntity(data);
  }
}
