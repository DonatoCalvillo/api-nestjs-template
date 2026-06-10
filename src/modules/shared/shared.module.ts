import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { ResilienceModule } from 'nestjs-resilience';
import { ENVIRONMENT_VARIABLES } from '../../configuration/environments-variables';
import { HTTP_CLIENT } from './application/ports/http-client.port';
import { TRANSACTION_MANAGER } from './application/ports/transaction-manager.port';
import {
  ResiliencePolicyFactory,
  ResilientHttpClient,
} from './infrastructure/http';
import { TypeOrmTransactionManager } from './infrastructure/persistence/typeorm-transaction-manager.service';
import { TraceContextService } from './infrastructure/tracing';

@Global()
@Module({
  imports: [
    HttpModule.register({
      timeout: ENVIRONMENT_VARIABLES.HTTP_TIMEOUT_MS,
    }),
    ResilienceModule.forRoot({}),
  ],
  providers: [
    {
      provide: TRANSACTION_MANAGER,
      useClass: TypeOrmTransactionManager,
    },
    ResiliencePolicyFactory,
    TraceContextService,
    {
      provide: HTTP_CLIENT,
      useClass: ResilientHttpClient,
    },
  ],
  exports: [TRANSACTION_MANAGER, HTTP_CLIENT, TraceContextService],
})
export class SharedModule {}
