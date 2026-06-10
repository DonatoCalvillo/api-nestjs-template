import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { buildSwaggerDocument } from '../../src/configuration/swagger';
import { configureApp } from '../../src/bootstrap/configure-app';
import { normalizeOpenApiDocument } from '../helpers/openapi-normalizer';

describe('OpenAPI contract', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const { AppModule } = await import('../../src/app.module');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('matches the committed OpenAPI snapshot', () => {
    const document = normalizeOpenApiDocument(buildSwaggerDocument(app));
    expect(document).toMatchSnapshot();
  });
});
