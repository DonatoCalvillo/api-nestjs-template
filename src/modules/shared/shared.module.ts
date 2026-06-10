import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
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
import { HTTP_CLIENT } from './application/ports/http-client.port';
import { TRANSACTION_MANAGER } from './application/ports/transaction-manager.port';
import {
  ActorContextService,
  AuditLogEntity,
  TypeOrmAuditLogRepository,
} from './infrastructure/audit';
import { NestDomainEventDispatcher } from './infrastructure/events';
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
    HttpModule.register({
      timeout: ENVIRONMENT_VARIABLES.HTTP_TIMEOUT_MS,
    }),
    ResilienceModule.forRoot({}),
    TypeOrmModule.forFeature([AuditLogEntity]),
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
  ],
})
export class SharedModule {}
