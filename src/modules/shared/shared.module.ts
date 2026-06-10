import { Global, Module } from '@nestjs/common';
import { TRANSACTION_MANAGER } from './application/ports/transaction-manager.port';
import { TypeOrmTransactionManager } from './infrastructure/persistence/typeorm-transaction-manager.service';

@Global()
@Module({
  providers: [
    {
      provide: TRANSACTION_MANAGER,
      useClass: TypeOrmTransactionManager,
    },
  ],
  exports: [TRANSACTION_MANAGER],
})
export class SharedModule {}
