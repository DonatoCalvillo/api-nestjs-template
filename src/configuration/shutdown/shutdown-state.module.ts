import { Global, Module } from '@nestjs/common';
import { ShutdownStateService } from './shutdown-state.service';

@Global()
@Module({
  providers: [ShutdownStateService],
  exports: [ShutdownStateService],
})
export class ShutdownStateModule {}
