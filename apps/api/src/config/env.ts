import { z } from 'zod';
import { parseEnv } from '@fono/shared';

const DEV_FALLBACK_MFA_KEY = '0'.repeat(64);
const emptyToUndefined = (value: unknown): unknown => (value === '' ? undefined : value);

export function parseMfaEncryptionKey(raw: string): Buffer | null {
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  if (/^[A-Za-z0-9+/]+=*$/.test(trimmed)) {
    const decoded = Buffer.from(trimmed, 'base64');
    if (
      decoded.length === 32 &&
      decoded.toString('base64').replace(/=+$/, '') === trimmed.replace(/=+$/, '')
    ) {
      return decoded;
    }
  }
  return null;
}

export const ApiEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    PORT: z.string().regex(/^\d+$/, 'PORT deve conter apenas dígitos').default('3000'),
    DATABASE_URL: z
      .string()
      .min(1)
      .regex(/^postgres(ql)?:\/\//, 'DATABASE_URL deve iniciar com postgresql:// ou postgres://')
      .default('postgresql://postgres:postgres@localhost:5432/fono?schema=public'),
    CORS_ORIGINS: z.string().min(1).default('http://localhost:5173,http://localhost:8081'),
    AXIOM_TOKEN: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    AXIOM_DATASET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    FIREBASE_PROJECT_ID: z.preprocess(
      emptyToUndefined,
      z.string().min(1, 'FIREBASE_PROJECT_ID inválido').default('demo-fono-local'),
    ),
    FIREBASE_CLIENT_EMAIL: z.preprocess(
      emptyToUndefined,
      z.string().email('FIREBASE_CLIENT_EMAIL deve ser um e-mail válido').optional(),
    ),
    FIREBASE_PRIVATE_KEY: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .min(1)
        .transform((value) => value.replace(/\\n/g, '\n'))
        .optional(),
    ),
    FIREBASE_AUTH_EMULATOR_HOST: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .regex(
          /^[a-zA-Z0-9.-]+:\d+$/,
          'FIREBASE_AUTH_EMULATOR_HOST deve seguir o formato host:porta',
        )
        .optional(),
    ),
    MFA_ENCRYPTION_KEY: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .default(DEV_FALLBACK_MFA_KEY)
        .refine(
          (value) => parseMfaEncryptionKey(value) !== null,
          'MFA_ENCRYPTION_KEY deve conter exatamente 32 bytes em hex (64 caracteres) ou base64',
        ),
    ),
  })
  .superRefine((data, ctx) => {
    const isProdLike = data.NODE_ENV === 'production' || data.NODE_ENV === 'staging';

    if (data.NODE_ENV === 'production') {
      const origins = data.CORS_ORIGINS.split(',').map((o) => o.trim());
      const hasInvalidProdOrigin = origins.some(
        (origin) =>
          origin === '*' ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          !origin.startsWith('https://'),
      );
      if (hasInvalidProdOrigin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CORS_ORIGINS'],
          message:
            'Em production, CORS_ORIGINS deve conter apenas origens https:// explícitas (sem wildcard * ou localhost)',
        });
      }

      if (data.FIREBASE_AUTH_EMULATOR_HOST) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['FIREBASE_AUTH_EMULATOR_HOST'],
          message: 'FIREBASE_AUTH_EMULATOR_HOST não é permitido em production',
        });
      }
    }

    if (isProdLike) {
      if (!data.FIREBASE_PROJECT_ID || data.FIREBASE_PROJECT_ID === 'demo-fono-local') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['FIREBASE_PROJECT_ID'],
          message: 'FIREBASE_PROJECT_ID obrigatório em staging/production',
        });
      }
      if (!data.FIREBASE_CLIENT_EMAIL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['FIREBASE_CLIENT_EMAIL'],
          message: 'FIREBASE_CLIENT_EMAIL obrigatório em staging/production',
        });
      }
      if (!data.FIREBASE_PRIVATE_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['FIREBASE_PRIVATE_KEY'],
          message: 'FIREBASE_PRIVATE_KEY obrigatório em staging/production',
        });
      }
      if (data.MFA_ENCRYPTION_KEY === DEV_FALLBACK_MFA_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['MFA_ENCRYPTION_KEY'],
          message: 'MFA_ENCRYPTION_KEY dedicada obrigatória em staging/production',
        });
      }
    }
  });

export type ApiEnv = z.infer<typeof ApiEnvSchema>;

export function loadApiEnv(source?: Record<string, unknown>): ApiEnv {
  return parseEnv(ApiEnvSchema, source);
}

export const env = loadApiEnv();
