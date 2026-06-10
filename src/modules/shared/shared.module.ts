import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResilienceModule } from 'nestjs-resilience';
import { ENVIRONMENT_VARIABLES } from '../../configuration/environments-variables';
import {
  AUDIT_LOG_REPOSITORY,
  AUDIT_LOG_SERVICE,
  AuditLogService,
} from './application/audit';
import {
  DOMAIN_EVENT_DISPATCHER,
  DomainEventStagingService,
} from './application/events';
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
  NoOpMessageBrokerPublisher,
  OutboxMessageEntity,
  OutboxRelayService,
  TypeOrmOutboxRepository,
} from './infrastructure/outbox';
import {
  ResiliencePolicyFactory,
  ResilientHttpClient,
} from './infrastructure/http';
import { TypeOrmTransactionManager } from './infrastructure/persistence/typeorm-transaction-manager.service';
import { TraceContextService } from './infrastructure/tracing';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({ wildcard: false, delimiter: '.' }),
    ScheduleModule.forRoot(),
    HttpModule.register({
      timeout: ENVIRONMENT_VARIABLES.HTTP_TIMEOUT_MS,
    }),
    ResilienceModule.forRoot({}),
    TypeOrmModule.forFeature([AuditLogEntity, OutboxMessageEntity]),
  ],
  providers: [
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
  ],
})
export class SharedModule {}
