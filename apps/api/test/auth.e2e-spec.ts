import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { Secret, TOTP } from 'otpauth';
import {
  AdminResetMfaResponseSchema,
  AuthSessionResponseSchema,
  MfaSetupResponseSchema,
} from '@fono/shared';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  FirebaseAdminService,
  type FirebaseUserRecordInfo,
  type VerifiedFirebaseToken,
} from '../src/auth/firebase-admin.service';
import { FirebaseAuthGuard } from '../src/auth/guards/firebase-auth.guard';
import { SessionReadyGuard } from '../src/auth/guards/session-ready.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { Roles } from '../src/auth/decorators/roles.decorator';
import { CurrentUser, type CurrentAuthUser } from '../src/auth/decorators/current-user.decorator';

@Controller('test-protected')
@UseGuards(FirebaseAuthGuard, SessionReadyGuard, RolesGuard)
class TestProtectedController {
  @Get('admin-only')
  @Roles('ADMIN')
  getAdminResource(@CurrentUser() user: CurrentAuthUser) {
    return { ok: true, userId: user.id, role: user.role };
  }

  @Get('profissional-only')
  @Roles('PROFISSIONAL')
  getProfissionalResource(@CurrentUser() user: CurrentAuthUser) {
    return { ok: true, userId: user.id, role: user.role };
  }
}

