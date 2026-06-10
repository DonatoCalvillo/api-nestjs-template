import Redis from 'ioredis';
import { RedisDistributedLock } from '../src/modules/shared/infrastructure/locking/redis-distributed-lock.service';

describe('RedisDistributedLock', () => {
  let redis: jest.Mocked<Pick<Redis, 'set' | 'eval'>>;
  let lock: RedisDistributedLock;

  beforeEach(() => {
    redis = {
      set: jest.fn(),
      eval: jest.fn().mockResolvedValue(1),
    };
    lock = new RedisDistributedLock(redis as unknown as Redis);
  });

  it('acquires lock with SET NX EX', async () => {
    redis.set.mockResolvedValue('OK');

    await expect(lock.tryAcquire('lock:key', 120)).resolves.toBe(true);

    expect(redis.set).toHaveBeenCalledWith(
      'lock:key',
      expect.any(String),
      'EX',
      120,
      'NX',
    );
  });

  it('returns false when lock is already held', async () => {
    redis.set.mockResolvedValue(null);

    await expect(lock.tryAcquire('lock:key', 120)).resolves.toBe(false);
  });

  it('releases lock with Lua script when token matches', async () => {
    redis.set.mockResolvedValue('OK');

    await lock.tryAcquire('lock:key', 120);
    await lock.release('lock:key');

    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("get"'),
      1,
      'lock:key',
      expect.any(String),
    );
  });

  it('does not call eval when lock was not acquired', async () => {
    redis.set.mockResolvedValue(null);

    await lock.tryAcquire('lock:key', 120);
    await lock.release('lock:key');

    expect(redis.eval).not.toHaveBeenCalled();
  });
});
