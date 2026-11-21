import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { apiClient, configureApiAuthHandlers } from './api-client';

describe('apiClient interceptors (Bearer token, retry silencioso 401 e revogação)', () => {
  const originalAdapter = apiClient.defaults.adapter;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    configureApiAuthHandlers(null);
    if (originalAdapter !== undefined) {
      apiClient.defaults.adapter = originalAdapter;
    } else {
      delete apiClient.defaults.adapter;
    }
  });

  it('deve anexar Bearer token obtido em memória e realizar 1 único retry silencioso em 401 INVALID_TOKEN', async () => {
    const getToken = vi
      .fn<(forceRefresh?: boolean) => Promise<string | null>>()
      .mockResolvedValueOnce('expired-token')
      .mockResolvedValueOnce('fresh-token');
    const onSessionInvalidated = vi.fn();

    configureApiAuthHandlers({ getToken, onSessionInvalidated });

    let callCount = 0;
    const mockAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
      callCount += 1;
      const authHeader = config.headers.get('Authorization');
      if (callCount === 1) {
        expect(authHeader).toBe('Bearer expired-token');
        return Promise.reject({
          isAxiosError: true,
          config,
          response: {
            status: 401,
            data: {
              statusCode: 401,
              code: 'INVALID_TOKEN',
              message: 'Sessão inválida ou expirada. Faça login novamente.',
            },
          },
        });
      }

      expect(authHeader).toBe('Bearer fresh-token');
      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    apiClient.defaults.adapter = mockAdapter;

    const response = await apiClient.get<{ ok: boolean }>('/auth/me');
    expect(response.data.ok).toBe(true);
    expect(callCount).toBe(2);
    expect(getToken).toHaveBeenNthCalledWith(1, false);
    expect(getToken).toHaveBeenNthCalledWith(2, true);
    expect(onSessionInvalidated).not.toHaveBeenCalled();
  });

  it('deve encerrar sessão imediatamente sem retry ao receber 401 TOKEN_REVOKED ou 403 ACCOUNT_INACTIVE', async () => {
    const getToken = vi.fn().mockResolvedValue('revoked-token');
    const onSessionInvalidated = vi.fn();
    configureApiAuthHandlers({ getToken, onSessionInvalidated });

    let callCount = 0;
    const revokedAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
      callCount += 1;
      return Promise.reject({
        isAxiosError: true,
        config,
        response: {
          status: 401,
          data: {
            statusCode: 401,
            code: 'TOKEN_REVOKED',
            message: 'Sua sessão foi encerrada. Faça login novamente.',
          },
        },
      });
    };

    apiClient.defaults.adapter = revokedAdapter;

    await expect(apiClient.get('/auth/me')).rejects.toBeDefined();
    expect(callCount).toBe(1);
    expect(onSessionInvalidated).toHaveBeenCalledWith('revoked');

    onSessionInvalidated.mockClear();
    callCount = 0;
    apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      callCount += 1;
      return Promise.reject({
        isAxiosError: true,
        config,
        response: {
          status: 403,
          data: {
            statusCode: 403,
            code: 'ACCOUNT_INACTIVE',
            message: 'Esta conta está inativa ou foi desativada. Entre em contato com o suporte.',
          },
        },
      });
    };

    await expect(apiClient.get('/auth/me')).rejects.toBeDefined();
    expect(callCount).toBe(1);
    expect(onSessionInvalidated).toHaveBeenCalledWith('inactive');
  });

  it('deve deduplicar refresh concorrente de token em 401 INVALID_TOKEN e respeitar _fonoSkipInvalidationOn401', async () => {
    let refreshCalls = 0;
    const getToken = vi.fn(async (forceRefresh?: boolean) => {
      if (forceRefresh) {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'shared-fresh-token';
      }
      return 'stale-token';
    });
    const onSessionInvalidated = vi.fn();
    configureApiAuthHandlers({ getToken, onSessionInvalidated });

    apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      if (config.headers.get('Authorization') === 'Bearer stale-token') {
        return Promise.reject({
          isAxiosError: true,
          config,
          response: {
            status: 401,
            data: {
              statusCode: 401,
              code: 'INVALID_TOKEN',
              message: 'Sessão inválida ou expirada. Faça login novamente.',
            },
          },
        });
      }
      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    const [resA, resB] = await Promise.all([
      apiClient.get<{ ok: boolean }>('/auth/me'),
      apiClient.get<{ ok: boolean }>('/auth/me'),
    ]);
    expect(resA.data.ok).toBe(true);
    expect(resB.data.ok).toBe(true);
    expect(refreshCalls).toBe(1);
    expect(onSessionInvalidated).not.toHaveBeenCalled();

    // Testa _fonoSkipInvalidationOn401 para sonda de bootstrap sem disparar logout prematuro
    apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) =>
      Promise.reject({
        isAxiosError: true,
        config,
        response: {
          status: 401,
          data: {
            statusCode: 401,
            code: 'INVALID_TOKEN',
            message: 'Sessão inválida ou expirada. Faça login novamente.',
          },
        },
      });

    await expect(
      apiClient.get('/auth/me', {
        _fonoSkipInvalidationOn401: true,
      } as Parameters<typeof apiClient.get>[1]),
    ).rejects.toBeDefined();
    expect(onSessionInvalidated).not.toHaveBeenCalled();
  });
});
