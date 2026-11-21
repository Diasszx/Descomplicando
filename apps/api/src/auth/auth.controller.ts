import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  SyncAuthRequestSchema,
  TotpCodeSchema,
  type AdminResetMfaResponse,
  type AuthSessionResponse,
  type MfaSetupResponse,
  type SyncAuthRequest,
  type TotpCodeInput,
} from '@fono/shared';
import { AuthService } from './auth.service';
import type { VerifiedFirebaseToken } from './firebase-admin.service';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
import { SessionReadyGuard } from './guards/session-ready.guard';
import { RolesGuard } from './guards/roles.guard';
import { AllowPendingSession } from './decorators/allow-pending-session.decorator';
import { AllowUnlinkedSync } from './decorators/allow-unlinked-sync.decorator';
import { Roles } from './decorators/roles.decorator';
import {
  CurrentUser,
  FirebaseToken,
  type CurrentAuthUser,
} from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FirebaseAuthGuard)
  @AllowUnlinkedSync()
  @AllowPendingSession()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async sync(
    @FirebaseToken() firebaseToken: VerifiedFirebaseToken | undefined,
    @Body(new ZodValidationPipe(SyncAuthRequestSchema)) body: SyncAuthRequest,
  ): Promise<AuthSessionResponse> {
    if (!firebaseToken) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_TOKEN',
        message: 'Sessão inválida ou expirada. Faça login novamente.',
      });
    }
    return this.authService.syncUser(firebaseToken, body);
  }

  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  @AllowPendingSession()
  async me(@CurrentUser() user: CurrentAuthUser | undefined): Promise<AuthSessionResponse> {
    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_TOKEN',
        message: 'Sessão inválida ou expirada. Faça login novamente.',
      });
    }
    return this.authService.getSession(user);
  }

  @Post('password-changed')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FirebaseAuthGuard)
  @AllowPendingSession()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async confirmPasswordChanged(
    @CurrentUser() user: CurrentAuthUser | undefined,
  ): Promise<AuthSessionResponse> {
    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_TOKEN',
        message: 'Sessão inválida ou expirada. Faça login novamente.',
      });
    }
    return this.authService.confirmPasswordChanged(user);
  }

  @Post('mfa/setup')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FirebaseAuthGuard)
  @AllowPendingSession()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async setupMfa(@CurrentUser() user: CurrentAuthUser | undefined): Promise<MfaSetupResponse> {
    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_TOKEN',
        message: 'Sessão inválida ou expirada. Faça login novamente.',
      });
    }
    return this.authService.setupMfa(user);
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FirebaseAuthGuard)
  @AllowPendingSession()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async verifyMfa(
    @CurrentUser() user: CurrentAuthUser | undefined,
    @Body(new ZodValidationPipe(TotpCodeSchema)) body: TotpCodeInput,
  ): Promise<AuthSessionResponse> {
    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_TOKEN',
        message: 'Sessão inválida ou expirada. Faça login novamente.',
      });
    }
    return this.authService.verifyMfa(user, body);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(FirebaseAuthGuard)
  @AllowPendingSession()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async logout(@CurrentUser() user: CurrentAuthUser | undefined): Promise<void> {
    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_TOKEN',
        message: 'Sessão inválida ou expirada. Faça login novamente.',
      });
    }
    await this.authService.logout(user);
  }

  @Post('admin/users/:userId/mfa/reset')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FirebaseAuthGuard, SessionReadyGuard, RolesGuard)
  @Roles('ADMIN')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async adminResetMfa(
    @CurrentUser() actor: CurrentAuthUser | undefined,
    @Param(
      'userId',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException({
            statusCode: 400,
            message: 'Identificador de usuário inválido.',
          }),
      }),
    )
    targetUserId: string,
  ): Promise<AdminResetMfaResponse> {
    if (!actor) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_TOKEN',
        message: 'Sessão inválida ou expirada. Faça login novamente.',
      });
    }
    return this.authService.adminResetUserMfa(actor, targetUserId);
  }
}
