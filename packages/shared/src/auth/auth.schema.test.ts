import { describe, it, expect } from 'vitest';
import {
  UserRoleSchema,
  UserStatusSchema,
  AuthNextStepSchema,
  AuthErrorCodeSchema,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  TOTP_CODE_LENGTH,
  SESSION_INACTIVITY_TIMEOUT_MS,
  ROLE_HOME_ROUTES,
} from './auth.enums';
import {
  NormalizedEmailSchema,
  SanitizedNameSchema,
  PasswordSchema,
  LoginPasswordSchema,
  TotpCodeSchema,
  LoginSchema,
  RegisterAutonomousSchema,
  ForgotPasswordSchema,
  ChangePasswordSchema,
  SyncAuthRequestSchema,
  MfaSetupResponseSchema,
  AuthUserProfileSchema,
  AuthSessionResponseSchema,
  AdminResetMfaResponseSchema,
  ApiErrorResponseSchema,
} from './auth.schema';

describe('Auth Enums & Constantes (@fono/shared)', () => {
  it('deve exportar constantes de política de segurança conforme a especificação', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(PASSWORD_MAX_LENGTH).toBe(128);
    expect(TOTP_CODE_LENGTH).toBe(6);
    expect(SESSION_INACTIVITY_TIMEOUT_MS).toBe(30 * 60 * 1000);
    expect(ROLE_HOME_ROUTES).toEqual({
      ADMIN: '/admin',
      PROFISSIONAL: '/profissional',
      PACIENTE: '/paciente',
      AUTONOMO: '/dashboard',
    });
  });

  it('deve validar enums de perfil, status, nextStep e códigos de erro', () => {
    expect(UserRoleSchema.parse('ADMIN')).toBe('ADMIN');
    expect(UserRoleSchema.parse('PROFISSIONAL')).toBe('PROFISSIONAL');
    expect(UserRoleSchema.parse('PACIENTE')).toBe('PACIENTE');
    expect(UserRoleSchema.parse('AUTONOMO')).toBe('AUTONOMO');
    expect(() => UserRoleSchema.parse('SUPERADMIN')).toThrow();

    expect(UserStatusSchema.parse('ACTIVE')).toBe('ACTIVE');
    expect(UserStatusSchema.parse('INACTIVE')).toBe('INACTIVE');
    expect(() => UserStatusSchema.parse('PENDING')).toThrow();

    expect(AuthNextStepSchema.parse('VERIFY_EMAIL')).toBe('VERIFY_EMAIL');
    expect(AuthNextStepSchema.parse('CHANGE_PASSWORD')).toBe('CHANGE_PASSWORD');
    expect(AuthNextStepSchema.parse('MFA_SETUP')).toBe('MFA_SETUP');
    expect(AuthNextStepSchema.parse('MFA_VERIFY')).toBe('MFA_VERIFY');
    expect(AuthNextStepSchema.parse('READY')).toBe('READY');

    expect(AuthErrorCodeSchema.parse('INVALID_TOKEN')).toBe('INVALID_TOKEN');
    expect(AuthErrorCodeSchema.parse('TOKEN_REVOKED')).toBe('TOKEN_REVOKED');
    expect(AuthErrorCodeSchema.parse('EMAIL_ALREADY_REGISTERED')).toBe('EMAIL_ALREADY_REGISTERED');
    expect(AuthErrorCodeSchema.parse('FORBIDDEN_ROLE')).toBe('FORBIDDEN_ROLE');
  });
});

