export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

export type StorageUploadResult = {
  key: string;
  url: string;
};

export interface IStorageService {
  upload(
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<StorageUploadResult>;
  getSignedUrl(key: string, ttlSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}
