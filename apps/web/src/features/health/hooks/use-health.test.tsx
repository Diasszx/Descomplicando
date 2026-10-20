import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useHealth } from './use-health';
import { apiClient } from '@/lib/api-client';
import React from 'react';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockedGet = vi.mocked(apiClient.get);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useHealth hook (web)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar dados de saúde validados pelo schema com sucesso', async () => {
    const mockHealth = {
      status: 'ok',
      service: '@fono/api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      database: 'up',
    };

    mockedGet.mockResolvedValueOnce({ data: mockHealth });

    const { result } = renderHook(() => useHealth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.status).toBe('ok');
    expect(result.current.data?.service).toBe('@fono/api');
    expect(result.current.data?.database).toBe('up');
  });

  it('deve falhar quando a API retornar payload inválido', async () => {
    const invalidHealth = {
      status: 'unknown_status',
    };

    mockedGet.mockResolvedValueOnce({ data: invalidHealth });

    const { result } = renderHook(() => useHealth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