describe('PasswordSchema (FR-002)', () => {
  it('deve aceitar senha válida com exatamente 8 caracteres, 1 maiúscula e 1 minúscula', () => {
    expect(PasswordSchema.parse('FonoGame')).toBe('FonoGame');
    expect(PasswordSchema.parse('  FonoGame  ')).toBe('  FonoGame  ');
  });

  it('não deve aplicar trim na senha preservando espaços digitados', () => {
    const withSpaces = ' Abcdef1 ';
    expect(PasswordSchema.parse(withSpaces)).toBe(withSpaces);
  });

  it('deve rejeitar senha com menos de 8 caracteres ou mais de 128 caracteres', () => {
    const shortResult = PasswordSchema.safeParse('FonoGam');
    expect(shortResult.success).toBe(false);
    if (!shortResult.success) {
      expect(shortResult.error.issues[0]?.message).toContain('8 caracteres');
    }

    const longPassword = `Aa${'x'.repeat(127)}`;
    expect(PasswordSchema.safeParse(longPassword).success).toBe(false);
  });

  it('deve rejeitar senha sem letra maiúscula', () => {
    const result = PasswordSchema.safeParse('fonogame123');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('maiúscula'))).toBe(true);
    }
  });

  it('deve rejeitar senha sem letra minúscula', () => {
    const result = PasswordSchema.safeParse('FONOGAME123');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('minúscula'))).toBe(true);
    }
  });
});

describe('SanitizedNameSchema e NormalizedEmailSchema', () => {
  it('deve sanitizar tags HTML e normalizar espaços no nome', () => {
    expect(SanitizedNameSchema.parse('  <b>Ana</b>   <i>Maria</i>  ')).toBe('Ana Maria');
    expect(SanitizedNameSchema.parse('<script>alert(1)</script>João Silva')).toBe('alert(1)João Silva');
  });

  it('deve rejeitar nome curto após remoção de tags HTML ou acima de 120 caracteres', () => {
    expect(SanitizedNameSchema.safeParse('<b>A</b>').success).toBe(false);
    expect(SanitizedNameSchema.safeParse('   ').success).toBe(false);
    expect(SanitizedNameSchema.safeParse('a'.repeat(121)).success).toBe(false);
  });

  it('deve normalizar e-mail para minúsculas sem espaços e rejeitar inválidos ou > 254 chars', () => {
    expect(NormalizedEmailSchema.parse('  Maria.Silva@Exemplo.COM  ')).toBe(
      'maria.silva@exemplo.com',
    );
    expect(NormalizedEmailSchema.safeParse('invalido').success).toBe(false);
    const tooLongEmail = `${'a'.repeat(245)}@exemplo.com`;
    expect(NormalizedEmailSchema.safeParse(tooLongEmail).success).toBe(false);
  });
});

describe('SyncAuthRequestSchema (.strict() — FR-004)', () => {
  it('deve aceitar payload vazio ou apenas com name sanitizado', () => {
    expect(SyncAuthRequestSchema.parse({})).toEqual({});
    expect(SyncAuthRequestSchema.parse({ name: '  <b>Carlos</b>  ' })).toEqual({
      name: 'Carlos',
    });
  });

  it('deve rejeitar tentativa de injeção de role, status ou campos extras', () => {
    expect(SyncAuthRequestSchema.safeParse({ name: 'Carlos', role: 'ADMIN' }).success).toBe(false);
    expect(SyncAuthRequestSchema.safeParse({ status: 'ACTIVE' }).success).toBe(false);
    expect(SyncAuthRequestSchema.safeParse({ userId: '123' }).success).toBe(false);
    expect(SyncAuthRequestSchema.safeParse({ mfaEnabled: true }).success).toBe(false);
  });
});

describe('TotpCodeSchema', () => {
  it('deve aceitar código numérico com exatamente 6 dígitos (com trim)', () => {
    expect(TotpCodeSchema.parse({ code: ' 123456 ' })).toEqual({ code: '123456' });
  });

  it('deve rejeitar códigos com letras, menos ou mais de 6 dígitos ou campos extras', () => {
    expect(TotpCodeSchema.safeParse({ code: '12345' }).success).toBe(false);
    expect(TotpCodeSchema.safeParse({ code: '1234567' }).success).toBe(false);
    expect(TotpCodeSchema.safeParse({ code: '12345a' }).success).toBe(false);
    expect(TotpCodeSchema.safeParse({ code: '123456', extra: true }).success).toBe(false);
  });
});

