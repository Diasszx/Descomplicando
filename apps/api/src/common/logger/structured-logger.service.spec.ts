import { StructuredLoggerService } from './structured-logger.service';

describe('StructuredLoggerService', () => {
  let logger: StructuredLoggerService;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new StructuredLoggerService();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve emitir JSON estruturado com severity compatível com Google Cloud Logging', () => {
    logger.log('Servidor iniciado', 'Bootstrap');

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const loggedJson = JSON.parse(consoleLogSpy.mock.calls[0][0] as string) as Record<string, unknown>;
    expect(loggedJson.level).toBe('info');
    expect(loggedJson.severity).toBe('INFO');
    expect(loggedJson.context).toBe('Bootstrap');
    expect(loggedJson.message).toBe('Servidor iniciado');
  });

  it('deve mascarar recursivamente chaves sensíveis (password, token, secret, authorization, database_url)', () => {
    logger.error(
      {
        event: 'auth_failed',
        password: 'plain-password',
        token: 'jwt-token-xyz',
        database_url: 'postgresql://user:secret@host/db',
        nested: {
          authorization: 'Bearer secret-jwt',
          secret: 'my-secret',
          safeField: 'visivel',
        },
      },
      'stack-trace-line',
      'AuthGuard',
    );

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const loggedString = consoleErrorSpy.mock.calls[0][0] as string;
    expect(loggedString).not.toContain('plain-password');
    expect(loggedString).not.toContain('jwt-token-xyz');
    expect(loggedString).not.toContain('postgresql://user:secret@host/db');
    expect(loggedString).not.toContain('Bearer secret-jwt');
    expect(loggedString).not.toContain('my-secret');

    const parsed = JSON.parse(loggedString) as {
      severity: string;
      message: {
        password: string;
        token: string;
        database_url: string;
        nested: { authorization: string; secret: string; safeField: string };
      };
    };
    expect(parsed.severity).toBe('ERROR');
    expect(parsed.message.password).toBe('[REDACTED]');
    expect(parsed.message.token).toBe('[REDACTED]');
    expect(parsed.message.database_url).toBe('[REDACTED]');
    expect(parsed.message.nested.authorization).toBe('[REDACTED]');
    expect(parsed.message.nested.secret).toBe('[REDACTED]');
    expect(parsed.message.nested.safeField).toBe('visivel');
  });

  it('deve enviar log mascarado assincronamente para o Axiom quando configurado', async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true });
    const axiomLogger = new StructuredLoggerService({
      axiomToken: 'xaat-secret-token',
      axiomDataset: 'fono-prod-logs',
      fetchImpl: fetchSpy,
    });

    axiomLogger.log({ user: 'u1', token: 'hidden-token' }, 'TestAxiom');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0] as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe('https://api.axiom.co/v1/datasets/fono-prod-logs/ingest');
    expect(options.headers.Authorization).toBe('Bearer xaat-secret-token');
    expect(options.body).not.toContain('hidden-token');
    expect(options.body).toContain('[REDACTED]');
  });

  it('deve redigir segredos de Auth, MFA TOTP, senhas e chaves privadas Firebase (FR-014)', () => {
    logger.log(
      {
        event: 'mfa_audit',
        newPassword: 'NewPassword1',
        currentPassword: 'TempPassword1',
        confirmPassword: 'NewPassword1',
        mfaSecret: 'JBSWY3DPEHPK3PXP',
        mfaSecretEncrypted: 'iv:tag:cipher',
        mfaPendingSecretEncrypted: 'iv2:tag2:cipher2',
        otpauthUri: 'otpauth://totp/FonoGames:pro@fono.com?secret=JBSWY3DPEHPK3PXP',
        manualEntryKey: 'JBSWY3DPEHPK3PXP',
        totp: '123456',
        totpCode: '654321',
        code: '987654',
        FIREBASE_PRIVATE_KEY: 'private-key-secret-value',
        MFA_ENCRYPTION_KEY: 'a1'.repeat(16),
        actorUserId: 'user-safe-id',
      },
      'AuthService',
    );

    const loggedString = consoleLogSpy.mock.calls[0][0] as string;
    expect(loggedString).not.toContain('NewPassword1');
    expect(loggedString).not.toContain('TempPassword1');
    expect(loggedString).not.toContain('JBSWY3DPEHPK3PXP');
    expect(loggedString).not.toContain('iv:tag:cipher');
    expect(loggedString).not.toContain('iv2:tag2:cipher2');
    expect(loggedString).not.toContain('123456');
    expect(loggedString).not.toContain('654321');
    expect(loggedString).not.toContain('987654');
    expect(loggedString).not.toContain('private-key-secret-value');
    expect(loggedString).not.toContain('0123456789abcdef0123456789abcdef');
    expect(loggedString).toContain('user-safe-id');
  });

  it('deve redigir Bearer tokens e URIs otpauth em mensagens de texto livre', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    logger.warn(
      'Falha com Bearer eyJhbGciOiJSUzI1NiJ9.payload.sig e otpauth://totp/FonoGames:a@b.com?secret=SECRET',
      'AuthGuard',
    );
    const firstCall = consoleWarnSpy.mock.calls[0];
    expect(firstCall).toBeDefined();
    const logged = (firstCall?.[0] ?? '') as string;
    expect(logged).not.toContain('eyJhbGciOiJSUzI1NiJ9');
    expect(logged).not.toContain('secret=SECRET');
    expect(logged).toContain('Bearer [REDACTED]');
    expect(logged).toContain('otpauth://totp/[REDACTED]');
  });

  it('deve redigir confirmNewPassword, chaves PEM privadas e lidar com Error, Date e referências circulares', () => {
    const circular: Record<string, unknown> = {
      confirmNewPassword: 'NovaSenhaSuperSecreta1',
      when: new Date('2026-11-21T12:00:00.000Z'),
      err: new Error(
        'Falha com -----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0\n-----END PRIVATE KEY-----',
      ),
    };
    circular['self'] = circular;

    logger.error(circular, undefined, 'SecurityAudit');

    const logged = consoleErrorSpy.mock.calls[0][0] as string;
    expect(logged).not.toContain('NovaSenhaSuperSecreta1');
    expect(logged).not.toContain('MIIEvQIBADANBgkqhkiG9w0');
    expect(logged).toContain('[REDACTED_PRIVATE_KEY]');
    expect(logged).toContain('2026-11-21T12:00:00.000Z');
    expect(logged).toContain('[CIRCULAR]');
  });
});
