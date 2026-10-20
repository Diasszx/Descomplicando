import { z } from 'zod';
import { parseEnv } from '@fono/shared';

export const WebEnvSchema = z
  .object({
    VITE_API_URL: z.string().url('VITE_API_URL deve ser uma URL válida').default('http://localhost:3000'),
    PROD: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.PROD && !data.VITE_API_URL.startsWith('https://')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['VITE_API_URL'],
        message: 'Em produção, VITE_API_URL deve utilizar protocolo seguro https://',
      });
    }
  });

export type WebEnv = z.infer<typeof WebEnvSchema>;

export function loadWebEnv(source?: Record<string, unknown>): WebEnv {
  const defaultSource: Record<string, unknown> = {
    VITE_API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    PROD: Boolean(import.meta.env.PROD),
  };
  return parseEnv(WebEnvSchema, source ?? defaultSource);
}

export const webEnv = loadWebEnv();
