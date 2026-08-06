import { Module } from '@nestjs/common';
import { CloudflareR2StorageAdapter } from './cloudflare-r2-storage.adapter';
import { STORAGE_ADAPTER } from './storage.adapter';

@Module({
  exports: [STORAGE_ADAPTER],
  providers: [
    CloudflareR2StorageAdapter,
    {
      provide: STORAGE_ADAPTER,
      useExisting: CloudflareR2StorageAdapter,
    },
  ],
})
export class StorageModule {}
