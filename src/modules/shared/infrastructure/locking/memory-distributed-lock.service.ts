import { Injectable } from '@nestjs/common';
import { IDistributedLock } from '../../application/locking/ports/distributed-lock.port';

@Injectable()
export class MemoryDistributedLock implements IDistributedLock {
  private readonly heldKeys = new Set<string>();

  async tryAcquire(key: string): Promise<boolean> {
    if (this.heldKeys.has(key)) {
      return false;
    }

    this.heldKeys.add(key);
    return true;
  }

  async release(key: string): Promise<void> {
    this.heldKeys.delete(key);
  }
}
