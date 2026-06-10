import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthyController } from './healthy.controller';

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthyController],
})
export class HealthyModule {}
