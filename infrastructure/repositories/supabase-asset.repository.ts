import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { Asset, AssetVersion } from '@/core/entities/asset';
import {
  IAssetRepository,
  CreateAssetDTO,
  CreateAssetVersionDTO,
} from '@/core/repositories/i-asset-repository';

export class SupabaseAssetRepository implements IAssetRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapAssetRow(row: any): Asset {
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      type: row.type,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapVersionRow(row: any): AssetVersion {
    return {
      id: row.id,
      assetId: row.asset_id,
      versionNumber: row.version_number,
      rawFileUrl: row.raw_file_url,
      hlsManifestUrl: row.hls_manifest_url,
      thumbnailUrl: row.thumbnail_url,
      fileSizeBytes: row.file_size_bytes,
      durationSeconds: row.duration_seconds,
      transcodingStatus: row.transcoding_status,
      isActiveVersion: row.is_active_version,
      createdAt: row.created_at,
    };
  }

  async createAsset(dto: CreateAssetDTO): Promise<Asset> {
    const { data, error } = await (this.supabase as any)
      .from('assets')
      .insert({
        project_id: dto.projectId,
        title: dto.title,
        type: dto.type ?? 'video',
        sort_order: dto.sortOrder ?? 0,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create asset: ${error.message}`);
    return this.mapAssetRow(data);
  }

  async listByProjectId(projectId: string): Promise<Asset[]> {
    const { data, error } = await (this.supabase as any)
      .from('assets')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true });

    if (error) throw new Error(`Failed to list assets: ${error.message}`);
    return data ? data.map((r: any) => this.mapAssetRow(r)) : [];
  }

  async createVersion(dto: CreateAssetVersionDTO): Promise<AssetVersion> {
    const { data, error } = await (this.supabase as any)
      .from('asset_versions')
      .insert({
        asset_id: dto.assetId,
        version_number: dto.versionNumber,
        raw_file_url: dto.rawFileUrl,
        hls_manifest_url: dto.hlsManifestUrl,
        thumbnail_url: dto.thumbnailUrl,
        file_size_bytes: dto.fileSizeBytes ?? 0,
        duration_seconds: dto.durationSeconds,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create asset version: ${error.message}`);
    return this.mapVersionRow(data);
  }

  async listVersionsByAssetId(assetId: string): Promise<AssetVersion[]> {
    const { data, error } = await (this.supabase as any)
      .from('asset_versions')
      .select('*')
      .eq('asset_id', assetId)
      .order('version_number', { ascending: false });

    if (error) throw new Error(`Failed to list asset versions: ${error.message}`);
    return data ? data.map((r: any) => this.mapVersionRow(r)) : [];
  }
}
