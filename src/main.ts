import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const pinnoProps = {
  transport: {
    targets: [
      {
        target: 'pino-pretty',
        options: {
          singleLine: true,
        },
      },
    ],
  },
};

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: pinnoProps,
    }),
  );
  app.setGlobalPrefix('api');

  // SWAGGER SETTINGS
  const config = new DocumentBuilder()
    .setTitle('API TEST')
    .setDescription('The test API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  await app.listen(3000, '0.0.0.0');
}
bootstrap();