interface StoredUser {
  id: string;
  firebaseUid: string | null;
  name: string;
  email: string;
  emailVerified: boolean;
  role: 'ADMIN' | 'PROFISSIONAL' | 'PACIENTE' | 'AUTONOMO';
  status: 'ACTIVE' | 'INACTIVE';
  mustChangePassword: boolean;
  passwordChangedAt: Date | null;
  mfaEnabled: boolean;
  mfaSecretEncrypted: string | null;
  mfaPendingSecretEncrypted: string | null;
  mfaEnrolledAt: Date | null;
  mfaLastUsedStep: number | null;
  lastLoginAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface StoredMfaSession {
  id: string;
  userId: string;
  firebaseAuthTime: number;
  verifiedAt: Date;
  revokedAt: Date | null;
}

function createInMemoryPrismaMock() {
  const users: StoredUser[] = [];
  const mfaSessions: StoredMfaSession[] = [];
  let idCounter = 1;

  const nextUuid = () => {
    const suffix = String(idCounter++).padStart(12, '0');
    return `550e8400-e29b-41d4-a716-${suffix}`;
  };

  const api = {
    _users: users,
    _mfaSessions: mfaSessions,
    _reset() {
      users.length = 0;
      mfaSessions.length = 0;
      idCounter = 1;
    },
    user: {
      findUnique: jest.fn(async ({ where }: { where: { id?: string; firebaseUid?: string; email?: string } }) => {
        if (where.id) return users.find((u) => u.id === where.id) ?? null;
        if (where.firebaseUid) return users.find((u) => u.firebaseUid === where.firebaseUid) ?? null;
        if (where.email) return users.find((u) => u.email === where.email) ?? null;
        return null;
      }),
      create: jest.fn(async ({ data }: { data: Partial<StoredUser> }) => {
        const now = new Date();
        const record: StoredUser = {
          id: data.id ?? nextUuid(),
          firebaseUid: data.firebaseUid ?? null,
          name: data.name ?? 'Usuário FonoGames',
          email: data.email ?? 'user@exemplo.com',
          emailVerified: data.emailVerified ?? false,
          role: data.role ?? 'AUTONOMO',
          status: data.status ?? 'ACTIVE',
          mustChangePassword: data.mustChangePassword ?? false,
          passwordChangedAt: data.passwordChangedAt ?? null,
          mfaEnabled: data.mfaEnabled ?? false,
          mfaSecretEncrypted: data.mfaSecretEncrypted ?? null,
          mfaPendingSecretEncrypted: data.mfaPendingSecretEncrypted ?? null,
          mfaEnrolledAt: data.mfaEnrolledAt ?? null,
          mfaLastUsedStep: data.mfaLastUsedStep ?? null,
          lastLoginAt: data.lastLoginAt ?? null,
          deletedAt: data.deletedAt ?? null,
          createdAt: data.createdAt ?? now,
          updatedAt: now,
        };
        users.push(record);
        return record;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<StoredUser> }) => {
        const target = users.find((u) => u.id === where.id);
        if (!target) {
          throw new Error('User not found');
        }
        Object.assign(target, data, { updatedAt: new Date() });
        return { ...target };
      }),
      updateMany: jest.fn(
        async ({
          where,
          data,
        }: {
          where: {
            id?: string;
            mfaEnabled?: boolean;
            OR?: Array<{ mfaLastUsedStep?: null | { lt: number } }>;
          };
          data: Partial<StoredUser>;
        }) => {
          let count = 0;
          for (const target of users) {
            if (where.id && target.id !== where.id) continue;
            if (where.mfaEnabled !== undefined && target.mfaEnabled !== where.mfaEnabled) continue;
            if (where.OR) {
              const matchedOr = where.OR.some((clause) => {
                if (clause.mfaLastUsedStep === null) {
                  return target.mfaLastUsedStep === null;
                }
                if (clause.mfaLastUsedStep && typeof clause.mfaLastUsedStep === 'object') {
                  return (
                    target.mfaLastUsedStep !== null &&
                    target.mfaLastUsedStep < clause.mfaLastUsedStep.lt
                  );
                }
                return false;
              });
              if (!matchedOr) continue;
            }
            Object.assign(target, data, { updatedAt: new Date() });
            count += 1;
          }
          return { count };
        },
      ),
    },
    userMfaSession: {
      findFirst: jest.fn(
        async ({
          where,
        }: {
          where: { userId: string; firebaseAuthTime: number; revokedAt: null };
        }) => {
          return (
            mfaSessions.find(
              (s) =>
                s.userId === where.userId &&
                s.firebaseAuthTime === where.firebaseAuthTime &&
                s.revokedAt === null,
            ) ?? null
          );
        },
      ),
      upsert: jest.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { userId_firebaseAuthTime: { userId: string; firebaseAuthTime: number } };
          create: { userId: string; firebaseAuthTime: number; verifiedAt?: Date; revokedAt?: null };
          update: { verifiedAt?: Date; revokedAt?: null };
        }) => {
          const existing = mfaSessions.find(
            (s) =>
              s.userId === where.userId_firebaseAuthTime.userId &&
              s.firebaseAuthTime === where.userId_firebaseAuthTime.firebaseAuthTime,
          );
          if (existing) {
            existing.verifiedAt = update.verifiedAt ?? new Date();
            existing.revokedAt = null;
            return existing;
          }
          const created: StoredMfaSession = {
            id: nextUuid(),
            userId: create.userId,
            firebaseAuthTime: create.firebaseAuthTime,
            verifiedAt: create.verifiedAt ?? new Date(),
            revokedAt: null,
          };
          mfaSessions.push(created);
          return created;
        },
      ),
      updateMany: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { userId: string; revokedAt: null };
          data: { revokedAt: Date };
        }) => {
          let count = 0;
          for (const session of mfaSessions) {
            if (session.userId === where.userId && session.revokedAt === null) {
              session.revokedAt = data.revokedAt;
              count += 1;
            }
          }
          return { count };
        },
      ),
    },
    $transaction: jest.fn(async <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => {
      return callback(api);
    }),
    checkDatabase: jest.fn().mockResolvedValue('up'),
    onModuleDestroy: jest.fn().mockResolvedValue(undefined),
  };

  return api;
}

