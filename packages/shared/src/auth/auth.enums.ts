import { z } from 'zod';

export const UserRoleSchema = z.enum(['ADMIN', 'PROFISSIONAL', 'PACIENTE', 'AUTONOMO']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const AuthNextStepSchema = z.enum([
  'VERIFY_EMAIL',
  'CHANGE_PASSWORD',
  'MFA_SETUP',
  'MFA_VERIFY',
  'READY',
]);
export type AuthNextStep = z.infer<typeof AuthNextStepSchema>;

export const AuthErrorCodeSchema = z.enum([
  'INVALID_TOKEN',
  'TOKEN_REVOKED',
  'ACCOUNT_INACTIVE',
  'EMAIL_NOT_VERIFIED',
  'EMAIL_ALREADY_REGISTERED',
  'PASSWORD_CHANGE_REQUIRED',
  'MFA_SETUP_REQUIRED',
  'MFA_VERIFICATION_REQUIRED',
  'INVALID_TOTP_CODE',
  'TOO_MANY_REQUESTS',
  'FORBIDDEN_ROLE',
]);
export type AuthErrorCode = z.infer<typeof AuthErrorCodeSchema>;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const TOTP_CODE_LENGTH = 6;
export const SESSION_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

export const ROLE_HOME_ROUTES = {
  ADMIN: '/admin',
  PROFISSIONAL: '/profissional',
  PACIENTE: '/paciente',
  AUTONOMO: '/dashboard',
} as const satisfies Record<UserRole, string>;

export const MFA_REQUIRED_ROLES: readonly UserRole[] = ['ADMIN', 'PROFISSIONAL'] as const;

export function isMfaRequiredForRole(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'PROFISSIONAL';
}
