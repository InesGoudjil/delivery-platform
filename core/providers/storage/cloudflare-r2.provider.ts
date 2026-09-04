import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  IStorageProvider,
  CreateUploadUrlParams,
  DirectUploadResult,
  PlaybackInfo,
  StorageAssetStatus,
} from "./storage.provider";

export interface CloudflareR2Config {
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  publicDomain?: string;
}

export class CloudflareR2StorageProvider implements IStorageProvider {
  readonly providerName = "cloudflare_r2";
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly publicDomain: string;

  constructor(config: CloudflareR2Config) {
    if (!config.bucket || !config.accessKeyId || !config.secretAccessKey) {
      throw new Error("CloudflareR2StorageProvider requires bucket, accessKeyId, and secretAccessKey.");
    }
    this.bucket = config.bucket;
    this.publicDomain = (config.publicDomain || `${config.endpoint}/${config.bucket}`).replace(/\/$/, "");

    this.s3Client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async createDirectUploadUrl(params: CreateUploadUrlParams): Promise<DirectUploadResult> {
    const key = `workspaces/${params.workspaceId}/${params.projectId}/${Date.now()}-${params.filename}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: params.assetType === "image" ? "image/jpeg" : undefined,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });

    return {
      uploadUrl,
      providerUid: key,
      uploadType: "presigned_put",
    };
  }

  async getPlaybackInfo(providerUid: string): Promise<PlaybackInfo | null> {
    const assetUrl = `${this.publicDomain}/${providerUid}`;
    return {
      providerUid,
      hlsManifestUrl: assetUrl,
      thumbnailUrl: assetUrl,
      status: "ready",
    };
  }

  async getAssetStatus(providerUid: string): Promise<StorageAssetStatus> {
    const assetUrl = `${this.publicDomain}/${providerUid}`;
    return {
      providerUid,
      status: "ready",
      thumbnailUrl: assetUrl,
    };
  }

  async deleteAsset(providerUid: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: providerUid,
    });
    await this.s3Client.send(command);
  }
}