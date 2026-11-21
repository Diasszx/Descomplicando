import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SanitizedNameSchema,
  type AdminResetMfaResponse,
  type AuthSessionResponse,
  type MfaSetupResponse,
  type SyncAuthRequest,
  type TotpCodeInput,
} from '@fono/shared';
import { PrismaService } from '../prisma/prisma.service';
import { StructuredLoggerService } from '../common/logger/structured-logger.service';
import { FirebaseAdminService, type VerifiedFirebaseToken } from './firebase-admin.service';
import { TotpService } from './totp.service';
import { buildAuthSessionResponse } from './auth-state.helper';
import type { CurrentAuthUser } from './decorators/current-user.decorator';

function deriveFallbackDisplayName(tokenName: string | undefined, email: string): string {
  const candidates = [tokenName, email.split('@')[0]?.replace(/[._-]+/g, ' ')];
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    const parsed = SanitizedNameSchema.safeParse(candidate);
    if (parsed.success) {
      return parsed.data;
    }
  }
  return 'Usuário FonoGames';
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

@Injectable()
export class AuthService {
  private readonly logger = new StructuredLoggerService();

  constructor(
    private readonly prismaService: PrismaService,
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly totpService: TotpService,
  ) {}

  private async hasActiveMfaSession(userId: string, firebaseAuthTime: number): Promise<boolean> {
    const session = await this.prismaService.userMfaSession.findFirst({
      where: {
        userId,
        firebaseAuthTime,
        revokedAt: null,
      },
      select: { id: true },
    });
    return Boolean(session);
  }

