import { describe, it, expect } from 'vitest';
import { HealthResponseSchema } from './health.schema';

describe('HealthResponseSchema', () => {
  it('deve aceitar payload válido', () => {
    const valid = {
      status: 'ok',
      service: '@fono/api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };

    const parsed = HealthResponseSchema.parse(valid);
    expect(parsed.status).toBe('ok');
    expect(parsed.service).toBe('@fono/api');
  });

  it('deve rejeitar status fora de ok ou degraded', () => {
    const invalid = {
      status: 'healthy',
      service: '@fono/api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };

    expect(() => HealthResponseSchema.parse(invalid)).toThrow();
  });

  it('deve rejeitar service vazio ou com mais de 50 caracteres', () => {
    const emptyService = {
      status: 'ok',
      service: '   ',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
    expect(() => HealthResponseSchema.parse(emptyService)).toThrow();

    const tooLongService = {
      status: 'ok',
      service: 'a'.repeat(51),
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
    expect(() => HealthResponseSchema.parse(tooLongService)).toThrow();
  });

  it('deve rejeitar version que não é semver', () => {
    const invalidVersion = {
      status: 'ok',
      service: '@fono/api',
      version: 'v1',
      timestamp: new Date().toISOString(),
    };
    expect(() => HealthResponseSchema.parse(invalidVersion)).toThrow();
  });

  it('deve rejeitar timestamp que não é ISO 8601', () => {
    const invalidDate = {
      status: 'ok',
      service: '@fono/api',
      version: '0.1.0',
      timestamp: '2026-10-19 10:00:00',
    };
    expect(() => HealthResponseSchema.parse(invalidDate)).toThrow();
  });
});
