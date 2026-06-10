import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';
import {
  IStorageService,
  StorageUploadResult,
} from '../../application/ports/storage.service.port';

@Injectable()
export class S3StorageService implements IStorageService {
  private readonly client = new S3Client({
    region: ENVIRONMENT_VARIABLES.S3_REGION,
    ...(ENVIRONMENT_VARIABLES.S3_ENDPOINT
      ? { endpoint: ENVIRONMENT_VARIABLES.S3_ENDPOINT, forcePathStyle: true }
      : {}),
  });

  async upload(
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<StorageUploadResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: ENVIRONMENT_VARIABLES.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    return {
      key,
      url: `s3://${ENVIRONMENT_VARIABLES.S3_BUCKET}/${key}`,
    };
  }

  async getSignedUrl(key: string, ttlSeconds: number): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: ENVIRONMENT_VARIABLES.S3_BUCKET,
        Key: key,
      }),
      { expiresIn: ttlSeconds },
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: ENVIRONMENT_VARIABLES.S3_BUCKET,
        Key: key,
      }),
    );
  }
}
