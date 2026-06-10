export interface IDistributedLock {
  tryAcquire(key: string, ttlSeconds: number): Promise<boolean>;
  release(key: string): Promise<void>;
}

export const DISTRIBUTED_LOCK = Symbol('DISTRIBUTED_LOCK');
