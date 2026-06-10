import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { ENVIRONMENT_VARIABLES } from './environments-variables';

export const buildThrottlerModuleOptions = (
  redis?: Redis | null,
): ThrottlerModuleOptions => ({
  throttlers: [
    {
      ttl: ENVIRONMENT_VARIABLES.THROTTLE_TTL * 1000,
      limit: ENVIRONMENT_VARIABLES.THROTTLE_LIMIT,
    },
  ],
  ...(ENVIRONMENT_VARIABLES.THROTTLE_STORAGE === 'redis' && redis
    ? { storage: new ThrottlerStorageRedisService(redis) }
    : {}),
});
