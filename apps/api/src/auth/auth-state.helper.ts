import {
  isMfaRequiredForRole,
  type AuthNextStep,
  type AuthSessionResponse,
  type AuthUserProfile,
  type UserRole,
  type UserStatus,
} from '@fono/shared';

export interface AuthUserStateInput {
  id: string;
  firebaseUid: string | null;
  name: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  mfaEnabled: boolean;
  lastLoginAt: Date | null;
}

export function computeAuthNextStep(
  user: Pick<AuthUserStateInput, 'emailVerified' | 'mustChangePassword' | 'role' | 'mfaEnabled'>,
  mfaVerifiedForCurrentLogin: boolean,
): AuthNextStep {
  if (!user.emailVerified) {
    return 'VERIFY_EMAIL';
  }
  if (user.mustChangePassword) {
    return 'CHANGE_PASSWORD';
  }
  const mfaRequired = isMfaRequiredForRole(user.role);
  if (mfaRequired && !user.mfaEnabled) {
    return 'MFA_SETUP';
  }
  if (user.mfaEnabled && !mfaVerifiedForCurrentLogin) {
    return 'MFA_VERIFY';
  }
  return 'READY';
}

export function toAuthUserProfile(user: AuthUserStateInput): AuthUserProfile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    mfaRequired: isMfaRequiredForRole(user.role),
    mfaEnabled: user.mfaEnabled,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  };
}

export function buildAuthSessionResponse(
  user: AuthUserStateInput,
  mfaVerifiedForCurrentLogin: boolean,
): AuthSessionResponse {
  const nextStep = computeAuthNextStep(user, mfaVerifiedForCurrentLogin);
  return {
    user: toAuthUserProfile(user),
    nextStep,
    mfaVerifiedForCurrentLogin,
  };
}
