import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { parseEnv } from './parse-env';

describe('parseEnv', () => {
  it('deve validar e retornar dados quando as variáveis estão corretas', () => {
    const schema = z.object({
      PORT: z.string().default('3000'),
      DATABASE_URL: z.string().url(),
    });

    const env = {
      PORT: '3000',
      DATABASE_URL: 'postgresql://postgres:pass@localhost:5432/db',
    };

    const parsed = parseEnv(schema, env);
    expect(parsed.PORT).toBe('3000');
    expect(parsed.DATABASE_URL).toBe('postgresql://postgres:pass@localhost:5432/db');
  });

  it('deve lançar erro listando apenas as chaves ausentes ou inválidas, nunca expondo valores', () => {
    const schema = z.object({
      SECRET_KEY: z.string().min(10),
      DATABASE_URL: z.string().url(),
    });

    const envWithInvalidValues = {
      SECRET_KEY: 'curto',
      DATABASE_URL: 'nao-e-uma-url-valida',
    };

    let errorMessage = '';
    try {
      parseEnv(schema, envWithInvalidValues);
    } catch (err: unknown) {
      if (err instanceof Error) {
        errorMessage = err.message;
      }
    }

    expect(errorMessage).toContain('SECRET_KEY');
    expect(errorMessage).toContain('DATABASE_URL');
    expect(errorMessage).not.toContain('curto');
    expect(errorMessage).not.toContain('nao-e-uma-url-valida');
  });
});
