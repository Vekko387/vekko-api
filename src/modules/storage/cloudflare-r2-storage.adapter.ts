import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type {
  StorageAdapter,
  StorageUploadInput,
  StorageUploadResult,
} from './storage.adapter';

@Injectable()
export class CloudflareR2StorageAdapter implements StorageAdapter {
  private client?: S3Client;

  constructor(private readonly configService: ConfigService) {}

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    await this.getClient().send(
      new PutObjectCommand({
        Body: input.body,
        Bucket: this.configService.getOrThrow<string>('storage.bucket'),
        CacheControl: input.cacheControl,
        ContentType: input.contentType,
        Key: input.key,
      }),
    );

    const publicBaseUrl = this.configService
      .getOrThrow<string>('storage.publicBaseUrl')
      .replace(/\/$/u, '');

    return { url: `${publicBaseUrl}/${input.key}?v=${Date.now()}` };
  }

  private getClient(): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        credentials: {
          accessKeyId: this.configService.getOrThrow<string>(
            'storage.accessKeyId',
          ),
          secretAccessKey: this.configService.getOrThrow<string>(
            'storage.secretAccessKey',
          ),
        },
        endpoint: this.configService.getOrThrow<string>('storage.endpoint'),
        region: this.configService.getOrThrow<string>('storage.region'),
      });
    }

    return this.client;
  }
}
