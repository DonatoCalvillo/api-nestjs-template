import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { redisStore } from 'cache-manager-ioredis-yet';
import {
  ENVIRONMENT_VARIABLES,
  isRedisEnabled,
} from '../../../../configuration/environments-variables';

const isCacheEnabled = (): boolean =>
  ENVIRONMENT_VARIABLES.CACHE_ENABLED && isRedisEnabled();

@Global()
@Module({})
export class AppCacheModule {
  static forRoot(): DynamicModule {
    if (!isCacheEnabled()) {
      return {
        module: AppCacheModule,
      };
    }

    return {
      module: AppCacheModule,
      imports: [
        NestCacheModule.registerAsync({
          useFactory: async () => ({
            store: await redisStore({
              url: ENVIRONMENT_VARIABLES.REDIS_URL,
            }),
            ttl: ENVIRONMENT_VARIABLES.CACHE_TTL_SECONDS * 1000,
          }),
        }),
      ],
      exports: [NestCacheModule],
    };
  }
}
