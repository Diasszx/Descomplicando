import * as React from 'react';
import { SESSION_INACTIVITY_TIMEOUT_MS } from '@fono/shared';

export const AUTH_SESSION_CHANNEL_NAME = 'fono-auth-session';
export const AUTH_ACTIVITY_STORAGE_KEY = 'fono:auth:activity';
export const AUTH_EVENT_STORAGE_KEY = 'fono:auth:event';

const ACTIVITY_BROADCAST_THROTTLE_MS = 15_000;
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'focus'] as const;

export type SessionSyncEventType = 'LOGOUT' | 'TIMEOUT';

interface SessionChannelMessage {
  type: SessionSyncEventType | 'ACTIVITY';
  timestamp: number;
  senderId?: string;
}

let instanceCounter = 0;

export function createSessionSenderId(): string {
  instanceCounter += 1;
  return `tab-${Date.now()}-${instanceCounter}`;
}

function safeSetLocalStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignora falha em contextos com storage bloqueado (ex.: modo privado restrito)
  }
}

export function broadcastSessionEvent(type: SessionSyncEventType, senderId?: string): void {
  const payload: SessionChannelMessage = {
    type,
    timestamp: Date.now(),
    ...(senderId ? { senderId } : {}),
  };

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(AUTH_SESSION_CHANNEL_NAME);
      channel.postMessage(payload);
      channel.close();
    } catch {
      // Fallback para storage event abaixo
    }
  }

  // Apenas metadado de evento não-sensível (zero tokens, roles ou userId)
  safeSetLocalStorage(
    AUTH_EVENT_STORAGE_KEY,
    JSON.stringify({
      type: payload.type,
      timestamp: payload.timestamp,
      ...(senderId ? { senderId } : {}),
    }),
  );
}

function parseSessionChannelMessage(raw: unknown): SessionChannelMessage | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  const type = candidate['type'];
  const timestamp = candidate['timestamp'];
  const senderId = candidate['senderId'];

  if (
    (type === 'LOGOUT' || type === 'TIMEOUT' || type === 'ACTIVITY') &&
    typeof timestamp === 'number' &&
    Number.isFinite(timestamp)
  ) {
    return {
      type,
      timestamp,
      ...(typeof senderId === 'string' ? { senderId } : {}),
    };
  }
  return null;
}

export interface UseSessionTimeoutOptions {
  enabled: boolean;
  onTimeout: () => void;
  onRemoteTimeout?: () => void;
  onRemoteLogout: () => void;
  timeoutMs?: number;
  senderId?: string;
}

export function useSessionTimeout({
  enabled,
  onTimeout,
  onRemoteTimeout,
  onRemoteLogout,
  timeoutMs = SESSION_INACTIVITY_TIMEOUT_MS,
  senderId: explicitSenderId,
}: UseSessionTimeoutOptions): void {
  const onTimeoutRef = React.useRef(onTimeout);
  const onRemoteTimeoutRef = React.useRef(onRemoteTimeout ?? onTimeout);
  const onRemoteLogoutRef = React.useRef(onRemoteLogout);
  onTimeoutRef.current = onTimeout;
  onRemoteTimeoutRef.current = onRemoteTimeout ?? onTimeout;
  onRemoteLogoutRef.current = onRemoteLogout;

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    const senderId = explicitSenderId ?? createSessionSenderId();
    let lastActivityMs = Date.now();
    let lastBroadcastMs = 0;
    let lastHandledEventKey: string | null = null;
    let hasTimedOut = false;
    let timeoutTimer: number | null = null;
    let channel: BroadcastChannel | null = null;

    const clearTimer = () => {
      if (timeoutTimer !== null) {
        window.clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }
    };

    const triggerLocalTimeout = () => {
      if (hasTimedOut) {
        return;
      }
      hasTimedOut = true;
      clearTimer();
      broadcastSessionEvent('TIMEOUT', senderId);
      onTimeoutRef.current();
    };

    const scheduleTimer = () => {
      clearTimer();
      if (hasTimedOut) {
        return;
      }
      const elapsed = Date.now() - lastActivityMs;
      const remaining = Math.max(0, timeoutMs - elapsed);
      timeoutTimer = window.setTimeout(() => {
        if (Date.now() - lastActivityMs >= timeoutMs) {
          triggerLocalTimeout();
        } else {
          scheduleTimer();
        }
      }, remaining);
    };

    const registerActivity = (timestamp: number, shouldBroadcast: boolean) => {
      if (hasTimedOut) {
        return;
      }
      if (timestamp > lastActivityMs) {
        lastActivityMs = timestamp;
      }
      scheduleTimer();

      if (shouldBroadcast && timestamp - lastBroadcastMs >= ACTIVITY_BROADCAST_THROTTLE_MS) {
        lastBroadcastMs = timestamp;
        safeSetLocalStorage(AUTH_ACTIVITY_STORAGE_KEY, String(timestamp));
        if (channel) {
          try {
            const msg: SessionChannelMessage = { type: 'ACTIVITY', timestamp, senderId };
            channel.postMessage(msg);
          } catch {
            // Fallback já gravado no storage
          }
        }
      }
    };

    const handleMessage = (message: SessionChannelMessage) => {
      if (message.senderId && message.senderId === senderId) {
        return;
      }

      if (message.type === 'ACTIVITY') {
        registerActivity(message.timestamp, false);
        return;
      }

      // Deduplica entrega simultânea via BroadcastChannel + fallback StorageEvent
      const eventKey = `${message.type}:${message.timestamp}:${message.senderId ?? ''}`;
      if (lastHandledEventKey === eventKey) {
        return;
      }
      lastHandledEventKey = eventKey;

      if (message.type === 'TIMEOUT') {
        hasTimedOut = true;
        clearTimer();
        onRemoteTimeoutRef.current();
      } else if (message.type === 'LOGOUT') {
        clearTimer();
        onRemoteLogoutRef.current();
      }
    };

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel(AUTH_SESSION_CHANNEL_NAME);
        channel.addEventListener('message', (event: MessageEvent) => {
          const parsed = parseSessionChannelMessage(event.data);
          if (parsed) {
            handleMessage(parsed);
          }
        });
      } catch {
        channel = null;
      }
    }

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === AUTH_ACTIVITY_STORAGE_KEY && event.newValue) {
        const parsedTimestamp = Number(event.newValue);
        if (Number.isFinite(parsedTimestamp)) {
          registerActivity(parsedTimestamp, false);
        }
        return;
      }

      if (event.key === AUTH_EVENT_STORAGE_KEY && event.newValue) {
        try {
          const parsedJson: unknown = JSON.parse(event.newValue);
          const parsed = parseSessionChannelMessage(parsedJson);
          if (parsed) {
            handleMessage(parsed);
          }
        } catch {
          // Ignora payload malformado
        }
      }
    };

    // Proteção contra suspensão de timers (sleep/aba em segundo plano):
    // verifica vencimento ANTES de renovar lastActivityMs
    const handleLocalInteraction = () => {
      const now = Date.now();
      if (now - lastActivityMs >= timeoutMs) {
        triggerLocalTimeout();
        return;
      }
      registerActivity(now, true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastActivityMs >= timeoutMs) {
          triggerLocalTimeout();
        }
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleLocalInteraction, { passive: true });
    }

    scheduleTimer();

    return () => {
      clearTimer();
      window.removeEventListener('storage', handleStorageEvent);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleLocalInteraction);
      }
      if (channel) {
        channel.close();
      }
    };
  }, [enabled, timeoutMs, explicitSenderId]);
}
