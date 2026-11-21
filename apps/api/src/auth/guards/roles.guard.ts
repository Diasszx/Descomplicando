import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@fono/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedRequest } from '../decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
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

    if (!requiredRoles.includes(authUser.role)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'FORBIDDEN_ROLE',
        message: 'Você não tem permissão para acessar este recurso.',
      });
    }

    return true;
  }
}
