import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_PENDING_SESSION_KEY } from '../decorators/allow-pending-session.decorator';
import type { AuthenticatedRequest } from '../decorators/current-user.decorator';

@Injectable()
export class SessionReadyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowPendingSession = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PENDING_SESSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (allowPendingSession) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authUser = request.authUser;

    if (!authUser) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_TOKEN',
        message: 'Sessão inválida ou expirada. Faça login novamente.',
      });
    }

    switch (authUser.nextStep) {
      case 'READY':
        return true;
      case 'VERIFY_EMAIL':
        throw new ForbiddenException({
          statusCode: 403,
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Confirme seu endereço de e-mail antes de acessar o sistema.',
        });
      case 'CHANGE_PASSWORD':
        throw new ForbiddenException({
          statusCode: 403,
          code: 'PASSWORD_CHANGE_REQUIRED',
          message: 'É necessário definir uma nova senha pessoal antes de continuar.',
        });
      case 'MFA_SETUP':
        throw new ForbiddenException({
          statusCode: 403,
          code: 'MFA_SETUP_REQUIRED',
          message: 'Configure a autenticação em duas etapas (TOTP) para continuar.',
        });
      case 'MFA_VERIFY':
        throw new ForbiddenException({
          statusCode: 403,
          code: 'MFA_VERIFICATION_REQUIRED',
          message: 'Informe o código do aplicativo autenticador para concluir o acesso.',
        });
    }
  }
}
