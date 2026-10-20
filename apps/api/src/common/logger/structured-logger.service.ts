import { Injectable, LoggerService, Optional } from '@nestjs/common';

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'idtoken',
  'accesstoken',
  'refreshtoken',
  'secret',
  'authorization',
  'cookie',
  'creditcard',
  'database_url',
  'axiom_token',
]);

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

function maskSensitiveData(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(maskSensitiveData);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = maskSensitiveData(value);
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
      message: typeof message === 'string' ? message : maskSensitiveData(message),
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
