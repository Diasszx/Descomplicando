import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  SanitizedNameSchema,
  type AuthSessionResponse,
  type MfaSetupResponse,
  type SyncAuthRequest,
  type TotpCodeInput,
} from '@fono/shared';
import { authApiService } from '../services/auth-api.service';
import { parseStructuredApiError } from '../services/firebase-auth.service';

export const AUTH_SESSION_QUERY_KEY = ['auth', 'session'] as const;

function buildOptionalSyncPayload(fallbackDisplayName?: string | null): SyncAuthRequest {
  if (!fallbackDisplayName) {
    return {};
  }
  const parsed = SanitizedNameSchema.safeParse(fallbackDisplayName);
  return parsed.success ? { name: parsed.data } : {};
}

export function useAuthSession(enabled: boolean, fallbackDisplayName?: string | null) {
  return useQuery<AuthSessionResponse>({
    queryKey: AUTH_SESSION_QUERY_KEY,
    queryFn: async () => {
      try {
        return await authApiService.getMe({ skipInvalidationOn401: true });
      } catch (error) {
        const apiError = parseStructuredApiError(error);
        const isUnlinkedOrInvalid401 =
          axios.isAxiosError(error) &&
          error.response?.status === 401 &&
          (!apiError || apiError.code === 'INVALID_TOKEN');

        // Recuperação idempotente de sincronização parcial (conta criada no Firebase sem vínculo SQL ainda)
        if (isUnlinkedOrInvalid401) {
          return authApiService.syncAuth(buildOptionalSyncPayload(fallbackDisplayName));
        }
        throw error;
      }
    },
    enabled,
    retry: false,
    staleTime: 60_000,
  });
}

export function useSyncAuth() {
  const queryClient = useQueryClient();

  return useMutation<AuthSessionResponse, unknown, SyncAuthRequest | undefined>({
    mutationFn: (payload) => authApiService.syncAuth(payload),
    onSuccess: (session) => {
      queryClient.setQueryData(AUTH_SESSION_QUERY_KEY, session);
    },
  });
}

export function usePasswordChanged() {
  const queryClient = useQueryClient();

  return useMutation<AuthSessionResponse, unknown, void>({
    mutationFn: () => authApiService.confirmPasswordChanged(),
    onSuccess: (session) => {
      queryClient.setQueryData(AUTH_SESSION_QUERY_KEY, session);
    },
  });
}

export function useMfaSetup() {
  return useMutation<MfaSetupResponse, unknown, void>({
    mutationFn: () => authApiService.setupMfa(),
  });
}

export function useMfaVerify() {
  const queryClient = useQueryClient();

  return useMutation<AuthSessionResponse, unknown, TotpCodeInput>({
    mutationFn: (payload) => authApiService.verifyMfa(payload),
    onSuccess: (session) => {
      queryClient.setQueryData(AUTH_SESSION_QUERY_KEY, session);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, void>({
    mutationFn: () => authApiService.logoutServer(),
    onSettled: () => {
      queryClient.removeQueries({ queryKey: AUTH_SESSION_QUERY_KEY });
    },
  });
}
