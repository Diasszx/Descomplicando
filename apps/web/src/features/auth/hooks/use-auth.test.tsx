import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import type { User as FirebaseUser } from 'firebase/auth';
import type { AuthSessionResponse } from '@fono/shared';
import { apiClient, configureApiAuthHandlers } from '@/lib/api-client';
import { AuthProvider } from './use-auth';
import {
  PendingSessionRoute,
  PublicOnlyRoute,
  RoleRouteGuard,
  RootRedirect,
} from '../components/route-guards';
import { LoginPage } from '../pages/login-page';
import { RegisterPage } from '../pages/register-page';
import { VerifyEmailPage } from '../pages/verify-email-page';
import { ForcePasswordChangePage } from '../pages/force-password-change-page';

let authStateListener: ((user: FirebaseUser | null) => void) | null = null;
let mockCurrentUser: FirebaseUser | null = null;

const firebaseMocks = vi.hoisted(() => ({
  signInWithEmail: vi.fn(),
  registerWithEmail: vi.fn(),
  signOutFirebase: vi.fn(),
  getCurrentIdToken: vi.fn(),
  reauthenticateAndUpdatePassword: vi.fn(),
  resendVerificationEmail: vi.fn(),
  reloadCurrentUser: vi.fn(),
  sendPasswordReset: vi.fn(),
}));

vi.mock('../services/firebase-auth.service', async () => {
  const actual = await vi.importActual<typeof import('../services/firebase-auth.service')>(
    '../services/firebase-auth.service',
  );
  return {
    ...actual,
    subscribeAuthState: (callback: (user: FirebaseUser | null) => void) => {
      authStateListener = callback;
      queueMicrotask(() => callback(mockCurrentUser));
      return () => {
        authStateListener = null;
      };
    },
    getCurrentFirebaseUser: () => mockCurrentUser,
    getCurrentIdToken: (...args: unknown[]) => firebaseMocks.getCurrentIdToken(...args),
    signInWithEmail: (...args: unknown[]) => firebaseMocks.signInWithEmail(...args),
    registerWithEmail: (...args: unknown[]) => firebaseMocks.registerWithEmail(...args),
    signOutFirebase: (...args: unknown[]) => firebaseMocks.signOutFirebase(...args),
    reauthenticateAndUpdatePassword: (...args: unknown[]) =>
      firebaseMocks.reauthenticateAndUpdatePassword(...args),
    resendVerificationEmail: (...args: unknown[]) => firebaseMocks.resendVerificationEmail(...args),
    reloadCurrentUser: (...args: unknown[]) => firebaseMocks.reloadCurrentUser(...args),
    sendPasswordReset: (...args: unknown[]) => firebaseMocks.sendPasswordReset(...args),
  };
});

class IntegrationBroadcastChannel {
  static instances: IntegrationBroadcastChannel[] = [];
  readonly name: string;
  private listeners: Array<(event: MessageEvent) => void> = [];

  constructor(name: string) {
    this.name = name;
    IntegrationBroadcastChannel.instances.push(this);
  }

