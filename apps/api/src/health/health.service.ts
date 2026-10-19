import { Injectable } from '@nestjs/common';
import { HealthResponse } from '@fono/shared';

@Injectable()
export class HealthService {
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: '@fono/api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }
}
