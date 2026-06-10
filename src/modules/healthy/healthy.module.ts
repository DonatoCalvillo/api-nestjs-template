import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ShutdownStateModule } from '../../configuration/shutdown/shutdown-state.module';

import { HealthyController } from './healthy.controller';

@Module({
  imports: [ShutdownStateModule, TerminusModule, HttpModule],
  controllers: [HealthyController],
})
export class HealthyModule {}
