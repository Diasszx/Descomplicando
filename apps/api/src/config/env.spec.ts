import { loadApiEnv, parseMfaEncryptionKey } from './env';

const VALID_HEX_KEY = 'a1'.repeat(32);
const VALID_BASE64_KEY = Buffer.alloc(32, 7).toString('base64');

describe('ApiEnvSchema (loadApiEnv)', () => {
  it('deve aplicar valores padrão seguros em ambiente development', () => {
    const parsed = loadApiEnv({});
    expect(parsed.NODE_ENV).toBe('development');
    expect(parsed.PORT).toBe('3000');
    expect(parsed.DATABASE_URL).toContain('postgresql://');
    expect(parsed.FIREBASE_PROJECT_ID).toBe('demo-fono-local');
    expect(parseMfaEncryptionKey(parsed.MFA_ENCRYPTION_KEY)).not.toBeNull();
  });

  it('deve aceitar configuração válida de production sem expor segredos e normalizar \\n na private key', () => {
    const parsed = loadApiEnv({
      NODE_ENV: 'production',
      PORT: '8080',
      DATABASE_URL: 'postgresql://user:supersecret@localhost/fono?host=/cloudsql/proj:region:inst',
      CORS_ORIGINS: 'https://fono-web-abc.a.run.app',
      AXIOM_TOKEN: 'xaat-token-123',
      AXIOM_DATASET: 'fono-prod-logs',
      FIREBASE_PROJECT_ID: 'fono-prod',
      FIREBASE_CLIENT_EMAIL: 'firebase-admin@fono-prod.iam.gserviceaccount.com',
      FIREBASE_PRIVATE_KEY: 'line-1\\nline-2\\nline-3',
      MFA_ENCRYPTION_KEY: VALID_HEX_KEY,
    });

    expect(parsed.NODE_ENV).toBe('production');
    expect(parsed.PORT).toBe('8080');
    expect(parsed.AXIOM_DATASET).toBe('fono-prod-logs');
    expect(parsed.FIREBASE_PRIVATE_KEY).toBe('line-1\nline-2\nline-3');
  });

  it('deve aceitar MFA_ENCRYPTION_KEY em base64 (32 bytes) e FIREBASE_AUTH_EMULATOR_HOST em development', () => {
    const parsed = loadApiEnv({
      NODE_ENV: 'development',
      FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
      MFA_ENCRYPTION_KEY: VALID_BASE64_KEY,
    });

    expect(parsed.FIREBASE_AUTH_EMULATOR_HOST).toBe('127.0.0.1:9099');
    expect(parseMfaEncryptionKey(parsed.MFA_ENCRYPTION_KEY)?.length).toBe(32);
  });

  it('deve rejeitar MFA_ENCRYPTION_KEY fora de 32 bytes sem vazar o valor no erro', () => {
    const invalidKey = 'chave-curta-invalida';
    try {
      loadApiEnv({
        NODE_ENV: 'development',
        MFA_ENCRYPTION_KEY: invalidKey,
      });
      fail('Deveria ter lançado erro para MFA_ENCRYPTION_KEY inválida');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain('MFA_ENCRYPTION_KEY');
      expect(message).not.toContain(invalidKey);
    }
  });

  it('deve rejeitar credenciais Firebase ausentes ou emulador ativo em production', () => {
    expect(() =>
      loadApiEnv({
        NODE_ENV: 'production',
        PORT: '8080',
        DATABASE_URL: 'postgresql://user:secret@localhost:5432/fono',
        CORS_ORIGINS: 'https://fono-web.a.run.app',
        FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
      }),
    ).toThrow(/FIREBASE_CLIENT_EMAIL/);
  });

  it('deve rejeitar CORS wildcard (*) ou localhost quando NODE_ENV=production', () => {
    expect(() =>
      loadApiEnv({
        NODE_ENV: 'production',
        PORT: '8080',
        DATABASE_URL: 'postgresql://user:secret@localhost:5432/fono',
        CORS_ORIGINS: '*',
      }),
    ).toThrow(/CORS_ORIGINS/);

    expect(() =>
      loadApiEnv({
        NODE_ENV: 'production',
        PORT: '8080',
        DATABASE_URL: 'postgresql://user:secret@localhost:5432/fono',
        CORS_ORIGINS: 'http://localhost:5173',
      }),
    ).toThrow(/CORS_ORIGINS/);
  });

  it('deve rejeitar DATABASE_URL que não utiliza protocolo postgresql/postgres e não vazar o valor no erro', () => {
    const invalidSecretUrl = 'mysql://admin:SenhaUltraSecreta123@host:3306/db';
    try {
      loadApiEnv({
        NODE_ENV: 'production',
        PORT: '8080',
        DATABASE_URL: invalidSecretUrl,
        CORS_ORIGINS: 'https://fono-web.a.run.app',
      });
      fail('Deveria ter lançado erro para DATABASE_URL inválida');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain('DATABASE_URL');
      expect(message).not.toContain('SenhaUltraSecreta123');
    }
  });
});