describe('Schemas de Formulário (Login, Register, ForgotPassword, ChangePassword)', () => {
  it('LoginSchema deve aceitar senha temporária curta sem revelar política de senha', () => {
    const parsed = LoginSchema.parse({ email: ' PACIENTE@fono.com ', password: '123' });
    expect(parsed).toEqual({ email: 'paciente@fono.com', password: '123' });
    expect(LoginPasswordSchema.safeParse('').success).toBe(false);
  });

  it('RegisterAutonomousSchema deve validar confirmação de senha e política FR-002', () => {
    const valid = RegisterAutonomousSchema.safeParse({
      name: 'Maria Souza',
      email: 'maria@exemplo.com',
      password: 'Password1',
      confirmPassword: 'Password1',
    });
    expect(valid.success).toBe(true);

    const mismatch = RegisterAutonomousSchema.safeParse({
      name: 'Maria Souza',
      email: 'maria@exemplo.com',
      password: 'Password1',
      confirmPassword: 'Password2',
    });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) {
      expect(mismatch.error.issues[0]?.path).toEqual(['confirmPassword']);
    }
  });

  it('ForgotPasswordSchema deve validar e normalizar e-mail', () => {
    expect(ForgotPasswordSchema.parse({ email: ' USER@Fono.BR ' })).toEqual({
      email: 'user@fono.br',
    });
  });

  it('ChangePasswordSchema deve rejeitar nova senha igual à temporária ou divergente da confirmação', () => {
    const valid = ChangePasswordSchema.safeParse({
      currentPassword: 'TempPassword1',
      newPassword: 'NovaPassword2',
      confirmNewPassword: 'NovaPassword2',
    });
    expect(valid.success).toBe(true);

    const sameAsTemp = ChangePasswordSchema.safeParse({
      currentPassword: 'SamePassword1',
      newPassword: 'SamePassword1',
      confirmNewPassword: 'SamePassword1',
    });
    expect(sameAsTemp.success).toBe(false);
    if (!sameAsTemp.success) {
      expect(sameAsTemp.error.issues.some((i) => i.path.includes('newPassword'))).toBe(true);
    }

    const mismatch = ChangePasswordSchema.safeParse({
      currentPassword: 'TempPassword1',
      newPassword: 'NovaPassword2',
      confirmNewPassword: 'OutraPassword3',
    });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) {
      expect(mismatch.error.issues.some((i) => i.path.includes('confirmNewPassword'))).toBe(true);
    }
  });
});

describe('Schemas de Resposta HTTP (API <-> Web)', () => {
  it('deve validar MfaSetupResponseSchema, AuthSessionResponseSchema, AdminResetMfaResponseSchema e ApiErrorResponseSchema', () => {
    const setup = MfaSetupResponseSchema.parse({
      otpauthUri: 'otpauth://totp/FonoGames:pro%40fono.com?secret=JBSWY3DPEHPK3PXP&issuer=FonoGames',
      manualEntryKey: 'JBSWY3DPEHPK3PXP',
      issuer: 'FonoGames',
      accountName: 'pro@fono.com',
    });
    expect(setup.issuer).toBe('FonoGames');

    const userId = '550e8400-e29b-41d4-a716-446655440000';
    const userProfile = AuthUserProfileSchema.parse({
      id: userId,
      name: 'Dra. Ana',
      email: 'ana@fono.com',
      emailVerified: true,
      role: 'PROFISSIONAL',
      status: 'ACTIVE',
      mustChangePassword: false,
      mfaRequired: true,
      mfaEnabled: true,
      lastLoginAt: new Date().toISOString(),
    });

    const session = AuthSessionResponseSchema.parse({
      user: userProfile,
      nextStep: 'READY',
      mfaVerifiedForCurrentLogin: true,
    });
    expect(session.nextStep).toBe('READY');

    const reset = AdminResetMfaResponseSchema.parse({
      userId,
      mfaEnabled: false,
      resetAt: new Date().toISOString(),
    });
    expect(reset.mfaEnabled).toBe(false);

    const apiError = ApiErrorResponseSchema.parse({
      statusCode: 403,
      code: 'FORBIDDEN_ROLE',
      message: 'Você não tem permissão para acessar este recurso.',
    });
    expect(apiError.code).toBe('FORBIDDEN_ROLE');
  });
});
