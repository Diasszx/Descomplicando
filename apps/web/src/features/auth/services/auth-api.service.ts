import {
  AuthSessionResponseSchema,
  MfaSetupResponseSchema,
  SyncAuthRequestSchema,
  TotpCodeSchema,
  type AuthSessionResponse,
  type MfaSetupResponse,
  type SyncAuthRequest,
  type TotpCodeInput,
} from '@fono/shared';
import { apiClient, type FonoAxiosRequestConfig } from '@/lib/api-client';

export interface GetMeOptions {
  skipInvalidationOn401?: boolean;
}

export const authApiService = {
  async syncAuth(payload?: SyncAuthRequest): Promise<AuthSessionResponse> {
    const validatedPayload = SyncAuthRequestSchema.parse(payload ?? {});
    const response = await apiClient.post<unknown>('/auth/sync', validatedPayload);
    return AuthSessionResponseSchema.parse(response.data);
  },

  async getMe(options?: GetMeOptions): Promise<AuthSessionResponse> {
    const config: FonoAxiosRequestConfig = {
      ...(options?.skipInvalidationOn401 ? { _fonoSkipInvalidationOn401: true } : {}),
    };
    const response = await apiClient.get<unknown>('/auth/me', config);
    return AuthSessionResponseSchema.parse(response.data);
  },

  async confirmPasswordChanged(): Promise<AuthSessionResponse> {
    const response = await apiClient.post<unknown>('/auth/password-changed', {});
    return AuthSessionResponseSchema.parse(response.data);
  },

  async setupMfa(): Promise<MfaSetupResponse> {
    const response = await apiClient.post<unknown>('/auth/mfa/setup', {});
    return MfaSetupResponseSchema.parse(response.data);
  },

  async verifyMfa(payload: TotpCodeInput): Promise<AuthSessionResponse> {
    const validatedPayload = TotpCodeSchema.parse(payload);
    const response = await apiClient.post<unknown>('/auth/mfa/verify', validatedPayload);
    return AuthSessionResponseSchema.parse(response.data);
  },

  async logoutServer(): Promise<void> {
    await apiClient.post('/auth/logout', {});
  },
};
