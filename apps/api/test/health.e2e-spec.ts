import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HealthResponseSchema } from '@fono/shared';

describe('HealthController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableCors({
      origin: (origin, callback) => {
        const allowed = ['https://fono-web.onrender.com', 'http://localhost:5173'];
        if (!origin || allowed.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
    });
    await app.init();
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health (GET) retorna 200 e payload compatível com HealthResponseSchema quando banco está up', async () => {
    jest.spyOn(prismaService, 'checkDatabase').mockResolvedValueOnce('up');

    const response = await request(app.getHttpServer()).get('/health').expect(200);

    const parsed = HealthResponseSchema.parse(response.body);
    expect(parsed.status).toBe('ok');
    expect(parsed.database).toBe('up');
    expect(parsed.service).toBe('@fono/api');
  });

  it('/health (GET) retorna 503 Service Unavailable quando o banco está down', async () => {
    jest.spyOn(prismaService, 'checkDatabase').mockResolvedValueOnce('down');

    const response = await request(app.getHttpServer()).get('/health').expect(503);

    const parsed = HealthResponseSchema.parse(response.body);
    expect(parsed.status).toBe('degraded');
    expect(parsed.database).toBe('down');
  });

  it('permite CORS de origem autorizada e bloqueia origem desconhecida', async () => {
    jest.spyOn(prismaService, 'checkDatabase').mockResolvedValue('up');

    const allowedRes = await request(app.getHttpServer())
      .options('/health')
      .set('Origin', 'https://fono-web.onrender.com')
      .set('Access-Control-Request-Method', 'GET');

    expect(allowedRes.headers['access-control-allow-origin']).toBe('https://fono-web.onrender.com');

    const blockedRes = await request(app.getHttpServer())
      .options('/health')
      .set('Origin', 'https://malicious.example.com')
      .set('Access-Control-Request-Method', 'GET');

    expect(blockedRes.headers['access-control-allow-origin']).toBeUndefined();
  });
});
