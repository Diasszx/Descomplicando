import { Injectable } from '@nestjs/common';
import { HealthResponse } from '@fono/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prismaService: PrismaService) {}

  async getHealth(): Promise<HealthResponse> {
    const dbStatus = await this.prismaService.checkDatabase();

    return {
      status: dbStatus === 'up' ? 'ok' : 'degraded',
      service: '@fono/api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      database: dbStatus,
    };
  }
}
