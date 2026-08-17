import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { Asset, AssetVersion, AssetType, TranscodingStatus } from '@/core/entities/asset';

export interface CreateAssetDTO {
  projectId: string;
  title: string;
  type?: AssetType;
  sortOrder?: number;
  isArchived?: boolean;
}

export interface CreateAssetVersionDTO {
  assetId: string;
  versionNumber: number;
  rawFileUrl: string;
  hlsManifestUrl?: string | null;
  thumbnailUrl?: string | null;
  fileSizeBytes?: number;
  durationSeconds?: number | null;
  transcodingStatus?: TranscodingStatus;
  isActiveVersion?: boolean;
}

export interface IAssetRepository {
  findById(id: string): Promise<Asset | null>;
  listByProjectId(projectId: string): Promise<Asset[]>;
  create(dto: CreateAssetDTO): Promise<Asset>;
  update(id: string, data: Partial<Asset>): Promise<Asset>;
  delete(id: string): Promise<void>;
}

export interface IAssetVersionRepository {
  findById(id: string): Promise<AssetVersion | null>;
  listByAssetId(assetId: string): Promise<AssetVersion[]>;
  findActiveVersion(assetId: string): Promise<AssetVersion | null>;
  create(dto: CreateAssetVersionDTO): Promise<AssetVersion>;
  update(id: string, data: Partial<AssetVersion>): Promise<AssetVersion>;
  setActiveVersion(assetId: string, versionId: string): Promise<void>;
  delete(id: string): Promise<void>;
}

export class SupabaseAssetRepository implements IAssetRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): Asset {
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      type: row.type as AssetType,
      sortOrder: row.sort_order ?? 0,
      isArchived: Boolean(row.is_archived),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<Asset | null> {
    const { data, error } = await (this.supabase as any)
      .from('assets')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`Error fetching asset: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async listByProjectId(projectId: string): Promise<Asset[]> {
    const { data, error } = await (this.supabase as any)
      .from('assets')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Error listing assets: ${error.message}`);
    return data ? data.map((r: any) => this.mapRowToEntity(r)) : [];
  }

  async create(dto: CreateAssetDTO): Promise<Asset> {
    const { data, error } = await (this.supabase as any)
      .from('assets')
      .insert({
        project_id: dto.projectId,
        title: dto.title,
        type: dto.type || 'video',
        sort_order: dto.sortOrder ?? 0,
        is_archived: dto.isArchived ?? false,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create asset: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async update(id: string, data: Partial<Asset>): Promise<Asset> {
    const payload: any = {};
    if (data.title !== undefined) payload.title = data.title;
    if (data.type !== undefined) payload.type = data.type;
    if (data.sortOrder !== undefined) payload.sort_order = data.sortOrder;
    if (data.isArchived !== undefined) payload.is_archived = data.isArchived;

    const { data: updated, error } = await (this.supabase as any)
      .from('assets')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update asset: ${error.message}`);
    return this.mapRowToEntity(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from('assets')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete asset: ${error.message}`);
  }
}

export class SupabaseAssetVersionRepository implements IAssetVersionRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private mapRowToEntity(row: any): AssetVersion {
    return {
      id: row.id,
      assetId: row.asset_id,
      versionNumber: row.version_number,
      rawFileUrl: row.raw_file_url,
      hlsManifestUrl: row.hls_manifest_url,
      thumbnailUrl: row.thumbnail_url,
      fileSizeBytes: Number(row.file_size_bytes || 0),
      durationSeconds: row.duration_seconds ? Number(row.duration_seconds) : null,
      transcodingStatus: row.transcoding_status as TranscodingStatus,
      isActiveVersion: row.is_active_version ?? false,
      createdAt: row.created_at,
    };
  }

  async findById(id: string): Promise<AssetVersion | null> {
    const { data, error } = await (this.supabase as any)
      .from('asset_versions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`Error fetching asset version: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async listByAssetId(assetId: string): Promise<AssetVersion[]> {
    const { data, error } = await (this.supabase as any)
      .from('asset_versions')
      .select('*')
      .eq('asset_id', assetId)
      .order('version_number', { ascending: false });

    if (error) throw new Error(`Error listing asset versions: ${error.message}`);
    return data ? data.map((r: any) => this.mapRowToEntity(r)) : [];
  }

  async findActiveVersion(assetId: string): Promise<AssetVersion | null> {
    const { data, error } = await (this.supabase as any)
      .from('asset_versions')
      .select('*')
      .eq('asset_id', assetId)
      .eq('is_active_version', true)
      .maybeSingle();

    if (error) throw new Error(`Error fetching active version: ${error.message}`);
    return data ? this.mapRowToEntity(data) : null;
  }

  async create(dto: CreateAssetVersionDTO): Promise<AssetVersion> {
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
        transcoding_status: dto.transcodingStatus || 'pending',
        is_active_version: dto.isActiveVersion ?? true,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create asset version: ${error.message}`);
    return this.mapRowToEntity(data);
  }

  async update(id: string, data: Partial<AssetVersion>): Promise<AssetVersion> {
    const payload: any = {};
    if (data.rawFileUrl !== undefined) payload.raw_file_url = data.rawFileUrl;
    if (data.hlsManifestUrl !== undefined) payload.hls_manifest_url = data.hlsManifestUrl;
    if (data.thumbnailUrl !== undefined) payload.thumbnail_url = data.thumbnailUrl;
    if (data.fileSizeBytes !== undefined) payload.file_size_bytes = data.fileSizeBytes;
    if (data.durationSeconds !== undefined) payload.duration_seconds = data.durationSeconds;
    if (data.transcodingStatus !== undefined) payload.transcoding_status = data.transcodingStatus;
    if (data.isActiveVersion !== undefined) payload.is_active_version = data.isActiveVersion;

    const { data: updated, error } = await (this.supabase as any)
      .from('asset_versions')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update asset version: ${error.message}`);
    return this.mapRowToEntity(updated);
  }

  async setActiveVersion(assetId: string, versionId: string): Promise<void> {
    // 1. Deactivate all versions for this asset
    await (this.supabase as any)
      .from('asset_versions')
      .update({ is_active_version: false })
      .eq('asset_id', assetId);

    // 2. Activate target version
    await (this.supabase as any)
      .from('asset_versions')
      .update({ is_active_version: true })
      .eq('id', versionId);
  }

  async delete(id: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from('asset_versions')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete asset version: ${error.message}`);
  }
}
