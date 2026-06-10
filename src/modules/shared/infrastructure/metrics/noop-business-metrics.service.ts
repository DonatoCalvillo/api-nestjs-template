/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { IBusinessMetrics } from './business-metrics.port';

@Injectable()
export class NoOpBusinessMetricsService implements IBusinessMetrics {
  setOutboxPending(_status: string, _count: number): void {}

  recordOutboxPublished(_eventName: string): void {}

  recordOutboxFailed(_eventName: string): void {}

  recordAuditWrite(
    _action: string,
    _entityType: string,
    _actorType: string,
  ): void {}

  recordAuditWriteError(): void {}

  recordCircuitOpen(_circuitBreakerKey: string): void {}

  recordCircuitClosed(_circuitBreakerKey: string): void {}
}
