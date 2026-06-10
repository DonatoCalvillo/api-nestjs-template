import { INestApplication, Module, Type } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MetricsModule } from '../../src/modules/shared/infrastructure/metrics';

export const createMetricsTestApp = async (
  ...controllers: Type<unknown>[]
): Promise<INestApplication> => {
  @Module({
    imports: [MetricsModule],
    controllers,
  })
  class MetricsHarnessModule {}

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [MetricsHarnessModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();

  return app;
};
