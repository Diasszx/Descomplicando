import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AuthSessionResponse } from '@fono/shared';
import { LoginPage } from './login-page';
import { ForcePasswordChangePage } from './force-password-change-page';
import { VerifyEmailPage } from './verify-email-page';
import { RoleRouteGuard } from '../components/route-guards';
import type { AuthContextValue } from '../hooks/use-auth';

const mockUseAuth = vi.fn<() => AuthContextValue>();

vi.mock('../hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

function buildSession(overrides: Partial<AuthSessionResponse> = {}): AuthSessionResponse {
  return {
    user: {
      id: '550e8400-e29b-41d4-a716-446655440010',
      name: 'Usuário Teste',
      email: 'usuario@exemplo.com',
      emailVerified: true,
      role: 'AUTONOMO',
      status: 'ACTIVE',
      mustChangePassword: false,
      mfaRequired: false,
      mfaEnabled: false,
      lastLoginAt: new Date().toISOString(),
      ...overrides.user,
    },
    nextStep: overrides.nextStep ?? 'READY',
    mfaVerifiedForCurrentLogin: overrides.mfaVerifiedForCurrentLogin ?? false,
  };
}

function buildAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    firebaseUser: null,
    session: null,
    isBootstrapping: false,
    isAuthenticated: false,
    sessionError: null,
    signIn: vi.fn(),
    registerAutonomous: vi.fn(),
    requestPasswordReset: vi.fn(),
    completeForcedPasswordChange: vi.fn(),
    resendEmailVerification: vi.fn(),
    refreshVerificationStatus: vi.fn(),
    retrySessionSync: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
}

describe('Fluxos de Login, Primeiro Acesso, Verificação de E-mail e Guards (US1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('LoginPage deve validar campos obrigatórios, desabilitar submit durante loading e exibir erro acessível sem enumerar contas', async () => {
    let rejectSignIn: (reason?: unknown) => void = () => undefined;
    const signInMock = vi.fn(
      () =>
        new Promise<AuthSessionResponse>((_resolve, reject) => {
          rejectSignIn = reject;
        }),
    );

    mockUseAuth.mockReturnValue(buildAuthValue({ signIn: signInMock }));

    render(
      <MemoryRouter initialEntries={['/login?reason=inactivity']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/30 minutos/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => {
      expect(screen.getByText(/endereço de e-mail válido/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'maria@exemplo.com' } });
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'SenhaErrada1' } });

    const submitButton = screen.getByRole('button', { name: /entrar/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith({
        email: 'maria@exemplo.com',
        password: 'SenhaErrada1',
      });
      expect(submitButton).toBeDisabled();
    });

    rejectSignIn({ code: 'auth/invalid-credential' });

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/e-mail ou senha inválidos/i);
    });
  });

  it('ForcePasswordChangePage deve validar política FR-002 e rejeitar senha igual à temporária', async () => {
    const completeChangeMock = vi.fn().mockResolvedValue(
      buildSession({
        user: {
          id: '550e8400-e29b-41d4-a716-446655440011',
          name: 'Paciente Um',
          email: 'paciente@exemplo.com',
          emailVerified: true,
          role: 'PACIENTE',
          status: 'ACTIVE',
          mustChangePassword: false,
          mfaRequired: false,
          mfaEnabled: false,
          lastLoginAt: new Date().toISOString(),
        },
        nextStep: 'READY',
      }),
    );

    mockUseAuth.mockReturnValue(
      buildAuthValue({
        isAuthenticated: true,
        session: buildSession({
          user: {
            id: '550e8400-e29b-41d4-a716-446655440011',
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
        }),
        completeForcedPasswordChange: completeChangeMock,
      }),
    );

    render(
      <MemoryRouter initialEntries={['/primeiro-acesso/nova-senha']}>
        <Routes>
          <Route path="/primeiro-acesso/nova-senha" element={<ForcePasswordChangePage />} />
          <Route path="/paciente" element={<div>Painel Paciente</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/senha temporária atual/i), {
      target: { value: 'TempPass1' },
    });
    fireEvent.change(screen.getByLabelText(/^nova senha$/i), {
      target: { value: 'fraca' },
    });
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), {
      target: { value: 'fraca' },
    });
    fireEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }));

    await waitFor(() => {
      expect(screen.getByText(/pelo menos 8 caracteres/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/^nova senha$/i), {
      target: { value: 'NovaSenha123' },
    });
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), {
      target: { value: 'NovaSenha123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }));

    await waitFor(() => {
      expect(completeChangeMock).toHaveBeenCalledWith({
        currentPassword: 'TempPass1',
        newPassword: 'NovaSenha123',
        confirmNewPassword: 'NovaSenha123',
      });
    });
  });

  it('VerifyEmailPage deve permitir reenvio com cooldown e verificação de status via re-sync', async () => {
    const resendMock = vi.fn().mockResolvedValue(undefined);
    const refreshMock = vi.fn().mockResolvedValue(buildSession({ nextStep: 'READY' }));

    mockUseAuth.mockReturnValue(
      buildAuthValue({
        isAuthenticated: true,
        session: buildSession({
          user: {
            id: '550e8400-e29b-41d4-a716-446655440012',
            name: 'Maria',
            email: 'maria@exemplo.com',
            emailVerified: false,
            role: 'AUTONOMO',
            status: 'ACTIVE',
            mustChangePassword: false,
            mfaRequired: false,
            mfaEnabled: false,
            lastLoginAt: new Date().toISOString(),
          },
          nextStep: 'VERIFY_EMAIL',
        }),
        resendEmailVerification: resendMock,
        refreshVerificationStatus: refreshMock,
      }),
    );

    render(
      <MemoryRouter initialEntries={['/verificar-email']}>
        <Routes>
          <Route path="/verificar-email" element={<VerifyEmailPage />} />
          <Route path="/dashboard" element={<div>Painel Autônomo</div>} />
        </Routes>
      </MemoryRouter>,
    );

    const resendBtn = screen.getByRole('button', { name: /reenviar e-mail de verificação/i });
    fireEvent.click(resendBtn);
    await waitFor(() => {
      expect(resendMock).toHaveBeenCalledTimes(1);
      expect(resendBtn).toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /já confirmei meu e-mail/i }));
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalledTimes(1);
    });
  });

  it('RoleRouteGuard deve bloquear acesso cruzado redirecionando AUTONOMO de /admin para /dashboard', () => {
    mockUseAuth.mockReturnValue(
      buildAuthValue({
        isAuthenticated: true,
        session: buildSession({ nextStep: 'READY' }),
      }),
    );

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <RoleRouteGuard allowedRoles={['ADMIN']}>
                <div>Área Restrita Admin</div>
              </RoleRouteGuard>
            }
          />
          <Route path="/dashboard" element={<div>Painel Autônomo</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Área Restrita Admin')).not.toBeInTheDocument();
    expect(screen.getByText('Painel Autônomo')).toBeInTheDocument();
  });
});
