/* eslint-disable @typescript-eslint/no-unused-vars */
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';
import {
  IStorageService,
  StorageUploadResult,
} from '../../application/ports/storage.service.port';

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly basePath = ENVIRONMENT_VARIABLES.STORAGE_LOCAL_PATH;

  async upload(
    key: string,
    buffer: Buffer,
    _mimeType: string,
  ): Promise<StorageUploadResult> {
    const filePath = join(this.basePath, key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    return { key, url: `/uploads/${key}` };
  }

  async getSignedUrl(key: string, _ttlSeconds: number): Promise<string> {
    return `/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    await unlink(join(this.basePath, key)).catch(() => undefined);
  }
}
