import { HealthResponseSchema } from '@fono/shared';

describe('useHealth hook (mobile)', () => {
  it('deve validar estrutura do HealthResponse para mobile', () => {
    const mockData = {
      status: 'ok',
      service: '@fono/api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };

    const parsed = HealthResponseSchema.parse(mockData);
    expect(parsed.status).toBe('ok');
    expect(parsed.service).toBe('@fono/api');
  });

  it('deve rejeitar status desconhecido no mobile', () => {
    const invalidData = {
      status: 'invalid_status',
      service: '@fono/api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };

    expect(() => HealthResponseSchema.parse(invalidData)).toThrow();
  });
});
