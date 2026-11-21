import { Injectable, UnauthorizedException } from '@nestjs/common';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { env } from '../config/env';
import { StructuredLoggerService } from '../common/logger/structured-logger.service';

export interface VerifiedFirebaseToken {
  uid: string;
  email: string;
  emailVerified: boolean;
  authTime: number;
  name?: string | undefined;
}

export interface FirebaseUserRecordInfo {
  uid: string;
  email?: string | undefined;
  emailVerified: boolean;
  disabled: boolean;
  tokensValidAfterTimeMs: number | null;
}

function extractFirebaseErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') {
      return code;
    }
  }
  return undefined;
}

@Injectable()
export class FirebaseAdminService {
  private readonly logger = new StructuredLoggerService();
  private appInstance: App | null = null;

  private getApp(): App {
    if (this.appInstance) {
      return this.appInstance;
    }

    if (env.FIREBASE_AUTH_EMULATOR_HOST && !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      process.env.FIREBASE_AUTH_EMULATOR_HOST = env.FIREBASE_AUTH_EMULATOR_HOST;
    }

    const existingApps = getApps();
    if (existingApps.length > 0 && existingApps[0]) {
      this.appInstance = existingApps[0];
      return existingApps[0];
    }

    const useEmulator = Boolean(
      env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST,
    );

    if (!useEmulator && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
      this.appInstance = initializeApp({
        credential: cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY,
        }),
        projectId: env.FIREBASE_PROJECT_ID,
      });
      return this.appInstance;
    }

    this.appInstance = initializeApp({
      projectId: env.FIREBASE_PROJECT_ID,
    });
    return this.appInstance;
  }

  private getAuth(): Auth {
    return getAuth(this.getApp());
  }

  async verifyIdToken(idToken: string): Promise<VerifiedFirebaseToken> {
    if (!idToken || idToken.trim().length === 0) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_TOKEN',
        message: 'Sessão inválida ou expirada. Faça login novamente.',
      });
    }

    try {
      // checkRevoked: true obrigatório conforme Princípio III da Constituição
      const decoded = await this.getAuth().verifyIdToken(idToken, true);
      if (typeof decoded.email !== 'string' || decoded.email.trim().length === 0) {
        throw new UnauthorizedException({
          statusCode: 401,
          code: 'INVALID_TOKEN',
          message: 'Sessão inválida ou expirada. Faça login novamente.',
        });
      }

      const rawName = decoded['name'];
      const verifiedName =
        typeof rawName === 'string' && rawName.trim().length > 0 ? rawName.trim() : undefined;

      return {
        uid: decoded.uid,
        email: decoded.email.trim().toLowerCase(),
        emailVerified: Boolean(decoded.email_verified),
        authTime: decoded.auth_time,
        name: verifiedName,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      const errorCode = extractFirebaseErrorCode(error);
      this.logger.warn(
        {
          event: 'firebase_verify_id_token_failed',
          errorCode: errorCode ?? 'unknown',
        },
        'FirebaseAdminService',
      );

      if (errorCode === 'auth/id-token-revoked' || errorCode === 'auth/user-disabled') {
        throw new UnauthorizedException({
          statusCode: 401,
          code: 'TOKEN_REVOKED',
          message: 'Sua sessão foi encerrada. Faça login novamente.',
        });
      }

      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_TOKEN',
        message: 'Sessão inválida ou expirada. Faça login novamente.',
      });
    }
  }

  async getUser(uid: string): Promise<FirebaseUserRecordInfo> {
    const record = await this.getAuth().getUser(uid);
    const parsedTime =
      typeof record.tokensValidAfterTime === 'string'
        ? Date.parse(record.tokensValidAfterTime)
        : Number.NaN;

    return {
      uid: record.uid,
      email: record.email ? record.email.trim().toLowerCase() : undefined,
      emailVerified: Boolean(record.emailVerified),
      disabled: Boolean(record.disabled),
      tokensValidAfterTimeMs: Number.isNaN(parsedTime) ? null : parsedTime,
    };
  }

  async revokeRefreshTokens(uid: string): Promise<void> {
    await this.getAuth().revokeRefreshTokens(uid);
  }
}
