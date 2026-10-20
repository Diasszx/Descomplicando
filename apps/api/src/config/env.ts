import { z } from 'zod';
import { parseEnv } from '@fono/shared';

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
    AXIOM_TOKEN: z.preprocess((v) => (v === '' ? undefined : v), z.string().min(1).optional()),
    AXIOM_DATASET: z.preprocess((v) => (v === '' ? undefined : v), z.string().min(1).optional()),
  })
  .superRefine((data, ctx) => {
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
    }
  });

export type ApiEnv = z.infer<typeof ApiEnvSchema>;

export function loadApiEnv(source?: Record<string, unknown>): ApiEnv {
  return parseEnv(ApiEnvSchema, source);
}

export const env = loadApiEnv();
