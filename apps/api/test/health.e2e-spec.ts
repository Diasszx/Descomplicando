import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HealthResponseSchema } from '@fono/shared';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health (GET) retorna 200 e payload compatível com HealthResponseSchema', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    const parsed = HealthResponseSchema.parse(response.body);
    expect(parsed.status).toBe('ok');
    expect(parsed.service).toBe('@fono/api');
  });
});
