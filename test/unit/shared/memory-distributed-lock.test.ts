import { MemoryDistributedLock } from '../../../src/modules/shared/infrastructure/locking/memory-distributed-lock.service';

describe('MemoryDistributedLock', () => {
  let lock: MemoryDistributedLock;

  beforeEach(() => {
    lock = new MemoryDistributedLock();
  });

  it('acquires and releases a key', async () => {
    await expect(lock.tryAcquire('test-key')).resolves.toBe(true);
    await lock.release('test-key');
    await expect(lock.tryAcquire('test-key')).resolves.toBe(true);
  });

  it('rejects concurrent acquisition of the same key', async () => {
    await expect(lock.tryAcquire('test-key')).resolves.toBe(true);
    await expect(lock.tryAcquire('test-key')).resolves.toBe(false);
    await lock.release('test-key');
  });

  it('allows different keys concurrently', async () => {
    await expect(lock.tryAcquire('key-a')).resolves.toBe(true);
    await expect(lock.tryAcquire('key-b')).resolves.toBe(true);
    await lock.release('key-a');
    await lock.release('key-b');
  });
});
