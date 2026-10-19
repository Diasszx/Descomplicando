import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { StructuredLoggerService } from './common/logger/structured-logger.service';

async function bootstrap() {
  const logger = new StructuredLoggerService();
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  app.use(helmet());

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : ['http://localhost:5173', 'http://localhost:8081'];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Servidor API escutando na porta ${port}`, 'Bootstrap');
}

bootstrap();
