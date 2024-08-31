import { Module } from '@nestjs/common';

import { HealthyController } from './healthy.controller';

@Module({
  controllers: [HealthyController],
  providers: [],
})
export class HealthyModule {}
