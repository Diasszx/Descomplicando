import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { ApiErrorResponseSchema } from '@fono/shared';
import { webEnv } from './env';

export type SessionInvalidationReason = 'expired' | 'revoked' | 'inactive';

export interface ApiAuthHandlers {
  getToken: (forceRefresh?: boolean) => Promise<string | null>;
  onSessionInvalidated: (reason: SessionInvalidationReason) => void | Promise<void>;
}

export interface FonoAxiosRequestConfig extends AxiosRequestConfig {
  _fonoSkipInvalidationOn401?: boolean;
}

interface RetryableAxiosRequestConfig extends InternalAxiosRequestConfig {
  _fonoAuthRetried?: boolean;
  _fonoSkipInvalidationOn401?: boolean;
}

let authHandlers: ApiAuthHandlers | null = null;
let inFlightTokenRefresh: Promise<string | null> | null = null;

export function configureApiAuthHandlers(handlers: ApiAuthHandlers | null): void {
  authHandlers = handlers;
  inFlightTokenRefresh = null;
}

async function getDeduplicatedFreshToken(handlers: ApiAuthHandlers): Promise<string | null> {
  if (!inFlightTokenRefresh) {
    inFlightTokenRefresh = handlers.getToken(true).finally(() => {
      inFlightTokenRefresh = null;
    });
  }
  return inFlightTokenRefresh;
}

export const apiClient = axios.create({
  baseURL: webEnv.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  if (!authHandlers) {
    return config;
  }

  const hasAuthHeader = Boolean(config.headers.get('Authorization'));
  if (!hasAuthHeader) {
    const token = await authHandlers.getToken(false);
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableAxiosRequestConfig | undefined;
    const status = error.response?.status;
    const parsedError = ApiErrorResponseSchema.safeParse(error.response?.data);
    const errorCode = parsedError.success ? parsedError.data.code : undefined;

    if (status === 401 && errorCode === 'TOKEN_REVOKED') {
      if (authHandlers) {
        await authHandlers.onSessionInvalidated('revoked');
      }
      return Promise.reject(error);
    }

    if (status === 403 && errorCode === 'ACCOUNT_INACTIVE') {
      if (authHandlers) {
        await authHandlers.onSessionInvalidated('inactive');
      }
      return Promise.reject(error);
    }

    if (status === 401 && (!errorCode || errorCode === 'INVALID_TOKEN') && config) {
      if (!config._fonoAuthRetried && authHandlers) {
        config._fonoAuthRetried = true;
        try {
          const freshToken = await getDeduplicatedFreshToken(authHandlers);
          if (freshToken) {
            config.headers.set('Authorization', `Bearer ${freshToken}`);
            return apiClient.request(config);
          }
        } catch {
          // Segue para encerramento seguro da sessão abaixo
        }
      }

      if (authHandlers && !config._fonoSkipInvalidationOn401) {
        await authHandlers.onSessionInvalidated('expired');
      }
    }

    return Promise.reject(error);
  },
);
