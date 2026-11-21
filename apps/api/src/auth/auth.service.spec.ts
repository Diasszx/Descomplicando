import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { FirebaseAdminService, VerifiedFirebaseToken } from './firebase-admin.service';
import type { TotpService } from './totp.service';
import type { CurrentAuthUser } from './decorators/current-user.decorator';

interface MockUserRecord {
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

function createBaseUser(overrides: Partial<MockUserRecord> = {}): MockUserRecord {
  const now = new Date('2026-11-21T10:00:00.000Z');
  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    firebaseUid: 'fb-uid-1',
    name: 'Maria Silva',
    email: 'maria@exemplo.com',
    emailVerified: true,
    role: 'AUTONOMO',
    status: 'ACTIVE',
    mustChangePassword: false,
    passwordChangedAt: null,
    mfaEnabled: false,
    mfaSecretEncrypted: null,
    mfaPendingSecretEncrypted: null,
    mfaEnrolledAt: null,
    mfaLastUsedStep: null,
    lastLoginAt: now,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('AuthService (US1)', () => {
  let service: AuthService;
  let prismaMock: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    userMfaSession: {
      findFirst: jest.Mock;
      upsert: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let firebaseAdminMock: {
    verifyIdToken: jest.Mock;
    getUser: jest.Mock;
    revokeRefreshTokens: jest.Mock;
  };
  let totpServiceMock: {
    generateEnrollment: jest.Mock;
    verifyCode: jest.Mock;
    encryptSecret: jest.Mock;
    decryptSecret: jest.Mock;
  };

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      userMfaSession: {
        findFirst: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    firebaseAdminMock = {
      verifyIdToken: jest.fn(),
      getUser: jest.fn(),
      revokeRefreshTokens: jest.fn(),
    };

    totpServiceMock = {
      generateEnrollment: jest.fn(),
      verifyCode: jest.fn(),
      encryptSecret: jest.fn(),
      decryptSecret: jest.fn(),
    };

    service = new AuthService(
      prismaMock as unknown as PrismaService,
      firebaseAdminMock as unknown as FirebaseAdminService,
      totpServiceMock as unknown as TotpService,
    );
  });

  describe('syncUser', () => {
    const token: VerifiedFirebaseToken = {
      uid: 'fb-uid-1',
      email: 'maria@exemplo.com',
      emailVerified: true,
      authTime: 1732180000,
      name: 'Maria Silva',
    };

    it('deve criar conta AUTONOMO no primeiro sync sem registro prévio', async () => {
      const created = createBaseUser({ emailVerified: false });
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null) // por firebaseUid
        .mockResolvedValueOnce(null); // por email
      prismaMock.user.create.mockResolvedValueOnce(created);

      const result = await service.syncUser(
        { ...token, emailVerified: false },
        { name: 'Maria Silva' },
      );

      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firebaseUid: 'fb-uid-1',
            email: 'maria@exemplo.com',
            role: 'AUTONOMO',
            status: 'ACTIVE',
            mustChangePassword: false,
            emailVerified: false,
          }),
        }),
      );
      expect(result.user.role).toBe('AUTONOMO');
      expect(result.nextStep).toBe('VERIFY_EMAIL');
    });

    it('deve ser idempotente em logins recorrentes atualizando emailVerified e lastLoginAt', async () => {
      const existing = createBaseUser({ emailVerified: false });
      const updated = createBaseUser({ emailVerified: true });
      prismaMock.user.findUnique.mockResolvedValueOnce(existing);
      prismaMock.user.update.mockResolvedValueOnce(updated);

      const result = await service.syncUser(token, {});

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: existing.id },
          data: expect.objectContaining({ emailVerified: true }),
        }),
      );
      expect(result.nextStep).toBe('READY');
      expect(result.user.emailVerified).toBe(true);
    });

    it('deve bloquear conta inativa ou soft-deleted com 403 ACCOUNT_INACTIVE', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(
        createBaseUser({ status: 'INACTIVE', deletedAt: new Date() }),
      );

      await expect(service.syncUser(token, {})).rejects.toThrow(ForbiddenException);
    });

    it('deve rejeitar com 409 EMAIL_ALREADY_REGISTERED quando e-mail já pertence a outro firebaseUid', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createBaseUser({ firebaseUid: 'outro-firebase-uid' }));

      await expect(service.syncUser(token, {})).rejects.toThrow(ConflictException);
    });

    it('deve prevenir pre-account takeover recusando vínculo de pré-cadastro quando email_verified é false', async () => {
      const preRegistered = createBaseUser({
        firebaseUid: null,
        role: 'PROFISSIONAL',
        emailVerified: false,
      });
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(preRegistered);

      await expect(
        service.syncUser({ ...token, emailVerified: false }, {}),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('deve vincular pré-cadastro PACIENTE com email_verified true preservando role e mustChangePassword', async () => {
      const preRegisteredPatient = createBaseUser({
        firebaseUid: null,
        role: 'PACIENTE',
        mustChangePassword: true,
        emailVerified: false,
      });
      const linkedPatient = createBaseUser({
        firebaseUid: 'fb-uid-1',
        role: 'PACIENTE',
        mustChangePassword: true,
        emailVerified: true,
      });
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(preRegisteredPatient);
      prismaMock.user.update.mockResolvedValueOnce(linkedPatient);

      const result = await service.syncUser(token, {});

      expect(result.user.role).toBe('PACIENTE');
      expect(result.user.mustChangePassword).toBe(true);
      expect(result.nextStep).toBe('CHANGE_PASSWORD');
    });

    it('deve calcular nextStep MFA_SETUP para PROFISSIONAL/ADMIN sem MFA e MFA_VERIFY quando MFA ativo sem sessão', async () => {
      const proWithoutMfa = createBaseUser({
        role: 'PROFISSIONAL',
        mfaEnabled: false,
      });
      prismaMock.user.findUnique.mockResolvedValueOnce(proWithoutMfa);
      prismaMock.user.update.mockResolvedValueOnce(proWithoutMfa);

      const resSetup = await service.syncUser(token, {});
      expect(resSetup.nextStep).toBe('MFA_SETUP');
      expect(resSetup.user.mfaRequired).toBe(true);

      const adminWithMfa = createBaseUser({
        role: 'ADMIN',
        mfaEnabled: true,
      });
      prismaMock.user.findUnique.mockResolvedValueOnce(adminWithMfa);
      prismaMock.user.update.mockResolvedValueOnce(adminWithMfa);
      prismaMock.userMfaSession.findFirst.mockResolvedValueOnce(null);

      const resVerify = await service.syncUser(token, {});
      expect(resVerify.nextStep).toBe('MFA_VERIFY');
      expect(resVerify.mfaVerifiedForCurrentLogin).toBe(false);
    });
  });

  describe('confirmPasswordChanged', () => {
    const authUser: CurrentAuthUser = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      firebaseUid: 'fb-uid-1',
      name: 'Paciente Um',
      email: 'paciente@exemplo.com',
      emailVerified: true,
      role: 'PACIENTE',
      status: 'ACTIVE',
      mustChangePassword: true,
      mfaRequired: false,
      mfaEnabled: false,
      mfaVerifiedForCurrentLogin: false,
      firebaseAuthTime: 1732180000,
      nextStep: 'CHANGE_PASSWORD',
      lastLoginAt: new Date('2026-11-21T10:00:00.000Z'),
    };

    it('deve rejeitar com 403 PASSWORD_CHANGE_REQUIRED quando tokensValidAfterTime não evidencia alteração no Firebase', async () => {
      const patient = createBaseUser({
        role: 'PACIENTE',
        mustChangePassword: true,
        createdAt: new Date('2026-11-21T10:00:00.000Z'),
      });
      prismaMock.user.findUnique.mockResolvedValueOnce(patient);
      firebaseAdminMock.getUser.mockResolvedValueOnce({
        uid: 'fb-uid-1',
        email: 'paciente@exemplo.com',
        emailVerified: true,
        disabled: false,
        tokensValidAfterTimeMs: new Date('2026-11-21T10:00:00.000Z').getTime(),
      });

      await expect(service.confirmPasswordChanged(authUser)).rejects.toThrow(ForbiddenException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('deve concluir troca de senha e liberar nextStep READY quando tokensValidAfterTime é estritamente posterior', async () => {
      const patient = createBaseUser({
        role: 'PACIENTE',
        mustChangePassword: true,
        createdAt: new Date('2026-11-21T10:00:00.000Z'),
      });
      const updatedPatient = createBaseUser({
        role: 'PACIENTE',
        mustChangePassword: false,
        passwordChangedAt: new Date('2026-11-21T10:05:00.000Z'),
      });

      prismaMock.user.findUnique.mockResolvedValueOnce(patient);
      firebaseAdminMock.getUser.mockResolvedValueOnce({
        uid: 'fb-uid-1',
        email: 'paciente@exemplo.com',
        emailVerified: true,
        disabled: false,
        tokensValidAfterTimeMs: new Date('2026-11-21T10:04:55.000Z').getTime(),
      });
      prismaMock.user.update.mockResolvedValueOnce(updatedPatient);

      const result = await service.confirmPasswordChanged(authUser);

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: patient.id },
          data: expect.objectContaining({
            mustChangePassword: false,
          }),
        }),
      );
      expect(result.user.mustChangePassword).toBe(false);
      expect(result.nextStep).toBe('READY');
    });

    it('deve bloquear bypass de pré-cadastro quando tokensValidAfterTime é anterior ao authTime do login', async () => {
      // Simula PostgreSQL criado às 10:00:00, Firebase criado às 10:00:02 (tokensValidAfterTime = 10:00:02),
      // e paciente logando com senha temporária às 10:05:00 sem trocar a senha.
      const patient = createBaseUser({
        role: 'PACIENTE',
        mustChangePassword: true,
        createdAt: new Date('2026-11-21T10:00:00.000Z'),
      });
      const loginAt1005: CurrentAuthUser = {
        ...authUser,
        firebaseAuthTime: Math.floor(new Date('2026-11-21T10:05:00.000Z').getTime() / 1000),
      };

      prismaMock.user.findUnique.mockResolvedValueOnce(patient);
      firebaseAdminMock.getUser.mockResolvedValueOnce({
        uid: 'fb-uid-1',
        email: 'paciente@exemplo.com',
        emailVerified: true,
        disabled: false,
        tokensValidAfterTimeMs: new Date('2026-11-21T10:00:02.000Z').getTime(),
      });

      await expect(service.confirmPasswordChanged(loginAt1005)).rejects.toThrow(ForbiddenException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('deve ser idempotente quando mustChangePassword já for false', async () => {
      const alreadyChanged = createBaseUser({
        role: 'PACIENTE',
        mustChangePassword: false,
        passwordChangedAt: new Date('2026-11-21T10:05:00.000Z'),
      });
      prismaMock.user.findUnique.mockResolvedValueOnce(alreadyChanged);

      const result = await service.confirmPasswordChanged(authUser);

      expect(firebaseAdminMock.getUser).not.toHaveBeenCalled();
      expect(prismaMock.user.update).not.toHaveBeenCalled();
      expect(result.nextStep).toBe('READY');
    });
  });

  describe('concorrência em syncUser e anti-replay atômico em verifyMfa', () => {
    it('deve recuperar de corrida simultânea P2002 em syncUser retornando a sessão criada', async () => {
      const token: VerifiedFirebaseToken = {
        uid: 'fb-uid-race',
        email: 'race@exemplo.com',
        emailVerified: true,
        authTime: 1732180000,
      };
      const createdByConcurrentRequest = createBaseUser({
        firebaseUid: 'fb-uid-race',
        email: 'race@exemplo.com',
      });

      prismaMock.user.findUnique
        .mockResolvedValueOnce(null) // 1a busca por uid
        .mockResolvedValueOnce(null) // busca por email
        .mockResolvedValueOnce(createdByConcurrentRequest); // recuperação pós P2002 por uid
      prismaMock.user.create.mockRejectedValueOnce({ code: 'P2002' });

      const result = await service.syncUser(token, { name: 'Corrida Teste' });
      expect(result.user.email).toBe('race@exemplo.com');
      expect(result.nextStep).toBe('READY');
    });

    it('deve bloquear corrida anti-replay TOCTOU em verifyMfa quando updateMany retorna count 0', async () => {
      const mfaUser = createBaseUser({
        role: 'PROFISSIONAL',
        mfaEnabled: true,
        mfaSecretEncrypted: 'iv:tag:cipher',
        mfaLastUsedStep: 100,
      });
      const authUser: CurrentAuthUser = {
        id: mfaUser.id,
        firebaseUid: 'fb-uid-1',
        name: mfaUser.name,
        email: mfaUser.email,
        emailVerified: true,
        role: 'PROFISSIONAL',
        status: 'ACTIVE',
        mustChangePassword: false,
        mfaRequired: true,
        mfaEnabled: true,
        mfaVerifiedForCurrentLogin: false,
        firebaseAuthTime: 1732180000,
        nextStep: 'MFA_VERIFY',
        lastLoginAt: new Date(),
      };

      prismaMock.user.findUnique.mockResolvedValueOnce(mfaUser);
      totpServiceMock.decryptSecret.mockReturnValueOnce('JBSWY3DPEHPK3PXP');
      totpServiceMock.verifyCode.mockReturnValueOnce({ valid: true, matchedStep: 101 });
      prismaMock.user.updateMany.mockResolvedValueOnce({ count: 0 });
      prismaMock.$transaction.mockImplementationOnce(
        async (cb: (tx: typeof prismaMock) => Promise<unknown>) => cb(prismaMock),
      );

      await expect(service.verifyMfa(authUser, { code: '123456' })).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.userMfaSession.upsert).not.toHaveBeenCalled();
    });
  });
});
