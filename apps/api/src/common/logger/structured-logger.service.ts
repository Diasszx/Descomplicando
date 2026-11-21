import { Injectable, LoggerService, Optional } from '@nestjs/common';

const SENSITIVE_KEYS = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'confirmpassword',
  'confirmnewpassword',
  'token',
  'idtoken',
  'accesstoken',
  'refreshtoken',
  'secret',
  'mfasecret',
  'mfasecretencrypted',
  'mfapendingsecretencrypted',
  'otpauthuri',
  'manualentrykey',
  'totp',
  'totpcode',
  'code',
  'authorization',
  'cookie',
  'creditcard',
  'database_url',
  'axiom_token',
  'firebase_private_key',
  'mfa_encryption_key',
]);

function maskSensitiveString(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(/otpauth:\/\/totp\/[^\s"'`]+/gi, 'otpauth://totp/[REDACTED]')
    .replace(
      /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
      '[REDACTED_PRIVATE_KEY]',
    );
}

type CloudLoggingSeverity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';

const SEVERITY_MAP: Record<string, CloudLoggingSeverity> = {
  verbose: 'DEBUG',
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
};

export interface StructuredLoggerOptions {
  axiomToken?: string | undefined;
  axiomDataset?: string | undefined;
  fetchImpl?: typeof fetch | undefined;
}

function maskSensitiveData(obj: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof obj === 'string') {
    return maskSensitiveString(obj);
  }

  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: maskSensitiveString(obj.message),
    };
  }

  if (seen.has(obj)) {
    return '[CIRCULAR]';
  }
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveData(item, seen));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = maskSensitiveData(value, seen);
    } else if (typeof value === 'string') {
      sanitized[key] = maskSensitiveString(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

@Injectable()
export class StructuredLoggerService implements LoggerService {
  private readonly axiomToken: string | undefined;
  private readonly axiomDataset: string | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(@Optional() options?: StructuredLoggerOptions) {
    this.axiomToken = options?.axiomToken ?? process.env.AXIOM_TOKEN;
    this.axiomDataset = options?.axiomDataset ?? process.env.AXIOM_DATASET;
    this.fetchImpl = options?.fetchImpl ?? globalThis.fetch;
  }

  private buildLogEntry(
    level: string,
    message: unknown,
    context?: string,
    ...optionalParams: unknown[]
  ): Record<string, unknown> {
    return {
      timestamp: new Date().toISOString(),
      level,
      severity: SEVERITY_MAP[level] ?? 'INFO',
      context: context || 'Application',
      message: typeof message === 'string' ? maskSensitiveString(message) : maskSensitiveData(message),
      extra: optionalParams.length > 0 ? maskSensitiveData(optionalParams) : undefined,
    };
  }

  private dispatchToAxiom(entry: Record<string, unknown>): void {
    if (!this.axiomToken || !this.axiomDataset || typeof this.fetchImpl !== 'function') {
      return;
    }

    const url = `https://api.axiom.co/v1/datasets/${encodeURIComponent(this.axiomDataset)}/ingest`;
    void Promise.resolve(
      this.fetchImpl(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.axiomToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([entry]),
      }),
    ).catch(() => {
      // Falha silenciosa de telemetria externa para nunca interromper o fluxo da API
    });
  }

  private formatMessage(
    level: string,
    message: unknown,
    context?: string,
    ...optionalParams: unknown[]
  ): string {
    const logEntry = this.buildLogEntry(level, message, context, ...optionalParams);
    this.dispatchToAxiom(logEntry);
    return JSON.stringify(logEntry);
  }

  log(message: unknown, context?: string, ...optionalParams: unknown[]) {
    console.log(this.formatMessage('info', message, context, ...optionalParams));
  }

  error(message: unknown, trace?: string, context?: string) {
    console.error(this.formatMessage('error', message, context, { trace }));
  }

  warn(message: unknown, context?: string, ...optionalParams: unknown[]) {
    console.warn(this.formatMessage('warn', message, context, ...optionalParams));
  }

  debug?(message: unknown, context?: string, ...optionalParams: unknown[]) {
    console.debug(this.formatMessage('debug', message, context, ...optionalParams));
  }

  verbose?(message: unknown, context?: string, ...optionalParams: unknown[]) {
    console.log(this.formatMessage('verbose', message, context, ...optionalParams));
  }
}
