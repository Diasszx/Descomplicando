import { z } from 'zod';
import { parseEnv } from '@fono/shared';

export const ApiEnvSchema = z.object({
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/fono?schema=public'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:8081'),
});

export type ApiEnv = z.infer<typeof ApiEnvSchema>;

export const env = parseEnv(ApiEnvSchema);
