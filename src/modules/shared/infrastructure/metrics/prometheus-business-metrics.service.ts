import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge } from 'prom-client';
import { IBusinessMetrics } from './business-metrics.port';
import {
  AUDIT_LOG_WRITE_ERRORS_TOTAL,
  AUDIT_LOG_WRITES_TOTAL,
  CIRCUIT_BREAKER_OPEN,
  CIRCUIT_BREAKER_OPENED_TOTAL,
  CIRCUIT_BREAKER_STATE,
  CIRCUIT_BREAKER_CLOSED,
  OUTBOX_MESSAGES_FAILED_TOTAL,
  OUTBOX_MESSAGES_PENDING,
  OUTBOX_MESSAGES_PUBLISHED_TOTAL,
} from './metrics.constants';

@Injectable()
export class PrometheusBusinessMetricsService implements IBusinessMetrics {
  constructor(
    @InjectMetric(OUTBOX_MESSAGES_PENDING)
    private readonly outboxPending: Gauge<string>,
    @InjectMetric(OUTBOX_MESSAGES_PUBLISHED_TOTAL)
    private readonly outboxPublished: Counter<string>,
    @InjectMetric(OUTBOX_MESSAGES_FAILED_TOTAL)
    private readonly outboxFailed: Counter<string>,
    @InjectMetric(AUDIT_LOG_WRITES_TOTAL)
    private readonly auditWrites: Counter<string>,
    @InjectMetric(AUDIT_LOG_WRITE_ERRORS_TOTAL)
    private readonly auditWriteErrors: Counter<string>,
    @InjectMetric(CIRCUIT_BREAKER_STATE)
    private readonly circuitBreakerState: Gauge<string>,
    @InjectMetric(CIRCUIT_BREAKER_OPENED_TOTAL)
    private readonly circuitBreakerOpened: Counter<string>,
  ) {}

  setOutboxPending(status: string, count: number): void {
    this.outboxPending.set({ status }, count);
  }

  recordOutboxPublished(eventName: string): void {
    this.outboxPublished.inc({ event_name: eventName });
  }

  recordOutboxFailed(eventName: string): void {
    this.outboxFailed.inc({ event_name: eventName });
  }

  recordAuditWrite(
    action: string,
    entityType: string,
    actorType: string,
  ): void {
    this.auditWrites.inc({
      action,
      entity_type: entityType,
      actor_type: actorType,
    });
  }

  recordAuditWriteError(): void {
    this.auditWriteErrors.inc();
  }

  recordCircuitOpen(circuitBreakerKey: string): void {
    this.circuitBreakerState.set(
      { circuit_breaker_key: circuitBreakerKey },
      CIRCUIT_BREAKER_OPEN,
    );
    this.circuitBreakerOpened.inc({ circuit_breaker_key: circuitBreakerKey });
  }

  recordCircuitClosed(circuitBreakerKey: string): void {
    this.circuitBreakerState.set(
      { circuit_breaker_key: circuitBreakerKey },
      CIRCUIT_BREAKER_CLOSED,
    );
  }
}
