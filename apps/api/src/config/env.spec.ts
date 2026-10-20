import { loadApiEnv } from './env';

describe('ApiEnvSchema (loadApiEnv)', () => {
  it('deve aplicar valores padrão seguros em ambiente development', () => {
    const parsed = loadApiEnv({});
    expect(parsed.NODE_ENV).toBe('development');
    expect(parsed.PORT).toBe('3000');
    expect(parsed.DATABASE_URL).toContain('postgresql://');
  });

  it('deve aceitar configuração válida de production sem expor segredos', () => {
    const parsed = loadApiEnv({
      NODE_ENV: 'production',
      PORT: '8080',
      DATABASE_URL: 'postgresql://user:supersecret@localhost/fono?host=/cloudsql/proj:region:inst',
      CORS_ORIGINS: 'https://fono-web-abc.a.run.app',
      AXIOM_TOKEN: 'xaat-token-123',
      AXIOM_DATASET: 'fono-prod-logs',
    });

    expect(parsed.NODE_ENV).toBe('production');
    expect(parsed.PORT).toBe('8080');
    expect(parsed.AXIOM_DATASET).toBe('fono-prod-logs');
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
