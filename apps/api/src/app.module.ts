import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { StructuredLoggerService } from './common/logger/structured-logger.service';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    HealthModule,
  ],
  providers: [
    StructuredLoggerService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [StructuredLoggerService],
})
export class AppModule {}
