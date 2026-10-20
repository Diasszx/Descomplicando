import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { StructuredLoggerService } from '../common/logger/structured-logger.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new StructuredLoggerService();

  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
    } catch {
      // Ignora erro de desconexão caso o cliente ainda não tenha aberto pool
    }
  }

  async checkDatabase(): Promise<'up' | 'down'> {
    try {
      await this.$queryRaw`SELECT 1`;
      return 'up';
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Falha na verificação de conectividade';
      this.logger.error(
        `Healthcheck do banco de dados falhou: ${errorMessage}`,
        undefined,
        'PrismaService',
      );
      return 'down';
    }
  }
}
