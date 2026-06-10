import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResilienceModule } from 'nestjs-resilience';
import { ENVIRONMENT_VARIABLES } from '../../configuration/environments-variables';
import { ShutdownService } from '../../configuration/shutdown';
import { ShutdownStateModule } from '../../configuration/shutdown/shutdown-state.module';
import { DISTRIBUTED_LOCK } from './application/locking/ports/distributed-lock.port';
import {
  AUDIT_LOG_REPOSITORY,
  AUDIT_LOG_SERVICE,
  AuditLogService,
} from './application/audit';
import {
  DOMAIN_EVENT_DISPATCHER,
  DomainEventStagingService,
} from './application/events';
import { IDEMPOTENCY_REPOSITORY } from './application/idempotency';
import {
  MESSAGE_BROKER_PUBLISHER,
  OUTBOX_REPOSITORY,
  OUTBOX_SERVICE,
  OutboxService,
} from './application/outbox';
import { HTTP_CLIENT } from './application/ports/http-client.port';
import { TRANSACTION_MANAGER } from './application/ports/transaction-manager.port';
import {
  ActorContextService,
  AuditLogEntity,
  TypeOrmAuditLogRepository,
} from './infrastructure/audit';
import { NestDomainEventDispatcher } from './infrastructure/events';
import {
  IdempotencyCleanupService,
  IdempotencyKeyEntity,
  TypeOrmIdempotencyRepository,
} from './infrastructure/idempotency';
import {
  MemoryDistributedLock,
  RedisDistributedLock,
} from './infrastructure/locking';
import {
  NoOpMessageBrokerPublisher,
  OutboxMessageEntity,
  OutboxRelayService,
  TypeOrmOutboxRepository,
} from './infrastructure/outbox';
import {
  ResiliencePolicyFactory,
  ResilientHttpClient,
} from './infrastructure/http';
import {
  BUSINESS_METRICS,
  MetricsModule,
  NoOpBusinessMetricsService,
} from './infrastructure/metrics';
import { TypeOrmTransactionManager } from './infrastructure/persistence/typeorm-transaction-manager.service';
import { TraceContextService } from './infrastructure/tracing';

@Global()
@Module({
  imports: [
    ShutdownStateModule,
    EventEmitterModule.forRoot({ wildcard: false, delimiter: '.' }),
    ScheduleModule.forRoot(),
    HttpModule.register({
      timeout: ENVIRONMENT_VARIABLES.HTTP_TIMEOUT_MS,
    }),
    ResilienceModule.forRoot({}),
    TypeOrmModule.forFeature([
      AuditLogEntity,
      OutboxMessageEntity,
      IdempotencyKeyEntity,
    ]),
    ...(ENVIRONMENT_VARIABLES.METRICS_ENABLED ? [MetricsModule] : []),
  ],
  providers: [
    ShutdownService,
    {
      provide: TRANSACTION_MANAGER,
      useClass: TypeOrmTransactionManager,
    },
    ResiliencePolicyFactory,
    TraceContextService,
    ActorContextService,
    DomainEventStagingService,
    NestDomainEventDispatcher,
    {
      provide: DOMAIN_EVENT_DISPATCHER,
      useExisting: NestDomainEventDispatcher,
    },
    AuditLogService,
    {
      provide: AUDIT_LOG_SERVICE,
      useExisting: AuditLogService,
    },
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: TypeOrmAuditLogRepository,
    },
    {
      provide: HTTP_CLIENT,
      useClass: ResilientHttpClient,
    },
    TypeOrmOutboxRepository,
    {
      provide: OUTBOX_REPOSITORY,
      useExisting: TypeOrmOutboxRepository,
    },
    OutboxService,
    {
      provide: OUTBOX_SERVICE,
      useExisting: OutboxService,
    },
    NoOpMessageBrokerPublisher,
    {
      provide: MESSAGE_BROKER_PUBLISHER,
      useExisting: NoOpMessageBrokerPublisher,
    },
    OutboxRelayService,
    ...(ENVIRONMENT_VARIABLES.OUTBOX_RELAY_LOCK === 'redis'
      ? [
          {
            provide: DISTRIBUTED_LOCK,
            useClass: RedisDistributedLock,
          },
        ]
      : [
          {
            provide: DISTRIBUTED_LOCK,
            useClass: MemoryDistributedLock,
          },
        ]),
    TypeOrmIdempotencyRepository,
    {
      provide: IDEMPOTENCY_REPOSITORY,
      useExisting: TypeOrmIdempotencyRepository,
    },
    IdempotencyCleanupService,
    ...(ENVIRONMENT_VARIABLES.METRICS_ENABLED
      ? []
      : [
          {
            provide: BUSINESS_METRICS,
            useClass: NoOpBusinessMetricsService,
          },
        ]),
  ],
  exports: [
    TRANSACTION_MANAGER,
    HTTP_CLIENT,
    TraceContextService,
    ActorContextService,
    DOMAIN_EVENT_DISPATCHER,
    DomainEventStagingService,
    AUDIT_LOG_SERVICE,
    AuditLogService,
    OUTBOX_SERVICE,
    OutboxService,
    OUTBOX_REPOSITORY,
    MESSAGE_BROKER_PUBLISHER,
    IDEMPOTENCY_REPOSITORY,
  ],
})
export class SharedModule {}
