import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isMfaRequiredForRole } from '@fono/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { FirebaseAdminService } from '../firebase-admin.service';
import { computeAuthNextStep } from '../auth-state.helper';
import { ALLOW_UNLINKED_SYNC_KEY } from '../decorators/allow-unlinked-sync.decorator';
import type { AuthenticatedRequest } from '../decorators/current-user.decorator';

function extractBearerToken(authorizationHeader: string | string[] | undefined): string | null {
  const raw = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
  if (!match || !match[1]) {
    return null;
  }
  return match[1].trim();
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly prismaService: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers['authorization']);

    if (!token) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_TOKEN',
        message: 'Sessão inválida ou expirada. Faça login novamente.',
      });
    }

    const verifiedToken = await this.firebaseAdminService.verifyIdToken(token);
    request.firebaseToken = verifiedToken;

    const allowUnlinkedSync = this.reflector.getAllAndOverride<boolean>(ALLOW_UNLINKED_SYNC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const user = await this.prismaService.user.findUnique({
      where: { firebaseUid: verifiedToken.uid },
      select: {
        id: true,
        firebaseUid: true,
        name: true,
        email: true,
        emailVerified: true,
        role: true,
        status: true,
        mustChangePassword: true,
        mfaEnabled: true,
        lastLoginAt: true,
        deletedAt: true,
      },
    });

    if (!user) {
      if (allowUnlinkedSync) {
        return true;
      }
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_TOKEN',
        message: 'Sessão inválida ou expirada. Faça login novamente.',
      });
    }

    if (user.status === 'INACTIVE' || user.deletedAt !== null) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'ACCOUNT_INACTIVE',
        message: 'Esta conta está inativa ou foi desativada. Entre em contato com o suporte.',
      });
    }

    const activeMfaSession = user.mfaEnabled
      ? await this.prismaService.userMfaSession.findFirst({
          where: {
            userId: user.id,
            firebaseAuthTime: verifiedToken.authTime,
            revokedAt: null,
          },
          select: { id: true },
        })
      : null;

    const mfaVerifiedForCurrentLogin = Boolean(activeMfaSession);
    const nextStep = computeAuthNextStep(
      {
        emailVerified: user.emailVerified,
        mustChangePassword: user.mustChangePassword,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
      },
      mfaVerifiedForCurrentLogin,
    );

    request.authUser = {
      id: user.id,
      firebaseUid: user.firebaseUid ?? verifiedToken.uid,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      mfaRequired: isMfaRequiredForRole(user.role),
      mfaEnabled: user.mfaEnabled,
      mfaVerifiedForCurrentLogin,
      firebaseAuthTime: verifiedToken.authTime,
      nextStep,
      lastLoginAt: user.lastLoginAt,
    };

    return true;
  }
}
