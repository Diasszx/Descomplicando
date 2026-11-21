import { z } from 'zod';
import {
  AuthErrorCodeSchema,
  AuthNextStepSchema,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  UserRoleSchema,
  UserStatusSchema,
} from './auth.enums';

function stripHtmlTagsAndCollapseSpaces(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const NormalizedEmailSchema = z
  .string({ required_error: 'Informe um endereço de e-mail válido.' })
  .trim()
  .toLowerCase()
  .min(1, 'Informe um endereço de e-mail válido.')
  .max(254, 'Informe um endereço de e-mail válido.')
  .email('Informe um endereço de e-mail válido.');

export const SanitizedNameSchema = z
  .string({ required_error: 'Informe seu nome completo (mínimo de 2 caracteres).' })
  .transform(stripHtmlTagsAndCollapseSpaces)
  .refine(
    (value) => value.length >= 2,
    'Informe seu nome completo (mínimo de 2 caracteres).',
  )
  .refine(
    (value) => value.length <= 120,
    'O nome deve ter no máximo 120 caracteres.',
  );

export const PasswordSchema = z
  .string({ required_error: 'A senha deve ter pelo menos 8 caracteres.' })
  .min(PASSWORD_MIN_LENGTH, 'A senha deve ter pelo menos 8 caracteres.')
  .max(PASSWORD_MAX_LENGTH, 'A senha deve ter no máximo 128 caracteres.')
  .refine(
    (value) => /[A-Z]/.test(value),
    'A senha deve conter pelo menos uma letra maiúscula.',
  )
  .refine(
    (value) => /[a-z]/.test(value),
    'A senha deve conter pelo menos uma letra minúscula.',
  );

export const LoginPasswordSchema = z
  .string({ required_error: 'Informe sua senha.' })
  .min(1, 'Informe sua senha.')
  .max(PASSWORD_MAX_LENGTH, 'A senha deve ter no máximo 128 caracteres.');

export const TotpCodeSchema = z
  .object({
    code: z
      .string({
        required_error: 'Informe o código numérico de 6 dígitos do aplicativo autenticador.',
      })
      .trim()
      .regex(/^\d{6}$/, 'Informe o código numérico de 6 dígitos do aplicativo autenticador.'),
  })
  .strict();
export type TotpCodeInput = z.infer<typeof TotpCodeSchema>;

export const LoginSchema = z.object({
  email: NormalizedEmailSchema,
  password: LoginPasswordSchema,
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterAutonomousSchema = z
  .object({
    name: SanitizedNameSchema,
    email: NormalizedEmailSchema,
    password: PasswordSchema,
    confirmPassword: z
      .string({ required_error: 'Confirme sua senha.' })
      .min(1, 'Confirme sua senha.'),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'As senhas não coincidem.',
      });
    }
  });
export type RegisterAutonomousInput = z.infer<typeof RegisterAutonomousSchema>;

export const ForgotPasswordSchema = z.object({
  email: NormalizedEmailSchema,
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ChangePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Informe a senha temporária atual.' })
      .min(1, 'Informe a senha temporária atual.')
      .max(PASSWORD_MAX_LENGTH, 'A senha deve ter no máximo 128 caracteres.'),
    newPassword: PasswordSchema,
    confirmNewPassword: z
      .string({ required_error: 'Confirme a nova senha.' })
      .min(1, 'Confirme a nova senha.'),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmNewPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmNewPassword'],
        message: 'As senhas não coincidem.',
      });
    }
    if (data.newPassword === data.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['newPassword'],
        message: 'A nova senha deve ser diferente da senha temporária.',
      });
    }
  });
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const SyncAuthRequestSchema = z
  .object({
    name: SanitizedNameSchema.optional(),
  })
  .strict();
export type SyncAuthRequest = z.infer<typeof SyncAuthRequestSchema>;

export const MfaSetupResponseSchema = z.object({
  otpauthUri: z.string().startsWith('otpauth://totp/'),
  manualEntryKey: z.string().min(16),
  issuer: z.literal('FonoGames'),
  accountName: NormalizedEmailSchema,
});
export type MfaSetupResponse = z.infer<typeof MfaSetupResponseSchema>;

export const AuthUserProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: NormalizedEmailSchema,
  emailVerified: z.boolean(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  mustChangePassword: z.boolean(),
  mfaRequired: z.boolean(),
  mfaEnabled: z.boolean(),
  lastLoginAt: z.string().datetime().nullable(),
});
export type AuthUserProfile = z.infer<typeof AuthUserProfileSchema>;

export const AuthSessionResponseSchema = z.object({
  user: AuthUserProfileSchema,
  nextStep: AuthNextStepSchema,
  mfaVerifiedForCurrentLogin: z.boolean(),
});
export type AuthSessionResponse = z.infer<typeof AuthSessionResponseSchema>;

export const AdminResetMfaResponseSchema = z.object({
  userId: z.string().uuid(),
  mfaEnabled: z.literal(false),
  resetAt: z.string().datetime(),
});
export type AdminResetMfaResponse = z.infer<typeof AdminResetMfaResponseSchema>;

export const ApiErrorResponseSchema = z.object({
  statusCode: z.number().int(),
  code: AuthErrorCodeSchema,
  message: z.string(),
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
