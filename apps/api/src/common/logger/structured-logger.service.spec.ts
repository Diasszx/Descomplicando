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
});
