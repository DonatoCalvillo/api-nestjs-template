import {
  DynamicModule,
  Global,
  Injectable,
  Module,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';
import {
  ENVIRONMENT_VARIABLES,
  isRedisEnabled,
} from '../../../../configuration/environments-variables';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
class RedisConnection implements OnModuleDestroy {
  readonly client: Redis | null = isRedisEnabled()
    ? new Redis(ENVIRONMENT_VARIABLES.REDIS_URL!)
    : null;

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit();
  }
}

@Global()
@Module({})
export class RedisModule {
  static forRoot(): DynamicModule {
    return {
      module: RedisModule,
      providers: [
        RedisConnection,
        {
          provide: REDIS_CLIENT,
          useFactory: (connection: RedisConnection) => connection.client,
          inject: [RedisConnection],
        },
      ],
      exports: [REDIS_CLIENT],
    };
  }
}
