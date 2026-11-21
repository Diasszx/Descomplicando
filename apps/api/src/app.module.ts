import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { StructuredLoggerService } from './common/logger/structured-logger.service';
import { FonoThrottlerGuard } from './common/guards/fono-throttler.guard';
import { SafeHttpExceptionFilter } from './common/filters/safe-http-exception.filter';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
  ],
  providers: [
    StructuredLoggerService,
    {
      provide: APP_GUARD,
      useClass: FonoThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: SafeHttpExceptionFilter,
    },
  ],
  exports: [StructuredLoggerService],
})
export class AppModule {}
