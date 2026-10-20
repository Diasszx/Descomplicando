import { describe, it, expect } from 'vitest';
import { loadWebEnv } from './env';

describe('WebEnvSchema (loadWebEnv)', () => {
  it('deve aceitar URL http em desenvolvimento', () => {
    const result = loadWebEnv({
      VITE_API_URL: 'http://localhost:3000',
      PROD: false,
    });
    expect(result.VITE_API_URL).toBe('http://localhost:3000');
  });

  it('deve aceitar URL https em produção', () => {
    const result = loadWebEnv({
      VITE_API_URL: 'https://fono-api-xyz.a.run.app',
      PROD: true,
    });
    expect(result.VITE_API_URL).toBe('https://fono-api-xyz.a.run.app');
  });

  it('deve rejeitar URL não-https quando PROD for true', () => {
    expect(() =>
      loadWebEnv({
        VITE_API_URL: 'http://fono-api-xyz.a.run.app',
        PROD: true,
      }),
    ).toThrow(/VITE_API_URL/);
  });

  it('deve rejeitar URL malformada', () => {
    expect(() =>
      loadWebEnv({
        VITE_API_URL: 'url-invalida',
        PROD: false,
      }),
    ).toThrow(/VITE_API_URL/);
  });
});