describe('AuthController (e2e) — US1', () => {
  let app: INestApplication;
  let prismaMock: ReturnType<typeof createInMemoryPrismaMock>;
  const tokenRegistry = new Map<string, VerifiedFirebaseToken>();
  const revokedTokens = new Set<string>();
  const firebaseUsers = new Map<string, FirebaseUserRecordInfo>();

  const firebaseAdminMock = {
    verifyIdToken: jest.fn(async (token: string): Promise<VerifiedFirebaseToken> => {
      if (revokedTokens.has(token)) {
        const { UnauthorizedException } = await import('@nestjs/common');
        throw new UnauthorizedException({
          statusCode: 401,
          code: 'TOKEN_REVOKED',
          message: 'Sua sessão foi encerrada. Faça login novamente.',
        });
      }
      const verified = tokenRegistry.get(token);
      if (!verified) {
        const { UnauthorizedException } = await import('@nestjs/common');
        throw new UnauthorizedException({
          statusCode: 401,
          code: 'INVALID_TOKEN',
          message: 'Sessão inválida ou expirada. Faça login novamente.',
        });
      }
      return verified;
    }),
    getUser: jest.fn(async (uid: string): Promise<FirebaseUserRecordInfo> => {
      return (
        firebaseUsers.get(uid) ?? {
          uid,
          email: 'user@exemplo.com',
          emailVerified: true,
          disabled: false,
          tokensValidAfterTimeMs: null,
        }
      );
    }),
    revokeRefreshTokens: jest.fn(async (_uid: string) => undefined),
  };

  beforeAll(async () => {
    prismaMock = createInMemoryPrismaMock();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestProtectedController],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(FirebaseAdminService)
      .useValue(firebaseAdminMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    prismaMock._reset();
    tokenRegistry.clear();
    revokedTokens.clear();
    firebaseUsers.clear();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve bloquear /auth/me sem Bearer token com 401 INVALID_TOKEN', async () => {
    const res = await request(app.getHttpServer()).get('/auth/me').expect(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('deve bloquear token revogado com 401 TOKEN_REVOKED', async () => {
    revokedTokens.add('revoked-token');
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer revoked-token')
      .expect(401);
    expect(res.body.code).toBe('TOKEN_REVOKED');
  });

  it('POST /auth/sync deve rejeitar injeção de role no body com 400 Bad Request em PT-BR', async () => {
    tokenRegistry.set('tok-auto', {
      uid: 'uid-auto-1',
      email: 'auto@exemplo.com',
      emailVerified: true,
      authTime: 1732180000,
    });

    const res = await request(app.getHttpServer())
      .post('/auth/sync')
      .set('Authorization', 'Bearer tok-auto')
      .send({ name: 'Usuário Teste', role: 'ADMIN' })
      .expect(400);

    expect(res.body.message).toMatch(/inválidos/i);
    expect(JSON.stringify(res.body)).not.toContain('Unrecognized key');
  });

  it('POST /auth/sync + GET /auth/me deve criar AUTONOMO idempotente e bloquear rota ADMIN com 403 FORBIDDEN_ROLE', async () => {
    tokenRegistry.set('tok-auto-2', {
      uid: 'uid-auto-2',
      email: 'autonomo@exemplo.com',
      emailVerified: true,
      authTime: 1732180001,
    });

    const syncRes = await request(app.getHttpServer())
      .post('/auth/sync')
      .set('Authorization', 'Bearer tok-auto-2')
      .send({ name: '  <b>Lucas</b>  ' })
      .expect(200);

    const parsed = AuthSessionResponseSchema.parse(syncRes.body);
    expect(parsed.user.name).toBe('Lucas');
    expect(parsed.user.role).toBe('AUTONOMO');
    expect(parsed.nextStep).toBe('READY');

    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer tok-auto-2')
      .expect(200);
    expect(meRes.body.user.id).toBe(parsed.user.id);

    const forbiddenRes = await request(app.getHttpServer())
      .get('/test-protected/admin-only')
      .set('Authorization', 'Bearer tok-auto-2')
      .expect(403);
    expect(forbiddenRes.body.code).toBe('FORBIDDEN_ROLE');
  });

  it('deve bloquear conta INACTIVE com 403 ACCOUNT_INACTIVE', async () => {
    tokenRegistry.set('tok-inactive', {
      uid: 'uid-inactive',
      email: 'inativo@exemplo.com',
      emailVerified: true,
      authTime: 1732180002,
    });
    await prismaMock.user.create({
      data: {
        firebaseUid: 'uid-inactive',
        name: 'Conta Suspensa',
        email: 'inativo@exemplo.com',
        emailVerified: true,
        role: 'AUTONOMO',
        status: 'INACTIVE',
      },
    });

    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer tok-inactive')
      .expect(403);
    expect(res.body.code).toBe('ACCOUNT_INACTIVE');
  });

  it('POST /auth/password-changed deve exigir evidência de troca de senha no Firebase e liberar PACIENTE após troca', async () => {
    const createdAt = new Date('2026-11-21T10:00:00.000Z');
    tokenRegistry.set('tok-patient', {
      uid: 'uid-patient',
      email: 'paciente@exemplo.com',
      emailVerified: true,
      authTime: 1732180100,
    });
    await prismaMock.user.create({
      data: {
        firebaseUid: 'uid-patient',
        name: 'Paciente Teste',
        email: 'paciente@exemplo.com',
        emailVerified: true,
        role: 'PACIENTE',
        status: 'ACTIVE',
        mustChangePassword: true,
        createdAt,
      },
    });

    firebaseUsers.set('uid-patient', {
      uid: 'uid-patient',
      email: 'paciente@exemplo.com',
      emailVerified: true,
      disabled: false,
      tokensValidAfterTimeMs: createdAt.getTime(),
    });

    const blocked = await request(app.getHttpServer())
      .post('/auth/password-changed')
      .set('Authorization', 'Bearer tok-patient')
      .send({})
      .expect(403);
    expect(blocked.body.code).toBe('PASSWORD_CHANGE_REQUIRED');

    firebaseUsers.set('uid-patient', {
      uid: 'uid-patient',
      email: 'paciente@exemplo.com',
      emailVerified: true,
      disabled: false,
      tokensValidAfterTimeMs: createdAt.getTime() + 60_000,
    });

    const released = await request(app.getHttpServer())
      .post('/auth/password-changed')
      .set('Authorization', 'Bearer tok-patient')
      .send({})
      .expect(200);
    expect(released.body.user.mustChangePassword).toBe(false);
    expect(released.body.nextStep).toBe('READY');
  });

  it('deve aplicar rate limit de 10 req/min retornando 429 TOO_MANY_REQUESTS na 11ª chamada em rota /auth mutável', async () => {
    tokenRegistry.set('tok-rate', {
      uid: 'uid-rate',
      email: 'rate@exemplo.com',
      emailVerified: true,
      authTime: 1732180200,
    });

    // Cria uma instância isolada para o contador do throttler iniciar limpo
    const isolatedModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(FirebaseAdminService)
      .useValue(firebaseAdminMock)
      .compile();

    const isolatedApp = isolatedModule.createNestApplication();
    await isolatedApp.init();

    try {
      for (let i = 0; i < 10; i++) {
        await request(isolatedApp.getHttpServer())
          .post('/auth/sync')
          .set('Authorization', 'Bearer tok-rate')
          .send({})
          .expect(200);
      }

      const throttled = await request(isolatedApp.getHttpServer())
        .post('/auth/sync')
        .set('Authorization', 'Bearer tok-rate')
        .send({})
        .expect(429);

      expect(throttled.body.code).toBe('TOO_MANY_REQUESTS');
    } finally {
      await isolatedApp.close();
    }
  });

  describe('MFA TOTP e Reset Administrativo (US2)', () => {
    it('deve exigir setup TOTP para PROFISSIONAL, bloquear bypass em /mfa/setup após ativação, validar desafio em novo auth_time e permitir reset apenas para ADMIN READY', async () => {
      tokenRegistry.set('tok-pro-1', {
        uid: 'uid-pro-1',
        email: 'dra.ana@fono.com',
        emailVerified: true,
        authTime: 1732181000,
      });

      const proUser = await prismaMock.user.create({
        data: {
          firebaseUid: 'uid-pro-1',
          name: 'Dra. Ana',
          email: 'dra.ana@fono.com',
          emailVerified: true,
          role: 'PROFISSIONAL',
          status: 'ACTIVE',
          mustChangePassword: false,
          mfaEnabled: false,
        },
      });

      // 1. SessionReadyGuard bloqueia antes do setup MFA
      const blockedSetup = await request(app.getHttpServer())
        .get('/test-protected/profissional-only')
        .set('Authorization', 'Bearer tok-pro-1')
        .expect(403);
      expect(blockedSetup.body.code).toBe('MFA_SETUP_REQUIRED');

      // 2. Setup inicial retorna otpauthUri e manualEntryKey
      const setupRes = await request(app.getHttpServer())
        .post('/auth/mfa/setup')
        .set('Authorization', 'Bearer tok-pro-1')
        .send({})
        .expect(200);
      const setupData = MfaSetupResponseSchema.parse(setupRes.body);
      expect(setupData.issuer).toBe('FonoGames');

      // 3. Código inválido é rejeitado com 400 INVALID_TOTP_CODE
      const invalidVerify = await request(app.getHttpServer())
        .post('/auth/mfa/verify')
        .set('Authorization', 'Bearer tok-pro-1')
        .send({ code: '000000' })
        .expect(400);
      expect(invalidVerify.body.code).toBe('INVALID_TOTP_CODE');

      // 4. Gera código TOTP válido para o passo atual e ativa MFA
      const totp = new TOTP({
        issuer: 'FonoGames',
        label: 'dra.ana@fono.com',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: Secret.fromBase32(setupData.manualEntryKey),
      });
      const firstValidCode = totp.generate();

      const verifyRes = await request(app.getHttpServer())
        .post('/auth/mfa/verify')
        .set('Authorization', 'Bearer tok-pro-1')
        .send({ code: firstValidCode })
        .expect(200);
      const verifiedSession = AuthSessionResponseSchema.parse(verifyRes.body);
      expect(verifiedSession.nextStep).toBe('READY');
      expect(verifiedSession.user.mfaEnabled).toBe(true);
      expect(verifiedSession.mfaVerifiedForCurrentLogin).toBe(true);

      // 5. Agora rota protegida de PROFISSIONAL libera acesso 200
      await request(app.getHttpServer())
        .get('/test-protected/profissional-only')
        .set('Authorization', 'Bearer tok-pro-1')
        .expect(200);

      // 6. Bloqueio de bypass: chamar /mfa/setup com MFA já ativo retorna 403 MFA_VERIFICATION_REQUIRED
      const bypassAttempt = await request(app.getHttpServer())
        .post('/auth/mfa/setup')
        .set('Authorization', 'Bearer tok-pro-1')
        .send({})
        .expect(403);
      expect(bypassAttempt.body.code).toBe('MFA_VERIFICATION_REQUIRED');

      // 7. Novo login (novo auth_time) exige desafio MFA novamente
      tokenRegistry.set('tok-pro-2', {
        uid: 'uid-pro-1',
        email: 'dra.ana@fono.com',
        emailVerified: true,
        authTime: 1732182000,
      });

      const blockedVerify = await request(app.getHttpServer())
        .get('/test-protected/profissional-only')
        .set('Authorization', 'Bearer tok-pro-2')
        .expect(403);
      expect(blockedVerify.body.code).toBe('MFA_VERIFICATION_REQUIRED');

      // Reuso do mesmo código (anti-replay) falha
      const replayAttempt = await request(app.getHttpServer())
        .post('/auth/mfa/verify')
        .set('Authorization', 'Bearer tok-pro-2')
        .send({ code: firstValidCode })
        .expect(400);
      expect(replayAttempt.body.code).toBe('INVALID_TOTP_CODE');

      // 8. PROFISSIONAL não pode chamar reset administrativo (403 FORBIDDEN_ROLE)
      const forbiddenReset = await request(app.getHttpServer())
        .post(`/auth/admin/users/${proUser.id}/mfa/reset`)
        .set('Authorization', 'Bearer tok-pro-1')
        .send({})
        .expect(403);
      expect(forbiddenReset.body.code).toBe('FORBIDDEN_ROLE');

      // 9. ADMIN com sessão READY consegue resetar MFA do profissional
      tokenRegistry.set('tok-admin', {
        uid: 'uid-admin-1',
        email: 'admin@fono.com',
        emailVerified: true,
        authTime: 1732183000,
      });
      const adminUser = await prismaMock.user.create({
        data: {
          firebaseUid: 'uid-admin-1',
          name: 'Gestor Admin',
          email: 'admin@fono.com',
          emailVerified: true,
          role: 'ADMIN',
          status: 'ACTIVE',
          mfaEnabled: true,
        },
      });
      await prismaMock.userMfaSession.upsert({
        where: {
          userId_firebaseAuthTime: { userId: adminUser.id, firebaseAuthTime: 1732183000 },
        },
        create: { userId: adminUser.id, firebaseAuthTime: 1732183000 },
        update: { revokedAt: null },
      });

      const resetRes = await request(app.getHttpServer())
        .post(`/auth/admin/users/${proUser.id}/mfa/reset`)
        .set('Authorization', 'Bearer tok-admin')
        .send({})
        .expect(200);
      const resetData = AdminResetMfaResponseSchema.parse(resetRes.body);
      expect(resetData.userId).toBe(proUser.id);
      expect(resetData.mfaEnabled).toBe(false);
      expect(firebaseAdminMock.revokeRefreshTokens).toHaveBeenCalledWith('uid-pro-1');

      // 10. UUID inválido retorna 400 em PT-BR e usuário inexistente retorna 404
      const invalidUuidRes = await request(app.getHttpServer())
        .post('/auth/admin/users/nao-e-uuid/mfa/reset')
        .set('Authorization', 'Bearer tok-admin')
        .send({})
        .expect(400);
      expect(invalidUuidRes.body.message).toMatch(/inválido/i);

      await request(app.getHttpServer())
        .post('/auth/admin/users/550e8400-e29b-41d4-a716-999999999999/mfa/reset')
        .set('Authorization', 'Bearer tok-admin')
        .send({})
        .expect(404);
    });
  });

  describe('Logout e Revogação no Servidor (US4)', () => {
    it('POST /auth/logout deve retornar 204, revogar UserMfaSession ativas, invocar revokeRefreshTokens e rejeitar token subsequente com 401 TOKEN_REVOKED', async () => {
      tokenRegistry.set('tok-logout-1', {
        uid: 'uid-logout-1',
        email: 'logout@fono.com',
        emailVerified: true,
        authTime: 1732185000,
      });

      const user = await prismaMock.user.create({
        data: {
          firebaseUid: 'uid-logout-1',
          name: 'Dra. Beatriz',
          email: 'logout@fono.com',
          emailVerified: true,
          role: 'PROFISSIONAL',
          status: 'ACTIVE',
          mfaEnabled: true,
        },
      });

      await prismaMock.userMfaSession.upsert({
        where: {
          userId_firebaseAuthTime: { userId: user.id, firebaseAuthTime: 1732185000 },
        },
        create: { userId: user.id, firebaseAuthTime: 1732185000 },
        update: { revokedAt: null },
      });

      firebaseAdminMock.revokeRefreshTokens.mockImplementationOnce(async () => {
        revokedTokens.add('tok-logout-1');
      });

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer tok-logout-1')
        .send({})
        .expect(204);

      expect(firebaseAdminMock.revokeRefreshTokens).toHaveBeenCalledWith('uid-logout-1');
      const activeSessionAfterLogout = await prismaMock.userMfaSession.findFirst({
        where: { userId: user.id, firebaseAuthTime: 1732185000, revokedAt: null },
      });
      expect(activeSessionAfterLogout).toBeNull();

      const afterRevoke = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer tok-logout-1')
        .expect(401);
      expect(afterRevoke.body.code).toBe('TOKEN_REVOKED');
    });
  });
});
