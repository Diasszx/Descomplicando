import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';
import { HealthResponseSchema } from '@fono/shared';

describe('HealthService', () => {
  let service: HealthService;
  let prismaService: { checkDatabase: jest.Mock<Promise<'up' | 'down'>, []> };

  beforeEach(async () => {
    prismaService = {
      checkDatabase: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('deve retornar status ok e database up quando o PostgreSQL responder', async () => {
    prismaService.checkDatabase.mockResolvedValueOnce('up');

    const result = await service.getHealth();
    const parsed = HealthResponseSchema.parse(result);

    expect(parsed.status).toBe('ok');
    expect(parsed.database).toBe('up');
    expect(parsed.service).toBe('@fono/api');
    expect(parsed.version).toBe('0.1.0');
  });

  it('deve retornar status degraded e database down quando o PostgreSQL estiver inacessível', async () => {
    prismaService.checkDatabase.mockResolvedValueOnce('down');

    const result = await service.getHealth();
    const parsed = HealthResponseSchema.parse(result);

    expect(parsed.status).toBe('degraded');
    expect(parsed.database).toBe('down');
    expect(parsed.service).toBe('@fono/api');
  });
});
