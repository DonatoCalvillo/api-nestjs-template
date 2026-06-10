export const BUSINESS_METRICS = Symbol('BUSINESS_METRICS');

export interface IBusinessMetrics {
  setOutboxPending(status: string, count: number): void;
  recordOutboxPublished(eventName: string): void;
  recordOutboxFailed(eventName: string): void;
  recordAuditWrite(action: string, entityType: string, actorType: string): void;
  recordAuditWriteError(): void;
  recordCircuitOpen(circuitBreakerKey: string): void;
  recordCircuitClosed(circuitBreakerKey: string): void;
}