  postMessage(data: unknown) {
    for (const instance of IntegrationBroadcastChannel.instances) {
      if (instance !== this && instance.name === this.name) {
        const event = { data } as MessageEvent;
        queueMicrotask(() => {
          for (const listener of instance.listeners) {
            listener(event);
          }
        });
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
    IntegrationBroadcastChannel.instances = IntegrationBroadcastChannel.instances.filter(
      (i) => i !== this,
    );
  }
}

function makeFakeFirebaseUser(overrides: Partial<FirebaseUser> = {}): FirebaseUser {
  return {
    uid: 'fb-uid-integration-1',
    email: 'ana@exemplo.com',
    displayName: 'Ana Clara',
    emailVerified: false,
    ...overrides,
  } as FirebaseUser;
}

function makeSession(overrides: Partial<AuthSessionResponse> = {}): AuthSessionResponse {
  return {
    user: {
      id: '550e8400-e29b-41d4-a716-446655440050',
      name: 'Ana Clara',
      email: 'ana@exemplo.com',
      emailVerified: false,
      role: 'AUTONOMO',
      status: 'ACTIVE',
      mustChangePassword: false,
      mfaRequired: false,
      mfaEnabled: false,
      lastLoginAt: new Date().toISOString(),
      ...overrides.user,
    },
    nextStep: overrides.nextStep ?? 'VERIFY_EMAIL',
    mfaVerifiedForCurrentLogin: overrides.mfaVerifiedForCurrentLogin ?? false,
  };
}

function renderAuthApp(initialRoute: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/cadastro"
              element={
                <PublicOnlyRoute>
                  <RegisterPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/verificar-email"
              element={
                <PendingSessionRoute requiredStep="VERIFY_EMAIL">
                  <VerifyEmailPage />
                </PendingSessionRoute>
              }
            />
            <Route
              path="/primeiro-acesso/nova-senha"
              element={
                <PendingSessionRoute requiredStep="CHANGE_PASSWORD">
                  <ForcePasswordChangePage />
                </PendingSessionRoute>
              }
            />
            <Route
              path="/paciente"
              element={
                <RoleRouteGuard allowedRoles={['PACIENTE']}>
                  <div>Painel Paciente Real</div>
                </RoleRouteGuard>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RoleRouteGuard allowedRoles={['AUTONOMO']}>
                  <div>Painel Autônomo Real</div>
                </RoleRouteGuard>
              }
            />
            <Route path="/" element={<RootRedirect />} />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('AuthProvider + RouteGuards + apiClient (Integração Real)', () => {
  const originalAdapter = apiClient.defaults.adapter;
  const originalBroadcastChannel = globalThis.BroadcastChannel;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser = null;
    authStateListener = null;
    localStorage.clear();
    IntegrationBroadcastChannel.instances = [];
    Object.defineProperty(globalThis, 'BroadcastChannel', {
      writable: true,
      configurable: true,
      value: IntegrationBroadcastChannel,
    });

    firebaseMocks.getCurrentIdToken.mockResolvedValue('valid-id-token');
    firebaseMocks.signOutFirebase.mockImplementation(async () => {
      mockCurrentUser = null;
      authStateListener?.(null);
    });
  });

  afterEach(() => {
    cleanup();
    configureApiAuthHandlers(null);
    if (originalAdapter !== undefined) {
      apiClient.defaults.adapter = originalAdapter;
    } else {
      delete apiClient.defaults.adapter;
    }
    Object.defineProperty(globalThis, 'BroadcastChannel', {
      writable: true,
      configurable: true,
      value: originalBroadcastChannel,
    });
  });

  it('deve manter LoginPage montada e exibir alerta de erro quando POST /auth/sync retorna 403 ACCOUNT_INACTIVE ou erro de rede', async () => {
    const fakeUser = makeFakeFirebaseUser({ email: 'inativo@exemplo.com', emailVerified: true });
    firebaseMocks.signInWithEmail.mockImplementation(async () => {
      mockCurrentUser = fakeUser;
      authStateListener?.(fakeUser);
      return fakeUser;
    });

    const getMeSpy = vi.fn();
    const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
      if (config.url === '/auth/me') {
        getMeSpy();
      }
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
    apiClient.defaults.adapter = adapter;

    renderAuthApp('/login');

    await waitFor(() => {
      expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: 'inativo@exemplo.com' },
    });
    fireEvent.change(screen.getByLabelText(/^senha$/i), {
      target: { value: 'SenhaValida1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/conta está inativa/i);
    });
    expect(getMeSpy).not.toHaveBeenCalled();
    expect(firebaseMocks.signOutFirebase).toHaveBeenCalled();
  });

  it('deve recuperar de falha de rede parcial no cadastro tanto em nova tentativa imediata quanto após recarregamento da página', async () => {
    const fakeUser = makeFakeFirebaseUser();
    firebaseMocks.registerWithEmail.mockImplementation(async () => {
      mockCurrentUser = fakeUser;
      authStateListener?.(fakeUser);
      return fakeUser;
    });

    let syncCalls = 0;
    const verifiedPendingSession = makeSession({ nextStep: 'VERIFY_EMAIL' });
    apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      if (config.url === '/auth/sync') {
        syncCalls += 1;
        if (syncCalls === 1) {
          return Promise.reject({
            isAxiosError: true,
            config,
            message: 'Network Error',
          });
        }
        return {
          data: verifiedPendingSession,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }
      throw new Error(`Unexpected URL ${config.url}`);
    };

    renderAuthApp('/cadastro');

    await waitFor(() => {
      expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: 'Ana Clara' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ana@exemplo.com' } });
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'FonoGame1' } });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: 'FonoGame1' },
    });

    // 1a tentativa: Firebase cria conta, mas POST /auth/sync falha por erro de rede
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível conectar ao servidor/i);
    });
    expect(firebaseMocks.registerWithEmail).toHaveBeenCalledTimes(1);

    // 2a tentativa imediata: retoma POST /auth/sync de forma idempotente sem chamar createUser novamente
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    await waitFor(() => {
      expect(screen.getByText(/confirme seu e-mail/i)).toBeInTheDocument();
    });
    expect(firebaseMocks.registerWithEmail).toHaveBeenCalledTimes(1);
    expect(syncCalls).toBe(2);

    // Cenário B: recarregamento da página com usuário Firebase ainda não vinculado (GET /auth/me -> 401 -> fallback POST /auth/sync)
    cleanup();
    mockCurrentUser = fakeUser;
    let bootstrapMeCalls = 0;
    let bootstrapSyncPayload: unknown = null;
    apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      if (config.url === '/auth/me') {
        bootstrapMeCalls += 1;
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
      if (config.url === '/auth/sync') {
        bootstrapSyncPayload = JSON.parse(String(config.data));
        return {
          data: verifiedPendingSession,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }
      throw new Error(`Unexpected URL ${config.url}`);
    };

    renderAuthApp('/');
    await waitFor(() => {
      expect(screen.getByText(/confirme seu e-mail/i)).toBeInTheDocument();
    });
    expect(bootstrapMeCalls).toBeGreaterThanOrEqual(1);
    expect(bootstrapSyncPayload).toEqual({ name: 'Ana Clara' });
  });

  it('deve exibir estado de erro com retry em RootRedirect quando houver falha de rede no bootstrap', async () => {
    mockCurrentUser = makeFakeFirebaseUser({ emailVerified: true });
    let failFirst = true;
    const readySession = makeSession({
      user: {
        id: '550e8400-e29b-41d4-a716-446655440051',
        name: 'Ana Clara',
        email: 'ana@exemplo.com',
        emailVerified: true,
        role: 'AUTONOMO',
        status: 'ACTIVE',
        mustChangePassword: false,
        mfaRequired: false,
        mfaEnabled: false,
        lastLoginAt: new Date().toISOString(),
      },
      nextStep: 'READY',
    });

    apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      if (failFirst) {
        return Promise.reject({ isAxiosError: true, config, message: 'Network Error' });
      }
      return {
        data: readySession,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    renderAuthApp('/');

    await waitFor(() => {
      expect(screen.getByText(/não foi possível carregar sua sessão/i)).toBeInTheDocument();
    });

    failFirst = false;
    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));

    await waitFor(() => {
      expect(screen.getByText('Painel Autônomo Real')).toBeInTheDocument();
    });
  });

  it('deve redirecionar para /login?reason=revoked sem auto-eco do BroadcastChannel sobrescrever o motivo', async () => {
    mockCurrentUser = makeFakeFirebaseUser({ emailVerified: true });
    const readySession = makeSession({
      user: {
        id: '550e8400-e29b-41d4-a716-446655440052',
        name: 'Ana Clara',
        email: 'ana@exemplo.com',
        emailVerified: true,
        role: 'AUTONOMO',
        status: 'ACTIVE',
        mustChangePassword: false,
        mfaRequired: false,
        mfaEnabled: false,
        lastLoginAt: new Date().toISOString(),
      },
      nextStep: 'READY',
    });

    let shouldRevoke = false;
    apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      if (shouldRevoke) {
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
      }
      return {
        data: readySession,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    renderAuthApp('/dashboard');

    await waitFor(() => {
      expect(screen.getByText('Painel Autônomo Real')).toBeInTheDocument();
    });

    shouldRevoke = true;
    await act(async () => {
      await apiClient.get('/auth/me').catch(() => undefined);
    });

    await waitFor(() => {
      expect(screen.getByText(/sua credencial foi revogada ou encerrada/i)).toBeInTheDocument();
    });
  });

  it('deve recuperar de falha de rede em POST /auth/password-changed sem reexecutar updatePassword no Firebase', async () => {
    mockCurrentUser = makeFakeFirebaseUser({
      uid: 'fb-patient-1',
      email: 'paciente@exemplo.com',
      emailVerified: true,
    });

    const pendingChangeSession = makeSession({
      user: {
        id: '550e8400-e29b-41d4-a716-446655440053',
        name: 'Paciente Um',
        email: 'paciente@exemplo.com',
        emailVerified: true,
        role: 'PACIENTE',
        status: 'ACTIVE',
        mustChangePassword: true,
        mfaRequired: false,
        mfaEnabled: false,
        lastLoginAt: new Date().toISOString(),
      },
      nextStep: 'CHANGE_PASSWORD',
    });

    const readyPatientSession = makeSession({
      user: {
        ...pendingChangeSession.user,
        mustChangePassword: false,
      },
      nextStep: 'READY',
    });

    firebaseMocks.reauthenticateAndUpdatePassword.mockResolvedValue('new-token');

    let passwordChangedCalls = 0;
    apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      if (config.url === '/auth/me') {
        return {
          data: pendingChangeSession,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }
      if (config.url === '/auth/password-changed') {
        passwordChangedCalls += 1;
        if (passwordChangedCalls === 1) {
          return Promise.reject({ isAxiosError: true, config, message: 'Network Error' });
        }
        return {
          data: readyPatientSession,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }
      throw new Error(`Unexpected URL ${config.url}`);
    };

    renderAuthApp('/primeiro-acesso/nova-senha');

    await waitFor(() => {
      expect(screen.getByLabelText(/senha temporária atual/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/senha temporária atual/i), {
      target: { value: 'TempPass1' },
    });
    fireEvent.change(screen.getByLabelText(/^nova senha$/i), {
      target: { value: 'NovaSenha123' },
    });
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), {
      target: { value: 'NovaSenha123' },
    });

    // 1a tentativa: updatePassword funciona, mas /auth/password-changed cai por erro de rede
    fireEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível conectar ao servidor/i);
    });
    expect(firebaseMocks.reauthenticateAndUpdatePassword).toHaveBeenCalledTimes(1);

    // 2a tentativa: pula reauth/updatePassword já concluído e conclui /auth/password-changed
    fireEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }));
    await waitFor(() => {
      expect(screen.getByText('Painel Paciente Real')).toBeInTheDocument();
    });
    expect(firebaseMocks.reauthenticateAndUpdatePassword).toHaveBeenCalledTimes(1);
    expect(passwordChangedCalls).toBe(2);
  });

  it('deve manter RegisterPage montada e exibir erro explícito quando POST /auth/sync retorna 409 EMAIL_ALREADY_REGISTERED', async () => {
    const fakeUser = makeFakeFirebaseUser({ email: 'duplicado@exemplo.com' });
    firebaseMocks.registerWithEmail.mockImplementation(async () => {
      mockCurrentUser = fakeUser;
      authStateListener?.(fakeUser);
      return fakeUser;
    });

    const getMeSpy = vi.fn();
    apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      if (config.url === '/auth/me') {
        getMeSpy();
      }
      return Promise.reject({
        isAxiosError: true,
        config,
        response: {
          status: 409,
          data: {
            statusCode: 409,
            code: 'EMAIL_ALREADY_REGISTERED',
            message: 'Este e-mail já está cadastrado na plataforma.',
          },
        },
      });
    };

    renderAuthApp('/cadastro');

    await waitFor(() => {
      expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: 'Ana Clara' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: 'duplicado@exemplo.com' },
    });
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'FonoGame1' } });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: 'FonoGame1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/este e-mail já está cadastrado/i);
    });
    expect(getMeSpy).not.toHaveBeenCalled();
    expect(firebaseMocks.signOutFirebase).toHaveBeenCalled();
  });

  it('deve redirecionar sessão ativa para /login?reason=inactive ao receber 403 ACCOUNT_INACTIVE', async () => {
    mockCurrentUser = makeFakeFirebaseUser({ emailVerified: true });
    const readySession = makeSession({
      user: {
        id: '550e8400-e29b-41d4-a716-446655440054',
        name: 'Ana Clara',
        email: 'ana@exemplo.com',
        emailVerified: true,
        role: 'AUTONOMO',
        status: 'ACTIVE',
        mustChangePassword: false,
        mfaRequired: false,
        mfaEnabled: false,
        lastLoginAt: new Date().toISOString(),
      },
      nextStep: 'READY',
    });

    let deactivateAccount = false;
    apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      if (deactivateAccount) {
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
      }
      return {
        data: readySession,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    renderAuthApp('/dashboard');

    await waitFor(() => {
      expect(screen.getByText('Painel Autônomo Real')).toBeInTheDocument();
    });

    deactivateAccount = true;
    await act(async () => {
      await apiClient.get('/auth/me').catch(() => undefined);
    });

    await waitFor(() => {
      expect(screen.getByText(/conta inativa ou desativada/i)).toBeInTheDocument();
    });
  });
});
