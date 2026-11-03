import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configurarApp } from './app.setup';

async function bootstrap(): Promise<void> {
  const app = configurarApp(await NestFactory.create(AppModule));
  const porta = Number(process.env.PORT ?? 3000);
  await app.listen(porta);
  Logger.log(
    `API em http://localhost:${porta} | Swagger em http://localhost:${porta}/docs`,
    'Bootstrap',
  );
}

void bootstrap();
