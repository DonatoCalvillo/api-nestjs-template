import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { configureApp } from '../../src/bootstrap/configure-app';

export const createTestApp = async (): Promise<INestApplication> => {
  const { AppModule } = await import('../../src/app.module');

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication({ bodyParser: false });
  configureApp(app);
  await app.init();

  return app;
};
