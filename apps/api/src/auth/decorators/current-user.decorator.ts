import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthNextStep, UserRole, UserStatus } from '@fono/shared';
import type { VerifiedFirebaseToken } from '../firebase-admin.service';

export interface CurrentAuthUser {
  id: string;
  firebaseUid: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  mfaRequired: boolean;
  mfaEnabled: boolean;
  mfaVerifiedForCurrentLogin: boolean;
  firebaseAuthTime: number;
  nextStep: AuthNextStep;
  lastLoginAt: Date | null;
}

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  firebaseToken?: VerifiedFirebaseToken;
  authUser?: CurrentAuthUser;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentAuthUser | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.authUser;
  },
);

export const FirebaseToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): VerifiedFirebaseToken | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.firebaseToken;
  },
);
