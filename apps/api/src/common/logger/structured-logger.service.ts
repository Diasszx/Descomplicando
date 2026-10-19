import { Injectable, LoggerService } from '@nestjs/common';

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
]);

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
  private formatMessage(level: string, message: unknown, context?: string, ...optionalParams: unknown[]) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: context || 'Application',
      message: typeof message === 'string' ? message : maskSensitiveData(message),
      extra: optionalParams.length > 0 ? maskSensitiveData(optionalParams) : undefined,
    };
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