  async syncUser(
    verifiedToken: VerifiedFirebaseToken,
    payload: SyncAuthRequest,
  ): Promise<AuthSessionResponse> {
    const normalizedEmail = verifiedToken.email.trim().toLowerCase();
    const now = new Date();

    // 1. Busca por firebaseUid (fluxo idempotente para logins recorrentes)
    const existingByUid = await this.prismaService.user.findUnique({
      where: { firebaseUid: verifiedToken.uid },
    });

    if (existingByUid) {
      if (existingByUid.status === 'INACTIVE' || existingByUid.deletedAt !== null) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'ACCOUNT_INACTIVE',
          message: 'Esta conta está inativa ou foi desativada. Entre em contato com o suporte.',
        });
      }

      const nextEmailVerified = existingByUid.emailVerified || verifiedToken.emailVerified;
      const updated = await this.prismaService.user.update({
        where: { id: existingByUid.id },
        data: {
          emailVerified: nextEmailVerified,
          lastLoginAt: now,
        },
      });

      const mfaVerified = updated.mfaEnabled
        ? await this.hasActiveMfaSession(updated.id, verifiedToken.authTime)
        : false;

      return buildAuthSessionResponse(updated, mfaVerified);
    }

    // 2. Busca por e-mail normalizado quando firebaseUid ainda não está vinculado
    const existingByEmail = await this.prismaService.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingByEmail) {
      if (existingByEmail.firebaseUid !== null && existingByEmail.firebaseUid !== verifiedToken.uid) {
        throw new ConflictException({
          statusCode: 409,
          code: 'EMAIL_ALREADY_REGISTERED',
          message: 'Este e-mail já está cadastrado na plataforma.',
        });
      }

      if (existingByEmail.status === 'INACTIVE' || existingByEmail.deletedAt !== null) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'ACCOUNT_INACTIVE',
          message: 'Esta conta está inativa ou foi desativada. Entre em contato com o suporte.',
        });
      }

      // Prevenção de pre-account takeover: exige email_verified === true antes de vincular pré-cadastro
      if (!verifiedToken.emailVerified) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Confirme seu endereço de e-mail antes de acessar o sistema.',
        });
      }

      const linkedUser = await this.prismaService.user.update({
        where: { id: existingByEmail.id },
        data: {
          firebaseUid: verifiedToken.uid,
          emailVerified: true,
          lastLoginAt: now,
        },
      });

      this.logger.log(
        {
          event: 'auth_preregistered_user_linked',
          userId: linkedUser.id,
          role: linkedUser.role,
        },
        'AuthService',
      );

      const mfaVerified = linkedUser.mfaEnabled
        ? await this.hasActiveMfaSession(linkedUser.id, verifiedToken.authTime)
        : false;

      return buildAuthSessionResponse(linkedUser, mfaVerified);
    }

    // 3. Auto-cadastro autônomo (role atribuído exclusivamente pelo servidor — FR-004)
    const displayName = payload.name ?? deriveFallbackDisplayName(verifiedToken.name, normalizedEmail);
    try {
      const createdUser = await this.prismaService.user.create({
        data: {
          firebaseUid: verifiedToken.uid,
          name: displayName,
          email: normalizedEmail,
          emailVerified: verifiedToken.emailVerified,
          role: 'AUTONOMO',
          status: 'ACTIVE',
          mustChangePassword: false,
          lastLoginAt: now,
        },
      });

      this.logger.log(
        {
          event: 'auth_autonomous_user_created',
          userId: createdUser.id,
          role: createdUser.role,
        },
        'AuthService',
      );

      return buildAuthSessionResponse(createdUser, false);
    } catch (error) {
      // Recuperação idempotente em caso de corrida simultânea (P2002 unique constraint)
      if (!isPrismaUniqueConstraintError(error)) {
        throw error;
      }

      const concurrentByUid = await this.prismaService.user.findUnique({
        where: { firebaseUid: verifiedToken.uid },
      });
      if (concurrentByUid) {
        if (concurrentByUid.status === 'INACTIVE' || concurrentByUid.deletedAt !== null) {
          throw new ForbiddenException({
            statusCode: 403,
            code: 'ACCOUNT_INACTIVE',
            message: 'Esta conta está inativa ou foi desativada. Entre em contato com o suporte.',
          });
        }
        const mfaVerified = concurrentByUid.mfaEnabled
          ? await this.hasActiveMfaSession(concurrentByUid.id, verifiedToken.authTime)
          : false;
        return buildAuthSessionResponse(concurrentByUid, mfaVerified);
      }

      const concurrentByEmail = await this.prismaService.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (
        concurrentByEmail &&
        concurrentByEmail.firebaseUid !== null &&
        concurrentByEmail.firebaseUid !== verifiedToken.uid
      ) {
        throw new ConflictException({
          statusCode: 409,
          code: 'EMAIL_ALREADY_REGISTERED',
          message: 'Este e-mail já está cadastrado na plataforma.',
        });
      }

      throw error;
    }
  }

  async getSession(authUser: CurrentAuthUser): Promise<AuthSessionResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { id: authUser.id },
    });

    if (!user || user.status === 'INACTIVE' || user.deletedAt !== null) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'ACCOUNT_INACTIVE',
        message: 'Esta conta está inativa ou foi desativada. Entre em contato com o suporte.',
      });
    }

    const mfaVerified = user.mfaEnabled
      ? await this.hasActiveMfaSession(user.id, authUser.firebaseAuthTime)
      : false;

    return buildAuthSessionResponse(user, mfaVerified);
  }

  async confirmPasswordChanged(authUser: CurrentAuthUser): Promise<AuthSessionResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { id: authUser.id },
    });

    if (!user || user.status === 'INACTIVE' || user.deletedAt !== null) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'ACCOUNT_INACTIVE',
        message: 'Esta conta está inativa ou foi desativada. Entre em contato com o suporte.',
      });
    }

    if (!user.emailVerified) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Confirme seu endereço de e-mail antes de acessar o sistema.',
      });
    }

    // Idempotente caso a troca obrigatória já tenha sido concluída em requisição anterior
    if (!user.mustChangePassword) {
      const mfaVerified = user.mfaEnabled
        ? await this.hasActiveMfaSession(user.id, authUser.firebaseAuthTime)
        : false;
      return buildAuthSessionResponse(user, mfaVerified);
    }

    // Verificação server-side obrigatória via Firebase Admin SDK (FR-007)
    // Normaliza referência para precisão de segundos (compatível com tokensValidAfterTime RFC 2822)
    // e exige tokensValidAfterTime >= auth_time para impedir bypass em pré-cadastros criados após a linha SQL
    const firebaseRecord = await this.firebaseAdminService.getUser(authUser.firebaseUid);
    const referenceSecondsMs =
      Math.floor((user.passwordChangedAt ?? user.createdAt).getTime() / 1000) * 1000;
    const authTimeMs = authUser.firebaseAuthTime * 1000;

    if (
      firebaseRecord.tokensValidAfterTimeMs === null ||
      firebaseRecord.tokensValidAfterTimeMs <= referenceSecondsMs ||
      firebaseRecord.tokensValidAfterTimeMs < authTimeMs
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'É necessário definir uma nova senha pessoal antes de continuar.',
      });
    }

    const updatedUser = await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });

    this.logger.log(
      {
        event: 'auth_forced_password_changed',
        userId: updatedUser.id,
      },
      'AuthService',
    );

    const mfaVerified = updatedUser.mfaEnabled
      ? await this.hasActiveMfaSession(updatedUser.id, authUser.firebaseAuthTime)
      : false;

    return buildAuthSessionResponse(updatedUser, mfaVerified);
  }

  async setupMfa(authUser: CurrentAuthUser): Promise<MfaSetupResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { id: authUser.id },
    });

    if (!user || user.status === 'INACTIVE' || user.deletedAt !== null) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'ACCOUNT_INACTIVE',
        message: 'Esta conta está inativa ou foi desativada. Entre em contato com o suporte.',
      });
    }

    if (!user.emailVerified) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Confirme seu endereço de e-mail antes de acessar o sistema.',
      });
    }

    if (user.mustChangePassword) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'É necessário definir uma nova senha pessoal antes de continuar.',
      });
    }

    // Impede sobrescrita ou bypass quando MFA já está ativo (R-02)
    if (user.mfaEnabled) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'MFA_VERIFICATION_REQUIRED',
        message: 'Informe o código do aplicativo autenticador para concluir o acesso.',
      });
    }

    const enrollment = this.totpService.generateEnrollment(user.email);
    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        mfaPendingSecretEncrypted: enrollment.encryptedSecret,
      },
    });

    this.logger.log(
      {
        event: 'auth_mfa_setup_initiated',
        userId: user.id,
      },
      'AuthService',
    );

    return {
      otpauthUri: enrollment.otpauthUri,
      manualEntryKey: enrollment.manualEntryKey,
      issuer: enrollment.issuer,
      accountName: enrollment.accountName,
    };
  }

  async verifyMfa(
    authUser: CurrentAuthUser,
    input: TotpCodeInput,
  ): Promise<AuthSessionResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { id: authUser.id },
    });

    if (!user || user.status === 'INACTIVE' || user.deletedAt !== null) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'ACCOUNT_INACTIVE',
        message: 'Esta conta está inativa ou foi desativada. Entre em contato com o suporte.',
      });
    }

    if (!user.emailVerified) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Confirme seu endereço de e-mail antes de acessar o sistema.',
      });
    }

    if (user.mustChangePassword) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'É necessário definir uma nova senha pessoal antes de continuar.',
      });
    }

    // Seleção mutuamente exclusiva do segredo TOTP (pendente somente na ativação inicial)
    const encryptedSecret = user.mfaEnabled
      ? user.mfaSecretEncrypted
      : user.mfaPendingSecretEncrypted;

    if (!encryptedSecret) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'MFA_SETUP_REQUIRED',
        message: 'Configure a autenticação em duas etapas (TOTP) para continuar.',
      });
    }

    const plainBase32Secret = this.totpService.decryptSecret(encryptedSecret);
    const verification = this.totpService.verifyCode({
      base32Secret: plainBase32Secret,
      code: input.code,
      lastUsedStep: user.mfaLastUsedStep,
    });

    if (!verification.valid || verification.matchedStep === null) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_TOTP_CODE',
        message: 'Código de verificação inválido ou expirado.',
      });
    }

    const now = new Date();
    const matchedStep = verification.matchedStep;

    const updatedUser = await this.prismaService.$transaction(async (tx) => {
      // Atualização condicional atômica no banco impede corrida anti-replay (TOCTOU)
      const updateResult = await tx.user.updateMany({
        where: {
          id: user.id,
          mfaEnabled: user.mfaEnabled,
          OR: [{ mfaLastUsedStep: null }, { mfaLastUsedStep: { lt: matchedStep } }],
        },
        data: user.mfaEnabled
          ? {
              mfaLastUsedStep: matchedStep,
            }
          : {
              mfaEnabled: true,
              mfaSecretEncrypted: encryptedSecret,
              mfaPendingSecretEncrypted: null,
              mfaEnrolledAt: now,
              mfaLastUsedStep: matchedStep,
            },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException({
          statusCode: 400,
          code: 'INVALID_TOTP_CODE',
          message: 'Código de verificação inválido ou expirado.',
        });
      }

      const savedUser = await tx.user.findUnique({
        where: { id: user.id },
      });

      if (!savedUser) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'ACCOUNT_INACTIVE',
          message: 'Esta conta está inativa ou foi desativada. Entre em contato com o suporte.',
        });
      }

      await tx.userMfaSession.upsert({
        where: {
          userId_firebaseAuthTime: {
            userId: user.id,
            firebaseAuthTime: authUser.firebaseAuthTime,
          },
        },
        create: {
          userId: user.id,
          firebaseAuthTime: authUser.firebaseAuthTime,
          verifiedAt: now,
          revokedAt: null,
        },
        update: {
          verifiedAt: now,
          revokedAt: null,
        },
      });

      return savedUser;
    });

    this.logger.log(
      {
        event: user.mfaEnabled ? 'auth_mfa_verified' : 'auth_mfa_enrolled',
        userId: updatedUser.id,
      },
      'AuthService',
    );

    return buildAuthSessionResponse(updatedUser, true);
  }

  async adminResetUserMfa(
    actor: CurrentAuthUser,
    targetUserId: string,
  ): Promise<AdminResetMfaResponse> {
    const targetUser = await this.prismaService.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Usuário alvo não encontrado.',
      });
    }

    const now = new Date();

    await this.prismaService.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUser.id },
        data: {
          mfaEnabled: false,
          mfaSecretEncrypted: null,
          mfaPendingSecretEncrypted: null,
          mfaEnrolledAt: null,
          mfaLastUsedStep: null,
        },
      });

      await tx.userMfaSession.updateMany({
        where: {
          userId: targetUser.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });
    });

    if (targetUser.firebaseUid) {
      try {
        await this.firebaseAdminService.revokeRefreshTokens(targetUser.firebaseUid);
      } catch {
        // Best-effort caso token já tenha sido revogado no provedor
      }
    }

    this.logger.log(
      {
        event: 'admin_mfa_reset',
        actorUserId: actor.id,
        targetUserId: targetUser.id,
        resetAt: now.toISOString(),
      },
      'AuthService',
    );

    return {
      userId: targetUser.id,
      mfaEnabled: false,
      resetAt: now.toISOString(),
    };
  }

  async logout(authUser: CurrentAuthUser): Promise<void> {
    const now = new Date();

    await this.prismaService.userMfaSession.updateMany({
      where: {
        userId: authUser.id,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });

    try {
      await this.firebaseAdminService.revokeRefreshTokens(authUser.firebaseUid);
    } catch {
      // Best-effort caso o provedor/emulador já tenha revogado a sessão
    }

    this.logger.log(
      {
        event: 'auth_logout',
        userId: authUser.id,
      },
      'AuthService',
    );
  }
}
