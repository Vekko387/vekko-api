export type StorageUploadInput = {
  body: Buffer;
  cacheControl: string;
  contentType: string;
  key: string;
};

export type StorageUploadResult = {
  url: string;
};

export interface StorageAdapter {
  upload(input: StorageUploadInput): Promise<StorageUploadResult>;
}

export const STORAGE_ADAPTER = Symbol('STORAGE_ADAPTER');
