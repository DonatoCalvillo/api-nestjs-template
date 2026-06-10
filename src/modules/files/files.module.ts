import { Module } from '@nestjs/common';
import { ENVIRONMENT_VARIABLES } from '../../configuration/environments-variables';
import { STORAGE_SERVICE } from '../shared/application/ports/storage.service.port';
import { LocalStorageService } from '../shared/infrastructure/storage/local-storage.service';
import { S3StorageService } from '../shared/infrastructure/storage/s3-storage.service';
import { FilesController } from './files.controller';

@Module({
  controllers: [FilesController],
  providers: [
    LocalStorageService,
    S3StorageService,
    {
      provide: STORAGE_SERVICE,
      useFactory: (local: LocalStorageService, s3: S3StorageService) =>
        ENVIRONMENT_VARIABLES.STORAGE_DRIVER === 's3' ? s3 : local,
      inject: [LocalStorageService, S3StorageService],
    },
  ],
})
export class FilesModule {}
