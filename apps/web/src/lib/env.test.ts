import { describe, it, expect } from 'vitest';
import { loadWebEnv } from './env';

const VALID_PROD_FIREBASE_ENV = {
  VITE_FIREBASE_API_KEY: 'prod-web-key-placeholder',
  VITE_FIREBASE_AUTH_DOMAIN: 'fono-prod.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'fono-prod',
  VITE_FIREBASE_APP_ID: '1:999999999999:web:abcdef123456',
};

describe('WebEnvSchema (loadWebEnv)', () => {
  it('deve aceitar URL http e defaults de Firebase em desenvolvimento', () => {
    const result = loadWebEnv({
      VITE_API_URL: 'http://localhost:3000',
      VITE_FIREBASE_AUTH_EMULATOR_URL: 'http://127.0.0.1:9099',
      PROD: false,
    });
    expect(result.VITE_API_URL).toBe('http://localhost:3000');
    expect(result.VITE_FIREBASE_PROJECT_ID).toBe('demo-fono-local');
    expect(result.VITE_FIREBASE_AUTH_EMULATOR_URL).toBe('http://127.0.0.1:9099');
  });

  it('deve aceitar URL https e configuração Firebase completa em produção', () => {
    const result = loadWebEnv({
      VITE_API_URL: 'https://fono-api-xyz.a.run.app',
      ...VALID_PROD_FIREBASE_ENV,
      PROD: true,
    });
    expect(result.VITE_API_URL).toBe('https://fono-api-xyz.a.run.app');
    expect(result.VITE_FIREBASE_PROJECT_ID).toBe('fono-prod');
  });

  it('deve rejeitar URL não-https quando PROD for true', () => {
    expect(() =>
      loadWebEnv({
        VITE_API_URL: 'http://fono-api-xyz.a.run.app',
        ...VALID_PROD_FIREBASE_ENV,
        PROD: true,
      }),
    ).toThrow(/VITE_API_URL/);
  });

  it('deve rejeitar credenciais Firebase ausentes ou emulador ativo em produção', () => {
    expect(() =>
      loadWebEnv({
        VITE_API_URL: 'https://fono-api-xyz.a.run.app',
        PROD: true,
      }),
    ).toThrow(/VITE_FIREBASE_API_KEY/);

    expect(() =>
      loadWebEnv({
        VITE_API_URL: 'https://fono-api-xyz.a.run.app',
        ...VALID_PROD_FIREBASE_ENV,
        VITE_FIREBASE_AUTH_EMULATOR_URL: 'http://127.0.0.1:9099',
        PROD: true,
      }),
    ).toThrow(/VITE_FIREBASE_AUTH_EMULATOR_URL/);
  });

  it('deve rejeitar URL malformada', () => {
    expect(() =>
      loadWebEnv({
        VITE_API_URL: 'url-invalida',
        PROD: false,
      }),
    ).toThrow(/VITE_API_URL/);

    expect(() =>
      loadWebEnv({
        VITE_API_URL: 'http://localhost:3000',
        VITE_FIREBASE_AUTH_EMULATOR_URL: 'nao-e-url',
        PROD: false,
      }),
    ).toThrow(/VITE_FIREBASE_AUTH_EMULATOR_URL/);
  });
});
