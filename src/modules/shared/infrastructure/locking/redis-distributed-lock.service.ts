import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { IDistributedLock } from '../../application/locking/ports/distributed-lock.port';
import { REDIS_CLIENT } from '../redis/redis.constants';

const RELEASE_LOCK_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

@Injectable()
export class RedisDistributedLock implements IDistributedLock {
  private readonly instanceId = randomUUID();
  private readonly lockTokens = new Map<string, string>();

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async tryAcquire(key: string, ttlSeconds: number): Promise<boolean> {
    const token = this.instanceId;
    const result = await this.redis.set(key, token, 'EX', ttlSeconds, 'NX');

    if (result !== 'OK') {
      return false;
    }

    this.lockTokens.set(key, token);
    return true;
  }

  async release(key: string): Promise<void> {
    const token = this.lockTokens.get(key);

    if (!token) {
      return;
    }

    await this.redis.eval(RELEASE_LOCK_SCRIPT, 1, key, token);
    this.lockTokens.delete(key);
  }
}
