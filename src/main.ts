import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes();

  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
  1;

  const config = app.get(ConfigService);
  const logger = new Logger();

  const port = config.get<number>('PORT') || 3050;

  await app.listen(port, () => {
    logger.log(`Transaction Service is listening on port ${port}`);
  });
}
bootstrap();
