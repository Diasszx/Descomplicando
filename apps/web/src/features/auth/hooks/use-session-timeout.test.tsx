import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SESSION_INACTIVITY_TIMEOUT_MS } from '@fono/shared';
import {
  AUTH_ACTIVITY_STORAGE_KEY,
  AUTH_EVENT_STORAGE_KEY,
  broadcastSessionEvent,
  useSessionTimeout,
} from './use-session-timeout';

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  readonly name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  private listeners: Array<(event: MessageEvent) => void> = [];

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  postMessage(data: unknown) {
    for (const instance of MockBroadcastChannel.instances) {
      if (instance !== this && instance.name === this.name) {
        const messageEvent = { data } as MessageEvent;
        instance.onmessage?.(messageEvent);
        for (const listener of instance.listeners) {
          listener(messageEvent);
        }
      }
    }
  }

  addEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners.push(listener);
  }

  removeEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  close() {
    MockBroadcastChannel.instances = MockBroadcastChannel.instances.filter((i) => i !== this);
  }
}

describe('useSessionTimeout (US4 — Timeout 30 min e Sync Multi-Abas)', () => {
  const originalBroadcastChannel = globalThis.BroadcastChannel;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-21T12:00:00.000Z'));
    localStorage.clear();
    sessionStorage.clear();
    MockBroadcastChannel.instances = [];
    Object.defineProperty(globalThis, 'BroadcastChannel', {
      writable: true,
      configurable: true,
      value: MockBroadcastChannel,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(globalThis, 'BroadcastChannel', {
      writable: true,
      configurable: true,
      value: originalBroadcastChannel,
    });
  });

  it('deve encerrar sessão automaticamente após 30 minutos consecutivos de inatividade e propagar para outra aba', () => {
    const onTabATimeout = vi.fn();
    const onTabBTimeout = vi.fn();

    renderHook(() =>
      useSessionTimeout({
        enabled: true,
        onTimeout: onTabATimeout,
        onRemoteLogout: vi.fn(),
      }),
    );

    renderHook(() =>
      useSessionTimeout({
        enabled: true,
        onTimeout: onTabBTimeout,
        onRemoteLogout: vi.fn(),
      }),
    );

    // 29 minutos — ainda ativo
    act(() => {
      vi.advanceTimersByTime(SESSION_INACTIVITY_TIMEOUT_MS - 60_000);
    });
    expect(onTabATimeout).not.toHaveBeenCalled();
    expect(onTabBTimeout).not.toHaveBeenCalled();

    // Completa 30 minutos — ambas as abas disparam timeout imediatamente
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(onTabATimeout).toHaveBeenCalledTimes(1);
    expect(onTabBTimeout).toHaveBeenCalledTimes(1);
  });

  it('deve renovar janela de atividade com throttle quando o usuário interage, sem gravar dados sensíveis em storage', () => {
    const onTimeout = vi.fn();

    renderHook(() =>
      useSessionTimeout({
        enabled: true,
        onTimeout,
        onRemoteLogout: vi.fn(),
      }),
    );

    // Avança 20 minutos e registra interação
    act(() => {
      vi.advanceTimersByTime(20 * 60 * 1000);
      window.dispatchEvent(new Event('pointerdown'));
    });

    // Mais 20 minutos (40 min do início, mas apenas 20 min da última atividade) -> NÃO expira
    act(() => {
      vi.advanceTimersByTime(20 * 60 * 1000);
    });
    expect(onTimeout).not.toHaveBeenCalled();

    // Verifica que storage contém apenas timestamp/metadado e nenhum dado sensível
    const activityValue = localStorage.getItem(AUTH_ACTIVITY_STORAGE_KEY);
    expect(activityValue).toMatch(/^\d+$/);
    const serializedLocal = JSON.stringify(localStorage);
    const serializedSession = JSON.stringify(sessionStorage);
    for (const dump of [serializedLocal, serializedSession]) {
      expect(dump).not.toMatch(/token|role|userid|ADMIN|PROFISSIONAL|PACIENTE|AUTONOMO/i);
    }

    // Completa mais 10 minutos (30 min sem atividade) -> expira
    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1000);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('deve propagar evento LOGOUT imediato entre abas via BroadcastChannel e fallback storage', () => {
    const onRemoteLogoutA = vi.fn();
    const onRemoteLogoutB = vi.fn();

    renderHook(() =>
      useSessionTimeout({
        enabled: true,
        onTimeout: vi.fn(),
        onRemoteLogout: onRemoteLogoutA,
      }),
    );

    renderHook(() =>
      useSessionTimeout({
        enabled: true,
        onTimeout: vi.fn(),
        onRemoteLogout: onRemoteLogoutB,
      }),
    );

    act(() => {
      broadcastSessionEvent('LOGOUT');
    });

    expect(onRemoteLogoutA).toHaveBeenCalledTimes(1);
    expect(onRemoteLogoutB).toHaveBeenCalledTimes(1);

    // Simula fallback via StorageEvent vindo de outra aba com novo timestamp
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: AUTH_EVENT_STORAGE_KEY,
          newValue: JSON.stringify({ type: 'LOGOUT', timestamp: Date.now() + 1 }),
        }),
      );
    });

    expect(onRemoteLogoutA).toHaveBeenCalledTimes(2);
  });

  it('deve sincronizar atividade entre abas (Tab B mantém Tab A ativa) e distinguir onTimeout local de onRemoteTimeout', () => {
    const onLocalTimeoutA = vi.fn();
    const onRemoteTimeoutA = vi.fn();
    const onLocalTimeoutB = vi.fn();
    const onRemoteTimeoutB = vi.fn();

    renderHook(() =>
      useSessionTimeout({
        enabled: true,
        senderId: 'tab-A',
        onTimeout: onLocalTimeoutA,
        onRemoteTimeout: onRemoteTimeoutA,
        onRemoteLogout: vi.fn(),
      }),
    );

    renderHook(() =>
      useSessionTimeout({
        enabled: true,
        senderId: 'tab-B',
        onTimeout: onLocalTimeoutB,
        onRemoteTimeout: onRemoteTimeoutB,
        onRemoteLogout: vi.fn(),
      }),
    );

    // Após 20 min, atividade ocorre em uma 3a aba ('tab-C') e propaga via canal mantendo Tab A e Tab B ativas
    act(() => {
      vi.advanceTimersByTime(20 * 60 * 1000);
      const externalChannel = new MockBroadcastChannel('fono-auth-session');
      externalChannel.postMessage({
        type: 'ACTIVITY',
        timestamp: Date.now(),
        senderId: 'tab-C',
      });
      externalChannel.close();
    });

    // Mais 15 min (35 min desde o início, mas apenas 15 min desde atividade na outra aba) -> nenhuma aba expira!
    act(() => {
      vi.advanceTimersByTime(15 * 60 * 1000);
    });
    expect(onLocalTimeoutA).not.toHaveBeenCalled();
    expect(onRemoteTimeoutA).not.toHaveBeenCalled();
    expect(onLocalTimeoutB).not.toHaveBeenCalled();
    expect(onRemoteTimeoutB).not.toHaveBeenCalled();

    // Mais 15 min (30 min após última atividade) -> 1 aba expira localmente e a outra recebe onRemoteTimeout
    act(() => {
      vi.advanceTimersByTime(15 * 60 * 1000);
    });
    expect(onLocalTimeoutA.mock.calls.length + onLocalTimeoutB.mock.calls.length).toBe(1);
    expect(onRemoteTimeoutA.mock.calls.length + onRemoteTimeoutB.mock.calls.length).toBe(1);
  });

  it('deve expirar imediatamente (em vez de renovar) ao acordar após > 30 min com timer suspenso (sleep/aba em segundo plano)', () => {
    const onTimeout = vi.fn();

    renderHook(() =>
      useSessionTimeout({
        enabled: true,
        senderId: 'tab-sleep',
        onTimeout,
        onRemoteLogout: vi.fn(),
      }),
    );

    // Simula relógio do sistema saltando 45 min sem disparar setTimeout (ex.: suspensão do SO)
    vi.setSystemTime(new Date('2026-11-21T12:45:00.000Z'));

    // Ao focar a janela após 45 min, a sessão DEVE encerrar imediatamente e NÃO renovar!
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('deve deduplicar evento LOGOUT recebido simultaneamente via BroadcastChannel e StorageEvent', () => {
    const onRemoteLogout = vi.fn();

    renderHook(() =>
      useSessionTimeout({
        enabled: true,
        senderId: 'tab-receiver',
        onTimeout: vi.fn(),
        onRemoteLogout,
      }),
    );

    const ts = Date.now() + 500;
    act(() => {
      const sender = new MockBroadcastChannel('fono-auth-session');
      sender.postMessage({ type: 'LOGOUT', timestamp: ts, senderId: 'tab-sender' });
      sender.close();

      window.dispatchEvent(
        new StorageEvent('storage', {
          key: AUTH_EVENT_STORAGE_KEY,
          newValue: JSON.stringify({ type: 'LOGOUT', timestamp: ts, senderId: 'tab-sender' }),
        }),
      );
    });

    expect(onRemoteLogout).toHaveBeenCalledTimes(1);
  });
});
