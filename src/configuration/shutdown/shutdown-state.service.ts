import { Injectable } from '@nestjs/common';

@Injectable()
export class ShutdownStateService {
  private shuttingDown = false;

  get isShuttingDown(): boolean {
    return this.shuttingDown;
  }

  markShuttingDown(): void {
    this.shuttingDown = true;
  }
}
