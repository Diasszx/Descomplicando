import { z, ZodSchema } from 'zod';

declare const process: { env?: Record<string, string | undefined> } | undefined;

export function parseEnv<T extends ZodSchema>(
  schema: T,
  source?: Record<string, unknown>,
): z.infer<T> {
  const envSource = source ?? (typeof process !== 'undefined' && process?.env ? process.env : {});
  const result = schema.safeParse(envSource);
  if (!result.success) {
    const invalidKeys = result.error.errors.map((err) => err.path.join('.')).filter(Boolean);
    const uniqueKeys = Array.from(new Set(invalidKeys));
    throw new Error(
      `Variáveis de ambiente inválidas ou ausentes: [${uniqueKeys.join(', ')}]. Verifique seu arquivo .env.`,
    );
  }
  return result.data;
}
