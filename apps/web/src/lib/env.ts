import { z } from 'zod';
import { parseEnv } from '@fono/shared';

const DEV_FIREBASE_API_KEY = 'demo-fono-api-key';
const DEV_FIREBASE_AUTH_DOMAIN = 'demo-fono-local.firebaseapp.com';
const DEV_FIREBASE_PROJECT_ID = 'demo-fono-local';
const DEV_FIREBASE_APP_ID = '1:000000000000:web:0000000000000000000000';

const emptyToUndefined = (value: unknown): unknown => (value === '' ? undefined : value);

export const WebEnvSchema = z
  .object({
    VITE_API_URL: z
      .string()
      .url('VITE_API_URL deve ser uma URL válida')
      .default('http://localhost:3000'),
    VITE_FIREBASE_API_KEY: z.preprocess(
      emptyToUndefined,
      z.string().min(1, 'VITE_FIREBASE_API_KEY obrigatório').default(DEV_FIREBASE_API_KEY),
    ),
    VITE_FIREBASE_AUTH_DOMAIN: z.preprocess(
      emptyToUndefined,
      z.string().min(1, 'VITE_FIREBASE_AUTH_DOMAIN obrigatório').default(DEV_FIREBASE_AUTH_DOMAIN),
    ),
    VITE_FIREBASE_PROJECT_ID: z.preprocess(
      emptyToUndefined,
      z.string().min(1, 'VITE_FIREBASE_PROJECT_ID obrigatório').default(DEV_FIREBASE_PROJECT_ID),
    ),
    VITE_FIREBASE_APP_ID: z.preprocess(
      emptyToUndefined,
      z.string().min(1, 'VITE_FIREBASE_APP_ID obrigatório').default(DEV_FIREBASE_APP_ID),
    ),
    VITE_FIREBASE_AUTH_EMULATOR_URL: z.preprocess(
      emptyToUndefined,
      z.string().url('VITE_FIREBASE_AUTH_EMULATOR_URL deve ser uma URL válida').optional(),
    ),
    PROD: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.PROD) {
      if (!data.VITE_API_URL.startsWith('https://')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['VITE_API_URL'],
          message: 'Em produção, VITE_API_URL deve utilizar protocolo seguro https://',
        });
      }
      if (data.VITE_FIREBASE_API_KEY === DEV_FIREBASE_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['VITE_FIREBASE_API_KEY'],
          message: 'Em produção, VITE_FIREBASE_API_KEY deve ser configurada explicitamente',
        });
      }
      if (data.VITE_FIREBASE_AUTH_DOMAIN === DEV_FIREBASE_AUTH_DOMAIN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['VITE_FIREBASE_AUTH_DOMAIN'],
          message: 'Em produção, VITE_FIREBASE_AUTH_DOMAIN deve ser configurada explicitamente',
        });
      }
      if (data.VITE_FIREBASE_PROJECT_ID === DEV_FIREBASE_PROJECT_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['VITE_FIREBASE_PROJECT_ID'],
          message: 'Em produção, VITE_FIREBASE_PROJECT_ID deve ser configurada explicitamente',
        });
      }
      if (data.VITE_FIREBASE_APP_ID === DEV_FIREBASE_APP_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['VITE_FIREBASE_APP_ID'],
          message: 'Em produção, VITE_FIREBASE_APP_ID deve ser configurada explicitamente',
        });
      }
      if (data.VITE_FIREBASE_AUTH_EMULATOR_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['VITE_FIREBASE_AUTH_EMULATOR_URL'],
          message: 'Em produção, VITE_FIREBASE_AUTH_EMULATOR_URL não é permitido',
        });
      }
    }
  });

export type WebEnv = z.infer<typeof WebEnvSchema>;

export function loadWebEnv(source?: Record<string, unknown>): WebEnv {
  const defaultSource: Record<string, unknown> = {
    VITE_API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
    VITE_FIREBASE_AUTH_EMULATOR_URL: import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL,
    PROD: Boolean(import.meta.env.PROD),
  };
  return parseEnv(WebEnvSchema, source ?? defaultSource);
}

export const webEnv = loadWebEnv();
